import type { Logger } from "pino";
import { createHash } from "crypto";
import { computeElevationStats } from "./elevation";
import { deriveSacFromSwissTlm3d } from "./swisstopoHiking";
import { deriveSeason } from "./season";
import { reverseGeocode } from "./geocoding";
import { downsample, estimateMinutes, pathDistanceKm, type LatLng } from "./geo";

/**
 * Berechnet eine Wanderroute zwischen zwei selbst gewaehlten Punkten
 * (Valhalla-Router der FOSSGIS, ohne API-Key, Costing "pedestrian") und
 * reichert sie mit denselben Quellen wie die Kantonsrouten an
 * (swisstopo-Hoehenmetern, SAC-Grad, Saison-Heuristik). Die Route wird
 * NICHT persistiert — jede Anfrage berechnet sie neu, denn Start/Ziel sind
 * frei waehlbar und nicht auf einen Kanton-Katalog begrenzt.
 *
 * Wichtig: Frueher lief das Routing ueber den oeffentlichen OSRM-Demo-Server
 * mit Profil "foot" — der bedient aber unabhaengig vom Profil in der URL nur
 * Autodaten, weshalb "Wanderrouten" ueber Autobahnen/Schnellstrassen fuehrten.
 * Das Valhalla-Fussgaengerprofil schliesst Autobahnen und fuer Fussgaenger
 * gesperrte Strassen grundsaetzlich aus und bevorzugt Wege/Trails.
 */

const VALHALLA_URL = "https://valhalla1.openstreetmap.de/route";
const USER_AGENT = "SagaTrail/1.0 (Swiss hiking companion)";
const STORED_GEOMETRY_POINTS = 80;
const MIN_KM = 0.3;
const MAX_KM = 60;

interface ValhallaResponse {
  trip?: {
    legs?: { shape?: string }[];
    summary?: { length?: number };
  };
  error?: string;
}

/**
 * Dekodiert eine Valhalla-Polyline (Precision 1e6) in Koordinaten.
 * Gleiches Format wie Google-Encoded-Polyline, nur mit Faktor 1e6.
 */
function decodePolyline6(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const which of ["lat", "lng"] as const) {
      let result = 0;
      let shift = 0;
      let byte = 0x20;
      while (byte >= 0x20) {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      }
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === "lat") lat += delta;
      else lng += delta;
    }
    points.push({ lat: lat / 1e6, lng: lng / 1e6 });
  }
  return points;
}

export class CustomRouteError extends Error {}

/** Baut einen deterministischen Bezeichner aus gerundeten Start-/Zielkoordinaten. */
function customRouteId(points: LatLng[]): string {
  const fingerprint = points
    .map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`)
    .join(";");
  return `custom-${createHash("sha256").update(fingerprint).digest("hex").slice(0, 16)}`;
}

export interface CustomRoute {
  id: string;
  sagaId: string;
  name: string;
  region: string;
  distanceKm: number;
  distanceTagKm: number;
  ascentM: number;
  maxElevationM: number;
  season: ReturnType<typeof deriveSeason>;
  minutes: number;
  sac: string;
  terrain: string;
  coordinates: LatLng;
  geometry: [number, number][];
  featured: boolean;
}

export interface RouteFromPointsMeta {
  /** Deterministischer Bezeichner der Route (dient auch als sagaId). */
  id: string;
  /** Fester Anzeigename; ohne Angabe wird "Start → Ziel" per Geocoding gebaut. */
  name?: string;
  startLabel?: string;
  endLabel?: string;
  /** Anzeige-Terrain, z. B. "Eigene Route" oder "GPX-Import". */
  terrain: string;
}

/**
 * Gemeinsame Anreicherung fuer alle Routen, die als nackte Punktfolge
 * hereinkommen (eigene Routen via Valhalla, GPX-Import): Distanz-Pruefung,
 * swisstopo-Hoehenmeter, SAC-Grad, Saison-Heuristik, Geocoding fuer Namen
 * und Kanton. Wirft `CustomRouteError` bei unplausibler Laenge.
 */
export async function buildRouteFromPoints(
  points: LatLng[],
  meta: RouteFromPointsMeta,
  log: Logger,
): Promise<CustomRoute> {
  const start = points[0]!;
  const end = points[points.length - 1]!;
  const distanceKm = pathDistanceKm(points);
  if (distanceKm < MIN_KM || distanceKm > MAX_KM) {
    throw new CustomRouteError(
      `Die Route ist mit ${distanceKm.toFixed(1)} km ausserhalb des sinnvollen Bereichs (${MIN_KM}-${MAX_KM} km).`,
    );
  }

  const [elevation, sac, startPlace, endPlace] = await Promise.all([
    computeElevationStats(points, log),
    deriveSacFromSwissTlm3d(points, log),
    meta.startLabel
      ? Promise.resolve({ label: meta.startLabel, canton: null })
      : reverseGeocode(start.lat, start.lng, log),
    meta.endLabel
      ? Promise.resolve({ label: meta.endLabel, canton: null })
      : reverseGeocode(end.lat, end.lng, log),
  ]);

  const ascentM = elevation?.ascentM ?? 0;
  const maxElevationM = elevation?.maxElevationM ?? 0;
  const sacGrade = sac ?? "unbekannt";

  // Kanton-Erkennung: Startpunkt ist bevorzugt; faellt das Geocoding aus
  // (z.B. Netzfehler oder Nominatim liefert kein verwertbares state-Feld),
  // wird der Mittelpunkt der Route als Fallback geocodiert. Das ist wichtig
  // fuer umgekehrte GPX-Importe, bei denen der Startpunkt nah an einer
  // Kantonsgrenze liegt und die Kanton-Zuordnung unzuverlaessig ist.
  let canton = startPlace.canton;
  if (!canton && points.length > 2) {
    const mid = points[Math.floor(points.length / 2)]!;
    const midPlace = await reverseGeocode(mid.lat, mid.lng, log);
    canton = midPlace.canton;
  }
  const region = canton ?? "";
  const geometry: [number, number][] = downsample(points, STORED_GEOMETRY_POINTS).map(
    (p) => [p.lat, p.lng],
  );
  const shortLabel = (label: string) => label.split(",")[0]?.trim() || label;

  const roundedDistanceKm = Math.round(distanceKm * 10) / 10;
  return {
    id: meta.id,
    sagaId: meta.id,
    name: meta.name ?? `${shortLabel(startPlace.label)} → ${shortLabel(endPlace.label)}`,
    region,
    distanceKm: roundedDistanceKm,
    distanceTagKm: roundedDistanceKm,
    ascentM,
    maxElevationM,
    season: deriveSeason(maxElevationM, sacGrade),
    minutes: estimateMinutes(distanceKm, ascentM),
    sac: sacGrade,
    terrain: meta.terrain,
    coordinates: start,
    geometry,
    featured: false,
  };
}

/**
 * Berechnet die Fussweg-Route zwischen `start` und `end` und reichert sie an.
 * Wirft `CustomRouteError`, wenn OSRM keine Route findet oder die Laenge
 * ausserhalb des sinnvollen Bereichs liegt (Router meldet dann 400).
 */
export async function buildCustomRoute(
  start: LatLng,
  end: LatLng,
  startLabel: string | undefined,
  endLabel: string | undefined,
  log: Logger,
): Promise<CustomRoute> {
  return buildPedestrianRoute(
    [start, end],
    startLabel,
    endLabel,
    "Eigene Route",
    log,
  );
}

/**
 * Berechnet eine Fussweg-Route, die alle Wegpunkte in der angegebenen
 * Reihenfolge passiert. Valhalla liefert dafuer einen Leg pro Abschnitt;
 * die Legs werden ohne doppelte Verbindungspunkte zu einer Geometrie
 * zusammengefuegt.
 */
export async function buildCustomRouteThroughWaypoints(
  points: LatLng[],
  log: Logger,
): Promise<CustomRoute> {
  return buildPedestrianRoute(points, undefined, undefined, "Eigene Wegpunkt-Route", log);
}

async function buildPedestrianRoute(
  points: LatLng[],
  startLabel: string | undefined,
  endLabel: string | undefined,
  terrain: string,
  log: Logger,
): Promise<CustomRoute> {
  if (points.length < 2 || points.length > 12) {
    throw new CustomRouteError("Bitte zwischen 2 und 12 Wegpunkte setzen.");
  }

  const res = await fetch(VALHALLA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({
      locations: points.map((point) => ({ lat: point.lat, lon: point.lng })),
      // Fussgaengerprofil: Autobahnen/Schnellstrassen sind ausgeschlossen,
      // Wanderwege und Trails werden bevorzugt.
      costing: "pedestrian",
      costing_options: { pedestrian: { use_hills: 0.5 } },
      units: "kilometers",
    }),
  });
  if (!res.ok && res.status !== 400) {
    throw new Error(`Valhalla-Routing: HTTP-Fehler ${res.status}`);
  }
  const data = (await res.json()) as ValhallaResponse;
  const shapes = (data.trip?.legs ?? [])
    .map((leg) => leg.shape)
    .filter((s): s is string => Boolean(s));
  if (!data.trip || shapes.length === 0) {
    throw new CustomRouteError(
      "Zwischen den gewaehlten Punkten wurde keine Fusswegroute gefunden.",
    );
  }

  const routedPoints: LatLng[] = [];
  for (const shape of shapes) {
    const legPoints = decodePolyline6(shape);
    for (const point of legPoints) {
      const previous = routedPoints[routedPoints.length - 1];
      if (!previous || previous.lat !== point.lat || previous.lng !== point.lng) {
        routedPoints.push(point);
      }
    }
  }
  return buildRouteFromPoints(
    routedPoints,
    {
      id: customRouteId(points),
      startLabel,
      endLabel,
      terrain,
    },
    log,
  );
}
