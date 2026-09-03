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
  lat: number;
  lng: number;
  distanceKm: number;
  bearingDeg: number;
  /** Relative Richtung zum aktuellen Telefonkurs (-180 bis 180 Grad). */
  relativeBearingDeg: number | null;
  /** OSM-Höhe des Gipfels; null wenn nicht gepflegt. */
  elevationM: number | null;
  /** Echter Höhenwinkel vom aktuellen Standort; null bei fehlender Höhe. */
  elevationAngleDeg: number | null;
}

export interface PanoramaGipfelDatensatz {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevationM: number | null;
}

export interface OfflinePanoramaDatenbank {
  version: number;
  source: string;
  downloadedAt: number;
  peaks: PanoramaGipfelDatensatz[];
}

export const PANORAMA_OFFLINE_VERSION = 1;
export const PANORAMA_OFFLINE_SOURCE =
  "OpenStreetMap natural=peak via Overpass; Höhe aus OSM ele";

interface GipfelPoi {
  id: string;
  name: string;
  kind: string;
  lat: number;
  lng: number;
  elevation?: number | null;
  elevationM?: number | null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Erstellt aus dem OSM-POI-Download einen eigenständigen, kleinen Offline-
 * Datensatz. Die Quelle und Version reisen mit, damit alte lokale Datensätze
 * nicht stillschweigend als aktuell ausgegeben werden.
 */
export function createOfflinePanoramaDatenbank(
  pois: readonly GipfelPoi[],
  downloadedAt: number = Date.now(),
): OfflinePanoramaDatenbank {
  const seen = new Set<string>();
  const peaks: PanoramaGipfelDatensatz[] = [];
  for (const poi of pois) {
    if (
      poi.kind !== "natural=peak" ||
      typeof poi.id !== "string" ||
      typeof poi.name !== "string" ||
      poi.name.trim().length === 0 ||
      !Number.isFinite(poi.lat) ||
      !Number.isFinite(poi.lng) ||
      seen.has(poi.id)
    ) {
      continue;
    }
    seen.add(poi.id);
    peaks.push({
      id: poi.id,
      name: poi.name.trim(),
      lat: poi.lat,
      lng: poi.lng,
      elevationM: finiteNumber(poi.elevation ?? poi.elevationM),
    });
  }
  return {
    version: PANORAMA_OFFLINE_VERSION,
    source: PANORAMA_OFFLINE_SOURCE,
    downloadedAt,
    peaks,
  };
}

export function isOfflinePanoramaDatenbank(
  value: unknown,
): value is OfflinePanoramaDatenbank {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<OfflinePanoramaDatenbank>;
  return (
    data.version === PANORAMA_OFFLINE_VERSION &&
    data.source === PANORAMA_OFFLINE_SOURCE &&
    typeof data.downloadedAt === "number" &&
    Array.isArray(data.peaks)
  );
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
  observerElevationM: number | null = null,
): PanoramaGipfel[] {
  if (!position) return [];

  const seen = new Set<string>();
  return pois
    .filter((poi) => poi.kind === "natural=peak" && poi.name.trim().length > 0)
    .map((poi): PanoramaGipfel => {
      const target: LatLng = { lat: poi.lat, lng: poi.lng };
      const distanceKm = haversineKm(position, target);
      const targetBearing = bearingDeg(position, target);
      const elevationM = finiteNumber(poi.elevation ?? poi.elevationM);
      const elevationAngleDeg =
        elevationM != null && finiteNumber(observerElevationM) != null
          ? (Math.atan2(
              elevationM - (observerElevationM as number),
              Math.max(1, distanceKm * 1000),
            ) *
              180) /
            Math.PI
          : null;
      return {
        id: poi.id,
        name: poi.name.trim(),
        lat: poi.lat,
        lng: poi.lng,
        distanceKm,
        bearingDeg: targetBearing,
        elevationM,
        elevationAngleDeg,
        relativeBearingDeg:
          heading == null ? null : signedBearingDifference(targetBearing, heading),
      };
    })
    .filter((peak) => {
      if (seen.has(peak.id)) return false;
      seen.add(peak.id);
      return true;
    })
    .filter((peak) => peak.distanceKm <= 20)
    .sort((a, b) => {
      const aAngle = a.relativeBearingDeg == null ? 180 : Math.abs(a.relativeBearingDeg);
      const bAngle = b.relativeBearingDeg == null ? 180 : Math.abs(b.relativeBearingDeg);
      return aAngle - bAngle || a.distanceKm - b.distanceKm;
    })
    .slice(0, 8);
}
