import { LatLng } from "@/types";
import { haversineKm } from "./geo";

/**
 * Erkennung markanter Richtungswechsel (Weggabelungen) aus echter
 * Routen-Geometrie, um Navigationshinweise nahtlos in die Erzaehlung
 * einzuflechten. Nutzt ausschliesslich reale Koordinaten der Route — es
 * werden keine erfundenen Abzweigungen erzeugt.
 */

export type TurnDirection = "links" | "rechts";

export interface NavigationCue {
  /** Streckenanteil (0..1) entlang der Route, an dem die Abzweigung liegt. */
  distanceFraction: number;
  direction: TurnDirection;
}

const MIN_SEGMENT_M = 60; // GPS-Rauschen/Mikrosegmente ignorieren
const TURN_THRESHOLD_DEG = 35; // ab hier gilt ein Knick als spuerbare Abzweigung
const EDGE_MARGIN = 0.05; // Anfang/Ende der Route ausklammern (Ankunft/Abschluss)

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Winkeldifferenz in Grad (-180..180); positiv = im Uhrzeigersinn (rechts). */
function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/**
 * Liefert die markantesten Richtungswechsel entlang eines Wegverlaufs,
 * gleichmaessig ausgeduennt auf hoechstens `maxCues`. Ohne ausreichende
 * Geometrie wird eine leere Liste zurueckgegeben — es gibt keinen erfundenen
 * Ersatzhinweis.
 */
export function detectNavigationCues(
  geometry: number[][] | undefined,
  maxCues: number
): NavigationCue[] {
  if (!geometry || geometry.length < 5 || maxCues <= 0) return [];
  const points: LatLng[] = geometry.map((p) => ({ lat: p[0], lng: p[1] }));

  const cumKm: number[] = [0];
  let totalKm = 0;
  for (let i = 1; i < points.length; i++) {
    totalKm += haversineKm(points[i - 1], points[i]);
    cumKm.push(totalKm);
  }
  if (totalKm === 0) return [];
  const totalM = totalKm * 1000;

  const raw: NavigationCue[] = [];
  let prevBearing: number | null = null;
  let segStart = 0;
  for (let i = 1; i < points.length; i++) {
    const segLenM = (cumKm[i] - cumKm[segStart]) * 1000;
    if (segLenM < MIN_SEGMENT_M && i < points.length - 1) continue;
    const b = bearing(points[segStart], points[i]);
    if (prevBearing != null) {
      const diff = angleDiff(prevBearing, b);
      const fraction = cumKm[segStart] / totalKm;
      if (
        Math.abs(diff) >= TURN_THRESHOLD_DEG &&
        fraction > EDGE_MARGIN &&
        fraction < 1 - EDGE_MARGIN
      ) {
        raw.push({ distanceFraction: fraction, direction: diff > 0 ? "rechts" : "links" });
      }
    }
    prevBearing = b;
    segStart = i;
  }

  if (raw.length <= maxCues) return raw;
  const step = raw.length / maxCues;
  const picked: NavigationCue[] = [];
  for (let i = 0; i < maxCues; i++) {
    picked.push(raw[Math.floor(i * step)]);
  }
  return picked;
}
