import React from "react";
import { SvgXml } from "react-native-svg";
import { View } from "react-native";

import { CANTON_WAPPEN_SVG } from "@/constants/cantonWappenSvg";
import { kantonsKuerzel } from "@/constants/cantonKuerzel";

// Zeigt das offizielle, farbige Wappen eines Kantons. Fällt bei unbekannten
// Kantonsnamen auf einen leeren Platzhalter zurück (nie auf Text-Badges).
export function CantonWappen({
  canton,
  size = 40,
}: {
  canton: string;
  size?: number;
}) {
  const code = kantonsKuerzel(canton);
  const xml = CANTON_WAPPEN_SVG[code];

  if (!xml) {
    return <View style={{ width: size, height: size }} />;
  }

  return <SvgXml xml={xml} width={size} height={size} />;
}
