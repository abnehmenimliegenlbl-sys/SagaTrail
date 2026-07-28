import type { Logger } from "pino";
import { haversineM, type LatLng } from "./geo";
import sacHuettenSeed from "./sacHuettenSeed.json" assert { type: "json" };

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
// OVERPASS_PROXY_URL: optionaler PHP-Proxy auf eigenem Hosting (z.B. Infomaniak)
// der nicht auf der Replit-Blockliste steht. Wird als erster Mirror verwendet.
const OVERPASS_PROXY_URL = process.env.OVERPASS_PROXY_URL?.trim() ?? "";
const OVERPASS_PROXY_TOKEN = process.env.OVERPASS_PROXY_TOKEN?.trim() ?? "";
const OVERPASS_MIRRORS = [
  ...(OVERPASS_PROXY_URL ? [OVERPASS_PROXY_URL] : []),
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
  nameDe: string | null;
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

async function runOverpass<T>(query: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T[]> {
  // Ein Versuch je Spiegel: mit Cache-Vorwaermung (siehe routeService.warmAllCantonCaches)
  // treffen echte Nutzer selten den kalten Pfad, daher zaehlt hier vor allem,
  // schnell zum naechsten Spiegel (bzw. zum DB-Cache-Fallback) zu wechseln,
  // statt denselben lahmen Spiegel zweimal zu befragen.
  let lastError: Error | null = null;
  for (const url of OVERPASS_MIRRORS) {
    for (let attempt = 0; attempt < 1; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const headers: Record<string, string> = {
          "User-Agent": USER_AGENT,
          "Content-Type": "application/x-www-form-urlencoded",
        };
        if (OVERPASS_PROXY_URL && url === OVERPASS_PROXY_URL && OVERPASS_PROXY_TOKEN) {
          headers["X-Proxy-Token"] = OVERPASS_PROXY_TOKEN;
        }
        const res = await fetch(url, {
          method: "POST",
          headers,
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

// Ab dieser Lueckengroesse gilt ein Sprung als Stitch-Artefakt (keine echte
// Wegverbindung). stitchGeometry gibt dann nur die laengste lueckenfreie
// Teilkette zurueck — eine sichtbare Luecke ist besser als eine km-lange
// Phantomlinie quer durchs Gelaende.
const ARTEFAKT_LUECKE_M = 500;

/**
 * Kompassrichtung von a nach b in Grad [0, 360).
 */
function kompassRichtung(a: LatLng, b: LatLng): number {
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

/**
 * Richtungsaenderung in Grad zwischen den Vektoren a→b und b→c.
 * 0 = gleiche Richtung, 180 = Kehrtwendung.
 */
function richtungsAenderung(a: LatLng, b: LatLng, c: LatLng): number {
  const r1 = kompassRichtung(a, b);
  const r2 = kompassRichtung(b, c);
  const d = Math.abs(r2 - r1);
  return d <= 180 ? d : 360 - d;
}

/**
 * Korrigiert Zickzack-Artefakte in einer Punktkette, die durch falsch
 * ausgerichtete OSM-Wegstuecke entstehen.
 *
 * Verfahren: lokaler Umkehr-Optimierer. Kandidaten-Grenzen sind alle Punkte
 * mit Richtungsaenderung > 60 Grad (plus Kettenanfang/-ende). Fuer jedes
 * Grenzpaar wird probeweise der Abschnitt dazwischen umgedreht; die Umkehrung
 * wird uebernommen, wenn sie die Anzahl scharfer Knicke (> 150 Grad) senkt
 * OHNE die Gesamtlaenge zu erhoehen (Toleranz 1 %) — sonst wuerde der
 * Optimierer Knicke durch lange Phantom-Verbindungen "wegoptimieren".
 * Iteriert bis keine Verbesserung mehr moeglich ist (max. 5 Runden).
 */
function korrigiereZickzack(punkte: LatLng[]): LatLng[] {
  const KNICK_WINKEL = 150;
  const KANDIDAT_WINKEL = 60;
  const KNICK_MINDEST_M = 15;
  const MAX_FENSTER = 120; // max. Indizes zwischen Umkehr-Grenzen
  const MAX_RUNDEN = 5;

  if (punkte.length < 3) return punkte;

  const zaehleKnicke = (g: LatLng[]): number => {
    let n = 0;
    for (let i = 1; i < g.length - 1; i++) {
      if (
        haversineM(g[i - 1]!, g[i]!) > KNICK_MINDEST_M &&
        haversineM(g[i]!, g[i + 1]!) > KNICK_MINDEST_M &&
        richtungsAenderung(g[i - 1]!, g[i]!, g[i + 1]!) > KNICK_WINKEL
      )
        n++;
    }
    return n;
  };

  const gesamtLaenge = (g: LatLng[]): number => {
    let l = 0;
    for (let i = 1; i < g.length; i++) l += haversineM(g[i - 1]!, g[i]!);
    return l;
  };

  let kette = punkte;
  for (let runde = 0; runde < MAX_RUNDEN; runde++) {
    const knicke = zaehleKnicke(kette);
    if (knicke === 0) break;

    // Kandidaten-Grenzen: Punkte mit deutlicher Richtungsaenderung
    const grenzen: number[] = [0];
    for (let i = 1; i < kette.length - 1; i++) {
      if (
        haversineM(kette[i - 1]!, kette[i]!) > KNICK_MINDEST_M &&
        haversineM(kette[i]!, kette[i + 1]!) > KNICK_MINDEST_M &&
        richtungsAenderung(kette[i - 1]!, kette[i]!, kette[i + 1]!) > KANDIDAT_WINKEL
      )
        grenzen.push(i);
    }
    grenzen.push(kette.length);

    // Kosten-Deckel: bei sehr verwinkelten Routen (viele Kandidaten-Grenzen)
    // waere die Paar-Schleife zu teuer — dann nur die scharfen Knicke selbst
    // als Grenzen verwenden.
    if (grenzen.length > 40) {
      const nurKnicke: number[] = [0];
      for (let i = 1; i < kette.length - 1; i++) {
        if (
          haversineM(kette[i - 1]!, kette[i]!) > KNICK_MINDEST_M &&
          haversineM(kette[i]!, kette[i + 1]!) > KNICK_MINDEST_M &&
          richtungsAenderung(kette[i - 1]!, kette[i]!, kette[i + 1]!) > KNICK_WINKEL
        )
          nurKnicke.push(i);
      }
      nurKnicke.push(kette.length);
      grenzen.length = 0;
      grenzen.push(...nurKnicke);
    }

    const laengeVorher = gesamtLaenge(kette);
    let beste: LatLng[] | null = null;
    let besterScore = knicke;

    for (let ai = 0; ai < grenzen.length; ai++) {
      for (let bi = ai + 1; bi < grenzen.length; bi++) {
        const a = grenzen[ai]!;
        const b = grenzen[bi]!;
        if (b - a < 2 || b - a > MAX_FENSTER) continue;
        const kandidat = [
          ...kette.slice(0, a),
          ...kette.slice(a, b).reverse(),
          ...kette.slice(b),
        ];
        if (gesamtLaenge(kandidat) > laengeVorher * 1.01) continue;
        const score = zaehleKnicke(kandidat);
        if (score < besterScore) {
          besterScore = score;
          beste = kandidat;
        }
      }
    }

    if (!beste) break;
    kette = beste;
  }

  return kette;
}

/**
 * Teilt eine Punktliste an Spruengen > maxLueckeM auf und gibt die laengste
 * zusammenhaengende Teilkette zurueck. Entfernt so Stitch-Artefakte aus dem
 * Routenverlauf, ohne die Geometrie zu verfaelschen.
 */
function laengsteKette(punkte: LatLng[], maxLueckeM: number): LatLng[] {
  if (punkte.length < 2) return punkte;
  const ketten: LatLng[][] = [];
  let aktuelle: LatLng[] = [punkte[0]!];
  for (let i = 1; i < punkte.length; i++) {
    if (haversineM(punkte[i - 1]!, punkte[i]!) > maxLueckeM) {
      ketten.push(aktuelle);
      aktuelle = [punkte[i]!];
    } else {
      aktuelle.push(punkte[i]!);
    }
  }
  ketten.push(aktuelle);
  // Laengste Kette nach Punktanzahl — korreliert mit physischer Strecklaenge
  return ketten.reduce((a, b) => (b.length > a.length ? b : a), [] as LatLng[]);
}

/**
 * Verkettet die Wegstuecke einer OSM-Relation zu einer Punktliste.
 *
 * Strategie: geordnete Traversierung entlang der OSM-Memberreihenfolge.
 * OSM-Editoren speichern die Ways einer Route in der Begehungsreihenfolge;
 * die Ausrichtung jedes Ways wird per Endpunkt-Uebereinstimmung mit dem
 * aktuellen Kettenende bestimmt (kein Umsortieren). Liegt ein Stueck ausserhalb
 * der Verbindungstoleranz, wird es als neue Luecke angefuegt — laengsteKette
 * entfernt spaeter alle Luecken > ARTEFAKT_LUECKE_M und gibt die Hauptkette
 * zurueck. Abstecher/Schleifen mit grosser Luecke zur Hauptkette fallen dabei
 * automatisch heraus, was Zickzack-Artefakte durch Figur-8-Routen verhindert.
 */
function stitchGeometry(members: OverpassGeomMember[]): LatLng[] {
  const segmente: LatLng[][] = [];
  for (const m of members) {
    if (m.type !== "way" || !m.geometry || m.geometry.length < 2) continue;
    if (m.role && NEBENROLLEN.has(m.role.trim().toLowerCase())) continue;
    segmente.push(m.geometry.map((g) => ({ lat: g.lat, lng: g.lon })));
  }
  if (segmente.length === 0) return [];

  const naht = (ziel: LatLng[], stueck: LatLng[]) => {
    // Doppelten Nahtpunkt vermeiden
    const last = ziel[ziel.length - 1]!;
    const first = stueck[0]!;
    ziel.push(
      ...(last.lat === first.lat && last.lng === first.lng
        ? stueck.slice(1)
        : stueck),
    );
  };

  // Erste Segment-Ausrichtung: schaue auf das zweite Segment um zu bestimmen,
  // ob das erste vorwaerts oder rueckwaerts traversiert werden soll. Sind
  // beide Enden fast gleich nah (< 5 m Unterschied, z.B. Rundweg-Start),
  // entscheidet der Anschlusswinkel zum zweiten Segment.
  let kette: LatLng[];
  if (segmente.length > 1) {
    const s0 = segmente[0]!;
    const s1 = segmente[1]!;
    const d0end = Math.min(
      haversineM(s0[s0.length - 1]!, s1[0]!),
      haversineM(s0[s0.length - 1]!, s1[s1.length - 1]!),
    );
    const d0start = Math.min(
      haversineM(s0[0]!, s1[0]!),
      haversineM(s0[0]!, s1[s1.length - 1]!),
    );
    if (Math.abs(d0start - d0end) < 5 && s0.length >= 2 && s1.length >= 2) {
      // Winkel-Tiebreaker: welches Ende von s0 laeuft glatter in s1 weiter?
      const s1Naechster =
        haversineM(s0[s0.length - 1]!, s1[0]!) <=
        haversineM(s0[s0.length - 1]!, s1[s1.length - 1]!)
          ? s1[1]!
          : s1[s1.length - 2]!;
      const winkelVorwaerts = richtungsAenderung(
        s0[s0.length - 2]!,
        s0[s0.length - 1]!,
        s1Naechster,
      );
      const winkelRueck = richtungsAenderung(s0[1]!, s0[0]!, s1Naechster);
      kette = winkelRueck < winkelVorwaerts ? [...s0].reverse() : [...s0];
    } else {
      kette = d0start < d0end ? [...s0].reverse() : [...s0];
    }
  } else {
    kette = [...segmente[0]!];
  }

  // Geordnete Traversierung: jedes Segment in Memberreihenfolge anfuegen.
  // Richtung: primaer per Endpunkt-Naehe, Tiebreaker per Winkel wenn beide
  // Enden fast gleich weit sind (< 5 m Unterschied) — verhindert, dass kurze
  // Ways rueckwaerts angehaengt werden und Zickzack erzeugen.
  for (let i = 1; i < segmente.length; i++) {
    const s = segmente[i]!;
    const ende = kette[kette.length - 1]!;
    const dStart = haversineM(ende, s[0]!);
    const dEnd = haversineM(ende, s[s.length - 1]!);

    let vorwaerts: boolean;
    if (Math.abs(dStart - dEnd) < 5 && kette.length >= 2) {
      // Tiebreaker: waehle Richtung mit kleinerem Anschlusswinkel
      const vorPunkt = kette[kette.length - 2]!;
      const winkelVorwaerts = s.length >= 2
        ? richtungsAenderung(vorPunkt, ende, s[1]!)
        : 180;
      const winkelRueck = s.length >= 2
        ? richtungsAenderung(vorPunkt, ende, s[s.length - 2]!)
        : 180;
      vorwaerts = winkelVorwaerts <= winkelRueck;
    } else {
      vorwaerts = dStart <= dEnd;
    }

    naht(kette, vorwaerts ? s : [...s].reverse());
  }

  const hauptkette = laengsteKette(kette, ARTEFAKT_LUECKE_M);
  return korrigiereZickzack(hauptkette);
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
  /** Kuratierter Kontext aus OSM-Tags (note, description, inscription, alt_name …)
   *  als formatierter String fuer den Claude-Prompt — enthaelt keine erfundenen Daten. */
  osmContext: string | null;
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
 * Baut aus OSM-Tags einen kuratierten Kontext-String fuer den Claude-Prompt.
 * Nur Felder die tatsaechlich zusaetzliche Information liefern (nicht name/kind,
 * die separat uebergeben werden). Leere Werte werden uebersprungen.
 */
function buildOsmContext(tags: Record<string, string>): string | null {
  const USEFUL_KEYS: Array<[string, string]> = [
    ["note",        "Notiz"],
    ["description", "Beschreibung"],
    ["inscription", "Inschrift"],
    ["alt_name",    "Alternativer Name"],
    ["old_name",    "Historischer Name"],
    ["name:de",     "Deutscher Name"],
    ["name:gsw",    "Schweizerdeutscher Name"],
    ["name:fr",     "Französischer Name"],
    ["name:it",     "Italienischer Name"],
    ["subject",     "Thema/Person"],
    ["artist_name", "Künstler"],
    ["start_date",  "Entstehungsjahr"],
    ["heritage",    "Denkmalschutz"],
    ["operator",    "Betreiber/Eigentümer"],
    ["material",    "Material"],
    ["historic:civilization", "Epoche"],
  ];
  const lines: string[] = [];
  for (const [key, label] of USEFUL_KEYS) {
    const val = tags[key];
    if (val && val.trim()) lines.push(`${label}: ${val.trim()}`);
  }
  return lines.length > 0 ? lines.join("\n") : null;
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
    "[out:json][timeout:10];",
    "(",
    `node["historic"]["name"](${b});`,
    `way["historic"]["name"](${b});`,
    `node["tourism"~"^(attraction|viewpoint)$"]["name"](${b});`,
    `way["tourism"~"^(attraction|viewpoint)$"]["name"](${b});`,
    ");",
    "out center tags;",
  ].join("");
  // HTTP-Timeout muss etwas ueber dem Overpass-internen Timeout liegen (10 s),
  // damit die Antwort noch ankommen kann, bevor wir abbrechen. Mit 3 Mirrors
  // und je 14 s max dauert ein Komplett-Ausfall hoechstens ~42 s statt 75 s —
  // und dank Fehler-Caching in getPois haengt nur der ERSTE Request so lang.
  const POI_HTTP_TIMEOUT_MS = 14_000;
  const elements = await runOverpass<OverpassPoiElement>(query, POI_HTTP_TIMEOUT_MS);
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
      osmContext: buildOsmContext(tags),
    });
  }
  log.info({ bbox, count: result.length }, "Overpass: POIs geladen");
  return result;
}

export interface RawAlpineHut {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  telefon: string | null;
  websiteUrl: string | null;
  elevation: number | null;
  openingHours: string | null;
}

// In-Memory-Cache fuer Alpine-Hut-Abfragen.
// Hütten-Koordinaten aendern sich praktisch nie → grosszuegige TTL.
// Cache-Key: gerundete Koordinaten (0.1°-Raster ≈ 10km) + Radius.
const ALPINE_HUT_TTL_MS = 24 * 60 * 60 * 1000; // 24 Stunden
const alpineHutCache = new Map<string, { at: number; entries: RawAlpineHut[] }>();

function alpineHutCacheKey(center: { lat: number; lng: number }, radiusM: number): string {
  const latR = Math.round(center.lat * 10) / 10;
  const lngR = Math.round(center.lng * 10) / 10;
  return `${latR}:${lngR}:${radiusM}`;
}

// Statischer Seed mit bekannten Schweizer SAC-Hütten als Fallback wenn
// Overpass nicht erreichbar ist. Wird radius-gefiltert zurückgegeben.
interface SeedHut {
  name: string;
  lat: number;
  lng: number;
  elevation: number | null;
  websiteUrl: string | null;
}

function seedHutsInRadius(
  center: { lat: number; lng: number },
  radiusM: number,
): RawAlpineHut[] {
  return (sacHuettenSeed as SeedHut[])
    .filter((h) => haversineM(center, { lat: h.lat, lng: h.lng }) <= radiusM)
    .map((h, i) => ({
      osmId: `seed-${i}-${h.name.replace(/\s+/g, "_")}`,
      name: h.name,
      lat: h.lat,
      lng: h.lng,
      telefon: null,
      websiteUrl: h.websiteUrl,
      elevation: h.elevation,
      openingHours: null,
    }));
}

/**
 * Laedt SAC-Hütten (tourism=alpine_hut) im Umkreis eines Koordinaten-Punktes.
 * Versucht zuerst Overpass; faellt bei Netzwerkfehler auf einen statischen
 * Seed mit ~50 offiziellen Schweizer SAC-Hütten zurück.
 * Ergebnisse werden 24 Stunden im Speicher gecacht.
 */
export async function fetchAlpineHuts(
  center: { lat: number; lng: number },
  radiusM: number,
  log: Logger,
): Promise<RawAlpineHut[]> {
  const key = alpineHutCacheKey(center, radiusM);
  const hit = alpineHutCache.get(key);
  if (hit && Date.now() - hit.at < ALPINE_HUT_TTL_MS) {
    log.info({ count: hit.entries.length, radiusM, cached: true }, "Alpine Huts (Cache)");
    return hit.entries;
  }

  // Seed sofort bereit; Overpass-Versuch mit 3s Gesamt-Deadline (Promise.race).
  // Wenn Overpass gewinnt: Cache mit echten OSM-Daten fuellen.
  // Wenn Seed gewinnt (Timeout/Fehler): sofortige Antwort, Overpass laeuft
  // im Hintergrund weiter und aktualisiert den Cache fuer den naechsten Aufruf.
  const seed = seedHutsInRadius(center, radiusM);

  const overpassFetch = (async (): Promise<RawAlpineHut[] | null> => {
    try {
      // Radius auf 6 km cappen: groessere Anfragen dauern >6 s und triggern
      // Infomaniaks Gateway-Timeout (504). Hütten jenseits 6 km kommen vom Seed.
      const overpassRadius = Math.min(radiusM, 6_000);
      const query = [
        "[out:json][timeout:5];",
        "(",
        `node["tourism"="alpine_hut"]["name"](around:${overpassRadius},${center.lat},${center.lng});`,
        `way["tourism"="alpine_hut"]["name"](around:${overpassRadius},${center.lat},${center.lng});`,
        ");",
        "out center tags;",
      ].join("");
      const elements = await runOverpass<OverpassPoiElement>(query, 6_000);
      const result: RawAlpineHut[] = [];
      for (const e of elements) {
        const tags = e.tags ?? {};
        if (!tags.name) continue;
        const lat = e.lat ?? e.center?.lat;
        const lng = e.lon ?? e.center?.lon;
        if (lat == null || lng == null) continue;
        result.push({
          osmId: `${e.type}-${e.id}`,
          name: tags.name,
          lat,
          lng,
          telefon: tags.phone ?? tags["contact:phone"] ?? null,
          websiteUrl: tags.website ?? tags["contact:website"] ?? tags.url ?? null,
          elevation: tags.ele != null ? (parseFloat(tags.ele) || null) : null,
          openingHours: tags.opening_hours ?? tags.seasonal ?? null,
        });
      }
      return result;
    } catch {
      return null;
    }
  })();

  const deadline = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5_000));

  const winner = await Promise.race([overpassFetch, deadline]);

  if (winner !== null) {
    // Overpass hat innerhalb der Deadline geantwortet
    alpineHutCache.set(key, { at: Date.now(), entries: winner });
    log.info({ count: winner.length, radiusM, source: "overpass" }, "Alpine Huts geladen");
    return winner;
  }

  // Seed sofort zurueckgeben; Overpass laeuft weiter und aktualisiert Cache
  alpineHutCache.set(key, { at: Date.now(), entries: seed });
  log.warn({ count: seed.length, radiusM, source: "seed" }, "Alpine Huts: Seed-Fallback (Overpass zu langsam/nicht erreichbar)");
  overpassFetch.then((r) => {
    if (r !== null && r.length > 0) {
      alpineHutCache.set(key, { at: Date.now(), entries: r });
      log.info({ count: r.length, radiusM }, "Alpine Huts: Overpass-Ergebnis nachtraeglich gecacht");
    }
  }).catch(() => {});
  return seed;
}

/**
 * Phase 1: leichter Index aller benannten Wanderrouten-Relationen eines Kantons
 * (nur Tags + Bounding Box). Klein und schnell, auch fuer >1000 Relationen.
 */
export async function fetchCantonRouteIndex(
  iso: string,
  log: Logger,
  timeoutMs?: number,
): Promise<RouteIndexEntry[]> {
  const httpTimeout = timeoutMs ?? REQUEST_TIMEOUT_MS;
  const ovTimeout  = Math.ceil(httpTimeout / 1000);
  const query = [
    `[out:json][timeout:${ovTimeout}];`,
    `area["ISO3166-2"="${iso}"]->.a;`,
    'relation["route"="hiking"]["name"](area.a);',
    "out tags bb;",
  ].join("");
  const elements = await runOverpass<OverpassTagsElement>(query, httpTimeout);
  const index: RouteIndexEntry[] = [];
  for (const e of elements) {
    const tags = e.tags ?? {};
    if (!tags.name || !e.bounds) continue;
    const network = tags.network ?? null;
    index.push({
      osmId: e.id,
      name: tags.name,
      nameDe: tags["name:de"] ?? null,
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
 * Laedt alle nummerierten SchweizMobil-Wanderrouten inkl. Etappen:
 *   nwn  ref  1–7    (7 nationale Routen)
 *   rwn  ref 22–99   (~80 regionale Routen)
 *   lwn  ref 101–999 (~700 lokale Routen)
 * Jede Etappe ist in OSM eine eigene Relation mit demselben ref wie die
 * Elternroute — die Query liefert daher Parent + alle Etappen zusammen.
 * Drei separate Queries damit keine einzelne Overpass-Abfrage zu gross wird.
 */
export async function fetchSwissNumberedIndex(log: Logger): Promise<RouteIndexEntry[]> {
  const ovTimeout = 120;
  const httpTimeout = 150_000;
  const CH_BBOX = "45.8,5.95,47.85,10.5";

  function makeQuery(network: string): string {
    return [
      `[out:json][timeout:${ovTimeout}][bbox:${CH_BBOX}];`,
      `relation["route"="hiking"]["network"="${network}"]["ref"~"^[0-9]+$"];`,
      `out tags bb;`,
    ].join("");
  }

  function parseElements(elements: OverpassTagsElement[], minRef: number, maxRef: number): RouteIndexEntry[] {
    const result: RouteIndexEntry[] = [];
    for (const e of elements) {
      const tags = e.tags ?? {};
      if (!tags.ref || !tags.name || !e.bounds) continue;
      const refNum = parseInt(tags.ref, 10);
      if (isNaN(refNum) || refNum < minRef || refNum > maxRef) continue;
      const network = tags.network ?? null;
      result.push({
        osmId: e.id,
        name: tags.name,
        nameDe: tags["name:de"] ?? null,
        ref: tags.ref,
        sac: tags.sac_scale ?? null,
        network,
        bboxDiagKm: bboxDiagonalKm(e.bounds),
        rank: rankOf(network),
      });
    }
    return result;
  }

  const [nwnElements, rwnElements, lwnElements] = await Promise.all([
    runOverpass<OverpassTagsElement>(makeQuery("nwn"), httpTimeout).catch((err) => {
      log.warn({ err }, "fetchSwissNumberedIndex: nwn-Query fehlgeschlagen");
      return [] as OverpassTagsElement[];
    }),
    runOverpass<OverpassTagsElement>(makeQuery("rwn"), httpTimeout).catch((err) => {
      log.warn({ err }, "fetchSwissNumberedIndex: rwn-Query fehlgeschlagen");
      return [] as OverpassTagsElement[];
    }),
    runOverpass<OverpassTagsElement>(makeQuery("lwn"), httpTimeout).catch((err) => {
      log.warn({ err }, "fetchSwissNumberedIndex: lwn-Query fehlgeschlagen");
      return [] as OverpassTagsElement[];
    }),
  ]);

  const seen = new Set<number>();
  const index: RouteIndexEntry[] = [];
  for (const entry of [
    ...parseElements(nwnElements, 1, 7),      // national: 1–7
    ...parseElements(rwnElements, 22, 99),    // regional: 22–99
    ...parseElements(lwnElements, 101, 999),  // lokal: 101–999
  ]) {
    if (!seen.has(entry.osmId)) {
      seen.add(entry.osmId);
      index.push(entry);
    }
  }

  log.info(
    { nwn: nwnElements.length, rwn: rwnElements.length, lwn: lwnElements.length, indexed: index.length },
    "Overpass: Schweiz-nummerierte-Routen-Index geladen",
  );
  return index;
}

/**
 * Wegoberflaechenabschnitte (OSM surface-Tags) aller Haupt-Ways einer Route.
 * Wird einmal pro osmId gecacht (1 h TTL).
 */
export interface RouteSurfacePoint {
  surface: string;
  lat: number;
  lng: number;
}

interface OverpassWayWithTags {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

const surfaceCache = new Map<number, { at: number; points: RouteSurfacePoint[] }>();
const SURFACE_TTL_MS = 60 * 60 * 1000; // 1 Stunde

export async function fetchRouteSurfaces(osmId: number): Promise<RouteSurfacePoint[]> {
  const hit = surfaceCache.get(osmId);
  if (hit && Date.now() - hit.at < SURFACE_TTL_MS) return hit.points;

  const query = [
    "[out:json][timeout:15];",
    `relation(id:${osmId});`,
    "way(r);",
    "out tags geom qt;",
  ].join("");

  let elements: OverpassWayWithTags[];
  try {
    elements = await runOverpass<OverpassWayWithTags>(query);
  } catch {
    return [];
  }

  const points: RouteSurfacePoint[] = [];
  for (const el of elements) {
    if (el.type !== "way" || !el.tags?.surface || !el.geometry?.length) continue;
    // Nebenwege (zu kurz oder ohne Bedeutung) ueberspringen
    const first = el.geometry[0];
    points.push({ surface: el.tags.surface, lat: first.lat, lng: first.lon });
  }

  surfaceCache.set(osmId, { at: Date.now(), points });
  return points;
}

/**
 * Phase 2: Geometrie fuer eine Kandidatenauswahl nachladen und zu Punktlisten
 * verketten. Die Abfrage wird blockweise gestellt, damit sie das Overpass-Limit
 * nicht sprengt. Relationen, deren Geometrie sich nicht verketten laesst
 * (points.length < 2), entfallen.
 */
/** Minimale Angaben zu einer oeffentlichen Trinkwasserquelle. */
export interface DrinkingWater {
  osmId: string;
  lat: number;
  lng: number;
  name: string | null;
}

/**
 * Sucht oeffentliche Trinkwasserquellen (amenity=drinking_water) im Umkreis
 * einer Koordinate via Overpass API.
 */
export async function fetchDrinkingWater(
  center: { lat: number; lng: number },
  radiusM: number,
  log: Logger,
): Promise<DrinkingWater[]> {
  const query = [
    "[out:json][timeout:10];",
    `node["amenity"="drinking_water"](around:${radiusM},${center.lat},${center.lng});`,
    "out tags;",
  ].join("");
  const elements = await runOverpass<OverpassPoiElement>(query, 12_000);
  const result: DrinkingWater[] = [];
  for (const e of elements) {
    if (e.lat == null || e.lon == null) continue;
    const tags = e.tags ?? {};
    result.push({
      osmId: `node-${e.id}`,
      lat: e.lat,
      lng: e.lon,
      name: tags.name ?? tags.description ?? null,
    });
  }
  log.info({ count: result.length, radiusM }, "Overpass: Trinkwasser geladen");
  return result;
}

export interface ParkingSpot {
  osmId: string;
  lat: number;
  lng: number;
  name: string | null;
  address: string | null;
  parkingType: string | null;
  capacity: number | null;
}

/**
 * Oeffentliche Parkplaetze und Parkhaeuser im Umkreis einer Koordinate —
 * aus OpenStreetMap ueber Overpass.
 *
 * Filterlogik:
 * - Nur amenity=parking mit parking=surface|multi-storey|underground|rooftop
 *   (schliesst private Garagen-Boxen und Carports aus)
 * - access darf nicht private|customers|permit|no sein
 *   (nur wirklich oeffentlich zugaengliche Anlagen)
 * Nodes: direkte Koordinaten. Ways: Zentroid via `out center`.
 */
export async function fetchParking(
  center: { lat: number; lng: number },
  radiusM: number,
  log: Logger,
): Promise<ParkingSpot[]> {
  // Parktypen die oeffentlich zugaenglich sind:
  // surface = normaler Oberflaechen-Parkplatz
  // multi-storey = Parkhaus
  // underground = Tiefgarage
  // rooftop = Dachparkplatz
  // park_and_ride = P+R-Anlage
  const publicTypes = "surface|multi-storey|underground|rooftop|park_and_ride";
  const accessFilter =
    '["access"!="private"]["access"!="customers"]["access"!="permit"]["access"!="no"]';
  const typeFilter = `["parking"~"${publicTypes}"]`;
  const around = `(around:${radiusM},${center.lat},${center.lng})`;
  const query = [
    "[out:json][timeout:12];",
    "(",
    `node["amenity"="parking"]${typeFilter}${accessFilter}${around};`,
    `way["amenity"="parking"]${typeFilter}${accessFilter}${around};`,
    // Fallback: amenity=parking OHNE parking-Subtag aber mit explizit
    // oeffentlichem Zugang (access=yes oder access=public)
    `node["amenity"="parking"]["access"~"yes|public"]${around};`,
    `way["amenity"="parking"]["access"~"yes|public"]${around};`,
    ");",
    "out center tags;",
  ].join("");
  const elements = await runOverpass<OverpassPoiElement>(query, 14_000);
  // Deduplizieren (Fallback kann Duplikate mit erstem Block erzeugen)
  // Nur grosse Parkplaetze anzeigen:
  // - Parkhaeuser, Tiefgaragen und P+R-Anlagen sind strukturell gross
  // - Oberflaechen-/Dachparkplaetze nur wenn explizit >= 20 Stellplaetze
  const MIN_CAPACITY = 20;
  const ALWAYS_LARGE = new Set(["multi-storey", "underground", "park_and_ride"]);

  const seen = new Set<string>();
  const result: ParkingSpot[] = [];
  for (const e of elements) {
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;
    const key = `${e.type}-${e.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const tags = e.tags ?? {};
    const rawType = tags.parking ?? null;
    const capacity = tags.capacity ? parseInt(tags.capacity, 10) || null : null;

    // Groessen-Filter: strukturell gross ODER genug Stellplaetze angegeben
    const isLarge =
      (rawType && ALWAYS_LARGE.has(rawType)) ||
      (capacity != null && capacity >= MIN_CAPACITY);
    if (!isLarge) continue;

    const street = tags["addr:street"] ?? null;
    const nr     = tags["addr:housenumber"] ?? null;
    const zip    = tags["addr:postcode"] ?? null;
    const city   = tags["addr:city"] ?? tags["addr:municipality"] ?? null;
    const addrParts: string[] = [];
    if (street) addrParts.push(nr ? `${street} ${nr}` : street);
    if (zip || city) addrParts.push([zip, city].filter(Boolean).join(" "));
    const typeLabels: Record<string, string> = {
      "surface": "Parkplatz", "multi-storey": "Parkhaus",
      "underground": "Tiefgarage", "rooftop": "Dachparkplatz",
      "park_and_ride": "P+R",
    };
    result.push({
      osmId: key,
      lat,
      lng,
      name: tags.name ?? tags["name:de"] ?? null,
      address: addrParts.length > 0 ? addrParts.join(", ") : null,
      parkingType: rawType ? (typeLabels[rawType] ?? rawType) : null,
      capacity,
    });
  }
  log.info({ count: result.length, radiusM }, "Overpass: Parkplaetze geladen (nur grosse)");
  return result;
}

interface OverpassRelBodyMember {
  type: string;
  ref: number;
  role?: string;
}

interface OverpassRelBodyElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  members?: OverpassRelBodyMember[];
}

/**
 * Fallback-Lader fuer sehr grosse Routen-Relationen, bei denen `out geom;`
 * auf der ganzen Relation regelmaessig ins Overpass-Timeout laeuft.
 *
 * Vorgehen in kleinen, einzeln guenstigen Abfragen:
 *  1. Nur die Member-Liste der Relation laden (`out body;` — winzig).
 *  2. Sub-Relationen (Etappen) eine Ebene tief expandieren, in Member-
 *     Reihenfolge (wichtig fuer die geordnete Traversierung beim Stitchen).
 *  3. Way-Geometrien in Bloecken nachladen und in der originalen
 *     Member-Reihenfolge wieder zusammensetzen.
 *
 * Gibt `null` zurueck, wenn die Relation NACHWEISLICH keine nutzbare
 * Geometrie hat (keine Way-Member) — Netzwerk-/Timeout-Fehler werfen dagegen
 * weiterhin, damit der Aufrufer sie als "spaeter erneut versuchen" behandelt.
 */
export async function fetchRouteGeometryChunked(
  osmId: number,
  log: Logger,
): Promise<RawHikingRoute | null> {
  const CHUNK_TIMEOUT_MS = 55_000;
  const WAY_BATCH = 120;

  const ladeRelationBody = async (id: number): Promise<OverpassRelBodyElement | null> => {
    const els = await runOverpass<OverpassRelBodyElement>(
      `[out:json][timeout:50];relation(${id});out body;`,
      CHUNK_TIMEOUT_MS,
    );
    return els.find((e) => e.type === "relation" && e.id === id) ?? null;
  };

  const relation = await ladeRelationBody(osmId);
  if (!relation?.members?.length) {
    log.warn({ osmId }, "Chunked-Lader: Relation ohne Member");
    return null;
  }

  // Way-Member in Reihenfolge sammeln; Sub-Relationen (Etappen) eine Ebene
  // tief expandieren. Nebenrollen (Varianten/Zubringer) ueberspringen.
  // Wichtig: transient gescheiterte Etappen-Abfragen zaehlen — solange auch
  // nur eine Etappe unklar ist, darf das Ergebnis NIE als "nachweislich ohne
  // Geometrie" (null) gewertet werden, sonst wuerde der Aufrufer eine bloss
  // temporaer nicht ladbare Route dauerhaft als unenrichable markieren.
  const wayMembers: OverpassRelBodyMember[] = [];
  let etappenFehler = 0;
  for (const m of relation.members) {
    if (m.role && NEBENROLLEN.has(m.role.trim().toLowerCase())) continue;
    if (m.type === "way") {
      wayMembers.push(m);
    } else if (m.type === "relation") {
      try {
        await sleep(1_000);
        const sub = await ladeRelationBody(m.ref);
        for (const sm of sub?.members ?? []) {
          if (sm.type !== "way") continue;
          if (sm.role && NEBENROLLEN.has(sm.role.trim().toLowerCase())) continue;
          wayMembers.push(sm);
        }
      } catch (err) {
        // Einzelne Etappe nicht ladbar → Rest trotzdem versuchen; laengsteKette
        // schneidet entstehende Luecken spaeter weg.
        etappenFehler++;
        log.warn({ osmId, subRelation: m.ref, err }, "Chunked-Lader: Etappe uebersprungen");
      }
    }
  }
  if (!wayMembers.length) {
    if (etappenFehler > 0) {
      // Unklarer Zustand: Etappen konnten nicht geladen werden — retryable
      // Fehler werfen statt faelschlich "keine Geometrie" zu behaupten.
      throw new Error(
        `Chunked-Lader: ${etappenFehler} Etappe(n) nicht ladbar — spaeter erneut versuchen`,
      );
    }
    log.warn({ osmId }, "Chunked-Lader: keine Way-Member — nicht anreicherbar");
    return null;
  }

  // Way-Geometrien blockweise laden (dedupliziert, aber Reihenfolge bleibt
  // ueber wayMembers erhalten).
  const uniqueIds = [...new Set(wayMembers.map((m) => m.ref))];
  const geomById = new Map<number, { lat: number; lon: number }[]>();
  for (let i = 0; i < uniqueIds.length; i += WAY_BATCH) {
    const batch = uniqueIds.slice(i, i + WAY_BATCH);
    if (i > 0) await sleep(1_500);
    const els = await runOverpass<OverpassWayGeomElement>(
      `[out:json][timeout:50];way(id:${batch.join(",")});out geom;`,
      CHUNK_TIMEOUT_MS,
    );
    for (const w of els) {
      if (w.type === "way" && w.geometry && w.geometry.length >= 2) {
        geomById.set(w.id, w.geometry);
      }
    }
  }

  const members: OverpassGeomMember[] = wayMembers
    .map((m): OverpassGeomMember => ({ type: "way", role: m.role, geometry: geomById.get(m.ref) }))
    .filter((m) => !!m.geometry && m.geometry.length >= 2);
  const points = stitchGeometry(members);
  if (points.length < 2) {
    if (etappenFehler > 0 || geomById.size < uniqueIds.length) {
      // Nicht alle Daten kamen an → retryable, nicht "bewiesen leer".
      throw new Error("Chunked-Lader: unvollstaendige Daten — spaeter erneut versuchen");
    }
    log.warn({ osmId, ways: wayMembers.length, geladen: geomById.size }, "Chunked-Lader: Stitch ergab keine Kette");
    return null;
  }

  const tags = relation.tags ?? {};
  log.info(
    { osmId, ways: uniqueIds.length, punkte: points.length },
    "Chunked-Lader: Geometrie zusammengesetzt",
  );
  return {
    id: `osm-${osmId}`,
    osmId,
    name: tags.name ?? `Wanderroute ${osmId}`,
    ref: tags.ref ?? null,
    sac: tags.sac_scale ?? null,
    network: tags.network ?? null,
    points,
  };
}

export async function fetchRouteGeometries(
  osmIds: number[],
  log: Logger,
  opts?: { timeoutMs?: number; batchSize?: number; pauseMs?: number },
): Promise<RawHikingRoute[]> {
  if (osmIds.length === 0) return [];
  const batchSize  = opts?.batchSize  ?? GEOMETRY_BATCH;
  const timeoutMs  = opts?.timeoutMs  ?? REQUEST_TIMEOUT_MS;
  const pauseMs    = opts?.pauseMs    ?? 0;
  const ovTimeout  = Math.ceil(timeoutMs / 1000);
  const routes: RawHikingRoute[] = [];
  for (let i = 0; i < osmIds.length; i += batchSize) {
    const batch = osmIds.slice(i, i + batchSize);
    const query = [
      `[out:json][timeout:${ovTimeout}];`,
      `relation(id:${batch.join(",")});`,
      "out geom;",
    ].join("");
    if (i > 0 && pauseMs > 0) await sleep(pauseMs);
    const geom = await runOverpass<OverpassGeomElement>(query, timeoutMs);
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
