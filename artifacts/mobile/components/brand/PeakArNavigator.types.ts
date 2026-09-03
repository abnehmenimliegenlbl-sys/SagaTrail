import type { PanoramaGipfel } from "@/lib/panorama";
import type { TerrainProfilePoint } from "@/lib/terrainCues";

export interface PeakArNavigatorProps {
  peaks: readonly PanoramaGipfel[];
  terrainProfile?: readonly TerrainProfilePoint[] | null;
  onError?: () => void;
}