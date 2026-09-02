import type { Logger } from "pino";
import { downsample, haversineM, wgs84ToLV95, type LatLng } from "./geo";

/**
 * Berechnet Aufstiegs-Hoehenmeter und maximale Hoehe entlang eines
 * Wegverlaufs ueber den amtlichen swisstopo-Profildienst
 * (api3.geo.admin.ch/rest/services/profile.json).
 *
 * Der Dienst akzeptiert nur Schweizer Bezugssysteme (LV95 = EPSG:2056), daher
 * werden die WGS84-Punkte vorher umgerechnet. Bis zur API-Grenze werden alle
 * Routenpunkte uebertragen, damit Kehren und Richtungswechsel erhalten bleiben.
 * SwissTopo akzeptiert die Geometrie nur als GET-Parameter mit begrenzter
 * Request-Line-Laenge; deshalb werden groessere Routen in ueberlappende
 * Teilprofile geteilt und danach wieder zusammengesetzt.
 */

const PROFILE_URL = "https://api3.geo.admin.ch/rest/services/profile.json";
const USER_AGENT = "SagaTrail/1.0 (Swiss hiking companion)";
// Entspricht der maximalen Geometriegroesse des /elevation-profile-Endpunkts.
// Die gespeicherten Routen haben typischerweise bis zu 500 Punkte und werden
// vollstaendig verarbeitet; groessere Eingaben werden gleichmaessig begrenzt.
const MAX_INPUT_POINTS = 2000;
// SwissTopo antwortet ab ca. 126 LV95-Punkten mit "Request Line too large".
// 120 laesst Sicherheitsabstand fuer unterschiedlich lange Zahlenwerte.
const MAX_POINTS_PER_REQUEST = 120;

interface ProfilePoint {
  dist?: number;
  alts?: { COMB?: number; DTM2?: number; DTM25?: number };
}

interface ElevationProfilePoint {
  distanceKm: number;
  altM: number;
}

export interface ElevationStats {
  /** Summe der positiven Hoehenunterschiede (Aufstieg) in Metern. */
  ascentM: number;
  /** Hoechster erreichter Punkt entlang der Route in Metern ue. M. */
  maxElevationM: number;
}

function routeCumulativeDistancesKm(points: LatLng[]): number[] {
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + haversineM(points[i - 1], points[i]) / 1000);
  }
  return distances;
}

async function fetchSwisstopoChunk(
  points: LatLng[],
  log: Logger,
): Promise<ElevationProfilePoint[] | null> {
  const coordinates = points.map((p) => wgs84ToLV95(p.lat, p.lng));
  const geom = JSON.stringify({ type: "LineString", coordinates });
  const url = `${PROFILE_URL}?sr=2056&geom=${encodeURIComponent(geom)}`;

  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) {
      log.warn({ status: res.status, points: points.length }, "swisstopo-Profil: HTTP-Fehler");
      return null;
    }
    const data = (await res.json()) as ProfilePoint[];
    if (!Array.isArray(data) || data.length !== points.length) {
      log.warn(
        { receivedPoints: Array.isArray(data) ? data.length : null, points: points.length },
        "swisstopo-Profil: unvollstaendige Antwort",
      );
      return null;
    }

    const profile = data.map((p) => {
      const alt = p.alts?.COMB ?? p.alts?.DTM2 ?? p.alts?.DTM25;
      return typeof alt === "number" &&
        Number.isFinite(alt) &&
        typeof p.dist === "number" &&
        Number.isFinite(p.dist)
        ? [{ distanceKm: p.dist / 1000, altM: Math.round(alt) }]
        : null;
    });
    if (profile.some((point) => point === null)) {
      log.warn({ points: points.length }, "swisstopo-Profil: unvollstaendiger Hoehenwert");
      return null;
    }
    return profile.flat() as ElevationProfilePoint[];
  } catch (err) {
    log.warn({ err, points: points.length }, "swisstopo-Profil: Anfrage fehlgeschlagen");
    return null;
  }
}

/**
 * Fragt die komplette Route ab. Teilprofile teilen sich jeweils den letzten
 * Punkt mit dem naechsten Teilprofil, damit an den Chunk-Grenzen kein Wegstueck
 * fehlt. Die Distanz wird auf die Originalgeometrie bezogen, damit das Profil
 * mit der Kartenlinie und deren Segmenten ausgerichtet bleibt.
 */
async function fetchSwisstopoProfile(
  points: LatLng[],
  log: Logger,
): Promise<ElevationProfilePoint[] | null> {
  const routeDistancesKm = routeCumulativeDistancesKm(points);
  const result: ElevationProfilePoint[] = [];
  const step = MAX_POINTS_PER_REQUEST - 1;
  let chunkIndex = 0;

  for (let start = 0; start < points.length - 1; start += step) {
    const end = Math.min(points.length - 1, start + MAX_POINTS_PER_REQUEST - 1);
    const chunk = await fetchSwisstopoChunk(points.slice(start, end + 1), log);
    if (!chunk || chunk.length < 2) return null;

    // SwissTopo distances are relative to the start of each request. Rebase
    // them explicitly so the merged profile starts at zero even if the
    // service returns a small non-zero distance for the first sample.
    const chunkStartDistanceKm = chunk[0].distanceKm;
    const mergedChunk = chunk
      .slice(chunkIndex > 0 ? 1 : 0)
      .map((point) => ({
        distanceKm: routeDistancesKm[start] + point.distanceKm - chunkStartDistanceKm,
        altM: point.altM,
      }));

    const previousDistanceKm = result.at(-1)?.distanceKm;
    if (
      mergedChunk.some(
        (point, index) =>
          !Number.isFinite(point.distanceKm) ||
          (index > 0 && point.distanceKm < mergedChunk[index - 1]!.distanceKm) ||
          (index === 0 &&
            previousDistanceKm != null &&
            point.distanceKm < previousDistanceKm),
      )
    ) {
      log.warn({ points: chunk.length }, "swisstopo-Profil: Distanzen nicht monoton");
      return null;
    }
    result.push(...mergedChunk);
    chunkIndex++;
    if (end === points.length - 1) break;
  }

  return result.length >= 2 ? result : null;
}

/**
 * Liefert das Hoehenprofilfuer eine Route als Array von {distanceKm, altM}-
 * Paaren, geeignet zum Zeichnen eines Hoehenprofil-Charts. Nutzt denselben
 * swisstopo-Profildienst wie computeElevationStats, gibt aber die vollstaendige
 * Profil-Kurve zurueck statt nur Aufstieg + Maximalhoehe.
 */
export async function computeElevationProfile(
  points: LatLng[],
  log: Logger,
): Promise<ElevationProfilePoint[] | null> {
  if (points.length < 2) return null;
  const reduced = downsample(points, MAX_INPUT_POINTS);
  return fetchSwisstopoProfile(reduced, log);
}

/** Aufstieg + maximale Hoehe einer Route, oder null bei Fehler/leerem Profil. */
export async function computeElevationStats(
  points: LatLng[],
  log: Logger,
): Promise<ElevationStats | null> {
  if (points.length < 2) return { ascentM: 0, maxElevationM: 0 };
  const reduced = downsample(points, MAX_INPUT_POINTS);
  const profile = await fetchSwisstopoProfile(reduced, log);
  if (!profile) return null;

  let ascent = 0;
  let maxElevation = -Infinity;
  let prev: number | null = null;
  for (const point of profile) {
    if (prev != null && point.altM > prev) ascent += point.altM - prev;
    prev = point.altM;
    if (point.altM > maxElevation) maxElevation = point.altM;
  }
  if (maxElevation === -Infinity) return null;
  return { ascentM: Math.round(ascent), maxElevationM: Math.round(maxElevation) };
}
