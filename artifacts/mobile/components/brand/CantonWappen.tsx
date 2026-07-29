import React, { useMemo } from "react";
import { SvgXml } from "react-native-svg";
import { View } from "react-native";

import { CANTON_WAPPEN_SVG } from "@/constants/cantonWappenSvg";
import { kantonsKuerzel } from "@/constants/cantonKuerzel";

// Klassische heraldische Wappenform (flacher oberer Rand, spitz zulaufender
// unterer Rand) innerhalb der 13x13-Koordinaten der Quell-SVGs. Damit wirken
// die Kantonswappen wie echte Schilde statt wie quadratische Fähnchen.
const SHIELD_PATH = "M0,0 H13 V6.7 C13,10.2 9.2,11.9 6.5,13 C3.8,11.9 0,10.2 0,6.7 Z";

// feColorMatrix-Filter: wandelt beliebige Wappenfarben in Grünschattierungen um.
// Dunkelgrün (#1a5230) für dunkle Flächen, Mittelgrün (#52a868) für helle.
// Weisse Flächen landen bei #52a868 statt nahe Weiss — kein "zu viel Weiss" mehr.
// Luminanzformel: L = R*0.2126 + G*0.7152 + B*0.0722
// Ergebnis: R = L*0.220+0.102, G = L*0.337+0.322, B = L*0.220+0.188
const GREEN_FILTER = `
  <filter id="gruen" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="
      0.0468 0.1573 0.0159 0 0.102
      0.0716 0.2410 0.0243 0 0.322
      0.0468 0.1573 0.0159 0 0.188
      0      0      0      1 0
    "/>
  </filter>
`;

// Zeigt das offizielle Wappen eines Kantons in echter Schildform.
// greenShade=true → alle Farben als Grünschattierungen (für lokale Routen).
// Fällt bei unbekannten Kantonsnamen auf einen leeren Platzhalter zurück.
export function CantonWappen({
  canton,
  size = 40,
  greenShade = false,
}: {
  canton: string;
  size?: number;
  /** Wappenfarben auf Grünschattierungen umrechnen (für 3-stellige Lokalrouten). */
  greenShade?: boolean;
}) {
  const code = kantonsKuerzel(canton);
  const rawXml = CANTON_WAPPEN_SVG[code];

  const xml = useMemo(() => {
    if (!rawXml) return null;
    const inner = rawXml.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
    const filterDef = greenShade ? GREEN_FILTER : "";
    const filterAttr = greenShade ? ' filter="url(#gruen)"' : "";
    return `<svg viewBox="0 0 13 13" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="shield"><path d="${SHIELD_PATH}"/></clipPath>
        ${filterDef}
      </defs>
      <g clip-path="url(#shield)"${filterAttr}>${inner}</g>
      <path d="${SHIELD_PATH}" fill="none" stroke="#1a1a1a" stroke-width="0.45" stroke-opacity="0.55"/>
    </svg>`;
  }, [rawXml, greenShade]);

  if (!xml) {
    return <View style={{ width: size, height: size }} />;
  }

  return <SvgXml xml={xml} width={size} height={size} />;
}
