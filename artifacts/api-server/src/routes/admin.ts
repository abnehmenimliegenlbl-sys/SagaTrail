import { randomUUID, randomBytes, timingSafeEqual } from "crypto";
import { readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import { resolve } from "path";
import { sendPartnerVertrag } from "../lib/partnerEmail";
import { sendMagicLink } from "../lib/partnerWebhookHandler";
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
  verbandAnfragenTable,
  storiesTable,
  type PartnerKategorie,
} from "@workspace/db";
import { istPremiumAktiv } from "../lib/premiumStatus";
import { ADMIN_DASHBOARD_HTML } from "../lib/adminDashboardHtml";
import { clearNarrationCache } from "../lib/narrationCache";
import { translatePush } from "../lib/pushTranslator";
import { KANTON_SLUGS } from "../lib/kantonspackClaim";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { startPartnerLeadsExport, jobState } from "../lib/partnerLeads";
import { warmAllCantonCaches, getCantonRoutes, syncSwissNumberedRoutes, enrichOneRoute, enrichAndStore, fillMissingRoutePhotos, tryReplaceWikiRoute, GEOMETRY_VERSION } from "../lib/routeService";
import { reverseGeocode } from "../lib/geocoding";
import { estimateMinutes } from "../lib/geo";
import { fetchOsmRelationTags, fetchSubRelations, fetchOsmRelationsByRef, fetchRouteGeometries, fetchRouteLoopAuditOsm, fetchWikiEtappen, reverseLoopExplanation, type WikiEtappe, searchOsmRouteByFromTo, searchOsmRouteByName } from "../lib/overpass";
import type { Logger } from "pino";
import { CANTON_ISO } from "../lib/cantonIso";
import { sendVerbandWillkommen } from "../lib/verbandEmail";
import { findReverseLoops, type AuditPoint } from "../lib/reverseLoopAudit";
import {
  fetchLeadsFromWp, fetchOrgsFromWp,
  fetchLeadsFromDb, fetchOrgsFromDb, upsertLeadsToDb,
  campaignState, startCampaign, buildPreviewHtml,
  makeUnsubToken, verifyUnsubToken,
  type LeadRow,
} from "../lib/leadMailer";
import { partnerEmailLogTable, partnerEmailBlocklistTable, partnerLeadsTable } from "@workspace/db";

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
      premium: allProfiles.filter((p) => istPremiumAktiv(p) && !["elite","elite_family"].includes(p.subscriptionTier ?? "")).length,
      elite:   allProfiles.filter((p) => istPremiumAktiv(p) &&  ["elite","elite_family"].includes(p.subscriptionTier ?? "")).length,
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
      subscriptionTier: p.subscriptionTier ?? "free",
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
  lat: z.number().default(0),
  lng: z.number().default(0),
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

  // Magic-Link ans Portal senden, falls E-Mail vorhanden
  if (row.email) {
    sendMagicLink(row.id, row.name, row.email)
      .catch((err) => req.log.warn({ err, partnerId: row.id }, "Magic-Link senden fehlgeschlagen"));
  }

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
        summaries: catalogSagasTable.summaries,
        bildmotiv: catalogSagasTable.bildmotiv,
        fotoUrl: catalogSagasTable.fotoUrl,
        fotoAttribution: catalogSagasTable.fotoAttribution,
        koordinatenSicherheit: catalogSagasTable.koordinatenSicherheit,
        lat: catalogSagasTable.lat,
        lng: catalogSagasTable.lng,
      })
      .from(catalogSagasTable)
      .orderBy(catalogSagasTable.canton, catalogSagasTable.title);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Admin sagas list fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

router.delete("/admin/sagas/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  try {
    await db.delete(catalogSagasTable).where(eq(catalogSagasTable.id, id));
    res.json({ ok: true, deleted: id });
  } catch (err) {
    req.log.error({ err }, "Admin saga delete fehlgeschlagen");
    res.status(500).json({ error: String(err) });
  }
});

/** POST /admin/sagas — Saga einfügen oder aktualisieren (upsert by id) */
router.post("/admin/sagas", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const row = req.body as Record<string, any>;
    if (!row.id || !row.title) {
      res.status(400).json({ error: "id und title erforderlich" });
      return;
    }
    await db
      .insert(catalogSagasTable)
      .values({
        id: row.id,
        title: row.title,
        canton: row.canton ?? null,
        coreMotif: row.coreMotif ?? row.core_motif ?? null,
        mood: row.mood ?? null,
        summary: row.summary ?? null,
        summaries: row.summaries ? (typeof row.summaries === "string" ? row.summaries : JSON.stringify(row.summaries)) : null,
        altersStufenHinweis: row.altersstufen_hinweis ?? row.altersStufenHinweis ?? null,
        quelle: row.quelle ? (typeof row.quelle === "string" ? row.quelle : JSON.stringify(row.quelle)) : null,
        source: row.source ?? null,
        lat: row.lat ?? null,
        lng: row.lng ?? null,
        koordinatenSicherheit: row.koordinaten_sicherheit ?? row.koordinatenSicherheit ?? null,
        isAnchorPlace: row.is_anchor_place ?? row.isAnchorPlace ?? false,
        bildmotiv: row.bildmotiv ?? null,
        fotoUrl: row.fotoUrl ?? row.foto_url ?? null,
        fotoAttribution: row.fotoAttribution ?? row.foto_attribution ?? null,
      } as any)
      .onConflictDoUpdate({
        target: catalogSagasTable.id,
        set: {
          title: sql`excluded.title`,
          canton: sql`excluded.canton`,
          summary: sql`excluded.summary`,
          summaries: sql`excluded.summaries`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          source: sql`excluded.source`,
          bildmotiv: sql`excluded.bildmotiv`,
        },
      });
    res.json({ ok: true, upserted: row.id });
  } catch (err: any) {
    req.log.error({ err }, "Admin saga upsert fehlgeschlagen");
    res.status(500).json({ error: err.message });
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
// SAGEN GPS-VERIFIKATION
// -------------------------------------------------------------------

/** Pfad zur JSON-Quelldatei (Quelle der Wahrheit für Sagen-Koordinaten) */
function curatedSagasJsonPath(): string {
  const candidates = [
    resolve(process.cwd(), "src/lib/curatedSagas.json"),
    resolve(process.cwd(), "artifacts/api-server/src/lib/curatedSagas.json"),
    resolve(__dirname, "../lib/curatedSagas.json"),
    resolve(__dirname, "curatedSagas.json"), // gebündelter dist-Build (build.mjs kopiert die Datei dorthin)
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error("curatedSagas.json nicht gefunden");
}

/** GET /admin/sagas/gps-pending — GPS-relevante Sagen; includeVerified=true enthält auch bereits verifizierte */
router.get("/admin/sagas/gps-pending", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const sagas: any[] = JSON.parse(readFileSync(curatedSagasJsonPath(), "utf-8"));
    const includeVerified = req.query.includeVerified === "true";
    const rows = sagas
      .filter((s) => includeVerified || s.koordinatenSicherheit === "Muss GPS Verifiziert werden")
      .map((s) => ({
        id: s.id,
        title: s.title,
        canton: s.canton,
        lat: s.lat ?? null,
        lng: s.lng ?? null,
        koordinatenSicherheit: s.koordinatenSicherheit,
        bildmotiv: s.bildmotiv ?? null,
        summary: s.summary ?? null,
        summaries: s.summaries ?? null,
      }))
      .sort((a, b) => (a.canton + a.title).localeCompare(b.canton + b.title));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Admin sagas gps-pending fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

/** PATCH /admin/sagas/:id/koordinaten — lat/lng + Sicherheitsstufe aktualisieren */
router.patch("/admin/sagas/:id/koordinaten", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  const { lat, lng, koordinatenSicherheit } = req.body as {
    lat?: number;
    lng?: number;
    koordinatenSicherheit?: string;
  };
  const ALLOWED = ["exakt", "Ort identifiziert", "Region identifiziert", "Muss GPS Verifiziert werden", "Nur Kanton identifiziert"];
  if (!ALLOWED.includes(koordinatenSicherheit ?? "")) {
    res.status(400).json({ error: `koordinatenSicherheit muss einer von: ${ALLOWED.join(", ")}` });
    return;
  }
  const validCoord = (v: unknown, min: number, max: number) =>
    v === undefined || (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max);
  if (!validCoord(lat, 45.5, 48.0) || !validCoord(lng, 5.5, 11.0)) {
    res.status(400).json({ error: "lat/lng müssen endliche Zahlen innerhalb der Schweiz sein (lat 45.5–48.0, lng 5.5–11.0)" });
    return;
  }
  try {
    // 1. JSON-Quelldatei aktualisieren (Quelle der Wahrheit)
    const jsonPath = curatedSagasJsonPath();
    const sagas: any[] = JSON.parse(readFileSync(jsonPath, "utf-8"));
    const entry = sagas.find((s: any) => s.id === id);
    if (!entry) {
      res.status(404).json({ error: `Saga '${id}' nicht in curatedSagas.json gefunden` });
      return;
    }
    if (lat !== undefined) entry.lat = lat;
    if (lng !== undefined) entry.lng = lng;
    entry.koordinatenSicherheit = koordinatenSicherheit;
    // Atomar schreiben: erst Temp-Datei, dann rename (verhindert kaputte JSON bei Abbruch)
    const tmpPath = jsonPath + ".tmp";
    writeFileSync(tmpPath, JSON.stringify(sagas, null, 2), "utf-8");
    renameSync(tmpPath, jsonPath);

    // 2. DB sofort mitziehen (damit die App die Änderung ohne Neustart sieht)
    await db
      .update(catalogSagasTable)
      .set({
        lat: entry.lat ?? null,
        lng: entry.lng ?? null,
        koordinatenSicherheit: koordinatenSicherheit ?? null,
      } as any)
      .where(eq(catalogSagasTable.id, id));

    req.log.info({ id, lat, lng, koordinatenSicherheit }, "Saga-Koordinaten aktualisiert (JSON + DB)");
    res.json({ ok: true, id, lat: entry.lat, lng: entry.lng, koordinatenSicherheit });
  } catch (err) {
    req.log.error({ err, id }, "Admin saga koordinaten update fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

// -------------------------------------------------------------------
// ROUTEN-FOTOS
// -------------------------------------------------------------------

function auditGeometry(value: unknown): AuditPoint[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((point): AuditPoint | null => {
      if (Array.isArray(point) && point.length >= 2) {
        const lat = Number(point[0]);
        const lng = Number(point[1]);
        return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
      }
      if (point && typeof point === "object") {
        const raw = point as Record<string, unknown>;
        const lat = Number(raw.lat);
        const lng = Number(raw.lng ?? raw.lon);
        return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
      }
      return null;
    })
    .filter((point): point is AuditPoint => point !== null);
}

/**
 * GET /admin/routes/reverse-loop-report
 * Erstellt eine rein lesende Prüfliste für verdächtige Rückwärtsfolgen.
 * Optional: ?canton=ZH und ?id=osm-123. Es werden keine Geometrien oder
 * sonstigen Routendaten verändert.
 */
router.get("/admin/routes/reverse-loop-report", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const canton = typeof req.query.canton === "string" ? req.query.canton.trim() : "";
    const requestedId = typeof req.query.id === "string" ? req.query.id.trim() : "";
    const rows = await db
      .select({
        id: externalRoutesTable.id,
        name: externalRoutesTable.name,
        canton: externalRoutesTable.canton,
        geometry: externalRoutesTable.geometry,
        geometryVersion: externalRoutesTable.geometryVersion,
      })
      .from(externalRoutesTable)
      .where(
        and(
          canton ? eq(externalRoutesTable.canton, canton) : undefined,
          requestedId ? eq(externalRoutesTable.id, requestedId) : undefined,
          sql`${externalRoutesTable.geometryVersion} >= 1`,
        ),
      )
      .orderBy(externalRoutesTable.name);

    const routeLoops = rows.map((row) => {
      const points = auditGeometry(row.geometry);
      return {
        row,
        loops: points.length >= 5 ? findReverseLoops(points) : [],
      };
    }).filter((entry) => entry.loops.length > 0);
    const osmIds = routeLoops
      .map(({ row }) => /^osm-(\d+)$/.exec(row.id)?.[1])
      .filter((id): id is string => !!id)
      .map(Number);
    const osmAudit = await fetchRouteLoopAuditOsm(osmIds, req.log);
    const osmById = new Map(osmAudit.map((entry) => [entry.osmId, entry]));
    const findings: Array<{
      route: { id: string; name: string; canton: string };
      section: { startPoint: number; endPoint: number; reverseStartPoint: number; reverseEndPoint: number };
      lengthM: number;
      expectedExplanation: boolean;
      reasons: string[];
    }> = [];

    for (const { row, loops } of routeLoops) {
      const osmId = /^osm-(\d+)$/.exec(row.id)?.[1];
      const metadata = osmId ? osmById.get(Number(osmId)) : undefined;
      const reasons = metadata ? reverseLoopExplanation(metadata.roundtrip, metadata.wayRefs) : [];
      for (const loop of loops) {
        const expectedExplanation = reasons.length > 0;
        findings.push({
          route: { id: row.id, name: row.name, canton: row.canton },
          section: {
            startPoint: loop.startPoint,
            endPoint: loop.endPoint,
            reverseStartPoint: loop.reverseStartPoint,
            reverseEndPoint: loop.reverseEndPoint,
          },
          lengthM: loop.lengthM,
          expectedExplanation,
          reasons: expectedExplanation
            ? reasons
            : ["Keine OSM-Erklärung gefunden — manuelle Prüfung empfohlen"],
        });
      }
    }

    res.json({
      generatedAt: new Date().toISOString(),
      scannedRoutes: rows.length,
      flaggedSections: findings.length,
      findings,
      readOnly: true,
    });
  } catch (err) {
    req.log.error({ err }, "Admin reverse-loop-report fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler beim Rückwärtsschleifen-Report" });
  }
});

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

// DELETE /admin/routes/:id — löscht eine einzelne Route per ID
router.delete("/admin/routes/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  try {
    const deleted = await db
      .delete(externalRoutesTable)
      .where(eq(externalRoutesTable.id, id))
      .returning({ id: externalRoutesTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: `Route '${id}' nicht gefunden` });
      return;
    }
    res.json({ ok: true, deleted: deleted[0]!.id });
  } catch (err: any) {
    req.log.error({ err }, "routes/:id delete fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/routes/all — löscht ALLE Routen (für Prod-Sync von Dev)
router.delete("/admin/routes/all", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const result = await db.delete(externalRoutesTable);
    res.json({ ok: true, message: "Alle Routen gelöscht" });
  } catch (err) {
    req.log.error({ err }, "routes/all delete fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

// POST /admin/routes/bulk-insert — fügt einen Batch von Routen ein (für Prod-Sync von Dev)
router.post("/admin/routes/bulk-insert", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const rows = req.body as Array<Record<string, unknown>>;
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: "Leeres oder ungültiges Array" });
      return;
    }
    // upsert=true überschreibt bestehende Rows vollständig (für Prod-Sync)
    const upsert = req.query.upsert === "true";
    const values = rows.map((r) => ({
      id: String(r.id),
      sagaId: String(r.saga_id ?? ""),
      canton: String(r.canton ?? ""),
      cantons: Array.isArray(r.cantons) ? r.cantons as string[] : [],
      name: String(r.name ?? ""),
      ref: r.ref != null ? String(r.ref) : null,
      distanceKm: Number(r.distance_km ?? 0),
      distanceTagKm: r.distance_tag_km != null ? Number(r.distance_tag_km) : null,
      ascentM: Number(r.ascent_m ?? 0),
      maxElevationM: Number(r.max_elevation_m ?? 0),
      minutes: Number(r.minutes ?? 0),
      sac: String(r.sac ?? "unbekannt"),
      terrain: String(r.terrain ?? ""),
      lat: Number(r.lat ?? 0),
      lng: Number(r.lng ?? 0),
      geometry: r.geometry as object,
      geometryVersion: Number(r.geometry_version ?? 0),
      source: String(r.source ?? ""),
      featured: Boolean(r.featured ?? false),
      photoUrl: r.photo_url != null ? String(r.photo_url) : null,
      photoAttribution: r.photo_attribution != null ? String(r.photo_attribution) : null,
      routeType: r.route_type != null ? String(r.route_type) : null,
      isEtappe: Boolean(r.is_etappe ?? false),
      description: r.description != null ? String(r.description) : null,
      descriptionSource: r.description_source != null ? String(r.description_source) : null,
    }));
    if (upsert) {
      await db.insert(externalRoutesTable).values(values).onConflictDoUpdate({
        target: externalRoutesTable.id,
        set: {
          sagaId: sql`excluded.saga_id`,
          canton: sql`excluded.canton`,
          name: sql`excluded.name`,
          ref: sql`excluded.ref`,
          distanceKm: sql`excluded.distance_km`,
          distanceTagKm: sql`excluded.distance_tag_km`,
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
          routeType: sql`excluded.route_type`,
          isEtappe: sql`excluded.is_etappe`,
          photoUrl: sql`excluded.photo_url`,
          photoAttribution: sql`excluded.photo_attribution`,
          description: sql`excluded.description`,
          descriptionSource: sql`excluded.description_source`,
        },
      });
    } else {
      await db.insert(externalRoutesTable).values(values);
    }
    res.json({ ok: true, inserted: values.length, upsert });
  } catch (err) {
    req.log.error({ err }, "routes/bulk-insert fehlgeschlagen");
    res.status(500).json({ error: String(err) });
  }
});

// POST /admin/routes/bulk-meta-update — aktualisiert saga_id + is_etappe auf bestehenden Routen
router.post("/admin/routes/bulk-meta-update", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const rows = req.body as Array<{ id: string; saga_id: string; is_etappe: boolean }>;
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: "Leeres oder ungültiges Array" });
      return;
    }
    let updated = 0;
    for (const r of rows) {
      const result = await db
        .update(externalRoutesTable)
        .set({ sagaId: String(r.saga_id ?? ""), isEtappe: Boolean(r.is_etappe ?? false) })
        .where(eq(externalRoutesTable.id, String(r.id)));
      updated += (result as any).rowCount ?? 0;
    }
    res.json({ ok: true, updated });
  } catch (err) {
    req.log.error({ err }, "routes/bulk-meta-update fehlgeschlagen");
    res.status(500).json({ error: String(err) });
  }
});

// POST /admin/routes/bulk-delete — löscht Routen anhand einer ID-Liste
router.post("/admin/routes/bulk-delete", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const ids: string[] = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "Body muss ein nicht-leeres Array von IDs sein" });
    return;
  }
  try {
    const result = await db
      .delete(externalRoutesTable)
      .where(inArray(externalRoutesTable.id, ids));
    res.json({ ok: true, deleted: ids.length });
  } catch (err) {
    req.log.error({ err }, "routes/bulk-delete fehlgeschlagen");
    res.status(500).json({ error: String(err) });
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

const AnfrageUpdateBody = z.object({
  status: z.enum(["neu", "in_bearbeitung", "abgelehnt", "aktiv"]).optional(),
  vertragZurueck: z.boolean().optional(),
});

router.delete("/admin/anfragen/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  try {
    const deleted = await db
      .delete(partnerAnfragenTable)
      .where(eq(partnerAnfragenTable.id, id))
      .returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Anfrage nicht gefunden" });
      return;
    }
    res.json({ ok: true, deleted: id });
  } catch (err) {
    req.log.error({ err }, "Anfrage löschen fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

router.patch("/admin/anfragen/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  const parsed = AnfrageUpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ungültige Daten" });
    return;
  }
  const { status, vertragZurueck } = parsed.data;
  if (status === undefined && vertragZurueck === undefined) {
    res.status(400).json({ error: "Kein Feld zum Aktualisieren" });
    return;
  }
  try {
    await db
      .update(partnerAnfragenTable)
      .set({
        ...(status !== undefined && { status }),
        ...(vertragZurueck !== undefined && { vertragZurueck }),
        updatedAt: new Date(),
      })
      .where(eq(partnerAnfragenTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, id }, "Anfrage-Update fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

// POST /admin/anfragen/:id/create-partner — Partner aus Anfrage anlegen + Magic-Link senden
router.post("/admin/anfragen/:id/create-partner", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  try {
    const [r] = await db
      .select()
      .from(partnerAnfragenTable)
      .where(eq(partnerAnfragenTable.id, id))
      .limit(1);
    if (!r) { res.status(404).json({ error: "Anfrage nicht gefunden" }); return; }
    if (r.status === "aktiv") {
      res.status(409).json({ error: "Partner wurde bereits angelegt (Status: aktiv)" });
      return;
    }

    // Partner mit gleicher E-Mail bereits vorhanden → nur Magic-Link senden
    const [existing] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.email, r.kontaktEmail))
      .limit(1);
    if (existing) {
      await sendMagicLink(existing.id, existing.name, r.kontaktEmail);
      await db.update(partnerAnfragenTable)
        .set({ status: "aktiv", updatedAt: new Date() })
        .where(eq(partnerAnfragenTable.id, id));
      req.log.info({ partnerId: existing.id, anfrageId: id }, "Partner existiert bereits — Magic-Link erneut gesendet");
      res.json({ ok: true, partnerId: existing.id, note: "Magic-Link erneut gesendet" });
      return;
    }

    const validKategorien = ["restaurant", "cafe", "souvenir", "uebernachtung", "sonstiges"] as const;
    const kategorie = validKategorien.includes(r.kategorie as any)
      ? (r.kategorie as typeof validKategorien[number])
      : "sonstiges";

    const partnerId = randomUUID();
    await db.insert(partnersTable).values({
      id: partnerId,
      name: r.betriebsName,
      email: r.kontaktEmail,
      telefon: r.kontaktTelefon ?? null,
      kategorie,
      canton: r.canton,
      beschreibung: r.beschreibung ?? null,
      angebot: r.angebot ?? null,
      paket: r.paket ?? null,
      preisChf: r.preisChf ?? null,
      laufzeitStart: r.laufzeitStart ?? null,
      laufzeitEnde: r.laufzeitEnde ?? null,
      zahlungsstatus: "ausstehend",
      isActive: true,
      notizenIntern: JSON.stringify({ kontaktName: r.kontaktName }),
    });

    await sendMagicLink(partnerId, r.betriebsName, r.kontaktEmail);
    await db.update(partnerAnfragenTable)
      .set({ status: "aktiv", updatedAt: new Date() })
      .where(eq(partnerAnfragenTable.id, id));

    req.log.info({ partnerId, anfrageId: id, name: r.betriebsName }, "Partner aus Anfrage angelegt + Magic-Link gesendet");
    res.status(201).json({ ok: true, partnerId });
  } catch (err) {
    req.log.error({ err, id }, "Partner aus Anfrage anlegen fehlgeschlagen");
    res.status(500).json({ error: err instanceof Error ? err.message : "Interner Fehler" });
  }
});

// POST /admin/anfragen/:id/send-vertrag — Partnervertrag als PDF per E-Mail senden
router.post("/admin/anfragen/:id/send-vertrag", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  try {
    const rows = await db
      .select()
      .from(partnerAnfragenTable)
      .where(eq(partnerAnfragenTable.id, id))
      .limit(1);
    if (!rows.length) {
      res.status(404).json({ error: "Anfrage nicht gefunden" });
      return;
    }
    const r = rows[0];

    // Konditionen aus Body übernehmen (überschreiben Anfrage-Defaults)
    const body = req.body as {
      paket?: string;
      preisChf?: number;
      laufzeitStart?: string;
      laufzeitEnde?: string;
    };
    const paket = (body.paket ?? r.paket ?? "standard") as "basic" | "standard" | "premium";
    const preisChf = body.preisChf != null ? Number(body.preisChf) : (r.preisChf ?? null);
    const laufzeitStart = body.laufzeitStart ? new Date(body.laufzeitStart) : (r.laufzeitStart ?? null);
    const laufzeitEnde  = body.laufzeitEnde  ? new Date(body.laufzeitEnde)  : (r.laufzeitEnde  ?? null);

    // Konditionen zurück in Anfrage speichern (für späteres create-partner)
    await db.update(partnerAnfragenTable)
      .set({
        paket,
        preisChf:      preisChf ?? undefined,
        laufzeitStart: laufzeitStart ?? undefined,
        laufzeitEnde:  laufzeitEnde  ?? undefined,
        status:        r.status === "neu" ? "in_bearbeitung" : r.status,
        updatedAt:     new Date(),
      })
      .where(eq(partnerAnfragenTable.id, id));

    await sendPartnerVertrag({
      betriebsName:      r.betriebsName,
      kontaktName:       r.kontaktName,
      kontaktEmail:      r.kontaktEmail,
      kontaktTelefon:    r.kontaktTelefon,
      kategorie:         r.kategorie,
      canton:            r.canton,
      adresse:           r.adresse,
      plz:               r.plz,
      ort:               r.ort,
      paket,
      laufzeitStart,
      laufzeitEnde,
      preisChfOverride:  preisChf,
    });

    req.log.info({ id, email: r.kontaktEmail, paket, preisChf }, "Partner-Vertrag gesendet");
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, id }, "Partner-Vertrag senden fehlgeschlagen");
    res.status(500).json({ error: err instanceof Error ? err.message : "Fehler beim Senden" });
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

  if (jobState.status === "running") {
    res.json({ started: false, message: "Export läuft bereits", state: sanitizeState() });
    return;
  }

  // Google Places Enrichment ist optional – ohne API-Key wird nur OSM genutzt
  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? "";
  const radius = Number(req.query.radius ?? 400);
  startPartnerLeadsExport(apiKey, radius);
  req.log.info({ radius, googleEnrichment: !!apiKey }, "Partner-Leads Export gestartet (Background)");
  res.json({ started: true, message: "Export gestartet", state: sanitizeState() });
});

// GET /admin/partner-leads/status — Fortschritt abfragen
router.get("/admin/partner-leads/status", (req, res): void => {
  if (!requireAdminToken(req, res)) return;
  res.json(sanitizeState());
});

// POST /admin/partner-leads/stop — laufende Suche anhalten
router.post("/admin/partner-leads/stop", (req, res): void => {
  if (!requireAdminToken(req, res)) return;
  if (jobState.status !== "running") {
    res.status(409).json({ error: "Keine Suche läuft" });
    return;
  }
  jobState.stopRequested = true;
  res.json({ ok: true });
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
// Helper: E-Mail aus Website scrapen (mailto-Links + gängige Patterns)
// ---------------------------------------------------------------------------
async function scrapeEmailFromWebsite(url: string): Promise<string> {
  if (!url) return "";
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SagaTrailBot/1.0)" },
    });
    if (!r.ok) return "";
    const html = await r.text();
    // mailto: Links zuerst (zuverlässigste Quelle)
    const mailto = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
    if (mailto) return mailto[1].toLowerCase();
    // Generisches E-Mail-Pattern im sichtbaren Text
    const plain = html.replace(/<[^>]+>/g, " ");
    const match = plain.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (match) return match[0].toLowerCase();
  } catch { /* Timeout oder Netzwerkfehler → leer zurückgeben */ }
  return "";
}

// Baut den WP-Payload aus einem Lead (shared von book + book-all)
async function buildWpLeadForm(
  lead: {
    name?: string; email?: string; typ?: string; kanton?: string;
    sprache?: string; route?: string; routeId?: string; osmId?: string;
    adresse?: string; telefon?: string; website?: string;
    quelle?: string; lat?: number; lng?: number; tier?: string; kategorie?: string;
  },
  wpSecret: string,
): Promise<URLSearchParams> {
  const website = lead.website ?? "";
  let email = lead.email ?? "";
  let scrapped = "0";

  // Kein E-Mail vorhanden → Website scrapen
  if (!email && website) {
    scrapped = "1"; // Versuch wird immer markiert, auch wenn nichts gefunden
    email = await scrapeEmailFromWebsite(website);
  }

  return new URLSearchParams({
    action:          "sagatrail_book_lead",
    hook_secret:     wpSecret,
    name:            lead.name ?? "",
    email,
    typ:             lead.typ ?? "",
    kategorie:       lead.kategorie ?? "",
    tier:            lead.tier ?? "",
    kanton:          lead.kanton ?? "",
    sprache:         lead.sprache ?? "",
    route_name:      lead.route ?? "",
    route_id:        lead.routeId ?? "",
    osm_id:          lead.osmId ?? "",
    adresse:         lead.adresse ?? "",
    telefon:         lead.telefon ?? "",
    website,
    lat:             lead.lat != null ? String(lead.lat) : "",
    lng:             lead.lng != null ? String(lead.lng) : "",
    quelle:          lead.quelle ?? "OSM",
    google_checked:  "0",
    scrapped,
  });
}

// POST /admin/partner-leads/wp-book — einzelnen Lead in WP einbuchen
// Body: { lead: PartnerLead }
router.post("/admin/partner-leads/wp-book", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const wpUrl = process.env.WP_AJAX_URL ?? "";
  const wpSecret = process.env.WP_HOOK_SECRET ?? "";
  if (!wpUrl) { res.status(503).json({ error: "WP_AJAX_URL nicht konfiguriert" }); return; }

  const lead = req.body?.lead;
  if (!lead?.name) { res.status(400).json({ error: "lead.name fehlt" }); return; }

  try {
    const form = await buildWpLeadForm(lead, wpSecret);
    const r = await fetch(wpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(15_000),
    });
    const json = await r.json().catch(() => ({})) as Record<string, unknown>;
    if (!r.ok || !json.success) {
      req.log.warn({ status: r.status, json, name: lead.name }, "wp-book: WP AJAX Fehler");
      res.status(502).json({ error: (json.data as string) ?? `WP HTTP ${r.status}` });
      return;
    }
    req.log.info({ name: lead.name, kanton: lead.kanton, scrapped: form.get("scrapped"), email: form.get("email") }, "partner-leads: Lead in WP eingebucht");
    res.json({ ok: true, email: form.get("email") || null, scrapped: form.get("scrapped") === "1" });
  } catch (err: any) {
    req.log.warn({ err: err.message, name: lead.name }, "wp-book: Netzwerkfehler");
    res.status(502).json({ error: err.message });
  }
});

// POST /admin/partner-leads/pg-save-one — einzelnen OSM-Lead in Postgres speichern
router.post("/admin/partner-leads/pg-save-one", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const lead = req.body?.lead;
  if (!lead?.name) { res.status(400).json({ error: "lead.name fehlt" }); return; }
  try {
    const rows: LeadRow[] = [{
      quelle:    "osm" as const,
      osmId:     lead.osmId    ?? null,
      name:      lead.name,
      email:     lead.email    ?? null,
      kanton:    lead.kanton   ?? "",
      sprache:   lead.sprache  ?? "DE",
      route:     lead.route    ?? "",
      routeId:   lead.routeId  ?? null,
      typ:       lead.typ      ?? "",
      kategorie: lead.kategorie ?? null,
      adresse:   lead.adresse  ?? null,
      telefon:   lead.telefon  ?? null,
      website:   lead.website  ?? null,
      lat:       lead.lat      ?? null,
      lng:       lead.lng      ?? null,
      tier:      lead.tier     ?? null,
    }];
    const saved = await upsertLeadsToDb(rows);
    res.json({ ok: true, saved });
  } catch (err) {
    res.status(500).json({ error: (err instanceof Error ? err.message : "DB-Fehler") });
  }
});

// POST /admin/partner-leads/pg-save-all — alle OSM-Preview-Leads direkt in Postgres speichern
router.post("/admin/partner-leads/pg-save-all", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (jobState.status !== "done" || !jobState.preview?.length) {
    res.status(400).json({ error: "Kein abgeschlossener Export vorhanden" }); return;
  }

  const rows: LeadRow[] = jobState.preview.map((l) => ({
    quelle:    "osm" as const,
    osmId:     l.osmId    ?? null,
    name:      l.name,
    email:     l.email    ?? null,
    kanton:    l.kanton,
    sprache:   l.sprache,
    route:     l.route,
    routeId:   l.routeId  ?? null,
    typ:       l.typ,
    kategorie: l.kategorie ?? null,
    adresse:   l.adresse,
    telefon:   l.telefon,
    website:   l.website,
    lat:       l.lat      ?? null,
    lng:       l.lng      ?? null,
    tier:      l.tier     ?? null,
  }));

  try {
    const saved = await upsertLeadsToDb(rows);
    req.log.info({ saved }, "OSM-Leads in Postgres gespeichert");
    res.json({ ok: true, saved });
  } catch (err) {
    res.status(500).json({ error: (err instanceof Error ? err.message : "DB-Fehler") });
  }
});

// POST /admin/partner-leads/assign-routes — nächste Route per Nominatim + Haversine zuweisen
router.post("/admin/partner-leads/assign-routes", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { kategorie = "jugendherberge", overwrite = false } = req.body ?? {};

  function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  try {
    // 1) Alle passenden Leads laden
    let leads = await db.select({
      id: partnerLeadsTable.id,
      name: partnerLeadsTable.name,
      adresse: partnerLeadsTable.adresse,
      kanton: partnerLeadsTable.kanton,
      route: partnerLeadsTable.route,
    }).from(partnerLeadsTable)
      .where(ilike(partnerLeadsTable.kategorie, kategorie));

    if (!overwrite) leads = leads.filter((l) => !l.route);

    // 2) Alle Routen mit Koordinaten laden
    const routes = await db.select({
      id: externalRoutesTable.id,
      name: externalRoutesTable.name,
      canton: externalRoutesTable.canton,
      lat: externalRoutesTable.lat,
      lng: externalRoutesTable.lng,
    }).from(externalRoutesTable)
      .where(sql`${externalRoutesTable.lat} IS NOT NULL AND ${externalRoutesTable.lat} != 0`);

    req.log.info({ leads: leads.length, routes: routes.length }, "assign-routes: start");

    const results: Array<{ id: string; name: string; route: string; distKm: number; ok: boolean }> = [];
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (const lead of leads) {
      try {
        // 3) Nominatim-Geocoding (full address, then postcode+city fallback)
        const adresse = lead.adresse ?? "";
        const queries: string[] = [adresse + ", Switzerland"];
        // Fallback: extract "PLZ City" from last comma-part of address
        const lastPart = adresse.split(",").at(-1)?.trim() ?? "";
        if (lastPart && lastPart !== adresse) queries.push(lastPart + ", Switzerland");
        // Fallback: just kanton name
        if (lead.kanton) queries.push(lead.kanton + ", Switzerland");

        let geoJson: Array<{ lat: string; lon: string }> = [];
        for (const q of queries) {
          const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
          const geoResp = await fetch(geoUrl, { headers: { "User-Agent": "SagaTrail/1.0 contact@sagatrail.ch" } });
          geoJson = await geoResp.json() as Array<{ lat: string; lon: string }>;
          await sleep(1100);
          if (geoJson.length) break;
        }

        if (!geoJson.length) { results.push({ id: lead.id, name: lead.name, route: "", distKm: -1, ok: false }); continue; }
        const jhLat = parseFloat(geoJson[0].lat);
        const jhLng = parseFloat(geoJson[0].lon);

        // 4) Nächste Route suchen (Kanton zuerst, dann global)
        const inKanton = routes.filter((r) => r.canton === lead.kanton);
        const pool = inKanton.length ? inKanton : routes;
        let nearest = pool[0];
        let minDist = haversineKm(jhLat, jhLng, nearest.lat as number, nearest.lng as number);
        for (const r of pool) {
          const d = haversineKm(jhLat, jhLng, r.lat as number, r.lng as number);
          if (d < minDist) { minDist = d; nearest = r; }
        }

        // 5) Lead updaten (lat/lng + route + typ normalisieren)
        const typLabel = kategorie.charAt(0).toUpperCase() + kategorie.slice(1).toLowerCase();
        await db.update(partnerLeadsTable)
          .set({ lat: jhLat, lng: jhLng, route: nearest.name, typ: typLabel })
          .where(eq(partnerLeadsTable.id, lead.id))
          .execute();

        results.push({ id: lead.id, name: lead.name, route: nearest.name, distKm: Math.round(minDist * 10) / 10, ok: true });
      } catch (err) {
        results.push({ id: lead.id, name: lead.name, route: "", distKm: -1, ok: false });
      }
    }

    const ok = results.filter((r) => r.ok).length;
    req.log.info({ ok, total: leads.length }, "assign-routes: done");
    res.json({ ok, total: leads.length, results });
  } catch (err) {
    res.status(500).json({ error: (err instanceof Error ? err.message : "DB-Fehler") });
  }
});

// POST /admin/partner-leads/bulk-set-routes — Route+Koordinaten direkt per E-Mail-Liste setzen
router.post("/admin/partner-leads/bulk-set-routes", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  // Body: { updates: Array<{ email: string; route: string; lat?: number; lng?: number }> }
  const updates = req.body?.updates as Array<{ email: string; route: string; lat?: number; lng?: number }> | undefined;
  if (!Array.isArray(updates) || !updates.length) { res.status(400).json({ error: "updates[] fehlt" }); return; }
  let ok = 0;
  for (const u of updates) {
    if (!u.email || !u.route) continue;
    try {
      const set: Record<string, unknown> = { route: u.route };
      if (u.lat != null) set.lat = u.lat;
      if (u.lng != null) set.lng = u.lng;
      await db.execute(sql`
        UPDATE partner_leads SET
          route = ${u.route},
          lat   = COALESCE(${u.lat ?? null}, lat),
          lng   = COALESCE(${u.lng ?? null}, lng),
          typ   = COALESCE(${(u as any).typ ?? null}, typ)
        WHERE email = ${u.email}
      `);
      ok++;
    } catch { /* skip */ }
  }
  res.json({ ok, total: updates.length });
});

// POST /admin/partner-leads/bulk-delete — mehrere Leads per ID-Liste löschen
router.post("/admin/partner-leads/bulk-delete", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const ids: string[] = req.body?.ids ?? [];
  if (!ids.length) { res.status(400).json({ error: "ids fehlt" }); return; }
  let ok = 0;
  for (const id of ids) {
    try {
      await db.delete(partnerLeadsTable).where(eq(partnerLeadsTable.id, id)).execute();
      ok++;
    } catch { /* skip */ }
  }
  res.json({ ok, total: ids.length });
});

// POST /admin/partner-leads/wp-book-all — alle Preview-Leads in WP einbuchen (Batch)
router.post("/admin/partner-leads/wp-book-all", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const wpUrl = process.env.WP_AJAX_URL ?? "";
  const wpSecret = process.env.WP_HOOK_SECRET ?? "";
  if (!wpUrl) { res.status(503).json({ error: "WP_AJAX_URL nicht konfiguriert" }); return; }
  if (jobState.status !== "done" || !jobState.preview?.length) {
    res.status(400).json({ error: "Kein abgeschlossener Export vorhanden" }); return;
  }

  res.status(202).json({ ok: true, total: jobState.preview.length, message: "Einbuchung läuft — Fortschritt via Server-Logs" });

  const log = req.log;
  (async () => {
    let ok = 0; let fail = 0;
    for (const lead of jobState.preview) {
      try {
        const form = await buildWpLeadForm(lead, wpSecret);
        const r = await fetch(wpUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString(), signal: AbortSignal.timeout(15_000) });
        const json = await r.json().catch(() => ({})) as Record<string, unknown>;
        if (!r.ok || !json.success) { fail++; log.warn({ name: lead.name, status: r.status }, "wp-book-all: Einzel-Fehler"); }
        else { ok++; log.info({ name: lead.name, email: form.get("email") || "—", scrapped: form.get("scrapped") }, "wp-book-all: eingebucht"); }
      } catch (e: any) { fail++; log.warn({ name: lead.name, err: e.message }, "wp-book-all: Fehler"); }
      await new Promise((r) => setTimeout(r, 500)); // WP + Scraper schonen
    }
    log.info({ ok, fail, total: jobState.preview.length }, "wp-book-all: Einbuchung abgeschlossen");
  })();
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
    // Optionale explizite Overrides: { overrides: { "osm-123": "Korrektername" } }
    const overrides: Record<string, string> = req.body?.overrides ?? {};
    const overrideRows: { id: string; name: string }[] = [];

    for (const [routeId, correctName] of Object.entries(overrides)) {
      const r = await db.execute(
        sql`UPDATE external_routes SET name = ${correctName} WHERE id = ${routeId} RETURNING id, name`
      );
      const rows = r.rows as { id: string; name: string }[];
      overrideRows.push(...rows);
    }

    // Verbleibende fixme-Platzhalter (ohne expliziten Override) automatisch bereinigen
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
    const strippedRows = result.rows as { id: string; name: string }[];
    req.log.info(
      { overrides: overrideRows.length, stripped: strippedRows.length },
      "Routen-Namen bereinigt (fixme)"
    );
    res.json({
      ok: true,
      overridden: overrideRows,
      stripped: strippedRows,
    });
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

router.get("/admin/verband-anfragen", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const rows = await db.select().from(verbandAnfragenTable).orderBy(desc(verbandAnfragenTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Verband-Anfragen laden fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

router.patch("/admin/verband-anfragen/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  const parsed = z.object({
    status:  z.enum(["neu", "in_bearbeitung", "aktiv", "abgelehnt"]).optional(),
    notizen: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Ungültige Daten" }); return; }
  const { status, notizen } = parsed.data;
  if (status === undefined && notizen === undefined) { res.status(400).json({ error: "Kein Feld angegeben" }); return; }
  try {
    await db.update(verbandAnfragenTable)
      .set({
        ...(status  !== undefined && { status }),
        ...(notizen !== undefined && { notizen }),
        updatedAt: new Date(),
      })
      .where(eq(verbandAnfragenTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, id }, "Verband-Anfrage Update fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
});

router.delete("/admin/verband-anfragen/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  try {
    const deleted = await db
      .delete(verbandAnfragenTable)
      .where(eq(verbandAnfragenTable.id, id))
      .returning();
    if (deleted.length === 0) { res.status(404).json({ error: "Anfrage nicht gefunden" }); return; }
    res.json({ ok: true, deleted: id });
  } catch (err) {
    req.log.error({ err }, "Verband-Anfrage löschen fehlgeschlagen");
    res.status(500).json({ error: "Interner Fehler" });
  }
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

    // Premium für 6 Monate
    const premiumBis = new Date(Date.now() + 1000 * 60 * 60 * 24 * 183);
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

  // Clerk-User + Profil per E-Mail suchen und löschen
  let clerkGeloescht = false;
  let profilGeloescht = false;
  try {
    const clerkUsers = await clerkClient.users.getUserList({ emailAddress: [row.email] });
    if (clerkUsers.data.length > 0) {
      const clerkUserId = clerkUsers.data[0].id;
      await db.delete(profilesTable).where(eq(profilesTable.id, clerkUserId));
      profilGeloescht = true;
      await clerkClient.users.deleteUser(clerkUserId);
      clerkGeloescht = true;
      req.log.info({ verbandId: row.id, email: row.email, clerkUserId }, "Verband: Clerk-User + Profil gelöscht");
    } else {
      req.log.warn({ email: row.email }, "Verband: kein Clerk-User gefunden");
    }
  } catch (err) {
    req.log.warn({ err, email: row.email }, "Verband: Clerk-User löschen fehlgeschlagen");
  }

  res.json({ ok: true, clerkGeloescht, profilGeloescht });
});

// ═══════════════════════════════════════════════════════════════════════════
// MASSEN-E-MAIL / PARTNER-LEADS
// ═══════════════════════════════════════════════════════════════════════════

const WP_AJAX = () => process.env.WP_AJAX_URL ?? "";
const WP_SECRET = () => process.env.WP_HOOK_SECRET ?? "";

// GET /admin/leads/meta – Typen, Kantone, Sprachen für Dropdowns (aus Postgres)
router.get("/admin/leads/meta", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const [typenRows, kantoneRows] = await Promise.all([
      db.execute(sql`SELECT DISTINCT typ FROM partner_leads WHERE typ IS NOT NULL AND typ != '' ORDER BY typ`),
      db.execute(sql`SELECT DISTINCT kanton FROM partner_leads WHERE quelle IN ('leads','osm','manual') AND kanton IS NOT NULL AND kanton != '' ORDER BY kanton`),
    ]);
    const typen   = (typenRows.rows   as Array<{typ: string}>).map(r => r.typ);
    const kantone = (kantoneRows.rows as Array<{kanton: string}>).map(r => r.kanton);
    res.json({ typen, kantone });
  } catch (err) {
    res.status(500).json({ error: (err instanceof Error ? err.message : "DB-Fehler") });
  }
});

// GET /admin/leads/list?typ=&kantone=ZH,BE&sprache= – gefilterte Leads (aus Postgres)
router.get("/admin/leads/list", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { typ, kategorie, kanton, kantone: kantoneStr, sprache } = req.query as Record<string, string>;
  const kantone = kantoneStr ? kantoneStr.split(",").map((k) => k.trim()).filter(Boolean) : undefined;
  try {
    const leads = await fetchLeadsFromDb({ typ, kategorie, kanton, kantone, sprache });
    res.json({ leads, total: leads.length });
  } catch (err) {
    res.status(500).json({ error: (err instanceof Error ? err.message : "DB-Fehler") });
  }
});

// POST /admin/leads/preview – E-Mail-Vorschau als HTML
router.post("/admin/leads/preview", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { bodyText, sampleLead } = req.body ?? {};
  if (!bodyText) { res.status(400).json({ error: "bodyText fehlt" }); return; }
  const { _source } = (req.body ?? {}) as { _source?: string };
  const previewInfoUrl = _source === "orgs"
    ? "https://sagatrail.ch/tourismus-verbaende/"
    : "https://sagatrail.ch/partner/";
  const html = buildPreviewHtml(String(bodyText), sampleLead ?? {}, previewInfoUrl);
  res.type("html").send(html);
});

// POST /admin/leads/send – Kampagne starten (Postgres als Quelle)
router.post("/admin/leads/send", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (campaignState.status === "running") { res.status(409).json({ error: "Kampagne läuft bereits" }); return; }
  const { subject, bodyText, filters } = req.body ?? {};
  if (!subject || !bodyText) { res.status(400).json({ error: "subject und bodyText erforderlich" }); return; }
  let leads;
  try {
    const f = filters ?? {};
    const kantone = Array.isArray(f.kantone) && f.kantone.length ? f.kantone : undefined;
    if (f._source === "orgs") {
      leads = await fetchOrgsFromDb({ kategorie: f.kategorie, typ: f.typ, kanton: f.kanton, kantone, sprache: f.sprache });
    } else {
      leads = await fetchLeadsFromDb({ typ: f.typ, kategorie: f.kategorie, kanton: f.kanton, kantone, sprache: f.sprache });
    }
  } catch (err) {
    res.status(500).json({ error: (err instanceof Error ? err.message : "DB-Fehler") }); return;
  }
  if (!leads.length) { res.status(400).json({ error: "Keine Empfänger mit diesen Filtern" }); return; }
  const proto = req.headers["x-forwarded-proto"] as string ?? req.protocol;
  const host  = req.get("host")!;
  const apiBase = `${proto}://${host}`;
  const infoUrl = (filters?._source === "orgs")
    ? "https://sagatrail.ch/tourismus-verbaende/"
    : "https://sagatrail.ch/partner/";
  await startCampaign({ subject, bodyText, leads, apiBase, infoUrl });
  res.json({ ok: true, total: leads.length, campaignId: campaignState.campaignId });
});

// GET /admin/orgs/meta – Kategorien, Typen, Kantone (aus Postgres)
router.get("/admin/orgs/meta", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const [katRows, kantonRows, spracheRows] = await Promise.all([
      db.execute(sql`SELECT DISTINCT kategorie FROM partner_leads WHERE quelle = 'orgs' AND kategorie IS NOT NULL ORDER BY kategorie`),
      db.execute(sql`SELECT DISTINCT kanton FROM partner_leads WHERE quelle = 'orgs' AND kanton != '' ORDER BY kanton`),
      db.execute(sql`SELECT DISTINCT sprache FROM partner_leads WHERE quelle = 'orgs' AND sprache != '' ORDER BY sprache`),
    ]);
    const kategorien = (katRows.rows    as Array<{kategorie: string}>).map(r => r.kategorie);
    const kantone    = (kantonRows.rows as Array<{kanton: string}>).map(r => r.kanton);
    const sprachen   = (spracheRows.rows as Array<{sprache: string}>).map(r => r.sprache);
    res.json({ kategorien, kantone, sprachen });
  } catch (err) {
    res.status(500).json({ error: (err instanceof Error ? err.message : "DB-Fehler") });
  }
});

// GET /admin/orgs/list?kategorie=&typ=&kanton= – gefilterte Organisationen (aus Postgres)
router.get("/admin/orgs/list", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { kategorie, typ, kanton, kantone: kantoneStr, sprache } = req.query as Record<string, string>;
  const kantone = kantoneStr ? kantoneStr.split(",").map((k) => k.trim()).filter(Boolean) : undefined;
  try {
    const leads = await fetchOrgsFromDb({ kategorie, typ, kanton, kantone, sprache });
    res.json({ leads, total: leads.length });
  } catch (err) {
    res.status(500).json({ error: (err instanceof Error ? err.message : "DB-Fehler") });
  }
});

// DELETE /admin/leads/:id – Einzelnen Lead löschen
router.delete("/admin/leads/:id", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.params;
  try {
    const result = await db.execute(sql`DELETE FROM partner_leads WHERE id = ${id}::uuid`);
    const deleted = (result as any).rowCount ?? 0;
    if (!deleted) { res.status(404).json({ error: "Lead nicht gefunden" }); return; }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Fehler" });
  }
});

// DELETE /admin/leads/all – Alle partner_leads leeren (vor sauberem Re-Import)
router.delete("/admin/leads/all", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    await db.execute(sql`TRUNCATE TABLE partner_leads`);
    req.log.info("partner_leads geleert");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Fehler" });
  }
});

// POST /admin/leads/import-wp – Einmaliger Import aller WP-Leads + Orgs nach Postgres
router.post("/admin/leads/import-wp", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const wpUrl = WP_AJAX();
  if (!wpUrl) { res.status(503).json({ error: "WP_AJAX_URL nicht konfiguriert" }); return; }
  try {
    const [wpLeads, wpOrgs] = await Promise.all([
      fetchLeadsFromWp({}, wpUrl, WP_SECRET()),
      fetchOrgsFromWp({},  wpUrl, WP_SECRET()),
    ]);

    const leadRows: LeadRow[] = wpLeads.map((l) => ({
      quelle: "leads" as const,
      name: l.name, email: l.email, kanton: l.kanton, sprache: l.sprache,
      route: l.route, typ: l.typ, satz: l.satz,
      adresse: l.adresse, telefon: l.telefon, website: l.website,
      kategorie: (l as any).kategorie ?? null,
      tier: (l as any).tier || undefined,
    }));
    const orgRows: LeadRow[] = wpOrgs.map((o) => ({
      quelle: "orgs" as const,
      name: o.name, email: o.email, kanton: o.kanton, sprache: o.sprache,
      route: o.route, typ: o.typ, satz: o.satz,
      adresse: o.adresse, telefon: o.telefon, website: o.website,
      kategorie: (o as any)._kategorie ?? o.typ,
      tier: (o as any).tier || undefined,
    }));

    const [leadsImported, orgsImported] = await Promise.all([
      upsertLeadsToDb(leadRows),
      upsertLeadsToDb(orgRows),
    ]);
    req.log.info({ leadsImported, orgsImported }, "WP → Postgres Import abgeschlossen");
    res.json({ ok: true, leadsImported, orgsImported, total: leadsImported + orgsImported });
  } catch (err) {
    req.log.error({ err }, "WP Import fehlgeschlagen");
    res.status(502).json({ error: (err instanceof Error ? err.message : "Import fehlgeschlagen") });
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
    excluded: jobState.excluded,
    tierCounts: jobState.tierCounts,
    emailScrape: jobState.emailScrape,
    startedAt: jobState.startedAt,
    finishedAt: jobState.finishedAt,
    error: jobState.error,
    preview: jobState.preview ?? [],
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
          distanceTagKm: sql`excluded.distance_tag_km`,
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

// POST /admin/sagas/photos/import — überträgt nur fehlende Commons-Fotos aus Dev nach Prod
router.post("/admin/sagas/photos/import", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const rows = req.body as Array<{ id?: unknown; fotoUrl?: unknown; fotoAttribution?: unknown }>;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 200) {
    res.status(400).json({ error: "Erwartet wird ein Array mit 1 bis 200 Saga-Fotos" });
    return;
  }

  try {
    let updated = 0;
    let skipped = 0;
    const invalid: string[] = [];
    for (const row of rows) {
      const id = typeof row.id === "string" ? row.id.trim() : "";
      const fotoUrl = typeof row.fotoUrl === "string" ? row.fotoUrl.trim() : "";
      const fotoAttribution =
        typeof row.fotoAttribution === "string" ? row.fotoAttribution.trim() : null;
      if (!id || !fotoUrl || !/^https?:\/\//i.test(fotoUrl)) {
        invalid.push(id || "(ohne id)");
        continue;
      }

      const result = await db
        .update(catalogSagasTable)
        .set({ fotoUrl, fotoAttribution })
        .where(and(eq(catalogSagasTable.id, id), isNull(catalogSagasTable.fotoUrl)))
        .returning({ id: catalogSagasTable.id });
      if (result.length > 0) updated++;
      else skipped++;
    }

    res.json({ ok: true, received: rows.length, updated, skipped, invalid });
  } catch (err: any) {
    req.log.error({ err }, "Sagenfoto-Import fehlgeschlagen");
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

// ── Eltern-Routen-Restitch ────────────────────────────────────────────────────

/**
 * Vernäht die Geometrie von SchweizMobil-Gesamtrouten aus ihren Etappen neu.
 * Portiert aus scripts/restitch_parents.cjs — läuft direkt im API-Server ohne
 * externen pg-Client-Import.
 *
 * Gibt { fixed, skipped, unchanged } zurück.
 */
export async function stitchParents(log: Logger): Promise<{ fixed: number; skipped: number; unchanged: number }> {
  const R = 6371;
  function hav(a: [number, number], b: [number, number]): number {
    const dLat = ((b[0] - a[0]) * Math.PI) / 180;
    const dLng = ((b[1] - a[1]) * Math.PI) / 180;
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a[0] * Math.PI) / 180) *
        Math.cos((b[0] * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function parseGeom(raw: unknown): [number, number][] | null {
    if (!raw) return null;
    let g: unknown = raw;
    if (typeof g === "string") {
      try { g = JSON.parse(g); } catch { return null; }
    }
    if (!Array.isArray(g) || g.length < 2) return null;
    return g as [number, number][];
  }

  function norm(g: [number, number][]): [number, number][] {
    return g.map((p) => (Array.isArray(p) ? [p[0], p[1]] : [(p as any).lat, (p as any).lng]) as [number, number]);
  }

  function routeStats(pts: [number, number][]): { len: number; maxGap: number } {
    let len = 0, maxGap = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = hav(pts[i - 1]!, pts[i]!);
      len += d;
      if (d > maxGap) maxGap = d;
    }
    return { len, maxGap };
  }

  function etappenNr(name: string): number | null {
    const m = name.match(/(?:Etappe|Étape|Etape|Tappa|Stage)\s+(\d+)/i);
    return m ? parseInt(m[1]!, 10) : null;
  }

  // Eltern-Routen laden
  const parentRows = await db.execute<{ id: string; name: string; distance_km: string | null; geometry: unknown }>(
    sql`SELECT id, name, distance_km, geometry FROM external_routes
        WHERE id LIKE 'schweizmobil-%'
          AND geometry IS NOT NULL
          AND jsonb_typeof(geometry) IN ('array', 'string')`
  );
  // Etappen laden (nicht schweizmobil-*, nicht wiki-* mit ≤2 Punkten)
  const etappenRows = await db.execute<{ id: string; name: string; distance_km: string | null; geometry: unknown }>(
    sql`SELECT id, name, distance_km, geometry FROM external_routes
        WHERE name ~* '(Etappe|Étape|Etape|Tappa|Stage)\\s+\\d+'
          AND geometry IS NOT NULL
          AND jsonb_typeof(geometry) IN ('array', 'string')
          AND id NOT LIKE 'schweizmobil-%'
          AND NOT (id LIKE 'wiki-%' AND jsonb_array_length(geometry) <= 2)`
  );

  const parents = parentRows.rows ?? (parentRows as any);
  const allEtappen = etappenRows.rows ?? (etappenRows as any);

  log.info({ parents: parents.length, etappen: allEtappen.length }, "restitch-parents: Daten geladen");

  let fixed = 0, skipped = 0, unchanged = 0;

  for (const p of parents) {
    const num = (p.name as string).match(/^(\d+)\s/)?.[1];
    if (!num) { skipped++; continue; }

    const kids = (allEtappen as any[])
      .filter((k) => new RegExp(`^${num}\\s`).test(k.name) && etappenNr(k.name) !== null)
      .map((k) => ({ ...k, nr: etappenNr(k.name) as number }))
      .sort((a, b) => a.nr - b.nr);
    if (kids.length < 2) { skipped++; continue; }

    const parsedKids = kids
      .map((k) => {
        const g = parseGeom(k.geometry);
        return g ? { ...k, parsedGeom: g } : null;
      })
      .filter(Boolean) as Array<typeof kids[0] & { parsedGeom: [number, number][] }>;
    if (parsedKids.length < 2) { skipped++; continue; }

    const sumKm = parsedKids.reduce((s, k) => s + (parseFloat(k.distance_km ?? "0") || 0), 0);
    const parentKm = parseFloat((p.distance_km as string | null) ?? "0") || 0;
    const refKm = parentKm > 0 && parentKm >= sumKm * 0.4 ? parentKm : sumKm;
    if (sumKm < 0.55 * refKm) { skipped++; continue; }

    const parentGeom = parseGeom(p.geometry);
    if (!parentGeom) { skipped++; continue; }

    // Etappen verketten, Orientierung per Endpunkt-Nähe
    let chain: [number, number][] | null = null;
    let ok = true;
    for (const k of parsedKids) {
      let seg = norm(k.parsedGeom);
      if (seg.length < 2) { ok = false; break; }
      if (!chain) { chain = seg.slice(); continue; }
      const end = chain[chain.length - 1]!;
      const dStart = hav(end, seg[0]!);
      const dEnd = hav(end, seg[seg.length - 1]!);
      if (dEnd < dStart) seg = seg.slice().reverse();
      chain = chain.concat(seg);
    }
    if (!ok || !chain || chain.length < 2) { skipped++; continue; }

    const oldS = routeStats(norm(parentGeom));
    const newS = routeStats(chain);
    const oldErr = Math.abs(oldS.len - refKm);
    const newErr = Math.abs(newS.len - refKm);
    const betterGap = newS.maxGap < 0.6 * oldS.maxGap && newErr <= oldErr * 1.3;
    const dramaticallyCloser =
      oldErr > 20 && newErr < 0.1 * oldErr && newS.len > oldS.len * 1.2;

    if (betterGap || dramaticallyCloser) {
      const reason = dramaticallyCloser ? "len-fix" : "gap-fix";
      const newGeom = chain.map(([lat, lng]) => [
        Math.round(lat * 1e6) / 1e6,
        Math.round(lng * 1e6) / 1e6,
      ]);
      await db
        .update(externalRoutesTable)
        .set({ geometry: newGeom as any, fetchedAt: new Date() })
        .where(eq(externalRoutesTable.id, p.id as string))
        .execute();
      log.info(
        { reason, id: p.id, maxGapOld: oldS.maxGap.toFixed(1), maxGapNew: newS.maxGap.toFixed(1), lenOld: oldS.len.toFixed(0), lenNew: newS.len.toFixed(0), ref: refKm.toFixed(0) },
        "restitch-parents: FIXED"
      );
      fixed++;
    } else {
      unchanged++;
      if (oldS.maxGap > 3) {
        log.debug(
          { id: p.id, maxGapOld: oldS.maxGap.toFixed(1), maxGapNew: newS.maxGap.toFixed(1) },
          "restitch-parents: KEEP (kein Verbesserungs-Kriterium erfüllt)"
        );
      }
    }
  }

  log.info({ fixed, skipped, unchanged }, "restitch-parents: abgeschlossen");
  return { fixed, skipped, unchanged };
}

let restitchLaeuft = false;

/**
 * Startet einen nächtlichen Restitch täglich um ~02:00 UTC.
 * Wird einmalig beim Server-Start aufgerufen.
 */
export function scheduleNightlyRestitch(log: Logger): void {
  function msUntilNextRun(): number {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(2, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.getTime() - now.getTime();
  }

  function scheduleNext(): void {
    const ms = msUntilNextRun();
    log.info({ inMinutes: Math.round(ms / 60_000) }, "restitch-parents: nächster Nacht-Lauf geplant");
    setTimeout(async () => {
      if (!restitchLaeuft) {
        restitchLaeuft = true;
        try {
          await stitchParents(log);
        } catch (err) {
          log.warn({ err }, "restitch-parents: Nacht-Lauf fehlgeschlagen");
        } finally {
          restitchLaeuft = false;
        }
      }
      scheduleNext();
    }, ms);
  }

  scheduleNext();
}

// ── Route-Anreicherung (Cron-freundlich) ─────────────────────────────────────

/**
 * POST /admin/routes/enrich-all
 * Startet die komplette Anreicherung (Geometrie + Multi-Kanton) als
 * Hintergrundlauf im Server — kein externer Cron nötig. Fortschritt über
 * GET /admin/routes/enrich-status verfolgen.
 */
let enrichAllLaeuft = false;
// Manuell auf true setzen um den Loop zu pausieren (z.B. bei Daten-Korrekturen).
let enrichAllPaused = false;

/**
 * Startet den Enrich-All-Hintergrundlauf, falls noch Routen offen sind.
 * Kann beim Server-Start aufgerufen werden (log = pino-root-logger).
 * Gibt sofort zurück; die eigentliche Arbeit läuft asynchron.
 */
export function startEnrichAllIfNeeded(log: Logger): void {
  if (enrichAllLaeuft) return;
  if (enrichAllPaused) { log.info("enrich-all: pausiert — enrichAllPaused=true"); return; }
  // Erst prüfen ob überhaupt offene Routen da sind — kein unnötiger Loop.
  db.select({ n: count() })
    .from(externalRoutesTable)
    .where(sql`geometry_version = 0`)
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
            // Lange Pause statt Abbruch — Loop läuft nach 30 Min selbst weiter.
            log.warn("enrich-all: 6 Batches in Folge gescheitert — 30 Min Abkühl-Pause, dann weiter");
            fehlerSerien = 0;
            await new Promise((resolve) => setTimeout(resolve, 30 * 60_000));
          } else {
          const wartezeitMs = 5 * 60_000;
          log.warn({ fehlerSerien }, "enrich-all: Batch komplett gescheitert — 5 Min Abkühl-Pause");
          await new Promise((resolve) => setTimeout(resolve, wartezeitMs));
          }
        } else {
          fehlerSerien = 0;
        }
      }
      log.info("enrich-all: Geometrie-Phase abgeschlossen — komplett (nur Start-Kanton, kein Multi-Kanton-Backfill)");

      // Phase 2: Wiki-Etappen-Platzhalter durch echte OSM-Geometrie ersetzen.
      // Läuft nur wenn Overpass erreichbar ist (hängt nach Geometrie-Phase).
      // Stagger 4s zwischen Anfragen damit Overpass nicht gedrosselt wird.
      try {
        const wikiRows = await db
          .select({
            id: externalRoutesTable.id,
            name: externalRoutesTable.name,
            canton: externalRoutesTable.canton,
            sagaId: externalRoutesTable.sagaId,
            routeType: externalRoutesTable.routeType,
            isEtappe: externalRoutesTable.isEtappe,
          })
          .from(externalRoutesTable)
          .where(sql`${externalRoutesTable.id} LIKE 'wiki-%'`);

        if (wikiRows.length > 0) {
          log.info({ n: wikiRows.length }, "enrich-all: Wiki-Ersatz-Phase gestartet");
          let wikiErsetzt = 0;
          for (const row of wikiRows) {
            const result = await tryReplaceWikiRoute(row, log);
            if (result.replaced) {
              wikiErsetzt++;
              log.info({ wikiId: row.id, osmId: result.osmId }, "enrich-all: wiki-Platzhalter ersetzt");
            }
            await new Promise((resolve) => setTimeout(resolve, 4_000));
          }
          log.info({ geprueft: wikiRows.length, ersetzt: wikiErsetzt }, "enrich-all: Wiki-Ersatz-Phase abgeschlossen");
        }
      } catch (wikiErr) {
        log.warn({ err: wikiErr }, "enrich-all: Wiki-Ersatz-Phase fehlgeschlagen — nicht kritisch");
      }

      // Phase 3: Amtliche Tag-Nachpflege — holt distance/ascent für Routen
      // bei denen beim ersten Enrich noch kein OSM-Tag vorhanden war.
      try {
        const { runOverpass, parseNumericTag: parsePT } = await import("../lib/overpass");
        const tagRows = await db
          .select({ id: externalRoutesTable.id, distanceKm: externalRoutesTable.distanceKm, ascentM: externalRoutesTable.ascentM })
          .from(externalRoutesTable)
          .where(sql`id LIKE 'osm-%' AND geometry_version >= 1 AND distance_tag_km IS NULL`);

        if (tagRows.length > 0) {
          log.info({ n: tagRows.length }, "enrich-all: Tag-Sweep gestartet");
          let tagUpdated = 0;
          const TAG_BATCH = 100;
          for (let i = 0; i < tagRows.length; i += TAG_BATCH) {
            const batch = tagRows.slice(i, i + TAG_BATCH);
            const osmIds = batch.map((r) => parseInt(r.id.replace("osm-", ""), 10)).filter((n) => !isNaN(n));
            if (!osmIds.length) continue;
            try {
              const q = `[out:json][timeout:60];relation(id:${osmIds.join(",")});out tags;`;
              const els = await runOverpass<{ id: number; tags?: Record<string, string> }>(q, 65_000);
              const byId = new Map(els.map((e) => [e.id, e.tags ?? {}]));
              for (const row of batch) {
                const oid = parseInt(row.id.replace("osm-", ""), 10);
                const tags = byId.get(oid);
                if (!tags) continue;
                const nd = parsePT(tags.distance, 5_000);
                const na = parsePT(tags.ascent, 100_000);
                if (!nd && !na) continue;
                const setObj: Record<string, unknown> = {};
                if (nd != null) setObj["distanceTagKm"] = Math.round(nd * 10) / 10;
                if (na != null) setObj["ascentM"] = Math.round(na);
                const ed = nd ?? (row.distanceKm ? Number(row.distanceKm) : 0);
                const ea = na ?? (row.ascentM ? Number(row.ascentM) : 0);
                setObj["minutes"] = estimateMinutes(ed, ea);
                await db.update(externalRoutesTable).set(setObj as any).where(eq(externalRoutesTable.id, row.id)).execute();
                tagUpdated++;
              }
            } catch (bErr: any) {
              log.warn({ err: bErr.message, from: i }, "enrich-all: Tag-Sweep Batch fehlgeschlagen — weiter");
            }
            if (i + TAG_BATCH < tagRows.length) await new Promise((r) => setTimeout(r, 1_500));
          }
          log.info({ geprueft: tagRows.length, aktualisiert: tagUpdated }, "enrich-all: Tag-Sweep abgeschlossen");
        }
      } catch (tagErr) {
        log.warn({ err: tagErr }, "enrich-all: Tag-Sweep fehlgeschlagen — nicht kritisch");
      }

      // Phase 4: Namensbasierte Suche für dauerhaft nicht anreicherbare Routen (#25)
      // Versucht für geometry_version=-1 Routen (placeholder-* / schweizmobil-lwn-*)
      // eine passende OSM-Relation per Name zu finden — als letzter Fallback.
      try {
        const unenrichable = await db
          .select({ id: externalRoutesTable.id, name: externalRoutesTable.name, canton: externalRoutesTable.canton })
          .from(externalRoutesTable)
          .where(sql`geometry_version = -1 AND (id LIKE 'placeholder-%' OR id LIKE 'schweizmobil-lwn-%')`)
          .limit(30); // Overpass schonen: max 30 pro Lauf

        if (unenrichable.length > 0) {
          log.info({ n: unenrichable.length }, "enrich-all: Phase 4 Namenssuche gestartet");
          let nameFound = 0;
          for (const row of unenrichable) {
            const candidates = await searchOsmRouteByName(row.name ?? row.id, log);
            if (candidates.length > 0) {
              const osmId = candidates[0]!;
              const canton = row.canton && row.canton !== "" ? row.canton : "CH";
              try {
                await enrichAndStore(canton, [osmId], log, { skipPhotos: false });
                // sagaId und isEtappe aus dem alten Eintrag übernehmen und alte Zeile löschen
                const [existing] = await db.select({ id: externalRoutesTable.id }).from(externalRoutesTable).where(eq(externalRoutesTable.id, `osm-${osmId}`));
                if (existing) {
                  const [oldRow] = await db.select({ sagaId: externalRoutesTable.sagaId, isEtappe: externalRoutesTable.isEtappe }).from(externalRoutesTable).where(eq(externalRoutesTable.id, row.id));
                  if (oldRow?.sagaId) {
                    await db.update(externalRoutesTable).set({ sagaId: oldRow.sagaId, isEtappe: oldRow.isEtappe }).where(eq(externalRoutesTable.id, `osm-${osmId}`)).execute();
                  }
                  await db.delete(externalRoutesTable).where(eq(externalRoutesTable.id, row.id)).execute();
                  log.info({ old: row.id, new: `osm-${osmId}` }, "enrich-all: Phase 4 — Route über Namen gefunden und ersetzt");
                  nameFound++;
                }
              } catch (enrichErr) {
                log.warn({ err: String(enrichErr), id: row.id }, "enrich-all: Phase 4 enrichAndStore fehlgeschlagen");
              }
            }
            await new Promise((r) => setTimeout(r, 3_000));
          }
          log.info({ geprueft: unenrichable.length, gefunden: nameFound }, "enrich-all: Phase 4 Namenssuche abgeschlossen");
        }
      } catch (nameErr) {
        log.warn({ err: nameErr }, "enrich-all: Phase 4 fehlgeschlagen — nicht kritisch");
      }

      // Phase 5: Eltern-Routen neu vernähen.
      // Läuft nach jeder vollständigen Enrich-Runde damit neue/verbesserte
      // Etappen sofort in der Parent-Geometrie landen.
      try {
        log.info("enrich-all: Phase 5 Restitch-Eltern gestartet");
        const rs = await stitchParents(log);
        log.info(rs, "enrich-all: Phase 5 Restitch-Eltern abgeschlossen");
      } catch (rsErr) {
        log.warn({ err: rsErr }, "enrich-all: Phase 5 Restitch fehlgeschlagen — nicht kritisch");
      }
    } catch (err) {
      log.error({ err }, "enrich-all: abgebrochen mit Fehler — Neustart in 30 Min");
      // Nach unerwartetem Fehler: Loop nach 30 Min selbst neu starten falls
      // noch offene Routen vorhanden (z.B. nach Replit-Idle-Wakeup).
      setTimeout(() => startEnrichAllIfNeeded(log), 30 * 60_000);
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
 * POST /admin/routes/restitch-parents
 * Löst das Vernähen der SchweizMobil-Eltern-Routen manuell aus.
 * Läuft im Hintergrund; Antwort kommt sofort.
 */
router.post("/admin/routes/restitch-parents", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (restitchLaeuft) {
    res.json({ ok: true, message: "Restitch läuft bereits" });
    return;
  }
  restitchLaeuft = true;
  res.json({ ok: true, message: "Restitch gestartet — Fortschritt in Server-Logs" });
  (async () => {
    try {
      await stitchParents(req.log);
    } catch (err) {
      req.log.warn({ err }, "restitch-parents: Lauf fehlgeschlagen");
    } finally {
      restitchLaeuft = false;
    }
  })();
});

/**
 * POST /admin/routes/replace-wiki-etappen
 * Sucht für alle wiki-* Platzhalter-Etappen nach echten OSM-Relationen und
 * ersetzt sie, wenn OSM die Relation inzwischen nachgerüstet hat.
 * Läuft im Hintergrund; Fortschritt erscheint in den Server-Logs.
 */
let replaceWikiLaeuft = false;

/**
 * POST /admin/routes/enrich-by-name
 * Sucht für alle geometry_version=-1 Routen (placeholder-* / schweizmobil-lwn-*)
 * nach OSM-Relationen via Namen-Matching und ersetzt sie, wenn ein guter Treffer
 * gefunden wird. Läuft im Hintergrund; max 30 Routen pro Aufruf.
 */
let enrichByNameLaeuft = false;

/**
 * GET /admin/routes/unenrichable-list
 * Listet alle Routen mit geometry_version = -1 (placeholder-* + schweizmobil-lwn-*).
 */
router.get("/admin/routes/unenrichable-list", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const rows = await db
      .select({ id: externalRoutesTable.id, name: externalRoutesTable.name, canton: externalRoutesTable.canton })
      .from(externalRoutesTable)
      .where(sql`geometry_version = -1 AND (id LIKE 'placeholder-%' OR id LIKE 'schweizmobil-lwn-%' OR id LIKE 'wiki-%')`)
      .orderBy(externalRoutesTable.name);
    res.json({ count: rows.length, routes: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/routes/enrich-by-name", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (enrichByNameLaeuft) { res.json({ ok: true, message: "Läuft bereits" }); return; }
  enrichByNameLaeuft = true;
  res.json({ ok: true, message: "Namenssuche gestartet — Fortschritt via Server-Logs" });

  const log = req.log;
  (async () => {
    try {
      const rows = await db
        .select({ id: externalRoutesTable.id, name: externalRoutesTable.name, canton: externalRoutesTable.canton, sagaId: externalRoutesTable.sagaId, isEtappe: externalRoutesTable.isEtappe })
        .from(externalRoutesTable)
        .where(sql`geometry_version = -1 AND (id LIKE 'placeholder-%' OR id LIKE 'schweizmobil-lwn-%')`);

      log.info({ n: rows.length }, "enrich-by-name: Start");
      let found = 0;

      for (const row of rows) {
        const candidates = await searchOsmRouteByName(row.name ?? row.id, log);
        if (candidates.length > 0) {
          const osmId = candidates[0]!;
          const canton = row.canton && row.canton !== "" ? row.canton : "CH";
          try {
            await enrichAndStore(canton, [osmId], log, { skipPhotos: false });
            const [inserted] = await db.select({ id: externalRoutesTable.id }).from(externalRoutesTable).where(eq(externalRoutesTable.id, `osm-${osmId}`));
            if (inserted) {
              if (row.sagaId) {
                await db.update(externalRoutesTable).set({ sagaId: row.sagaId, isEtappe: row.isEtappe }).where(eq(externalRoutesTable.id, `osm-${osmId}`)).execute();
              }
              await db.delete(externalRoutesTable).where(eq(externalRoutesTable.id, row.id)).execute();
              log.info({ old: row.id, new: `osm-${osmId}`, name: row.name }, "enrich-by-name: Route ersetzt");
              found++;
            }
          } catch (e) {
            log.warn({ err: String(e), id: row.id }, "enrich-by-name: enrichAndStore fehlgeschlagen");
          }
        } else {
          log.debug({ id: row.id, name: row.name }, "enrich-by-name: kein Treffer");
        }
        await new Promise((r) => setTimeout(r, 3_000));
      }

      log.info({ geprueft: rows.length, ersetzt: found }, "enrich-by-name: abgeschlossen");
    } catch (err) {
      log.error({ err }, "enrich-by-name: unerwarteter Fehler");
    } finally {
      enrichByNameLaeuft = false;
    }
  })();
});

router.post("/admin/routes/replace-wiki-etappen", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (replaceWikiLaeuft) {
    res.json({ ok: true, message: "Läuft bereits" });
    return;
  }
  replaceWikiLaeuft = true;
  res.json({ ok: true, message: "Wiki-Etappen-Ersatz gestartet — Fortschritt via Server-Logs" });

  const log = req.log;
  (async () => {
    try {
      const wikiRows = await db
        .select({
          id: externalRoutesTable.id,
          name: externalRoutesTable.name,
          canton: externalRoutesTable.canton,
          sagaId: externalRoutesTable.sagaId,
          routeType: externalRoutesTable.routeType,
          isEtappe: externalRoutesTable.isEtappe,
        })
        .from(externalRoutesTable)
        .where(sql`${externalRoutesTable.id} LIKE 'wiki-%'`);

      log.info({ n: wikiRows.length }, "replace-wiki-etappen: Start");
      let ersetzt = 0;

      for (const row of wikiRows) {
        const result = await tryReplaceWikiRoute(row, log);
        if (result.replaced) {
          ersetzt++;
          log.info({ wikiId: row.id, osmId: result.osmId }, "replace-wiki-etappen: Route ersetzt");
        } else {
          log.debug({ wikiId: row.id, reason: result.reason }, "replace-wiki-etappen: kein Ersatz");
        }
        await new Promise((resolve) => setTimeout(resolve, 4_000)); // Overpass schonen
      }

      log.info({ geprueft: wikiRows.length, ersetzt }, "replace-wiki-etappen: abgeschlossen");
    } catch (err) {
      log.error({ err }, "replace-wiki-etappen: unerwarteter Fehler");
    } finally {
      replaceWikiLaeuft = false;
    }
  })();
});

/**
 * POST /admin/routes/force-reenrich
 * Body: { ids: string[] }
 * Setzt geometry_version auf NULL für die angegebenen IDs und startet den Enrich-Loop.
 */
router.post("/admin/routes/force-reenrich", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { ids } = req.body as { ids: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "Body: { ids: string[] } erwartet" });
    return;
  }
  try {
    await db
      .update(externalRoutesTable)
      .set({ geometryVersion: 0 })
      .where(inArray(externalRoutesTable.id, ids));
    res.json({ ok: true, reset: ids.length, message: "geometry_version auf 0 gesetzt — Loop startet" });
    startEnrichAllIfNeeded(req.log);
  } catch (err: any) {
    req.log.error({ err }, "force-reenrich fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/routes/fix-saga-ids
 * Body: { refs: string[] }  (z.B. ["27","49","57","88"])
 * Weist allen Routen mit diesen refs die nächstgelegene echte Sage zu,
 * falls saga_id leer oder kein gültiger catalog_sagas-Eintrag ist.
 */
router.post("/admin/routes/fix-saga-ids", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { refs } = req.body as { refs: string[] };
  if (!Array.isArray(refs) || refs.length === 0) {
    res.status(400).json({ error: "Body: { refs: string[] } erwartet" });
    return;
  }
  try {
    const result = await db.execute(sql`
      WITH nearest AS (
        SELECT DISTINCT ON (r.id)
               r.id AS route_id,
               s.id AS new_saga_id
        FROM external_routes r
        CROSS JOIN catalog_sagas s
        WHERE r.ref = ANY(${refs})
          AND r.lat IS NOT NULL AND r.lng IS NOT NULL
          AND s.lat IS NOT NULL AND s.lng IS NOT NULL
          AND (r.saga_id IS NULL OR r.saga_id NOT IN (SELECT id FROM catalog_sagas))
        ORDER BY r.id, ((r.lat - s.lat)^2 + (r.lng - s.lng)^2)
      )
      UPDATE external_routes r
      SET saga_id = n.new_saga_id
      FROM nearest n
      WHERE r.id = n.route_id
      RETURNING r.id, r.saga_id
    `);
    res.json({ ok: true, updated: result.rows.length, rows: result.rows });
  } catch (err: any) {
    req.log.error({ err }, "fix-saga-ids fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/routes/enrich-status
 * Zeigt Fortschritt der Geometrie-Anreicherung: total, fertig, ausstehend.
 */
/**
 * GET /admin/routes/wiki-straight
 * Liefert alle wiki-* Routen mit gerader Geometrie (genau 2 Punkte).
 * Diese Routen haben noch keine echte OSM-Geometrie und zeigen im App
 * eine gerade Linie zwischen Start und Ziel.
 */
router.get("/admin/routes/wiki-straight", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const rows = await db
      .select({
        id: externalRoutesTable.id,
        name: externalRoutesTable.name,
        canton: externalRoutesTable.canton,
        distanceKm: externalRoutesTable.distanceKm,
        geometryVersion: externalRoutesTable.geometryVersion,
      })
      .from(externalRoutesTable)
      .where(sql`id LIKE 'wiki-%' AND jsonb_typeof(geometry)='array' AND jsonb_array_length(geometry) = 2`)
      .orderBy(externalRoutesTable.name);
    res.json({ count: rows.length, routes: rows });
  } catch (err: any) {
    req.log.error({ err }, "wiki-straight fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/routes/wiki-italy
 * Listet wiki-* Etappen deren from/to ausschliesslich in Italien liegen (Name endet auf "(I)").
 * Gibt dazu die naechstgelegenen OSM-Wanderrouten im Schweizer Korridor (Bbox n=46.55 s=46.20)
 * als Ersatz-Kandidaten zurück — via zwischengespeichertem Overpass-Ergebnis.
 */
router.get("/admin/routes/wiki-italy", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    // Wiki-Etappen bei denen BEIDE Orts-Namen auf "(I)" enden → reine Italien-Etappen
    const wikiRows = await db
      .select({
        id: externalRoutesTable.id,
        name: externalRoutesTable.name,
        canton: externalRoutesTable.canton,
        sagaId: externalRoutesTable.sagaId,
        distanceTagKm: externalRoutesTable.distanceTagKm,
        geometry: externalRoutesTable.geometry,
      })
      .from(externalRoutesTable)
      .where(sql`id LIKE 'wiki-%' AND name ~ '\\(I\\)[^–—-]*[–—-][^–—-]+\\(I\\)'`);
    res.json({ count: wikiRows.length, routes: wikiRows.map((r) => ({ ...r, geometry: undefined })) });
  } catch (err: any) {
    req.log.error({ err }, "wiki-italy fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/routes/wiki-italy-search
 * Sucht per Overpass nach Wanderrouten im Schweizer Korridor zwischen den
 * Endpunkten der Italien-Etappen von Route 62 (Binn → Bosco Gurin via Schweiz).
 * Bounding-Box: 46.15,8.10,46.60,8.55 (Wallis/Tessin-Grenzgebiet)
 * Body: optional { bboxStr: "minLat,minLng,maxLat,maxLng" }
 */
router.post("/admin/routes/wiki-italy-search", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const bboxStr = (req.body?.bboxStr as string | undefined) ?? "46.15,8.10,46.60,8.55";
  try {
    const { runOverpass } = await import("../lib/overpass");
    // Suche alle Wanderrouten-Relationen in der Bbox mit route=hiking + type=route
    const q = `[out:json][timeout:90];
(
  relation["type"="route"]["route"="hiking"]["network"~"nwn|rwn|lwn"](${bboxStr});
);
out tags;`;
    type OvEl = { id: number; tags?: Record<string, string> };
    const els = await runOverpass<OvEl>(q, 95_000);
    const candidates = els
      .filter((e) => e.tags)
      .map((e) => ({
        osmId: e.id,
        name: e.tags!.name ?? e.tags!["name:de"] ?? `OSM ${e.id}`,
        from: e.tags!.from ?? "",
        to: e.tags!.to ?? "",
        network: e.tags!.network ?? "",
        ref: e.tags!.ref ?? "",
        distance: e.tags!.distance ?? "",
        website: e.tags!.website ?? "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    req.log.info({ bbox: bboxStr, found: candidates.length }, "wiki-italy-search: Kandidaten gefunden");
    res.json({ bbox: bboxStr, count: candidates.length, candidates });
  } catch (err: any) {
    req.log.error({ err }, "wiki-italy-search fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

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

/** POST /admin/routes/photo-backfill/restart — Foto-Backfill neu starten (z.B. nach erweitertem Radius). */
router.post("/admin/routes/photo-backfill/restart", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  res.json({ ok: true, message: "Foto-Backfill gestartet (5km-Fallback aktiv)" });
  fillMissingRoutePhotos(req.log).catch((err) => {
    req.log.error({ err }, "Foto-Backfill fehlgeschlagen");
  });
});

/** GET /admin/routes/photo-status — Wie viele Routen haben bereits ein Foto. */
router.get("/admin/routes/photo-status", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  try {
    const [total] = await db.select({ n: count() }).from(externalRoutesTable);
    const [filled] = await db
      .select({ n: count() })
      .from(externalRoutesTable)
      .where(isNotNull(externalRoutesTable.photoUrl));
    res.json({ total: total?.n ?? 0, filled: filled?.n ?? 0 });
  } catch (err: any) {
    req.log.error({ err }, "photo-status fehlgeschlagen");
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

/**
 * POST /admin/routes/enrich-one
 * Body: { id: string }  (z.B. "osm-1107386")
 * Holt amtliche distance/ascent-Tags direkt aus OSM und trägt sie in die DB ein,
 * ohne geometry_version oder Geometrie zu verändern.
 * Gibt { ok, id, distanceTagKm, ascentTagM, changed } zurück.
 */
router.post("/admin/routes/enrich-one", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { id } = req.body as { id?: string };
  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "Body: { id: string } erwartet (z.B. 'osm-1107386')" });
    return;
  }
  const osmIdRaw = parseInt(id.replace(/^osm-/, ""), 10);
  if (isNaN(osmIdRaw)) {
    res.status(400).json({ error: `Konnte keine OSM-ID aus '${id}' ableiten` });
    return;
  }
  try {
    const { runOverpass, parseNumericTag } = await import("../lib/overpass");
    const query = `[out:json][timeout:30];relation(id:${osmIdRaw});out tags;`;
    const elements = await runOverpass<{ id: number; tags?: Record<string, string> }>(query, 35_000);
    const tags = elements[0]?.tags ?? {};

    // NWN/RWN-Superrouten können > 500 km und > 20 000 m sein → grosszügigere Limits
    const distanceTagKm = parseNumericTag(tags.distance, 5_000);
    const ascentTagM = parseNumericTag(tags.ascent, 200_000);

    const newDistanceTagKm = distanceTagKm != null ? Math.round(distanceTagKm * 10) / 10 : null;
    const newAscentM = ascentTagM != null ? Math.round(ascentTagM) : null;
    const changed = newDistanceTagKm != null || newAscentM != null;

    // Fetch existing row so we can fall back to current values when only one tag changed
    const [existing] = await db
      .select({
        distanceKm: externalRoutesTable.distanceKm,
        distanceTagKm: externalRoutesTable.distanceTagKm,
        ascentM: externalRoutesTable.ascentM,
      })
      .from(externalRoutesTable)
      .where(eq(externalRoutesTable.id, id))
      .limit(1);

    if (changed) {
      const setObj: Record<string, unknown> = {};
      if (newDistanceTagKm != null) setObj["distanceTagKm"] = newDistanceTagKm;
      if (newAscentM != null) setObj["ascentM"] = newAscentM;

      // Recompute minutes from official tag values (fall back to existing DB values)
      const effectiveDistKm =
        newDistanceTagKm ?? existing?.distanceTagKm ?? existing?.distanceKm ?? 0;
      const effectiveAscentM = newAscentM ?? existing?.ascentM ?? 0;
      setObj["minutes"] = estimateMinutes(effectiveDistKm, effectiveAscentM);

      await db
        .update(externalRoutesTable)
        .set(setObj as { distanceTagKm?: number; ascentM?: number; minutes?: number })
        .where(eq(externalRoutesTable.id, id));
    }

    res.json({
      ok: true,
      id,
      osmId: osmIdRaw,
      tagsFound: { distance: tags.distance ?? null, ascent: tags.ascent ?? null },
      distanceTagKm: newDistanceTagKm,
      ascentTagM: newAscentM,
      changed,
    });
  } catch (err: any) {
    req.log.error({ err, id }, "enrich-one fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/routes/tag-sweep
 * Holt amtliche distance/ascent-Tags aus OSM für alle osm-* Routen
 * bei denen distance_tag_km noch NULL ist (geometry_version >= 1).
 * Batched: bis zu 100 Relationen pro Overpass-Abfrage.
 * Body: { dryRun?: boolean, batchSize?: number }
 * Gibt { swept, updated, noTag } zurück.
 */
router.post("/admin/routes/tag-sweep", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const { dryRun = false, batchSize: bs = 100 } = (req.body ?? {}) as {
    dryRun?: boolean;
    batchSize?: number;
  };
  const batchSize = Math.max(1, Math.min(200, bs));

  try {
    // Alle osm-* Routen ohne distanceTagKm laden (geometry bereits bekannt)
    const rows = await db
      .select({ id: externalRoutesTable.id, distanceKm: externalRoutesTable.distanceKm, ascentM: externalRoutesTable.ascentM })
      .from(externalRoutesTable)
      .where(sql`id LIKE 'osm-%' AND geometry_version >= 1 AND distance_tag_km IS NULL`);

    const { runOverpass, parseNumericTag } = await import("../lib/overpass");
    let updated = 0;
    let noTag = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const osmIds = batch.map((r) => parseInt(r.id.replace("osm-", ""), 10)).filter((n) => !isNaN(n));
      if (!osmIds.length) continue;
      try {
        const query = `[out:json][timeout:60];relation(id:${osmIds.join(",")});out tags;`;
        const elements = await runOverpass<{ id: number; tags?: Record<string, string> }>(query, 65_000);
        const tagsByOsmId = new Map(elements.map((e) => [e.id, e.tags ?? {}]));

        for (const row of batch) {
          const osmId = parseInt(row.id.replace("osm-", ""), 10);
          const tags = tagsByOsmId.get(osmId);
          if (!tags) { noTag++; continue; }
          const newDist = parseNumericTag(tags.distance, 5_000);
          const newAscent = parseNumericTag(tags.ascent, 100_000);
          if (!newDist && !newAscent) { noTag++; continue; }
          if (!dryRun) {
            const setObj: Record<string, unknown> = {};
            if (newDist != null) setObj["distanceTagKm"] = Math.round(newDist * 10) / 10;
            if (newAscent != null) setObj["ascentM"] = Math.round(newAscent);
            const effectiveDist = (newDist ?? (row.distanceKm ? Number(row.distanceKm) : 0));
            const effectiveAscent = (newAscent ?? (row.ascentM ? Number(row.ascentM) : 0));
            setObj["minutes"] = estimateMinutes(effectiveDist, effectiveAscent);
            await db.update(externalRoutesTable)
              .set(setObj as any)
              .where(eq(externalRoutesTable.id, row.id))
              .execute();
          }
          updated++;
        }
      } catch (batchErr: any) {
        req.log.warn({ batchErr: batchErr.message, from: i }, "tag-sweep: Batch fehlgeschlagen — weiter");
      }
      // kurze Pause zwischen Batches
      if (i + batchSize < rows.length) await new Promise((r) => setTimeout(r, 1_000));
    }

    res.json({ ok: true, swept: rows.length, updated, noTag, dryRun });
  } catch (err: any) {
    req.log.error({ err }, "tag-sweep fehlgeschlagen");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/routes/fill-vonbis?refs=1-7
 * Holt from/to-Tags direkt aus OSM für alle Routen ohne Von-Bis-Angabe
 * und trägt sie in die DB ein. refs=1-7 filtert auf Nationalrouten 1–7.
 * Gibt updated/skipped/failed zurück.
 */
router.post("/admin/routes/fill-vonbis", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const dry = req.query.dry === "true";
  // refs-Parameter: "1-7" → [1,2,3,4,5,6,7] oder "3" → [3]
  const refsParam = (req.query.refs as string | undefined) ?? "1-7";
  const [refLo, refHi] = refsParam.includes("-")
    ? refsParam.split("-").map(Number)
    : [Number(refsParam), Number(refsParam)];

  try {
    // 1. Alle osm-* Routen im ref-Bereich ohne Von-Bis laden
    const candidates = await db
      .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
      .from(externalRoutesTable)
      .where(
        and(
          sql`id LIKE 'osm-%'`,
          sql`name NOT LIKE '% - %'`,
          sql`SPLIT_PART(name, ' ', 1) ~ '^[0-9]+$'`,
          sql`CAST(SPLIT_PART(name, ' ', 1) AS INTEGER) BETWEEN ${refLo} AND ${refHi}`,
        ),
      );

    if (candidates.length === 0) {
      res.json({ updated: 0, skipped: 0, failed: 0, message: "Keine Kandidaten gefunden" });
      return;
    }

    // OSM-IDs extrahieren
    const osmIds = candidates
      .map((c) => parseInt(c.id.replace("osm-", ""), 10))
      .filter((n) => !isNaN(n));

    req.log.info({ count: osmIds.length }, "fill-vonbis: Overpass-Abfrage starten");

    // 2. Tags per Overpass abrufen
    const tagMap = new Map<number, Awaited<ReturnType<typeof fetchOsmRelationTags>>[number]>();
    const tags = await fetchOsmRelationTags(osmIds, req.log);
    for (const t of tags) tagMap.set(t.osmId, t);

    // 3. Für jede Route: Von-Bis aus OSM-Tags einsetzen
    let updated = 0, skipped = 0, failed = 0;
    const details: { id: string; old: string; new: string; source: string }[] = [];

    for (const c of candidates) {
      const osmId = parseInt(c.id.replace("osm-", ""), 10);
      const t = tagMap.get(osmId);
      if (!t) { skipped++; continue; }

      const from = t.from?.trim();
      const to   = t.to?.trim();

      // Von-Bis nur eintragen wenn beide Endpunkte bekannt
      if (!from || !to) { skipped++; continue; }

      // Basis-Routenname: alles nach der führenden Zahl + Routenname, ohne
      // bestehendes Von-Bis oder Etappen-Label (wird neu gebaut)
      // z.B. "3 Alpenpanorama-Weg" bleibt "3 Alpenpanorama-Weg"
      const baseMatch = c.name.match(/^(\d+)\s+(.+)$/);
      if (!baseMatch) { skipped++; continue; }
      const [, refStr, baseName] = baseMatch;

      // Etappen-Nummer: aus OSM-Name oder aus bestehendem DB-Name
      const etappeNr = t.etappeNr
        ?? c.name.match(/[Ee]tappe\s+(\d+)/)?.[1];
      const etappeLabel = etappeNr ? ` Etappe ${etappeNr}` : "";

      // Basis ohne bereits vorhandenes "Etappe N ..." kürzen
      const cleanBase = baseName.replace(/\s*[Ee]tappe\s+\d+.*$/, "").trim();
      const newName = `${refStr} ${cleanBase}${etappeLabel} ${from} - ${to}`;

      details.push({ id: c.id, old: c.name, new: newName, source: "osm-tags" });
      if (!dry) {
        try {
          await db
            .update(externalRoutesTable)
            .set({ name: newName })
            .where(eq(externalRoutesTable.id, c.id))
            .execute();
          updated++;
        } catch (err: any) {
          req.log.warn({ err, id: c.id }, "fill-vonbis: DB-Update fehlgeschlagen");
          failed++;
        }
      } else {
        updated++;
      }
    }

    req.log.info({ dry, updated, skipped, failed }, "fill-vonbis: abgeschlossen");
    res.json({ dry, updated, skipped, failed, details });
  } catch (err: any) {
    req.log.error({ err }, "fill-vonbis: Fehler");
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/routes/osm-bulk-fill?refMin=22&refMax=99&dry=true
 * Holt alle CH-Wanderrouten im ref-Bereich aus OSM in einer Overpass-Abfrage,
 * vergleicht mit DB und trägt fehlende Von-Bis / neue Routen ein.
 */
router.post("/admin/routes/osm-bulk-fill", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const dry = req.query.dry === "true";
  const refMin = parseInt((req.query.refMin as string) ?? "22", 10);
  const refMax = parseInt((req.query.refMax as string) ?? "99", 10);

  try {
    const { fetchOsmRoutesInRange } = await import("../lib/overpass");
    req.log.info({ refMin, refMax }, "osm-bulk-fill: Overpass-Abfrage");
    const osmRoutes = await fetchOsmRoutesInRange(refMin, refMax, req.log);
    req.log.info({ count: osmRoutes.length }, "osm-bulk-fill: OSM-Ergebnis");

    // Bestehende DB-Einträge für diesen ref-Bereich laden
    const existing = await db
      .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
      .from(externalRoutesTable)
      .where(
        and(
          sql`SPLIT_PART(name, ' ', 1) ~ '^[0-9]+$'`,
          sql`CAST(SPLIT_PART(name, ' ', 1) AS INTEGER) BETWEEN ${refMin} AND ${refMax}`,
        ),
      );

    // OSM-IDs die bereits in DB sind
    const dbOsmIds = new Set(
      existing
        .filter((e) => e.id.startsWith("osm-"))
        .map((e) => parseInt(e.id.replace("osm-", ""), 10)),
    );

    // Routen-Namen aus DB für Elternrouten-Check (schweizmobil-* Einträge)
    const dbNames = new Set(existing.map((e) => e.name));

    const toAdd: typeof osmRoutes = [];
    const toUpdate: { id: string; newName: string; oldName: string }[] = [];

    for (const r of osmRoutes) {
      const from = r.from?.trim();
      const to   = r.to?.trim();
      const baseName = r.nameDe ?? r.name;
      if (!baseName) continue;

      // Etappe-Nummer aus OSM-Namen extrahieren ("Etappe N" oder "01-" Prefix)
      const etappeMatchA = baseName.match(/[Ee]tappe\s+(\d+)/);
      const etappeMatchB = !etappeMatchA ? baseName.match(/^(\d{1,2})-/) : null;
      const etappeNr = etappeMatchA ? parseInt(etappeMatchA[1], 10)
                     : etappeMatchB ? parseInt(etappeMatchB[1], 10) : null;
      const cleanBase = baseName
        .replace(/\s*[Ee]tappe\s+\d+.*$/, "")  // "Etappe N …" am Ende
        .replace(/^\d{1,2}-/, "")               // "01-" Prefix
        .replace(/\s*[-–]\s*$/, "")             // hängendes " -" am Ende
        .trim();

      // Von-Bis aufbauen
      const vonBis = from && to ? ` ${from} - ${to}` : (from ? ` ${from}` : "");
      if (!vonBis) continue; // Kein Von-Bis → überspringen

      const etappeLabel = etappeNr ? ` Etappe ${etappeNr}` : "";
      const newName = `${r.ref} ${cleanBase}${etappeLabel}${vonBis}`;

      if (dbOsmIds.has(r.osmId)) {
        // Bereits in DB: Von-Bis fehlt?
        const dbEntry = existing.find((e) => e.id === `osm-${r.osmId}`);
        if (dbEntry && !dbEntry.name.includes(" - ")) {
          toUpdate.push({ id: `osm-${r.osmId}`, newName, oldName: dbEntry.name });
        }
      } else {
        // Noch nicht in DB → als neuen Eintrag vormerken
        toAdd.push(r);
      }
    }

    // Updates (Von-Bis ergänzen)
    let updated = 0;
    for (const u of toUpdate) {
      if (!dry) {
        await db.update(externalRoutesTable).set({ name: u.newName })
          .where(eq(externalRoutesTable.id, u.id)).execute();
      }
      updated++;
    }

    // Neue Routen einfügen (nur Metadaten, keine Geometrie)
    // → werden beim nächsten canton-sync mit Geometrie befüllt
    let inserted = 0;
    for (const r of toAdd) {
      const from = r.from?.trim();
      const to   = r.to?.trim();
      const baseName = r.nameDe ?? r.name ?? "";
      const etappeMatchA2 = baseName.match(/[Ee]tappe\s+(\d+)/);
      const etappeMatchB2 = !etappeMatchA2 ? baseName.match(/^(\d{1,2})-/) : null;
      const etappeNr = etappeMatchA2 ? parseInt(etappeMatchA2[1], 10)
                     : etappeMatchB2 ? parseInt(etappeMatchB2[1], 10) : null;
      const cleanBase = baseName
        .replace(/\s*[Ee]tappe\s+\d+.*$/, "")
        .replace(/^\d{1,2}-/, "")
        .replace(/\s*[-–]\s*$/, "")
        .trim();
      const etappeLabel = etappeNr ? ` Etappe ${etappeNr}` : "";
      const vonBis = from && to ? ` ${from} - ${to}` : "";
      const newName = `${r.ref} ${cleanBase}${etappeLabel}${vonBis}`;
      if (!dry) {
        const oid = "osm-" + r.osmId;
        await db.execute(sql`
          INSERT INTO external_routes
            (id, saga_id, canton, name, ref, distance_km, ascent_m, max_elevation_m,
             minutes, sac, terrain, lat, lng, geometry, geometry_version, source)
          VALUES (
            ${oid}, '', '', ${newName}, ${String(r.ref)},
            0, 0, 0, 0, 'unbekannt', '', 0, 0,
            '[]'::jsonb, -1, 'error'
          )
          ON CONFLICT (id) DO NOTHING
        `);
      }
      inserted++;
    }

    req.log.info({ dry, updated, inserted }, "osm-bulk-fill: fertig");
    res.json({
      dry,
      updated,
      inserted,
      updates: toUpdate,
      inserts: toAdd.map((r) => {
        const baseName = r.nameDe ?? r.name ?? "";
        const emA = baseName.match(/[Ee]tappe\s+(\d+)/);
        const emB = !emA ? baseName.match(/^(\d{1,2})-/) : null;
        const en = emA ? ` Etappe ${emA[1]}` : emB ? ` Etappe ${parseInt(emB[1],10)}` : "";
        const cb = baseName
          .replace(/\s*[Ee]tappe\s+\d+.*$/, "")
          .replace(/^\d{1,2}-/, "")
          .replace(/\s*[-–]\s*$/, "")
          .trim();
        const vb = r.from && r.to ? ` ${r.from} - ${r.to}` : "";
        return { osmId: r.osmId, name: `${r.ref} ${cb}${en}${vb}` };
      }),
    });
  } catch (err: any) {
    req.log.error({ err }, "osm-bulk-fill: Fehler");
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/routes/osm-search?ref=22
 * Sucht alle OSM-Hiking-Relationen mit gegebenem ref im CH-Bbox und gibt Tags zurück.
 * Einmaliger Hilfendpoint zum Auffinden fehlender Etappen.
 */
router.get("/admin/routes/osm-search", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const ref = (req.query.ref as string | undefined)?.trim();
  if (!ref) { res.status(400).json({ error: "ref fehlt" }); return; }
  try {
    const { fetchOsmRelationsByRef } = await import("../lib/overpass");
    const results = await fetchOsmRelationsByRef(ref, req.log);
    res.json({ count: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/routes/fix-lwn-refs
 * Prüft alle 3-stelligen Routen ohne ref-Spalte gegen Overpass:
 * - Hat die OSM-Relation einen ref-Tag (100–999)? → Name-Prefix + ref-Spalte aktualisieren
 * - Fehlt Von-Bis im Name und hat OSM from/to-Tags? → Von-Bis anhängen
 */
router.post("/admin/routes/fix-lwn-refs", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const log = req.log;

  // 1. Alle betroffenen Routen aus DB laden
  const rows = await db
    .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
    .from(externalRoutesTable)
    .where(
      and(
        isNull(externalRoutesTable.ref),
        sql`${externalRoutesTable.name} ~ '^[1-9][0-9][0-9] '`,
        sql`${externalRoutesTable.id} LIKE 'osm-%'`,
      ),
    );

  const osmIds = rows.map((r) => parseInt(r.id.replace("osm-", ""), 10)).filter((n) => !isNaN(n));
  log.info({ total: osmIds.length }, "fix-lwn-refs: Routen geladen");

  // 2. Overpass in Batches à 80 abfragen (nur Tags, kein Geom)
  const { runOverpass } = await import("../lib/overpass");
  const BATCH = 80;
  const tagMap = new Map<number, { ref?: string; from?: string; to?: string }>();

  for (let i = 0; i < osmIds.length; i += BATCH) {
    const batch = osmIds.slice(i, i + BATCH);
    const query = `[out:json][timeout:30];\nrelation(id:${batch.join(",")});\nout tags;`;
    try {
      const elements = await runOverpass<{ id: number; tags?: Record<string, string> }>(query);
      for (const el of elements) {
        const t = el.tags ?? {};
        tagMap.set(el.id, { ref: t.ref, from: t.from, to: t.to });
      }
    } catch (err) {
      log.warn({ err, batch: batch.slice(0, 3) }, "fix-lwn-refs: Overpass-Batch fehlgeschlagen");
    }
    if (i + BATCH < osmIds.length) await new Promise<void>((r) => setTimeout(r, 1_200));
  }

  log.info({ fetched: tagMap.size }, "fix-lwn-refs: Overpass-Tags geholt");

  // 3. DB-Updates berechnen und ausführen
  let refUpdates = 0;
  let vonBisUpdates = 0;
  let combined = 0;

  for (const row of rows) {
    const osmId = parseInt(row.id.replace("osm-", ""), 10);
    const tags = tagMap.get(osmId);
    if (!tags) continue;

    const refNum = tags.ref ? parseInt(tags.ref, 10) : NaN;
    const hasValidRef = !isNaN(refNum) && refNum >= 100 && refNum <= 999;
    const hasVonBis = row.name.includes(" - ");
    const hasOsmVonBis = !!(tags.from && tags.to);

    if (!hasValidRef && (hasVonBis || !hasOsmVonBis)) continue; // nichts zu tun

    // Basis-Name ohne aktuellen Zahlen-Prefix
    const baseName = row.name.replace(/^\d+\s+/, "");
    // Von-Bis anhängen wenn nötig
    const nameWithVonBis =
      !hasVonBis && hasOsmVonBis
        ? `${baseName} ${tags.from} - ${tags.to}`
        : baseName;

    const newName = hasValidRef
      ? `${refNum} ${nameWithVonBis}`
      : `${row.name.match(/^\d+/)?.[0] ?? "100"} ${nameWithVonBis}`;

    const newRef = hasValidRef ? String(refNum) : null;

    if (newName === row.name && newRef === null) continue;

    await db
      .update(externalRoutesTable)
      .set({ name: newName, ...(newRef !== null ? { ref: newRef } : {}) })
      .where(eq(externalRoutesTable.id, row.id))
      .execute()
      .catch((err) => log.warn({ err, id: row.id }, "fix-lwn-refs: Update fehlgeschlagen"));

    if (hasValidRef && !hasVonBis && hasOsmVonBis) combined++;
    else if (hasValidRef) refUpdates++;
    else vonBisUpdates++;
  }

  res.json({
    geprüft: rows.length,
    overpassTags: tagMap.size,
    refUmbenannt: refUpdates,
    vonBisErgänzt: vonBisUpdates,
    beides: combined,
  });
});

/**
 * POST /admin/routes/check-lwn-tags
 * Prüft die 797 3-stelligen Routen ohne ref nochmals in Overpass:
 * Hat die OSM-Relation network=lwn UND eine 3-stellige Zahl irgendwo in den Tags
 * (ref, name, alt_name, ref:schweizmobil …)? → ref-Spalte + Name-Prefix aktualisieren.
 */
router.post("/admin/routes/check-lwn-tags", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const log = req.log;

  const rows = await db
    .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
    .from(externalRoutesTable)
    .where(
      and(
        isNull(externalRoutesTable.ref),
        sql`${externalRoutesTable.name} ~ '^[1-9][0-9][0-9] '`,
        sql`${externalRoutesTable.id} LIKE 'osm-%'`,
      ),
    );

  const osmIds = rows.map((r) => parseInt(r.id.replace("osm-", ""), 10)).filter((n) => !isNaN(n));
  log.info({ total: osmIds.length }, "check-lwn-tags: Routen geladen");

  const { runOverpass } = await import("../lib/overpass");
  const BATCH = 80;
  const tagMap = new Map<number, Record<string, string>>();

  for (let i = 0; i < osmIds.length; i += BATCH) {
    const batch = osmIds.slice(i, i + BATCH);
    const query = `[out:json][timeout:30];\nrelation(id:${batch.join(",")});\nout tags;`;
    try {
      const elements = await runOverpass<{ id: number; tags?: Record<string, string> }>(query);
      for (const el of elements) tagMap.set(el.id, el.tags ?? {});
    } catch (err) {
      log.warn({ err }, "check-lwn-tags: Batch fehlgeschlagen");
    }
    if (i + BATCH < osmIds.length) await new Promise<void>((r) => setTimeout(r, 1_200));
  }

  log.info({ fetched: tagMap.size }, "check-lwn-tags: Tags geholt");

  // Alle Tags nach 3-stelliger Zahl (100–999) durchsuchen
  const DREI_DIGIT = /\b([1-9][0-9][0-9])\b/;
  let updated = 0;
  const found: Array<{ id: string; newRef: number; newName: string }> = [];

  for (const row of rows) {
    const osmId = parseInt(row.id.replace("osm-", ""), 10);
    const tags = tagMap.get(osmId);
    if (!tags) continue;

    const network = (tags.network ?? "").toLowerCase();
    if (network !== "lwn") continue; // nur echte lwn

    // Suche 3-stellige Zahl in allen Tag-Werten
    let foundNum: number | null = null;
    for (const val of Object.values(tags)) {
      const m = DREI_DIGIT.exec(val);
      if (m) { foundNum = parseInt(m[1], 10); break; }
    }
    if (!foundNum) continue;

    // Name-Prefix ersetzen
    const baseName = row.name.replace(/^\d+\s+/, "");
    const newName = `${foundNum} ${baseName}`;
    found.push({ id: row.id, newRef: foundNum, newName });
  }

  // Updates in DB schreiben
  for (const item of found) {
    await db
      .update(externalRoutesTable)
      .set({ name: item.newName, ref: String(item.newRef) })
      .where(eq(externalRoutesTable.id, item.id))
      .execute()
      .catch((err) => log.warn({ err, id: item.id }, "check-lwn-tags: Update fehlgeschlagen"));
    updated++;
  }

  res.json({ geprüft: rows.length, overpassTags: tagMap.size, lwnMit3Stellig: found.length, updated });
});

/**
 * POST /admin/routes/undo-check-lwn-tags
 * Macht die check-lwn-tags-Änderungen rückgängig:
 * Prüft alle 3-stelligen Routen mit ref IS NOT NULL gegen Overpass.
 * Wenn der OSM ref-Tag NICHT mit dem DB-ref übereinstimmt (Zahl wurde aus
 * name/alt_name geholt, nicht aus dem ref-Tag) → sequentielle Nummer zurück,
 * ref auf NULL setzen.
 */
router.post("/admin/routes/undo-check-lwn-tags", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const log = req.log;

  // Alle 3-stelligen Routen mit ref IS NOT NULL
  const rows = await db
    .select({ id: externalRoutesTable.id, name: externalRoutesTable.name, ref: externalRoutesTable.ref, canton: externalRoutesTable.canton })
    .from(externalRoutesTable)
    .where(
      and(
        isNotNull(externalRoutesTable.ref),
        sql`${externalRoutesTable.name} ~ '^[1-9][0-9][0-9] '`,
        sql`${externalRoutesTable.id} LIKE 'osm-%'`,
      ),
    );

  const osmIds = rows.map((r) => parseInt(r.id.replace("osm-", ""), 10)).filter((n) => !isNaN(n));
  log.info({ total: osmIds.length }, "undo-check-lwn-tags: Routen geladen");

  const { runOverpass } = await import("../lib/overpass");
  const BATCH = 80;
  const osmRefMap = new Map<number, string | null>(); // osmId → OSM ref-Tag (oder null)

  for (let i = 0; i < osmIds.length; i += BATCH) {
    const batch = osmIds.slice(i, i + BATCH);
    const query = `[out:json][timeout:30];\nrelation(id:${batch.join(",")});\nout tags;`;
    try {
      const elements = await runOverpass<{ id: number; tags?: Record<string, string> }>(query);
      for (const el of elements) osmRefMap.set(el.id, el.tags?.ref ?? null);
    } catch (err) {
      log.warn({ err }, "undo-check-lwn-tags: Batch fehlgeschlagen");
    }
    if (i + BATCH < osmIds.length) await new Promise<void>((r) => setTimeout(r, 1_200));
  }

  // Routen identifizieren wo DB-ref ≠ OSM ref-Tag → waren check-lwn-tags
  const toReset = rows.filter((row) => {
    const osmId = parseInt(row.id.replace("osm-", ""), 10);
    const osmRef = osmRefMap.get(osmId);
    return osmRef !== row.ref; // OSM ref passt nicht zum DB ref
  });

  log.info({ toReset: toReset.length }, "undo-check-lwn-tags: Routen zum Zurücksetzen");
  if (toReset.length === 0) { res.json({ zurückgesetzt: 0 }); return; }

  // Nur ref auf NULL setzen — Name bleibt unverändert
  let updated = 0;
  for (const row of toReset) {
    await db
      .update(externalRoutesTable)
      .set({ ref: null })
      .where(eq(externalRoutesTable.id, row.id))
      .execute()
      .catch((err) => log.warn({ err, id: row.id }, "undo-check-lwn-tags: Update fehlgeschlagen"));
    updated++;
  }

  res.json({ geprüft: rows.length, overpassTags: osmRefMap.size, zurückgesetzt: updated });
});

/**
 * POST /admin/routes/lwn-ref-dryrun
 * Dry-run: prüft die 818 Routen ohne Prefix und ohne ref in Overpass.
 * Gibt zurück wieviele einen lwn ref-Tag (100–999) haben — ändert nichts.
 */
router.post("/admin/routes/lwn-ref-dryrun", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const log = req.log;

  const rows = await db
    .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
    .from(externalRoutesTable)
    .where(
      and(
        isNull(externalRoutesTable.ref),
        sql`${externalRoutesTable.name} !~ '^[1-9]'`,
        sql`${externalRoutesTable.id} LIKE 'osm-%'`,
      ),
    );

  const osmIds = rows.map((r) => parseInt(r.id.replace("osm-", ""), 10)).filter((n) => !isNaN(n));
  log.info({ total: osmIds.length }, "lwn-ref-dryrun: Routen geladen");

  const { runOverpass } = await import("../lib/overpass");
  const BATCH = 80;
  const found: Array<{ id: string; name: string; ref: number }> = [];
  let fetched = 0;

  for (let i = 0; i < osmIds.length; i += BATCH) {
    const batch = osmIds.slice(i, i + BATCH);
    const query = `[out:json][timeout:30];\nrelation(id:${batch.join(",")});\nout tags;`;
    try {
      const elements = await runOverpass<{ id: number; tags?: Record<string, string> }>(query);
      fetched += elements.length;
      const DREI_DIGIT = /\b([1-9][0-9][0-9])\b/;
      for (const el of elements) {
        const vals = Object.values(el.tags ?? {});
        const hasLwn = vals.some((v) => v.toLowerCase().includes("lwn"));
        if (!hasLwn) continue;
        // Zusätzlich: 3-stellige Zahl (100–999) irgendwo in den Tags
        let foundNum: number | null = null;
        for (const v of vals) {
          const m = DREI_DIGIT.exec(v);
          if (m) { foundNum = parseInt(m[1], 10); break; }
        }
        if (!foundNum) continue;
        const row = rows.find((r) => r.id === `osm-${el.id}`);
        if (row) found.push({ id: row.id, name: row.name, ref: foundNum });
      }
    } catch (err) {
      log.warn({ err }, "lwn-ref-dryrun: Batch fehlgeschlagen");
    }
    if (i + BATCH < osmIds.length) await new Promise<void>((r) => setTimeout(r, 1_200));
  }

  res.json({
    geprüft: osmIds.length,
    overpassGefunden: fetched,
    mitLwnRef: found.length,
    beispiele: found.slice(0, 10),
  });
});

/**
 * POST /admin/routes/fetch-etappen
 * Prüft alle rwn/nwn-Elternrouten (is_etappe=FALSE) ob OSM direkte
 * Unter-Relationen (Etappen) kennt, die wir noch nicht haben, und
 * speichert diese — inkl. is_etappe=TRUE Markierung.
 * Läuft im Hintergrund; Fortschritt per GET /admin/routes/fetch-etappen-status.
 */
let fetchEtappenLaeuft = false;
const fetchEtappenStatus = { laufend: false, geprueft: 0, gefunden: 0, gespeichert: 0, fehler: 0 };

router.get("/admin/routes/fetch-etappen-status", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json(fetchEtappenStatus);
});

router.post("/admin/routes/fetch-etappen", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (fetchEtappenLaeuft) {
    res.json({ ok: false, message: "Läuft bereits", status: fetchEtappenStatus });
    return;
  }
  fetchEtappenLaeuft = true;
  fetchEtappenStatus.laufend = true;
  fetchEtappenStatus.geprueft = 0;
  fetchEtappenStatus.gefunden = 0;
  fetchEtappenStatus.gespeichert = 0;
  fetchEtappenStatus.fehler = 0;
  res.json({ ok: true, message: "Gestartet — Status via GET /admin/routes/fetch-etappen-status" });

  const log: Logger = req.log;

  (async () => {
    try {
      // Alle rwn/nwn Elternrouten ohne eigene Etappen-Markierung holen
      const eltern = await db
        .select({ id: externalRoutesTable.id, canton: externalRoutesTable.canton, name: externalRoutesTable.name, routeType: externalRoutesTable.routeType })
        .from(externalRoutesTable)
        .where(
          and(
            sql`${externalRoutesTable.routeType} IN ('rwn', 'nwn')`,
            eq(externalRoutesTable.isEtappe, false),
            sql`${externalRoutesTable.id} LIKE 'osm-%'`,
          ),
        );

      // Bekannte OSM-IDs vorab laden — kein Doppel-Insert
      const bekannteIds = new Set(
        (await db.select({ id: externalRoutesTable.id }).from(externalRoutesTable)).map((r) => r.id),
      );

      /** Statische Mapping-Tabelle: rwn-Nummer → exakter Wikipedia-Artikeltitel.
       *  Quelle: de.wikipedia.org/wiki/Schweizer_Wanderwege, Sektion 13. */
      const RWN_WIKI: Record<string, string> = {
        "22": "Kulturspur Appenzellerland",
        "23": "Senda Scuol–Samnaun",
        "24": "Thurweg",
        "25": "Senda Segantini",
        "26": "Panorama Rundweg Thunersee",
        "27": "Swiss Tour Monte Rosa",
        "29": "Pragelpass-Weg",
        "30": "Via Valtellina",
        "31": "Chemin du Jura",
        "32": "ViaSurprise",
        "33": "Via Albula/Bernina",
        "34": "Klettgau-Rhein-Weg",
        "35": "Walserweg Graubünden",
        "36": "Chemin du vignoble",
        "37": "Berner Voralpenweg",
        "38": "ViaBerna",
        "39": "Aletsch-Panoramaweg",
        "40": "Via Sbrinz",
        "42": "Aargauer Weg",
        "43": "Jakobsweg Graubünden",
        "44": "Appenzeller Weg",
        "45": "Nationalpark-Panoramaweg",
        "46": "Tour des Alpes Vaudoises",
        "47": "Zürich-Zugerland-Panoramaweg",
        "48": "Toggenburger Höhenweg",
        "49": "Vier-Quellen-Weg",
        "50": "Via Spluga",
        "51": "Furka-Höhenweg",
        "52": "Sentiero Lago di Lugano",
        "53": "Bernina-Tour",
        "54": "Mittelbünden-Panoramaweg",
        "55": "Via Suworow",
        "56": "Lötschberg-Panoramaweg",
        "57": "Obwaldner Höhenweg",
        "58": "Chemin des Bisses",
        "59": "Sentiero Cristallina",
        "60": "Via Rhenana",
        "61": "Walliser Sonnenweg",
        "63": "Schwyzer Höhenweg",
        "64": "ViaSett",
        "65": "Grenzpfad Napfbergland",
        "66": "Liechtensteiner Panoramaweg",
        "67": "Dreiland-Wanderweg",
        "68": "WALSA-Weg",
        "69": "Züri Oberland-Höhenweg",
        "70": "Via Francigena",
        "71": "Chemin des Trois-Lacs",
        "72": "Prättigauer Höhenweg",
        "73": "Sardona-Welterbe-Weg",
        "74": "Sentiero Verzasca",
        "76": "Seeland-Solothurn-Weg",
        "78": "Freiburger Voralpenweg",
        "79": "Thurgauer Panoramaweg",
        "80": "ViaJura",
        "81": "Fribourg en diagonale",
        "82": "Sanetsch-Muveran-Weg",
        "84": "Zürichsee-Rundweg",
        "85": "Senda Sursilvana",
        "86": "Rheintaler Höhenweg",
        "87": "Via Engiadina",
        "88": "Nidwaldner Höhenweg",
        "90": "Via Stockalper",
        "91": "Chemin du Jura bernois",
        "95": "Au fil du Doubs",
        "98": "Waldstätterweg",
        "99": "Weg der Schweiz",
      };

      /** Wikipedia-Artikeltitel aus DB-Routenname ableiten.
       *  Zuerst statische Map per Routennummer (zuverlässig),
       *  Fallback: Zahl-Prefix abschneiden.
       */
      function wikiTitelAus(routeName: string | null): string {
        if (!routeName) return "";
        const nrMatch = routeName.match(/^(\d{1,3})\s+/);
        if (nrMatch) {
          const titel = RWN_WIKI[nrMatch[1]];
          if (titel) return titel;
        }
        // Fallback: nur Zahl-Prefix abschneiden
        return routeName.replace(/^\d{1,3}\s+/, "").trim();
      }

      /** Enrich-Hilfsfunktion: OSM-IDs einpflegen + is_etappe setzen */
      async function enrichEtappenIds(canton: string | null, osmIds: number[]): Promise<void> {
        if (osmIds.length === 0) return;
        await enrichAndStore(canton ?? "CH", osmIds, log, { skipPhotos: false });
        const ids = osmIds.map((id) => `osm-${id}`);
        await db
          .update(externalRoutesTable)
          .set({ isEtappe: true })
          .where(sql`${externalRoutesTable.id} = ANY(${ids})`)
          .execute();
        fetchEtappenStatus.gespeichert += osmIds.length;
        ids.forEach((id) => bekannteIds.add(id));
      }

      for (const parent of eltern) {
        const osmId = parseInt(parent.id.replace("osm-", ""), 10);
        if (isNaN(osmId)) continue;
        fetchEtappenStatus.geprueft++;

        // ── 1. OSM Sub-Relationen ─────────────────────────────────────────
        const { results: subs, overpassOk } = await fetchSubRelations(osmId, log);
        await new Promise((r) => setTimeout(r, 1_500)); // Overpass schonen

        const neuOsm = subs.filter((s) => !bekannteIds.has(`osm-${s.osmId}`));
        if (neuOsm.length > 0) {
          fetchEtappenStatus.gefunden += neuOsm.length;
          log.info({ parent: parent.id, neuEtappen: neuOsm.length }, "fetch-etappen: OSM Etappen gefunden");
          try {
            await enrichEtappenIds(parent.canton, neuOsm.map((s) => s.osmId));
          } catch (err) {
            fetchEtappenStatus.fehler++;
            log.warn({ err, parent: parent.id }, "fetch-etappen: enrichAndStore (OSM) fehlgeschlagen");
          }
          continue; // OSM hat geliefert — kein Wikipedia-Fallback nötig
        }

        // ── 2. Wikipedia-Fallback ────────────────────────────────────────
        const wikiTitel = wikiTitelAus(parent.name);
        if (!wikiTitel) continue;

        const etappen = await fetchWikiEtappen(wikiTitel, log);
        if (etappen.length === 0) {
          log.info({ parent: parent.id, wikiTitel }, "fetch-etappen: kein Wikipedia-Eintrag gefunden");
          continue;
        }

        log.info({ parent: parent.id, wikiTitel, etappen: etappen.length, overpassOk }, "fetch-etappen: Wikipedia-Fallback");
        const wikiOsmIds: number[] = [];

        // OSM from/to-Suche nur wenn Overpass erreichbar war — sonst direkt Platzhalter
        if (overpassOk) {
          for (const etappe of etappen) {
            await new Promise((r) => setTimeout(r, 1_200)); // Overpass schonen
            const gefunden = await searchOsmRouteByFromTo(etappe.from, etappe.to, log);
            for (const id of gefunden) {
              if (!bekannteIds.has(`osm-${id}`) && !wikiOsmIds.includes(id)) {
                wikiOsmIds.push(id);
              }
            }
          }
        }

        if (wikiOsmIds.length > 0) {
          // OSM hat passende Relationen geliefert → normal enrich
          fetchEtappenStatus.gefunden += wikiOsmIds.length;
          log.info({ parent: parent.id, wikiTitel, wikiOsmIds }, "fetch-etappen: Wikipedia→OSM Etappen gefunden");
          try {
            await enrichEtappenIds(parent.canton, wikiOsmIds);
          } catch (err) {
            fetchEtappenStatus.fehler++;
            log.warn({ err, parent: parent.id }, "fetch-etappen: enrichAndStore (Wiki) fehlgeschlagen");
          }
          continue;
        }

        // OSM nicht erreichbar / keine Treffer → Wiki-Daten direkt als Platzhalter speichern
        const neuWikiEtappen = etappen.filter(
          (e) => !bekannteIds.has(`wiki-${osmId}-${e.nr}`),
        );
        if (neuWikiEtappen.length === 0) continue;

        log.info(
          { parent: parent.id, wikiTitel, anzahl: neuWikiEtappen.length },
          "fetch-etappen: Wikipedia-Platzhalter direkt gespeichert",
        );

        for (const e of neuWikiEtappen) {
          const wikiId = `wiki-${osmId}-${e.nr}`;
          const distKm = e.distKm ?? 10;
          try {
            await db
              .insert(externalRoutesTable)
              .values({
                id: wikiId,
                sagaId: parent.id, // Elternroute als Sagen-Anker
                canton: "", // wird per slice-wiki-etappen vom Startpunkt gesetzt
                name: `${parent.name.match(/^(\d{1,3})\s+/)?.[1] ?? ""} ${wikiTitel} Etappe ${e.nr} ${e.from} – ${e.to}`.trimStart(),
                distanceKm: distKm,
                distanceTagKm: e.distKm ?? null,
                ascentM: 0,
                maxElevationM: 0,
                minutes: Math.round((distKm / 4) * 60), // ~4 km/h
                sac: "unbekannt",
                terrain: "Wanderweg",
                lat: 0,
                lng: 0,
                geometry: [],
                source: "wiki",
                routeType: parent.routeType ?? "rwn",
                isEtappe: true,
              })
              .onConflictDoNothing()
              .execute();
            bekannteIds.add(wikiId);
            fetchEtappenStatus.gefunden++;
            fetchEtappenStatus.gespeichert++;
          } catch (err) {
            fetchEtappenStatus.fehler++;
            log.warn({ err, wikiId }, "fetch-etappen: Wiki-Platzhalter Insert fehlgeschlagen");
          }
        }
      }
      log.info(fetchEtappenStatus, "fetch-etappen: abgeschlossen");
    } finally {
      fetchEtappenStatus.laufend = false;
      fetchEtappenLaeuft = false;
    }
  })().catch((err) => {
    log.error({ err }, "fetch-etappen: unerwarteter Fehler");
    fetchEtappenStatus.laufend = false;
    fetchEtappenLaeuft = false;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/routes/slice-wiki-etappen
// Schneidet die Geometrie der Elternroute für wiki-* Platzhalter-Etappen zu.
// Benutzt SBB-Bahnhof-Koordinaten (transport.opendata.ch) als Schnittpunkte,
// fällt auf Nominatim (Stadtmitte) zurück, falls kein Bahnhof gefunden.
// ─────────────────────────────────────────────────────────────────────────────

const OPENDATA_BASE_ADMIN = "https://transport.opendata.ch/v1";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";


function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Normalisiert einen Geometrie-Punkt zu [lat, lng] */
function toLatLng(pt: unknown): [number, number] | null {
  if (Array.isArray(pt) && pt.length >= 2) return [Number(pt[0]), Number(pt[1])];
  if (pt && typeof pt === "object") {
    const o = pt as Record<string, number>;
    if ("lat" in o && "lng" in o) return [o.lat, o.lng];
  }
  return null;
}

/** Nächster Index in geometry ab startFrom */
function nearestIdx(geom: [number, number][], lat: number, lng: number, startFrom = 0): number {
  let best = startFrom;
  let bestDist = Infinity;
  for (let i = startFrom; i < geom.length; i++) {
    const d = haversineKm(lat, lng, geom[i][0], geom[i][1]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Koordinaten via SBB-Bahnhof oder Nominatim */
async function geocodeCity(
  city: string,
  log: Logger,
): Promise<{ lat: number; lng: number; via: string } | null> {
  // 1. SBB Hauptbahnhof
  try {
    const url = `${OPENDATA_BASE_ADMIN}/locations?query=${encodeURIComponent(city)}&type=station`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const json = (await res.json()) as {
        stations: Array<{
          id: string | null;
          name: string;
          coordinate: { x: number; y: number } | null;
        }>;
      };
      // Priorisiere Schweizer Bahnhöfe (ID beginnt mit 85)
      const candidates = (json.stations ?? []).filter(
        (s): s is typeof s & { id: string; coordinate: { x: number; y: number } } =>
          !!s.id && /^\d+$/.test(s.id) && !!s.coordinate,
      );
      const best =
        candidates.find((s) => s.id.startsWith("85")) ??
        candidates.find((s) => s.id.startsWith("8")) ??
        candidates[0];
      if (best) {
        return { lat: best.coordinate.x, lng: best.coordinate.y, via: `SBB:${best.name}` };
      }
    }
  } catch (_e) {
    /* weiter zu Nominatim */
  }

  // 2. Nominatim (Stadtmitte)
  await new Promise((r) => setTimeout(r, 1100)); // Rate-Limit 1/s
  try {
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(city + " Schweiz")}&format=json&limit=1&countrycodes=ch,de,at,li`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "SagaTrail/1.0 (admin slice-etappen)" },
    });
    if (res.ok) {
      const json = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (json[0]) {
        return {
          lat: parseFloat(json[0].lat),
          lng: parseFloat(json[0].lon),
          via: `Nominatim:${json[0].display_name.split(",")[0]}`,
        };
      }
    }
  } catch (_e) {
    /* nichts gefunden */
  }

  log.warn({ city }, "slice-wiki: Geocoding fehlgeschlagen");
  return null;
}

/** Parst "Etappe N: FROM – TO" → { nr, from, to } */
function parseEtappeName(name: string): { nr: number; from: string; to: string } | null {
  const m = name.match(/^Etappe\s+(\d+):\s*(.+?)\s*[–\-]\s*(.+)$/);
  if (!m) return null;
  return { nr: parseInt(m[1], 10), from: m[2].trim(), to: m[3].trim() };
}

let sliceWikiLaeuft = false;
let sliceWikiStatus: {
  laufend: boolean;
  geprueft: number;
  aktualisiert: number;
  uebersprungen: number;
  fehler: number;
} = { laufend: false, geprueft: 0, aktualisiert: 0, uebersprungen: 0, fehler: 0 };

router.get("/admin/routes/slice-wiki-etappen-status", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json(sliceWikiStatus);
});

router.post("/admin/routes/slice-wiki-etappen", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  if (sliceWikiLaeuft) {
    return res.status(409).json({ error: "Läuft bereits", status: sliceWikiStatus });
  }
  sliceWikiLaeuft = true;
  sliceWikiStatus = { laufend: true, geprueft: 0, aktualisiert: 0, uebersprungen: 0, fehler: 0 };
  res.json({ gestartet: true });

  const log: Logger = req.log;

  (async () => {
    try {
      // 1. Alle wiki-* Routen mit leerer Geometrie laden
      const wikiRouten = await db
        .select({
          id: externalRoutesTable.id,
          name: externalRoutesTable.name,
          sagaId: externalRoutesTable.sagaId,
        })
        .from(externalRoutesTable)
        .where(
          and(
            sql`${externalRoutesTable.id} LIKE 'wiki-%'`,
            sql`(${externalRoutesTable.geometry}::jsonb = '[]'::jsonb OR ${externalRoutesTable.lat} = 0)`,
          ),
        );

      // 2. Elternrouten-Geometrien laden
      const parentIds = [...new Set(wikiRouten.map((r) => r.sagaId).filter(Boolean))] as string[];
      const parents = await db
        .select({ id: externalRoutesTable.id, geometry: externalRoutesTable.geometry })
        .from(externalRoutesTable)
        .where(sql`${externalRoutesTable.id} = ANY(ARRAY[${sql.raw(
          parentIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(","),
        )}])`);

      const parentGeom = new Map<string, [number, number][]>();
      for (const p of parents) {
        if (!p.geometry || !Array.isArray(p.geometry) || (p.geometry as unknown[]).length === 0)
          continue;
        const pts: [number, number][] = [];
        for (const raw of p.geometry as unknown[]) {
          const pt = toLatLng(raw);
          if (pt) pts.push(pt);
        }
        if (pts.length > 1) parentGeom.set(p.id, pts);
      }

      // 3. Gruppiert nach Elternroute, sortiert nach Etappennummer
      const grouped = new Map<string, typeof wikiRouten>();
      for (const r of wikiRouten) {
        if (!r.sagaId) continue;
        if (!grouped.has(r.sagaId)) grouped.set(r.sagaId, []);
        grouped.get(r.sagaId)!.push(r);
      }

      for (const [parentId, etappen] of grouped) {
        const geom = parentGeom.get(parentId); // kann null sein → reiner Geocoding-Modus

        // Etappen nach Nummer sortieren
        const sortiert = etappen
          .map((e) => ({ ...e, parsed: parseEtappeName(e.name ?? "") }))
          .filter((e): e is typeof e & { parsed: NonNullable<typeof e.parsed> } => !!e.parsed)
          .sort((a, b) => a.parsed.nr - b.parsed.nr);

        // ── Richtungserkennung (nur wenn Elterngeometrie vorhanden) ──────────
        let arbeitsGeom: [number, number][] | null = geom ?? null;
        if (arbeitsGeom && sortiert.length > 0) {
          const ersteEtappe = sortiert[0].parsed;
          const erstFromCoord = await geocodeCity(ersteEtappe.from, log);
          if (erstFromCoord) {
            const distZumAnfang = haversineKm(
              erstFromCoord.lat, erstFromCoord.lng,
              arbeitsGeom[0][0], arbeitsGeom[0][1],
            );
            const distZumEnde = haversineKm(
              erstFromCoord.lat, erstFromCoord.lng,
              arbeitsGeom[arbeitsGeom.length - 1][0], arbeitsGeom[arbeitsGeom.length - 1][1],
            );
            if (distZumEnde < distZumAnfang) {
              arbeitsGeom = [...arbeitsGeom].reverse();
              log.info(
                { parentId, distZumAnfang: distZumAnfang.toFixed(2), distZumEnde: distZumEnde.toFixed(2) },
                "slice-wiki: Geometrie umgekehrt (Etappen laufen gegen Geometrie-Richtung)",
              );
            }
          }
        } else if (!arbeitsGeom) {
          log.info({ parentId }, "slice-wiki: kein Elterngeometrie → reiner Geocoding-Modus (2-Punkte-Stubs)");
        }

        // Geocoding-Cache damit jede Stadt nur einmal abgefragt wird
        const coordCache = new Map<string, { lat: number; lng: number; via: string } | null>();
        const cachedGeocode = async (city: string) => {
          if (!coordCache.has(city)) coordCache.set(city, await geocodeCity(city, log));
          return coordCache.get(city)!;
        };

        let suchStartIdx = 0; // Monoton voranschreiten (nur bei vorhandener Geometrie relevant)

        for (const etappe of sortiert) {
          sliceWikiStatus.geprueft++;
          const { from, to } = etappe.parsed;
          log.info({ id: etappe.id, from, to }, "slice-wiki: geocodiere Schnittpunkte");

          const fromCoord = await cachedGeocode(from);
          const toCoord = await cachedGeocode(to);

          if (!fromCoord || !toCoord) {
            log.warn({ id: etappe.id, from, to }, "slice-wiki: Geocoding unvollständig – übersprungen");
            sliceWikiStatus.uebersprungen++;
            continue;
          }

          const straightLineDist = haversineKm(fromCoord.lat, fromCoord.lng, toCoord.lat, toCoord.lng);
          let segment: [number, number][];
          let usedFallback = false;

          if (!arbeitsGeom) {
            // Kein Elterngeometrie → direkt Geocoding-Stub
            segment = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]];
            usedFallback = true;
          } else {
            const fromIdx = nearestIdx(arbeitsGeom, fromCoord.lat, fromCoord.lng, suchStartIdx);
            const toIdx = nearestIdx(arbeitsGeom, toCoord.lat, toCoord.lng, fromIdx + 1);

            if (fromIdx >= toIdx) {
              segment = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]];
              usedFallback = true;
            } else {
              const candidate = arbeitsGeom.slice(fromIdx, toIdx + 1);
              const candidateDist = (() => {
                let d = 0;
                for (let i = 1; i < candidate.length; i++)
                  d += haversineKm(candidate[i-1][0], candidate[i-1][1], candidate[i][0], candidate[i][1]);
                return d;
              })();
              // Wenn Segment << Luftlinie (< 30%), war Geometrie unvollständig → Stub ehrlicher
              if (candidateDist < straightLineDist * 0.3 && straightLineDist > 2) {
                segment = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]];
                usedFallback = true;
              } else {
                segment = candidate;
                suchStartIdx = fromIdx;
              }
            }
          }

          const midPt = segment[Math.floor(segment.length / 2)];
          const distKm = (() => {
            if (usedFallback) return Math.round(straightLineDist * 10) / 10;
            let d = 0;
            for (let i = 1; i < segment.length; i++)
              d += haversineKm(segment[i - 1][0], segment[i - 1][1], segment[i][0], segment[i][1]);
            return Math.round(d * 10) / 10;
          })();

          // Kanton vom Startpunkt der Etappe (nicht vom Elternrouten-Kanton)
          const geoResult = await reverseGeocode(fromCoord.lat, fromCoord.lng, log).catch(() => null);
          const kantonVomStart = geoResult?.canton ?? null;

          try {
            await db
              .update(externalRoutesTable)
              .set({
                geometry: segment as unknown as typeof externalRoutesTable.geometry._,
                lat: midPt[0],
                lng: midPt[1],
                distanceKm: distKm > 0 ? distKm : undefined,
                minutes: distKm > 0 ? Math.round((distKm / 4) * 60) : undefined,
                ...(kantonVomStart ? { canton: kantonVomStart } : {}),
              })
              .where(eq(externalRoutesTable.id, etappe.id))
              .execute();

            sliceWikiStatus.aktualisiert++;
            log.info(
              {
                id: etappe.id,
                segPts: segment.length,
                distKm,
                usedFallback,
                fromVia: fromCoord.via,
                toVia: toCoord.via,
              },
              "slice-wiki: Geometrie gesetzt",
            );
          } catch (err) {
            sliceWikiStatus.fehler++;
            log.warn({ err, id: etappe.id }, "slice-wiki: DB-Update fehlgeschlagen");
          }
        }
      }

      log.info(sliceWikiStatus, "slice-wiki: abgeschlossen");
    } finally {
      sliceWikiStatus.laufend = false;
      sliceWikiLaeuft = false;
    }
  })().catch((err) => {
    log.error({ err }, "slice-wiki: unerwarteter Fehler");
    sliceWikiStatus.laufend = false;
    sliceWikiLaeuft = false;
  });
  return;
});

// ─── Enrich Super-Relationen & Placeholder-Etappen ───────────────────────────
let enrichSuperLaeuft = false;
let enrichSuperStatus: {
  laufend: boolean;
  resetA: number;
  behandeltB: number;
  fehlerB: number;
  log: string[];
} = { laufend: false, resetA: 0, behandeltB: 0, fehlerB: 0, log: [] };

router.get("/admin/routes/enrich-super-status", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json(enrichSuperStatus);
});

/**
 * POST /admin/routes/enrich-super
 *
 * Gruppe A: 24 osm-* Super-Relationen (geometry_version=-1) → auf 0 zurücksetzen,
 *           damit der Enrich-Loop sie mit dem neuen SuperDeep-Fallback verarbeitet.
 * Gruppe B:  9 placeholder-*-Etappen → Geometrie via Wikipedia + Elternroute schneiden.
 */
router.post("/admin/routes/enrich-super", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (enrichSuperLaeuft) {
    res.json({ ok: false, message: "Läuft bereits", status: enrichSuperStatus });
    return;
  }
  enrichSuperLaeuft = true;
  enrichSuperStatus = { laufend: true, resetA: 0, behandeltB: 0, fehlerB: 0, log: [] };
  res.json({ ok: true, message: "Gestartet — Status via GET /admin/routes/enrich-super-status" });

  const log: Logger = req.log;
  const addLog = (s: string) => {
    enrichSuperStatus.log.push(s);
    log.info(s);
  };

  // Wikipedia-Artikel für fehlende NWN/RWN-Etappen
  const PLACEHOLDER_WIKI: Record<string, Record<string, string>> = {
    nwn: {
      "2": "Trans Swiss Trail",
      "4": "Via Jacobi",
      "5": "Jura-Höhenweg",
      "6": "Voie des Alpes",
    },
    rwn: {
      "62": "Walserweg Gottardo",
    },
  };

  (async () => {
    try {
      // ── Gruppe A: osm-* Super-Relationen ohne Geometrie → zurücksetzen ──────
      const gruppeA = await db
        .select({ id: externalRoutesTable.id })
        .from(externalRoutesTable)
        .where(
          and(
            sql`geometry_version = -1`,
            sql`${externalRoutesTable.id} LIKE 'osm-%'`,
          ),
        );

      if (gruppeA.length > 0) {
        const ids = gruppeA.map((r) => r.id);
        for (const slice of [ids]) {
          await db
            .update(externalRoutesTable)
            .set({ geometryVersion: 0 })
            .where(
              sql`${externalRoutesTable.id} = ANY(ARRAY[${sql.raw(slice.map((id) => `'${id.replace(/'/g, "''")}'`).join(","))}])`,
            );
        }
        enrichSuperStatus.resetA = ids.length;
        addLog(`Gruppe A: ${ids.length} osm-* Super-Relationen → geometry_version=0 (enrich-loop mit SuperDeep-Fallback übernimmt)`);
      } else {
        addLog("Gruppe A: keine osm-* Routen mit geometry_version=-1");
      }

      // ── Gruppe B: placeholder-Etappen → Geometrie aus Elternroute schneiden ─
      const gruppeB = await db
        .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
        .from(externalRoutesTable)
        .where(
          and(
            sql`geometry_version = -1`,
            sql`${externalRoutesTable.id} LIKE 'placeholder-%'`,
          ),
        );

      addLog(`Gruppe B: ${gruppeB.length} Placeholder-Etappen`);

      for (const etappe of gruppeB) {
        const m = /^placeholder-(nwn|rwn)-(\d+)-etappe-(\d+)$/.exec(etappe.id);
        if (!m) {
          enrichSuperStatus.fehlerB++;
          addLog(`  ✗ ${etappe.id}: unbekanntes ID-Format`);
          continue;
        }
        const [, network, ref, stageStr] = m;
        const stageNr = parseInt(stageStr!, 10);

        const wikiTitle = PLACEHOLDER_WIKI[network!]?.[ref!];
        if (!wikiTitle) {
          enrichSuperStatus.fehlerB++;
          addLog(`  ✗ ${etappe.id}: kein Wiki-Artikel für ${network}-${ref}`);
          continue;
        }

        // Elternroute in DB: name LIKE 'ref %', hat Geometrie
        const parents = await db
          .select({ id: externalRoutesTable.id, geometry: externalRoutesTable.geometry })
          .from(externalRoutesTable)
          .where(
            and(
              sql`geometry_version > 0`,
              sql`${externalRoutesTable.id} LIKE 'osm-%'`,
              sql`${externalRoutesTable.name} LIKE ${ref + " %"}`,
              eq(externalRoutesTable.isEtappe, false),
            ),
          )
          .limit(1);

        const parent = parents[0];
        let parentGeom: [number, number][] | null = null;
        if (parent?.geometry && Array.isArray(parent.geometry)) {
          const pts: [number, number][] = [];
          for (const raw of parent.geometry as unknown[]) {
            const pt = toLatLng(raw);
            if (pt) pts.push(pt);
          }
          if (pts.length > 1) parentGeom = pts;
        }
        addLog(`  ${etappe.id}: Wiki="${wikiTitle}", Eltern=${parent?.id ?? "—"} (${parentGeom?.length ?? 0} Punkte)`);

        // ── Strategie 1: Wikipedia-Etappen (bereits bekannte Artikel) ───────
        let stageFrom: string | null = null;
        let stageTo: string | null = null;
        let stageDistKm: number | null = null;
        let directGeom: [number, number][] | null = null;

        const wikiEtappen = await fetchWikiEtappen(wikiTitle, log).catch((): WikiEtappe[] => []);
        const stageData = wikiEtappen.find((e) => e.nr === stageNr);
        if (stageData?.from && stageData?.to) {
          stageFrom = stageData.from;
          stageTo = stageData.to;
          stageDistKm = stageData.distKm ?? null;
          addLog(`  → Wikipedia: Etappe ${stageNr}: ${stageFrom} – ${stageTo} (${stageDistKm ?? "?"}km)`);
        } else {
          addLog(`  Wikipedia lieferte ${wikiEtappen.length} Etappen (Etappe ${stageNr} nicht dabei) — OSM-Fallback`);

          // ── Strategie 2: Direkt OSM-Sub-Relationen ───────────────────────
          const osmCandidates = await fetchOsmRelationsByRef(ref!, log);
          const anyEtappeRe = /(etappe|étape|tappa|stage)/i;
          // Parent-Kandidaten: selbes Netzwerk, kein Etappen-Name
          const parentCandidates = osmCandidates.filter(
            (r) => r.network === network && !anyEtappeRe.test(r.name ?? ""),
          );
          const topCandidates = parentCandidates.slice(0, 4);
          addLog(`  OSM: ${osmCandidates.length} Relationen mit ref=${ref!}, ${parentCandidates.length} Eltern-Kandidaten (prüfe ${topCandidates.length})`);

          for (const pc of topCandidates) {
            const { results: subRels } = await fetchSubRelations(pc.osmId, log);
            // Sub-Relation mit passender Etappennummer suchen
            const stageRe = new RegExp(
              String.raw`(?:etappe|étape|tappa|stage)\s*0?${stageNr}\b`,
              "i",
            );
            const match = subRels.find((s) => stageRe.test(s.name ?? "") || s.ref === String(stageNr));
            if (match) {
              addLog(`  OSM: Sub-Relation gefunden: ${match.osmId} "${match.name ?? match.ref}"`);
              const rawGeoArr = await fetchRouteGeometries([match.osmId], log, {
                batchSize: 1,
                timeoutMs: 60_000,
              }).catch(() => []);
              const rawGeo = rawGeoArr[0];
              if (rawGeo?.points && rawGeo.points.length >= 2) {
                directGeom = rawGeo.points.map((p) => [p.lat, p.lng] as [number, number]);
                stageDistKm = rawGeo.distanceTagKm ?? null;
                addLog(`  ✓ OSM: ${directGeom.length} Punkte geladen`);
              }
              break;
            }
          }

          if (!directGeom) {
            enrichSuperStatus.fehlerB++;
            addLog(`  ✗ ${etappe.id}: weder Wikipedia noch OSM haben Etappe ${stageNr}`);
            continue;
          }
        }

        // ── Geometrie: entweder direkt aus OSM oder via from/to aus Elternroute ─
        let segment: [number, number][];
        let distKm: number;

        if (directGeom) {
          segment = directGeom;
          distKm = stageDistKm ?? (() => {
            let d = 0;
            for (let i = 1; i < segment.length; i++)
              d += haversineKm(segment[i - 1]![0], segment[i - 1]![1], segment[i]![0], segment[i]![1]);
            return Math.round(d * 10) / 10;
          })();
        } else {
          // from/to über Geocoding + Elternroute schneiden
          const fromCoord = await geocodeCity(stageFrom!, log).catch(() => null);
          const toCoord = await geocodeCity(stageTo!, log).catch(() => null);
          if (!fromCoord || !toCoord) {
            enrichSuperStatus.fehlerB++;
            addLog(`  ✗ ${etappe.id}: Geocoding fehlgeschlagen (${stageFrom} / ${stageTo})`);
            continue;
          }
          if (parentGeom) {
            const fromIdx = nearestIdx(parentGeom, fromCoord.lat, fromCoord.lng, 0);
            const toIdx = nearestIdx(parentGeom, toCoord.lat, toCoord.lng, fromIdx + 1);
            segment = fromIdx < toIdx
              ? parentGeom.slice(fromIdx, toIdx + 1)
              : [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]];
          } else {
            segment = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]];
          }
          distKm = stageDistKm ?? (() => {
            let d = 0;
            for (let i = 1; i < segment.length; i++)
              d += haversineKm(segment[i - 1]![0], segment[i - 1]![1], segment[i]![0], segment[i]![1]);
            return Math.round(d * 10) / 10;
          })();
        }

        const midPt = segment[Math.floor(segment.length / 2)]!;
        const geoResult = await reverseGeocode(midPt[0], midPt[1], log).catch(() => null);
        const canton = geoResult?.canton ?? null;

        try {
          await db
            .update(externalRoutesTable)
            .set({
              geometry: segment as unknown as typeof externalRoutesTable.geometry._,
              lat: midPt[0],
              lng: midPt[1],
              distanceKm: distKm > 0 ? distKm : undefined,
              minutes: distKm > 0 ? Math.round((distKm / 4) * 60) : undefined,
              geometryVersion: GEOMETRY_VERSION,
              ...(canton ? { canton } : {}),
            })
            .where(eq(externalRoutesTable.id, etappe.id))
            .execute();

          enrichSuperStatus.behandeltB++;
          addLog(`  ✓ ${etappe.id}: gespeichert (${segment.length} Punkte, ${distKm}km, ${canton ?? "?"})`);
        } catch (err) {
          enrichSuperStatus.fehlerB++;
          addLog(`  ✗ ${etappe.id}: DB-Update fehlgeschlagen`);
          log.warn({ err, id: etappe.id }, "enrich-super: DB-Fehler");
        }
      }

      addLog(
        `Fertig: A=${enrichSuperStatus.resetA} zurückgesetzt, B=${enrichSuperStatus.behandeltB} behandelt, Fehler=${enrichSuperStatus.fehlerB}`,
      );
    } finally {
      enrichSuperStatus.laufend = false;
      enrichSuperLaeuft = false;
    }
  })().catch((err) => {
    log.error({ err }, "enrich-super: unerwarteter Fehler");
    enrichSuperStatus.laufend = false;
    enrichSuperLaeuft = false;
  });
});

// ---------------------------------------------------------------------------
// POST /admin/migrate-20260731
// Einmalige Datenmigration: Route-43-Korrekturen + Parent-Geometrien restitch
// Nur einmal gegen Prod aufrufen nach Publish.
// ---------------------------------------------------------------------------
const migrate20260731Status = { done: false, log: [] as string[] };

router.post("/migrate-20260731", (req, res) => {
  if (!requireAdminToken(req, res)) return;

  const addLog = (msg: string) => {
    migrate20260731Status.log.push(msg);
    console.log("[migrate-20260731]", msg);
  };

  res.json({ ok: true, message: "Migration gestartet – GET /admin/migrate-20260731/status für Fortschritt" });

  (async () => {
    if (migrate20260731Status.done) { addLog("Bereits ausgeführt."); return; }
    addLog("=== Migration 2026-07-31 Start ===");

    // -----------------------------------------------------------------------
    // 1. Route 43 Etappen-Korrekturen
    // -----------------------------------------------------------------------
    const etappenUpdates: Array<{ id: string; name: string; isEtappe: boolean; distanceKm?: number; distanceTagKm?: number; ascentM?: number }> = [
      { id: "osm-17065236", name: "43 Jakobsweg Graubünden Etappe 13 Tamins - Trin Digg",  isEtappe: true, distanceKm: 4.9, distanceTagKm: 5,  ascentM: 260 },
      { id: "osm-20113042", name: "43 Jakobsweg Graubünden Etappe 19 Rueras - Oberalppass", isEtappe: true, distanceTagKm: 12, ascentM: 1050 },
      { id: "osm-20113013", name: "43 Jakobsweg Graubünden Etappe 18 Disentis - Rueras",   isEtappe: true, distanceTagKm: 12, ascentM: 500 },
      { id: "osm-17057573", name: "43 Jakobsweg Graubünden Etappe 1 Müstair - Lü",          isEtappe: true, distanceTagKm: 18, ascentM: 820 },
      { id: "osm-17057571", name: "43 Jakobsweg Graubünden Etappe 2 Lü - S-charl",          isEtappe: true, distanceTagKm: 15, ascentM: 500 },
      { id: "osm-17057572", name: "43 Jakobsweg Graubünden Etappe 3 S-charl - Scuol",       isEtappe: true, distanceTagKm: 14, ascentM: 280 },
      { id: "osm-17059092", name: "43 Jakobsweg Graubünden Etappe 7 S-chanf (Cinuos-chel) - Dürrboden", isEtappe: true, distanceTagKm: 18, ascentM: 1050 },
      { id: "osm-17064977", name: "43 Jakobsweg Graubünden Etappe 8 Dürrboden - Davos Dorf", isEtappe: true, ascentM: 70 },
      { id: "osm-20112862", name: "43 Jakobsweg Graubünden Etappe 10 Langwies - Tschiertschen", isEtappe: true, ascentM: 640 },
      { id: "osm-20112882", name: "43 Jakobsweg Graubünden Etappe 11 Tschiertschen - Chur",  isEtappe: true, ascentM: 240 },
      { id: "osm-17065237", name: "43 Jakobsweg Graubünden Etappe 12 Chur - Tamins",         isEtappe: true, distanceTagKm: 13, ascentM: 360 },
      { id: "osm-17066113", name: "43 Jakobsweg Graubünden Etappe 14 Trin Digg - Laax (Falera)", isEtappe: true, distanceTagKm: 17, ascentM: 950 },
      { id: "osm-17066346", name: "43 Jakobsweg Graubünden Etappe 15 Laax (Falera) - Brigels (Andiast)", isEtappe: true, distanceTagKm: 21, ascentM: 800 },
      { id: "osm-17066412", name: "43 Jakobsweg Graubünden Etappe 16 Brigels (Andiast) - Trun", isEtappe: true, ascentM: 727 },
    ];

    for (const u of etappenUpdates) {
      try {
        await db
          .update(externalRoutesTable)
          .set({
            name: u.name,
            isEtappe: u.isEtappe,
            ...(u.distanceKm    !== undefined ? { distanceKm:    u.distanceKm }    : {}),
            ...(u.distanceTagKm !== undefined ? { distanceTagKm: u.distanceTagKm } : {}),
            ...(u.ascentM       !== undefined ? { ascentM:       u.ascentM }       : {}),
          })
          .where(eq(externalRoutesTable.id, u.id))
          .execute();
        addLog(`✓ Etappe ${u.id} aktualisiert`);
      } catch (err) {
        addLog(`✗ Etappe ${u.id} Fehler: ${err}`);
      }
    }

    // -----------------------------------------------------------------------
    // 2. Parent-Routen: distance_tag_km, ascent_m korrigieren + gv=-1 setzen
    // -----------------------------------------------------------------------
    const parentUpdates: Array<{ id: string; distanceTagKm?: number; ascentM?: number }> = [
      { id: "schweizmobil-rwn-43", distanceTagKm: 265,    ascentM: 11140 },
      { id: "schweizmobil-rwn-24", distanceTagKm: 100,    ascentM: 220 },
      { id: "schweizmobil-rwn-32", distanceTagKm: 87 },
      { id: "schweizmobil-rwn-55", distanceTagKm: 172,    ascentM: 7590 },
      { id: "schweizmobil-rwn-60", distanceTagKm: 110 },
      { id: "schweizmobil-rwn-64", distanceTagKm: 110,    ascentM: 4520 },
      { id: "schweizmobil-rwn-71", distanceTagKm: 45.7 },
      { id: "schweizmobil-rwn-80", distanceTagKm: 52 },
      { id: "schweizmobil-rwn-83", distanceTagKm: 66 },
      { id: "schweizmobil-rwn-86", distanceTagKm: 94 },
      { id: "schweizmobil-rwn-87", distanceTagKm: 132.8 },
      { id: "schweizmobil-rwn-98", distanceTagKm: 114 },
      { id: "schweizmobil-rwn-99", distanceTagKm: 34,     ascentM: 1380 },
    ];

    for (const p of parentUpdates) {
      try {
        await db
          .update(externalRoutesTable)
          .set({
            ...(p.distanceTagKm !== undefined ? { distanceTagKm: p.distanceTagKm } : {}),
            ...(p.ascentM       !== undefined ? { ascentM:       p.ascentM }       : {}),
            geometryVersion: -1,
          })
          .where(eq(externalRoutesTable.id, p.id))
          .execute();
        addLog(`✓ Parent ${p.id} → tagKm=${p.distanceTagKm ?? "unbeh."}, gv=-1`);
      } catch (err) {
        addLog(`✗ Parent ${p.id} Fehler: ${err}`);
      }
    }

    // -----------------------------------------------------------------------
    // 3. Restitch: Parents mit gv=-1 aus Etappen neu aufbauen
    // -----------------------------------------------------------------------
    addLog("--- Restitch Start ---");

    const R = 6371;
    const hav = (a: [number, number], b: [number, number]) => {
      const dLat = ((b[0] - a[0]) * Math.PI) / 180;
      const dLng = ((b[1] - a[1]) * Math.PI) / 180;
      const s = Math.sin(dLat / 2) ** 2 +
        Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s));
    };

    const normGeo = (g: unknown): [number, number][] | null => {
      if (!g) return null;
      try {
        const parsed = typeof g === "string" ? JSON.parse(g) : g;
        if (!Array.isArray(parsed) || parsed.length < 2) return null;
        return parsed.map((p: unknown) =>
          Array.isArray(p) ? [p[0], p[1]] : [(p as any).lat ?? (p as any)[0], (p as any).lng ?? (p as any)[1]]
        );
      } catch { return null; }
    };

    const etappenNrFromName = (name: string): number | null => {
      const m = name.match(/(?:Etappe|Étape|Etape|Tappa|Stage)\s+(\d+)/i);
      return m ? parseInt(m[1], 10) : null;
    };

    const stitch = (segs: [number, number][][]): [number, number][] => {
      let chain = segs[0].slice();
      for (let i = 1; i < segs.length; i++) {
        const seg = segs[i].slice();
        const end = chain[chain.length - 1];
        if (hav(end, seg[seg.length - 1]) < hav(end, seg[0])) seg.reverse();
        chain = chain.concat(seg);
      }
      return chain;
    };

    // Alle Parents mit gv=-1 laden (nur die, die wir gerade gesetzt haben)
    const targetParentIds = parentUpdates.map(p => p.id);

    const parentsToStitch = await db
      .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
      .from(externalRoutesTable)
      .where(
        and(
          inArray(externalRoutesTable.id, targetParentIds),
          eq(externalRoutesTable.geometryVersion, -1)
        )
      )
      .execute();

    addLog(`${parentsToStitch.length} Parents zum Restitch gefunden`);

    for (const parent of parentsToStitch) {
      // Etappen dieses Parents laden (via saga_id)
      const etappen = await db
        .select({
          id: externalRoutesTable.id,
          name: externalRoutesTable.name,
          geometry: externalRoutesTable.geometry,
        })
        .from(externalRoutesTable)
        .where(
          and(
            eq(externalRoutesTable.sagaId, parent.id),
            eq(externalRoutesTable.isEtappe, true)
          )
        )
        .execute();

      if (etappen.length === 0) {
        addLog(`SKIP ${parent.id} — keine Etappen verlinkt`);
        continue;
      }

      const withGeo = etappen
        .map(e => ({ ...e, pts: normGeo(e.geometry) }))
        // Mindestens 3 Punkte: 2-Punkt-Etappen sind Geraden (wiki-Platzhalter)
        // und dürfen die Parent-Geometrie nicht einfrieren (#72)
        .filter(e => e.pts && e.pts.length >= 3);

      if (withGeo.length < etappen.length) {
        addLog(`SKIP ${parent.id} — ${etappen.length - withGeo.length}/${etappen.length} Etappen ohne Geo`);
        continue;
      }

      // Nach Etappen-Nummer sortieren
      const ordered = [...withGeo].sort((a, b) => {
        const na = etappenNrFromName(a.name ?? "");
        const nb = etappenNrFromName(b.name ?? "");
        if (na !== null && nb !== null) return na - nb;
        return 0;
      });

      try {
        const chain = stitch(ordered.map(e => e.pts!));
        const rounded = chain.map(([lat, lng]) => [
          Math.round(lat * 1e6) / 1e6,
          Math.round(lng * 1e6) / 1e6,
        ]);

        await db
          .update(externalRoutesTable)
          .set({ geometry: rounded as any, geometryVersion: 5 })
          .where(eq(externalRoutesTable.id, parent.id))
          .execute();

        addLog(`✓ Restitch ${parent.id}: ${ordered.length} Etappen → ${rounded.length} Punkte`);
      } catch (err) {
        addLog(`✗ Restitch ${parent.id} Fehler: ${err}`);
      }
    }

    migrate20260731Status.done = true;
    addLog("=== Migration 2026-07-31 FERTIG ===");
  })().catch(err => {
    migrate20260731Status.log.push(`FATAL: ${err}`);
    console.error("[migrate-20260731] Fehler:", err);
  });
});

router.get("/migrate-20260731/status", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json(migrate20260731Status);
});

// ---------------------------------------------------------------------------
// POST /admin/sagas/geocode-ungefaehr
// Liest alle Sagen mit koordinaten_sicherheit='ungefaehr', extrahiert per
// Claude den spezifischsten genannten Ort aus dem Summary und geocodiert
// ihn via Nominatim. Wenn der Treffer <30 km vom bestehenden Mittelpunkt
// liegt, wird lat/lng + sicherheit='exakt' in die DB geschrieben.
// Gibt einen vollständigen Report zurück (aktualisiert / nicht gefunden / Fehler).
// ---------------------------------------------------------------------------
router.post("/admin/sagas/geocode-ungefaehr", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const dryRun = req.query.dry === "1";

  const sagas = await db
    .select({
      id: catalogSagasTable.id,
      title: catalogSagasTable.title,
      canton: catalogSagasTable.canton,
      summary: catalogSagasTable.summary,
      lat: catalogSagasTable.lat,
      lng: catalogSagasTable.lng,
    })
    .from(catalogSagasTable)
    .where(eq(catalogSagasTable.koordinatenSicherheit, "ungefaehr"));

  req.log.info({ count: sagas.length, dryRun }, "Starte Geocodierung ungefähr-Sagen");

  const results: {
    title: string;
    canton: string;
    status: "aktualisiert" | "kein_ort" | "zu_weit" | "geocode_fehler" | "ki_fehler";
    ort?: string;
    lat?: number;
    lng?: number;
    distKm?: number;
  }[] = [];

  const NOMINATIM_UA = "SagaTrail/1.0 (Swiss hiking app)";
  const MAX_DIST_KM = 30;

  for (const saga of sagas) {
    await new Promise((r) => setTimeout(r, 1100)); // Nominatim: max 1 req/s

    // 1. Ortsname per Claude extrahieren
    let ortName: string | null = null;
    try {
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 64,
        messages: [{
          role: "user",
          content: [
            `Sage: "${saga.title}" (Kanton ${saga.canton})`,
            `Summary: ${saga.summary}`,
            ``,
            `Aufgabe: Nenne NUR den spezifischsten konkreten Ort, der im Summary explizit erwähnt wird`,
            `(z.B. "Rheinfähre Basel", "Spalentor Basel", "Teufelsbrücke Andermatt").`,
            `Wenn kein konkreter Ort genannt wird, antworte exakt: KEIN_ORT`,
            `Keine Erklärung, nur der Ortsname oder KEIN_ORT.`,
          ].join("\n"),
        }],
      });
      const block = msg.content.find((b) => b.type === "text");
      const raw = block?.type === "text" ? block.text.trim() : "KEIN_ORT";
      ortName = raw === "KEIN_ORT" || raw.length < 3 ? null : raw;
    } catch {
      results.push({ title: saga.title, canton: saga.canton, status: "ki_fehler" });
      continue;
    }

    if (!ortName) {
      results.push({ title: saga.title, canton: saga.canton, status: "kein_ort" });
      continue;
    }

    // 2. Geocodieren via Nominatim (Schweiz + Liechtenstein)
    let hitLat: number | null = null;
    let hitLng: number | null = null;
    try {
      const query = `${ortName}, ${saga.canton}, Schweiz`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ch,li`;
      const resp = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA }, signal: AbortSignal.timeout(8000) });
      const hits = await resp.json() as { lat: string; lon: string }[];
      if (hits.length > 0) {
        hitLat = parseFloat(hits[0].lat);
        hitLng = parseFloat(hits[0].lon);
      }
    } catch {
      results.push({ title: saga.title, canton: saga.canton, status: "geocode_fehler", ort: ortName });
      continue;
    }

    if (hitLat === null || hitLng === null) {
      results.push({ title: saga.title, canton: saga.canton, status: "geocode_fehler", ort: ortName });
      continue;
    }

    // 3. Distanz zum bestehenden Mittelpunkt prüfen
    const distKm = saga.lat && saga.lng
      ? Math.sqrt(
          Math.pow((hitLat - saga.lat) * 111.32, 2) +
          Math.pow((hitLng - saga.lng) * 111.32 * Math.cos((saga.lat * Math.PI) / 180), 2)
        )
      : 0;

    if (distKm > MAX_DIST_KM) {
      results.push({ title: saga.title, canton: saga.canton, status: "zu_weit", ort: ortName, lat: hitLat, lng: hitLng, distKm: Math.round(distKm) });
      continue;
    }

    // 4. DB updaten
    if (!dryRun) {
      await db
        .update(catalogSagasTable)
        .set({ lat: hitLat, lng: hitLng, koordinatenSicherheit: "exakt" })
        .where(eq(catalogSagasTable.id, saga.id));
    }
    results.push({ title: saga.title, canton: saga.canton, status: "aktualisiert", ort: ortName, lat: hitLat, lng: hitLng, distKm: Math.round(distKm) });
    req.log.info({ title: saga.title, ort: ortName, lat: hitLat, lng: hitLng, distKm, dryRun }, "Saga geocodiert");
  }

  const summary = {
    gesamt: sagas.length,
    aktualisiert: results.filter((r) => r.status === "aktualisiert").length,
    kein_ort: results.filter((r) => r.status === "kein_ort").length,
    zu_weit: results.filter((r) => r.status === "zu_weit").length,
    fehler: results.filter((r) => ["geocode_fehler", "ki_fehler"].includes(r.status)).length,
    dryRun,
  };
  req.log.info(summary, "Geocodierung abgeschlossen");
  res.json({ summary, results });
});

export default router;

