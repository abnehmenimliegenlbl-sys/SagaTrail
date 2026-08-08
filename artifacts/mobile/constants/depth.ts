import { Platform, ViewStyle } from "react-native";

/**
 * Frosted-Glass-Tiefeneffekt fuer Knoepfe, Kacheln und Modals — nur weicher
 * Aussenschatten (iOS: shadow*, Android: elevation), OHNE seitenspezifische
 * border*-Farben. Diese wuerden in React Native immer Vorrang vor dem
 * pauschalen borderColor haben und so jede themenfarbige Kante (z.B. rot)
 * verdecken — deshalb bewusst weggelassen. Die Kantenfarbe wird an jeder
 * Verwendungsstelle explizit ueber `borderColor` gesetzt.
 */
/**
 * Nur der Aussenschatten, ohne Kanten — fuer Wrapper um Flaechen mit
 * overflow:"hidden" (dort wuerde der Schatten sonst abgeschnitten).
 */
// Nur der Aussenschatten-Wrapper (kein overflow:"hidden") — kleines
// Android-elevation damit Route-Kacheln einen sauberen Schatten bekommen.
export const SCHATTEN_3D: ViewStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  ...(Platform.OS === "android" ? { elevation: 3 } : null),
};

// Auf Android elevation:0 — verhindert den "Material Raised Surface"-Bevel-Effekt
// (helle Tint oben, dunkler Rand unten) auf weissen/hellen Kacheln und Buttons.
// Visuelle Tiefe kommt auf Android von borderColor + Gradient, nicht elevation.
export const GLAS_3D: ViewStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  ...(Platform.OS === "android" ? { elevation: 0 } : null),
};

/** Staerkere Variante fuer prominente Elemente (Primaerknoepfe, Modals). */
export const GLAS_3D_STARK: ViewStyle = {
  ...GLAS_3D,
  shadowOpacity: 0.5,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  // elevation bewusst nicht erhoeht — GLAS_3D setzt bereits 0 fuer Android.
};
