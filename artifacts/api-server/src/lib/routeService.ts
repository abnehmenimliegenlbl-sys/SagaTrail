import type { Logger } from "pino";
import { eq, sql } from "drizzle-orm";
import {
  db,
  externalRoutesTable,
  catalogSagasTable,
  cantonFetchesTable,
  type ExternalRouteRow,
  type CatalogSagaRow,
} from "@workspace/db";
import { isoForCanton } from "./cantonIso";
import { fetchCantonHikingRoutes } from "./overpass";
import { computeAscentM } from "./elevation";
import {
  downsample,
  estimateMinutes,
  haversineM,
  pathDistanceKm,
  type LatLng,
} from "./geo";

/**
 * Orchestriert die dynamischen Routen: laedt reale Wanderrouten je Kanton aus
 * OpenStreetMap, reichert sie mit swisstopo-Hoehenmetern an und cacht sie in
 * Postgres. Einer Route wird die naechstgelegene kuratierte, gemeinfrei belegte
 * Sage zugeordnet — es werden keine Sagen mehr frei erzeugt.
 */

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage
const MIN_KM = 1;
const MAX_KM = 45;
const STORED_GEOMETRY_POINTS = 80;
const ELEVATION_CONCURRENCY = 6;

/** Fuehrt einen async-Mapper mit begrenzter Parallelitaet aus. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

function terrainLabel(ref: string | null, network: string | null, sac: string): string {
  const parts: string[] = [];
  parts.push(ref ? `Wanderland-Route ${ref}` : "Wanderweg");
  if (network === "iwn" || network === "nwn") parts.push("nationales Netz");
  else if (network === "rwn") parts.push("regionales Netz");
  if (sac !== "unbekannt") parts.push(`SAC ${sac}`);
  return parts.join(" · ");
}

function isFresh(fetchedAt: Date): boolean {
  return Date.now() - fetchedAt.getTime() < CACHE_TTL_MS;
}

async function loadCachedRoutes(canton: string): Promise<ExternalRouteRow[]> {
  return db
    .select()
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.canton, canton));
}

/** Laedt (oder cacht) die realen Wanderrouten eines Kantons. */
export async function getCantonRoutes(
  canton: string,
  log: Logger,
): Promise<ExternalRouteRow[]> {
  const iso = isoForCanton(canton);
  if (!iso) {
    log.warn({ canton }, "Kein ISO-Code fuer Kanton bekannt");
    return [];
  }

  const [fetchMark] = await db
    .select()
    .from(cantonFetchesTable)
    .where(eq(cantonFetchesTable.canton, canton));

  if (fetchMark && isFresh(fetchMark.fetchedAt)) {
    const cached = await loadCachedRoutes(canton);
    if (cached.length > 0) return cached;
  }

  // Frisch aus OpenStreetMap laden und mit swisstopo-Hoehen anreichern.
  const raw = await fetchCantonHikingRoutes(iso, log);
  const prepared = raw
    .map((r) => {
      const distanceKm = pathDistanceKm(r.points);
      return { r, distanceKm };
    })
    .filter(({ distanceKm }) => distanceKm >= MIN_KM && distanceKm <= MAX_KM);

  const rows = await mapPool(prepared, ELEVATION_CONCURRENCY, async ({ r, distanceKm }) => {
    const ascent = await computeAscentM(r.points, log);
    const ascentM = ascent ?? 0;
    const sac = r.sac ?? "unbekannt";
    const start = r.points[0];
    const geometry: [number, number][] = downsample(r.points, STORED_GEOMETRY_POINTS).map(
      (p: LatLng) => [p.lat, p.lng],
    );
    const row = {
      id: r.id,
      sagaId: r.id,
      canton,
      name: r.name,
      ref: r.ref,
      distanceKm: Math.round(distanceKm * 10) / 10,
      ascentM,
      minutes: estimateMinutes(distanceKm, ascentM),
      sac,
      terrain: terrainLabel(r.ref, r.network, sac),
      lat: start.lat,
      lng: start.lng,
      geometry,
      source: "OpenStreetMap · swisstopo",
      featured: false,
    };
    return row;
  });

  if (rows.length > 0) {
    await db
      .insert(externalRoutesTable)
      .values(rows)
      .onConflictDoUpdate({
        target: externalRoutesTable.id,
        set: {
          name: sql`excluded.name`,
          distanceKm: sql`excluded.distance_km`,
          ascentM: sql`excluded.ascent_m`,
          minutes: sql`excluded.minutes`,
          sac: sql`excluded.sac`,
          terrain: sql`excluded.terrain`,
          geometry: sql`excluded.geometry`,
          fetchedAt: new Date(),
        },
      });
  }

  await db
    .insert(cantonFetchesTable)
    .values({ canton, routeCount: rows.length })
    .onConflictDoUpdate({
      target: cantonFetchesTable.canton,
      set: { routeCount: rows.length, fetchedAt: new Date() },
    });

  const stored = await loadCachedRoutes(canton);
  return stored.length > 0 ? stored : (rows as ExternalRouteRow[]);
}

/**
 * Findet die naechstgelegene kuratierte Sage zu einer Position. Sagen im
 * gleichen Kanton werden bevorzugt; sonst wird schweizweit die naechste mit
 * bekannten Koordinaten gewaehlt.
 */
async function findNearestCuratedSaga(
  canton: string,
  lat: number,
  lng: number,
): Promise<CatalogSagaRow | null> {
  const sagas = await db.select().from(catalogSagasTable);
  const located = sagas.filter((s) => s.lat != null && s.lng != null);
  if (located.length === 0) return null;
  const sameCanton = located.filter((s) => s.canton === canton);
  const pool = sameCanton.length > 0 ? sameCanton : located;
  let best: CatalogSagaRow | null = null;
  let bestD = Infinity;
  for (const s of pool) {
    const d = haversineM({ lat, lng }, { lat: s.lat as number, lng: s.lng as number });
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/**
 * Liefert die kuratierte Sage zu einer dynamischen (OSM-)Route: die
 * naechstgelegene belegte Regionalsage. Es werden keine Sagen mehr erzeugt.
 */
export async function getRouteSaga(
  routeId: string,
  _log: Logger,
): Promise<CatalogSagaRow | null> {
  const [route] = await db
    .select()
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.id, routeId));
  if (!route) return null;
  return findNearestCuratedSaga(route.canton, route.lat, route.lng);
}
