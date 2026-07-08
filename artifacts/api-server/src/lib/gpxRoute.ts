import { createHash } from "crypto";
import type { Logger } from "pino";
import {
  buildRouteFromPoints,
  CustomRouteError,
  type CustomRoute,
} from "./customRoute";
import { downsample, type LatLng } from "./geo";

/**
 * GPX-Import: liest den Track aus einer GPX-Datei (trkpt, ersatzweise rtept)
 * und reichert ihn ueber dieselbe Pipeline wie eigene Routen an
 * (swisstopo-Hoehenmeter, SAC-Grad, Saison, Geocoding). Es wird bewusst kein
 * XML-Parser-Paket eingesetzt: GPX-Punkte sind flache Tags mit lat/lon-
 * Attributen, die sich robust per Regex extrahieren lassen — unabhaengig von
 * Attribut-Reihenfolge und Namespace-Praefixen der erzeugenden App.
 */

// Grosszuegige Bounding-Box der Schweiz (inkl. Grenzgebiete).
const CH_LAT_MIN = 45.6;
const CH_LAT_MAX = 48.0;
const CH_LNG_MIN = 5.7;
const CH_LNG_MAX = 10.8;

// Anteil der Punkte, der in der Schweiz liegen muss (Grenztouren erlaubt).
const MIN_INSIDE_RATIO = 0.7;

// Obergrenze fuer die Weiterverarbeitung: dichte Tracks (1 Punkt/Sekunde)
// bringen zehntausende Punkte, die fuer Distanz/Hoehe/SAC nichts beitragen.
const MAX_WORK_POINTS = 3000;

/** Extrahiert alle Punkte eines Tag-Typs (trkpt/rtept) in Dokument-Reihenfolge. */
function extractPoints(gpx: string, tag: string): LatLng[] {
  const points: LatLng[] = [];
  const tagRe = new RegExp(`<(?:[A-Za-z0-9_]+:)?${tag}\\b([^>]*)>`, "g");
  const latRe = /\blat\s*=\s*["']([^"']+)["']/;
  const lonRe = /\blon\s*=\s*["']([^"']+)["']/;
  for (const match of gpx.matchAll(tagRe)) {
    const attrs = match[1] ?? "";
    const lat = Number(latRe.exec(attrs)?.[1]);
    const lng = Number(lonRe.exec(attrs)?.[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      points.push({ lat, lng });
    }
  }
  return points;
}

/** Erster <name>-Inhalt der Datei (Metadaten- oder Track-Name). */
function extractName(gpx: string): string | undefined {
  const match = /<(?:[A-Za-z0-9_]+:)?name\s*>([^<]{1,120})</.exec(gpx);
  const name = match?.[1]?.trim();
  return name || undefined;
}

/** Entfernt unmittelbar aufeinanderfolgende Duplikate (haeufig bei GPS-Pausen). */
function dedupeConsecutive(points: LatLng[]): LatLng[] {
  const result: LatLng[] = [];
  for (const p of points) {
    const last = result[result.length - 1];
    if (!last || last.lat !== p.lat || last.lng !== p.lng) {
      result.push(p);
    }
  }
  return result;
}

/** Deterministischer Bezeichner aus dem Trackverlauf. */
function gpxRouteId(points: LatLng[]): string {
  const hash = createHash("sha256");
  for (const p of downsample(points, 64)) {
    hash.update(`${p.lat.toFixed(5)},${p.lng.toFixed(5)};`);
  }
  return `gpx-${hash.digest("hex").slice(0, 16)}`;
}

/**
 * Parst die GPX-Datei und baut eine angereicherte Route.
 * Wirft `CustomRouteError` bei ungueltiger Datei, Track ausserhalb der
 * Schweiz oder unplausibler Distanz.
 */
export async function buildGpxRoute(
  gpx: string,
  displayName: string | undefined,
  log: Logger,
): Promise<CustomRoute> {
  if (!/<(?:[A-Za-z0-9_]+:)?gpx[\s>]/.test(gpx)) {
    throw new CustomRouteError("Die Datei ist keine gueltige GPX-Datei.");
  }

  // Track-Punkte zuerst; reine Routen-Dateien (nur rtept) als Ersatz.
  let points = extractPoints(gpx, "trkpt");
  if (points.length === 0) {
    points = extractPoints(gpx, "rtept");
  }
  points = dedupeConsecutive(points);
  if (points.length < 2) {
    throw new CustomRouteError(
      "In der GPX-Datei wurden keine Track-Punkte gefunden.",
    );
  }

  const inside = points.filter(
    (p) =>
      p.lat >= CH_LAT_MIN &&
      p.lat <= CH_LAT_MAX &&
      p.lng >= CH_LNG_MIN &&
      p.lng <= CH_LNG_MAX,
  ).length;
  if (inside / points.length < MIN_INSIDE_RATIO) {
    throw new CustomRouteError(
      "Der Track liegt ausserhalb der Schweiz — SagaTrail deckt nur Schweizer Wanderungen ab.",
    );
  }

  const reduced = downsample(points, MAX_WORK_POINTS);
  log.info(
    { rohPunkte: points.length, punkte: reduced.length },
    "GPX-Track geparst",
  );

  const name = displayName?.trim() || extractName(gpx);
  return buildRouteFromPoints(
    reduced,
    {
      id: gpxRouteId(reduced),
      name,
      terrain: "GPX-Import",
    },
    log,
  );
}
