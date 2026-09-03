import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroNode,
  ViroText,
  isARSupportedOnDevice,
} from "@reactvision/react-viro";
import { useEffect, useMemo, useState, type JSX } from "react";
import { StyleSheet } from "react-native";

import type { PanoramaGipfel } from "@/lib/panorama";
import {
  terrainVisibilityForPeak,
  type LocalTerrainModel,
} from "@/lib/terrainModel";
import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

interface PeakArSceneProps {
  sceneNavigator?: {
    viroAppProps?: {
      peaks?: readonly PanoramaGipfel[];
      terrainModel?: LocalTerrainModel | null;
      heading?: number | null;
      observerElevationM?: number | null;
      onError?: () => void;
    };
  };
}

function positionForPeak(peak: PanoramaGipfel): [number, number, number] {
  const bearing = ((peak.relativeBearingDeg ?? 0) * Math.PI) / 180;
  // Terrain und Marker verwenden dieselbe Anzeige-Skalierung. Die absolute
  // Distanz bleibt im Datenmodell erhalten; nur die AR-Szene wird für die
  // begrenzte Tracking-Reichweite proportional verkleinert.
  const depth = Math.max(1.5, Math.min(40, peak.distanceKm * 1000 * 0.04));
  const height =
    peak.elevationAngleDeg == null
      ? 0
      : Math.tan((peak.elevationAngleDeg * Math.PI) / 180) * depth;

  return [Math.sin(bearing) * depth, height, -Math.cos(bearing) * depth];
}

function PeakArScene({ sceneNavigator }: PeakArSceneProps) {
  const appProps = sceneNavigator?.viroAppProps;
  const peaks = appProps?.peaks ?? [];
  const peakStates = useMemo(
    () =>
      peaks
        .filter((peak) => peak.relativeBearingDeg != null)
        .map((peak) => ({
          peak,
          visibility: terrainVisibilityForPeak(
            appProps?.terrainModel,
            peak,
            appProps?.observerElevationM,
          ),
        }))
        .slice(0, 6),
    [peaks, appProps?.terrainModel, appProps?.observerElevationM],
  );

  return (
    <ViroARScene
      onError={() => appProps?.onError?.()}
    >
      {peakStates
        .filter(({ visibility }) => visibility !== "occluded")
        .map(({ peak, visibility }) => (
          <ViroNode
            key={peak.id}
            position={positionForPeak(peak)}
            transformBehaviors="billboard"
          >
            <ViroText
              text={`${peak.name}\n${peak.distanceKm.toFixed(1)} km${
                peak.elevationM != null ? ` · ${Math.round(peak.elevationM)} m` : ""
              }${visibility === "unknown" ? "\nGelände unbekannt" : ""}`}
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

export function PeakArNavigator({
  peaks,
  terrainModel,
  heading,
  observerElevationM,
  onError,
}: PeakArNavigatorProps) {
  const [supportState, setSupportState] = useState<
    "checking" | "supported" | "unsupported"
  >("checking");

  useEffect(() => {
    let cancelled = false;

    isARSupportedOnDevice()
      .then(({ isARSupported }) => {
        if (cancelled) return;
        if (isARSupported) {
          setSupportState("supported");
        } else {
          setSupportState("unsupported");
          onError?.();
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSupportState("unsupported");
        onError?.();
      });

    return () => {
      cancelled = true;
    };
  }, [onError]);

  // Do not create the native Viro surface until ARKit/ARCore has confirmed
  // that this device can run it. Unsupported devices otherwise fail during
  // native camera-session creation, before Viro can report onError.
  if (supportState !== "supported") return null;

  return (
    <ViroARSceneNavigator
      style={StyleSheet.absoluteFillObject}
      // Viro injects sceneNavigator at runtime, but its type currently declares
      // the scene callback without the injected props.
      initialScene={{
        scene: PeakArScene as unknown as () => JSX.Element,
      }}
      viroAppProps={{ peaks, terrainModel, heading, observerElevationM, onError }}
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