import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroText,
  isARSupportedOnDevice,
} from "@reactvision/react-viro";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import type { PanoramaGipfel } from "@/lib/panorama";
import {
  terrainVisibilityForPeak,
  type LocalTerrainModel,
} from "@/lib/terrainModel";
import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

interface PeakArSceneProps {
  peaks: readonly PanoramaGipfel[];
  terrainModel?: LocalTerrainModel | null;
  observerElevationM?: number | null;
  onError?: () => void;
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

function PeakArScene({
  peaks,
  terrainModel,
  observerElevationM,
  onError,
}: PeakArSceneProps) {
  const peakStates = useMemo(
    () =>
      peaks
        .filter((peak) => peak.relativeBearingDeg != null)
        .map((peak) => ({
          peak,
          visibility: terrainVisibilityForPeak(
            terrainModel,
            peak,
            observerElevationM,
          ),
        }))
        .slice(0, 6),
    [peaks, terrainModel, observerElevationM],
  );

  return (
    <ViroARScene onError={() => onError?.()}>
      {peakStates
        .filter(({ visibility }) => visibility !== "occluded")
        .map(({ peak, visibility }) => (
          <ViroText
            key={peak.id}
            position={positionForPeak(peak)}
            transformBehaviors="billboard"
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

  const initialScene = useMemo(
    () => ({
      scene: () => (
        <PeakArScene
          peaks={peaks}
          terrainModel={terrainModel}
          observerElevationM={observerElevationM}
          onError={onError}
        />
      ),
    }),
    [peaks, terrainModel, observerElevationM, onError],
  );

  // Do not create the native Viro surface until ARKit/ARCore has confirmed
  // that this device can run it. Unsupported devices otherwise fail during
  // native camera-session creation, before Viro can report onError.
  if (supportState !== "supported") return null;

  return (
    <ViroARSceneNavigator
      style={StyleSheet.absoluteFillObject}
      initialScene={initialScene}
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