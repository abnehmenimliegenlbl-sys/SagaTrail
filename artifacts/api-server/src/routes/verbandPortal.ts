import { randomBytes, randomUUID } from "crypto";
import { Router, type IRouter } from "express";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  verbandsTable,
  verbandTokensTable,
  profilesTable,
  catalogSagasTable,
  externalRoutesTable,
} from "@workspace/db";
import { VERBAND_PORTAL_HTML } from "../lib/verbandPortalHtml";

const router: IRouter = Router();

// ─── Token-Auth helper ───────────────────────────────────────────────────────

async function resolveVerbandToken(token: string) {
  const now = new Date();
  const [row] = await db
    .select()
    .from(verbandTokensTable)
    .where(and(eq(verbandTokensTable.token, token), gt(verbandTokensTable.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  const [verband] = await db
    .select()
    .from(verbandsTable)
    .where(eq(verbandsTable.id, row.verbandId))
    .limit(1);
  return verband ?? null;
}

// ─── Portal-HTML ─────────────────────────────────────────────────────────────

router.get("/verband/portal", (_req, res): void => {
  res.setHeader("Cache-Control", "no-store");
  res.type("html").send(VERBAND_PORTAL_HTML);
});

// ─── Eigenes Profil lesen ─────────────────────────────────────────────────────

router.get("/verband/portal/me", async (req, res): Promise<void> => {
  const token = req.query["token"];
  if (typeof token !== "string") { res.status(401).json({ error: "Token fehlt." }); return; }
  const verband = await resolveVerbandToken(token);
  if (!verband) { res.status(401).json({ error: "Ungültiger oder abgelaufener Token." }); return; }
  res.json({
    id:             verband.id,
    name:           verband.name,
    email:          verband.email,
    kontaktName:    verband.kontaktName,
    kontaktTelefon: verband.kontaktTelefon,
    kantone:        verband.kantone,
    isActive:       verband.isActive,
  });
});

// ─── Eigenes Profil aktualisieren ─────────────────────────────────────────────

router.patch("/verband/portal/me", async (req, res): Promise<void> => {
  const token = req.query["token"];
  if (typeof token !== "string") { res.status(401).json({ error: "Token fehlt." }); return; }
  const verband = await resolveVerbandToken(token);
  if (!verband) { res.status(401).json({ error: "Ungültiger oder abgelaufener Token." }); return; }

  const parsed = z.object({
    kontaktName:    z.string().max(200).optional(),
    kontaktTelefon: z.string().max(50).optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db
    .update(verbandsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(verbandsTable.id, verband.id))
    .returning();

  res.json({ ok: true, verband: updated });
});

// ─── Dashboard-Statistiken ────────────────────────────────────────────────────

router.get("/verband/portal/stats", async (req, res): Promise<void> => {
  const token = req.query["token"];
  if (typeof token !== "string") { res.status(401).json({ error: "Token fehlt." }); return; }
  const verband = await resolveVerbandToken(token);
  if (!verband) { res.status(401).json({ error: "Ungültiger oder abgelaufener Token." }); return; }

  // Datumsbereich
  const vonStr = typeof req.query["von"] === "string" ? req.query["von"] : null;
  const bisStr = typeof req.query["bis"] === "string" ? req.query["bis"] : null;
  const von = vonStr ? new Date(vonStr).getTime() : 0;
  const bis = bisStr ? new Date(bisStr).getTime() + 86_400_000 : Date.now();

  // Zuständige Kantone des Verbands
  const alleKantone = verband.kantone === "alle";
  const kantoneList = alleKantone ? [] : verband.kantone.split(",").map((k) => k.trim().toLowerCase());

  // Katalog-Daten laden
  const [allProfiles, allSagas, allRoutes] = await Promise.all([
    db.select({ language: profilesTable.language, hikeHistory: profilesTable.hikeHistory }).from(profilesTable),
    db.select({ id: catalogSagasTable.id, title: catalogSagasTable.title, canton: catalogSagasTable.canton }).from(catalogSagasTable),
    db.select({ id: externalRoutesTable.id, name: externalRoutesTable.name, canton: externalRoutesTable.canton }).from(externalRoutesTable),
  ]);

  const sagaMap = new Map(allSagas.map((s) => [s.id, s]));
  const routeMap = new Map(allRoutes.map((r) => [r.id, r]));

  // Akkumulatoren
  const cantonStats: Record<string, {
    wanderungen: number;
    durationMsSum: number;
    durationMsCount: number;
    sprachen: Record<string, number>;
    sagen: Record<string, { name: string; count: number }>;
    strecken: Record<string, { name: string; count: number }>;
  }> = {};

  function inScope(canton: string | null | undefined): boolean {
    if (!canton) return false;
    if (alleKantone) return true;
    return kantoneList.includes(canton.toLowerCase());
  }

  function getOrCreate(canton: string) {
    if (!cantonStats[canton]) {
      cantonStats[canton] = { wanderungen: 0, durationMsSum: 0, durationMsCount: 0, sprachen: {}, sagen: {}, strecken: {} };
    }
    return cantonStats[canton];
  }

  for (const profile of allProfiles) {
    const hist = Array.isArray(profile.hikeHistory)
      ? (profile.hikeHistory as Array<Record<string, unknown>>)
      : [];

    for (const h of hist) {
      // Datumfilter
      const startedAt = typeof h["startedAt"] === "number" ? h["startedAt"] : 0;
      if (startedAt < von || startedAt > bis) continue;

      // Kanton ermitteln
      let canton: string | null = null;
      const sagaId = typeof h["sagaId"] === "string" ? h["sagaId"] : null;
      const routeId = typeof h["routeId"] === "string" ? h["routeId"] : null;

      if (sagaId) {
        const saga = sagaMap.get(sagaId);
        if (saga?.canton) canton = saga.canton;
      }
      if (!canton && routeId) {
        const route = routeMap.get(routeId);
        if (route?.canton) canton = route.canton;
      }

      if (!inScope(canton)) continue;

      const st = getOrCreate(canton!);
      st.wanderungen++;

      // Dauer
      if (typeof h["durationMs"] === "number" && h["durationMs"] > 0) {
        st.durationMsSum += h["durationMs"] as number;
        st.durationMsCount++;
      }

      // Sprache
      const lang = profile.language ?? "de";
      st.sprachen[lang] = (st.sprachen[lang] ?? 0) + 1;

      // Sage
      if (sagaId) {
        const saga = sagaMap.get(sagaId);
        const sagaName = saga?.title ?? sagaId;
        if (!st.sagen[sagaId]) st.sagen[sagaId] = { name: sagaName, count: 0 };
        st.sagen[sagaId].count++;
      }

      // Strecke
      const routeName = typeof h["routeName"] === "string" ? h["routeName"] : routeId ? (routeMap.get(routeId)?.name ?? routeId) : null;
      const streckenKey = routeId ?? routeName;
      if (streckenKey && routeName) {
        if (!st.strecken[streckenKey]) st.strecken[streckenKey] = { name: routeName, count: 0 };
        st.strecken[streckenKey].count++;
      }
    }
  }

  // Ergebnis aufbereiten
  const result = Object.entries(cantonStats).map(([canton, s]) => ({
    canton,
    wanderungen: s.wanderungen,
    avgDauerMin: s.durationMsCount > 0 ? Math.round(s.durationMsSum / s.durationMsCount / 60_000) : null,
    nachSprache: s.sprachen,
    top3Sagen: Object.values(s.sagen).sort((a, b) => b.count - a.count).slice(0, 3),
    top20Strecken: Object.values(s.strecken).sort((a, b) => b.count - a.count).slice(0, 20),
  })).sort((a, b) => b.wanderungen - a.wanderungen);

  const totalWanderungen = result.reduce((s, c) => s + c.wanderungen, 0);

  res.json({ kantone: result, totalWanderungen, von: vonStr, bis: bisStr });
});

export default router;
