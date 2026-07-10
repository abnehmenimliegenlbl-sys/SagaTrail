import { randomUUID, timingSafeEqual } from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { clerkClient } from "@clerk/express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, profilesTable, partnersTable, type PartnerKategorie } from "@workspace/db";
import { istPremiumAktiv } from "../lib/premiumStatus";
import { PARTNER_ADMIN_HTML } from "../lib/partnerAdminHtml";

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

const PremiumZuruecksetzenBody = z.object({
  email: z.string().email().optional(),
  userId: z.string().optional(),
  // Wie lange /me/premium/sync ein weiterhin aktives RevenueCat-Test-Abo
  // ignorieren soll. Default 3650 Tage (praktisch dauerhaft fuer Dev-Zwecke).
  sperrtageAnzahl: z.number().int().min(0).max(3650).default(3650),
});

router.post("/admin/premium/reset", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = PremiumZuruecksetzenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, userId: userIdBody, sperrtageAnzahl } = parsed.data;
  if (!email && !userIdBody) {
    res.status(400).json({ error: "email oder userId erforderlich" });
    return;
  }

  let userId = userIdBody ?? null;
  if (!userId && email) {
    const nutzer = await clerkClient.users.getUserList({ emailAddress: [email] });
    if (nutzer.data.length === 0) {
      res.status(404).json({ error: `Kein Clerk-Nutzer mit E-Mail ${email}` });
      return;
    }
    userId = nutzer.data[0].id;
  }

  const sperreBis = new Date();
  sperreBis.setDate(sperreBis.getDate() + sperrtageAnzahl);

  const [row] = await db
    .update(profilesTable)
    .set({
      premium: false,
      premiumBis: null,
      // Bei sperrtageAnzahl=0 sofort wieder synchronisierbar lassen.
      premiumSyncLockedUntil: sperrtageAnzahl > 0 ? sperreBis : null,
      updatedAt: new Date(),
    })
    .where(eq(profilesTable.id, userId as string))
    .returning();

  if (!row) {
    res.status(404).json({ error: `Profil ${userId} nicht gefunden` });
    return;
  }

  req.log.info(
    { userId, sperrtageAnzahl, premiumSyncLockedUntil: row.premiumSyncLockedUntil },
    "Premium per Admin zurueckgesetzt (RevenueCat-Sync gesperrt)",
  );
  res.json({
    userId,
    premium: row.premium,
    premiumSyncLockedUntil: row.premiumSyncLockedUntil,
  });
});

const AppleTestUserBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  premium: z.boolean().default(false),
});

router.post("/admin/apple-test-user", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = AppleTestUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, premium } = parsed.data;

  const bestehende = await clerkClient.users.getUserList({ emailAddress: [email] });
  let userId: string;
  if (bestehende.data.length > 0) {
    userId = bestehende.data[0].id;
    req.log.info({ userId, email }, "Apple-Test-User existiert bereits in Clerk, wiederverwendet");
  } else {
    const neuerNutzer = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      skipPasswordChecks: true,
      skipPasswordRequirement: false,
    });
    userId = neuerNutzer.id;
    req.log.info({ userId, email }, "Apple-Test-User in Clerk angelegt");
  }

  const premiumBis = premium ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3650) : null;

  const [row] = await db
    .insert(profilesTable)
    .values({
      id: userId,
      name: "Apple Review",
      archetype: "reisende",
      homeCanton: "ZH",
      language: "de",
      ageTier: "erwachsene",
      premium: false,
      premiumBis,
      // Dauerhaft gegen RevenueCat-Resync gesperrt: dieser Account hat nie
      // ein echtes Abo, das Premium kommt ausschliesslich aus premiumBis.
      premiumSyncLockedUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3650),
    })
    .onConflictDoUpdate({
      target: profilesTable.id,
      set: {
        premiumBis,
        premiumSyncLockedUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3650),
        updatedAt: new Date(),
      },
    })
    .returning();

  req.log.info({ userId, email, premium }, "Apple-Test-Profil angelegt/aktualisiert");
  res.json({
    userId,
    email,
    premiumAktiv: istPremiumAktiv(row),
    premiumBis: row.premiumBis,
  });
});

const PARTNER_KATEGORIEN = [
  "restaurant",
  "cafe",
  "souvenir",
  "uebernachtung",
  "sonstiges",
] as const satisfies readonly PartnerKategorie[];

const PartnerBody = z.object({
  name: z.string().min(1),
  kategorie: z.enum(PARTNER_KATEGORIEN),
  canton: z.string().min(1),
  beschreibung: z.string().optional(),
  angebot: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  aktivVon: z.string().datetime().optional(),
  aktivBis: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

router.get("/admin/partner", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db
    .select()
    .from(partnersTable)
    .orderBy(desc(partnersTable.createdAt));
  res.json(rows);
});

router.post("/admin/partner", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = PartnerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { aktivVon, aktivBis, ...rest } = parsed.data;

  const [row] = await db
    .insert(partnersTable)
    .values({
      id: randomUUID(),
      ...rest,
      aktivVon: aktivVon ? new Date(aktivVon) : null,
      aktivBis: aktivBis ? new Date(aktivBis) : null,
    })
    .returning();

  req.log.info({ partnerId: row.id, name: row.name }, "Partner angelegt");
  res.status(201).json(row);
});

router.patch("/admin/partner/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = PartnerBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { aktivVon, aktivBis, ...rest } = parsed.data;

  const [row] = await db
    .update(partnersTable)
    .set({
      ...rest,
      ...(aktivVon !== undefined && { aktivVon: aktivVon ? new Date(aktivVon) : null }),
      ...(aktivBis !== undefined && { aktivBis: aktivBis ? new Date(aktivBis) : null }),
      updatedAt: new Date(),
    })
    .where(eq(partnersTable.id, req.params.id as string))
    .returning();

  if (!row) {
    res.status(404).json({ error: `Partner ${req.params.id} nicht gefunden` });
    return;
  }
  req.log.info({ partnerId: row.id }, "Partner aktualisiert");
  res.json(row);
});

router.delete("/admin/partner/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const [row] = await db
    .delete(partnersTable)
    .where(eq(partnersTable.id, req.params.id as string))
    .returning();

  if (!row) {
    res.status(404).json({ error: `Partner ${req.params.id} nicht gefunden` });
    return;
  }
  req.log.info({ partnerId: row.id }, "Partner geloescht");
  res.status(204).end();
});

router.get("/admin/partner-ui", (_req, res): void => {
  res.type("html").send(PARTNER_ADMIN_HTML);
});

export default router;
