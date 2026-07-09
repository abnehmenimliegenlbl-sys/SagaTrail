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
export const SCHATTEN_3D: ViewStyle = {
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 6 },
  ...(Platform.OS === "android" ? { elevation: 6 } : null),
};

export const GLAS_3D: ViewStyle = {
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
