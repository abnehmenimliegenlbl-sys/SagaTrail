import { randomUUID, timingSafeEqual } from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { clerkClient } from "@clerk/express";
import { desc, eq, or, ilike } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  profilesTable,
  partnersTable,
  catalogRoutesTable,
  catalogSagasTable,
  type PartnerKategorie,
} from "@workspace/db";
import { istPremiumAktiv } from "../lib/premiumStatus";
import { ADMIN_DASHBOARD_HTML } from "../lib/adminDashboardHtml";
import { clearNarrationCache } from "../lib/narrationCache";

const router: IRouter = Router();

const PremiumFreischaltenBody = z.object({
  email: z.string().email(),
  monate: z.number().int().min(1).max(120).default(12),
});

function requireAdminToken(req: Request, res: Response): boolean {
  const erwartet = process.env.ADMIN_TOKEN;
  const geliefert = req.header("x-admin-token");
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

  const nutzer = await clerkClient.users.getUserList({ emailAddress: [email] });
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
    res.status(404).json({ error: `Clerk-Nutzer ${userId} hat noch kein Profil` });
    return;
  }

  req.log.info({ userId, email, premiumBis: bis.toISOString() }, "Premium manuell freigeschaltet");
  res.json({ userId, email, premiumBis: bis.toISOString(), premiumAktiv: istPremiumAktiv(row) });
});

const PremiumZuruecksetzenBody = z.object({
  email: z.string().email().optional(),
  userId: z.string().optional(),
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
      premiumSyncLockedUntil: sperrtageAnzahl > 0 ? sperreBis : null,
      updatedAt: new Date(),
    })
    .where(eq(profilesTable.id, userId as string))
    .returning();

  if (!row) {
    res.status(404).json({ error: `Profil ${userId} nicht gefunden` });
    return;
  }

  req.log.info({ userId, sperrtageAnzahl }, "Premium per Admin zurueckgesetzt");
  res.json({ userId, premium: row.premium, premiumSyncLockedUntil: row.premiumSyncLockedUntil });
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
  } else {
    const neuerNutzer = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      skipPasswordChecks: true,
      skipPasswordRequirement: false,
    });
    userId = neuerNutzer.id;
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
  res.json({ userId, email, premiumAktiv: istPremiumAktiv(row), premiumBis: row.premiumBis });
});

// ===================================================================
// ADMIN STATS / USERS / USAGE
// ===================================================================

router.get("/admin/stats", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const allProfiles = await db.select().from(profilesTable);
  const allPartners = await db.select().from(partnersTable);

  const totalHikes = allProfiles.reduce((sum, p) => {
    const hist = Array.isArray(p.hikeHistory) ? (p.hikeHistory as unknown[]) : [];
    return sum + hist.length;
  }, 0);

  const byStatus: Record<string, number> = {};
  allPartners.forEach((p) => {
    const s = (p.zahlungsstatus as string) ?? "ausstehend";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  });

  res.json({
    users: {
      total: allProfiles.length,
      premium: allProfiles.filter((p) => istPremiumAktiv(p)).length,
      freeHikeUsed: allProfiles.filter((p) => p.freeHikeUsed).length,
    },
    partners: {
      total: allPartners.length,
      active: allPartners.filter((p) => p.isActive).length,
      byStatus,
    },
    hikes: { total: totalHikes },
  });
});

router.get("/admin/users", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const profiles = await db
    .select()
    .from(profilesTable)
    .orderBy(desc(profilesTable.createdAt));

  res.json(
    profiles.map((p) => ({
      id: p.id,
      name: p.name,
      homeCanton: p.homeCanton,
      language: p.language,
      ageTier: p.ageTier,
      archetype: p.archetype,
      premium: istPremiumAktiv(p),
      premiumBis: p.premiumBis,
      freeHikeUsed: p.freeHikeUsed,
      hikeCount: Array.isArray(p.hikeHistory) ? (p.hikeHistory as unknown[]).length : 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  );
});

router.get("/admin/usage", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const profiles = await db
    .select({ hikeHistory: profilesTable.hikeHistory })
    .from(profilesTable);

  const routeCounts: Record<string, number> = {};
  const sagaCounts: Record<string, number> = {};

  for (const p of profiles) {
    const hist = Array.isArray(p.hikeHistory)
      ? (p.hikeHistory as Array<Record<string, unknown>>)
      : [];
    for (const h of hist) {
      if (h["routeId"] && typeof h["routeId"] === "string") {
        routeCounts[h["routeId"]] = (routeCounts[h["routeId"]] ?? 0) + 1;
      }
      if (h["sagaId"] && typeof h["sagaId"] === "string") {
        sagaCounts[h["sagaId"]] = (sagaCounts[h["sagaId"]] ?? 0) + 1;
      }
    }
  }

  const allRoutes = await db
    .select({ id: catalogRoutesTable.id, name: catalogRoutesTable.name, region: catalogRoutesTable.region })
    .from(catalogRoutesTable);
  const allSagas = await db
    .select({ id: catalogSagasTable.id, title: catalogSagasTable.title, canton: catalogSagasTable.canton })
    .from(catalogSagasTable);

  const routeMap = Object.fromEntries(allRoutes.map((r) => [r.id, r]));
  const sagaMap = Object.fromEntries(allSagas.map((s) => [s.id, s]));

  const routes = Object.entries(routeCounts)
    .map(([id, count]) => ({ id, count, name: routeMap[id]?.name ?? id, region: routeMap[id]?.region ?? "" }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  const sagas = Object.entries(sagaCounts)
    .map(([id, count]) => ({ id, count, name: sagaMap[id]?.title ?? id, canton: sagaMap[id]?.canton ?? "" }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  res.json({ routes, sagas });
});

// ===================================================================
// PARTNER CRUD
// ===================================================================

const PARTNER_KATEGORIEN = [
  "restaurant", "cafe", "souvenir", "uebernachtung", "sonstiges",
] as const satisfies readonly PartnerKategorie[];

const PartnerBody = z.object({
  name: z.string().min(1),
  kategorie: z.enum(PARTNER_KATEGORIEN),
  canton: z.string().min(1),
  beschreibung: z.string().optional(),
  angebot: z.string().optional(),
  fotoUrl: z.string().url().optional(),
  email: z.string().email().optional(),
  lat: z.number(),
  lng: z.number(),
  aktivVon: z.string().datetime().optional(),
  aktivBis: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  paket: z.string().optional(),
  preisChf: z.number().int().min(0).optional(),
  einfuehrungspreisChf: z.number().int().min(0).optional(),
  einfuehrungspreisGueltigBis: z.string().datetime().optional(),
  zahlungsstatus: z.enum(["ausstehend", "bezahlt", "mahnung1", "mahnung2", "gesperrt"]).optional(),
  laufzeitStart: z.string().datetime().optional(),
  laufzeitEnde: z.string().datetime().optional(),
  notizenIntern: z.string().optional(),
});

router.get("/admin/partner-lookup", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const q = String(req.query["q"] ?? "").trim();
  if (q.length < 2) { res.json([]); return; }
  const rows = await db
    .select()
    .from(partnersTable)
    .where(or(ilike(partnersTable.name, `%${q}%`), ilike(partnersTable.email, `%${q}%`)))
    .orderBy(desc(partnersTable.createdAt))
    .limit(8);
  res.json(rows);
});

router.get("/admin/partner", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db.select().from(partnersTable).orderBy(desc(partnersTable.createdAt));
  res.json(rows);
});

router.post("/admin/partner", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = PartnerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const {
    aktivVon, aktivBis,
    einfuehrungspreisGueltigBis, laufzeitStart, laufzeitEnde,
    ...rest
  } = parsed.data;

  const [row] = await db
    .insert(partnersTable)
    .values({
      id: randomUUID(),
      ...rest,
      aktivVon: aktivVon ? new Date(aktivVon) : null,
      aktivBis: aktivBis ? new Date(aktivBis) : null,
      einfuehrungspreisGueltigBis: einfuehrungspreisGueltigBis ? new Date(einfuehrungspreisGueltigBis) : null,
      laufzeitStart: laufzeitStart ? new Date(laufzeitStart) : null,
      laufzeitEnde: laufzeitEnde ? new Date(laufzeitEnde) : null,
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
  const {
    aktivVon, aktivBis,
    einfuehrungspreisGueltigBis, laufzeitStart, laufzeitEnde,
    ...rest
  } = parsed.data;

  const [row] = await db
    .update(partnersTable)
    .set({
      ...rest,
      ...(aktivVon !== undefined && { aktivVon: aktivVon ? new Date(aktivVon) : null }),
      ...(aktivBis !== undefined && { aktivBis: aktivBis ? new Date(aktivBis) : null }),
      ...(einfuehrungspreisGueltigBis !== undefined && {
        einfuehrungspreisGueltigBis: einfuehrungspreisGueltigBis ? new Date(einfuehrungspreisGueltigBis) : null,
      }),
      ...(laufzeitStart !== undefined && { laufzeitStart: laufzeitStart ? new Date(laufzeitStart) : null }),
      ...(laufzeitEnde !== undefined && { laufzeitEnde: laufzeitEnde ? new Date(laufzeitEnde) : null }),
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

router.get("/admin/dashboard", (_req, res): void => {
  res.type("html").send(ADMIN_DASHBOARD_HTML);
});

router.get("/admin/partner-ui", (_req, res): void => {
  res.redirect("/api/admin/dashboard");
});

// Loescht alle gecachten Narrations-Audiodateien. Noetig nach einem
// ElevenLabs-Plan-Upgrade, damit die neue Schweizer-Akzent-Stimme (gsw)
// beim naechsten Abruf frisch synthetisiert wird statt alter
// Standard-Voice-Dateien zu servieren.
router.delete("/admin/narration-cache", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const deleted = await clearNarrationCache(req.log);
    res.json({ ok: true, deleted });
  } catch (err) {
    req.log.error({ err }, "Narration-Cache leeren fehlgeschlagen");
    res.status(500).json({ error: "Cache leeren fehlgeschlagen" });
  }
});

export default router;
