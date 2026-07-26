/**
 * Geodaesie-Helfer: Distanzberechnung (Haversine), Ausduennung von
 * Wegverlaeufen, Umrechnung WGS84 -> LV95 (EPSG:2056) sowie eine Schaetzung der
 * Gehzeit nach der Faustformel der Schweizer Wanderwege.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distanz zwischen zwei Punkten in Metern. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Gesamtlaenge eines Wegverlaufs in Kilometern. */
export function pathDistanceKm(points: LatLng[]): number {
  let meters = 0;
  for (let i = 1; i < points.length; i++) {
    meters += haversineM(points[i - 1], points[i]);
  }
  return meters / 1000;
}

/**
 * Duennt eine Punktliste gleichmaessig auf hoechstens `max` Punkte aus.
 * Erster und letzter Punkt bleiben erhalten.
 */
export function downsample<T>(points: T[], max: number): T[] {
  if (points.length <= max || max < 2) return points.slice();
  const step = (points.length - 1) / (max - 1);
  const result: T[] = [];
  for (let i = 0; i < max; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}

/**
 * Senkrechter Abstand eines Punktes zur Geraden start–end, in Metern.
 * Naeherung via flache Projektion (fuer kleine Gebiete wie die Schweiz ausreichend).
 */
function perpDistanceM(p: LatLng, start: LatLng, end: LatLng): number {
  const LAT_M = 111_320;
  const LNG_M = Math.cos(((start.lat + end.lat) / 2) * (Math.PI / 180)) * 111_320;
  const px = (p.lng   - start.lng) * LNG_M;
  const py = (p.lat   - start.lat) * LAT_M;
  const dx = (end.lng - start.lng) * LNG_M;
  const dy = (end.lat - start.lat) * LAT_M;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt(px * px + py * py);
  const t   = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
  const ex  = px - t * dx;
  const ey  = py - t * dy;
  return Math.sqrt(ex * ex + ey * ey);
}

/**
 * Douglas-Peucker-Vereinfachung: behält alle Punkte die mehr als
 * `toleranceM` Meter von der Sehne abweichen (Kurven, Biegungen bleiben
 * erhalten). Redundante Zwischenpunkte auf geraden Strecken werden entfernt.
 * Als Sicherheitsnetz werden die Punkte am Ende auf `maxPoints` begrenzt.
 */
export function rdpSimplify(points: LatLng[], toleranceM = 5, maxPoints = 500): LatLng[] {
  if (points.length <= 2) return points.slice();

  function rdp(pts: LatLng[], eps: number): LatLng[] {
    if (pts.length <= 2) return pts.slice();
    let maxDist = 0;
    let maxIdx  = 1;
    const first = pts[0];
    const last  = pts[pts.length - 1];
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpDistanceM(pts[i], first, last);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > eps) {
      const left  = rdp(pts.slice(0, maxIdx + 1), eps);
      const right = rdp(pts.slice(maxIdx),         eps);
      return [...left.slice(0, -1), ...right];
    }
    return [first, last];
  }

  const result = rdp(points, toleranceM);
  // Sicherheitsnetz: falls Toleranz sehr klein und Route sehr lang
  return result.length > maxPoints ? downsample(result, maxPoints) : result;
}

/**
 * Naeherungsformel swisstopo: WGS84 (lat/lng in Grad) -> LV95 (E/N in Metern).
 * Genauigkeit im Bereich weniger Meter, ausreichend fuer das Hoehenprofil.
 */
export function wgs84ToLV95(lat: number, lng: number): [number, number] {
  const phi = (lat * 3600 - 169028.66) / 10000;
  const lam = (lng * 3600 - 26782.5) / 10000;
  const e =
    2600072.37 +
    211455.93 * lam -
    10938.51 * lam * phi -
    0.36 * lam * phi * phi -
    44.54 * lam * lam * lam;
  const n =
    1200147.07 +
    308807.95 * phi +
    3745.25 * lam * lam +
    76.63 * phi * phi -
    194.56 * lam * lam * phi +
    119.79 * phi * phi * phi;
  return [Math.round(e * 100) / 100, Math.round(n * 100) / 100];
}

/**
 * Gehzeit-Schaetzung (Minuten) nach der Faustformel der Schweizer Wanderwege:
 * 4 km/h horizontal, 400 Hm/h im Aufstieg; die kleinere der beiden Zeiten wird
 * zur Haelfte angerechnet.
 */
export function estimateMinutes(distanceKm: number, ascentM: number): number {
  const horizontalH = distanceKm / 4;
  const verticalH = Math.max(0, ascentM) / 400;
  const hours =
    Math.max(horizontalH, verticalH) + Math.min(horizontalH, verticalH) / 2;
  return Math.max(15, Math.round(hours * 60));
}
