import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroBox,
  ViroMaterials,
  ViroNode,
  ViroSphere,
  isARSupportedOnDevice,
} from "@reactvision/react-viro";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import type { PanoramaGipfel } from "@/lib/panorama";
import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

const PEAK_MATERIAL = "sagatrailPeakMarker";

// Keep the first Viro marker deliberately simple. ViroText previously exercised
// ViroKit's text/OpenGL path that could abort natively on iOS 26. A constant
// colored sphere + stem gives us a real AR-world marker without that risk.
ViroMaterials.createMaterials({
  [PEAK_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: "#ff6b35",
    bloomThreshold: 0.35,
  },
});

interface PeakArSceneProps {
  sceneNavigator?: {
    viroAppProps?: PeakArSceneAppProps;
  };
}

interface PeakArSceneAppProps {
  peaks: readonly PanoramaGipfel[];
  onPeakPress?: (peakId: string) => void;
  onError?: () => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Projects geographic peak data into the local Viro world.
 *
 * With GravityAndHeading, Viro keeps the world aligned to the compass:
 * +x points east and -z north. Peaks therefore use their absolute geographic
 * bearing. ARKit rotates the camera through this fixed world while the phone
 * moves; feeding the changing relative phone heading back into the node
 * position would rotate the marker twice.
 */
function peakPosition(peak: PanoramaGipfel): [number, number, number] | null {
  if (
    !Number.isFinite(peak.bearingDeg) ||
    !Number.isFinite(peak.distanceKm) ||
    peak.distanceKm < 0
  ) {
    return null;
  }

  const distanceM = clamp(peak.distanceKm * 1000 * 0.04, 7, 14);
  const bearingRad = (peak.bearingDeg * Math.PI) / 180;
  const elevationRad =
    peak.elevationAngleDeg != null && Number.isFinite(peak.elevationAngleDeg)
      ? (peak.elevationAngleDeg * Math.PI) / 180
      : 0;

  return [
    Math.sin(bearingRad) * distanceM,
    clamp(Math.tan(elevationRad) * distanceM, -8, 8),
    -Math.cos(bearingRad) * distanceM,
  ];
}

function PeakArScene({ sceneNavigator }: PeakArSceneProps) {
  const { peaks = [], onPeakPress, onError } =
    sceneNavigator?.viroAppProps ?? {};

  useEffect(() => {
    console.log("[PeakAR] Viro markers updated", {
      peakCount: peaks.length,
    });
  }, [peaks]);

  return (
    <ViroARScene onError={() => onError?.()}>
      {peaks.map((peak) => {
        const position = peakPosition(peak);
        if (!position) return null;

        return (
          <ViroNode
            key={peak.id}
            position={position}
            transformBehaviors="billboard"
            renderingOrder={100}
            onClick={() => onPeakPress?.(peak.id)}
            viroTag={`peak:${peak.id}`}
          >
            <ViroBox
              position={[0, -0.72, 0]}
              width={0.12}
              height={1.44}
              length={0.12}
              materials={PEAK_MATERIAL}
              shadowCastingBitMask={0}
            />
            <ViroSphere
              radius={0.36}
              widthSegmentCount={12}
              heightSegmentCount={8}
              materials={PEAK_MATERIAL}
              shadowCastingBitMask={0}
            />
          </ViroNode>
        );
      })}
    </ViroARScene>
  );
}

export function PeakArNavigator({
  peaks,
  onPeakPress,
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
      // React Viro's declaration omits the sceneNavigator prop that its runtime
      // injects into every scene component.
      scene: PeakArScene as unknown as () => ReturnType<typeof PeakArScene>,
    }),
    [],
  );
  const viroAppProps = useMemo<PeakArSceneAppProps>(
    () => ({ peaks, onPeakPress, onError }),
    [onError, onPeakPress, peaks],
  );

  // Do not create the native Viro surface until ARKit/ARCore has confirmed
  // that this device can run it. Unsupported devices otherwise fail during
  // native camera-session creation, before Viro can report onError.
  if (supportState !== "supported") return null;

  return (
    <ViroARSceneNavigator
      style={StyleSheet.absoluteFill}
      initialScene={initialScene}
      viroAppProps={viroAppProps}
      autofocus
      // iOS 26 rejects ViroKit's default photo-output dimensions on some
      // camera formats. Low selects a smaller supported ARKit format while
      // keeping the Viro scene and tracking enabled.
      videoQuality="Low"
      // Keep ViroKit's OpenGL tone-mapping pass disabled on iOS 26. The AR
      // camera/tracking surface is retained, while all labels are rendered
      // by the React-Native overlay outside this scene.
      hdrEnabled={false}
      // These optional renderer features are not needed for the empty scene.
      pbrEnabled={false}
      bloomEnabled={false}
      shadowsEnabled={false}
      multisamplingEnabled={false}
      worldAlignment="GravityAndHeading"
    />
  );
}