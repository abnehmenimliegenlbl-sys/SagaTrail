import type { LocalTerrainModel } from "@/lib/terrainModel";
import type { PanoramaGipfel } from "@/lib/panorama";

export type PeakTerrainTextureMode = "map" | "satellite";

export interface PeakTerrainGlProps {
  terrainModel: LocalTerrainModel;
  bearingDeg: number;
  textureMode: PeakTerrainTextureMode;
  backgroundColor: string;
  fallbackColor: string;
  peaks?: readonly PanoramaGipfel[];
  selectedPeakId?: string | null;
  onPeakPress?: (peakId: string) => void;
  onReady?: () => void;
}