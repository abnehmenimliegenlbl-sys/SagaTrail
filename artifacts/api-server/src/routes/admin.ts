import { randomUUID, randomBytes, timingSafeEqual } from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { clerkClient } from "@clerk/express";
import { desc, eq, or, ilike, isNotNull, isNull, inArray, notInArray, ne, sql, count, and, lt } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  profilesTable,
  partnersTable,
  partnerAnfragenTable,
  catalogRoutesTable,
  catalogSagasTable,
  externalRoutesTable,
  verbandsTable,
  storiesTable,
  type PartnerKategorie,
} from "@workspace/db";
import { istPremiumAktiv } from "../lib/premiumStatus";
import { ADMIN_DASHBOARD_HTML } from "../lib/adminDashboardHtml";
import { clearNarrationCache } from "../lib/narrationCache";
import { translatePush } from "../lib/pushTranslator";
import { KANTON_SLUGS } from "../lib/kantonspackClaim";
import { startPartnerLeadsExport, jobState } from "../lib/partnerLeads";
import { warmAllCantonCaches, getCantonRoutes, syncSwissNumberedRoutes, enrichOneRoute } from "../lib/routeService";
import type { Logger } from "pino";
import { CANTON_ISO } from "../lib/cantonIso";
import { sendVerbandWillkommen } from "../lib/verbandEmail";
import {
  fetchLeadsFromWp, fetchOrgsFromWp, campaignState, startCampaign, buildPreviewHtml,
  makeUnsubToken, verifyUnsubToken,
} from "../lib/leadMailer";
import { partnerEmailLogTable, partnerEmailBlocklistTable } from "@workspace/db";

const router: IRouter = Router();

const PremiumFreischaltenBody = z.object({
  email: z.string().email(),
  monate: z.number().int().min(1).max(600).default(12),
  tier: z.enum(["premium", "premium_family", "elite", "elite_family"]).default("premium"),
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

// ---------------------------------------------------------------------------
// Demo-/Review-Nutzer anlegen (ohne E-Mail-Verifizierung)
// ---------------------------------------------------------------------------
// Clerk-Backend-API erstellt den Nutzer serverseitig — kein Verifizierungsmail
// noetig. So koennen Reviewer-Accounts mit Fake-E-Mails angelegt werden.
const CreateReviewUserBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

router.post("/admin/create-review-user", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = CreateReviewUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, firstName, lastName } = parsed.data;

  // Pruefen ob der Nutzer bereits existiert.
  const existing = await clerkClient.users.getUserList({ emailAddress: [email] });
  if (existing.data.length > 0) {
    const userId = existing.data[0].id;
    req.log.info({ userId, email }, "Review-Nutzer existiert bereits");
    res.json({ created: false, userId, email, message: "Nutzer existiert bereits" });
    return;
  }

  // Neu anlegen — Clerk-Backend-API ueberspringt E-Mail-Verifizierung.
  const newUser = await clerkClient.users.createUser({
    emailAddress: [email],
    password,
    firstName: firstName ?? "Demo",
    lastName: lastName ?? "User",
    skipPasswordChecks: false,
  });

  // bypass_client_trust erlaubt Login ohne Clerk-Dev-Trust-Check (Fake-E-Mails).
  await clerkClient.users.updateUser(newUser.id, { bypassClientTrust: true } as any);

  req.log.info({ userId: newUser.id, email }, "Review-Nutzer angelegt");
  res.status(201).json({ created: true, userId: newUser.id, email });
});

router.post("/admin/premium", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = PremiumFreischaltenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, monate, tier } = parsed.data;

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
    .set({ premiumBis: bis, subscriptionTier: tier, updatedAt: new Date() })
    .where(eq(profilesTable.id, userId))
    .returning();

  if (!row) {
    res.status(404).json({ error: `Clerk-Nutzer ${userId} hat noch kein Profil` });
    return;
  }

  req.log.info({ userId, email, premiumBis: bis.toISOString(), tier }, "Premium manuell freigeschaltet");
  res.json({ userId, email, premiumBis: bis.toISOString(), tier, premiumAktiv: istPremiumAktiv(row) });
});

const PackGrantBody = z.object({
  userId: z.string().min(1),
  slug: z.string().min(1),
});

/**
 * POST /admin/user-delete
 * Löscht ein Konto vollständig (Profil-Zeile + Clerk-Nutzer), analog DELETE /me,
 * aber admin-gesteuert für Test-/Karteileichen-Accounts.
 */
router.post("/admin/user-delete", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { userId } = req.body as { userId?: unknown };
  if (typeof userId !== "string" || !userId.startsWith("user_")) {
    res.status(400).json({ error: "userId (Clerk-ID, 'user_…') erforderlich" });
    return;
  }
  const deleted = await db
    .delete(profilesTable)
    .where(eq(profilesTable.id, userId))
    .returning({ id: profilesTable.id });
  let clerkGeloescht = true;
  try {
    await clerkClient.users.deleteUser(userId);
  } catch (err) {
    clerkGeloescht = false;
    req.log.warn({ err, userId }, "[admin/user-delete] Clerk-Nutzer konnte nicht gelöscht werden");
  }
  req.log.info({ userId, profilGeloescht: deleted.length > 0, clerkGeloescht }, "Admin-Nutzerlöschung");
  res.json({ ok: true, profilGeloescht: deleted.length > 0, clerkGeloescht });
});

router.post("/admin/pack-grant", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = PackGrantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { userId, slug } = parsed.data;
  if (!KANTON_SLUGS.includes(slug)) {
    res.status(400).json({ error: `Unbekannter Kanton-Slug: ${slug}` });
    return;
  }

  const [row] = await db
    .select({ purchasedPacks: profilesTable.purchasedPacks })
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));

  if (!row) {
    res.status(404).json({ error: `Nutzer ${userId} hat noch kein Profil` });
    return;
  }

  const current = row.purchasedPacks ?? [];
  if (current.includes(slug)) {
    res.json({ ok: true, bereitsVorhanden: true, purchasedPacks: current });
    return;
  }

  const updated = [...current, slug];
  await db
    .update(profilesTable)
    .set({ purchasedPacks: updated, updatedAt: new Date() })
    .where(eq(profilesTable.id, userId));

  req.log.info({ userId, slug }, "Kantonspack manuell freigeschaltet");
  res.json({ ok: true, bereitsVorhanden: false, purchasedPacks: updated });
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

router.post("/admin/reset-all", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  // Setzt ALLE Profile auf Gratis-Stand zurueck:
  // premium=false, purchasedPacks=[], subscriptionTier="free".
  // premiumSyncLockedUntil wird auf +30 Tage gesetzt damit der naechste
  // App-Start das Premium nicht sofort via RC-Sync wieder eintraegt.
  const sperreBis = new Date();
  sperreBis.setDate(sperreBis.getDate() + 30);

  const rows = await db
    .update(profilesTable)
    .set({
      premium: false,
      premiumBis: null,
      premiumSyncLockedUntil: sperreBis,
      purchasedPacks: [],
      subscriptionTier: "free",
      updatedAt: new Date(),
    })
    .returning({ id: profilesTable.id });

  req.log.warn({ anzahl: rows.length }, "Admin: Alle Profile auf Gratis zurueckgesetzt");
  res.json({ zurueckgesetzt: rows.length, ids: rows.map((r) => r.id) });
});

// Setzt alle Profile zurueck AUSSER den angegebenen IDs (z.B. Apple-Tester).
// Kein premiumSyncLockedUntil — RC-Sync darf sofort wieder hochstufen.
// Loescht auch hike_history, achievements und free_hike_used.
const ResetExceptBody = z.object({
  excludeIds: z.array(z.string()).default([]),
});
router.post("/admin/reset-except", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = ResetExceptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { excludeIds } = parsed.data;

  const rows = await db
    .update(profilesTable)
    .set({
      premium: false,
      premiumBis: null,
      premiumSyncLockedUntil: null,
      purchasedPacks: [],
      subscriptionTier: "free",
      freeHikeUsed: false,
      hikeHistory: [],
      achievements: [],
      updatedAt: new Date(),
    })
    .where(
      excludeIds.length > 0
        ? sql`${profilesTable.id} NOT IN (${sql.join(excludeIds.map((id) => sql`${id}`), sql`, `)})`
        : sql`TRUE`
    )
    .returning({ id: profilesTable.id });

  req.log.warn({ anzahl: rows.length, excludeIds }, "Admin: Profile selektiv zurueckgesetzt");
  res.json({ zurueckgesetzt: rows.length, ids: rows.map((r) => r.id) });
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

// -------------------------------------------------------------------
// ADMIN STATS / USERS / USAGE
// -------------------------------------------------------------------

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

// -------------------------------------------------------------------
// PARTNER CRUD
// -------------------------------------------------------------------

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
  telefon: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
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

/* ---- SAGEN-KATALOG (Foto-Kuration) ---- */
router.get("/admin/sagas", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const rows = await db
      .select({
        id: catalogSagasTable.id,
        canton: catalogSagasTable.canton,
        title: catalogSagasTable.title,
        summary: catalogSagasTable.summary,
        bildmotiv: catalogSagasTable.bildmotiv,
        fotoUrl: catalogSagasTable.fotoUrl,
        fotoAttribution: catalogSagasTable.fotoAttribution,
      })
      .from(catalogSagasTable)
      .orderBy(catalogSagasTable.canton, catalogSagasTable.title);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Admin sagas list fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

router.patch("/admin/sagas/:id/foto", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  const { fotoUrl, fotoAttribution } = req.body as {
    fotoUrl?: string | null;
    fotoAttribution?: string | null;
  };
  try {
    await db
      .update(catalogSagasTable)
      .set({
        fotoUrl: fotoUrl ?? null,
        fotoAttribution: fotoAttribution ?? null,
      })
      .where(eq(catalogSagasTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, id }, "Admin saga foto update fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

// -------------------------------------------------------------------
// ROUTEN-FOTOS
// -------------------------------------------------------------------

router.get("/admin/routes/cantons", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const rows = await db
      .selectDistinct({ canton: externalRoutesTable.canton })
      .from(externalRoutesTable)
      .orderBy(externalRoutesTable.canton);
    res.json(rows.map((r) => r.canton));
  } catch (err) {
    req.log.error({ err }, "Admin routes cantons fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

router.get("/admin/routes", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const canton =
    typeof req.query.canton === "string" ? req.query.canton : null;
  try {
    const rows = await db
      .select({
        id: externalRoutesTable.id,
        canton: externalRoutesTable.canton,
        name: externalRoutesTable.name,
        distanceKm: externalRoutesTable.distanceKm,
        sac: externalRoutesTable.sac,
        lat: externalRoutesTable.lat,
        lng: externalRoutesTable.lng,
        sagaId: externalRoutesTable.sagaId,
        featured: externalRoutesTable.featured,
        photoUrl: externalRoutesTable.photoUrl,
        photoAttribution: externalRoutesTable.photoAttribution,
      })
      .from(externalRoutesTable)
      .where(canton ? eq(externalRoutesTable.canton, canton) : undefined)
      .orderBy(externalRoutesTable.name);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Admin routes list fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

// PATCH /admin/routes/:id/featured – Featured-Flag toggeln
router.patch("/admin/routes/:id/featured", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  const { featured } = req.body as { featured: boolean };
  try {
    await db
      .update(externalRoutesTable)
      .set({ featured: !!featured })
      .where(eq(externalRoutesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, id }, "Admin route featured update fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

router.patch("/admin/routes/:id/foto", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  const { photoUrl, photoAttribution } = req.body as {
    photoUrl?: string | null;
    photoAttribution?: string | null;
  };
  try {
    await db
      .update(externalRoutesTable)
      .set({
        photoUrl: photoUrl ?? null,
        photoAttribution: photoAttribution ?? null,
      })
      .where(eq(externalRoutesTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, id }, "Admin route foto update fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

// POST /admin/routes/patch-geometry – Schreibt korrigierte Geometrie direkt in die DB,
// ohne Overpass. Nützlich wenn Overpass überlastet ist und warm-canton timeoutet.
router.post("/admin/routes/patch-geometry", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id, geometry } = req.body as { id?: string; geometry?: unknown };
  if (!id || !Array.isArray(geometry) || geometry.length < 2) {
    res.status(400).json({ error: "id und geometry (Array mit ≥2 Punkten) erforderlich" });
    return;
  }
  await db
    .update(externalRoutesTable)
    .set({ geometry: geometry as [number, number][], geometryVersion: 3 })
    .where(eq(externalRoutesTable.id, id))
    .execute();
  req.log.info({ id, punkte: geometry.length }, "patch-geometry: Geometrie direkt gesetzt");
  res.json({ ok: true, id, punkte: geometry.length });
});

// DELETE /admin/routes/clear-canton – Löscht alle gespeicherten Routen eines Kantons aus der DB
router.delete("/admin/routes/clear-canton", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { canton } = req.body as { canton?: string };
  if (!canton) { res.status(400).json({ error: "canton fehlt" }); return; }

  const result = await db
    .delete(externalRoutesTable)
    .where(eq(externalRoutesTable.canton, canton))
    .returning({ id: externalRoutesTable.id });

  req.log.info({ canton, deleted: result.length }, "Kanton-Routen gelöscht");
  res.json({ ok: true, canton, deleted: result.length });
});

// POST /admin/routes/warm-canton – Lädt Routen eines Kantons langsam aus OSM
// Nutzt große Timeouts + kleine Batches + Pausen → geeignet für Kantone mit 200+ Routen
// clearFirst: true → löscht alle bestehenden Routen des Kantons vor dem Neu-Laden
router.post("/admin/routes/warm-canton", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { canton, timeoutMs = 120_000, batchSize = 20, pauseMs = 3_000, forceRefresh = false, skipPhotos = false, clearFirst = false } =
    req.body as { canton?: string; timeoutMs?: number; batchSize?: number; pauseMs?: number; forceRefresh?: boolean; skipPhotos?: boolean; clearFirst?: boolean };
  if (!canton) { res.status(400).json({ error: "canton fehlt" }); return; }

  // Antwort sofort senden; Ladeprozess läuft im Hintergrund
  res.json({ ok: true, canton, timeoutMs, batchSize, pauseMs, forceRefresh, skipPhotos, clearFirst, message: "Hintergrundlauf gestartet – verfolge den Fortschritt in den Server-Logs" });

  (async () => {
    try {
      if (clearFirst) {
        const deleted = await db.delete(externalRoutesTable).where(eq(externalRoutesTable.canton, canton)).returning({ id: externalRoutesTable.id });
        req.log.info({ canton, deleted: deleted.length }, "Slow-warm: Routen gelöscht vor Neu-Laden");
      }
      req.log.info({ canton, timeoutMs, batchSize, pauseMs, forceRefresh, skipPhotos, clearFirst }, "Slow-warm gestartet");
      const routes = await getCantonRoutes(canton, req.log, undefined, { timeoutMs, batchSize, pauseMs, forceRefresh: clearFirst ? true : forceRefresh, skipPhotos });
      req.log.info({ canton, count: routes.length }, "Slow-warm abgeschlossen");
    } catch (err) {
      req.log.error({ canton, err }, "Slow-warm fehlgeschlagen");
    }
  })();
});

// POST /admin/routes/warm-all – Alle 26 Kantone sequenziell langsam laden
router.post("/admin/routes/warm-all", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { timeoutMs = 120_000, batchSize = 15, pauseMs = 4_000, cantonPauseMs = 10_000, forceRefresh = true } =
    req.body as { timeoutMs?: number; batchSize?: number; pauseMs?: number; cantonPauseMs?: number; forceRefresh?: boolean };

  const cantons = Object.keys(CANTON_ISO);
  res.json({ ok: true, cantons: cantons.length, timeoutMs, batchSize, pauseMs, cantonPauseMs, forceRefresh, message: "Alle-Kantone-Warm gestartet – läuft sequenziell im Hintergrund" });

  (async () => {
    req.log.info({ total: cantons.length, timeoutMs, batchSize, pauseMs, cantonPauseMs }, "Alle-Kantone-Warm gestartet");
    for (const canton of cantons) {
      try {
        req.log.info({ canton }, "Kantone-Warm: starte");
        const routes = await getCantonRoutes(canton, req.log, undefined, { timeoutMs, batchSize, pauseMs, forceRefresh });
        req.log.info({ canton, count: routes.length }, "Kantone-Warm: abgeschlossen");
      } catch (err) {
        req.log.error({ canton, err }, "Kantone-Warm: fehlgeschlagen, weiter mit nächstem");
      }
      // Pause zwischen Kantonen damit Overpass sich erholen kann
      await new Promise((resolve) => setTimeout(resolve, cantonPauseMs));
    }
    req.log.info("Alle-Kantone-Warm vollständig abgeschlossen");
  })();
});

// POST /admin/routes/sync-numbered – Alle nummerierten SchweizMobil-Routen (1–999)
// aus OSM laden und dem jeweiligen Startkanton zuordnen.
router.post("/admin/routes/sync-numbered", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const {
    skipPhotos = true,
    // batchSize=3: nationale Routen haben Hunderte Ways, groessere Batches
    // bringen Overpass in ein Timeout. Nicht via API ueberschreibbar um
    // versehentliche Timeouts zu verhindern.
    batchSize = 3,
    pauseMs = 4_000,
    // 120s pro Route: auch sehr grosse nationale Routen (Nordalpenweg etc.)
    // brauchen Zeit. Kein Distanzlimit mehr — wir laden alles vollstaendig.
    timeoutMs = 120_000,
    forceRefresh = false,
  } = req.body as {
    skipPhotos?: boolean;
    batchSize?: number;
    pauseMs?: number;
    timeoutMs?: number;
    forceRefresh?: boolean;
  };

  res.json({
    ok: true,
    skipPhotos,
    batchSize,
    pauseMs,
    timeoutMs,
    forceRefresh,
    message: "Nummerierte-Routen-Sync gestartet – läuft im Hintergrund",
  });

  (async () => {
    try {
      req.log.info({ skipPhotos, batchSize, pauseMs, timeoutMs, forceRefresh }, "Nummerierte-Routen-Sync: Start");
      const count = await syncSwissNumberedRoutes(req.log, { skipPhotos, batchSize, pauseMs, timeoutMs, forceRefresh });
      req.log.info({ count }, "Nummerierte-Routen-Sync: fertig");
    } catch (err) {
      req.log.error({ err }, "Nummerierte-Routen-Sync: fehlgeschlagen");
    }
  })();
});

// -------------------------------------------------------------------
// PARTNER-ANFRAGEN
// -------------------------------------------------------------------

router.get("/admin/anfragen", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const rows = await db
      .select()
      .from(partnerAnfragenTable)
      .orderBy(desc(partnerAnfragenTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Anfragen laden fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

const AnfrageStatusBody = z.object({
  status: z.enum(["neu", "in_bearbeitung", "abgelehnt", "aktiv"]),
});

router.patch("/admin/anfragen/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  const parsed = AnfrageStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültiger Status" });
    return;
  }
  try {
    await db
      .update(partnerAnfragenTable)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(partnerAnfragenTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, id }, "Anfrage-Status-Update fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

router.get("/admin/dashboard", (_req, res): void => {
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(ADMIN_DASHBOARD_HTML);
});

router.get("/admin/partner-ui", (_req, res): void => {
  res.redirect("/api/admin/dashboard");
});

// Loescht alle gecachten Narrations-Audiodateien. Noetig nach einem
// ElevenLabs-Plan-Upgrade, damit die neue Schweizer-Akzent-Stimme (gsw)
// beim naechsten Abruf frisch synthetisiert wird statt alter
// Standard-Voice-Dateien zu servieren.
// -------------------------------------------------------------------
// PUSH-NACHRICHTEN
// -------------------------------------------------------------------

type PushTier = "alle" | "premium" | "premium_family" | "elite" | "elite_family";
const PUSH_TIERS: readonly PushTier[] = ["alle", "premium", "premium_family", "elite", "elite_family"];

const PushSendBody = z.object({
  tier:  z.union([
    z.literal("alle"),
    z.literal("premium"),
    z.literal("premium_family"),
    z.literal("elite"),
    z.literal("elite_family"),
  ]),
  title: z.string().min(1).max(100),
  body:  z.string().min(1).max(500),
  data:  z.record(z.string(), z.unknown()).optional(),
  translate: z.boolean().optional(),
});

// Fehler-Muster die auf Expo-Go/Dev-Tokens hinweisen (kein APNs-Credential
// vorhanden weil das Token zu einem Replit-Expo-Go-Experience gehört).
// Diese Tokens werden stillschweigend übersprungen und aus der DB entfernt.
const DEV_TOKEN_ERROR_PATTERNS = [
  /could not find apns credentials/i,
  /apns credentials/i,
  /\bDEVICE_NOT_REGISTERED\b/,
];

function isDevTokenError(msg: string): boolean {
  return DEV_TOKEN_ERROR_PATTERNS.some((p) => p.test(msg));
}

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ sent: number; failed: number; devSkipped: number; errors: string[]; staleTokens: string[] }> {
  let sent = 0;
  let failed = 0;
  let devSkipped = 0;
  const errors: string[] = [];
  const staleTokens: string[] = [];
  const expoToken = process.env.EXPO_TOKEN;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(expoToken ? { Authorization: `Bearer ${expoToken}` } : {}),
  };

  // Send one token per request to avoid PUSH_TOO_MANY_EXPERIENCE_IDS —
  // Expo determines experience IDs server-side so client-side batching
  // cannot guarantee all tokens belong to the same project.
  for (const to of tokens) {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers,
        body: JSON.stringify([{ to, title, body, sound: "default", ...(data ? { data } : {}) }]),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        if (isDevTokenError(errText)) {
          devSkipped++;
          staleTokens.push(to);
        } else {
          errors.push(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
          failed++;
        }
        continue;
      }
      const json = (await res.json()) as { data?: { status: string; message?: string; details?: unknown }[] };
      const r = (json.data ?? [])[0];
      if (!r || r.status === "ok") {
        sent++;
      } else {
        const msg = r.message ?? JSON.stringify(r.details ?? r);
        if (isDevTokenError(msg)) {
          devSkipped++;
          staleTokens.push(to);
        } else {
          failed++;
          errors.push(msg);
        }
      }
    } catch (e) {
      errors.push(String(e));
      failed++;
    }
  }
  return { sent, failed, devSkipped, errors, staleTokens };
}

router.post("/admin/push", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = PushSendBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { tier, title, body: msg, data, translate } = parsed.data;

  // Alle Profile mit Push-Token laden
  const rows = await db
    .select({ id: profilesTable.id, pushToken: profilesTable.pushToken, subscriptionTier: profilesTable.subscriptionTier, language: profilesTable.language })
    .from(profilesTable)
    .where(isNotNull(profilesTable.pushToken));

  const matching = rows.filter((r) => {
    if (!r.pushToken) return false;
    if (tier === "alle") return true;
    return r.subscriptionTier === tier;
  });

  const tokens = matching.map((r) => r.pushToken as string);
  const tierSkipped = rows.length - matching.length;

  req.log.info({ tier, count: tokens.length, translate: !!translate }, "Push-Kampagne gestartet");

  let sent = 0, failed = 0, devSkipped = 0;
  const errors: string[] = [];
  const staleTokens: string[] = [];

  if (translate) {
    // Nach Nutzersprache gruppieren und pro Sprache übersetzt senden
    const nachSprache = new Map<string, string[]>();
    const gesehen = new Set<string>();
    for (const r of matching) {
      const token = r.pushToken as string;
      if (gesehen.has(token)) continue; // Dedupe: jedes Gerät erhält genau eine Nachricht
      gesehen.add(token);
      const lang = r.language || "de";
      const arr = nachSprache.get(lang) ?? [];
      arr.push(token);
      nachSprache.set(lang, arr);
    }
    const texte = await translatePush({ title, body: msg }, [...nachSprache.keys()], req.log);
    for (const [lang, langTokens] of nachSprache) {
      const t = texte.get(lang) ?? { title, body: msg };
      const r = await sendExpoPush(langTokens, t.title, t.body, data);
      sent += r.sent; failed += r.failed; devSkipped += r.devSkipped;
      errors.push(...r.errors); staleTokens.push(...r.staleTokens);
    }
  } else {
    const r = await sendExpoPush(tokens, title, msg, data);
    sent = r.sent; failed = r.failed; devSkipped = r.devSkipped;
    errors.push(...r.errors); staleTokens.push(...r.staleTokens);
  }

  // Expo-Go/Dev-Tokens aus der DB entfernen — sie werden nie funktionieren
  if (staleTokens.length > 0) {
    db.update(profilesTable)
      .set({ pushToken: null })
      .where(inArray(profilesTable.pushToken, staleTokens))
      .catch((err) => req.log.warn({ err }, "Stale-Token-Bereinigung fehlgeschlagen"));
    req.log.info({ count: staleTokens.length }, "Expo-Go/Dev-Push-Tokens bereinigt");
  }

  req.log.info({ tier, sent, failed, devSkipped, tierSkipped, errors }, "Push-Kampagne abgeschlossen");
  res.json({ ok: true, tier, total: rows.length, targeted: tokens.length, sent, failed, devSkipped, skipped: tierSkipped, errors });
});

router.get("/admin/push/stats", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const rows = await db
    .select({ tier: profilesTable.subscriptionTier, hasToken: profilesTable.pushToken })
    .from(profilesTable);

  const byTier: Record<string, { total: number; withToken: number }> = {};
  let totalWithToken = 0;
  rows.forEach((r) => {
    const t = r.tier ?? "free";
    if (!byTier[t]) byTier[t] = { total: 0, withToken: 0 };
    byTier[t].total++;
    if (r.hasToken) { byTier[t].withToken++; totalWithToken++; }
  });

  res.json({ total: rows.length, totalWithToken, byTier });
});

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

// ---------------------------------------------------------------------------
// Partner-Leads CSV (Google Places API)
// ---------------------------------------------------------------------------
// POST /admin/partner-leads/start — startet Export im Hintergrund
router.post("/admin/partner-leads/start", (req, res): void => {
  if (!requireAdminToken(req, res)) return;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "GOOGLE_PLACES_API_KEY nicht konfiguriert" });
    return;
  }

  if (jobState.status === "running") {
    res.json({ started: false, message: "Export läuft bereits", state: sanitizeState() });
    return;
  }

  const radius = Number(req.query.radius ?? 2000);
  startPartnerLeadsExport(apiKey, radius);
  req.log.info({ radius }, "Partner-Leads Export gestartet (Background)");
  res.json({ started: true, message: "Export gestartet", state: sanitizeState() });
});

// GET /admin/partner-leads/status — Fortschritt abfragen
router.get("/admin/partner-leads/status", (req, res): void => {
  if (!requireAdminToken(req, res)) return;
  res.json(sanitizeState());
});

// GET /admin/partner-leads/download — CSV herunterladen wenn fertig
router.get("/admin/partner-leads/download", (req, res): void => {
  if (!requireAdminToken(req, res)) return;

  if (jobState.status === "running") {
    res.status(202).json({ message: "Export läuft noch", state: sanitizeState() });
    return;
  }
  if (jobState.status !== "done" || !jobState.csv) {
    res.status(404).json({ message: "Kein Export vorhanden. Zuerst POST /start aufrufen." });
    return;
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="sagatrail-partner-leads.csv"');
  res.send("\uFEFF" + jobState.csv);
});

// ---------------------------------------------------------------------------
// Routen-Fotos zurücksetzen (nach Qualitäts-Logik-Upgrade)
// ---------------------------------------------------------------------------
// POST /admin/photos/reset
// Leert photo_url + photo_attribution in external_routes für alle oder
// einen bestimmten Kanton. Danach holt der tägliche Sync und der Mobile-
// Client neue Fotos mit der aktuellen (strengeren) Qualitäts-Logik.
//
// Body (optional): { canton: "bern" }  — ohne canton: alle Kantone
router.post("/admin/photos/reset", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { canton } = z.object({ canton: z.string().optional() }).parse(req.body ?? {});
  try {
    const result = canton
      ? await db
          .update(externalRoutesTable)
          .set({ photoUrl: null, photoAttribution: null })
          .where(eq(externalRoutesTable.canton, canton))
          .returning({ id: externalRoutesTable.id })
      : await db
          .update(externalRoutesTable)
          .set({ photoUrl: null, photoAttribution: null })
          .returning({ id: externalRoutesTable.id });
    req.log.info({ canton: canton ?? "alle", count: result.length }, "Routen-Fotos zurückgesetzt");
    res.json({ ok: true, reset: result.length, canton: canton ?? "alle" });
  } catch (err) {
    req.log.error({ err }, "Routen-Fotos zurücksetzen fehlgeschlagen");
    res.status(500).json({ error: "Zurücksetzen fehlgeschlagen" });
  }
});

// ---------------------------------------------------------------------------
// Routen-Namen bereinigen (fixme-Platzhalter entfernen)
// ---------------------------------------------------------------------------
// POST /admin/routes/fix-names
// Bereinigt "fixme"-Platzhalter in external_routes.name direkt per SQL,
// ohne dass ein vollstaendiger Overpass-Sync noetig waere.
router.post("/admin/routes/fix-names", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const result = await db.execute(sql`
      UPDATE external_routes
      SET name = trim(
        regexp_replace(
          regexp_replace(
            regexp_replace(name, '\\s*[-\u2013\u2014]?\\s*fixme\\s*[-\u2013\u2014]?\\s*', ' ', 'gi'),
            '\\s{2,}', ' ', 'g'
          ),
          '^\\s*[-\u2013\u2014]\\s*|\\s*[-\u2013\u2014]\\s*$', '', 'g'
        )
      )
      WHERE name ~* 'fixme'
      RETURNING id, name
    `);
    const rows = result.rows as { id: string; name: string }[];
    req.log.info({ count: rows.length }, "Routen-Namen bereinigt (fixme entfernt)");
    res.json({ ok: true, cleaned: rows.length, examples: rows.slice(0, 5) });
  } catch (err) {
    req.log.error({ err }, "Routen-Namen-Bereinigung fehlgeschlagen");
    res.status(500).json({ error: "Bereinigung fehlgeschlagen" });
  }
});

// -------------------------------------------------------------------
// GSW STORY CACHE INVALIDIERUNG
// -------------------------------------------------------------------

// DELETE /admin/stories/gsw — löscht alle gecachten gsw-Storys aus der DB,
// damit sie beim nächsten Abruf frisch als Mundart-Text generiert werden.
router.delete("/admin/stories/gsw", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const result = await db
    .delete(storiesTable)
    .where(eq(storiesTable.lang, "gsw"))
    .returning({ id: storiesTable.sagaId });
  req.log.info({ count: result.length }, "gsw-Storys aus Cache gelöscht");
  res.json({ ok: true, deleted: result.length });
});

// -------------------------------------------------------------------
// VERBÄNDE CRUD
// -------------------------------------------------------------------

const VerbandBody = z.object({
  name:           z.string().min(1).max(200),
  email:          z.string().email().max(200),
  kontaktName:    z.string().min(1).max(200),
  kontaktTelefon: z.string().max(50).optional(),
  kantone:        z.string().min(1),
  isActive:       z.boolean().default(true),
  notizen:        z.string().optional(),
});

router.get("/admin/verbande", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = await db.select().from(verbandsTable).orderBy(desc(verbandsTable.createdAt));
  res.json(rows);
});

router.post("/admin/verbande", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const parsed = VerbandBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // 1. Verband in DB anlegen
  const [row] = await db.insert(verbandsTable).values({ id: randomUUID(), ...parsed.data }).returning();
  req.log.info({ verbandId: row.id, name: row.name }, "Verband angelegt");

  // 2. Clerk-Account anlegen (oder bestehenden übernehmen) + Premium-Profil
  const passwort = randomBytes(10).toString("base64url"); // ~14 Zeichen, URL-sicher
  try {
    const bestehende = await clerkClient.users.getUserList({ emailAddress: [row.email] });
    let userId: string;
    if (bestehende.data.length > 0) {
      userId = bestehende.data[0].id;
      req.log.info({ userId, email: row.email }, "Verband: bestehender Clerk-User gefunden");
    } else {
      const neuerUser = await clerkClient.users.createUser({
        emailAddress: [row.email],
        password:     passwort,
        firstName:    row.kontaktName.split(" ")[0] ?? row.name,
        lastName:     row.kontaktName.split(" ").slice(1).join(" ") || row.name,
        skipPasswordChecks: true,
      });
      userId = neuerUser.id;
      req.log.info({ userId, email: row.email }, "Verband: Clerk-User angelegt");
    }

    // Premium für 10 Jahre (analog Apple-Test-Accounts)
    const premiumBis = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3650);
    await db
      .insert(profilesTable)
      .values({
        id:          userId,
        name:        row.kontaktName,
        archetype:   "reisende",
        homeCanton:  "Bern",
        language:    "de",
        ageTier:     "erwachsene",
        premium:     false,
        premiumBis,
        premiumSyncLockedUntil: premiumBis,
      })
      .onConflictDoUpdate({
        target: profilesTable.id,
        set: {
          premiumBis,
          premiumSyncLockedUntil: premiumBis,
          updatedAt: new Date(),
        },
      });

    // 3. Willkommens-E-Mail via WordPress AJAX-Handler (wie Verträge),
    //    Fallback auf nodemailer wenn WP_AJAX_URL nicht konfiguriert.
    const proto     = req.headers["x-forwarded-proto"] ?? "https";
    const host      = req.headers["x-forwarded-host"] ?? req.headers.host ?? "sagatrail.ch";
    const portalUrl = `${proto}://${host}/api/verband/portal`;

    const wpAjaxUrl   = process.env.WP_AJAX_URL;   // z.B. https://sagatrail.ch/wp-admin/admin-ajax.php
    const wpHookSecret = process.env.WP_HOOK_SECRET; // identisch mit SAGATRAIL_HOOK_SECRET in wp-config.php

    if (wpAjaxUrl && wpHookSecret) {
      const body = new URLSearchParams({
        action:          "st_send_verband_willkommen",
        secret:          wpHookSecret,
        verbandName:     row.name,
        email:           row.email,
        kontaktName:     row.kontaktName,
        kontaktTelefon:  row.kontaktTelefon ?? "",
        kantone:         row.kantone,
        passwort,
        portalUrl,
      });
      fetch(wpAjaxUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    body.toString(),
        signal:  AbortSignal.timeout(15_000),
      })
        .then(async (r) => {
          const json = await r.json().catch(() => ({}));
          if (!r.ok || !(json as Record<string, unknown>).success) {
            req.log.warn({ status: r.status, json, email: row.email }, "WP Willkommens-Mail fehlgeschlagen");
          } else {
            req.log.info({ email: row.email }, "WP Willkommens-Mail gesendet");
          }
        })
        .catch((err) => req.log.warn({ err, email: row.email }, "WP Willkommens-Mail Netzwerkfehler"));
    } else {
      // Fallback: nodemailer direkt
      sendVerbandWillkommen({
        verbandName: row.name,
        email:       row.email,
        kontaktName: row.kontaktName,
        passwort,
        portalUrl,
      }).catch((err) => req.log.warn({ err, email: row.email }, "Verband-Willkommens-Mail (nodemailer) fehlgeschlagen"));
    }

    res.status(201).json({ ...row, _passwort: passwort, _clerkUserId: userId });
  } catch (err) {
    req.log.error({ err, verbandId: row.id }, "Clerk/Premium/Mail nach Verband-Anlage fehlgeschlagen");
    // Verband ist schon angelegt — trotzdem 201, aber mit Hinweis
    res.status(201).json({ ...row, _warning: "Clerk-Account oder E-Mail fehlgeschlagen, bitte manuell prüfen." });
  }
});

router.patch("/admin/verbande/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const parsed = VerbandBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .update(verbandsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(verbandsTable.id, req.params.id as string))
    .returning();
  if (!row) { res.status(404).json({ error: "Verband nicht gefunden" }); return; }
  res.json(row);
});

router.delete("/admin/verbande/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const [row] = await db.delete(verbandsTable).where(eq(verbandsTable.id, req.params.id as string)).returning();
  if (!row) { res.status(404).json({ error: "Verband nicht gefunden" }); return; }
  res.status(204).end();
});

// ═══════════════════════════════════════════════════════════════════════════
// MASSEN-E-MAIL / PARTNER-LEADS
// ═══════════════════════════════════════════════════════════════════════════

const WP_AJAX = () => process.env.WP_AJAX_URL ?? "";
const WP_SECRET = () => process.env.WP_HOOK_SECRET ?? "";

// GET /admin/leads/meta – Typen, Kantone, Sprachen für Dropdowns
router.get("/admin/leads/meta", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const wpUrl = WP_AJAX();
  if (!wpUrl) { res.status(503).json({ error: "WP_AJAX_URL nicht konfiguriert" }); return; }
  try {
    const form = new URLSearchParams({ action: "sagatrail_leads_meta", hook_secret: WP_SECRET() });
    const r = await fetch(wpUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString(), signal: AbortSignal.timeout(10_000) });
    const json = await r.json() as { success: boolean; data?: unknown };
    if (!json.success) throw new Error("WP Fehler");
    res.json(json.data);
  } catch (err) {
    res.status(502).json({ error: (err instanceof Error ? err.message : "WP nicht erreichbar") });
  }
});

// GET /admin/leads/list?typ=&kantone=ZH,BE&sprache= – gefilterte Leads
router.get("/admin/leads/list", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const wpUrl = WP_AJAX();
  if (!wpUrl) { res.status(503).json({ error: "WP_AJAX_URL nicht konfiguriert" }); return; }
  const { typ, kategorie, kanton, kantone: kantoneStr, sprache } = req.query as Record<string, string>;
  const kantone = kantoneStr ? kantoneStr.split(",").map((k) => k.trim()).filter(Boolean) : undefined;
  try {
    const leads = await fetchLeadsFromWp({ typ, kategorie, kanton, kantone, sprache }, wpUrl, WP_SECRET());
    res.json({ leads, total: leads.length });
  } catch (err) {
    res.status(502).json({ error: (err instanceof Error ? err.message : "WP nicht erreichbar") });
  }
});

// POST /admin/leads/preview – E-Mail-Vorschau als HTML
router.post("/admin/leads/preview", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { bodyText, sampleLead } = req.body ?? {};
  if (!bodyText) { res.status(400).json({ error: "bodyText fehlt" }); return; }
  const html = buildPreviewHtml(String(bodyText), sampleLead ?? {});
  res.type("html").send(html);
});

// POST /admin/leads/send – Kampagne starten
router.post("/admin/leads/send", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (campaignState.status === "running") { res.status(409).json({ error: "Kampagne läuft bereits" }); return; }
  const { subject, bodyText, filters } = req.body ?? {};
  if (!subject || !bodyText) { res.status(400).json({ error: "subject und bodyText erforderlich" }); return; }
  const wpUrl = WP_AJAX();
  if (!wpUrl) { res.status(503).json({ error: "WP_AJAX_URL nicht konfiguriert" }); return; }
  let leads;
  try {
    const f = filters ?? {};
    if (f._source === "orgs") {
      const kantone = Array.isArray(f.kantone) && f.kantone.length ? f.kantone : undefined;
      leads = await fetchOrgsFromWp({ kategorie: f.kategorie, typ: f.typ, kanton: f.kanton, kantone, sprache: f.sprache }, wpUrl, WP_SECRET());
    } else {
      const kantone = Array.isArray(f.kantone) && f.kantone.length ? f.kantone : undefined;
      leads = await fetchLeadsFromWp({ typ: f.typ, kategorie: f.kategorie, kanton: f.kanton, kantone, sprache: f.sprache }, wpUrl, WP_SECRET());
    }
  } catch (err) {
    res.status(502).json({ error: (err instanceof Error ? err.message : "WP nicht erreichbar") }); return;
  }
  if (!leads.length) { res.status(400).json({ error: "Keine Empfänger mit diesen Filtern" }); return; }
  const proto = req.headers["x-forwarded-proto"] as string ?? req.protocol;
  const host  = req.get("host")!;
  const apiBase = `${proto}://${host}`;
  await startCampaign({ subject, bodyText, leads, apiBase });
  res.json({ ok: true, total: leads.length, campaignId: campaignState.campaignId });
});

// GET /admin/orgs/meta – Kategorien, Typen, Kantone aus organisationen-Tabelle
router.get("/admin/orgs/meta", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const wpUrl = WP_AJAX();
  if (!wpUrl) { res.status(503).json({ error: "WP_AJAX_URL nicht konfiguriert" }); return; }
  try {
    const form = new URLSearchParams({ action: "sagatrail_orgs_meta", hook_secret: WP_SECRET() });
    const r = await fetch(wpUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString(), signal: AbortSignal.timeout(10_000) });
    const json = await r.json() as { success: boolean; data?: unknown };
    if (!json.success) throw new Error("WP Fehler");
    res.json(json.data);
  } catch (err) {
    res.status(502).json({ error: (err instanceof Error ? err.message : "WP nicht erreichbar") });
  }
});

// GET /admin/orgs/list?kategorie=&typ=&kanton= – gefilterte Organisationen
router.get("/admin/orgs/list", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const wpUrl = WP_AJAX();
  if (!wpUrl) { res.status(503).json({ error: "WP_AJAX_URL nicht konfiguriert" }); return; }
  const { kategorie, typ, kanton, kantone: kantoneStr, sprache } = req.query as Record<string, string>;
  const kantone = kantoneStr ? kantoneStr.split(",").map((k) => k.trim()).filter(Boolean) : undefined;
  try {
    const leads = await fetchOrgsFromWp({ kategorie, typ, kanton, kantone, sprache }, wpUrl, WP_SECRET());
    res.json({ leads, total: leads.length });
  } catch (err) {
    res.status(502).json({ error: (err instanceof Error ? err.message : "WP nicht erreichbar") });
  }
});

// GET /admin/leads/status – Kampagnen-Fortschritt
router.get("/admin/leads/status", (req, res): void => {
  if (!requireAdminToken(req, res)) return;
  res.json(campaignState);
});

// POST /admin/leads/stop – laufende Kampagne anhalten
router.post("/admin/leads/stop", (req, res): void => {
  if (!requireAdminToken(req, res)) return;
  if (campaignState.status !== "running") {
    res.status(409).json({ error: "Keine Kampagne läuft" });
    return;
  }
  campaignState.stopRequested = true;
  res.json({ ok: true });
});

// GET /admin/leads/log?page=1&perPage=50&subject= – Versand-Log
router.get("/admin/leads/log", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const page    = Math.max(1, parseInt(String(req.query["page"]  ?? "1"),   10));
  const perPage = Math.min(200, Math.max(10, parseInt(String(req.query["perPage"] ?? "100"), 10)));
  const subjectFilter = String(req.query["subject"] ?? "");
  const offset = (page - 1) * perPage;
  let rows;
  if (subjectFilter) {
    rows = await db.execute(sql`
      SELECT id, campaign_id, subject, email, recipient_name, status, error, sent_at
      FROM partner_email_log
      WHERE subject ILIKE ${"%" + subjectFilter + "%"}
      ORDER BY sent_at DESC
      LIMIT ${perPage} OFFSET ${offset}
    `);
  } else {
    rows = await db.execute(sql`
      SELECT id, campaign_id, subject, email, recipient_name, status, error, sent_at
      FROM partner_email_log
      ORDER BY sent_at DESC
      LIMIT ${perPage} OFFSET ${offset}
    `);
  }
  const count = await db.execute(sql`SELECT COUNT(*) FROM partner_email_log`);
  res.json({ rows: rows.rows, total: Number((count.rows[0] as Record<string,unknown>)["count"]) });
});

// DELETE /admin/leads/blocklist?email= – Aus Blockliste entfernen
router.delete("/admin/leads/blocklist", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const email = String(req.query["email"] ?? "").toLowerCase();
  if (!email) { res.status(400).json({ error: "email fehlt" }); return; }
  await db.delete(partnerEmailBlocklistTable).where(eq(partnerEmailBlocklistTable.email, email));
  res.json({ ok: true });
});

// GET /api/unsubscribe?e=BASE64URL(email)&t=TOKEN&c=CAMPAIGN_ID – öffentlich
router.get("/unsubscribe", async (req, res): Promise<void> => {
  const { e: emailB64, t: token, c: campaignId } = req.query as Record<string, string>;
  let email = "";
  try { email = Buffer.from(emailB64 ?? "", "base64url").toString(); } catch { /**/ }
  const valid = email && campaignId && token && verifyUnsubToken(email, campaignId, token);
  if (valid) {
    await db.insert(partnerEmailBlocklistTable).values({ email: email.toLowerCase() }).onConflictDoNothing();
  }
  res.type("html").send(`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SagaTrail – Abmeldung</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f4f1}
.box{text-align:center;max-width:420px;padding:40px;background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
h1{color:#CC0000;font-size:24px;margin-bottom:12px}p{color:#555;font-size:15px;line-height:1.6;margin-bottom:8px}
a{color:#CC0000}</style></head>
<body><div class="box">
${valid
  ? `<h1>✓ Abgemeldet</h1>
     <p>Die E-Mail-Adresse <strong>${email.replace(/[<>]/g,"")}</strong> wurde erfolgreich aus unserem Verteiler entfernt.</p>
     <p style="font-size:13px;color:#aaa;margin-top:20px">Sie erhalten keine weiteren Marketingmails von SagaTrail.</p>
     <p style="margin-top:16px"><a href="https://sagatrail.ch">sagatrail.ch</a></p>`
  : `<h1>Ungültiger Link</h1>
     <p>Dieser Abmeldelink ist nicht mehr gültig oder wurde bereits verwendet.</p>
     <p>Bitte senden Sie eine E-Mail an <a href="mailto:info@sagatrail.ch">info@sagatrail.ch</a> um sich abzumelden.</p>`}
</div></body></html>`);
});

function sanitizeState() {
  return {
    status: jobState.status,
    cantonsTotal: jobState.cantonsTotal,
    cantonesDone: jobState.cantonesDone,
    leadsFound: jobState.leadsFound,
    startedAt: jobState.startedAt,
    finishedAt: jobState.finishedAt,
    error: jobState.error,
  };
}

// ─── Stripe-Produkte seeden (einmalig) ───────────────────────────────────────
router.post("/admin/stripe/seed-products", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  try {
    const { getUncachableStripeClient } = await import("../lib/stripeClient");
    const stripe = await getUncachableStripeClient();

    const PRODUCTS = [
      {
        name: "SagaTrail Basic",
        description: "Ihr Betrieb erscheint als Kartenmarker auf der Wanderroute.",
        prices: [
          { interval: "month" as const, amount: 1499, label: "CHF 14.99/Monat" },
          { interval: "year"  as const, amount: 9900, label: "CHF 99/Jahr" },
        ],
      },
      {
        name: "SagaTrail Standard",
        description: "Mit Foto, Beschreibung und Kontaktdaten auf der Wanderroute.",
        prices: [{ interval: "year" as const, amount: 19900, label: "CHF 199/Jahr" }],
      },
      {
        name: "SagaTrail Premium",
        description: "Vollständiges Profil + automatische Wanderer-Ansage in der Nähe.",
        prices: [{ interval: "year" as const, amount: 49900, label: "CHF 499/Jahr" }],
      },
    ];

    const results: string[] = [];

    for (const prod of PRODUCTS) {
      const existing = await stripe.products.search({
        query: `name:'${prod.name}' AND active:'true'`,
      });

      let productId: string;
      if (existing.data.length > 0) {
        productId = existing.data[0].id;
        results.push(`✓ Produkt bereits vorhanden: ${prod.name} (${productId})`);
      } else {
        const created = await stripe.products.create({ name: prod.name, description: prod.description });
        productId = created.id;
        results.push(`+ Produkt erstellt: ${prod.name} (${productId})`);
      }

      const existingPrices = await stripe.prices.list({ product: productId, active: true });
      for (const p of prod.prices) {
        const already = existingPrices.data.find(
          (ep) => ep.recurring?.interval === p.interval && ep.unit_amount === p.amount,
        );
        if (already) {
          results.push(`  ✓ Preis bereits vorhanden: ${p.label} (${already.id})`);
        } else {
          const price = await stripe.prices.create({
            product: productId, currency: "chf",
            unit_amount: p.amount, recurring: { interval: p.interval },
          });
          results.push(`  + Preis erstellt: ${p.label} (${price.id})`);
        }
      }
    }

    req.log.info({ results }, "Stripe-Produkte geseedet");
    res.json({ ok: true, results });
  } catch (err: any) {
    req.log.error({ err }, "Stripe-Produkt-Seeding fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

// ── Route-Bulk-Import (Dev→Prod-Abgleich) ────────────────────────────────────

/**
 * POST /admin/routes/import
 * Upsert eines Batches vollständiger Routen-Zeilen (inkl. Geometrie).
 * Für den Abgleich des Dev-Datenstands nach Prod — in Chunks aufrufen.
 */
router.post("/admin/routes/import", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { rows } = req.body as { rows?: Record<string, unknown>[] };
  if (!Array.isArray(rows) || !rows.length || rows.length > 500) {
    res.status(400).json({ error: "rows (Array mit 1–500 Einträgen) erforderlich" });
    return;
  }
  if (rows.some((r) => !r || typeof r.id !== "string" || !r.id)) {
    res.status(400).json({ error: "Jede Zeile braucht eine id" });
    return;
  }
  try {
    await db
      .insert(externalRoutesTable)
      .values(rows as any)
      .onConflictDoUpdate({
        target: externalRoutesTable.id,
        set: {
          sagaId: sql`excluded.saga_id`,
          canton: sql`excluded.canton`,
          cantons: sql`excluded.cantons`,
          name: sql`excluded.name`,
          ref: sql`excluded.ref`,
          distanceKm: sql`excluded.distance_km`,
          ascentM: sql`excluded.ascent_m`,
          maxElevationM: sql`excluded.max_elevation_m`,
          minutes: sql`excluded.minutes`,
          sac: sql`excluded.sac`,
          terrain: sql`excluded.terrain`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          geometry: sql`excluded.geometry`,
          geometryVersion: sql`excluded.geometry_version`,
          source: sql`excluded.source`,
          featured: sql`excluded.featured`,
          photoUrl: sql`COALESCE(excluded.photo_url, ${externalRoutesTable.photoUrl})`,
          photoAttribution: sql`COALESCE(excluded.photo_attribution, ${externalRoutesTable.photoAttribution})`,
          description: sql`COALESCE(excluded.description, ${externalRoutesTable.description})`,
          descriptionSource: sql`COALESCE(excluded.description_source, ${externalRoutesTable.descriptionSource})`,
          fetchedAt: new Date(),
        },
      })
      .execute();
    req.log.info({ count: rows.length }, "Routen-Import: Batch upserted");
    res.json({ ok: true, upserted: rows.length });
  } catch (err: any) {
    req.log.error({ err }, "Routen-Import fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/routes/prune
 * Löscht alle Routen deren id NICHT in keepIds ist (Abschluss des Abgleichs).
 * Schutz: keepIds muss ≥500 Einträge haben, damit ein versehentlicher Aufruf
 * nicht die halbe DB leert.
 */
router.post("/admin/routes/prune", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { keepIds } = req.body as { keepIds?: string[] };
  if (!Array.isArray(keepIds) || keepIds.length < 500) {
    res.status(400).json({ error: "keepIds (Array mit ≥500 IDs) erforderlich" });
    return;
  }
  try {
    const result = await db
      .delete(externalRoutesTable)
      .where(notInArray(externalRoutesTable.id, keepIds))
      .returning({ id: externalRoutesTable.id });
    req.log.info({ deleted: result.length }, "Routen-Prune abgeschlossen");
    res.json({ ok: true, deleted: result.length });
  } catch (err: any) {
    req.log.error({ err }, "Routen-Prune fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

// ── Route-Anreicherung (Cron-freundlich) ─────────────────────────────────────

/**
 * POST /admin/routes/enrich-all
 * Startet die komplette Anreicherung (Geometrie + Multi-Kanton) als
 * Hintergrundlauf im Server — kein externer Cron nötig. Fortschritt über
 * GET /admin/routes/enrich-status verfolgen.
 */
let enrichAllLaeuft = false;

/**
 * Startet den Enrich-All-Hintergrundlauf, falls noch Routen offen sind.
 * Kann beim Server-Start aufgerufen werden (log = pino-root-logger).
 * Gibt sofort zurück; die eigentliche Arbeit läuft asynchron.
 */
export function startEnrichAllIfNeeded(log: Logger): void {
  if (enrichAllLaeuft) return;
  // Erst prüfen ob überhaupt offene Routen da sind — kein unnötiger Loop.
  db.select({ n: count() })
    .from(externalRoutesTable)
    .where(and(sql`geometry_version = 0`, sql`id LIKE 'osm-%'`))
    .then(([row]) => {
      const offen = row?.n ?? 0;
      if (offen === 0) {
        log.info("enrich-all (auto): keine offenen Routen — kein Start nötig");
        return;
      }
      log.info({ offen }, "enrich-all (auto): starte Lauf nach Server-Boot");
      runEnrichAllLoop(log);
    })
    .catch((err) => log.warn({ err }, "enrich-all (auto): Prüfabfrage fehlgeschlagen"));
}

function runEnrichAllLoop(log: Logger): void {
  if (enrichAllLaeuft) return;
  enrichAllLaeuft = true;
  (async () => {
    try {
      // Phase 1: Geometrie
      let fehlerSerien = 0;
      // In diesem Lauf gescheiterte Routen (z.B. Overpass-Timeout) merken und
      // erst NACH allen anderen erneut anfassen — sonst liefert LIMIT 10 immer
      // wieder dieselben Problemrouten und der Lauf faehrt sich fest.
      const gescheitert = new Set<string>();
      for (;;) {
        const rows = await db
          .select({ id: externalRoutesTable.id })
          .from(externalRoutesTable)
          .where(
            and(
              sql`geometry_version = 0`,
              sql`id LIKE 'osm-%'`,
              gescheitert.size > 0
                ? notInArray(externalRoutesTable.id, [...gescheitert])
                : undefined,
            ),
          )
          .limit(10);
        if (!rows.length) {
          if (gescheitert.size === 0) break;
          // Alle uebrigen sind Problemrouten: einmal gesammelt erneut versuchen.
          log.info({ anzahl: gescheitert.size }, "enrich-all: zweiter Versuch fuer gescheiterte Routen");
          gescheitert.clear();
          continue;
        }
        let okCount = 0;
        for (const row of rows) {
          const r = await enrichOneRoute(row.id, log);
          if (r.ok) okCount++;
          else {
            gescheitert.add(row.id);
            log.warn({ id: row.id, reason: r.reason }, "enrich-all: Route übersprungen");
          }
          await new Promise((resolve) => setTimeout(resolve, 2_000));
        }
        if (okCount === 0) {
          // Kompletter Batch gescheitert → vermutlich Overpass-Drosselung.
          fehlerSerien++;
          if (fehlerSerien >= 6) {
            log.error("enrich-all: 6 Batches in Folge gescheitert — Abbruch, später erneut starten");
            break;
          }
          const wartezeitMs = 5 * 60_000;
          log.warn({ fehlerSerien }, "enrich-all: Batch komplett gescheitert — 5 Min Abkühl-Pause");
          await new Promise((resolve) => setTimeout(resolve, wartezeitMs));
        } else {
          fehlerSerien = 0;
        }
      }
      log.info("enrich-all: Geometrie-Phase abgeschlossen — komplett (nur Start-Kanton, kein Multi-Kanton-Backfill)");
    } catch (err) {
      log.error({ err }, "enrich-all: abgebrochen");
    } finally {
      enrichAllLaeuft = false;
    }
  })();
}

router.post("/admin/routes/enrich-all", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (enrichAllLaeuft) {
    res.json({ ok: true, message: "Läuft bereits" });
    return;
  }
  runEnrichAllLoop(req.log);
  res.json({ ok: true, message: "Anreicherung gestartet — Fortschritt via enrich-status" });
});

/**
 * GET /admin/routes/enrich-status
 * Zeigt Fortschritt der Geometrie-Anreicherung: total, fertig, ausstehend.
 */
router.get("/admin/routes/enrich-status", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const [total] = await db.select({ n: count() }).from(externalRoutesTable);
    const [enriched] = await db
      .select({ n: count() })
      .from(externalRoutesTable)
      .where(sql`geometry_version > 0`);
    const [pending] = await db
      .select({ n: count() })
      .from(externalRoutesTable)
      .where(sql`geometry_version = 0`);
    const [noOsm] = await db
      .select({ n: count() })
      .from(externalRoutesTable)
      .where(sql`id NOT LIKE 'osm-%'`);
    // Nachweislich nicht anreicherbar (Relation ohne nutzbare Way-Geometrie)
    const [unenrichable] = await db
      .select({ n: count() })
      .from(externalRoutesTable)
      .where(sql`geometry_version < 0`);
    // Pro Quelle aufschlüsseln
    const bySource = await db
      .select({ source: externalRoutesTable.source, n: count() })
      .from(externalRoutesTable)
      .groupBy(externalRoutesTable.source);

    res.json({
      total: total?.n ?? 0,
      enriched: enriched?.n ?? 0,
      pending: pending?.n ?? 0,
      unenrichable: unenrichable?.n ?? 0,
      noOsmId: noOsm?.n ?? 0,
      progressPct:
        (enriched?.n ?? 0) + (pending?.n ?? 0) > 0
          ? Math.round(((enriched?.n ?? 0) / ((enriched?.n ?? 0) + (pending?.n ?? 0))) * 100)
          : 100,
      bySource,
    });
  } catch (err: any) {
    req.log.error({ err }, "enrich-status fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

// ── Wikipedia-Anreicherung (Beschreibung + Bild) ────────────────────────────

/** Basis-Titel einer amtlichen Route: Nummer weg, Etappen-Suffix weg. */
function wikiBasisTitel(name: string): string | null {
  const m = /^(\d{1,3})\s+(.+)$/.exec(name.trim());
  if (!m) return null;
  let rest = m[2];
  // Etappen-Suffix und alles danach entfernen
  rest = rest.replace(/\s+(Etappe|Étape|Etape|Tappa|Stage)\s+\d+.*$/i, "");
  // Streckenangabe "Startort - Zielort" am Ende entfernen: alles ab " - " weg,
  // danach genau EIN Wort (den Startort) abschneiden — nie mehr.
  const strich = rest.search(/\s[-–]\s/);
  if (strich > 0) {
    rest = rest.slice(0, strich).trim();
    const worte = rest.split(/\s+/);
    if (worte.length > 2) rest = worte.slice(0, -1).join(" ");
  }
  rest = rest.trim();
  return rest.length >= 4 ? rest : m[2].trim();
}

/** Wiki-Markup grob in Klartext umwandeln (Links, Vorlagen, Refs entfernen). */
function wikiKlartext(s: string): string {
  let t = s;
  t = t.replace(/<ref[^>]*\/>/g, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "");
  // Vorlagen {{...}} entfernen (auch verschachtelt, mehrere Durchgaenge)
  for (let i = 0; i < 5 && /\{\{[^{}]*\}\}/.test(t); i++) t = t.replace(/\{\{[^{}]*\}\}/g, "");
  t = t.replace(/\[\[(?:[^\[\]|]*\|)?([^\[\]|]*)\]\]/g, "$1");
  t = t.replace(/'''?/g, "").replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "");
  return t.replace(/\s+/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
}

/**
 * Etappen-Abschnitte aus einem Wikipedia-Artikel parsen. Viele ViaStoria-/
 * Wanderland-Artikel listen Etappen als "* 7.1 Basel–Liestal ..., 24 km,
 * 6 Stunden: Beschreibung" mit <gallery>-Bloecken dazwischen. Liefert pro
 * "N.M" Text + (falls per Ortsname zuordenbar) ein Galeriebild.
 */
function parseWikiEtappen(wikitext: string): Map<string, { text: string; bild: string | null }> {
  const ergebnis = new Map<string, { text: string; bild: string | null }>();
  // Offene Etappen seit der letzten Galerie: fuer Bild-Zuordnung per Ortsname
  let offen: { key: string; orte: string[] }[] = [];
  const zeilen = wikitext.split("\n");
  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i];
    const m = /^\*\s*(\d{1,3})\.(\d{1,2})\s+(.+)$/.exec(zeile.trim());
    if (m) {
      const key = `${m[1]}.${m[2]}`;
      const klartext = wikiKlartext(m[3]);
      const doppel = klartext.indexOf(": ");
      const kopf = doppel > 0 ? klartext.slice(0, doppel) : klartext;
      const text = doppel > 0 ? klartext.slice(doppel + 2).trim() : "";
      if (text.length >= 60) {
        ergebnis.set(key, { text: `${kopf}: ${text}`, bild: null });
        const orte = kopf
          .split(/[–\-,]/)
          .map((o) => o.trim())
          .filter((o) => o.length >= 4 && !/^\d/.test(o) && !/Stunden|km/i.test(o));
        offen.push({ key, orte });
      }
      continue;
    }
    if (/^<gallery/i.test(zeile.trim())) {
      // Galeriezeilen bis </gallery> einsammeln
      const bilder: { datei: string; caption: string }[] = [];
      for (i++; i < zeilen.length && !/<\/gallery>/i.test(zeilen[i]); i++) {
        const teile = zeilen[i].trim().split("|");
        if (teile[0] && /\.(jpe?g|png|webp)$/i.test(teile[0].trim())) {
          bilder.push({ datei: teile[0].trim(), caption: teile.slice(1).join(" ") });
        }
      }
      for (const bild of bilder) {
        const treffer = offen.find(
          (e) =>
            !ergebnis.get(e.key)?.bild &&
            e.orte.some((ort) => (bild.caption + " " + bild.datei).toLowerCase().includes(ort.toLowerCase()))
        );
        if (treffer) {
          const eintrag = ergebnis.get(treffer.key);
          if (eintrag) {
            eintrag.bild =
              "https://commons.wikimedia.org/wiki/Special:FilePath/" +
              encodeURIComponent(bild.datei.replace(/ /g, "_")) +
              "?width=1024";
          }
        }
      }
      offen = [];
    }
  }
  return ergebnis;
}

/**
 * POST /admin/routes/wiki-enrich-all
 * Holt fuer alle amtlichen Wanderland-Routen (Name beginnt mit 1-999)
 * Beschreibung + ggf. Bild aus Wikipedia (de). Etappen erben den Artikel
 * der Gesamtroute. Idempotent: bereits beschriebene Routen werden uebersprungen.
 */
let wikiEnrichLaeuft = false;
router.post("/admin/routes/wiki-enrich-all", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (wikiEnrichLaeuft) {
    res.json({ ok: true, message: "Läuft bereits" });
    return;
  }
  wikiEnrichLaeuft = true;
  res.json({ ok: true, message: "Wikipedia-Anreicherung gestartet — Fortschritt via wiki-enrich-status" });

  (async () => {
    const log = req.log;
    try {
      const rows = await db
        .select({
          id: externalRoutesTable.id,
          name: externalRoutesTable.name,
          photoUrl: externalRoutesTable.photoUrl,
        })
        .from(externalRoutesTable)
        .where(and(sql`name ~ '^[0-9]{1,3} '`, sql`description IS NULL`));
      log.info({ n: rows.length }, "wiki-enrich: Start");

      // Artikel-Cache pro Basis-Titel (Etappen teilen sich den Artikel)
      const cache = new Map<string, { extract: string; url: string; thumb: string | null } | null>();
      // Etappen-Abschnitte pro Artikel-URL (einmal Wikitext holen, dann parsen)
      const etappenCache = new Map<string, Map<string, { text: string; bild: string | null }> | null>();
      let ok = 0, leer = 0;

      for (const row of rows) {
        const titel = wikiBasisTitel(row.name);
        if (!titel) { leer++; continue; }

        if (!cache.has(titel)) {
          let gescheitert = false;
          try {
            const api =
              "https://de.wikipedia.org/w/api.php?action=query&format=json&generator=search" +
              `&gsrsearch=${encodeURIComponent(titel)}&gsrlimit=3` +
              "&prop=extracts|pageimages|info|pageprops&inprop=url&exintro=1&explaintext=1&exchars=1500" +
              "&piprop=thumbnail&pithumbsize=1024";
            // Sanft anfragen: bei 429 (Drosselung) bis zu 3x mit langer Pause wiederholen
            let resp: globalThis.Response | null = null;
            for (let versuch = 0; versuch < 3; versuch++) {
              resp = await fetch(api, {
                headers: { "User-Agent": "SagaTrail/1.0 (kontakt@sagatrail.ch) Wanderrouten-Beschreibungen" },
              });
              if (resp.status !== 429) break;
              log.warn({ titel, versuch }, "wiki-enrich: 429 — 60s Pause");
              await new Promise((r) => setTimeout(r, 60_000));
            }
            if (!resp || !resp.ok) throw new Error(`HTTP ${resp?.status}`);
            const data: any = await resp.json();
            const pages: any[] = Object.values(data?.query?.pages ?? {});
            pages.sort((a, b) => (a.index ?? 9) - (b.index ?? 9));
            // Bester Treffer: kein Begriffsklärungs-Artikel, Titel passt zur Route,
            // Extract vorhanden und klingt nach Wanderroute/Ort
            const norm = (s: string) =>
              s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
            const suchNorm = norm(titel);
            const hit = pages.find((p) => {
              if (typeof p.extract !== "string" || p.extract.length < 80) return false;
              if (p.pageprops && "disambiguation" in p.pageprops) return false;
              if (/steht für:|bezeichnet:/i.test(p.extract.slice(0, 60))) return false;
              const titelNorm = norm(p.title ?? "");
              // Titel muss substanziell zur Suche passen: Substring-Match nur,
              // wenn der kuerzere Teil selbst aussagekraeftig ist (>=10 Zeichen
              // und >=2 Woerter) — verhindert Treffer wie "Chemin" -> "Chemin des Dames".
              const substanziell = (s: string) =>
                (s.split(" ").length >= 2 && s.length >= 10) ||
                (s.split(" ").length === 1 && s.length >= 8);
              const enthaeltWort = (ganz: string, teil: string) =>
                ` ${ganz} `.includes(` ${teil} `);
              const passt =
                (enthaeltWort(suchNorm, titelNorm) && substanziell(titelNorm)) ||
                (enthaeltWort(titelNorm, suchNorm) && substanziell(suchNorm)) ||
                titelNorm === suchNorm;
              if (!passt) return false;
              // Zusatzanker: Artikel muss Schweiz/Liechtenstein-Kontext haben
              // (verhindert gleichnamige Wege im Ausland).
              const schweizKontext =
                /schweiz|liechtenstein|svizzera|suisse|kanton|graubünd|wallis|tessin|jura|appenzell|schweizmobil|wanderland/i.test(
                  p.extract
                );
              return schweizKontext && /wander|weitwander|route|weg|trail|sentiero|chemin|pfad/i.test(p.extract);
            });
            cache.set(
              titel,
              hit
                ? {
                    extract: hit.extract.trim(),
                    url: hit.fullurl ?? `https://de.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
                    thumb: hit.thumbnail?.source ?? null,
                  }
                : null
            );
          } catch (err) {
            log.warn({ titel, err }, "wiki-enrich: Wikipedia-Abfrage gescheitert");
            // Fehler NICHT cachen — ein spaeterer Lauf soll es erneut versuchen
            gescheitert = true;
          }
          await new Promise((r) => setTimeout(r, 1_500));
          if (gescheitert) { leer++; continue; }
        }

        const art = cache.get(titel);
        if (!art) { leer++; continue; }

        // Etappen: eigenen Abschnitt aus dem Artikel verwenden, falls vorhanden
        // (z. B. "* 7.3 Läufelfingen–Olten ...: Der historische Passweg ...")
        let etappe: { text: string; bild: string | null } | null = null;
        const em = /^(\d{1,3})\s.*\b(?:Etappe|Étape|Etape|Tappa|Stage)\s+(\d{1,2})\b/i.exec(row.name.trim());
        if (em) {
          if (!etappenCache.has(art.url)) {
            try {
              const artikelTitel = decodeURIComponent(art.url.split("/wiki/")[1] ?? "");
              const wt = await fetch(
                `https://de.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&page=${encodeURIComponent(artikelTitel)}`,
                { headers: { "User-Agent": "SagaTrail/1.0 (kontakt@sagatrail.ch) Wanderrouten-Beschreibungen" } }
              );
              const wtData: any = wt.ok ? await wt.json() : null;
              const wikitext: string | undefined = wtData?.parse?.wikitext?.["*"];
              etappenCache.set(art.url, wikitext ? parseWikiEtappen(wikitext) : new Map());
              await new Promise((r) => setTimeout(r, 1_500));
            } catch (err) {
              log.warn({ url: art.url, err }, "wiki-enrich: Wikitext-Abruf gescheitert");
              etappenCache.set(art.url, new Map());
            }
          }
          etappe = etappenCache.get(art.url)?.get(`${em[1]}.${em[2]}`) ?? null;
        }

        const updates: Record<string, unknown> = {
          description: etappe?.text ?? art.extract,
          descriptionSource: art.url,
        };
        const bild = etappe?.bild ?? art.thumb;
        if (!row.photoUrl && bild) {
          updates.photoUrl = bild;
          updates.photoAttribution = "Bild: Wikimedia Commons";
        }
        await db
          .update(externalRoutesTable)
          .set(updates)
          .where(eq(externalRoutesTable.id, row.id))
          .execute();
        ok++;
      }
      log.info({ ok, leer }, "wiki-enrich: fertig");
    } catch (err) {
      log.error({ err }, "wiki-enrich: abgebrochen");
    } finally {
      wikiEnrichLaeuft = false;
    }
  })();
});

/** GET /admin/routes/wiki-enrich-status — Fortschritt der Wikipedia-Anreicherung. */
router.get("/admin/routes/wiki-enrich-status", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const [amtlich] = await db
      .select({ n: count() })
      .from(externalRoutesTable)
      .where(sql`name ~ '^[0-9]{1,3} '`);
    const [mitBeschreibung] = await db
      .select({ n: count() })
      .from(externalRoutesTable)
      .where(and(sql`name ~ '^[0-9]{1,3} '`, sql`description IS NOT NULL`));
    res.json({
      laeuft: wikiEnrichLaeuft,
      amtlicheRouten: amtlich?.n ?? 0,
      mitBeschreibung: mitBeschreibung?.n ?? 0,
      offen: (amtlich?.n ?? 0) - (mitBeschreibung?.n ?? 0),
    });
  } catch (err: any) {
    req.log.error({ err }, "wiki-enrich-status fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/routes/enrich-next?n=5
 * Bereichert die nächsten N Routen mit geometry_version=0 und OSM-ID.
 * Für Cron-Jobs: einfach wiederholt aufrufen bis pending=0.
 */
router.post("/admin/routes/enrich-next", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const n = Math.min(parseInt((req.query.n as string) ?? "5", 10) || 5, 20);
  try {
    const rows = await db
      .select({ id: externalRoutesTable.id })
      .from(externalRoutesTable)
      .where(and(sql`geometry_version = 0`, sql`id LIKE 'osm-%'`))
      .limit(n);

    const results: { id: string; ok: boolean; distanceKm?: number; canton?: string; cantons?: string[]; reason?: string }[] = [];
    for (const row of rows) {
      const result = await enrichOneRoute(row.id, req.log);
      results.push({ id: row.id, ...result });
    }

    const [pending] = await db
      .select({ n: count() })
      .from(externalRoutesTable)
      .where(and(sql`geometry_version = 0`, sql`id LIKE 'osm-%'`));

    res.json({
      done: (pending?.n ?? 0) === 0,
      enriched: results,
      pending: pending?.n ?? 0,
    });
  } catch (err: any) {
    req.log.error({ err }, "enrich-next fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

export default router;
