import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroBox,
  ViroMaterials,
  ViroNode,
  ViroSphere,
  ViroText,
  isARSupportedOnDevice,
} from "@reactvision/react-viro";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import type { PanoramaGipfel } from "@/lib/panorama";
import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

const PEAK_RED_MATERIAL = "sagatrailPeakMarkerRed";
const PEAK_WHITE_MATERIAL = "sagatrailPeakMarkerWhite";
const PEAK_RED = "#D71920";
const PEAK_WHITE = "#FFFFFF";

ViroMaterials.createMaterials({
  [PEAK_RED_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: PEAK_RED,
  },
  [PEAK_WHITE_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: PEAK_WHITE,
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
const PEAK_DEPTH_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [0.5, 7],
  [2, 11],
  [5, 16],
  [10, 21],
  [30, 28],
];

function peakVirtualDistance(distanceKm: number): number {
  if (distanceKm <= PEAK_DEPTH_ANCHORS[0][0]) {
    return PEAK_DEPTH_ANCHORS[0][1];
  }

  for (let index = 1; index < PEAK_DEPTH_ANCHORS.length; index += 1) {
    const [upperKm, upperVirtualM] = PEAK_DEPTH_ANCHORS[index];
    const [lowerKm, lowerVirtualM] = PEAK_DEPTH_ANCHORS[index - 1];
    if (distanceKm <= upperKm) {
      const logarithmicRatio =
        Math.log(distanceKm / lowerKm) / Math.log(upperKm / lowerKm);
      return (
        lowerVirtualM +
        logarithmicRatio * (upperVirtualM - lowerVirtualM)
      );
    }
  }

  return PEAK_DEPTH_ANCHORS[PEAK_DEPTH_ANCHORS.length - 1][1];
}

function peakPosition(peak: PanoramaGipfel): [number, number, number] | null {
  if (
    !Number.isFinite(peak.bearingDeg) ||
    !Number.isFinite(peak.distanceKm) ||
    peak.distanceKm < 0
  ) {
    return null;
  }

  const distanceM = peakVirtualDistance(peak.distanceKm);
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

function peakMarkerScale(peak: PanoramaGipfel): [number, number, number] {
  const distanceM = peakVirtualDistance(peak.distanceKm);
  // Partially compensate for perspective so distant labels stay readable,
  // while nearby peaks still appear up to roughly twice as large.
  const scale = Math.sqrt(distanceM / 28);
  return [scale, scale, scale];
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
            scale={peakMarkerScale(peak)}
            transformBehaviors="billboard"
            renderingOrder={100}
            onClick={() => onPeakPress?.(peak.id)}
            viroTag={`peak:${peak.id}`}
          >
            {/* Thin pointer: its lower edge is the exact summit target. */}
            <ViroBox
              position={[0, 0.2, 0]}
              width={0.035}
              height={0.4}
              length={0.035}
              materials={PEAK_RED_MATERIAL}
              shadowCastingBitMask={0}
            />

            {/* Red outer capsule, lifted above the pointer. */}
            <ViroBox
              position={[0, 1.93, 0]}
              width={0.4}
              height={2.6}
              length={0.08}
              materials={PEAK_RED_MATERIAL}
              shadowCastingBitMask={0}
            />
            <ViroSphere
              position={[0, 0.63, 0]}
              radius={0.2}
              widthSegmentCount={12}
              heightSegmentCount={8}
              materials={PEAK_RED_MATERIAL}
              shadowCastingBitMask={0}
            />
            <ViroSphere
              position={[0, 3.23, 0]}
              radius={0.2}
              widthSegmentCount={12}
              heightSegmentCount={8}
              materials={PEAK_RED_MATERIAL}
              shadowCastingBitMask={0}
            />

            {/* White inset body leaves a narrow red outline and red height cap. */}
            <ViroBox
              position={[0, 1.72, 0.015]}
              width={0.36}
              height={2.12}
              length={0.09}
              materials={PEAK_WHITE_MATERIAL}
              shadowCastingBitMask={0}
            />
            <ViroSphere
              position={[0, 0.66, 0.015]}
              radius={0.18}
              widthSegmentCount={12}
              heightSegmentCount={8}
              materials={PEAK_WHITE_MATERIAL}
              shadowCastingBitMask={0}
            />

            <ViroText
              text={peak.name.toUpperCase()}
              position={[0, 1.72, 0.075]}
              rotation={[0, 0, -90]}
              width={1.92}
              height={0.26}
              color={PEAK_RED}
              maxLines={1}
              textClipMode="ClipToBounds"
              textLineBreakMode="None"
              style={{
                fontSize: 18,
                fontWeight: "700",
                textAlign: "center",
                textAlignVertical: "center",
              }}
            />

            <ViroText
              text={peak.elevationM == null ? "—" : `${Math.round(peak.elevationM)}m`}
              position={[0, 3.12, 0.075]}
              rotation={[0, 0, -90]}
              width={0.82}
              height={0.22}
              color={PEAK_WHITE}
              maxLines={1}
              textClipMode="ClipToBounds"
              textLineBreakMode="None"
              style={{
                fontSize: 12,
                fontWeight: "700",
                textAlign: "center",
                textAlignVertical: "center",
              }}
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