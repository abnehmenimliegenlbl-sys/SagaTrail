import { Router } from "express";
import { db } from "@workspace/db";
import { androidBetaTesterTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";
import { logger as rootLogger } from "../lib/logger";

const router = Router();
const log = rootLogger.child({ module: "android-beta" });

function getMailer() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
  });
}

// ─── PUBLIC: Anmeldung ────────────────────────────────────────────────────────
router.post("/android-beta-signup", async (req, res) => {
  const { email, name } = req.body ?? {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Ungültige E-Mail-Adresse." });
  }

  try {
    await db
      .insert(androidBetaTesterTable)
      .values({ email: email.toLowerCase().trim(), name: name?.trim() || null })
      .onConflictDoNothing();
  } catch (err) {
    log.warn({ err }, "android-beta-signup: DB-Fehler");
    return res.status(500).json({ error: "Fehler beim Speichern." });
  }

  // Bestätigungs-E-Mail
  const mailer = getMailer();
  if (mailer) {
    const from = process.env.SMTP_FROM ?? "info@sagatrail.ch";
    mailer.sendMail({
      from,
      to: email,
      subject: "SagaTrail Android Beta – Danke für dein Interesse!",
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
          <div style="background:#CC0000;padding:32px 28px;border-radius:12px 12px 0 0;text-align:center">
            <div style="color:#fff;font-size:1.6rem;font-weight:800">SagaTrail</div>
            <div style="color:rgba(255,255,255,0.85);font-size:0.9rem;margin-top:4px">Android Beta</div>
          </div>
          <div style="background:#fff;border:1px solid #ebebeb;border-top:none;padding:32px 28px;border-radius:0 0 12px 12px">
            <p style="font-size:1.05rem;font-weight:700;margin-bottom:12px">Danke${name ? `, ${name}` : ""}!</p>
            <p style="color:#444;line-height:1.6;margin-bottom:16px">
              Wir haben deine E-Mail-Adresse <strong>${email}</strong> für die Android-Beta von SagaTrail vorgemerkt.
              Sobald der geschlossene Test im Google Play Store startet, senden wir dir eine Einladung.
            </p>
            <p style="color:#444;line-height:1.6;margin-bottom:24px">
              In der Zwischenzeit kannst du SagaTrail bereits auf dem iPhone testen — kostenlos im App Store.
            </p>
            <div style="text-align:center">
              <a href="https://sagatrail.ch" style="display:inline-block;background:#CC0000;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">
                sagatrail.ch
              </a>
            </div>
          </div>
          <p style="font-size:0.75rem;color:#aaa;text-align:center;margin-top:16px">
            SagaTrail · Mühlemattstrasse 11 · 4104 Oberwil BL
          </p>
        </div>
      `,
    }).catch((err) => log.warn({ err }, "android-beta: Bestätigungs-Mail fehlgeschlagen"));
  }

  log.info({ email }, "android-beta: neue Anmeldung");
  return res.json({ ok: true });
});

// ─── ADMIN: Liste aller Tester als JSON ───────────────────────────────────────
router.get("/admin/android-beta/testers", async (req, res) => {
  const token = req.headers["x-admin-token"] ?? req.query.token;
  if (token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });

  const rows = await db
    .select()
    .from(androidBetaTesterTable)
    .orderBy(androidBetaTesterTable.createdAt);

  return res.json({ count: rows.length, testers: rows });
});

// ─── ADMIN: CSV-Export für Google Play ───────────────────────────────────────
// Format: eine E-Mail pro Zeile (Play Console CSV-Format)
router.get("/admin/android-beta/export-csv", async (req, res) => {
  const token = req.headers["x-admin-token"] ?? req.query.token;
  if (token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });

  const rows = await db
    .select({ email: androidBetaTesterTable.email })
    .from(androidBetaTesterTable)
    .orderBy(androidBetaTesterTable.createdAt);

  const csv = rows.map((r) => r.email).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="android-beta-testers-${new Date().toISOString().slice(0,10)}.csv"`);
  return res.send(csv);
});

// ─── ADMIN: Als "im Play Store eingetragen" markieren ─────────────────────────
router.post("/admin/android-beta/mark-added", async (req, res) => {
  const token = req.headers["x-admin-token"] ?? req.query.token;
  if (token !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: "Unauthorized" });

  const { emails } = req.body ?? {};
  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: "emails[] erforderlich" });
  }

  for (const email of emails) {
    await db
      .update(androidBetaTesterTable)
      .set({ addedToPlay: true })
      .where(eq(androidBetaTesterTable.email, email.toLowerCase()));
  }

  return res.json({ ok: true, marked: emails.length });
});

export default router;
