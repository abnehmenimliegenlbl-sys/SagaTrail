/**
 * Schriftrollen laut Style Guide — drei Schriften, drei feste Aufgaben.
 *
 * - Titel / Sagen-Titel / Kapitelmarken: Albert Sans
 * - Fliesstext / Erzaehlung: Karla (Kursiv = atmosphaerische Story-Stimme)
 * - Messwerte (Distanz, Hoehe, Zeit, Koordinaten, SAC): JetBrains Mono
 *
 * NIE Mono fuer Erzaehltext, NIE Karla fuer Messwerte.
 */
export const fonts = {
  titleBlack: "AlbertSans_900Black",
  titleBold: "AlbertSans_700Bold",
  titleMedium: "AlbertSans_500Medium",

  body: "Karla_400Regular",
  bodyMedium: "Karla_500Medium",
  bodyBold: "Karla_700Bold",
  story: "Karla_400Regular_Italic",

  mono: "JetBrainsMono_400Regular",
  monoBold: "JetBrainsMono_600SemiBold",
} as const;
