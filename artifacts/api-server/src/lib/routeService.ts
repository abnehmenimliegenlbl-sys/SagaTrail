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

// ---------------------------------------------------------------------------
// POI-Such-Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Reiner Zahlen-/Code-Name ("42", "K17", "GB 42") — keine sinnvolle
 *  Namens-Suche auf Commons oder Wikipedia moeglich. */
function isCodeName(name: string): boolean {
  return name.replace(/[\d\s.\-\/\\,#]+/g, "").length <= 2;
}

const KIND_SEARCH_LABEL: Record<string, string> = {
  "historic=boundary_stone":      "Grenzstein",
  "historic=ruins":               "Ruine",
  "historic=castle":              "Burg Schloss",
  "historic=manor":               "Herrenhaus",
  "historic=monument":            "Denkmal",
  "historic=memorial":            "Gedenkstätte",
  "historic=wayside_cross":       "Wegkreuz",
  "historic=wayside_shrine":      "Wegkapelle",
  "historic=church":              "Kirche",
  "historic=city_gate":           "Stadttor",
  "historic=fort":                "Festung",
  "historic=archaeological_site": "archäologische Stätte",
  "historic=milestone":           "Meilenstein",
  "historic=tomb":                "Grabmal",
  "tourism=artwork":              "Kunstwerk",
  "tourism=viewpoint":            "Aussichtspunkt",
};

/** Commons-Suchbegriff fuer einen POI. Reine Codes/Zahlen werden durch
 *  den Typ ersetzt, damit Commons etwas Sinnvolles zurueckgibt. */
function commonsSearchTerm(name: string, kind: string | undefined): string | null {
  if (!isCodeName(name)) return name;
  return kind ? (KIND_SEARCH_LABEL[kind] ?? null) : null;
}
import { logger as rootLogger } from "./logger";
import { deriveSeason } from "./season";
import {
  downsample,
  rdpSimplify,
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
  fetchWikidataCommonsCategory,
  fetchWikipediaArticleImageByPoiName,
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
const STORED_GEOMETRY_POINTS = 500; // Douglas-Peucker, war 80 (gleichmässig)
const ELEVATION_CONCURRENCY = 8;

// Wie viele Kandidaten (nach Bounding-Box-Vorfilter + Rang) pro Suche die teure
// Geometrie-/Hoehen-Anreicherung durchlaufen. Bei aktiver Distanz-Obergrenze
// etwas grosszuegiger, weil manche Kandidaten die exakte Laengenpruefung noch
// verfehlen (Bounding-Box-Diagonale ist nur eine untere Schranke).
const GEOMETRY_POOL_DEFAULT = 300;
const GEOMETRY_POOL_FILTERED = 400;

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
  timeoutMs?: number,
): Promise<RouteIndexEntry[]> {
  const hit = indexCache.get(canton);
  if (hit && !timeoutMs && Date.now() - hit.at < INDEX_TTL_MS) return hit.entries;
  const entries = await fetchCantonRouteIndex(iso, log, timeoutMs);
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
// Sehr kurze TTL fuer Overpass-Fehler (Timeout, Netzausfall): damit wird nach
// 30 s erneut versucht statt 24 h lang leere POI-Listen auszuliefern.
const POI_ERROR_TTL_MS = 30 * 1000; // 30 Sekunden
// Cache fuer on-demand-Anreicherung einzelner POIs (lazy, pro Name+Koordinate).
const POI_DETAIL_TTL_MS = 24 * 60 * 60 * 1000; // 24 Stunden
const poiCache = new Map<string, { at: number; entries: EnrichedPoi[] }>();
// Separater Fehler-Cache: nur Timestamp, kein entries-Array. Wird von
// poiCache bewusst getrennt gehalten, damit ein erfolgreicher Folgeaufruf
// das poiCache-Ergebnis nicht mit einem leeren Array ueberschreiben kann.
const poiErrorCache = new Map<string, number>();
// Verhindert parallele Hintergrund-Refreshes fuer dieselbe BBox.
const poiRefreshInFlight = new Set<string>();
// On-demand-Cache fuer einzelne POI-Anreicherungen.
const poiDetailCache = new Map<string, { at: number; wiki: WikiSummary | null }>();

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
          // Bild-Hierarchie: Wikipedia-Thumbnail > P18 > P373-Kategorie > Commons-Name > Commons-Geo
          const image =
            wiki.image ??
            p18Image ??
            (await fetchWikidataCommonsCategory(poi.wikidataTag)) ??
            (await fetchCommonsImageByName(poi.name)) ??
            (await fetchNearbyCommonsImage(poi.lat, poi.lng, 500));
          return { ...poi, wiki: { ...wiki, image } };
        }
        // Kein Wikipedia-Artikel: P18 > P373-Kategorie > Commons-Name > Commons-Geo
        const image =
          p18Image ??
          (await fetchWikidataCommonsCategory(poi.wikidataTag)) ??
          (await fetchCommonsImageByName(poi.name)) ??
          (await fetchNearbyCommonsImage(poi.lat, poi.lng, 500));
        if (image) {
          return { ...poi, wiki: { title: poi.name, extract: "", url: "", lang: "de", image } };
        }
      } else {
        // Kein Wikipedia-Eintrag: P18 + P373-Kategorie + Commons-Name + Commons-Geo parallel
        const [p18Image, p373Image, nameImage, geoImage] = await Promise.all([
          fetchWikidataImage(poi.wikidataTag),
          fetchWikidataCommonsCategory(poi.wikidataTag),
          fetchCommonsImageByName(poi.name),
          fetchNearbyCommonsImage(poi.lat, poi.lng, 500),
        ]);
        const image = p18Image ?? p373Image ?? nameImage ?? geoImage;
        if (image) {
          return { ...poi, wiki: { title: poi.name, extract: "", url: "", lang: "de", image } };
        }
      }
    }
    // Dritte Stufe: kein OSM-Verweis vorhanden oder aufloesbar — Wikipedia-
    // Geo-Suche im Umkreis mit unscharfem Namensabgleich. Budget-gedeckelt.
    // Reine Codes/Zahlen ("42") werden uebersprungen — Wikipedia hat dazu keinen
    // Artikel und eine Namens-Suche nach "42" wuerde falsche Treffer liefern.
    if (geoSearchBudget.rest > 0 && !isCodeName(poi.name)) {
      geoSearchBudget.rest--;
      const wiki = await searchNearbyWikipedia(poi.name, poi.lat, poi.lng);
      if (wiki) {
        // Bild-Hierarchie: Commons-Name-Suche zuerst (findet z.B. Denkmal-Foto
        // auch wenn der Artikel ueber die Person handelt und nur ein Portrait als
        // Thumbnail hat). Danach Artikel-interne Bildersuche, dann Thumbnail,
        // dann Geo-Fallback.
        const image =
          (await fetchCommonsImageByName(poi.name)) ??
          (await fetchWikipediaArticleImageByPoiName(wiki.title, poi.name)) ??
          wiki.image ??
          (await fetchNearbyCommonsImage(poi.lat, poi.lng, 500));
        return { ...poi, wiki: { ...wiki, image } };
      }
    }
    // Vierte + Fuenfte Stufe parallel: Commons-Bild UND Claude-Text gleichzeitig
    // suchen und kombinieren. Bei reinen Codes/Zahlen ("42") wird statt dem
    // bedeutungslosen Namen der Typ als Suchbegriff verwendet ("Grenzstein");
    // ist kein Typbegriff verfuegbar, entfaellt die Namens-Suche und nur die
    // Geo-Suche bleibt.
    const searchTerm = commonsSearchTerm(poi.name, poi.kind);
    const [nameImage, geoImage, aiWiki] = await Promise.all([
      searchTerm ? fetchCommonsImageByName(searchTerm) : Promise.resolve(null),
      fetchNearbyCommonsImage(poi.lat, poi.lng, 500),
      searchAiPoiKnowledge(poi.name, poi.kind, "de", poi.lat, poi.lng),
    ]);
    const commonsImage = nameImage ?? geoImage;
    if (commonsImage || aiWiki) {
      return {
        ...poi,
        wiki: {
          title: aiWiki?.title ?? poi.name,
          extract: aiWiki?.extract ?? "",
          url: aiWiki?.url ?? "",
          lang: aiWiki?.lang ?? "de",
          image: commonsImage ?? aiWiki?.image ?? null,
        },
      };
    }
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
    // Keine Batch-Anreicherung mehr — Wiki/Commons wird on-demand beim Oeffnen
    // des POI geladen. Das eliminiert Rate-Limiting durch hunderte parallele
    // Wikimedia-Requests und macht den Karten-Load sofort.
    const entries = deduplicatePois(raw.map((p) => ({ ...p, wiki: null })));
    poiCache.set(key, { at: Date.now(), entries });
    log.info(
      { bbox, total: raw.length, deduplicated: entries.length },
      "POI-Cache im Hintergrund aktualisiert (ohne Anreicherung)",
    );
  } finally {
    poiRefreshInFlight.delete(key);
  }
}

/**
 * Liefert historische/touristische Orte in einer Bounding Box (gecacht).
 *
 * Keine Batch-Wikipedia-Anreicherung mehr — Wiki/Commons wird on-demand beim
 * Oeffnen des POI geladen (getPoiDetail). Stale-while-revalidate: gibt
 * abgelaufene Cache-Eintraege sofort zurueck und aktualisiert im Hintergrund.
 */
export async function getPois(
  bbox: { south: number; west: number; north: number; east: number },
  log: Logger,
): Promise<EnrichedPoi[]> {
  const key = bboxCacheKey(bbox);
  const errAt = poiErrorCache.get(key);
  if (errAt !== undefined && Date.now() - errAt < POI_ERROR_TTL_MS) return [];
  const hit = poiCache.get(key);
  if (hit) {
    if (Date.now() - hit.at < POI_TTL_MS) return hit.entries;
    void refreshPoisBackground(bbox, key, log);
    return hit.entries;
  }
  // Kein Cache-Eintrag vorhanden: Hintergrundladen starten und sofort []
  // zurueckgeben. Der mobile Client hat bereits eine Retry-Logik (alle 60 s);
  // nach dem Overpass-Aufruf (~5–30 s) liefert die naechste Anfrage sofort
  // Daten aus dem Cache. Das verhindert, dass die App-HTTP-Anfrage vor dem
  // Ende der Overpass-Kette abbricht und der Client nie POIs sieht.
  void refreshPoisBackground(bbox, key, log);
  return [];
}

/**
 * On-demand-Anreicherung eines einzelnen POI mit Wikipedia-Zusammenfassung
 * und/oder Bild. Wird aufgerufen wenn der Nutzer den POI oeffnet (lazy).
 * Ergebnis wird 24 h gecacht.
 */
export async function getPoiDetail(
  params: {
    name: string;
    kind: string;
    lat: number;
    lng: number;
    wikipediaTag?: string;
    wikidataTag?: string;
  },
  log: Logger,
): Promise<WikiSummary | null> {
  const cacheKey = `${params.lat.toFixed(5)},${params.lng.toFixed(5)},${params.name}`;
  const hit = poiDetailCache.get(cacheKey);
  if (hit && Date.now() - hit.at < POI_DETAIL_TTL_MS) return hit.wiki;
  const rawPoi: RawPoi = {
    id: cacheKey,
    name: params.name,
    kind: params.kind,
    lat: params.lat,
    lng: params.lng,
    wikipediaTag: params.wikipediaTag ?? null,
    wikidataTag: params.wikidataTag ?? null,
    osmContext: null,
  };
  // Voller Anreicherungs-Budget fuer einen einzelnen POI (kein Batch-Limit).
  const enriched = await enrichPoiWithWikipedia(rawPoi, log, { rest: 1 });
  const wiki = enriched.wiki;
  poiDetailCache.set(cacheKey, { at: Date.now(), wiki });
  log.info({ name: params.name, hasImage: !!wiki?.image, hasExtract: !!wiki?.extract }, "POI-Detail angereichert");
  return wiki;
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
  // Generische Verbindungswege (z.B. "Baar – Höllgrotten", "Bibersteg - Bubrugg")
  // erkennen: kein ref, kein network-Tag (lwn/ohne) UND Name enthält " - " oder " – ".
  // Diese werden komplett ausgeschlossen – sie sind kurze Pfadsegmente, keine
  // eigenständigen Wanderrouten, und füllen den Pool mit unbrauchbarem Inhalt.
  const isGenericConnector = (e: RouteIndexEntry) =>
    e.rank >= 3 &&          // lwn oder ohne Tag
    !e.ref &&
    /\s[–\-]\s/.test(e.name);

  return filtered
    .filter((e) => !isGenericConnector(e))
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
export const GEOMETRY_VERSION = 4; // v4: geordnetes Stitching (OSM-Memberreihenfolge) statt Greedy

function isFresh(row: ExternalRouteRow): boolean {
  return (
    row.geometryVersion >= GEOMETRY_VERSION &&
    Date.now() - row.fetchedAt.getTime() < CACHE_TTL_MS
  );
}

export async function loadCachedRoutes(canton: string): Promise<ExternalRouteRow[]> {
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
  fetchOpts?: { timeoutMs?: number; batchSize?: number; pauseMs?: number; skipPhotos?: boolean },
): Promise<void> {
  const raw = await fetchRouteGeometries(osmIds, log, fetchOpts);
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
    const geometry: [number, number][] = rdpSimplify(r.points, 5, STORED_GEOMETRY_POINTS).map(
      (p: LatLng) => [p.lat, p.lng],
    );
    // Foto überspringen wenn skipPhotos gesetzt — Backfill läuft beim nächsten
    // Server-Start automatisch über loadMissingRoutePhotos().
    const photo = fetchOpts?.skipPhotos
      ? { photoUrl: null, attribution: null }
      : await getCachedRoutePhoto(start.lat, start.lng, log, r.name);
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
// Mindestanzahl frischer DB-Routen, ab der der Overpass-Index-Aufruf
// uebersprungen wird. 8 reicht: kleine Kantone (z.B. Basel-Stadt) haben
// oft nur 10–12 Routen total — der Shortcut muss auch dort greifen.
const DB_SHORTCUT_MIN = 8;

export async function getCantonRoutes(
  canton: string,
  log: Logger,
  distMax?: number,
  fetchOpts?: { timeoutMs?: number; batchSize?: number; pauseMs?: number; forceRefresh?: boolean; skipPhotos?: boolean },
): Promise<ExternalRouteRow[]> {
  const iso = isoForCanton(canton);
  if (!iso) {
    log.warn({ canton }, "Kein ISO-Code fuer Kanton bekannt");
    return [];
  }

  // DB-First-Shortcut: sind genuegend frische Routen in der DB, Overpass komplett
  // ueberspringen. Das verhindert den langen Cold-Start nach Server-Restart.
  const cached = await loadCachedRoutes(canton);
  const fresh = cached.filter((row) => isFresh(row));
  if (!fetchOpts?.forceRefresh && fresh.length >= DB_SHORTCUT_MIN) {
    log.debug({ canton, count: fresh.length }, "Kanton-Routen aus DB-Cache (Shortcut)");
    return fresh;
  }

  let index: RouteIndexEntry[];
  try {
    index = await getCantonIndex(canton, iso, log, fetchOpts?.timeoutMs);
  } catch (err) {
    // Index nicht ladbar: auf bereits FRISCH gecachte Routen ausweichen, sonst
    // Fehler durchreichen (der Router meldet dann 502 -> UI "Server nicht
    // erreichbar"). Nur veraltete Cache-Zeilen zaehlen nicht als Treffer, sonst
    // wuerde ein Serverausfall faelschlich als "keine Routen" erscheinen.
    if (fresh.length > 0) {
      log.warn({ canton, err }, "Kanton-Index nicht ladbar, nutze Cache");
      return fresh;
    }
    throw err;
  }

  const candidates = selectCandidates(index, distMax);
  const freshIds = new Set(fresh.map((row) => row.id));
  const missing = candidates
    .filter((c) => !freshIds.has(`osm-${c.osmId}`))
    .map((c) => c.osmId);

  if (missing.length > 0) {
    try {
      await enrichAndStore(canton, missing, log, fetchOpts);
    } catch (err) {
      // Anreicherung fehlgeschlagen: vorhandene frische Treffer trotzdem liefern.
      if (freshIds.size > 0) {
        log.warn({ canton, err }, "Geometrie-Anreicherung fehlgeschlagen, nutze Cache");
        return fresh;
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
let warmAllLaeuft = false;

export async function warmAllCantonCaches(log: Logger): Promise<void> {
  // Debounce: Catch-up und Artefakt-Fix koennen beide beim Start einen
  // Warm-all ausloesen — nie zwei parallel laufen lassen (Overpass-Last).
  if (warmAllLaeuft) {
    log.info("Warm-all laeuft bereits — zweiter Aufruf uebersprungen");
    return;
  }
  warmAllLaeuft = true;
  try {
    await warmAllCantonCachesInner(log);
  } finally {
    warmAllLaeuft = false;
  }
}

async function warmAllCantonCachesInner(log: Logger): Promise<void> {
  const cantons = Object.keys(CANTON_ISO);
  for (const canton of cantons) {
    // Kanton überspringen wenn bereits genug frische Routen in DB —
    // verhindert unnötige Overpass-Last beim Serverneustart.
    const cached = await loadCachedRoutes(canton);
    const fresh = cached.filter((row) => isFresh(row));
    if (fresh.length >= DB_SHORTCUT_MIN) {
      log.debug({ canton, count: fresh.length }, "Kanton-Cache aktuell – Vorwaermung übersprungen");
      continue;
    }
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
    fotoUrl: null,
    fotoAttribution: null,
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

const PHOTO_FILL_STAGGER_MS = 3000;

/**
 * Holt fehlende Fotos fuer alle gecachten Routen im Hintergrund nach.
 * Laeuft einmalig nach dem Kanton-Warmup; Fehler pro Route werden nur geloggt.
 * Stagger 3s zwischen Requests damit Wikimedia Commons nicht ueberfordert wird.
 */
export async function fillMissingRoutePhotos(log: Logger): Promise<void> {
  const missing = await db
    .select()
    .from(externalRoutesTable)
    .where(and(isNull(externalRoutesTable.photoUrl), sql`lat IS NOT NULL`));

  log.info({ count: missing.length }, "Routen ohne Foto gefunden – starte Nachladen");

  for (const route of missing) {
    if (route.lat == null || route.lng == null) continue;
    try {
      const foto = await getCachedRoutePhoto(route.lat, route.lng, log, route.name ?? undefined);
      if (foto.photoUrl) {
        await db
          .update(externalRoutesTable)
          .set({ photoUrl: foto.photoUrl, photoAttribution: foto.attribution })
          .where(and(eq(externalRoutesTable.id, route.id), isNull(externalRoutesTable.photoUrl)))
          .execute();
        log.debug({ routeId: route.id }, "Route-Foto nachgeladen");
      }
    } catch (err) {
      log.warn({ err, routeId: route.id }, "Route-Foto-Nachladen fehlgeschlagen");
    }
    await new Promise((resolve) => setTimeout(resolve, PHOTO_FILL_STAGGER_MS));
  }

  log.info({ count: missing.length }, "Routen-Foto-Nachladen abgeschlossen");
}

/**
 * Prueft alle v3-Routen in der DB auf zwei Artefakt-Typen aus fehlerhaftem
 * OSM-Stitching:
 *   1. Luecken > 500 m (gerade Phantomlinien quer durchs Gelaende)
 *   2. Zickzack-Knicke: >= 2 Richtungsumkehrungen > 150 Grad zwischen
 *      Segmenten > 15 m (falsch ausgerichtete Wegstuecke; einzelne scharfe
 *      Kehren koennen echte Serpentinen sein und bleiben unangetastet)
 * Kaputte Routen werden auf geometry_version = 1 zurueckgesetzt, damit der
 * naechste Warm-all sie mit dem geordneten Stitching neu aufbaut. Gibt die
 * Anzahl der markierten Routen zurueck.
 *
 * Wird einmalig beim Server-Start aufgerufen. Sobald alle Routen korrekt
 * sind, findet die Funktion nichts mehr und kehrt sofort zurueck (O(n) Scan,
 * n = Anzahl v3-Routen).
 */
export async function fixArtefaktRouten(log: Logger): Promise<number> {
  const LUECKE_M = 500;
  const KNICK_GRAD = 150;
  const KNICK_MIN_SEGMENT_M = 15;
  const KNICK_MAX_OK = 1; // 1 scharfe Kehre kann echt sein (Serpentine)

  const rows = await db
    .select({ id: externalRoutesTable.id, geometry: externalRoutesTable.geometry, canton: externalRoutesTable.canton })
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.geometryVersion, 3));

  const kompass = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const x = Math.sin(dLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
  };

  const kaputt: string[] = [];
  for (const row of rows) {
    const geom = row.geometry as [number, number][] | null;
    if (!geom || geom.length < 2) continue;
    const pts = geom.map(([lat, lng]) => ({ lat: lat!, lng: lng! }));

    let defekt = false;
    let knicke = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = haversineM(pts[i - 1]!, pts[i]!);
      if (d > LUECKE_M) {
        defekt = true;
        break;
      }
      // Knick-Check am Punkt i (braucht Nachfolger)
      if (i < pts.length - 1 && d > KNICK_MIN_SEGMENT_M) {
        const d2 = haversineM(pts[i]!, pts[i + 1]!);
        if (d2 > KNICK_MIN_SEGMENT_M) {
          let diff = Math.abs(kompass(pts[i]!, pts[i + 1]!) - kompass(pts[i - 1]!, pts[i]!));
          if (diff > 180) diff = 360 - diff;
          if (diff > KNICK_GRAD) knicke++;
          if (knicke > KNICK_MAX_OK) {
            defekt = true;
            break;
          }
        }
      }
    }
    if (defekt) kaputt.push(row.id);
  }

  if (kaputt.length === 0) {
    log.info("Artefakt-Check: keine kaputten Routen gefunden");
    return 0;
  }

  // In Batches a 100 updaten (IN-Klausel-Laenge begrenzen).
  const BATCH = 100;
  for (let i = 0; i < kaputt.length; i += BATCH) {
    const slice = kaputt.slice(i, i + BATCH);
    await db.execute(
      sql`UPDATE external_routes SET geometry_version = 1 WHERE id = ANY(${sql.raw(`ARRAY[${slice.map((id) => `'${id}'`).join(",")}]`)})`,
    );
  }

  log.info({ count: kaputt.length }, "Artefakt-Check: kaputte Routen auf v1 zurueckgesetzt");

  // Betroffene Kantone bestimmen und jeweils mit forceRefresh neu aufbauen.
  // warmAllCantonCaches wuerde Kantone mit genuegend v3-Routen ueberspringen —
  // deshalb pro Kanton direkt getCantonRoutes({ forceRefresh: true }) aufrufen.
  const betroffeneKantone = [...new Set(
    rows
      .filter((r) => kaputt.includes(r.id))
      .map((r) => (r as { canton?: string }).canton)
      .filter((c): c is string => !!c),
  )];

  log.info({ kantone: betroffeneKantone }, "Artefakt-Fix: starte forceRefresh fuer betroffene Kantone");
  return kaputt.length;
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
