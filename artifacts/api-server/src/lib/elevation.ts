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
const MAX_CHUNK_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [200, 600] as const;
const MAX_TIMER_DELAY_MS = 2_147_483_647;

interface ProfilePoint {
  dist?: number;
  alts?: { COMB?: number; DTM2?: number; DTM25?: number };
}

interface ElevationProfilePoint {
  distanceKm: number;
  altM: number;
}

export interface LocalTerrainSample {
  distanceM: number;
  elevationM: number;
}

export interface LocalTerrainRay {
  bearingDeg: number;
  samples: LocalTerrainSample[];
}

export interface LocalTerrainModel {
  version: 1;
  source: "SwissTopo DTM radial profiles";
  center: LatLng;
  radiusM: number;
  sectors: number;
  rings: number;
  fetchedAt: number;
  observerElevationM: number | null;
  rays: LocalTerrainRay[];
}

function isRetryableHttpStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    (status >= 500 && status < 600)
  );
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isSafeInteger(seconds) ? seconds * 1000 : null;
  }

  const retryAt = Date.parse(trimmed);
  return Number.isNaN(retryAt) ? null : Math.max(0, retryAt - Date.now());
}

function waitForMs(delay: number): Promise<void> {
  if (delay <= 0) return Promise.resolve();
  const timerDelay = Math.min(delay, MAX_TIMER_DELAY_MS);
  return new Promise((resolve) =>
    setTimeout(() => {
      if (delay > timerDelay) {
        void waitForMs(delay - timerDelay).then(resolve);
      } else {
        resolve();
      }
    }, timerDelay),
  );
}

function waitBeforeRetry(attempt: number, retryAfterMs: number | null = null): Promise<void> {
  const delay = retryAfterMs ?? RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS.at(-1)!;
  return waitForMs(delay);
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

function destinationPoint(center: LatLng, bearingDeg: number, distanceM: number): LatLng {
  const angularDistance = distanceM / 6_371_000;
  const bearing = (bearingDeg * Math.PI) / 180;
  const latitude = (center.lat * Math.PI) / 180;
  const longitude = (center.lng * Math.PI) / 180;
  const destinationLatitude = Math.asin(
    Math.sin(latitude) * Math.cos(angularDistance) +
      Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const destinationLongitude =
    longitude +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
      Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(destinationLatitude),
    );
  return {
    lat: (destinationLatitude * 180) / Math.PI,
    lng: (destinationLongitude * 180) / Math.PI,
  };
}

function interpolateElevation(
  profile: ElevationProfilePoint[],
  distanceKm: number,
): number | null {
  if (profile.length === 0) return null;
  if (distanceKm <= profile[0].distanceKm) return profile[0].altM;
  const last = profile[profile.length - 1];
  if (distanceKm >= last.distanceKm) return last.altM;
  for (let index = 1; index < profile.length; index++) {
    const previous = profile[index - 1];
    const current = profile[index];
    if (distanceKm > current.distanceKm) continue;
    const span = current.distanceKm - previous.distanceKm;
    if (span <= 0) return current.altM;
    const fraction = (distanceKm - previous.distanceKm) / span;
    return previous.altM + (current.altM - previous.altM) * fraction;
  }
  return null;
}

async function fetchSwisstopoChunk(
  points: LatLng[],
  log: Logger,
): Promise<ElevationProfilePoint[] | null> {
  const coordinates = points.map((p) => wgs84ToLV95(p.lat, p.lng));
  const geom = JSON.stringify({ type: "LineString", coordinates });
  const url = `${PROFILE_URL}?sr=2056&geom=${encodeURIComponent(geom)}`;

  for (let attempt = 0; attempt < MAX_CHUNK_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        const retryable = isRetryableHttpStatus(res.status);
        log.warn(
          {
            status: res.status,
            points: points.length,
            attempt: attempt + 1,
            retryable,
          },
          "swisstopo-Profil: HTTP-Fehler",
        );
        if (!retryable || attempt === MAX_CHUNK_ATTEMPTS - 1) return null;
        const retryAfterMs =
          res.status === 429 ? parseRetryAfterMs(res.headers.get("retry-after")) : null;
        await waitBeforeRetry(attempt, retryAfterMs);
        continue;
      }
      const data = (await res.json()) as ProfilePoint[];
      // SwissTopo resampelt die angefragte Linie auf eine eigene Anzahl von
      // Profilpunkten (typischerweise etwa 200) und liefert deshalb nicht
      // zwingend einen Wert pro Eingangspunkt. Entscheidend ist ein
      // chronologisch vollständiges Profil, nicht die gleiche Punktzahl.
      if (!Array.isArray(data) || data.length < 2) {
        log.warn(
          {
            receivedPoints: Array.isArray(data) ? data.length : null,
            points: points.length,
          },
          "swisstopo-Profil: zu wenige Profilpunkte",
        );
        return null;
      }

      const profile = data.flatMap((p) => {
        const rawAlt = p.alts?.COMB ?? p.alts?.DTM2 ?? p.alts?.DTM25;
        const alt = typeof rawAlt === "number" ? rawAlt : Number(rawAlt);
        const distance = typeof p.dist === "number" ? p.dist : Number(p.dist);
        return Number.isFinite(alt) && Number.isFinite(distance)
          ? [{ distanceKm: distance / 1000, altM: Math.round(alt) }]
          : [];
      });
      if (profile.length < 2) {
        log.warn(
          { points: points.length, receivedPoints: data.length, validPoints: profile.length },
          "swisstopo-Profil: zu wenige gueltige Hoehenwerte",
        );
        return null;
      }
      if (profile.length < data.length) {
        log.warn(
          { points: points.length, receivedPoints: data.length, validPoints: profile.length },
          "swisstopo-Profil: einzelne Hoehenwerte fehlen — gueltige Punkte werden verwendet",
        );
      }
      return profile;
    } catch (err) {
      log.warn(
        { err, points: points.length, attempt: attempt + 1 },
        "swisstopo-Profil: Anfrage fehlgeschlagen",
      );
      if (attempt === MAX_CHUNK_ATTEMPTS - 1) return null;
      await waitBeforeRetry(attempt);
    }
  }

  return null;
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
    const rebasedChunk = chunk
      .slice(chunkIndex > 0 ? 1 : 0)
      .map((point) => ({
        distanceKm: routeDistancesKm[start] + point.distanceKm - chunkStartDistanceKm,
        altM: point.altM,
      }));

    const previousDistanceKm = result.at(-1)?.distanceKm;
    // Die Entfernung des SwissTopo-Profils und die Haversine-Entfernung der
    // Originalgeometrie unterscheiden sich an Chunk-Grenzen gelegentlich um
    // wenige Zentimeter. Solche bereits abgedeckten Grenzpunkte überspringen,
    // statt ein ansonsten gültiges Gesamtprofil mit 502 abzulehnen.
    const mergedChunk = previousDistanceKm == null
      ? rebasedChunk
      : rebasedChunk.filter((point) => point.distanceKm > previousDistanceKm);
    if (mergedChunk.length < rebasedChunk.length) {
      log.debug(
        {
          points: chunk.length,
          skippedOverlapPoints: rebasedChunk.length - mergedChunk.length,
        },
        "swisstopo-Profil: überlappende Chunk-Grenzpunkte übersprungen",
      );
    }
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

/**
 * Erzeugt ein lokales, observer-zentriertes Terrainmodell aus radialen
 * SwissTopo-Profilen. Es werden keine Höhen interpoliert, die ausserhalb der
 * gelieferten Profilgrenzen liegen; die Interpolation erfolgt nur zwischen
 * tatsächlichen SwissTopo-Messpunkten auf demselben Strahl.
 */
export async function computeLocalTerrainModel(
  center: LatLng,
  log: Logger,
  options: { radiusM?: number; sectors?: number; rings?: number } = {},
): Promise<LocalTerrainModel | null> {
  const radiusM = Math.max(100, Math.min(1000, options.radiusM ?? 500));
  const sectors = Math.max(8, Math.min(16, Math.round(options.sectors ?? 12)));
  const rings = Math.max(4, Math.min(8, Math.round(options.rings ?? 6)));
  const ringDistancesM = Array.from({ length: rings }, (_, index) => {
    if (index === 0) return 0;
    const progress = index / (rings - 1);
    return Math.round(radiusM * progress ** 1.15);
  });

  const rayResults = await Promise.all(
    Array.from({ length: sectors }, async (_, sectorIndex) => {
      const bearingDeg = (sectorIndex * 360) / sectors;
      const points = ringDistancesM.map((distanceM) =>
        destinationPoint(center, bearingDeg, distanceM),
      );
      const profile = await computeElevationProfile(points, log);
      if (!profile || profile.length < 2) return null;
      const samples = ringDistancesM
        .map((distanceM) => {
          const elevationM = interpolateElevation(profile, distanceM / 1000);
          return elevationM == null ? null : { distanceM, elevationM };
        })
        .filter((sample): sample is LocalTerrainSample => sample !== null);
      return samples.length >= 2 ? { bearingDeg, samples } : null;
    }),
  );
  const rays = rayResults.filter((ray): ray is LocalTerrainRay => ray !== null);
  if (rays.length < Math.max(4, Math.floor(sectors / 2))) return null;

  const observerElevations = rays
    .map((ray) => ray.samples.find((sample) => sample.distanceM === 0)?.elevationM ?? null)
    .filter((elevation): elevation is number => elevation != null && Number.isFinite(elevation))
    .sort((a, b) => a - b);
  const observerElevationM =
    observerElevations.length === 0
      ? null
      : observerElevations[Math.floor(observerElevations.length / 2)];

  return {
    version: 1,
    source: "SwissTopo DTM radial profiles",
    center,
    radiusM,
    sectors,
    rings,
    fetchedAt: Date.now(),
    observerElevationM,
    rays,
  };
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
