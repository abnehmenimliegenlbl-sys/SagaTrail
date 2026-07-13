import { randomBytes, randomUUID } from "crypto";
import { Router, type IRouter } from "express";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod/v4";
import { db, partnersTable, partnerTokensTable } from "@workspace/db";

/**
 * Partner-Self-Service-Portal – kein Admin-Token erforderlich.
 * Zugang per Magic-Link-Token (24h gueltig), ausgeliefert vom WP-Handler.
 *
 * POST /partner/portal/token  { email }  → { ok, token, partnerName, expiresAt }
 * GET  /partner/portal/me?token=…        → Partnerdaten + Statistiken
 * PATCH /partner/portal/me?token=…       → fotoUrl, beschreibung, angebot
 */
const router: IRouter = Router();

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
    email: partner.email,
    paket: partner.paket,
    isActive: partner.isActive,
    views: partner.views,
    offersTapped: partner.offersTapped,
    laufzeitStart: partner.laufzeitStart,
    laufzeitEnde: partner.laufzeitEnde,
  });
});

router.patch("/partner/portal/me", async (req, res): Promise<void> => {
  const token = req.query["token"];
  if (typeof token !== "string") { res.status(401).json({ error: "Token fehlt." }); return; }

  const partner = await resolveToken(token);
  if (!partner) { res.status(401).json({ error: "Ungültiger oder abgelaufener Token." }); return; }

  const parsed = z.object({
    beschreibung: z.string().max(500).optional(),
    angebot: z.string().max(300).optional(),
    fotoUrl: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.beschreibung !== undefined) update["beschreibung"] = parsed.data.beschreibung || null;
  if (parsed.data.angebot !== undefined) update["angebot"] = parsed.data.angebot || null;
  if (parsed.data.fotoUrl !== undefined) update["fotoUrl"] = parsed.data.fotoUrl || null;

  const [updated] = await db
    .update(partnersTable)
    .set(update)
    .where(eq(partnersTable.id, partner.id))
    .returning();

  req.log.info({ partnerId: partner.id }, "Profil via Portal aktualisiert");
  res.json({ ok: true, partner: updated });
});

export default router;
