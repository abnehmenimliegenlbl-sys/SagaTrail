/**
 * Berechnet geschaetzte Ankunftszeiten (ETA) zu den Zwischenzielen einer
 * Wanderung (25 / 50 / 75 / 100 %). Die Geschwindigkeit wird adaptiv aus
 * dem echten GPS-Fortschritt ermittelt; ohne ausreichende Daten greift
 * die Naismith-Faustformel (4 km/h eben + 300 Hm/h Aufstieg).
 */

export interface WaypointEta {
  pct: 25 | 50 | 75 | 100;
  remainingKm: number;
  etaMin: number;
  passed: boolean;
}

const NAISMITH_BASE_KMH = 4.0;
const NAISMITH_HM_PER_H = 300;

/**
 * Gibt ETAs fuer alle vier Meilensteine zurueck.
 *
 * @param distance    km bisher zurueckgelegt
 * @param totalKm     Gesamtlaenge der Route
 * @param elapsedSec  Sekunden seit Wanderstart
 * @param totalAscentM Gesamtaufstieg der Route in Metern
 */
export function computeWaypointEtas(
  distance: number,
  totalKm: number,
  elapsedSec: number,
  totalAscentM: number,
): WaypointEta[] {
  if (totalKm <= 0) return [];

  let speedKmh: number;
  if (elapsedSec >= 120 && distance >= 0.3) {
    const real = distance / (elapsedSec / 3600);
    speedKmh = Math.max(0.5, Math.min(8, real));
  } else {
    const ascentPerKm = totalAscentM / totalKm;
    const extraHoursPerKm = ascentPerKm / NAISMITH_HM_PER_H;
    speedKmh = Math.max(1, Math.min(5, 1 / (1 / NAISMITH_BASE_KMH + extraHoursPerKm)));
  }

  const milestones = [25, 50, 75, 100] as const;
  return milestones.map((pct) => {
    const targetKm = totalKm * (pct / 100);
    const remainingKm = Math.max(0, targetKm - distance);
    const etaMin = Math.round((remainingKm / speedKmh) * 60);
    return {
      pct,
      remainingKm: Math.round(remainingKm * 10) / 10,
      etaMin,
      passed: distance >= targetKm - 0.05,
    };
  });
}

/** Liefert den naechsten noch nicht erreichten Meilenstein. */
export function nextWaypoint(etas: WaypointEta[]): WaypointEta | null {
  return etas.find((w) => !w.passed) ?? null;
}
