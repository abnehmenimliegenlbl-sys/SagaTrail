import type { PanoramaGipfel } from "@/lib/panorama";
import type { LocalTerrainModel } from "@/lib/terrainModel";
import type { TerrainProfilePoint } from "@/lib/terrainCues";
import type { LatLng } from "@/types";

export interface PeakArNavigatorProps {
  peaks: readonly PanoramaGipfel[];
  showPeaks?: boolean;
  terrainProfile?: readonly TerrainProfilePoint[] | null;
  terrainModel?: LocalTerrainModel | null;
  observerPosition?: LatLng | null;
  observerAccuracyM?: number | null;
  observerFixAgeMs?: number | null;
  observerRouteDistanceM?: number | null;
  compassReady?: boolean;
  routeGeometry?: readonly number[][] | null;
  mapLayer?: "topo" | "sat";
  heading?: number | null;
  observerElevationM?: number | null;
  selectedPeakId?: string | null;
  onPeakPress?: (peakId: string) => void;
  onTrackingStateChange?: (
    state: "initializing" | "ready" | "limited" | "unavailable",
  ) => void;
  onError?: () => void;
}
