// Gamification: Ränge, die Nutzer durch abgeschlossene Wanderungen und
// gehörte Sagen erreichen. Punkte sind bewusst simpel gehalten (kein
// Server-Roundtrip nötig) — jede gehörte Sage und jede abgeschlossene
// Wanderung zählt fest, unabhängig von Distanz oder Dauer, damit der
// Fortschritt sofort nachvollziehbar bleibt.
export const POINTS_PER_SAGA = 10;
export const POINTS_PER_HIKE = 15;

// Schwellenwerte in Punkten — Index entspricht der Position im
// `ranks`-Array der jeweiligen Sprache (siehe collection.ts).
export const RANK_THRESHOLDS = [0, 30, 60, 100, 150, 220, 300, 400, 550, 750];

export function computeSparkPoints(sagasErlebt: number, wanderungenAbgeschlossen: number): number {
  return sagasErlebt * POINTS_PER_SAGA + wanderungenAbgeschlossen * POINTS_PER_HIKE;
}

export interface RankStatus {
  index: number;
  points: number;
  isMaxRank: boolean;
  /** Punkte, die für den naechsten Rang noch fehlen (0 wenn Maximalrang) */
  pointsToNext: number;
  /** Fortschritt innerhalb des aktuellen Rangs, 0..1 */
  progress: number;
}

export function computeRankStatus(points: number): RankStatus {
  let index = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= RANK_THRESHOLDS[i]) {
      index = i;
      break;
    }
  }
  const isMaxRank = index === RANK_THRESHOLDS.length - 1;
  const currentFloor = RANK_THRESHOLDS[index];
  const nextCeil = isMaxRank ? currentFloor : RANK_THRESHOLDS[index + 1];
  const span = nextCeil - currentFloor;
  const progress = isMaxRank ? 1 : span > 0 ? (points - currentFloor) / span : 1;
  return {
    index,
    points,
    isMaxRank,
    pointsToNext: isMaxRank ? 0 : Math.max(0, nextCeil - points),
    progress: Math.min(1, Math.max(0, progress)),
  };
}
