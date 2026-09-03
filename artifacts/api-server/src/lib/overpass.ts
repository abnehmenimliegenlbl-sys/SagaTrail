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
  /** Amtliche Distanz (km) aus dem OSM-Tag `distance` (SchweizMobil-Angabe), falls vorhanden. */
  distanceTagKm: number | null;
  /** Amtlicher Aufstieg (m) aus dem OSM-Tag `ascent`, falls vorhanden. */
  ascentTagM: number | null;
  /** OSM `from`/`to` Tags — Startort und Zielort der Route. */
  from: string | null;
  to: string | null;
}

/**
 * Parst numerische OSM-Tags wie `distance`/`ascent` ("8", "8.2 km", "1,250").
 * Liefert null bei fehlendem oder unbrauchbarem Wert.
 */
export function parseNumericTag(
  value: string | undefined,
  max = Infinity,
): number | null {
  if (!value) return null;
  let s = value.trim().replace(/['\s\u00a0]/g, "");
  // Komma: Tausendertrenner ("1,250" → 1250) vs. Dezimaltrenner ("8,2" → 8.2)
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  const v = parseFloat(s.replace(/[^0-9.]/g, ""));
  // Plausibilitaetsgrenze: absurde Tag-Werte nie als amtlich uebernehmen.
  return Number.isFinite(v) && v > 0 && v <= max ? v : null;
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
  ref?: number;
  role?: string;
  geometry?: { lat: number; lon: number }[];
}

interface OverpassGeomElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  members?: OverpassGeomMember[];
}

export async function runOverpass<T>(query: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T[]> {
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
function stitchGeometry(
  members: OverpassGeomMember[],
  opts?: { behalteAlleKetten?: boolean },
): LatLng[] {
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

  // Standard: nur die laengste zusammenhaengende Kette behalten (verhindert
  // Zickzack-Artefakte bei Figur-8-Routen). Bei nachweislich zu kurzem
  // Ergebnis (amtliche Distanz aus OSM-Tags deutlich groesser) verbindet der
  // Aufrufer per behalteAlleKetten alle Teilstuecke in Memberreihenfolge —
  // kleine Luecken werden dann als direkte Verbindung ueberbrueckt.
  const hauptkette = opts?.behalteAlleKetten
    ? kette
    : laengsteKette(kette, ARTEFAKT_LUECKE_M);
  return korrigiereZickzack(hauptkette);
}

/** Streckenlaenge einer Punktliste in km (fuer Plausibilitaetspruefungen). */
function kettenLaengeKm(points: LatLng[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++) m += haversineM(points[i - 1]!, points[i]!);
  return m / 1000;
}

/**
 * Stitcht eine Relation und prueft das Ergebnis gegen die amtliche Distanz
 * aus den OSM-Tags: faellt die Hauptkette deutlich zu kurz aus (< 75% der
 * amtlichen Laenge), sind Teilstuecke durch Luecken > ARTEFAKT_LUECKE_M
 * abgeschnitten worden (z.B. Route 831 Rigi Scheidegg) — dann werden alle
 * Ketten in Memberreihenfolge verbunden, sofern das dem Amtswert naeher kommt.
 */
function stitchMitTagPruefung(
  members: OverpassGeomMember[],
  tags: Record<string, string>,
): LatLng[] {
  const standard = stitchGeometry(members);
  const amtlichKm = parseNumericTag(tags.distance, 5_000);
  if (!amtlichKm || standard.length < 2) return standard;
  const standardKm = kettenLaengeKm(standard);
  if (standardKm >= amtlichKm * 0.75) return standard;
  const voll = stitchGeometry(members, { behalteAlleKetten: true });
  if (voll.length < 2) return standard;
  const vollKm = kettenLaengeKm(voll);
  // Nur uebernehmen wenn die Vollversion naeher am Amtswert liegt und nicht
  // absurd ueberschiesst (Hin+Rueck doppelt erfasst o.ae.).
  return Math.abs(vollKm - amtlichKm) < Math.abs(standardKm - amtlichKm) &&
    vollKm <= amtlichKm * 1.6
    ? voll
    : standard;
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
  elevation: number | null;
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
 * Laedt historische, touristische und alpine Orte innerhalb einer Bounding Box.
 * Bewusst auf benannte Orte begrenzt, damit nur POIs geliefert werden, die
 * sich sinnvoll erzaehlen lassen.
 *
 * Abgedeckte Kategorien:
 *  • historic=*          — Burgen, Ruinen, Denkmäler, Wegkreuze, …
 *  • tourism=attraction|viewpoint|artwork|information — Sehenswürdigkeiten, Infotafeln
 *  • natural=peak|saddle|waterfall|cave_entrance|glacier|rock|arch|gorge
 *                        — Gipfel, Pässe, Wasserfälle, Höhlen, Gletscher, Schluchten
 *  • man_made=cross|obelisk — Gipfel-/Wegkreuze (auch ohne Namen → «Wegkreuz»)
 *  • amenity=place_of_worship + chapel/shrine — Kapellen
 *  • amenity=shelter      — Alpine Unterstände / Biwakschachteln
 *  • geological=erratic|moraine|* — Findlinge, Moränen (auch ohne Namen)
 *
 * Warum ohne Namen für cross/ruins/shelter/geological:
 *  Wegkreuze, Ruinen und Findlinge haben in OSM sehr oft KEINEN name-Tag.
 *  Für diese Kategorien wird ein Fallback-Name generiert (z. B. «Wegkreuz»,
 *  «Ruine», «Findling»), damit sie trotzdem als POIs erscheinen.
 */
export async function fetchHistoricPois(
  bbox: { south: number; west: number; north: number; east: number },
  log: Logger,
): Promise<RawPoi[]> {
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const query = [
    "[out:json][timeout:22];",
    "(",
    // Historic benannt (Burgen, Denkmäler, Kapellen, …)
    `node["historic"]["name"](${b});`,
    `way["historic"]["name"](${b});`,
    // Historic OHNE Namen: Ruinen, Fundstätten, röm. Reste → Fallback-Name
    `node["historic"~"^(ruins|archaeological_site|fort|roman_road|roman_villa|roman_building|battlefield)$"](${b});`,
    `way["historic"~"^(ruins|archaeological_site|fort|roman_road|roman_villa|roman_building|battlefield)$"](${b});`,
    // Tourismus: Sehenswürdigkeiten, Aussichtspunkte, Kunstwerke, Infotafeln
    `node["tourism"~"^(attraction|viewpoint|artwork|information)$"]["name"](${b});`,
    `way["tourism"~"^(attraction|viewpoint)$"]["name"](${b});`,
    // Alpine Naturmerkmale
    `node["natural"~"^(peak|saddle|waterfall|cave_entrance|glacier|rock|arch|spring|gorge)$"]["name"](${b});`,
    `way["natural"~"^(waterfall|glacier|cave_entrance|gorge)$"]["name"](${b});`,
    // Gipfel-/Wegkreuze und Obelisken — OHNE Namen-Filter, Fallback «Wegkreuz»
    `node["man_made"~"^(cross|obelisk)$"](${b});`,
    // Kapellen und Wegkapellen
    `node["amenity"="place_of_worship"]["building"~"^(chapel|wayside_shrine|shrine)$"]["name"](${b});`,
    `node["amenity"="place_of_worship"]["historic"~"^(chapel|wayside_shrine)$"]["name"](${b});`,
    // Alpine Unterstände / Biwakschachteln — Fallback «Unterstand»
    `node["amenity"="shelter"](${b});`,
    // Geologische Merkmale: Findlinge, Moränen — Fallback-Name aus Tag-Wert
    `node["geological"](${b});`,
    ");",
    "out center tags;",
  ].join("");
  // HTTP-Timeout etwas ueber dem Overpass-internen Timeout (22 s):
  // Groessere Query (shelter, geological, ruins ohne Namen) braucht mehr Zeit.
  const POI_HTTP_TIMEOUT_MS = 26_000;
  const elements = await runOverpass<OverpassPoiElement>(query, POI_HTTP_TIMEOUT_MS);
  const result: RawPoi[] = [];
  for (const e of elements) {
    const tags = e.tags ?? {};
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;

    // Fallback-Namen für Kategorien die in OSM oft keinen name-Tag haben:
    //  • man_made=cross    → «Wegkreuz» / «Gipfelkreuz»
    //  • historic=ruins    → «Ruine» (+ alt_name wenn vorhanden)
    //  • historic=archaeological_site → «Archäologischer Fundort»
    //  • historic=fort/roman_road/… → Typ-Label
    //  • amenity=shelter   → «Unterstand» / «Biwakschachtel»
    //  • geological=erratic/moraine → «Findling» / «Moräne»
    let name = tags.name || tags.alt_name || tags.old_name || "";
    if (!name) {
      const h = tags.historic;
      const mm = tags["man_made"];
      const am = tags.amenity;
      const ge = tags.geological;
      if      (mm === "cross")                name = "Wegkreuz";
      else if (mm === "obelisk")              name = "Obelisk";
      else if (h === "ruins")                 name = "Ruine";
      else if (h === "archaeological_site")   name = "Archäologischer Fundort";
      else if (h === "fort")                  name = "Befestigungsanlage";
      else if (h === "roman_road")            name = "Römerstrasse";
      else if (h === "roman_villa")           name = "Römische Villa";
      else if (h === "roman_building")        name = "Römisches Gebäude";
      else if (h === "battlefield")           name = "Schlachtfeld";
      else if (am === "shelter")              name = tags.ref ? `Unterstand ${tags.ref}` : "Unterstand";
      else if (ge === "erratic")              name = "Findling";
      else if (ge === "moraine")              name = "Moräne";
      else if (ge)                            name = ge; // andere geologische Merkmale
      else continue; // kein sinnvoller Name ableitbar → überspringen
    }

    // kind: priorisiert in Reihenfolge der kartografischen Wichtigkeit
    let kind: string;
    if (tags.natural)          kind = `natural=${tags.natural}`;
    else if (tags.geological)  kind = `geological=${tags.geological}`;
    else if (tags.historic)    kind = `historic=${tags.historic}`;
    else if (tags.tourism)     kind = `tourism=${tags.tourism}`;
    else if (tags["man_made"]) kind = `man_made=${tags["man_made"]}`;
    else if (tags.amenity)     kind = `amenity=${tags.amenity}`;
    else                       kind = "unknown";

    result.push({
      id: `${e.type}-${e.id}`,
      name,
      kind,
      lat,
      lng,
      elevation: tags.ele != null ? (parseFloat(tags.ele) || null) : null,
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
const ALPINE_HUT_CACHE_MAX = 50;
const alpineHutCache = new Map<string, { at: number; entries: RawAlpineHut[] }>();
function alpineHutCacheSet(key: string, entries: RawAlpineHut[]): void {
  if (alpineHutCache.size >= ALPINE_HUT_CACHE_MAX) { const k = alpineHutCache.keys().next().value; if (k !== undefined) alpineHutCache.delete(k); }
  alpineHutCache.set(key, { at: Date.now(), entries });
}

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
    alpineHutCacheSet(key, winner);
    log.info({ count: winner.length, radiusM, source: "overpass" }, "Alpine Huts geladen");
    return winner;
  }

  // Seed sofort zurueckgeben; Overpass laeuft weiter und aktualisiert Cache
  alpineHutCacheSet(key, seed);
  log.warn({ count: seed.length, radiusM, source: "seed" }, "Alpine Huts: Seed-Fallback (Overpass zu langsam/nicht erreichbar)");
  overpassFetch.then((r) => {
    if (r !== null && r.length > 0) {
      alpineHutCacheSet(key, r);
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
 * Loest eine nummerierte SchweizMobil-Route (network + ref, optional Etappe)
 * auf ihre OSM-Relations-ID auf. Wird fuer Alt-Datensaetze mit IDs wie
 * "schweizmobil-rwn-92" oder "placeholder-nwn-5-etappe-13" gebraucht, die
 * keine OSM-ID im Schluessel tragen.
 *
 * Liefert null, wenn Overpass antwortet, aber keine passende Relation
 * existiert (dauerhaft nicht aufloesbar). Netzwerkfehler werfen.
 */
const numberedIndexCache = new Map<string, { elements: OverpassTagsElement[]; ts: number }>();
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

const SURFACE_CACHE_MAX = 100;
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

  if (surfaceCache.size >= SURFACE_CACHE_MAX) { const k = surfaceCache.keys().next().value; if (k !== undefined) surfaceCache.delete(k); }
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

export interface RawSafetyPoi {
  osmId: string;
  category: "toilet" | "pharmacy" | "hospital" | "clinic" | "police" | "fire" | "defibrillator" | "assembly_point" | "emergency_phone" | "shelter";
  name: string;
  lat: number;
  lng: number;
  description: string | null;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
}

/** Sicherheitsrelevante Infrastruktur getrennt von den erzählbaren POIs. */
export async function fetchSafetyPois(
  center: { lat: number; lng: number },
  radiusM: number,
  log: Logger,
): Promise<RawSafetyPoi[]> {
  const deltaLat = radiusM / 111_000;
  const deltaLng = radiusM / (111_000 * Math.max(0.2, Math.cos((center.lat * Math.PI) / 180)));
  const b = `${center.lat - deltaLat},${center.lng - deltaLng},${center.lat + deltaLat},${center.lng + deltaLng}`;
  const query = [
    "[out:json][timeout:18];(",
    `node["amenity"~"^(toilets|pharmacy|hospital|police|fire_station)$"](${b});`,
    `way["amenity"~"^(toilets|pharmacy|hospital|police|fire_station)$"](${b});`,
    `node["healthcare"](${b});`,
    `way["healthcare"](${b});`,
    `node["emergency"~"^(defibrillator|assembly_point|phone)$"](${b});`,
    `way["emergency"~"^(defibrillator|assembly_point|phone)$"](${b});`,
    `node["amenity"="shelter"](${b});`,
    `way["amenity"="shelter"](${b});`,
    ");out center tags;",
  ].join("");
  const elements = await runOverpass<OverpassPoiElement>(query, 22_000);
  const names: Record<RawSafetyPoi["category"], string> = {
    toilet: "Toilette",
    pharmacy: "Apotheke",
    hospital: "Spital",
    clinic: "Gesundheitszentrum",
    police: "Polizei",
    fire: "Feuerwehr",
    defibrillator: "Defibrillator",
    assembly_point: "Notfall-Sammelpunkt",
    emergency_phone: "Notruftelefon",
    shelter: "Unterstand",
  };
  const result: RawSafetyPoi[] = [];
  const seen = new Set<string>();
  for (const e of elements) {
    const tags = e.tags ?? {};
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (lat == null || lng == null) continue;
    const category: RawSafetyPoi["category"] =
      tags.amenity === "toilets" ? "toilet"
      : tags.amenity === "pharmacy" ? "pharmacy"
      : tags.amenity === "hospital" || tags.healthcare === "hospital" ? "hospital"
      : tags.healthcare ? "clinic"
      : tags.amenity === "police" ? "police"
      : tags.amenity === "fire_station" ? "fire"
      : tags.emergency === "defibrillator" ? "defibrillator"
      : tags.emergency === "assembly_point" ? "assembly_point"
      : tags.emergency === "phone" ? "emergency_phone"
      : "shelter";
    const osmId = `${e.type}-${e.id}`;
    if (seen.has(osmId)) continue;
    seen.add(osmId);
    result.push({
      osmId,
      category,
      name: tags.name || tags["name:de"] || names[category],
      lat,
      lng,
      description: [
        tags.description,
        tags.operator,
        tags.access && tags.access !== "yes" ? `Zugang: ${tags.access}` : null,
      ].filter(Boolean).join(" · ") || null,
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
      openingHours: tags.opening_hours ?? null,
    });
  }
  log.info({ center, radiusM, count: result.length }, "Overpass: Sicherheits-POIs geladen");
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
  const points = stitchMitTagPruefung(members, relation.tags ?? {});
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
    distanceTagKm: parseNumericTag(tags.distance, 5_000),
    ascentTagM: parseNumericTag(tags.ascent, 100_000),
    from: tags.from ?? null,
    to: tags.to ?? null,
  };
}

/**
 * Wie fetchRouteGeometryChunked, aber expandiert Member-Relationen ZWEI Ebenen
 * tief: Super-Relation → Parent-Route-Relationen → Etappen-Relationen → Ways.
 * Notwendig für NWN/RWN-Superrouten, deren OSM-Hierarchie drei Stufen hat und
 * bei denen fetchRouteGeometryChunked (1 Ebene) keine Way-Member findet.
 */
export async function fetchRouteSuperDeep(
  osmId: number,
  log: Logger,
): Promise<RawHikingRoute | null> {
  const CHUNK_TIMEOUT_MS = 55_000;
  const WAY_BATCH = 120;
  const MAX_DEPTH = 2;

  const ladeRelationBody = async (id: number): Promise<OverpassRelBodyElement | null> => {
    const els = await runOverpass<OverpassRelBodyElement>(
      `[out:json][timeout:50];relation(${id});out body;`,
      CHUNK_TIMEOUT_MS,
    );
    return els.find((e) => e.type === "relation" && e.id === id) ?? null;
  };

  const relation = await ladeRelationBody(osmId);
  if (!relation?.members?.length) {
    log.warn({ osmId }, "SuperDeep: Relation ohne Member");
    return null;
  }

  const wayMembers: OverpassRelBodyMember[] = [];
  let fehler = 0;

  // Rekursive Expansion bis MAX_DEPTH Ebenen tief
  const expand = async (members: OverpassRelBodyMember[], depth: number): Promise<void> => {
    for (const m of members) {
      if (m.role && NEBENROLLEN.has(m.role.trim().toLowerCase())) continue;
      if (m.type === "way") {
        wayMembers.push(m);
      } else if (m.type === "relation" && depth < MAX_DEPTH) {
        try {
          await sleep(600);
          const sub = await ladeRelationBody(m.ref);
          if (sub?.members?.length) {
            await expand(sub.members, depth + 1);
          }
        } catch (err) {
          fehler++;
          log.warn({ osmId, subRef: m.ref, depth, err }, "SuperDeep: Sub-Relation übersprungen");
        }
      }
    }
  };

  await expand(relation.members, 0);

  if (!wayMembers.length) {
    if (fehler > 0) {
      throw new Error(`SuperDeep: ${fehler} Sub-Relation(en) nicht ladbar — spaeter erneut versuchen`);
    }
    log.warn({ osmId }, "SuperDeep: keine Way-Member nach 2-Ebenen-Expansion");
    return null;
  }

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

  const points = stitchMitTagPruefung(members, relation.tags ?? {});
  if (points.length < 2) {
    if (fehler > 0 || geomById.size < uniqueIds.length) {
      throw new Error("SuperDeep: unvollstaendige Daten — spaeter erneut versuchen");
    }
    log.warn({ osmId, ways: wayMembers.length, geladen: geomById.size }, "SuperDeep: Stitch ergab keine Kette");
    return null;
  }

  const tags = relation.tags ?? {};
  log.info({ osmId, ways: uniqueIds.length, punkte: points.length }, "SuperDeep: Geometrie zusammengesetzt");
  return {
    id: `osm-${osmId}`,
    osmId,
    name: tags.name ?? `Wanderroute ${osmId}`,
    ref: tags.ref ?? null,
    sac: tags.sac_scale ?? null,
    network: tags.network ?? null,
    points,
    distanceTagKm: parseNumericTag(tags.distance, 5_000),
    ascentTagM: parseNumericTag(tags.ascent, 100_000),
    from: tags.from ?? null,
    to: tags.to ?? null,
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
      const tags = g.tags ?? {};
      const points = stitchMitTagPruefung(g.members, tags);
      if (points.length < 2) continue;
      routes.push({
        id: `osm-${g.id}`,
        osmId: g.id,
        name: tags.name ?? `Wanderroute ${g.id}`,
        ref: tags.ref ?? null,
        sac: tags.sac_scale ?? null,
        network: tags.network ?? null,
        points,
        distanceTagKm: parseNumericTag(tags.distance, 500),
        ascentTagM: parseNumericTag(tags.ascent, 20000),
        from: tags.from ?? null,
        to: tags.to ?? null,
      });
    }
  }
  log.info(
    { requested: osmIds.length, stitched: routes.length },
    "Overpass: Geometrie geladen",
  );
  return routes;
}

/** OSM-Metadaten für den Rückwärtsschleifen-Report. Die Geometrie wird
 * absichtlich nicht gestitcht: für die Erklärung eines Befunds sind die
 * originalen Way-Referenzen und ihre Wiederholungen maßgeblich. */
export interface RouteLoopAuditOsm {
  osmId: number;
  roundtrip: string | null;
  wayRefs: number[];
}

/** Returns repeated OSM way references in encounter order, without duplicates. */
export function findDuplicateWayRefs(wayRefs: number[]): number[] {
  return [...new Set(wayRefs.filter((way, index) => wayRefs.indexOf(way) !== index))];
}

export function reverseLoopExplanation(roundtrip: string | null, wayRefs: number[]): string[] {
  const reasons: string[] = [];
  if (roundtrip?.toLowerCase() === "yes") reasons.push("OSM roundtrip=yes");
  const duplicateWays = findDuplicateWayRefs(wayRefs);
  if (duplicateWays.length > 0) {
    reasons.push(`OSM-Way mehrfach referenziert (${duplicateWays.length}: ${duplicateWays.slice(0, 5).join(", ")})`);
  }
  return reasons;
}

export async function fetchRouteLoopAuditOsm(
  osmIds: number[],
  log: Logger,
): Promise<RouteLoopAuditOsm[]> {
  if (osmIds.length === 0) return [];
  const BATCH = 40;
  const result: RouteLoopAuditOsm[] = [];
  for (let i = 0; i < osmIds.length; i += BATCH) {
    const chunk = osmIds.slice(i, i + BATCH);
    const query = `[out:json][timeout:40];relation(id:${chunk.join(",")});out body geom;`;
    const elements = await runOverpass<OverpassGeomElement>(query, 45_000).catch((err) => {
      log.warn({ err, chunk: chunk.slice(0, 5) }, "fetchRouteLoopAuditOsm: Overpass-Fehler");
      return [] as OverpassGeomElement[];
    });
    for (const el of elements) {
      if (el.type !== "relation") continue;
      result.push({
        osmId: el.id,
        roundtrip: el.tags?.roundtrip ?? null,
        wayRefs: (el.members ?? [])
          .filter((member) => member.type === "way" && typeof member.ref === "number")
          .map((member) => member.ref as number),
      });
    }
    if (i + BATCH < osmIds.length) await sleep(500);
  }
  return result;
}

const NUMBERED_INDEX_TTL_MS = 60 * 60_000;

export async function resolveNumberedRouteOsmId(
  network: string,
  ref: string,
  opts: { etappe?: number; nameHint?: string | null },
  log: Logger,
): Promise<number | null> {
  // Kompletten Netzwerk-Index einmal laden und 1 h cachen — eine Overpass-
  // Anfrage pro Netzwerk statt einer pro Route (Drosselungs-Schonung).
  const cached = numberedIndexCache.get(network);
  let all: OverpassTagsElement[];
  if (cached && Date.now() - cached.ts < NUMBERED_INDEX_TTL_MS) {
    all = cached.elements;
  } else {
    const CH_BBOX = "45.8,5.95,47.85,10.5";
    const query = [
      `[out:json][timeout:90][bbox:${CH_BBOX}];`,
      `relation["route"="hiking"]["network"="${network}"];`,
      `out tags bb;`,
    ].join("");
    all = await runOverpass<OverpassTagsElement>(query, 120_000);
    numberedIndexCache.set(network, { elements: all, ts: Date.now() });
    log.info({ network, relations: all.length }, "resolveNumberedRoute: Netzwerk-Index geladen");
  }
  const elements = all.filter((e) => (e.tags?.ref ?? "") === ref);
  if (!elements.length) return null;

  const etappeRegex = (n: number) =>
    new RegExp(`(?:Etappe|Étape|Etape|Tappa|Stage)\\s*0?${n}(?:\\b|:)`, "i");
  const anyEtappe = /(?:Etappe|Étape|Etape|Tappa|Stage)\s*\d+/i;

  const named = elements.map((e) => ({
    id: e.id,
    name: `${e.tags?.name ?? ""} ${e.tags?.["name:de"] ?? ""}`.trim(),
    diag: e.bounds ? bboxDiagonalKm(e.bounds) : 0,
  }));

  if (opts.etappe != null) {
    const re = etappeRegex(opts.etappe);
    const match = named.find((e) => re.test(e.name));
    if (match) return match.id;
    log.info({ network, ref, etappe: opts.etappe }, "resolveNumberedRoute: keine Etappen-Relation gefunden");
    return null;
  }

  // Gesamtroute: Etappen-Relationen ausschliessen, groesste Bounding Box gewinnt
  // (die Parent-/Superroute umfasst alle Etappen).
  const kandidaten = named.filter((e) => !anyEtappe.test(e.name));
  const pool = kandidaten.length ? kandidaten : named;
  pool.sort((a, b) => b.diag - a.diag);
  return pool[0]?.id ?? null;
}

/**
 * Holt ALLE Schweizer Wanderrouten-Relationen eines Netzwerks (rwn/nwn/lwn) mit
 * numerischem ref in einem Bereich. Eine einzige Overpass-Abfrage für alle Refs.
 * Liefert from/to/name/nameDe/ref/network je Relation.
 */
export interface OsmRouteEntry {
  osmId: number;
  ref: number;
  name: string | null;
  nameDe: string | null;
  from: string | null;
  to: string | null;
  network: string | null;
}

export async function fetchOsmRoutesInRange(
  refMin: number,
  refMax: number,
  log: Logger,
): Promise<OsmRouteEntry[]> {
  const CH_BBOX = "45.8,5.95,47.85,10.5";
  // Eine einzige Abfrage für alle Netzwerktypen
  const query = `[out:json][timeout:60][bbox:${CH_BBOX}];
(
  relation["route"="hiking"]["network"="rwn"]["ref"~"^[0-9]+$"];
  relation["route"="hiking"]["network"="nwn"]["ref"~"^[0-9]+$"];
);
out tags;`;

  const elements = await runOverpass<OverpassTagsElement>(query, 70_000).catch((err) => {
    log.warn({ err }, "fetchOsmRoutesInRange: Overpass-Fehler");
    return [] as OverpassTagsElement[];
  });

  const results: OsmRouteEntry[] = [];
  for (const el of elements) {
    const t = el.tags ?? {};
    const refNum = parseInt(t.ref ?? "", 10);
    if (isNaN(refNum) || refNum < refMin || refNum > refMax) continue;
    results.push({
      osmId: el.id,
      ref: refNum,
      name: t.name ?? null,
      nameDe: t["name:de"] ?? null,
      from: t.from ?? null,
      to: t.to ?? null,
      network: t.network ?? null,
    });
  }
  return results;
}

/**
 * Sucht alle Wanderrouten-Relationen mit gegebenem ref im CH-Bbox und gibt ihre Tags zurück.
 * Nützlich um fehlende Etappen einer nummerierten Route in OSM aufzuspüren.
 */
export async function fetchOsmRelationsByRef(
  ref: string,
  log: Logger,
): Promise<{ osmId: number; name: string | null; nameDe: string | null; from: string | null; to: string | null; network: string | null }[]> {
  const CH_BBOX = "45.8,5.95,47.85,10.5";
  const query = `[out:json][timeout:30][bbox:${CH_BBOX}];relation["route"="hiking"]["ref"="${ref}"];out tags;`;
  const elements = await runOverpass<OverpassTagsElement>(query, 35_000).catch((err) => {
    log.warn({ err, ref }, "fetchOsmRelationsByRef: Overpass-Fehler");
    return [] as OverpassTagsElement[];
  });
  return elements.map((el) => {
    const t = el.tags ?? {};
    return {
      osmId: el.id,
      name: t.name ?? null,
      nameDe: t["name:de"] ?? null,
      from: t.from ?? null,
      to: t.to ?? null,
      network: t.network ?? null,
    };
  });
}

export interface OsmRouteDifficulty {
  osmId: number;
  ref: string;
  name: string | null;
  network: string | null;
  sacScale: string | null;
}

/**
 * Holt die SAC-Tags aller Wanderrouten-Relationen für mehrere refs in wenigen
 * Overpass-Abfragen. Ein ref kann Parent und Etappen haben; der Aufrufer muss
 * widersprüchliche Werte daher als Konflikt behandeln.
 */
export async function fetchOsmRouteDifficulties(
  refs: string[],
  log: Logger,
): Promise<OsmRouteDifficulty[]> {
  const numericRefs = [...new Set(refs.map((ref) => ref.trim()).filter((ref) => /^\d+$/.test(ref)))];
  if (numericRefs.length === 0) return [];
  const BATCH = 60;
  const result: OsmRouteDifficulty[] = [];
  for (let i = 0; i < numericRefs.length; i += BATCH) {
    const batch = numericRefs.slice(i, i + BATCH);
    const refPattern = batch.join("|");
    const query = [
      "[out:json][timeout:60];",
      `relation["route"="hiking"]["ref"~"^(${refPattern})$"][bbox:45.8,5.95,47.85,10.5];`,
      "out tags;",
    ].join("");
    const elements = await runOverpass<OverpassTagsElement>(query, 65_000).catch((err) => {
      log.warn({ err, batch: batch.slice(0, 5) }, "fetchOsmRouteDifficulties: Overpass-Fehler");
      return [] as OverpassTagsElement[];
    });
    for (const el of elements) {
      const tags = el.tags ?? {};
      if (!tags.ref || !numericRefs.includes(tags.ref)) continue;
      result.push({
        osmId: el.id,
        ref: tags.ref,
        name: tags["name:de"] ?? tags.name ?? null,
        network: tags.network ?? null,
        sacScale: tags.sac_scale ?? null,
      });
    }
    if (i + BATCH < numericRefs.length) await sleep(700);
  }
  return result;
}

/**
 * Holt Tags (from, to, name, ref) fuer eine Liste von OSM-Relations-IDs direkt
 * per Overpass. Wird vom fill-vonbis-Endpoint genutzt, um fehlende Von-Bis-
 * Angaben aus OSM nachzufuellen, statt sie per Reverse-Geocoding zu raten.
 */
export interface OsmRelationTags {
  osmId: number;
  name: string | null;
  from: string | null;
  to: string | null;
  ref: string | null;
  /** Etappen-Nummer aus dem OSM-Tag "name" extrahiert, z.B. "Etappe 3" → 3. */
  etappeNr: number | null;
}

export async function fetchOsmRelationTags(
  osmIds: number[],
  log: Logger,
): Promise<OsmRelationTags[]> {
  if (osmIds.length === 0) return [];
  const BATCH = 100;
  const results: OsmRelationTags[] = [];

  for (let i = 0; i < osmIds.length; i += BATCH) {
    const chunk = osmIds.slice(i, i + BATCH);
    const idList = chunk.join(",");
    const query = `[out:json][timeout:30];relation(id:${idList});out tags;`;
    const elements = await runOverpass<OverpassTagsElement>(query, 35_000).catch((err) => {
      log.warn({ err, chunk: chunk.slice(0, 5) }, "fetchOsmRelationTags: Overpass-Fehler");
      return [] as OverpassTagsElement[];
    });
    for (const el of elements) {
      const tags = el.tags ?? {};
      // Deutschen Namen bevorzugen (name:de), Fallback auf name
      const rawName = tags["name:de"] ?? tags.name ?? null;
      // Etappe-Nummer aus OSM-Name extrahieren: "Alpenpanorama-Weg Etappe 3: ..." → 3
      const etappeMatch = rawName?.match(/[Ee]tappe\s+(\d+)/);
      results.push({
        osmId: el.id,
        name: rawName,
        from: tags.from ?? null,
        to: tags.to ?? null,
        ref: tags.ref ?? null,
        etappeNr: etappeMatch ? parseInt(etappeMatch[1], 10) : null,
      });
    }
    if (i + BATCH < osmIds.length) await sleep(500);
  }
  return results;
}

/**
 * Gibt alle direkten Unter-Relationen einer OSM-Route zurück, die als
 * Wanderroute (route=hiking/foot) getaggt sind — also die echten Etappen.
 */
export async function fetchSubRelations(
  osmId: number,
  log: Logger,
): Promise<{ results: { osmId: number; name: string | null; ref: string | null; network: string | null }[]; overpassOk: boolean }> {
  const query = `[out:json][timeout:50];relation(${osmId});rel(r)[route~"^(hiking|foot)$"];out tags;`;
  let overpassOk = true;
  const elements = await runOverpass<OverpassTagsElement>(query, 55_000).catch((err) => {
    log.warn({ err, osmId }, "fetchSubRelations: Overpass-Fehler");
    overpassOk = false;
    return [] as OverpassTagsElement[];
  });
  return {
    overpassOk,
    results: elements.map((el) => {
      const t = el.tags ?? {};
      return {
        osmId: el.id,
        name: t.name ?? t["name:de"] ?? null,
        ref: t.ref ?? null,
        network: t.network ?? null,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Wikipedia Etappen-Fallback
// ---------------------------------------------------------------------------

export interface WikiEtappe {
  nr: number;
  from: string;
  to: string;
  distKm: number | null;
}

function stripWikiLinks(text: string): string {
  // [[Ziel|Anzeige]] → Anzeige  /  [[Ziel]] → Ziel
  return text.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (_, inner) => inner.split("|").pop()!);
}

/**
 * Lädt die Wikipedia-Etappen-Sektion für einen Schweizer Wanderweg.
 * articleTitle: z. B. "Via Rhenana" oder "Via Sbrinz"
 */
export async function fetchWikiEtappen(articleTitle: string, log: Logger): Promise<WikiEtappe[]> {
  const url =
    `https://de.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(articleTitle)}` +
    `&prop=wikitext&format=json`;
  let wikitext = "";
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "SagaTrail/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as Record<string, unknown>;
    wikitext =
      ((data?.parse as Record<string, unknown>)?.wikitext as Record<string, string>)?.["*"] ?? "";
  } catch (err) {
    log.warn({ err, articleTitle }, "fetchWikiEtappen: Abruf fehlgeschlagen");
    return [];
  }

  // Etappen-Sektion isolieren — breiter Regex für z.B. "Etappen und Sehenswürdigkeiten"
  const etappenMatch = wikitext.match(/==\s*Etappen[^=\n]*==\s*([\s\S]*?)(?:\n==|$)/);
  if (!etappenMatch) return [];

  const results: WikiEtappe[] = [];
  let nr = 0;
  for (const rawLine of etappenMatch[1].split("\n")) {
    // Wikilinks, Templates, HTML-Entities (&nbsp; etc.) bereinigen
    const line = stripWikiLinks(rawLine)
      .replace(/\{\{[^{}]*\}\}/g, "")   // Templates wie {{Bruch|4|3|4}}
      .replace(/&nbsp;/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Format 1: # Von – Bis: Xkm   Format 2: * Etappe N: Zwischen–... –Ziel: Xkm
    const m = line.match(
      /^[#*]\s*(?:Etappe\s+\d+:\s*)?(.+?):\s*(\d+(?:[.,]\d+)?)\s*(?:Kilometer|km)/i,
    );
    if (!m) continue;
    nr++;
    const vonBis = m[1].trim();
    // Em-dash, en-dash oder " - " als Trennzeichen
    const parts = vonBis.split(/\s*(?:[–—]|-(?=\s))\s*/);
    const from = parts[0].replace(/^\*+\s*/, "").trim();
    const to = parts[parts.length - 1].trim();
    const distKm = parseFloat(m[2].replace(",", "."));
    if (from && to && from !== to) {
      results.push({ nr, from, to, distKm: isNaN(distKm) ? null : distKm });
    }
  }
  log.info({ articleTitle, etappen: results.length }, "fetchWikiEtappen: geparst");
  return results;
}

/**
 * Sucht in OSM nach einer Wanderrouten-Relation anhand des Namens.
 * Strategie (#25): extrahiert den Kern-Routen-Namen (ohne führende Zahl und
 * "Etappe N"), sucht in der Schweiz-Bbox nach Relationen mit passendem name-Tag.
 * Gibt bis zu 5 OSM-IDs zurück, sortiert nach Relevanz (kürzeste Edit-Distanz zuerst).
 */
export async function searchOsmRouteByName(
  routeName: string,
  log: Logger,
): Promise<number[]> {
  // Kern-Name extrahieren: führende Zahl + Etappe-Angabe entfernen
  // z.B. "447 Schönriederweg Saanenmöser - Schönried" → "Schönriederweg"
  // z.B. "placeholder-nwn-4-etappe-24" (ID, nicht Name) → Roh-Suche
  const stripped = routeName
    .replace(/^\d+\s+/, "")           // führende Zahl
    .replace(/\bEtappe\s+\d+\b/i, "") // Etappe N
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!stripped || stripped.length < 4) return [];

  // Erstes markantes Wort (mind. 5 Zeichen) als Such-Anker
  const words = stripped.split(/\s+/);
  const anchor = words.find((w) => w.length >= 5) ?? words[0] ?? "";
  if (!anchor) return [];

  const safe = anchor.replace(/['"\\]/g, "").trim();
  const query =
    `[out:json][timeout:30][bbox:45.8,5.95,47.85,10.5];` +
    `relation["type"="route"]["route"~"hiking|foot"]["name"~"${safe}",i];` +
    `out ids tags;`;

  try {
    const elements = await runOverpass<OverpassTagsElement>(query, 35_000);
    if (elements.length === 0) return [];

    // Nach Ähnlichkeit zum Originalnamen sortieren (einfache Heuristik: Anzahl gemeinsamer Wörter)
    const origWords = new Set(stripped.toLowerCase().split(/\W+/).filter((w) => w.length >= 3));
    const scored = elements.map((e) => {
      const eName = ((e.tags as Record<string, string>).name ?? "").toLowerCase();
      const common = [...origWords].filter((w) => eName.includes(w)).length;
      return { id: e.id, common };
    });
    scored.sort((a, b) => b.common - a.common);
    return scored.slice(0, 5).map((s) => s.id);
  } catch (err) {
    log.warn({ err, routeName }, "searchOsmRouteByName: Fehler");
    return [];
  }
}

/**
 * Sucht in OSM nach einer Wanderrouten-Relation mit passenden from/to-Tags
 * (Schweiz-Bounding-Box).  Gibt gefundene OSM-IDs zurück.
 */
export async function searchOsmRouteByFromTo(
  from: string,
  to: string,
  log: Logger,
): Promise<number[]> {
  const safe = (s: string) => s.replace(/['"\\]/g, "").trim();
  const query =
    `[out:json][timeout:30][bbox:45.8,5.95,47.85,10.5];` +
    `relation[route~"hiking|foot"][from~"${safe(from)}",i][to~"${safe(to)}",i];` +
    `out ids tags;`;
  try {
    const elements = await runOverpass<OverpassTagsElement>(query, 35_000);
    return elements.map((e) => e.id);
  } catch (err) {
    log.warn({ err, from, to }, "searchOsmRouteByFromTo: Fehler");
    return [];
  }
}
