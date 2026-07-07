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
import {
  fetchCantonRouteIndex,
  fetchRouteGeometries,
  fetchAerialways,
  fetchHistoricPois,
  type RouteIndexEntry,
  type RawAerialway,
  type RawPoi,
} from "./overpass";
import { computeElevationStats } from "./elevation";
import { deriveSacFromSwissTlm3d, sacScaleToT } from "./swisstopoHiking";
import { deriveSeason } from "./season";
import {
  downsample,
  estimateMinutes,
  haversineM,
  pathDistanceKm,
  type LatLng,
} from "./geo";
import {
  fetchWikipediaSummary,
  resolveOsmWikipediaTag,
  resolveWikidataTitle,
  searchCantonLegend,
  searchNearbyWikipedia,
  type WikiSummary,
} from "./wikipedia";

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
const ELEVATION_CONCURRENCY = 8;

// Wie viele Kandidaten (nach Bounding-Box-Vorfilter + Rang) pro Suche die teure
// Geometrie-/Hoehen-Anreicherung durchlaufen. Bei aktiver Distanz-Obergrenze
// etwas grosszuegiger, weil manche Kandidaten die exakte Laengenpruefung noch
// verfehlen (Bounding-Box-Diagonale ist nur eine untere Schranke).
const GEOMETRY_POOL_DEFAULT = 40;
const GEOMETRY_POOL_FILTERED = 60;

// Sicherheitszuschlag auf die Bounding-Box-Diagonale beim Vorfilter, damit die
// haversine-Naeherung keine knapp passenden Kurzrouten faelschlich verwirft.
const BBOX_SLACK = 1.1;

/**
 * In-Memory-Index je Kanton (Tags + Bounding Box aller benannten Routen).
 * Er wird pro Suche wiederverwendet, damit nur die erste Suche eines Kantons
 * den (kleinen, aber langsamen) Overpass-Indexlauf bezahlt.
 */
const INDEX_TTL_MS = 6 * 60 * 60 * 1000; // 6 Stunden
const indexCache = new Map<string, { at: number; entries: RouteIndexEntry[] }>();

async function getCantonIndex(
  canton: string,
  iso: string,
  log: Logger,
): Promise<RouteIndexEntry[]> {
  const hit = indexCache.get(canton);
  if (hit && Date.now() - hit.at < INDEX_TTL_MS) return hit.entries;
  const entries = await fetchCantonRouteIndex(iso, log);
  indexCache.set(canton, { at: Date.now(), entries });
  return entries;
}

/**
 * In-Memory-Cache der Seilbahn-Abfragen je (grob gerasterte) Bounding Box.
 * Seilbahnen aendern sich praktisch nie, daher eine grosszuegige TTL. Der
 * Raster (2 Nachkommastellen, ~1 km) buendelt nahe beieinanderliegende
 * Kartenausschnitte auf denselben Cache-Eintrag.
 */
const AERIALWAY_TTL_MS = 24 * 60 * 60 * 1000; // 24 Stunden
const aerialwayCache = new Map<string, { at: number; entries: RawAerialway[] }>();

function bboxCacheKey(bbox: { south: number; west: number; north: number; east: number }): string {
  const r = (n: number) => Math.round(n * 100) / 100;
  return `${r(bbox.south)},${r(bbox.west)},${r(bbox.north)},${r(bbox.east)}`;
}

/**
 * Liefert Seilbahnen/Standseilbahnen innerhalb einer Bounding Box (gecacht).
 */
export async function getAerialways(
  bbox: { south: number; west: number; north: number; east: number },
  log: Logger,
): Promise<RawAerialway[]> {
  const key = bboxCacheKey(bbox);
  const hit = aerialwayCache.get(key);
  if (hit && Date.now() - hit.at < AERIALWAY_TTL_MS) return hit.entries;
  const entries = await fetchAerialways(bbox, log);
  aerialwayCache.set(key, { at: Date.now(), entries });
  return entries;
}

/** Angereicherter POI (fuer die API-Antwort). */
export interface EnrichedPoi extends RawPoi {
  wiki: WikiSummary | null;
}

/**
 * In-Memory-Cache der POI-Abfragen je (grob gerasterte) Bounding Box.
 * Historische Orte aendern sich praktisch nie, Wikipedia-Inhalte gelegentlich —
 * eine grosszuegige TTL haelt die Live-Anreicherung dennoch aktuell genug.
 */
const POI_TTL_MS = 24 * 60 * 60 * 1000; // 24 Stunden
// Kurze TTL, wenn KEIN einziger POI angereichert werden konnte: das deutet auf
// eine voruebergehende Wikipedia-Drosselung hin und darf nicht 24 h als
// "keine Infos vorhanden" im Cache haengen bleiben.
const POI_NEGATIVE_TTL_MS = 10 * 60 * 1000; // 10 Minuten
const POI_WIKI_CONCURRENCY = 4;
// Die unscharfe Wikipedia-Geo-Suche (Stufe 3, fuer POIs OHNE OSM-Verweis) ist
// die teuerste Anreicherungsstufe. In dichten Staedten (z. B. Basel) liefert
// Overpass leicht 100+ POIs — ohne Budget dauert die Antwort dann 20 s+ und
// laeuft mobil in Timeouts. POIs MIT OSM-Verweis werden immer aufgeloest.
const POI_GEO_SEARCH_BUDGET = 30;
const poiCache = new Map<string, { at: number; entries: EnrichedPoi[] }>();

/**
 * Loest die Wikipedia-Referenz eines POI auf: zuerst der OSM-`wikipedia`-Tag
 * (enthaelt bereits Sprache + Titel), sonst der `wikidata`-Tag (Q-ID -> Titel
 * der Zielsprache), sonst kein Treffer.
 */
async function enrichPoiWithWikipedia(
  poi: RawPoi,
  log: Logger,
  geoSearchBudget: { rest: number },
): Promise<EnrichedPoi> {
  try {
    if (poi.wikipediaTag) {
      const wiki = await resolveOsmWikipediaTag(poi.wikipediaTag);
      if (wiki) return { ...poi, wiki };
    }
    if (poi.wikidataTag) {
      const title = await resolveWikidataTitle(poi.wikidataTag);
      if (title) {
        const wiki = await fetchWikipediaSummary(title);
        if (wiki) return { ...poi, wiki };
      }
    }
    // Dritte Stufe: kein OSM-Verweis vorhanden oder aufloesbar — Wikipedia-
    // Geo-Suche im Umkreis mit unscharfem Namensabgleich (z.B. findet
    // "Basiliskbrunnen" so den Artikel "Basiliskenbrunnen"). Bewusst mit
    // Budget gedeckelt, damit dichte Stadtgebiete nicht in Timeouts laufen.
    if (geoSearchBudget.rest > 0) {
      geoSearchBudget.rest--;
      const wiki = await searchNearbyWikipedia(poi.name, poi.lat, poi.lng);
      if (wiki) return { ...poi, wiki };
    }
  } catch (err) {
    log.warn({ poi: poi.id, err }, "POI-Wikipedia-Anreicherung fehlgeschlagen");
  }
  return { ...poi, wiki: null };
}

/**
 * Liefert historische/touristische Orte in einer Bounding Box, live mit
 * Wikipedia-Zusammenfassungen angereichert (gecacht).
 */
export async function getPois(
  bbox: { south: number; west: number; north: number; east: number },
  log: Logger,
): Promise<EnrichedPoi[]> {
  const key = bboxCacheKey(bbox);
  const hit = poiCache.get(key);
  if (hit) {
    const keineAnreicherung =
      hit.entries.length > 0 && hit.entries.every((e) => e.wiki === null);
    const ttl = keineAnreicherung ? POI_NEGATIVE_TTL_MS : POI_TTL_MS;
    if (Date.now() - hit.at < ttl) return hit.entries;
  }
  const raw = await fetchHistoricPois(bbox, log);
  const geoSearchBudget = { rest: POI_GEO_SEARCH_BUDGET };
  const entries = await mapPool(raw, POI_WIKI_CONCURRENCY, (poi) =>
    enrichPoiWithWikipedia(poi, log, geoSearchBudget),
  );
  poiCache.set(key, { at: Date.now(), entries });
  return entries;
}

/**
 * Waehlt die anzureichernden Kandidaten aus dem Kanton-Index: bei aktiver
 * Distanz-Obergrenze werden zunaechst alle sicher zu langen Routen verworfen
 * (Bounding-Box-Diagonale > distMax), erst danach nach Netz-Rang priorisiert und
 * gedeckelt. So gelangen auch kurze lokale Routen in die Auswahl, statt nur die
 * ranghoechsten Fernwege.
 */
function selectCandidates(
  index: RouteIndexEntry[],
  distMax: number | undefined,
): RouteIndexEntry[] {
  const filtered =
    distMax != null
      ? index.filter((e) => e.bboxDiagKm <= distMax * BBOX_SLACK)
      : index;
  const pool = distMax != null ? GEOMETRY_POOL_FILTERED : GEOMETRY_POOL_DEFAULT;
  return filtered
    .slice()
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      const refA = a.ref ? 0 : 1;
      const refB = b.ref ? 0 : 1;
      if (refA !== refB) return refA - refB;
      return a.name.localeCompare(b.name, "de");
    })
    .slice(0, pool);
}

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

// Version des Geometrie-Verkettungs-Algorithmus (siehe overpass.ts
// stitchGeometry). Aeltere Cache-Eintraege wurden mit der fehlerhaften
// Zickzack-Verkettung erzeugt und gelten als abgelaufen.
const GEOMETRY_VERSION = 2;

function isFresh(row: ExternalRouteRow): boolean {
  return (
    row.geometryVersion >= GEOMETRY_VERSION &&
    Date.now() - row.fetchedAt.getTime() < CACHE_TTL_MS
  );
}

async function loadCachedRoutes(canton: string): Promise<ExternalRouteRow[]> {
  return db
    .select()
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.canton, canton));
}

/**
 * Laedt die Geometrie der ausgewaehlten Kandidaten nach, berechnet die exakte
 * Laenge, reichert mit swisstopo-Hoehen + SAC-Grad an und schreibt die Treffer
 * in den Cache. Kandidaten ausserhalb des plausiblen Laengenfensters
 * (MIN_KM..MAX_KM) entfallen.
 */
async function enrichAndStore(
  canton: string,
  osmIds: number[],
  log: Logger,
): Promise<void> {
  const raw = await fetchRouteGeometries(osmIds, log);
  const prepared = raw
    .map((r) => ({ r, distanceKm: pathDistanceKm(r.points) }))
    .filter(({ distanceKm }) => distanceKm >= MIN_KM && distanceKm <= MAX_KM);

  const rows = await mapPool(prepared, ELEVATION_CONCURRENCY, async ({ r, distanceKm }) => {
    const elevation = await computeElevationStats(r.points, log);
    const ascentM = elevation?.ascentM ?? 0;
    const maxElevationM = elevation?.maxElevationM ?? 0;
    // Schwierigkeit: OSM-`sac_scale` normalisieren; fehlt sie, aus dem amtlichen
    // swissTLM3D-Wanderwegnetz ableiten; sonst bleibt sie unbekannt.
    const sac =
      sacScaleToT(r.sac) ?? (await deriveSacFromSwissTlm3d(r.points, log)) ?? "unbekannt";
    const start = r.points[0];
    const geometry: [number, number][] = downsample(r.points, STORED_GEOMETRY_POINTS).map(
      (p: LatLng) => [p.lat, p.lng],
    );
    return {
      id: r.id,
      sagaId: r.id,
      canton,
      name: r.name,
      ref: r.ref,
      distanceKm: Math.round(distanceKm * 10) / 10,
      ascentM,
      maxElevationM,
      minutes: estimateMinutes(distanceKm, ascentM),
      sac,
      terrain: terrainLabel(r.ref, r.network, sac),
      lat: start.lat,
      lng: start.lng,
      geometry,
      geometryVersion: GEOMETRY_VERSION,
      source: "OpenStreetMap · swisstopo",
      featured: false,
    };
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
          maxElevationM: sql`excluded.max_elevation_m`,
          minutes: sql`excluded.minutes`,
          sac: sql`excluded.sac`,
          terrain: sql`excluded.terrain`,
          geometry: sql`excluded.geometry`,
          geometryVersion: sql`excluded.geometry_version`,
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
}

/**
 * Liefert die realen Wanderrouten eines Kantons, distanzbewusst.
 *
 * Ablauf: leichten Kanton-Index holen (gecacht), daraus per Bounding-Box-
 * Vorfilter + Rang die Kandidaten waehlen, fuer noch nicht (frisch) gecachte
 * Kandidaten die Geometrie nachladen und anreichern, dann die frischen Treffer
 * des Kantons zurueckgeben. Der exakte Filter und der Ergebnis-Deckel folgen im
 * Router (`cantons.ts`). `distMax` steuert den Vorfilter, damit in dichten
 * Kantonen auch kurze lokale Routen in die Auswahl gelangen.
 */
export async function getCantonRoutes(
  canton: string,
  log: Logger,
  distMax?: number,
): Promise<ExternalRouteRow[]> {
  const iso = isoForCanton(canton);
  if (!iso) {
    log.warn({ canton }, "Kein ISO-Code fuer Kanton bekannt");
    return [];
  }

  let index: RouteIndexEntry[];
  try {
    index = await getCantonIndex(canton, iso, log);
  } catch (err) {
    // Index nicht ladbar: auf bereits FRISCH gecachte Routen ausweichen, sonst
    // Fehler durchreichen (der Router meldet dann 502 -> UI "Server nicht
    // erreichbar"). Nur veraltete Cache-Zeilen zaehlen nicht als Treffer, sonst
    // wuerde ein Serverausfall faelschlich als "keine Routen" erscheinen.
    const cached = await loadCachedRoutes(canton);
    const fresh = cached.filter((row) => isFresh(row));
    if (fresh.length > 0) {
      log.warn({ canton, err }, "Kanton-Index nicht ladbar, nutze Cache");
      return fresh;
    }
    throw err;
  }

  const candidates = selectCandidates(index, distMax);
  const cached = await loadCachedRoutes(canton);
  const freshIds = new Set(
    cached.filter((row) => isFresh(row)).map((row) => row.id),
  );
  const missing = candidates
    .filter((c) => !freshIds.has(`osm-${c.osmId}`))
    .map((c) => c.osmId);

  if (missing.length > 0) {
    try {
      await enrichAndStore(canton, missing, log);
    } catch (err) {
      // Anreicherung fehlgeschlagen: vorhandene frische Treffer trotzdem liefern.
      if (freshIds.size > 0) {
        log.warn({ canton, err }, "Geometrie-Anreicherung fehlgeschlagen, nutze Cache");
        return cached.filter((row) => isFresh(row));
      }
      throw err;
    }
  }

  const stored = await loadCachedRoutes(canton);
  return stored.filter((row) => isFresh(row));
}

function nearestOf(
  pool: CatalogSagaRow[],
  lat: number,
  lng: number,
): CatalogSagaRow | null {
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
 * Baut aus einer live geladenen Wikipedia-Zusammenfassung eine
 * katalogkompatible Sage (nicht persistiert). Dient als Zwischenstufe der
 * Zuordnung, wenn im Kanton der Route keine kuratierte Sage liegt.
 */
function sagaFromWikiSummary(
  canton: string,
  wiki: WikiSummary,
  lat: number,
  lng: number,
): CatalogSagaRow {
  return {
    id: `wiki-${canton.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    title: wiki.title,
    canton,
    coreMotif: "Regionale Ueberlieferung",
    mood: "unbekannt",
    summary: wiki.extract,
    summaries: { de: { text: wiki.extract, reviewEmpfohlen: false } },
    altersstufenHinweis: null,
    quelle: {
      autor: "Wikipedia-Autoren",
      werk: wiki.title,
      jahr: String(new Date().getFullYear()),
      fundstelleUrl: wiki.url,
    },
    source: "Wikipedia (CC BY-SA)",
    lat,
    lng,
    koordinatenSicherheit: "ungefaehr",
    isAnchorPlace: false,
  } as CatalogSagaRow;
}

/**
 * Findet die Sage zu einer Position in drei Stufen (bestaetigte Reihenfolge):
 * (1) kuratierte Sage im gleichen Kanton, (2) live von Wikipedia geladene
 * Kantonssage, falls im Kanton keine kuratierte Sage liegt, (3) kantons-
 * uebergreifend die naechstgelegene kuratierte Sage als letzter Rueckfall.
 */
async function findNearestCuratedSaga(
  canton: string,
  lat: number,
  lng: number,
  log: Logger,
): Promise<CatalogSagaRow | null> {
  const sagas = await db.select().from(catalogSagasTable);
  const located = sagas.filter((s) => s.lat != null && s.lng != null);
  if (located.length === 0) return null;

  const sameCanton = located.filter((s) => s.canton === canton);
  if (sameCanton.length > 0) return nearestOf(sameCanton, lat, lng);

  const wiki = await searchCantonLegend(canton, log);
  if (wiki) return sagaFromWikiSummary(canton, wiki, lat, lng);

  return nearestOf(located, lat, lng);
}

/**
 * Liefert die kuratierte Sage zu einer dynamischen (OSM-)Route: die
 * naechstgelegene belegte Regionalsage. Es werden keine Sagen mehr erzeugt.
 */
export async function getRouteSaga(
  routeId: string,
  log: Logger,
): Promise<CatalogSagaRow | null> {
  const [route] = await db
    .select()
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.id, routeId));
  if (!route) return null;
  return findNearestCuratedSaga(route.canton, route.lat, route.lng, log);
}
