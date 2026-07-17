import type { Logger } from "pino";
import { eq, sql } from "drizzle-orm";
import {
  db,
  externalRoutesTable,
  catalogSagasTable,
  cantonFetchesTable,
  partnersTable,
  type ExternalRouteRow,
  type CatalogSagaRow,
  type PartnerRow,
} from "@workspace/db";
import { and, gte, lte, isNull, or } from "drizzle-orm";
import { isoForCanton, CANTON_ISO } from "./cantonIso";
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
import { getCachedRoutePhoto } from "./commonsPhoto";
import { logger as rootLogger } from "./logger";
import { deriveSeason } from "./season";
import {
  downsample,
  estimateMinutes,
  haversineM,
  pathDistanceKm,
  type LatLng,
} from "./geo";
import {
  fetchCommonsImageByName,
  fetchNearbyCommonsImage,
  fetchWikipediaSummary,
  fetchWikidataImage,
  resolveOsmWikipediaTag,
  resolveWikidataTitle,
  searchAiPoiKnowledge,
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
const GEOMETRY_POOL_DEFAULT = 150;
const GEOMETRY_POOL_FILTERED = 220;

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

/** Normalisiert einen POI-Namen fuer den Duplikat-Vergleich. */
function normalizePoiName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Entfernt gleichnamige Duplikate aus der POI-Liste (z. B. mehrere
 * "Basiliskenbrunnen" in Basel). Pro normalisiertem Name bleibt genau ein
 * Eintrag — bevorzugt derjenige mit dem reichhaltigsten Inhalt:
 *   extract vorhanden (2) > nur Bild (1) > kein Wikipedia (0).
 * Reihenfolge der Originalliste bleibt sonst erhalten.
 */
function deduplicatePois(pois: EnrichedPoi[]): EnrichedPoi[] {
  const richness = (p: EnrichedPoi) =>
    p.wiki?.extract ? 2 : p.wiki?.image ? 1 : 0;
  const best = new Map<string, EnrichedPoi>();
  for (const poi of pois) {
    const key = normalizePoiName(poi.name);
    const existing = best.get(key);
    if (!existing || richness(poi) > richness(existing)) {
      best.set(key, poi);
    }
  }
  // Originalreihenfolge beibehalten (Map preserviert insertion order,
  // aber wir wollen die erste Occurrence — nicht die letzte beibehaltene).
  return pois.filter((poi) => best.get(normalizePoiName(poi.name)) === poi);
}

/**
 * Liefert aktive Partnerbetriebe innerhalb einer Bounding Box. Direkt aus
 * Postgres (kein externer Fetch/Cache noetig, da Datenmenge klein und selten
 * geaendert). "Aktiv" heisst: isActive = true UND (kein Zeitraum gesetzt ODER
 * aktuelles Datum liegt darin).
 */
export async function getPartners(
  bbox: { south: number; west: number; north: number; east: number },
  _log: Logger,
): Promise<PartnerRow[]> {
  const now = new Date();
  return db
    .select()
    .from(partnersTable)
    .where(
      and(
        eq(partnersTable.isActive, true),
        gte(partnersTable.lat, bbox.south),
        lte(partnersTable.lat, bbox.north),
        gte(partnersTable.lng, bbox.west),
        lte(partnersTable.lng, bbox.east),
        or(isNull(partnersTable.aktivVon), lte(partnersTable.aktivVon, now)),
        or(isNull(partnersTable.aktivBis), gte(partnersTable.aktivBis, now)),
      ),
    );
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
// Sehr kurze TTL fuer Overpass-Fehler (Timeout, Netzausfall): damit wird nach
// 30 s erneut versucht statt 24 h lang leere POI-Listen auszuliefern.
// (Ein leeres entries-Array landet sonst als keineAnreicherung=false im
// poiCache und bekommt faelschlich den 24-h-TTL.)
const POI_ERROR_TTL_MS = 30 * 1000; // 30 Sekunden
const POI_WIKI_CONCURRENCY = 4;
// Die unscharfe Wikipedia-Geo-Suche (Stufe 3, fuer POIs OHNE OSM-Verweis) ist
// die teuerste Anreicherungsstufe. In dichten Staedten (z. B. Basel) liefert
// Overpass leicht 100+ POIs — ohne Budget dauert die Antwort dann 20 s+ und
// laeuft mobil in Timeouts. POIs MIT OSM-Verweis werden immer aufgeloest.
const POI_GEO_SEARCH_BUDGET = 30;
const poiCache = new Map<string, { at: number; entries: EnrichedPoi[] }>();
// Separater Fehler-Cache: nur Timestamp, kein entries-Array. Wird von
// poiCache bewusst getrennt gehalten, damit ein erfolgreicher Folgeaufruf
// das poiCache-Ergebnis nicht mit einem leeren Array ueberschreiben kann.
const poiErrorCache = new Map<string, number>();
// Verhindert parallele Hintergrund-Refreshes fuer dieselbe BBox.
const poiRefreshInFlight = new Set<string>();

/**
 * Loest die Wikipedia-Referenz eines POI auf: zuerst der OSM-`wikipedia`-Tag
 * (enthaelt bereits Sprache + Titel), sonst der `wikidata`-Tag (Q-ID -> Titel
 * der Zielsprache), sonst kein Treffer.
 */
/**
 * Laedt das Wikidata-P18-Bild (falls vorhanden) und fuegt es in ein bereits
 * gefundenes WikiSummary ein. Vermeidet einen zweiten Netzwerkaufruf, wenn
 * das Bild schon aus der Wikipedia-REST-API kommt.
 */
async function withP18Image(wiki: WikiSummary, qid: string | null): Promise<WikiSummary> {
  if (wiki.image || !qid) return wiki;
  const image = await fetchWikidataImage(qid);
  return image ? { ...wiki, image } : wiki;
}

async function enrichPoiWithWikipedia(
  poi: RawPoi,
  log: Logger,
  geoSearchBudget: { rest: number },
): Promise<EnrichedPoi> {
  try {
    if (poi.wikipediaTag) {
      const wiki = await resolveOsmWikipediaTag(poi.wikipediaTag, "de", poi.lat, poi.lng);
      if (wiki) return { ...poi, wiki: await withP18Image(wiki, poi.wikidataTag) };
    }
    if (poi.wikidataTag) {
      // Titel und P18-Bild parallel auflosen — beides kommt aus Wikidata, aber
      // resolveWikidataTitle laedt nur Sitelinks, fetchWikidataImage nur Claims.
      // Statt zwei serieller Requests: Titel zuerst (brauchen wir fuer Summary),
      // dann Summary + P18 parallel.
      const title = await resolveWikidataTitle(poi.wikidataTag);
      if (title) {
        const [wiki, p18Image] = await Promise.all([
          fetchWikipediaSummary(title, "de", poi.lat, poi.lng),
          fetchWikidataImage(poi.wikidataTag),
        ]);
        if (wiki) {
          // Bild-Hierarchie: Wikipedia-Thumbnail > P18 > Commons-Name > Commons-Geo
          const image =
            wiki.image ??
            p18Image ??
            (await fetchCommonsImageByName(poi.name)) ??
            (await fetchNearbyCommonsImage(poi.lat, poi.lng));
          return { ...poi, wiki: { ...wiki, image } };
        }
        // Kein Wikipedia-Artikel: P18 > Commons-Name > Commons-Geo
        const image =
          p18Image ??
          (await fetchCommonsImageByName(poi.name)) ??
          (await fetchNearbyCommonsImage(poi.lat, poi.lng));
        if (image) {
          return { ...poi, wiki: { title: poi.name, extract: "", url: "", lang: "de", image } };
        }
      } else {
        // Kein Wikipedia-Eintrag: P18 + Commons-Name + Commons-Geo parallel
        const [p18Image, nameImage, geoImage] = await Promise.all([
          fetchWikidataImage(poi.wikidataTag),
          fetchCommonsImageByName(poi.name),
          fetchNearbyCommonsImage(poi.lat, poi.lng),
        ]);
        const image = p18Image ?? nameImage ?? geoImage;
        if (image) {
          return { ...poi, wiki: { title: poi.name, extract: "", url: "", lang: "de", image } };
        }
      }
    }
    // Dritte Stufe: kein OSM-Verweis vorhanden oder aufloesbar — Wikipedia-
    // Geo-Suche im Umkreis mit unscharfem Namensabgleich. Budget-gedeckelt.
    if (geoSearchBudget.rest > 0) {
      geoSearchBudget.rest--;
      const wiki = await searchNearbyWikipedia(poi.name, poi.lat, poi.lng);
      if (wiki) {
        // Falls Wikipedia-Artikel kein Bild hat: Commons-Name > Commons-Geo
        const image =
          wiki.image ??
          (await fetchCommonsImageByName(poi.name)) ??
          (await fetchNearbyCommonsImage(poi.lat, poi.lng));
        return { ...poi, wiki: { ...wiki, image } };
      }
    }
    // Vierte Stufe: Commons-Namenssuche + Commons-Geosearch parallel —
    // findet Fotos fuer Orte ganz ohne Wikipedia-Artikel (Brunnen, Kapellen…)
    const [nameImage, geoImage] = await Promise.all([
      fetchCommonsImageByName(poi.name),
      fetchNearbyCommonsImage(poi.lat, poi.lng),
    ]);
    const commonsImage = nameImage ?? geoImage;
    if (commonsImage) {
      return { ...poi, wiki: { title: poi.name, extract: "", url: "", lang: "de", image: commonsImage } };
    }
    // Fuenfte Stufe: Claude-Wissenssuche — greift nur, wenn alle vorherigen
    // Pfade erfolglos waren.
    const aiWiki = await searchAiPoiKnowledge(poi.name, poi.kind, "de", poi.lat, poi.lng);
    if (aiWiki) return { ...poi, wiki: aiWiki };
  } catch (err) {
    log.warn({ poi: poi.id, err }, "POI-Wikipedia-Anreicherung fehlgeschlagen");
  }
  return { ...poi, wiki: null };
}

/**
 * Interne Hilfsfunktion: holt frische POI-Daten von Overpass und schreibt sie
 * in den Cache. Laeuft ggf. im Hintergrund (fire-and-forget), ohne den
 * Aufrufer zu blockieren. Verhindert Parallellaeufe fuer dieselbe BBox via
 * poiRefreshInFlight.
 */
async function refreshPoisBackground(
  bbox: { south: number; west: number; north: number; east: number },
  key: string,
  log: Logger,
): Promise<void> {
  if (poiRefreshInFlight.has(key)) return;
  poiRefreshInFlight.add(key);
  try {
    // Fehler-Cache erneut pruefen — in der Zeit zwischen "stale" und
    // Hintergrund-Start koennte ein anderer Request bereits fehlgeschlagen sein.
    const errAt = poiErrorCache.get(key);
    if (errAt !== undefined && Date.now() - errAt < POI_ERROR_TTL_MS) return;
    let raw: RawPoi[];
    try {
      raw = await fetchHistoricPois(bbox, log);
    } catch (err) {
      log.warn({ err, bbox }, "POI-Overpass fehlgeschlagen (Hintergrund-Refresh)");
      poiErrorCache.set(key, Date.now());
      return;
    }
    poiErrorCache.delete(key);
    const geoSearchBudget = { rest: POI_GEO_SEARCH_BUDGET };
    const enriched = await mapPool(raw, POI_WIKI_CONCURRENCY, (poi) =>
      enrichPoiWithWikipedia(poi, log, geoSearchBudget),
    );
    const entries = deduplicatePois(enriched);
    poiCache.set(key, { at: Date.now(), entries });
    log.info(
      { bbox, total: enriched.length, deduplicated: entries.length },
      "POI-Cache im Hintergrund aktualisiert",
    );
  } finally {
    poiRefreshInFlight.delete(key);
  }
}

/**
 * Liefert historische/touristische Orte in einer Bounding Box, live mit
 * Wikipedia-Zusammenfassungen angereichert (gecacht).
 *
 * Stale-while-revalidate: Gibt abgelaufene Cache-Eintraege sofort zurueck und
 * aktualisiert den Cache im Hintergrund — so warten Nutzer nie auf Overpass.
 */
export async function getPois(
  bbox: { south: number; west: number; north: number; east: number },
  log: Logger,
): Promise<EnrichedPoi[]> {
  const key = bboxCacheKey(bbox);
  // Fehler-Cache pruefen: kurze TTL (30 s) verhindert, dass ein einzelner
  // Overpass-Timeout den ganzen Tag lang leere POI-Listen liefert.
  const errAt = poiErrorCache.get(key);
  if (errAt !== undefined && Date.now() - errAt < POI_ERROR_TTL_MS) return [];
  const hit = poiCache.get(key);
  if (hit) {
    const keineAnreicherung =
      hit.entries.length > 0 && hit.entries.every((e) => e.wiki === null);
    const ttl = keineAnreicherung ? POI_NEGATIVE_TTL_MS : POI_TTL_MS;
    if (Date.now() - hit.at < ttl) return hit.entries;
    // Stale-while-revalidate: veraltete Daten sofort zurueckgeben, Cache im
    // Hintergrund auffrischen. Nutzer sehen nie eine leere Karte wegen eines
    // langsamen Overpass-Calls.
    void refreshPoisBackground(bbox, key, log);
    return hit.entries;
  }
  // Kein Cache-Eintrag vorhanden: blockierender Erstaufruf.
  let raw: RawPoi[];
  try {
    raw = await fetchHistoricPois(bbox, log);
  } catch (err) {
    // Overpass ausgefallen oder Timeout: fuer 30 s im Fehler-Cache merken,
    // damit Folgeanfragen schnell mit [] antworten statt erneut 42 s zu haengen.
    // Wir schreiben NICHT ins poiCache, damit ein leeres Array nicht den
    // 24-h-TTL bekommt. Nach 30 s wird Overpass automatisch erneut probiert.
    log.warn({ err, bbox }, "POI-Overpass fehlgeschlagen, cache leeres Ergebnis");
    poiErrorCache.set(key, Date.now());
    return [];
  }
  // Erfolgreicher Abruf: Fehler-Cache-Eintrag loeschen falls noch vorhanden.
  poiErrorCache.delete(key);
  const geoSearchBudget = { rest: POI_GEO_SEARCH_BUDGET };
  const enriched = await mapPool(raw, POI_WIKI_CONCURRENCY, (poi) =>
    enrichPoiWithWikipedia(poi, log, geoSearchBudget),
  );
  const entries = deduplicatePois(enriched);
  log.info(
    { bbox, total: enriched.length, deduplicated: entries.length },
    "POI-Deduplication abgeschlossen",
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
    // Repräsentatives Foto vom Startpunkt der Route (Wikimedia Commons, gedrosselt).
    const photo = await getCachedRoutePhoto(start.lat, start.lng, log);
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
      photoUrl: photo.photoUrl,
      photoAttribution: photo.attribution,
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
          // Foto nur ueberschreiben wenn ein neues da ist — kein COALESCE um
          // veraltete URLs durch aktuellere zu ersetzen, aber NULL nie setzen.
          photoUrl: sql`COALESCE(excluded.photo_url, ${externalRoutesTable.photoUrl})`,
          photoAttribution: sql`COALESCE(excluded.photo_attribution, ${externalRoutesTable.photoAttribution})`,
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

const WARM_STAGGER_MS = 4000;

/**
 * Waermt den Routen-Cache aller Kantone im Hintergrund vor (nach Serverstart).
 *
 * Die erste Routensuche eines Nutzers in einem noch nicht gecachten Kanton
 * dauert ueber Overpass typischerweise 15-25s (Index + Geometrie), was am
 * Client wie "Server nicht erreichbar" wirkt, wenn eine zwischengeschaltete
 * Verbindung frueher abbricht. Indem wir alle Kantone der Reihe nach (nicht
 * parallel, um Overpass nicht zu ueberlasten) direkt nach dem Start
 * durchlaufen, landen die Ergebnisse im DB-Cache, bevor echte Nutzer suchen -
 * spaetere Anfragen sind dann Cache-Treffer (Millisekunden statt Sekunden).
 * Laeuft komplett im Hintergrund; Fehler pro Kanton werden nur geloggt, damit
 * ein einzelner haengender Kanton den Start nicht blockiert oder die anderen
 * verhindert.
 */
export async function warmAllCantonCaches(log: Logger): Promise<void> {
  const cantons = Object.keys(CANTON_ISO);
  for (const canton of cantons) {
    try {
      const routes = await getCantonRoutes(canton, log);
      log.info({ canton, count: routes.length }, "Kanton-Cache vorgewaermt");
    } catch (err) {
      log.warn({ canton, err }, "Kanton-Cache-Vorwaermung fehlgeschlagen");
    }
    await new Promise((resolve) => setTimeout(resolve, WARM_STAGGER_MS));
  }
}

function millisUntilNext2amUtc(): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0, 0),
  );
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

/**
 * Taeglich-Kanton-Sync: jeden Tag um 02:00 UTC wird ein Kanton reihum
 * (stabiler Index = Tag-der-Epoche mod 26) frisch aus Waymarked Trails +
 * Overpass geladen und inkl. Fotos in external_routes geschrieben.
 * Nach 26 Tagen ist jeder Kanton einmal aktualisiert worden.
 * Laeuft komplett im Hintergrund; Fehler werden nur geloggt.
 */
export function startDailyCantonSync(): void {
  const cantons = Object.keys(CANTON_ISO);
  const log = rootLogger.child({ cron: "dailyCantonSync" });

  const runSync = async () => {
    const dayIndex = Math.floor(Date.now() / 86_400_000) % cantons.length;
    const canton = cantons[dayIndex]!;
    log.info({ canton, dayIndex }, "Taeglich-Kanton-Sync gestartet");
    try {
      // getCantonRoutes vergleicht bereits gecachte mit neuen Kandidaten und
      // enrichAndStore holt nur fehlende oder abgelaufene Eintraege nach.
      const routes = await getCantonRoutes(canton, log);
      log.info({ canton, count: routes.length }, "Taeglich-Kanton-Sync abgeschlossen");
    } catch (err) {
      log.warn({ canton, err }, "Taeglich-Kanton-Sync fehlgeschlagen");
    }
  };

  const scheduleNext = () => {
    const delay = millisUntilNext2amUtc();
    log.info({ inMinutes: Math.round(delay / 60_000) }, "Naechster Kanton-Sync geplant");
    setTimeout(() => {
      void runSync();
      setInterval(() => void runSync(), 24 * 60 * 60 * 1000);
    }, delay);
  };

  scheduleNext();
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
    bildmotiv: null,
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
