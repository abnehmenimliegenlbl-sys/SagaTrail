import type { LatLng } from "@/types";

/**
 * Navigationshinweise duerfen nur an autoritativ bestaetigten Weggabelungen
 * entstehen. Eine Routenlinie allein zeigt nicht, ob am Richtungswechsel
 * ueberhaupt ein alternativer Weg existiert.
 */

export type TurnDirection = "links" | "rechts";

export interface NavigationCue {
  /** Streckenanteil (0..1) entlang der Route, an dem die Abzweigung liegt. */
  distanceFraction: number;
  direction: TurnDirection;
  /** Reale Koordinate der Abzweigung — Grundlage fuer Naeherungs-Mitteilungen. */
  point: LatLng;
}

/**
 * Geometrie-basierte Richtungswechsel sind bewusst deaktiviert: Selbst ein
 * scharfer Knick oder eine Spitzkehre beweist keine Wahlmoeglichkeit. Bis
 * angeschlossene Wege aus einer autoritativen Topologie vorliegen, bleibt die
 * Navigation still statt Kurven faelschlich als Abzweigungen anzukuendigen.
 */
export function detectNavigationCues(
  _geometry: number[][] | undefined,
  _maxCues: number
): NavigationCue[] {
  return [];
}
