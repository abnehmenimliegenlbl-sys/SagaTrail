/**
 * Öffentlicher Konto-Lösch-Flow für Google-Play-Compliance.
 *
 * Ablauf: Formular auf sagatrail.ch/account → POST /account-deletion/request
 * (E-Mail) → signierter Bestätigungslink per Mail (24 h gültig) → GET
 * /account-deletion/confirm zeigt eine Bestätigungsseite → erst der explizite
 * POST /account-deletion/execute löscht endgültig (Clerk-Konto + alle
 * Nutzerdaten inkl. Fotos in R2).
 *
 * Sicherheits-Entscheidungen:
 * - Link-Basis ist FEST konfiguriert (nie aus Host-Headern abgeleitet), sonst
 *   könnte ein Angreifer per X-Forwarded-Host den Lösch-Token auf seine
 *   Domain umleiten.
 * - GET löscht NIE (Mail-Scanner/Prefetcher folgen Links); Löschung nur per
 *   POST von der Bestätigungsseite.
 * - Antwort auf /request ist immer neutral (keine E-Mail-Enumeration).
 * - Clerk-Löschung zuerst; nur "not found" gilt als idempotent-ok. Schlägt
 *   Clerk anders fehl, wird NICHT fälschlich Erfolg gemeldet.
 */
import { clerkClient } from "@clerk/express";
import { createHmac, timingSafeEqual } from "crypto";
import { eq, or } from "drizzle-orm";
import { Router } from "express";
import nodemailer from "nodemailer";

import {
  db,
  profilesTable,
  referralsTable,
  trailConditionReportsTable,
  waypointPhotos as waypointPhotosTable,
} from "@workspace/db";

import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

/** Feste, vertrauenswürdige Basis für Bestätigungslinks. */
function linkBase(): string {
  if (process.env.PUBLIC_API_BASE) return process.env.PUBLIC_API_BASE;
  if (process.env.REPLIT_DEPLOYMENT) return "https://saga-trail.replit.app";
  return `https://${process.env.REPLIT_DEV_DOMAIN ?? "saga-trail.replit.app"}`;
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET fehlt");
  return s;
}

function mintToken(userId: string): string {
  const payload = `${userId}.${Date.now() + TOKEN_TTL_MS}`;
  const sig = createHmac("sha256", secret()).update(payload).digest();
  return `${Buffer.from(payload).toString("base64url")}.${sig.toString("base64url")}`;
}

function verifyToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  let payload: string;
  let sig: Buffer;
  try {
    payload = Buffer.from(token.slice(0, dot), "base64url").toString();
    sig = Buffer.from(token.slice(dot + 1), "base64url");
  } catch {
    return null;
  }
  const expected = createHmac("sha256", secret()).update(payload).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  const sep = payload.lastIndexOf(".");
  if (sep < 1) return null;
  const exp = Number(payload.slice(sep + 1));
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  return payload.slice(0, sep);
}

// In-Memory-Rate-Limiter: pro E-Mail UND pro IP (Server läuft einprozessig).
const limitMap = new Map<string, number[]>();
function rateLimited(key: string, max: number): boolean {
  const now = Date.now();
  const list = (limitMap.get(key) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (list.length >= max) return true;
  list.push(now);
  limitMap.set(key, list);
  return false;
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP-Konfiguration fehlt");
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    name: "sagatrail.ch",
    auth: { user, pass },
    connectionTimeout: 15_000,
  });
}

// CORS-Allowlist nur für das WP-Formular.
const ERLAUBTE_ORIGINS = new Set(["https://sagatrail.ch", "https://www.sagatrail.ch"]);
router.use("/account-deletion", (req, res, next) => {
  const origin = req.get("origin");
  if (origin && ERLAUBTE_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  // Token darf nie in Referrer/Caches landen.
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// POST /account-deletion/request — { email } → Bestätigungsmail (immer 200)
router.post("/account-deletion/request", async (req, res): Promise<void> => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const ip = req.ip ?? "unbekannt";
  const neutral = { ok: true as const };
  if (
    !email ||
    !email.includes("@") ||
    email.length > 254 ||
    rateLimited(`mail:${email}`, 3) ||
    rateLimited(`ip:${ip}`, 10)
  ) {
    res.json(neutral);
    return;
  }
  try {
    const users = await clerkClient.users.getUserList({ emailAddress: [email] });
    const user = users.data[0];
    if (user) {
      const link = `${linkBase()}/api/account-deletion/confirm?token=${encodeURIComponent(mintToken(user.id))}`;
      await createTransporter().sendMail({
        from: process.env.SMTP_FROM ?? "SagaTrail <no-reply@sagatrail.ch>",
        to: email,
        subject: "SagaTrail: Konto-Löschung bestätigen",
        text:
          `Hallo\n\nDu hast die Löschung deines SagaTrail-Kontos beantragt.\n\n` +
          `Öffne diesen Link und bestätige dort die endgültige Löschung deines Kontos und aller zugehörigen Daten:\n${link}\n\n` +
          `Der Link ist 24 Stunden gültig. Die Löschung kann nicht rückgängig gemacht werden.\n\n` +
          `Falls du das nicht warst, kannst du diese E-Mail ignorieren — dein Konto bleibt bestehen.\n\nSagaTrail`,
      });
      req.log.info({ userId: user.id }, "[accountDeletion] Bestätigungsmail verschickt");
    } else {
      req.log.info("[accountDeletion] Anfrage für unbekannte E-Mail (neutral beantwortet)");
    }
  } catch (err) {
    req.log.error({ err }, "[accountDeletion] Anfrage fehlgeschlagen");
  }
  res.json(neutral);
});

function htmlSeite(titel: string, inhalt: string): string {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${titel} – SagaTrail</title>
<style>
body{margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#101a1c;color:#e8ecec;display:flex;min-height:100vh;align-items:center;justify-content:center}
.card{max-width:440px;margin:24px;padding:32px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(255,255,255,.05);text-align:center}
h1{font-size:20px;margin:0 0 12px}p{font-size:15px;line-height:1.55;color:#b9c4c4;margin:0 0 8px}
a{color:#e0b64f}
button{margin-top:18px;padding:12px 22px;border:none;border-radius:10px;background:#b3261e;color:#fff;font-size:15px;cursor:pointer}
</style></head><body><div class="card"><h1>${titel}</h1>${inhalt}</div></body></html>`;
}

const LINK_UNGUELTIG = htmlSeite(
  "Link ungültig oder abgelaufen",
  `<p>Bitte fordere auf <a href="https://sagatrail.ch/account">sagatrail.ch/account</a> einen neuen Lösch-Link an.</p>`,
);

// GET /account-deletion/confirm?token= — zeigt NUR die Bestätigungsseite.
router.get("/account-deletion/confirm", (req, res): void => {
  const token = String(req.query.token ?? "");
  if (!verifyToken(token)) {
    res.status(400).send(LINK_UNGUELTIG);
    return;
  }
  // HTML-sicher: Token stammt aus base64url-Alphabet, encodeURIComponent zur Sicherheit.
  res.send(
    htmlSeite(
      "Konto endgültig löschen?",
      `<p>Dein SagaTrail-Konto und alle zugehörigen Daten (Profil, Wanderverlauf, Fotos) werden dauerhaft gelöscht.</p>
<p><strong>Diese Aktion kann nicht rückgängig gemacht werden.</strong></p>
<form method="POST" action="/api/account-deletion/execute">
<input type="hidden" name="token" value="${encodeURIComponent(token)}">
<button type="submit">Ja, Konto endgültig löschen</button>
</form>`,
    ),
  );
});

/** Löscht alle Nutzerdaten in DB + R2. Wirft bei DB-Fehlern. Auch vom In-App-Löschen (DELETE /me) genutzt. */
export async function purgeUserData(userId: string, log: { warn: (o: object, m: string) => void }): Promise<void> {
  // Fotos: erst R2-Objekte, dann DB-Zeilen.
  const fotos = await db
    .select({ objectPath: waypointPhotosTable.objectPath })
    .from(waypointPhotosTable)
    .where(eq(waypointPhotosTable.userId, userId));
  const storage = new ObjectStorageService();
  for (const foto of fotos) {
    try {
      const obj = await storage.getObjectEntityFile(foto.objectPath);
      await obj.delete();
    } catch (err) {
      log.warn({ err, objectPath: foto.objectPath }, "[accountDeletion] R2-Objekt nicht löschbar");
    }
  }
  await db.delete(waypointPhotosTable).where(eq(waypointPhotosTable.userId, userId));
  await db.delete(trailConditionReportsTable).where(eq(trailConditionReportsTable.userId, userId));
  await db
    .delete(referralsTable)
    .where(or(eq(referralsTable.inviterId, userId), eq(referralsTable.inviteeId, userId)));
  await db.delete(profilesTable).where(eq(profilesTable.id, userId));
}

// POST /account-deletion/execute — führt die Löschung aus (Form-Submit).
router.post("/account-deletion/execute", async (req, res): Promise<void> => {
  const raw = String(req.body?.token ?? "");
  const token = raw.includes("%") ? decodeURIComponent(raw) : raw;
  const userId = verifyToken(token);
  if (!userId) {
    res.status(400).send(LINK_UNGUELTIG);
    return;
  }
  try {
    // Clerk zuerst: Nur "nicht gefunden" ist idempotent-ok; andere Fehler
    // dürfen NICHT als Erfolg enden (Konto wäre weiter aktiv).
    try {
      await clerkClient.users.deleteUser(userId);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status !== 404) throw err;
    }
    await purgeUserData(userId, req.log);
    req.log.info({ userId }, "[accountDeletion] Konto vollständig gelöscht");
    res.send(
      htmlSeite("Konto gelöscht", "<p>Dein SagaTrail-Konto und alle zugehörigen Daten wurden endgültig gelöscht.</p>"),
    );
  } catch (err) {
    req.log.error({ err, userId }, "[accountDeletion] Löschung fehlgeschlagen");
    res
      .status(500)
      .send(htmlSeite("Fehler", "<p>Die Löschung konnte nicht durchgeführt werden. Bitte versuche es später erneut oder kontaktiere info@sagatrail.ch.</p>"));
  }
});

export default router;
