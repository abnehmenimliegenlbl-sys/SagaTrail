/**
 * Waehlt ein repraesentatives Panorama-Bild fuer eine Route — passend zur
 * aktuellen Jahreszeit und zur Hoehenlage (Tal vs. hochalpin). Die Bilder
 * sind gebuendelt, damit die Auswahl auch offline funktioniert.
 */

const BILDER = {
  fruehling: {
    tal: require("@/assets/images/panorama/fruehling-tal.png"),
    alpin: require("@/assets/images/panorama/fruehling-alpin.png"),
  },
  sommer: {
    tal: require("@/assets/images/panorama/sommer-tal.png"),
    alpin: require("@/assets/images/panorama/sommer-alpin.png"),
  },
  herbst: {
    tal: require("@/assets/images/panorama/herbst-tal.png"),
    alpin: require("@/assets/images/panorama/herbst-alpin.png"),
  },
  winter: {
    tal: require("@/assets/images/panorama/winter-tal.png"),
    alpin: require("@/assets/images/panorama/winter-alpin.png"),
  },
} as const;

type Jahreszeit = keyof typeof BILDER;

/** Ab dieser Maximalhoehe gilt eine Route als hochalpin. */
const ALPIN_AB_M = 1800;

function aktuelleJahreszeit(datum: Date): Jahreszeit {
  const monat = datum.getMonth() + 1;
  if (monat >= 3 && monat <= 5) return "fruehling";
  if (monat >= 6 && monat <= 8) return "sommer";
  if (monat >= 9 && monat <= 11) return "herbst";
  return "winter";
}

export function panoramaFuerRoute(
  maxElevationM: number | null | undefined,
  datum: Date = new Date(),
): number {
  const jahreszeit = aktuelleJahreszeit(datum);
  const lage = (maxElevationM ?? 0) >= ALPIN_AB_M ? "alpin" : "tal";
  return BILDER[jahreszeit][lage];
}
