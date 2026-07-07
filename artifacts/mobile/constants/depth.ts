import { Platform, ViewStyle } from "react-native";

/**
 * Dreidimensionaler Frosted-Glass-Effekt fuer Knoepfe, Kacheln und Modals.
 *
 * Der Tiefeneindruck entsteht durch drei Schichten:
 * 1. Lichtkante oben/links (gletscherweiss, transparent) — simuliertes Licht
 *    von oben, wie es auf eine erhabene Glasflaeche faellt.
 * 2. Schattenkante unten/rechts (schwarz, transparent) — die abgewandte Seite.
 * 3. Weicher Aussenschatten (iOS: shadow*, Android: elevation) — hebt die
 *    Flaeche vom Hintergrund ab.
 *
 * Seitenspezifische border*-Farben haben in React Native Vorrang vor dem
 * pauschalen borderColor. Der Stil kann daher ANS ENDE eines Style-Arrays
 * gehaengt werden, ohne bestehende borderColor-Angaben entfernen zu muessen —
 * das Frosted-Glass-Design (glassBg + BlurView) bleibt unangetastet.
 */
/**
 * Nur der Aussenschatten, ohne Kanten — fuer Wrapper um Flaechen mit
 * overflow:"hidden" (dort wuerde der Schatten sonst abgeschnitten).
 */
export const SCHATTEN_3D: ViewStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  ...(Platform.OS === "android" ? { elevation: 6 } : null),
};

export const GLAS_3D: ViewStyle = {
  borderTopColor: "rgba(245,243,236,0.34)",
  borderLeftColor: "rgba(245,243,236,0.16)",
  borderRightColor: "rgba(0,0,0,0.28)",
  borderBottomColor: "rgba(0,0,0,0.45)",
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  ...(Platform.OS === "android" ? { elevation: 6 } : null),
};

/** Staerkere Variante fuer prominente Elemente (Primaerknoepfe, Modals). */
export const GLAS_3D_STARK: ViewStyle = {
  ...GLAS_3D,
  shadowOpacity: 0.5,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  ...(Platform.OS === "android" ? { elevation: 10 } : null),
};
