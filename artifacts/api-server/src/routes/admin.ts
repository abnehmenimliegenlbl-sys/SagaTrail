import { timingSafeEqual } from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, profilesTable } from "@workspace/db";
import { istPremiumAktiv } from "../lib/premiumStatus";

/**
 * Interne Admin-Endpunkte, geschuetzt ueber das Header-Token `x-admin-token`
 * (env `ADMIN_TOKEN`). Nicht Teil der oeffentlichen OpenAPI-Spezifikation,
 * da sie nie von der App aufgerufen werden.
 */
const router: IRouter = Router();

const PremiumFreischaltenBody = z.object({
  email: z.string().email(),
  monate: z.number().int().min(1).max(120).default(12),
});

function requireAdminToken(req: Request, res: Response): boolean {
  const erwartet = process.env.ADMIN_TOKEN;
  const geliefert = req.header("x-admin-token");
  // Zeitkonstanter Vergleich, damit das Token nicht ueber Timing erratbar ist.
  const a = Buffer.from(geliefert ?? "");
  const b = Buffer.from(erwartet ?? "");
  const gueltig =
    !!erwartet && !!geliefert && a.length === b.length && timingSafeEqual(a, b);
  if (!gueltig) {
    req.log.warn({ ip: req.ip }, "Admin-Endpunkt: ungueltiges Token");
    res.status(401).json({ error: "Ungueltiges Admin-Token" });
    return false;
  }
  return true;
}

router.post("/admin/premium", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = PremiumFreischaltenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, monate } = parsed.data;

  // Clerk-Nutzer zur E-Mail aufloesen (Profile sind ueber die Clerk-ID verknuepft)
  const nutzer = await clerkClient.users.getUserList({
    emailAddress: [email],
  });
  if (nutzer.data.length === 0) {
    res.status(404).json({ error: `Kein Clerk-Nutzer mit E-Mail ${email}` });
    return;
  }
  const userId = nutzer.data[0].id;

  const bis = new Date();
  bis.setMonth(bis.getMonth() + monate);

  const [row] = await db
    .update(profilesTable)
    .set({ premiumBis: bis, updatedAt: new Date() })
    .where(eq(profilesTable.id, userId))
    .returning();

  if (!row) {
    res.status(404).json({
      error: `Clerk-Nutzer ${userId} hat noch kein Profil (Onboarding nicht abgeschlossen)`,
    });
    return;
  }

  req.log.info(
    { userId, email, premiumBis: bis.toISOString() },
    "Premium manuell freigeschaltet",
  );
  res.json({
    userId,
    email,
    premiumBis: bis.toISOString(),
    premiumAktiv: istPremiumAktiv(row),
  });
});

export default router;
