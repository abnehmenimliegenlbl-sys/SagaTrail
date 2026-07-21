import { randomBytes, randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import { Router, type IRouter } from "express";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod/v4";
import multer from "multer";
import { db, partnersTable, partnerTokensTable } from "@workspace/db";

const router: IRouter = Router();

const FOTOS_DIR = path.join(__dirname, "../../public/partner-fotos");
fs.mkdirSync(FOTOS_DIR, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(null, ok);
  },
});

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

  const [partner] = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.email, parsed.data.email))
    .limit(1);

  if (!partner) {
    res.json({ ok: true });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(partnerTokensTable).values({
    id: randomUUID(),
    partnerId: partner.id,
    token,
    expiresAt,
  });

  req.log.info({ partnerId: partner.id }, "Portal-Token erstellt");
  res.json({ ok: true, token, partnerName: partner.name, expiresAt: expiresAt.toISOString() });
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
    fotoUrl: partner.fotoUrl,
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

router.post(
  "/partner/portal/upload",
  upload.single("foto"),
  async (req, res): Promise<void> => {
    const token = req.query["token"];
    if (typeof token !== "string") { res.status(401).json({ error: "Token fehlt." }); return; }
    const partner = await resolveToken(token);
    if (!partner) { res.status(401).json({ error: "Ungültiger oder abgelaufener Token." }); return; }

    if (!req.file) {
      res.status(400).json({ error: "Keine Datei hochgeladen oder ungültiges Format (JPEG/PNG/WebP)." });
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
    const filename = `${randomUUID()}${ext}`;
    fs.writeFileSync(path.join(FOTOS_DIR, filename), req.file.buffer);
    const fotoUrl = `/api/partner-fotos/${filename}`;

    await db
      .update(partnersTable)
      .set({ fotoUrl, updatedAt: new Date() })
      .where(eq(partnersTable.id, partner.id));

    req.log.info({ partnerId: partner.id, file: req.file.filename }, "Partner-Foto hochgeladen");
    res.json({ ok: true, fotoUrl });
  }
);

router.patch("/partner/portal/me", async (req, res): Promise<void> => {
  const token = req.query["token"];
  if (typeof token !== "string") { res.status(401).json({ error: "Token fehlt." }); return; }

  const partner = await resolveToken(token);
  if (!partner) { res.status(401).json({ error: "Ungültiger oder abgelaufener Token." }); return; }

  const parsed = z.object({
    beschreibung:  z.string().max(250).optional(),
    angebot:       z.string().max(120).optional(),
    telefon:       z.string().max(50).optional(),
    websiteUrl:    z.string().max(300).optional(),
    reservierungUrl: z.string().max(300).optional(),
    oeffnungszeiten: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const d = parsed.data;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (d.beschreibung   !== undefined) update["beschreibung"]   = d.beschreibung || null;
  if (d.angebot        !== undefined) update["angebot"]        = d.angebot || null;
  if (d.telefon        !== undefined) update["telefon"]        = d.telefon || null;
  if (d.websiteUrl     !== undefined) update["websiteUrl"]     = d.websiteUrl || null;
  if (d.reservierungUrl !== undefined) update["reservierungUrl"] = d.reservierungUrl || null;
  if (d.oeffnungszeiten !== undefined) update["oeffnungszeiten"] = d.oeffnungszeiten || null;

  const [updated] = await db
    .update(partnersTable)
    .set(update)
    .where(eq(partnersTable.id, partner.id))
    .returning();

  req.log.info({ partnerId: partner.id }, "Profil via Portal aktualisiert");
  res.json({ ok: true, partner: updated });
});

export default router;
