import { randomBytes, randomUUID } from "crypto";
import { Router, type IRouter } from "express";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod/v4";
import { db, partnersTable, partnerTokensTable, verbandsTable, verbandTokensTable } from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();

function buildFotoServingUrl(partnerId: string, req: import("express").Request): string {
  return `${req.protocol}://${req.get("host")}/api/partner/foto/${partnerId}`;
}

function resolveFotoUrl(partner: { id: string; fotoUrl: string | null }, req: import("express").Request): string | null {
  const raw = partner.fotoUrl ?? null;
  if (!raw) return null;
  if (raw.startsWith("/objects/") || raw.startsWith("data:image/")) return buildFotoServingUrl(partner.id, req);
  if (raw.startsWith("/")) return `${req.protocol}://${req.get("host")}${raw}`;
  return raw;
}

async function resolveToken(token: string) {
  const now = new Date();
  const [row] = await db
    .select()
    .from(partnerTokensTable)
    .where(and(eq(partnerTokensTable.token, token), gt(partnerTokensTable.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  const [partner] = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.id, row.partnerId))
    .limit(1);
  return partner ?? null;
}

router.post("/partner/portal/token", async (req, res): Promise<void> => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Gültige E-Mail-Adresse erforderlich." });
    return;
  }

  const email = parsed.data.email;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const token = randomBytes(32).toString("hex");

  // Zuerst Partner prüfen
  const [partner] = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.email, email))
    .limit(1);

  if (partner) {
    await db.insert(partnerTokensTable).values({ id: randomUUID(), partnerId: partner.id, token, expiresAt });
    req.log.info({ partnerId: partner.id }, "Partner-Portal-Token erstellt");
    res.json({ ok: true, token, name: partner.name, partnerName: partner.name, type: "partner", expiresAt: expiresAt.toISOString() });
    return;
  }

  // Dann Verband prüfen
  const [verband] = await db
    .select()
    .from(verbandsTable)
    .where(eq(verbandsTable.email, email))
    .limit(1);

  if (verband) {
    if (!verband.isActive) {
      res.json({ ok: true }); // Stille Ablehnung inaktiver Verbände
      return;
    }
    await db.insert(verbandTokensTable).values({ id: randomUUID(), verbandId: verband.id, token, expiresAt });
    req.log.info({ verbandId: verband.id }, "Verband-Portal-Token erstellt");
    res.json({ ok: true, token, name: verband.name, type: "verband", expiresAt: expiresAt.toISOString() });
    return;
  }

  // Keine E-Mail gefunden — stille Antwort (kein Enumeration-Leak)
  res.json({ ok: true });
});

router.get("/partner/portal/me", async (req, res): Promise<void> => {
  const token = req.query["token"];
  if (typeof token !== "string") { res.status(401).json({ error: "Token fehlt." }); return; }

  const partner = await resolveToken(token);
  if (!partner) { res.status(401).json({ error: "Ungültiger oder abgelaufener Token." }); return; }

  res.json({
    id: partner.id,
    name: partner.name,
    kategorie: partner.kategorie,
    canton: partner.canton,
    beschreibung: partner.beschreibung,
    angebot: partner.angebot,
    fotoUrl: resolveFotoUrl(partner, req),
    telefon: partner.telefon,
    websiteUrl: partner.websiteUrl,
    reservierungUrl: partner.reservierungUrl,
    oeffnungszeiten: partner.oeffnungszeiten,
    email: partner.email,
    paket: partner.paket,
    isActive: partner.isActive,
    views: partner.views,
    offersTapped: partner.offersTapped,
    laufzeitStart: partner.laufzeitStart,
    laufzeitEnde: partner.laufzeitEnde,
  });
});

// Foto-Upload: Base64-Bild (client-seitig auf 1200px resized) direkt in DB speichern.
// Kein Object Storage nötig — funktioniert in Production und Development.
router.post("/partner/portal/upload-photo", async (req, res): Promise<void> => {
  const token = req.query["token"];
  if (typeof token !== "string") { res.status(401).json({ error: "Token fehlt." }); return; }

  const partner = await resolveToken(token);
  if (!partner) { res.status(401).json({ error: "Ungültiger oder abgelaufener Token." }); return; }

  const { fotoBase64 } = req.body ?? {};
  if (typeof fotoBase64 !== "string" || !fotoBase64.startsWith("data:image/")) {
    res.status(400).json({ error: "Kein gültiges Bild empfangen." });
    return;
  }
  // Max ~2 MB base64 (~1.5 MB Bild)
  if (fotoBase64.length > 2_200_000) {
    res.status(400).json({ error: "Bild zu gross. Bitte kleineres Foto wählen." });
    return;
  }

  await db
    .update(partnersTable)
    .set({ fotoUrl: fotoBase64 })
    .where(eq(partnersTable.id, partner.id));

  req.log.info({ partnerId: partner.id }, "Partner-Foto hochgeladen (base64)");
  res.json({ ok: true, fotoUrl: buildFotoServingUrl(partner.id, req) });
});

// Öffentliche Route: Partner-Foto aus GCS streamen.
// fotoUrl in DB muss mit /objects/ beginnen.
router.get("/partner/foto/:partnerId", async (req, res): Promise<void> => {
  const { partnerId } = req.params;
  const [partner] = await db
    .select({ id: partnersTable.id, fotoUrl: partnersTable.fotoUrl })
    .from(partnersTable)
    .where(eq(partnersTable.id, partnerId))
    .limit(1);

  if (!partner?.fotoUrl) {
    res.status(404).end();
    return;
  }

  // Base64 data URL (neuer Speicherpfad)
  if (partner.fotoUrl.startsWith("data:image/")) {
    const [header, b64] = partner.fotoUrl.split(",");
    const mimeMatch = header.match(/data:(image\/[a-z]+);base64/);
    if (!mimeMatch || !b64) { res.status(404).end(); return; }
    const buf = Buffer.from(b64, "base64");
    res.set("Content-Type", mimeMatch[1]);
    res.set("Cache-Control", "public, max-age=86400");
    res.set("X-Content-Type-Options", "nosniff");
    res.send(buf);
    return;
  }

  // GCS object (alter Speicherpfad — Fallback)
  if (partner.fotoUrl.startsWith("/objects/")) {
    try {
      const file = await objectStorage.getObjectEntityFile(partner.fotoUrl);
      const [metadata] = await file.getMetadata();
      res.set("Content-Type", (metadata.contentType as string) || "image/jpeg");
      res.set("Cache-Control", "public, max-age=86400");
      res.set("X-Content-Type-Options", "nosniff");
      file.createReadStream().pipe(res);
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        res.status(404).end();
      } else {
        req.log.error({ err, partnerId }, "Fehler beim Laden des Partner-Fotos");
        res.status(502).end();
      }
    }
    return;
  }

  res.status(404).end();
});

router.patch("/partner/portal/me", async (req, res): Promise<void> => {
  const token = req.query["token"];
  if (typeof token !== "string") { res.status(401).json({ error: "Token fehlt." }); return; }

  const partner = await resolveToken(token);
  if (!partner) { res.status(401).json({ error: "Ungültiger oder abgelaufener Token." }); return; }

  const parsed = z.object({
    beschreibung:    z.string().max(250).optional(),
    angebot:         z.string().max(120).optional(),
    telefon:         z.string().max(50).optional(),
    websiteUrl:      z.string().max(300).optional(),
    reservierungUrl: z.string().max(300).optional(),
    oeffnungszeiten: z.string().optional(),
    fotoObjectPath:  z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const d = parsed.data;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (d.beschreibung    !== undefined) update["beschreibung"]    = d.beschreibung || null;
  if (d.angebot         !== undefined) update["angebot"]         = d.angebot || null;
  if (d.telefon         !== undefined) update["telefon"]         = d.telefon || null;
  if (d.websiteUrl      !== undefined) update["websiteUrl"]      = d.websiteUrl || null;
  if (d.reservierungUrl !== undefined) update["reservierungUrl"] = d.reservierungUrl || null;
  if (d.oeffnungszeiten !== undefined) update["oeffnungszeiten"] = d.oeffnungszeiten || null;
  if (d.fotoObjectPath  !== undefined && d.fotoObjectPath.startsWith("/objects/")) {
    update["fotoUrl"] = d.fotoObjectPath;
  }

  const [updated] = await db
    .update(partnersTable)
    .set(update)
    .where(eq(partnersTable.id, partner.id))
    .returning();

  req.log.info({ partnerId: partner.id }, "Profil via Portal aktualisiert");
  res.json({ ok: true, partner: updated });
});

export default router;
