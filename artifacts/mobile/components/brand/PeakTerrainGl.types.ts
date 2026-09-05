import type { LocalTerrainModel } from "@/lib/terrainModel";

export interface PeakTerrainGlProps {
  terrainModel: LocalTerrainModel;
  bearingDeg: number;
  backgroundColor: string;
  fallbackColor: string;
  onReady?: () => void;
}