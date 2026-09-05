import type { LocalTerrainModel } from "@/lib/terrainModel";

export type PeakTerrainTextureMode = "map" | "satellite";

export interface PeakTerrainGlProps {
  terrainModel: LocalTerrainModel;
  bearingDeg: number;
  textureMode: PeakTerrainTextureMode;
  backgroundColor: string;
  fallbackColor: string;
  onReady?: () => void;
}