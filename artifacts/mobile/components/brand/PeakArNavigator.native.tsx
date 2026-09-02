import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroNode,
  ViroText,
} from "@reactvision/react-viro";
import { useMemo, type JSX } from "react";
import { StyleSheet } from "react-native";

import type { PanoramaGipfel } from "@/lib/panorama";
import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

interface PeakArSceneProps {
  sceneNavigator?: {
    viroAppProps?: {
      peaks?: readonly PanoramaGipfel[];
      onError?: () => void;
    };
  };
}

function positionForPeak(peak: PanoramaGipfel, index: number): [number, number, number] {
  const bearing = ((peak.relativeBearingDeg ?? 0) * Math.PI) / 180;
  // AR scenes are local spaces. Compress long mountain distances logarithmically
  // so nearby and distant peaks are both readable without putting nodes outside
  // the useful tracking range.
  const depth = Math.max(4, Math.min(24, 4 + Math.sqrt(peak.distanceKm) * 2.4));
  const height = 1.35 + (index % 3) * 0.24;

  return [Math.sin(bearing) * depth, height, -Math.cos(bearing) * depth];
}

function PeakArScene({ sceneNavigator }: PeakArSceneProps) {
  const appProps = sceneNavigator?.viroAppProps;
  const peaks = appProps?.peaks ?? [];
  const visiblePeaks = useMemo(
    () =>
      peaks
        .filter((peak) => peak.relativeBearingDeg != null)
        .slice(0, 6),
    [peaks],
  );

  return (
    <ViroARScene
      onError={() => appProps?.onError?.()}
    >
      {visiblePeaks.map((peak, index) => (
        <ViroNode
          key={peak.id}
          position={positionForPeak(peak, index)}
          transformBehaviors="billboard"
        >
          <ViroText
            text={`${peak.name}\n${peak.distanceKm.toFixed(1)} km`}
            color="#FFFFFF"
            outerStroke={{
              type: "Outline",
              width: 2,
              color: "#10251D",
            }}
            style={styles.peakLabel}
          />
        </ViroNode>
      ))}
    </ViroARScene>
  );
}

export function PeakArNavigator({ peaks, onError }: PeakArNavigatorProps) {
  return (
    <ViroARSceneNavigator
      style={StyleSheet.absoluteFillObject}
      // Viro injects sceneNavigator at runtime, but its type currently declares
      // the scene callback without the injected props.
      initialScene={{
        scene: PeakArScene as unknown as () => JSX.Element,
      }}
      viroAppProps={{ peaks, onError }}
      autofocus
      worldAlignment="GravityAndHeading"
    />
  );
}

const styles = StyleSheet.create({
  peakLabel: {
    fontSize: 0.18,
    fontWeight: "700",
    textAlign: "center",
    textAlignVertical: "center",
  },
});