import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroBox,
  ViroGeometry,
  ViroMaterials,
  ViroNode,
  ViroPolyline,
  ViroSphere,
  ViroText,
  isARSupportedOnDevice,
} from "@reactvision/react-viro";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import type { PanoramaGipfel } from "@/lib/panorama";
import {
  buildLocalTerrainRouteLines,
  buildLocalTerrainMesh,
  terrainVisibilityForPeak,
  type LocalTerrainMesh,
  type LocalTerrainModel,
  type TerrainRouteLine,
} from "@/lib/terrainModel";
import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

const PEAK_RED_MATERIAL = "sagatrailPeakMarkerRed";
const PEAK_WHITE_MATERIAL = "sagatrailPeakMarkerWhite";
const TERRAIN_SURFACE_MATERIAL = "sagatrailTerrainSurface";
const TERRAIN_GRID_MATERIAL = "sagatrailTerrainGrid";
const TERRAIN_ROUTE_MATERIAL = "sagatrailTerrainRoute";
const TERRAIN_USER_MATERIAL = "sagatrailTerrainUser";
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
  [TERRAIN_SURFACE_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: "#24D6C2",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
  [TERRAIN_GRID_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: "#B7FFF7",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
  [TERRAIN_ROUTE_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: "#FFD166",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
  [TERRAIN_USER_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: "#FFFFFF",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
});

interface PeakArSceneProps {
  sceneNavigator?: {
    viroAppProps?: PeakArSceneAppProps;
  };
}

interface PeakArSceneAppProps {
  peaks: readonly PanoramaGipfel[];
  terrainModel?: LocalTerrainModel | null;
  routeGeometry?: readonly number[][] | null;
  heading?: number | null;
  observerElevationM?: number | null;
  selectedPeakId?: string | null;
  onPeakPress?: (peakId: string) => void;
  onError?: () => void;
}

function TerrainHologram({
  model,
  routeGeometry,
  heading,
}: {
  model: LocalTerrainModel | null | undefined;
  routeGeometry: readonly number[][] | null | undefined;
  heading: number | null | undefined;
}) {
  const stableHeading = heading ?? 0;
  const mesh = useMemo<LocalTerrainMesh | null>(
    () => buildLocalTerrainMesh(model, stableHeading),
    [model, stableHeading],
  );
  const routeLines = useMemo<TerrainRouteLine[]>(
    () => buildLocalTerrainRouteLines(model, routeGeometry, stableHeading),
    [model, routeGeometry, stableHeading],
  );

  if (!mesh) return null;

  const terrainRays = model?.rays
    .filter((ray) => ray.samples.length >= 2)
    .slice()
    .sort((a, b) => a.bearingDeg - b.bearingDeg);
  const rayCount = terrainRays?.length ?? 0;
  const ringCount = rayCount > 0 ? mesh.vertices.length / rayCount : 0;
  const gridLines: LocalTerrainMesh["vertices"][] = [];

  if (rayCount >= 4 && Number.isInteger(ringCount) && ringCount >= 2) {
    for (let rayIndex = 0; rayIndex < rayCount; rayIndex += 1) {
      gridLines.push(
        mesh.vertices.slice(rayIndex * ringCount, (rayIndex + 1) * ringCount),
      );
    }
    for (let ringIndex = 1; ringIndex < ringCount; ringIndex += 1) {
      gridLines.push(
        Array.from({ length: rayCount }, (_, rayIndex) =>
          mesh.vertices[rayIndex * ringCount + ringIndex],
        ),
      );
    }
  }

  const headingRad = (stableHeading * Math.PI) / 180;
  const distanceM = 4;

  return (
    <ViroNode
      position={[
        Math.sin(headingRad) * distanceM,
        -0.8,
        -Math.cos(headingRad) * distanceM,
      ]}
      rotation={[0, -stableHeading, 0]}
      scale={[0.075, 0.075, 0.075]}
      renderingOrder={10}
      opacity={0.78}
      viroTag="terrain-hologram"
    >
      <ViroGeometry
        vertices={mesh.vertices}
        normals={mesh.normals}
        triangleIndices={mesh.triangleIndices}
        materials={TERRAIN_SURFACE_MATERIAL}
        opacity={0.2}
        shadowCastingBitMask={0}
      />
      {gridLines.map((points, index) => (
        <ViroPolyline
          key={`terrain-grid-${index}`}
          points={points}
          thickness={0.012}
          materials={TERRAIN_GRID_MATERIAL}
          opacity={0.8}
        />
      ))}
      {routeLines.map((points, index) => (
        <ViroPolyline
          key={`terrain-route-${index}`}
          points={points}
          thickness={0.045}
          materials={TERRAIN_ROUTE_MATERIAL}
          opacity={1}
        />
      ))}
      <ViroPolyline
        points={[
          [0, 0, 0],
          [0, 1.8, 0],
        ]}
        thickness={0.055}
        materials={TERRAIN_USER_MATERIAL}
        opacity={1}
      />
      <ViroSphere
        position={[0, 0.06, 0]}
        radius={0.38}
        widthSegmentCount={12}
        heightSegmentCount={8}
        materials={TERRAIN_USER_MATERIAL}
        shadowCastingBitMask={0}
      />
      <ViroText
        text="DU"
        position={[0, 2.15, 0]}
        width={1.6}
        height={0.34}
        color="#FFFFFF"
        maxLines={1}
        style={{
          fontSize: 14,
          fontWeight: "700",
          textAlign: "center",
          textAlignVertical: "center",
        }}
      />
    </ViroNode>
  );
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
  const {
    peaks = [],
    terrainModel = null,
    routeGeometry = null,
    heading = null,
    observerElevationM = null,
    selectedPeakId = null,
    onPeakPress,
    onError,
  } =
    sceneNavigator?.viroAppProps ?? {};
  useEffect(() => {
    console.log("[PeakAR] Viro markers updated", {
      peakCount: peaks.length,
    });
  }, [peaks]);

  return (
    <ViroARScene onError={() => onError?.()}>
      {/* The model is observer-centred and uses geographic bearings. With
          GravityAndHeading, heading 0 is the stable geographic Viro frame. */}
      <TerrainHologram
        model={terrainModel}
        routeGeometry={routeGeometry}
        heading={heading}
      />
      {peaks.map((peak) => {
        const position = peakPosition(peak);
        if (!position) return null;
        const terrainVisibility = terrainVisibilityForPeak(
          terrainModel,
          peak,
          observerElevationM,
        );
        const isSelected = peak.id === selectedPeakId;

        return (
          <ViroNode
            key={peak.id}
            position={position}
            scale={peakMarkerScale(peak)}
            // Keep occluded markers in the native tree. Only their opacity
            // changes, avoiding the iOS 26 removeReactSubview crash.
            opacity={terrainVisibility === "occluded" ? 0 : 1}
            transformBehaviors="billboard"
            renderingOrder={100}
            onClick={() => onPeakPress?.(peak.id)}
            viroTag={`peak:${peak.id}`}
          >
            {/* Always mounted selection halo; opacity alone changes on tap. */}
            <ViroSphere
              position={[0, 1.95, 0.01]}
              radius={0.34}
              widthSegmentCount={16}
              heightSegmentCount={10}
              materials={PEAK_RED_MATERIAL}
              opacity={isSelected ? 0.32 : 0}
              shadowCastingBitMask={0}
            />
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
  terrainModel = null,
  routeGeometry = null,
  heading = null,
  observerElevationM = null,
  selectedPeakId = null,
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
    () => ({
      peaks,
      terrainModel,
      routeGeometry,
      heading,
      observerElevationM,
      selectedPeakId,
      onPeakPress,
      onError,
    }),
    [
      onError,
      heading,
      observerElevationM,
      onPeakPress,
      peaks,
      routeGeometry,
      selectedPeakId,
      terrainModel,
    ],
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