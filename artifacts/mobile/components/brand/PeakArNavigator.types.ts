import type { PanoramaGipfel } from "@/lib/panorama";
import type { LocalTerrainModel } from "@/lib/terrainModel";
import type { TerrainProfilePoint } from "@/lib/terrainCues";

export interface PeakArNavigatorProps {
  peaks: readonly PanoramaGipfel[];
  terrainProfile?: readonly TerrainProfilePoint[] | null;
  terrainModel?: LocalTerrainModel | null;
  heading?: number | null;
  observerElevationM?: number | null;
  onError?: () => void;
}