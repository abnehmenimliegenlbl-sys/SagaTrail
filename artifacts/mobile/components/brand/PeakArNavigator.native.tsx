import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroBox,
  ViroGeometry,
  ViroImage,
  ViroMaterials,
  ViroNode,
  ViroPolyline,
  ViroSphere,
  ViroText,
  ViroARTrackingReasonConstants,
  ViroTrackingStateConstants,
  isARSupportedOnDevice,
} from "@reactvision/react-viro";
import type {
  ViroTrackingReason,
  ViroTrackingState,
} from "@reactvision/react-viro";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";

import type { PanoramaGipfel } from "@/lib/panorama";
import type { LatLng } from "@/types";
import type { TerrainProfilePoint, RouteGradeBand } from "@/lib/terrainCues";
import {
  buildGeographicTerrainRouteSegments,
  buildGeographicTerrainRouteDestination,
  buildLocalTerrainMesh,
  buildLocalMapRouteLines,
  terrainVisibilityForPeak,
  type LocalTerrainModel,
  type LocalTerrainMesh,
  type TerrainRouteLine,
  type TerrainRouteSegment,
} from "@/lib/terrainModel";
import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

const PEAK_RED_MATERIAL = "sagatrailPeakMarkerRed";
const PEAK_WHITE_MATERIAL = "sagatrailPeakMarkerWhite";
const FINISH_FLAG_BLACK_MATERIAL = "sagatrailFinishFlagBlack";
const FINISH_FLAG_POLE_MATERIAL = "sagatrailFinishFlagPole";
const TERRAIN_ROUTE_MATERIALS: Record<RouteGradeBand, string> = {
  green: "sagatrailTerrainRouteGreen",
  yellow: "sagatrailTerrainRouteYellow",
  orange: "sagatrailTerrainRouteOrange",
  red: "sagatrailTerrainRouteRed",
};
const TERRAIN_USER_MATERIAL = "sagatrailTerrainUser";
const TERRAIN_ROUTE_UNDERLAY_MATERIAL = "sagatrailTerrainRouteUnderlay";
const TERRAIN_SURFACE_MATERIAL = "sagatrailTerrainSurface";
const PEAK_RED = "#DA291C";
const PEAK_WHITE = "#FFFFFF";
// The DTM remains observer-centred at 500 m. The complete route is projected
// into a compressed 2 km virtual AR depth so the destination remains visible;
// beyond the DTM radius it stays level rather than inventing terrain.
const AR_ROUTE_TERRAIN_RADIUS_M = 500;
const AR_ROUTE_MAX_VIRTUAL_DISTANCE_M = 2_000;
// Viro's AR origin is near the camera, while the visible landscape starts at
// the user's feet. Keep the geographic route on that ground plane and let the
// local DTM elevation differences lift it above/below the plane.
const AR_ROUTE_GROUND_OFFSET = -1.25;
const MAX_AR_PEAK_SLOTS = 40;
const MAX_AR_ROUTE_SEGMENT_SLOTS = 96;
// The flag is intentionally a fixed, readable minimum in AR metres. It must
// remain recognizable even when the route endpoint is at the maximum virtual
// distance, where a physically scaled pin would become a few pixels wide.
const FINISH_FLAG_POLE_HEIGHT = 1.25;
const FINISH_FLAG_WIDTH = 0.7;
const FINISH_FLAG_HEIGHT = 0.45;
const FINISH_FLAG_CELL_WIDTH = FINISH_FLAG_WIDTH / 3;
const FINISH_FLAG_CELL_HEIGHT = FINISH_FLAG_HEIGHT / 2;
const FINISH_FLAG_CENTER_Y =
  FINISH_FLAG_POLE_HEIGHT - FINISH_FLAG_HEIGHT / 2;
const HIDDEN_ROUTE_POINTS: TerrainRouteLine = [
  [0, AR_ROUTE_GROUND_OFFSET, 0],
  [0, AR_ROUTE_GROUND_OFFSET, 0],
];

ViroMaterials.createMaterials({
  [PEAK_RED_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: PEAK_RED,
  },
  [PEAK_WHITE_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: PEAK_WHITE,
  },
  [FINISH_FLAG_BLACK_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: "#111111",
  },
  [FINISH_FLAG_POLE_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: "#222222",
  },
  [TERRAIN_ROUTE_MATERIALS.green]: {
    lightingModel: "Constant",
    diffuseColor: "#20D466",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
  [TERRAIN_ROUTE_MATERIALS.yellow]: {
    lightingModel: "Constant",
    diffuseColor: "#FFD000",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
  [TERRAIN_ROUTE_MATERIALS.orange]: {
    lightingModel: "Constant",
    diffuseColor: "#FF8500",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
  [TERRAIN_ROUTE_MATERIALS.red]: {
    lightingModel: "Constant",
    diffuseColor: "#FF3030",
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
  [TERRAIN_ROUTE_UNDERLAY_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: "#FFFFFF",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
  [TERRAIN_SURFACE_MATERIAL]: {
    lightingModel: "Lambert",
    diffuseColor: "#DCE7E0",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: true,
    readsFromDepthBuffer: true,
  },
});

interface PeakArSceneProps {
  sceneNavigator?: {
    viroAppProps?: PeakArSceneAppProps;
  };
}

interface PeakArSceneAppProps {
  peaks: readonly PanoramaGipfel[];
  terrainProfile?: readonly TerrainProfilePoint[] | null;
  terrainModel?: LocalTerrainModel | null;
  routeGeometry?: readonly number[][] | null;
  observerPosition?: LatLng | null;
  mapLayer?: "topo" | "sat";
  observerElevationM?: number | null;
  selectedPeakId?: string | null;
  onPeakPress?: (peakId: string) => void;
  onError?: () => void;
  onTrackingUpdated?: (
    state: ViroTrackingState,
    reason: ViroTrackingReason,
  ) => void;
}

/**
 * Kept for a future non-AR map presentation. This card is deliberately not
 * mounted in the live panorama because a floating map texture does not blend
 * into the camera landscape.
 */
function TerrainMapHologram({
  model,
  routeGeometry,
  mapLayer,
  heading,
}: {
  model: LocalTerrainModel | null | undefined;
  routeGeometry: readonly number[][] | null | undefined;
  mapLayer: "topo" | "sat";
  heading: number | null | undefined;
}) {
  const stableHeading = heading ?? 0;
  const routeLines = useMemo<TerrainRouteLine[]>(
    () => buildLocalMapRouteLines(model, routeGeometry),
    [model, routeGeometry],
  );

  const mapTile = useMemo(() => {
    if (!model) return null;
    const zoom = 14;
    const latitudeRad = (model.center.lat * Math.PI) / 180;
    const scale = 2 ** zoom;
    const x = ((model.center.lng + 180) / 360) * scale;
    const sinLatitude = Math.sin(latitudeRad);
    const y =
      ((1 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (2 * Math.PI)) / 2) *
      scale;
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const metersPerTile =
      (156543.03392804097 * Math.cos(latitudeRad)) / scale;
    const tileCenterEastM = (tileX + 0.5 - x) * metersPerTile;
    const tileCenterNorthM = (y - (tileY + 0.5)) * metersPerTile;
    // This is a real Viro-world card now; do not apply the old terrain-mesh
    // scale to it or the tile collapses to a thumbnail.
    const cardSize = 2.4;
    const cardScale = cardSize / metersPerTile;
    const base =
      mapLayer === "sat"
        ? "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857"
        : "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857";
    return {
      url: `${base}/${zoom}/${tileX}/${tileY}.${mapLayer === "sat" ? "jpeg" : "jpeg"}`,
      cardSize,
      cardScale,
      offset: [
        -tileCenterEastM * cardScale,
        -tileCenterNorthM * cardScale,
      ] as [number, number],
    };
  }, [model, mapLayer]);

  if (!model || !mapTile) return null;

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
      renderingOrder={10}
      opacity={0.78}
      viroTag="terrain-hologram"
      transformBehaviors="billboard"
    >
      <ViroImage
        source={{ uri: mapTile.url }}
        style={{
          width: mapTile.cardSize,
          height: mapTile.cardSize,
        }}
        resizeMode="StretchToFill"
        opacity={0.92}
        position={[mapTile.offset[0], mapTile.offset[1], 0]}
        viroTag="terrain-map-image"
      />
      {routeLines.map((points, index) => (
        <ViroPolyline
          key={`terrain-route-${index}`}
          points={points.map(([east, north]) => [
            east * mapTile.cardScale,
            north * mapTile.cardScale,
            0.06,
          ])}
          thickness={0.045}
          materials={TERRAIN_ROUTE_MATERIALS.green}
          opacity={1}
        />
      ))}
      <ViroPolyline
        points={[
          [0, 0, 0.08],
          [0, 0.22, 0.08],
        ]}
        thickness={0.025}
        materials={TERRAIN_USER_MATERIAL}
        opacity={1}
      />
      <ViroSphere
        position={[0, 0, 0.08]}
        radius={0.06}
        widthSegmentCount={12}
        heightSegmentCount={8}
        materials={TERRAIN_USER_MATERIAL}
        shadowCastingBitMask={0}
      />
      <ViroText
        text="DU"
        position={[0, 0.3, 0.08]}
        width={0.35}
        height={0.1}
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

function TerrainHologram({
  model,
  routeGeometry,
  observerPosition,
  terrainProfile,
}: {
  model: LocalTerrainModel | null | undefined;
  routeGeometry: readonly number[][] | null | undefined;
  observerPosition: LatLng | null | undefined;
  terrainProfile: readonly TerrainProfilePoint[] | null | undefined;
}) {
  const routeSegments = useMemo<TerrainRouteSegment[]>(
    () =>
      buildGeographicTerrainRouteSegments(
        model,
        routeGeometry,
        observerPosition,
        AR_ROUTE_TERRAIN_RADIUS_M,
        terrainProfile,
        {
          maxSegments: MAX_AR_ROUTE_SEGMENT_SLOTS,
          maxVirtualDistanceM: AR_ROUTE_MAX_VIRTUAL_DISTANCE_M,
        },
      ),
    [model, routeGeometry, observerPosition, terrainProfile],
  );
  const destinationPosition = useMemo(
    () =>
      buildGeographicTerrainRouteDestination(
        model,
        routeGeometry,
        observerPosition,
        AR_ROUTE_TERRAIN_RADIUS_M,
        { maxVirtualDistanceM: AR_ROUTE_MAX_VIRTUAL_DISTANCE_M },
      ),
    [model, routeGeometry, observerPosition],
  );
  const continuousRoutePoints = useMemo<TerrainRouteLine>(() => {
    const points: TerrainRouteLine = [];
    for (const segment of routeSegments) {
      for (const point of segment.points) {
        const previous = points[points.length - 1];
        if (
          !previous ||
          previous[0] !== point[0] ||
          previous[1] !== point[1] ||
          previous[2] !== point[2]
        ) {
          points.push(point);
        }
      }
    }
    return points;
  }, [routeSegments]);

  useEffect(() => {
    console.log("[PeakAR] route overlay", {
      hasModel: Boolean(model),
      observerElevationM: model?.observerElevationM ?? null,
      routePointCount: routeGeometry?.length ?? 0,
      lineCount: routeSegments.length,
      terrainRadiusM: AR_ROUTE_TERRAIN_RADIUS_M,
      maxVirtualDistanceM: AR_ROUTE_MAX_VIRTUAL_DISTANCE_M,
      hasDestination: destinationPosition != null,
    });
  }, [model, routeGeometry, routeSegments.length, destinationPosition]);

  if (routeSegments.length === 0) return null;

  return (
    <ViroNode
      renderingOrder={20}
      opacity={0.96}
      viroTag="terrain-route-ar"
    >
      {continuousRoutePoints.length >= 2 && (
        <ViroPolyline
          points={continuousRoutePoints.map(([east, elevation, north]) => [
            east,
            AR_ROUTE_GROUND_OFFSET + elevation + 0.035,
            north,
          ])}
          thickness={0.036}
          materials={TERRAIN_ROUTE_UNDERLAY_MATERIAL}
          opacity={0.42}
          viroTag="terrain-route-continuity"
        />
      )}
      {Array.from({ length: MAX_AR_ROUTE_SEGMENT_SLOTS }, (_, index) => {
        const segment = routeSegments[index];
        const points = segment?.points ?? HIDDEN_ROUTE_POINTS;
        return (
        <ViroPolyline
          key={`terrain-route-ar-${index}`}
          points={points.map(([east, elevation, north]) => [
            east,
            AR_ROUTE_GROUND_OFFSET + elevation + 0.035,
            north,
          ])}
           thickness={segment?.thickness ?? 0.08}
          materials={TERRAIN_ROUTE_MATERIALS[segment?.band ?? "green"]}
          opacity={segment ? 1 : 0}
        />
        );
      })}
      <ViroNode
        position={
          destinationPosition
            ? [
                destinationPosition[0],
                AR_ROUTE_GROUND_OFFSET + destinationPosition[1] + 0.035,
                destinationPosition[2],
              ]
            : [0, -1000, 0]
        }
        opacity={destinationPosition ? 1 : 0}
        renderingOrder={30}
        transformBehaviors="billboard"
        viroTag="terrain-route-destination"
      >
        <ViroBox
          position={[0, FINISH_FLAG_POLE_HEIGHT / 2, 0]}
          width={0.045}
          height={FINISH_FLAG_POLE_HEIGHT}
          length={0.045}
          materials={FINISH_FLAG_POLE_MATERIAL}
          shadowCastingBitMask={0}
        />
        {Array.from({ length: 2 }, (_, row) =>
          Array.from({ length: 3 }, (_, column) => {
            const isBlack = (row + column) % 2 === 0;
            return (
              <ViroBox
                key={`finish-flag-cell-${row}-${column}`}
                position={[
                  (column + 0.5) * FINISH_FLAG_CELL_WIDTH,
                  FINISH_FLAG_CENTER_Y - row * FINISH_FLAG_CELL_HEIGHT,
                  0,
                ]}
                width={FINISH_FLAG_CELL_WIDTH}
                height={FINISH_FLAG_CELL_HEIGHT}
                length={0.055}
                materials={
                  isBlack
                    ? FINISH_FLAG_BLACK_MATERIAL
                    : PEAK_WHITE_MATERIAL
                }
                shadowCastingBitMask={0}
              />
            );
          }),
        )}
      </ViroNode>
    </ViroNode>
  );
}

function TerrainSurface({
  model,
}: {
  model: LocalTerrainModel | null | undefined;
}) {
  const [textureMaterial, setTextureMaterial] = useState<string | null>(null);
  const mesh = useMemo<LocalTerrainMesh | null>(
    () => buildLocalTerrainMesh(model, 0),
    [model],
  );
  useEffect(() => {
    if (!model) {
      setTextureMaterial(null);
      return;
    }
    const latitudeRadiusDeg = model.radiusM / 111_320;
    const longitudeRadiusDeg =
      model.radiusM /
      Math.max(
        1,
        111_320 * Math.cos((model.center.lat * Math.PI) / 180),
      );
    const params = new URLSearchParams({
      SERVICE: "WMS",
      REQUEST: "GetMap",
      VERSION: "1.3.0",
      LAYERS: "ch.swisstopo.pixelkarte-farbe",
      STYLES: "default",
      CRS: "EPSG:4326",
      BBOX: [
        model.center.lat - latitudeRadiusDeg,
        model.center.lng - longitudeRadiusDeg,
        model.center.lat + latitudeRadiusDeg,
        model.center.lng + longitudeRadiusDeg,
      ].join(","),
      WIDTH: "1024",
      HEIGHT: "1024",
      FORMAT: "image/jpeg",
    });
    const materialName = `${TERRAIN_SURFACE_MATERIAL}-${Math.round(
      model.center.lat * 10_000,
    )}-${Math.round(model.center.lng * 10_000)}`;
    ViroMaterials.createMaterials({
      [materialName]: {
        lightingModel: "Lambert",
        diffuseTexture: {
          uri: `https://wms.geo.admin.ch/?${params.toString()}`,
        },
        diffuseIntensity: 0.9,
        cullMode: "None",
        wrapS: "Clamp",
        wrapT: "Clamp",
        minificationFilter: "Linear",
        magnificationFilter: "Linear",
        mipFilter: "Linear",
        writesToDepthBuffer: true,
        readsFromDepthBuffer: true,
      },
    });
    setTextureMaterial(materialName);
  }, [model]);

  useEffect(() => {
    console.log("[PeakAR] SwissTopo terrain mesh", {
      hasModel: Boolean(model),
      vertexCount: mesh?.vertices.length ?? 0,
      triangleCount: mesh?.triangleIndices.length ?? 0,
      radiusM: model?.radiusM ?? null,
    });
  }, [mesh, model]);

  if (!mesh) return null;

  return (
    <ViroGeometry
      vertices={mesh.vertices}
      normals={mesh.normals}
      texcoords={mesh.texcoords}
      triangleIndices={mesh.triangleIndices}
      materials={textureMaterial ?? TERRAIN_SURFACE_MATERIAL}
      opacity={textureMaterial ? 0.92 : 0.32}
      position={[0, AR_ROUTE_GROUND_OFFSET, 0]}
      renderingOrder={5}
      shadowCastingBitMask={0}
      viroTag="swisstopo-terrain-surface"
    />
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
    terrainProfile = null,
    terrainModel = null,
    routeGeometry = null,
    observerPosition = null,
    observerElevationM = null,
    selectedPeakId = null,
    onPeakPress,
    onError,
    onTrackingUpdated,
  } =
    sceneNavigator?.viroAppProps ?? {};
  useEffect(() => {
    console.log("[PeakAR] Viro markers updated", {
      peakCount: peaks.length,
    });
  }, [peaks]);

  return (
    <ViroARScene
      onError={() => onError?.()}
      onTrackingUpdated={onTrackingUpdated}
    >
      {/* The model is observer-centred and uses geographic bearings. With
          GravityAndHeading, heading 0 is the stable geographic Viro frame. */}
      <TerrainSurface model={terrainModel} />
      <TerrainHologram
        model={terrainModel}
        routeGeometry={routeGeometry}
        observerPosition={observerPosition}
        terrainProfile={terrainProfile}
      />
      {Array.from({ length: MAX_AR_PEAK_SLOTS }, (_, slotIndex) => {
        const peak = peaks[slotIndex] ?? null;
        const position: [number, number, number] = peak
          ? peakPosition(peak) ?? [0, -1000, 0]
          : [0, -1000, 0];
        const terrainVisibility = peak
          ? terrainVisibilityForPeak(terrainModel, peak, observerElevationM)
          : "unknown";
        const isSelected = peak != null && peak.id === selectedPeakId;

        return (
          <ViroNode
            key={`peak-slot-${slotIndex}`}
            position={position}
            scale={peak ? peakMarkerScale(peak) : [1, 1, 1]}
            // Keep occluded markers in the native tree. Only their opacity
            // changes, avoiding the iOS 26 removeReactSubview crash. Empty
            // slots stay mounted as invisible nodes when new data arrives.
            opacity={peak && terrainVisibility !== "occluded" ? 1 : 0}
            transformBehaviors="billboard"
            renderingOrder={100}
            onClick={peak ? () => onPeakPress?.(peak.id) : undefined}
            viroTag={`peak-slot:${slotIndex}`}
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
              text={peak?.name.toUpperCase() ?? ""}
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
              text={
                peak?.elevationM == null
                  ? "—"
                  : `${Math.round(peak.elevationM)}m`
              }
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
  terrainProfile = null,
  terrainModel = null,
  routeGeometry = null,
  observerPosition = null,
  mapLayer = "topo",
  observerElevationM = null,
  selectedPeakId = null,
  onPeakPress,
  onError,
}: PeakArNavigatorProps) {
  const [supportState, setSupportState] = useState<
    "checking" | "supported" | "unsupported"
  >("checking");
  // GravityAndHeading keeps Viro's world origin at the place where this AR
  // session starts. The GPS position may continue moving while the user
  // walks, but re-centering route coordinates on every update would make the
  // virtual line slide over the real landscape instead of staying on the
  // visible trail.
  const [worldOriginPosition, setWorldOriginPosition] =
    useState<LatLng | null>(null);
  const navigatorRef = useRef<{
    _resetARSession?: (resetTracking: boolean, removeAnchors: boolean) => void;
  } | null>(null);
  const trackingStateRef = useRef<ViroTrackingState | null>(null);
  const trackingReasonRef = useRef<ViroTrackingReason | null>(null);
  const trackingResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTrackingResetAtRef = useRef(0);

  useEffect(() => {
    if (worldOriginPosition || !observerPosition) return;
    setWorldOriginPosition(observerPosition);
    console.log("[PeakAR] fixed geographic world origin", observerPosition);
  }, [observerPosition, worldOriginPosition]);

  const clearTrackingResetTimer = useCallback(() => {
    if (trackingResetTimerRef.current) {
      clearTimeout(trackingResetTimerRef.current);
      trackingResetTimerRef.current = null;
    }
  }, []);

  const handleTrackingUpdated = useCallback(
    (state: ViroTrackingState, reason: ViroTrackingReason) => {
      const changed =
        trackingStateRef.current !== state ||
        trackingReasonRef.current !== reason;
      trackingStateRef.current = state;
      trackingReasonRef.current = reason;

      if (changed) {
        console.log("[PeakAR] tracking", { state, reason });
      }

      if (state === ViroTrackingStateConstants.TRACKING_NORMAL) {
        clearTrackingResetTimer();
        return;
      }

      const needsRecovery =
        state === ViroTrackingStateConstants.TRACKING_UNAVAILABLE ||
        (state === ViroTrackingStateConstants.TRACKING_LIMITED &&
          reason === ViroARTrackingReasonConstants.TRACKING_REASON_EXCESSIVE_MOTION);
      if (!needsRecovery || trackingResetTimerRef.current) return;

      const delayMs =
        state === ViroTrackingStateConstants.TRACKING_UNAVAILABLE ? 1200 : 2400;
      trackingResetTimerRef.current = setTimeout(() => {
        trackingResetTimerRef.current = null;
        const stillUnstable =
          trackingStateRef.current === state &&
          trackingReasonRef.current === reason;
        const cooldownElapsed =
          Date.now() - lastTrackingResetAtRef.current > 5000;
        if (!stillUnstable || !cooldownElapsed) return;

        lastTrackingResetAtRef.current = Date.now();
        console.warn("[PeakAR] resetting AR tracking after sustained loss", {
          state,
          reason,
        });
        navigatorRef.current?._resetARSession?.(true, false);
      }, delayMs);
    },
    [clearTrackingResetTimer],
  );

  useEffect(() => clearTrackingResetTimer, [clearTrackingResetTimer]);

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
      terrainProfile,
      terrainModel,
      routeGeometry,
      observerPosition: worldOriginPosition ?? observerPosition,
      mapLayer,
      observerElevationM,
      selectedPeakId,
      onPeakPress,
      onError,
      onTrackingUpdated: handleTrackingUpdated,
    }),
    [
      onError,
      observerElevationM,
      onPeakPress,
      peaks,
      terrainProfile,
      routeGeometry,
      observerPosition,
      worldOriginPosition,
      mapLayer,
      selectedPeakId,
      terrainModel,
      handleTrackingUpdated,
    ],
  );

  // Do not create the native Viro surface until ARKit/ARCore has confirmed
  // that this device can run it. Unsupported devices otherwise fail during
  // native camera-session creation, before Viro can report onError.
  if (supportState !== "supported") return null;

  return (
    <ViroARSceneNavigator
      ref={(instance) => {
        navigatorRef.current = instance as typeof navigatorRef.current;
      }}
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