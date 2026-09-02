import type { PanoramaGipfel } from "@/lib/panorama";

export interface PeakArNavigatorProps {
  peaks: readonly PanoramaGipfel[];
  onError?: () => void;
}