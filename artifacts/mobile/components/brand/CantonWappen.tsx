import React, { useMemo } from "react";
import { SvgXml } from "react-native-svg";
import { View } from "react-native";

import { CANTON_WAPPEN_SVG } from "@/constants/cantonWappenSvg";
import { kantonsKuerzel } from "@/constants/cantonKuerzel";

// Klassische heraldische Wappenform (flacher oberer Rand, spitz zulaufender
// unterer Rand) innerhalb der 13x13-Koordinaten der Quell-SVGs. Damit wirken
// die Kantonswappen wie echte Schilde statt wie quadratische Fähnchen.
const SHIELD_PATH = "M0,0 H13 V6.7 C13,10.2 9.2,11.9 6.5,13 C3.8,11.9 0,10.2 0,6.7 Z";

// Zeigt das offizielle, farbige Wappen eines Kantons in echter Schildform.
// Fällt bei unbekannten Kantonsnamen auf einen leeren Platzhalter zurück
// (nie auf Text-Badges).
export function CantonWappen({
  canton,
  size = 40,
}: {
  canton: string;
  size?: number;
}) {
  const code = kantonsKuerzel(canton);
  const rawXml = CANTON_WAPPEN_SVG[code];

  const xml = useMemo(() => {
    if (!rawXml) return null;
    const inner = rawXml.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    return `<svg viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="shield"><path d="${SHIELD_PATH}"/></clipPath></defs>
      <g clip-path="url(#shield)">${inner}</g>
      <path d="${SHIELD_PATH}" fill="none" stroke="#1a1a1a" stroke-width="0.45" stroke-opacity="0.55"/>
    </svg>`;
  }, [rawXml]);

  if (!xml) {
    return <View style={{ width: size, height: size }} />;
  }

  return <SvgXml xml={xml} width={size} height={size} />;
}
