import { randomUUID, timingSafeEqual } from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { clerkClient } from "@clerk/express";
import { desc, eq, or, ilike, isNotNull, ne, sql } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  profilesTable,
  partnersTable,
  catalogRoutesTable,
  catalogSagasTable,
  externalRoutesTable,
  type PartnerKategorie,
} from "@workspace/db";
import { istPremiumAktiv } from "../lib/premiumStatus";
import { ADMIN_DASHBOARD_HTML } from "../lib/adminDashboardHtml";
import { clearNarrationCache } from "../lib/narrationCache";
import { KANTON_SLUGS } from "../lib/kantonspackClaim";
import { startPartnerLeadsExport, jobState } from "../lib/partnerLeads";

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

const PackGrantBody = z.object({
  userId: z.string().min(1),
  slug: z.string().min(1),
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
// ===================================================================
// PUSH-NACHRICHTEN
// ===================================================================

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
});

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];
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
        errors.push(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
        failed++;
        continue;
      }
      const json = (await res.json()) as { data?: { status: string; message?: string; details?: unknown }[] };
      const r = (json.data ?? [])[0];
      if (!r || r.status === "ok") {
        sent++;
      } else {
        failed++;
        errors.push(r.message ?? JSON.stringify(r.details ?? r));
      }
    } catch (e) {
      errors.push(String(e));
      failed++;
    }
  }
  return { sent, failed, errors };
}

router.post("/admin/push", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;

  const parsed = PushSendBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { tier, title, body: msg, data } = parsed.data;

  // Alle Profile mit Push-Token laden
  const rows = await db
    .select({ id: profilesTable.id, pushToken: profilesTable.pushToken, subscriptionTier: profilesTable.subscriptionTier })
    .from(profilesTable)
    .where(isNotNull(profilesTable.pushToken));

  const matching = rows.filter((r) => {
    if (!r.pushToken) return false;
    if (tier === "alle") return true;
    return r.subscriptionTier === tier;
  });

  const tokens = matching.map((r) => r.pushToken as string);
  const skipped = rows.length - matching.length;

  req.log.info({ tier, count: tokens.length }, "Push-Kampagne gestartet");

  const { sent, failed, errors } = await sendExpoPush(tokens, title, msg, data);

  req.log.info({ tier, sent, failed, skipped, errors }, "Push-Kampagne abgeschlossen");
  res.json({ ok: true, tier, total: rows.length, targeted: tokens.length, sent, failed, skipped, errors });
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

export default router;
