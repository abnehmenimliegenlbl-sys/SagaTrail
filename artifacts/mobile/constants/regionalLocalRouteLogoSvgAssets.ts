import type { ImageSourcePropType } from "react-native";

// Offizielle SVG-Routenfelder aus dem SchweizMobil-Download.
// Als lokale Metro-Assets gebündelt, da der offizielle Host native Laufzeit-
// Anfragen teilweise mit HTTP 403 beantwortet.
export const REGIONAL_LOCAL_ROUTE_LOGO_SVG_ASSETS: Record<string, ImageSourcePropType> = {
  "VD-70": require("../assets/schweizmobil/regional-local/WL_070_VD.svg"),
  "VS-70": require("../assets/schweizmobil/regional-local/WL_070_VS.svg"),
};