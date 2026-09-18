import type { LocalTerrainModel } from "./terrainModel";
import { isLocalTerrainModel } from "./terrainModel";

export interface PanoramaGipfelDatensatz {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevationM: number | null;
  /** Herkunft der Höhe; null bleibt ausdrücklich unbekannt. */
  elevationSource: "osm.ele" | "unknown";
}

export interface PanoramaOfflineAbdeckung {
  /** Radius der gespeicherten, benannten Gipfel um den Routen-Korridor. */
  peakCorridorKm: number;
  /** Radius des gespeicherten observer-zentrierten DTM-Modells. */
  terrainRadiusM: number | null;
}

export interface OfflinePanoramaDatenbank {
  version: number;
  source: string;
  elevationSource: "OpenStreetMap ele tag";
  visibilitySource: "SwissTopo DTM radial profiles";
  coverage: PanoramaOfflineAbdeckung;
  downloadedAt: number;
  peaks: PanoramaGipfelDatensatz[];
  terrainProfile?: { distanceKm: number; altM: number }[];
  terrainModel?: LocalTerrainModel;
}

export const PANORAMA_ROUTE_CORRIDOR_KM = 5;
export const PANORAMA_OFFLINE_VERSION = 5;
export const PANORAMA_OFFLINE_SOURCE =
  "OpenStreetMap natural=peak via Overpass; SwissTopo DTM; 5 km Routen-Korridor";

function isValidLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

function isValidTerrainProfile(
  value: unknown,
): value is { distanceKm: number; altM: number }[] {
  if (!Array.isArray(value) || value.length < 2) return false;
  return value.every((point, index) => {
    if (
      !point ||
      typeof point !== "object" ||
      typeof (point as { distanceKm?: unknown }).distanceKm !== "number" ||
      typeof (point as { altM?: unknown }).altM !== "number"
    ) {
      return false;
    }
    const distanceKm = (point as { distanceKm: number }).distanceKm;
    const altM = (point as { altM: number }).altM;
    const previousDistanceKm =
      index === 0
        ? null
        : (value[index - 1] as { distanceKm: number }).distanceKm;
    return (
      Number.isFinite(distanceKm) &&
      distanceKm >= 0 &&
      Number.isFinite(altM) &&
      (previousDistanceKm == null || distanceKm > previousDistanceKm)
    );
  });
}

export function isOfflinePanoramaDatenbank(
  value: unknown,
): value is OfflinePanoramaDatenbank {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<OfflinePanoramaDatenbank>;
  const coverage = data.coverage;
  return (
    data.version === PANORAMA_OFFLINE_VERSION &&
    data.source === PANORAMA_OFFLINE_SOURCE &&
    data.elevationSource === "OpenStreetMap ele tag" &&
    data.visibilitySource === "SwissTopo DTM radial profiles" &&
    !!coverage &&
    typeof coverage === "object" &&
    coverage.peakCorridorKm === PANORAMA_ROUTE_CORRIDOR_KM &&
    (coverage.terrainRadiusM === null ||
      (typeof coverage.terrainRadiusM === "number" &&
        Number.isFinite(coverage.terrainRadiusM) &&
        coverage.terrainRadiusM > 0 &&
        coverage.terrainRadiusM <= 5000)) &&
    typeof data.downloadedAt === "number" &&
    Number.isFinite(data.downloadedAt) &&
    data.downloadedAt > 0 &&
    Array.isArray(data.peaks) &&
    data.peaks.every(
      (peak) =>
        !!peak &&
        typeof peak.id === "string" &&
        peak.id.trim().length > 0 &&
        typeof peak.name === "string" &&
        peak.name.trim().length > 0 &&
        isValidLatitude(peak.lat) &&
        isValidLongitude(peak.lng) &&
        (peak.elevationM === null ||
          (typeof peak.elevationM === "number" &&
            Number.isFinite(peak.elevationM))) &&
        (peak.elevationSource === "osm.ele" ||
          peak.elevationSource === "unknown") &&
        ((peak.elevationM == null && peak.elevationSource === "unknown") ||
          (peak.elevationM != null && peak.elevationSource === "osm.ele")),
    ) &&
    (data.terrainProfile === undefined ||
      isValidTerrainProfile(data.terrainProfile)) &&
    (data.terrainModel === undefined ||
      isLocalTerrainModel(data.terrainModel))
  );
}