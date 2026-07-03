/**
 * Grobe Saison-Einschaetzung einer Route aus maximaler Hoehe und SAC-Grad.
 *
 * Dies ist bewusst eine Heuristik, KEINE amtliche Aussage zum aktuellen
 * Zustand: es gibt keine frei verfuegbare, live abfragbare Quelle dafuer,
 * ob ein bestimmter Weg gerade schneefrei oder gesperrt ist (siehe
 * `weather.ts` fuer dasselbe Prinzip beim Wegzustand). Alpine Routen ab
 * ca. 1800 m oder ab SAC T4 sind in der Schweiz typischerweise nur im
 * Sommer/Fruehherbst schneefrei und sicher begehbar; tiefe Talrouten mit
 * einfacher Schwierigkeit sind praktisch ganzjaehrig machbar.
 */
export type RouteSeason = "ganzjaehrig" | "eher_sommer" | "nur_sommer";

const LOW_ELEVATION_M = 1200;
const HIGH_ELEVATION_M = 1800;
const EASY_SAC_MAX = 2;
const DEMANDING_SAC_MIN = 4;

function sacRank(sac: string): number | null {
  const m = /T\s*([1-6])/i.exec(sac);
  return m ? Number(m[1]) : null;
}

export function deriveSeason(maxElevationM: number, sac: string): RouteSeason {
  const rank = sacRank(sac);
  if (maxElevationM >= HIGH_ELEVATION_M || (rank != null && rank >= DEMANDING_SAC_MIN)) {
    return "nur_sommer";
  }
  if (maxElevationM < LOW_ELEVATION_M && (rank == null || rank <= EASY_SAC_MAX)) {
    return "ganzjaehrig";
  }
  return "eher_sommer";
}
