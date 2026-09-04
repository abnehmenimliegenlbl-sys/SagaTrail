import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroText,
  isARSupportedOnDevice,
} from "@reactvision/react-viro";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import type { PanoramaGipfel } from "@/lib/panorama";
import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

interface PeakArSceneProps {
  peaks: readonly PanoramaGipfel[];
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
  onError,
}: PeakArSceneProps) {
  const renderablePeaks = useMemo(
    () => peaks.filter((peak) => peak.relativeBearingDeg != null).slice(0, 6),
    [peaks],
  );

  return (
    <ViroARScene onError={() => onError?.()}>
      {renderablePeaks.map((peak) => (
        <ViroText
          key={peak.id}
          position={positionForPeak(peak)}
          transformBehaviors="billboard"
          text={`${peak.name}\n${peak.distanceKm.toFixed(1)} km${
            peak.elevationM != null ? ` · ${Math.round(peak.elevationM)} m` : ""
          }`}
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
          onError={onError}
        />
      ),
    }),
    [peaks, onError],
  );

  // Do not create the native Viro surface until ARKit/ARCore has confirmed
  // that this device can run it. Unsupported devices otherwise fail during
  // native camera-session creation, before Viro can report onError.
  if (supportState !== "supported") return null;

  return (
    <ViroARSceneNavigator
      // Viro stores initialScene internally. Remount only when the actual
      // peak set changes (for example when the live request finishes), not on
      // every compass update.
      key={peaks.map((peak) => peak.id).join("|")}
      style={StyleSheet.absoluteFillObject}
      initialScene={initialScene}
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