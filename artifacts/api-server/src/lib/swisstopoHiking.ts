import type { Logger } from "pino";
import { downsample, wgs84ToLV95, type LatLng } from "./geo";

/**
 * Leitet den SAC-Wanderskala-Grad (T1-T6) einer Route aus amtlichen
 * swisstopo-Daten ab: dem swissTLM3D-Wanderwegnetz
 * (ch.swisstopo.swisstlm3d-wanderwege). Dessen Attribut `hikingtype`
 * klassifiziert jedes Wegstueck als Wanderweg (gelb), Bergwanderweg
 * (weiss-rot-weiss) oder Alpinwanderweg (weiss-blau-weiss); ein leeres
 * `hikingtype` bedeutet einen gewoehnlichen Wanderweg.
 *
 * OpenStreetMap liefert die benannten Wanderland-Routen je Kanton, traegt aber
 * oft kein `sac_scale`. Diese Bruecke fuellt die fehlende Schwierigkeit aus der
 * swisstopo-Quelle. Der Dienst arbeitet in LV95 (EPSG:2056), daher werden die
 * WGS84-Punkte umgerechnet und der reale Routenverlauf als Polylinie abgefragt,
 * damit nur die tatsaechlich befahrenen Wegstuecke einfliessen.
 */

const IDENTIFY_URL = "https://api3.geo.admin.ch/rest/services/api/MapServer/identify";
const LAYER = "ch.swisstopo.swisstlm3d-wanderwege";
const USER_AGENT = "SagaTrail/1.0 (Swiss hiking companion)";
const REQUEST_TIMEOUT_MS = 30000;
const MAX_POLYLINE_POINTS = 60;
const BUFFER_M = 25; // seitlicher Fangradius um den Routenverlauf (Meter)
const PAD_M = 60; // Mindestausdehnung, damit schmale Routen eine Flaeche haben
const TARGET_MPP = 10; // angestrebte Bodenaufloesung Meter/Pixel (haelt den Fangradius stabil)
const MIN_IMG_PX = 200;
const MAX_IMG_PX = 4000;
const IDENTIFY_LIMIT = 200; // genug fuer lange, mehrteilige Routen

/** Rang der swisstopo-Wanderweg-Klasse; hoeher = anspruchsvoller. */
const HIKINGTYPE_RANK: Record<string, number> = {
  Wanderweg: 1,
  Bergwanderweg: 2,
  Alpinwanderweg: 3,
};

/** Repraesentativer SAC-Grad je swisstopo-Klasse (Bergwandern T2-T3, Alpinwandern T4-T6). */
const RANK_TO_SAC: Record<number, string> = {
  1: "T1",
  2: "T3",
  3: "T5",
};

interface IdentifyResult {
  attributes?: { hikingtype?: string | null };
}

/**
 * Normalisiert ein OSM-`sac_scale` auf einen SAC-Grad "T1"-"T6".
 * Akzeptiert sowohl die Wortform (hiking, mountain_hiking, ...) als auch eine
 * bereits vorhandene T-Notation; unbekannte/leere Werte ergeben null.
 */
export function sacScaleToT(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  const tMatch = /t\s*([1-6])/.exec(value);
  if (tMatch) return `T${tMatch[1]}`;
  const map: Record<string, string> = {
    hiking: "T1",
    mountain_hiking: "T2",
    demanding_mountain_hiking: "T3",
    alpine_hiking: "T4",
    demanding_alpine_hiking: "T5",
    difficult_alpine_hiking: "T6",
  };
  return map[value] ?? null;
}

/**
 * Quadratisches umschliessendes Rechteck (LV95) der Punkte. Ein Quadrat haelt die
 * Bodenaufloesung in x und y gleich, damit der Fangradius (Pixel-Toleranz)
 * richtungsunabhaengig denselben Meterwert ergibt.
 */
function squareExtentLV95(pointsLV95: [number, number][]): {
  extent: [number, number, number, number];
  sideM: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pointsLV95) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const side = Math.max(maxX - minX, maxY - minY, PAD_M);
  const half = side / 2;
  return { extent: [cx - half, cy - half, cx + half, cy + half], sideM: side };
}

/**
 * Ermittelt den SAC-Grad einer Route ueber das swissTLM3D-Wanderwegnetz.
 * Liefert den hoechsten (anspruchsvollsten) gefundenen Grad. Werden Wegstuecke
 * gefunden, aber keine hoehere Klassifizierung, gilt Wanderweg (T1). Wird gar
 * kein Wegstueck getroffen (Route ausserhalb des Netzes/Dienst gestoert), wird
 * null zurueckgegeben, damit die Schwierigkeit "unbekannt" bleibt.
 */
export async function deriveSacFromSwissTlm3d(
  points: LatLng[],
  log: Logger,
): Promise<string | null> {
  if (points.length < 2) return null;
  const reduced = downsample(points, MAX_POLYLINE_POINTS);
  const pointsLV95 = reduced.map((p) => wgs84ToLV95(p.lat, p.lng));
  const { extent, sideM } = squareExtentLV95(pointsLV95);
  // Bildgroesse aus der Zielaufloesung ableiten, damit Meter/Pixel unabhaengig von
  // der Routenlaenge nahezu konstant bleibt und der Fangradius ~BUFFER_M betraegt.
  const imgPx = Math.min(MAX_IMG_PX, Math.max(MIN_IMG_PX, Math.round(sideM / TARGET_MPP)));
  const metersPerPixel = sideM / imgPx;
  const tolerance = Math.max(1, Math.round(BUFFER_M / metersPerPixel));

  const geometry = JSON.stringify({ paths: [pointsLV95] });
  const params = new URLSearchParams({
    geometryType: "esriGeometryPolyline",
    geometry,
    sr: "2056",
    tolerance: String(tolerance),
    layers: `all:${LAYER}`,
    mapExtent: extent.join(","),
    imageDisplay: `${imgPx},${imgPx},96`,
    returnGeometry: "false",
    limit: String(IDENTIFY_LIMIT),
    lang: "de",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${IDENTIFY_URL}?${params.toString()}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) {
      log.warn({ status: res.status }, "swissTLM3D-Identify: HTTP-Fehler");
      return null;
    }
    const data = (await res.json()) as { results?: IdentifyResult[] };
    const results = data.results ?? [];
    if (results.length === 0) return null;

    let bestRank = 1; // Wegstueck gefunden -> mindestens Wanderweg
    for (const r of results) {
      const type = r.attributes?.hikingtype;
      if (!type) continue;
      const rank = HIKINGTYPE_RANK[type];
      if (rank && rank > bestRank) bestRank = rank;
    }
    return RANK_TO_SAC[bestRank] ?? "T1";
  } catch (err) {
    log.warn({ err }, "swissTLM3D-Identify: Anfrage fehlgeschlagen");
    return null;
  } finally {
    clearTimeout(timer);
  }
}
