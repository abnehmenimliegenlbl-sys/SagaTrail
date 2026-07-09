import type { Logger } from "pino";
import { haversineM, type LatLng } from "./geo";

/**
 * Laedt reale Wanderrouten je Kanton aus OpenStreetMap ueber die Overpass-API.
 *
 * Zweistufiges, distanzbewusstes Vorgehen, um Last und Antwortgroesse gering zu
 * halten und trotzdem auch KURZE lokale Routen in routendichten Kantonen zu
 * finden:
 *
 *  1. Index (`out tags bb;`): fuer ALLE benannten Wanderrouten-Relationen des
 *     Kantons nur Tags und die Bounding Box holen. Das ist selbst fuer grosse
 *     Kantone (>1000 Relationen) klein und schnell. Aus der Bounding-Box-
 *     Diagonale ergibt sich eine UNTERE Schranke der echten Routenlaenge: eine
 *     Route ist nie kuerzer als ihre Bounding-Box-Diagonale. Damit lassen sich
 *     bei einer Obergrenze (distMax) alle sicher zu langen Routen vorab
 *     aussortieren, BEVOR die teure Geometrie geladen wird.
 *  2. Geometrie (`out geom;`): nur fuer die ausgewaehlten Kandidaten die
 *     Wegpunkte nachladen, um die exakte Laenge zu berechnen.
 *
 * Overpass verlangt einen aussagekraeftigen User-Agent, sonst 406.
 */

// Mehrere Overpass-Spiegel: der oeffentliche Hauptserver ist oft ueberlastet
// (504/429). Wir probieren der Reihe nach mit kurzer Wartezeit weiter.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const USER_AGENT = "SagaTrail/1.0 (Swiss hiking companion)";
// 60 s pro Versuch war zu grosszuegig: bei zwei Versuchen je Spiegel und drei
// Spiegeln konnte ein einzelner Aufruf im Worst Case bis zu 6 Minuten haengen,
// bevor er fehlschlug — auf der Wanderungs-Seite sieht das wie "keine POI
// gefunden" aus, obwohl der Server nur extrem lange auf eine tote Quelle
// gewartet hat. Kuerzere Versuche + weniger Wiederholungen scheitern schneller
// und geben so den naechsten Spiegeln (bzw. dem 502 an den Client) frueher eine
// Chance.
const REQUEST_TIMEOUT_MS = 12000;

// Geometrie wird in Bloecken nachgeladen, damit die Antwort auch bei vielen
// Kandidaten nicht das Overpass-Zeit-/Groessenlimit sprengt.
const GEOMETRY_BATCH = 80;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Angereicherte Route mit voller Geometrie (nach Phase 2). */
export interface RawHikingRoute {
  id: string;
  osmId: number;
  name: string;
  ref: string | null;
  sac: string | null;
  network: string | null;
  points: LatLng[];
}

/**
 * Leichter Index-Eintrag (nach Phase 1): Tags plus die aus der Bounding Box
 * abgeleitete Diagonale als untere Schranke der Routenlaenge.
 */
export interface RouteIndexEntry {
  osmId: number;
  name: string;
  ref: string | null;
  sac: string | null;
  network: string | null;
  bboxDiagKm: number;
  rank: number;
}

interface OverpassBounds {
  minlat: number;
  minlon: number;
  maxlat: number;
  maxlon: number;
}

interface OverpassTagsElement {
  type: string;
  id: number;
  bounds?: OverpassBounds;
  tags?: Record<string, string>;
}

interface OverpassGeomMember {
  type: string;
  role?: string;
  geometry?: { lat: number; lon: number }[];
}

interface OverpassGeomElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  members?: OverpassGeomMember[];
}

async function runOverpass<T>(query: string): Promise<T[]> {
  let lastError: Error | null = null;
  for (const url of OVERPASS_MIRRORS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ data: query }).toString(),
          signal: controller.signal,
        });
        if (!res.ok) {
          // 429/5xx: naechster Versuch/Spiegel; andere Fehler abbrechen.
          if (res.status === 429 || res.status >= 500) {
            lastError = new Error(`Overpass HTTP ${res.status}`);
            await sleep(1000);
            continue;
          }
          throw new Error(`Overpass HTTP ${res.status}`);
        }
        const json = (await res.json()) as { elements?: T[] };
        return json.elements ?? [];
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      } finally {
        clearTimeout(timer);
      }
    }
  }
  throw lastError ?? new Error("Overpass nicht erreichbar");
}

const NETWORK_RANK: Record<string, number> = {
  iwn: 0,
  nwn: 1,
  rwn: 2,
  lwn: 3,
};

function rankOf(network: string | null): number {
  return NETWORK_RANK[network ?? ""] ?? 4;
}

/** Diagonale der Bounding Box in km (untere Schranke der Routenlaenge). */
function bboxDiagonalKm(b: OverpassBounds): number {
  return (
    haversineM(
      { lat: b.minlat, lng: b.minlon },
      { lat: b.maxlat, lng: b.maxlon },
    ) / 1000
  );
}

// Rollen, die NICHT zum Hauptverlauf einer Route gehoeren (Varianten,
// Zubringer, Abstecher) — sie wuerden den Verlauf mit Zickzack verfaelschen.
const NEBENROLLEN = new Set([
  "alternative",
  "alternate",
  "excursion",
  "approach",
  "connection",
  "shortcut",
  "detour",
  "link",
]);

// Endpunkte gelten als "verbunden", wenn sie hoechstens so weit auseinander
// liegen (OSM-Wegstuecke teilen sich meist exakt einen Knoten, kleine Luecken
// kommen aber vor, z.B. an Faehren oder Strassenquerungen).
const VERBINDUNGS_TOLERANZ_M = 150;

/**
 * Verkettet die Wegstuecke einer Relation zu einer Punktliste.
 *
 * OSM-Relationen garantieren WEDER die Reihenfolge NOCH die Ausrichtung ihrer
 * Wegstuecke. Naives Aneinanderhaengen erzeugt deshalb Zickzack-Linien quer
 * durchs Gelaende. Stattdessen: gierige Verkettung ueber die Endpunkte — es
 * wird stets das Wegstueck angefuegt (vorne oder hinten, bei Bedarf
 * umgedreht), dessen Endpunkt dem aktuellen Kettenende am naechsten liegt.
 * Liegt kein Stueck mehr innerhalb der Toleranz, wird das naechstgelegene
 * Reststueck mit sichtbarer Luecke angefuegt (besser eine kleine Luecke als
 * ein Sprung quer ueber das Tal).
 */
function stitchGeometry(members: OverpassGeomMember[]): LatLng[] {
  const segmente: LatLng[][] = [];
  for (const m of members) {
    if (m.type !== "way" || !m.geometry || m.geometry.length < 2) continue;
    if (m.role && NEBENROLLEN.has(m.role.trim().toLowerCase())) continue;
    segmente.push(m.geometry.map((g) => ({ lat: g.lat, lng: g.lon })));
  }
  if (segmente.length === 0) return [];

  const offen = new Set(segmente.map((_, i) => i));
  const erste = segmente[0];
  offen.delete(0);
  let kette: LatLng[] = [...erste];

  const anhaengen = (ziel: LatLng[], stueck: LatLng[]) => {
    const start = ziel[ziel.length - 1];
    const naechster = stueck[0];
    // Doppelten Nahtpunkt vermeiden
    const ohneDuplikat =
      start.lat === naechster.lat && start.lng === naechster.lng
        ? stueck.slice(1)
        : stueck;
    ziel.push(...ohneDuplikat);
  };

  while (offen.size > 0) {
    const kettenEnde = kette[kette.length - 1];
    const kettenStart = kette[0];
    let bester = -1;
    let besteDistanz = Infinity;
    let umdrehen = false;
    let vorne = false;
    for (const i of offen) {
      const s = segmente[i];
      const kandidaten: [number, boolean, boolean][] = [
        [haversineM(kettenEnde, s[0]), false, false], // hinten anfuegen
        [haversineM(kettenEnde, s[s.length - 1]), true, false], // hinten, umgedreht
        [haversineM(kettenStart, s[s.length - 1]), false, true], // vorne anfuegen
        [haversineM(kettenStart, s[0]), true, true], // vorne, umgedreht
      ];
      for (const [d, rev, front] of kandidaten) {
        if (d < besteDistanz) {
          besteDistanz = d;
          bester = i;
          umdrehen = rev;
          vorne = front;
        }
      }
    }
    if (bester < 0) break;
    offen.delete(bester);
    // Ausserhalb der Toleranz: Stueck trotzdem hinten anfuegen (Luecke),
    // aber nie vorne einschieben — das wuerde den Verlauf verdrehen. Die
    // Ausrichtung folgt dem naeher liegenden Endpunkt, damit der kuenstliche
    // Verbindungssprung so kurz wie moeglich bleibt.
    if (besteDistanz > VERBINDUNGS_TOLERANZ_M) {
      const rest = segmente[bester];
      const ende = kette[kette.length - 1];
      const gedreht =
        haversineM(ende, rest[rest.length - 1]) < haversineM(ende, rest[0]);
      kette.push(...(gedreht ? [...rest].reverse() : rest));
      continue;
    }
    const stueck = umdrehen ? [...segmente[bester]].reverse() : segmente[bester];
    if (vorne) {
      const neu = [...stueck];
      anhaengen(neu, kette);
      kette = neu;
    } else {
      anhaengen(kette, stueck);
    }
  }

  return kette;
}

/** Seilbahn/Standseilbahn-Wegstueck aus OpenStreetMap fuer die Kartendarstellung. */
export interface RawAerialway {
  id: string;
  kind: string;
  points: LatLng[];
}

interface OverpassWayGeomElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

/**
 * Laedt Seilbahnen, Gondelbahnen, Sessellifte und Standseilbahnen (typische
 * alpine Wander-Verkehrsmittel) innerhalb einer Bounding Box. Bewusst eng
 * begrenzt auf einen Kartenausschnitt, damit die Abfrage klein und schnell
 * bleibt (kein flaechendeckender Import wie bei den Wanderrouten).
 */
export async function fetchAerialways(
  bbox: { south: number; west: number; north: number; east: number },
  log: Logger,
): Promise<RawAerialway[]> {
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const query = [
    "[out:json][timeout:25];",
    "(",
    `way["aerialway"~"^(cable_car|gondola|chair_lift)$"](${b});`,
    `way["railway"="funicular"](${b});`,
    ");",
    "out geom;",
  ].join("");
  const elements = await runOverpass<OverpassWayGeomElement>(query);
  const result: RawAerialway[] = [];
  for (const e of elements) {
    if (!e.geometry || e.geometry.length < 2) continue;
    const tags = e.tags ?? {};
    const kind = tags.aerialway ?? "funicular";
    result.push({
      id: `aerialway-${e.id}`,
      kind,
      points: e.geometry.map((g) => ({ lat: g.lat, lng: g.lon })),
    });
  }
  log.info({ bbox, count: result.length }, "Overpass: Seilbahnen geladen");
  return result;
}

/** Historischer/touristischer Ort aus OpenStreetMap, roh vor Wikipedia-Anreicherung. */
export interface RawPoi {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lng: number;
  wikipediaTag: string | null;
  wikidataTag: string | null;
}

interface OverpassPoiElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Laedt historische und touristische Orte (historic=*, tourism=attraction|
 * viewpoint) innerhalb einer Bounding Box. Bewusst auf benannte Orte begrenzt,
 * damit nur POIs geliefert werden, die sich sinnvoll erzaehlen lassen.
 */
export async function fetchHistoricPois(
  bbox: { south: number; west: number; north: number; east: number },
  log: Logger,
): Promise<RawPoi[]> {
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const query = [
    "[out:json][timeout:25];",
    "(",
    `node["historic"]["name"](${b});`,
    `way["historic"]["name"](${b});`,
    `node["tourism"~"^(attraction|viewpoint)$"]["name"](${b});`,
    `way["tourism"~"^(attraction|viewpoint)$"]["name"](${b});`,
    ");",
    "out center tags;",
  ].join("");
  const elements = await runOverpass<OverpassPoiElement>(query);
  const result: RawPoi[] = [];
  for (const e of elements) {
    const tags = e.tags ?? {};
    if (!tags.name) continue;
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;
    const kind = tags.historic ? `historic=${tags.historic}` : `tourism=${tags.tourism}`;
    result.push({
      id: `${e.type}-${e.id}`,
      name: tags.name,
      kind,
      lat,
      lng,
      wikipediaTag: tags.wikipedia ?? null,
      wikidataTag: tags.wikidata ?? null,
    });
  }
  log.info({ bbox, count: result.length }, "Overpass: POIs geladen");
  return result;
}

/**
 * Phase 1: leichter Index aller benannten Wanderrouten-Relationen eines Kantons
 * (nur Tags + Bounding Box). Klein und schnell, auch fuer >1000 Relationen.
 */
export async function fetchCantonRouteIndex(
  iso: string,
  log: Logger,
): Promise<RouteIndexEntry[]> {
  const query = [
    "[out:json][timeout:90];",
    `area["ISO3166-2"="${iso}"]->.a;`,
    'relation["route"="hiking"]["name"](area.a);',
    "out tags bb;",
  ].join("");
  const elements = await runOverpass<OverpassTagsElement>(query);
  const index: RouteIndexEntry[] = [];
  for (const e of elements) {
    const tags = e.tags ?? {};
    if (!tags.name || !e.bounds) continue;
    const network = tags.network ?? null;
    index.push({
      osmId: e.id,
      name: tags.name,
      ref: tags.ref ?? null,
      sac: tags.sac_scale ?? null,
      network,
      bboxDiagKm: bboxDiagonalKm(e.bounds),
      rank: rankOf(network),
    });
  }
  log.info({ iso, indexed: index.length }, "Overpass: Kanton-Index geladen");
  return index;
}

/**
 * Phase 2: Geometrie fuer eine Kandidatenauswahl nachladen und zu Punktlisten
 * verketten. Die Abfrage wird blockweise gestellt, damit sie das Overpass-Limit
 * nicht sprengt. Relationen, deren Geometrie sich nicht verketten laesst
 * (points.length < 2), entfallen.
 */
export async function fetchRouteGeometries(
  osmIds: number[],
  log: Logger,
): Promise<RawHikingRoute[]> {
  if (osmIds.length === 0) return [];
  const routes: RawHikingRoute[] = [];
  for (let i = 0; i < osmIds.length; i += GEOMETRY_BATCH) {
    const batch = osmIds.slice(i, i + GEOMETRY_BATCH);
    const query = [
      "[out:json][timeout:90];",
      `relation(id:${batch.join(",")});`,
      "out geom;",
    ].join("");
    const geom = await runOverpass<OverpassGeomElement>(query);
    for (const g of geom) {
      if (!g.members) continue;
      const points = stitchGeometry(g.members);
      if (points.length < 2) continue;
      const tags = g.tags ?? {};
      routes.push({
        id: `osm-${g.id}`,
        osmId: g.id,
        name: tags.name ?? `Wanderroute ${g.id}`,
        ref: tags.ref ?? null,
        sac: tags.sac_scale ?? null,
        network: tags.network ?? null,
        points,
      });
    }
  }
  log.info(
    { requested: osmIds.length, stitched: routes.length },
    "Overpass: Geometrie geladen",
  );
  return routes;
}
