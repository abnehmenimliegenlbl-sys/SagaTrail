/**
 * Waehlt ein repraesentatives Panorama-Bild fuer eine Route — passend zur
 * aktuellen Jahreszeit und zur Hoehenlage (Tal vs. hochalpin). Die Bilder
 * sind gebuendelt, damit die Auswahl auch offline funktioniert.
 */

import { bearingDeg, haversineKm } from "@/lib/geo";
import type { LatLng } from "@/types";

const BILDER = {
  fruehling: {
    tal: require("@/assets/images/panorama/fruehling-tal.jpg"),
    alpin: require("@/assets/images/panorama/fruehling-alpin.jpg"),
  },
  sommer: {
    tal: require("@/assets/images/panorama/sommer-tal.jpg"),
    alpin: require("@/assets/images/panorama/sommer-alpin.jpg"),
  },
  herbst: {
    tal: require("@/assets/images/panorama/herbst-tal.jpg"),
    alpin: require("@/assets/images/panorama/herbst-alpin.jpg"),
  },
  winter: {
    tal: require("@/assets/images/panorama/winter-tal.jpg"),
    alpin: require("@/assets/images/panorama/winter-alpin.jpg"),
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

export interface PanoramaGipfel {
  id: string;
  name: string;
  distanceKm: number;
  bearingDeg: number;
  /** Relative Richtung zum aktuellen Telefonkurs (-180 bis 180 Grad). */
  relativeBearingDeg: number | null;
  /** OSM-Höhe des Gipfels; null wenn nicht gepflegt. */
  elevationM: number | null;
}

interface GipfelPoi {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lng: number;
  elevation?: number | null;
}

function signedBearingDifference(target: number, heading: number): number {
  return ((target - heading + 540) % 360) - 180;
}

/**
 * Ermittelt echte OSM-Gipfel im Umfeld der aktuellen Position und berechnet
 * ihre Lage im Sichtfeld. Das ist bewusst eine geografische Erkennung, keine
 * visuelle KI-Bildanalyse: Es werden nur Gipfel angezeigt, die der Server als
 * natural=peak geliefert hat.
 */
export function erkenneGipfel(
  pois: readonly GipfelPoi[],
  position: LatLng | null,
  heading: number | null,
): PanoramaGipfel[] {
  if (!position) return [];

  return pois
    .filter((poi) => poi.kind === "natural=peak" && poi.name.trim().length > 0)
    .map((poi): PanoramaGipfel => {
      const target: LatLng = { lat: poi.lat, lng: poi.lng };
      const distanceKm = haversineKm(position, target);
      const targetBearing = bearingDeg(position, target);
      return {
        id: poi.id,
        name: poi.name.trim(),
        distanceKm,
        bearingDeg: targetBearing,
        elevationM: poi.elevation ?? null,
        relativeBearingDeg:
          heading == null ? null : signedBearingDifference(targetBearing, heading),
      };
    })
    .filter((peak) => peak.distanceKm <= 20)
    .sort((a, b) => {
      const aAngle = a.relativeBearingDeg == null ? 180 : Math.abs(a.relativeBearingDeg);
      const bAngle = b.relativeBearingDeg == null ? 180 : Math.abs(b.relativeBearingDeg);
      return aAngle - bAngle || a.distanceKm - b.distanceKm;
    })
    .slice(0, 8);
}
