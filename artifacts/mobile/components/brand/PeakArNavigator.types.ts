import type { PanoramaGipfel } from "@/lib/panorama";
import type { LocalTerrainModel } from "@/lib/terrainModel";
import type { TerrainProfilePoint } from "@/lib/terrainCues";

export interface PeakArNavigatorProps {
  peaks: readonly PanoramaGipfel[];
  terrainProfile?: readonly TerrainProfilePoint[] | null;
  terrainModel?: LocalTerrainModel | null;
  routeGeometry?: readonly number[][] | null;
  mapLayer?: "topo" | "sat";
  heading?: number | null;
  observerElevationM?: number | null;
  selectedPeakId?: string | null;
  onPeakPress?: (peakId: string) => void;
  onError?: () => void;
}