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
import { Dimensions, StyleSheet } from "react-native";

import type { PanoramaGipfel } from "@/lib/panorama";
import type { LatLng } from "@/types";
import type {
  RouteGradeBand,
  TerrainProfilePoint,
} from "@/lib/terrainCues";
import {
  buildGeographicTerrainRouteSegments,
  buildGeographicTerrainRouteDestination,
  buildLocalTerrainMesh,
  buildLocalMapRouteLines,
  arWorldOffsetForPosition,
  AR_WORLD_SCALE,
  routeGeometryMaxDistanceM,
  routeGeometryAheadOfPosition,
  routeRemainingDistanceM,
  routeOriginForAR,
  terrainVisibilityForPeak,
  type LocalTerrainModel,
  type LocalTerrainMesh,
  type TerrainRouteLine,
  type TerrainRouteSegment,
  type TerrainVertex,
} from "@/lib/terrainModel";
import { makeLogger } from "@/lib/debugLog";
import { getRuntimeDiagnostics } from "@/lib/runtimeDiagnostics";
import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

const peakArLog = makeLogger("[PeakAR]", "peak_ar");

function peakArErrorSummary(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, 1200) ?? null,
    };
  }
  if (error && typeof error === "object") {
    try {
      return { value: JSON.parse(JSON.stringify(error)) };
    } catch {
      return { value: String(error) };
    }
  }
  return { value: error == null ? null : String(error) };
}

function peakArTrackingReasonSummary(
  reason: ViroTrackingReason | null | undefined,
): { code: number | null; name: string } {
  const code = typeof reason === "number" ? reason : null;
  const name =
    code === ViroARTrackingReasonConstants.TRACKING_REASON_NONE
      ? "none"
      : code ===
          ViroARTrackingReasonConstants.TRACKING_REASON_EXCESSIVE_MOTION
        ? "excessive_motion"
        : code ===
            ViroARTrackingReasonConstants.TRACKING_REASON_INSUFFICIENT_FEATURES
          ? "insufficient_features"
          : "unknown";
  return { code, name };
}

function peakArPositionSummary(position: LatLng | null | undefined) {
  return position ? { available: true } : null;
}

function peakArWorldOffsetSummary(offset: TerrainVertex) {
  const eastM = offset[0] / AR_WORLD_SCALE;
  const northM = -offset[2] / AR_WORLD_SCALE;
  return {
    eastM: Number(eastM.toFixed(1)),
    northM: Number(northM.toFixed(1)),
    distanceM: Number(Math.hypot(eastM, northM).toFixed(1)),
  };
}

const PEAK_RED_MATERIAL = "sagatrailPeakMarkerRed";
const PEAK_WHITE_MATERIAL = "sagatrailPeakMarkerWhite";
const FINISH_FLAG_BLACK_MATERIAL = "sagatrailFinishFlagBlack";
const FINISH_FLAG_POLE_MATERIAL = "sagatrailFinishFlagPole";
const TERRAIN_USER_MATERIAL = "sagatrailTerrainUser";
const TERRAIN_MAP_ROUTE_MATERIAL = "sagatrailTerrainMapRoute";
const TERRAIN_ROUTE_MATERIALS: Record<RouteGradeBand, string> = {
  green: "sagatrailTerrainRouteGreen",
  yellow: "sagatrailTerrainRouteYellow",
  orange: "sagatrailTerrainRouteOrange",
  red: "sagatrailTerrainRouteRed",
};
const TERRAIN_SURFACE_MATERIAL = "sagatrailTerrainSurface";
const PEAK_RED = "#CC0000";
const PEAK_WHITE = "#FFFFFF";
// The DTM remains observer-centred at 500 m. The route trace is true 1:1 only
// in the reliable near field; after 50 m it is intentionally omitted. The
// finish flag is only shown close to the actual route end, never as a
// compressed substitute for a multi-kilometre destination.
const AR_ROUTE_TERRAIN_RADIUS_M = 500;
const AR_ROUTE_REAL_SCALE_RADIUS_M = 50;
const AR_ROUTE_DESTINATION_VIRTUAL_DISTANCE_M = 300;
// A destination flag is a finish cue, not a distant compass marker. Before
// this threshold the route arrows remain visible, but the flag stays hidden.
const AR_ROUTE_DESTINATION_SHOW_WITHIN_M = 500;
// Viro's AR origin is near the camera, while the visible landscape starts at
// the user's feet. Keep the geographic route on that ground plane and let the
// local DTM elevation differences lift it above/below the plane.
const AR_ROUTE_GROUND_OFFSET = -1.25;
// The direction cue is a heads-up aid, not the route itself. It must be far
// enough from the camera that its billboard does not fill the screen when the
// user looks down, while sitting high enough to remain visible when the phone
// is held upright.
const AR_ROUTE_GUIDE_DISTANCE = 1.4;
const AR_ROUTE_GUIDE_ELEVATION = 0.5;
const AR_ROUTE_GUIDE_LENGTH = 0.32;
const AR_ROUTE_GUIDE_HALF_WIDTH = 0.13;
const AR_ROUTE_GUIDE_THICKNESS = 0.045;
const MAX_AR_PEAK_SLOTS = 40;
const MAX_VISIBLE_AR_PEAKS = 6;
const MAX_AR_ROUTE_SEGMENT_SLOTS = 96;
const HIDDEN_AR_ROUTE_POINTS: TerrainRouteLine = [
  [0, -1000, 0],
  [0, -1000, 0.01],
];
// The flag is scaled against projected screen distance so its apparent width
// stays readable even when the route endpoint is far away.
const FINISH_FLAG_POLE_HEIGHT = 1.25;
const FINISH_FLAG_WIDTH = 0.7;
const FINISH_FLAG_HEIGHT = 0.45;
const FINISH_FLAG_CELL_WIDTH = FINISH_FLAG_WIDTH / 3;
const FINISH_FLAG_CELL_HEIGHT = FINISH_FLAG_HEIGHT / 2;
const FINISH_FLAG_CENTER_Y =
  FINISH_FLAG_POLE_HEIGHT - FINISH_FLAG_HEIGHT / 2;
const MIN_FINISH_FLAG_WIDTH_PX = 30;
const ESTIMATED_CAMERA_HORIZONTAL_FOV_RAD = (60 * Math.PI) / 180;
const NATIVE_TRACKING_LOG_INTERVAL_MS = 1500;
const NATIVE_TRACKING_STARTUP_TIMEOUT_MS = 9000;

let peakArSessionSequence = 0;

function createPeakArSessionId(): string {
  peakArSessionSequence += 1;
  return `ar-${Date.now()}-${peakArSessionSequence}`;
}

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
  [TERRAIN_USER_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: "#FFFFFF",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
  },
  [TERRAIN_MAP_ROUTE_MATERIAL]: {
    lightingModel: "Constant",
    diffuseColor: "#20D466",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: false,
    readsFromDepthBuffer: false,
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
  debugSessionId?: string;
  onSceneMounted?: () => number;
  onSceneUnmounted?: () => number;
  peaks: readonly PanoramaGipfel[];
  showPeaks?: boolean;
  trackingReady?: boolean;
  compassReady?: boolean;
  observerAccuracyM?: number | null;
  observerFixAgeMs?: number | null;
  observerRouteDistanceM?: number | null;
  terrainProfile?: readonly TerrainProfilePoint[] | null;
  terrainModel?: LocalTerrainModel | null;
  routeGeometry?: readonly number[][] | null;
  routeOriginPosition?: LatLng | null;
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
          materials={TERRAIN_MAP_ROUTE_MATERIAL}
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

interface RouteDirectionCue {
  position: TerrainVertex;
  rotationY: number;
  band: RouteGradeBand;
}

function routeHeading(from: TerrainVertex, to: TerrainVertex): number {
  return (Math.atan2(-(to[2] - from[2]), to[0] - from[0]) * 180) / Math.PI;
}

function buildRouteDirectionCue(
  segments: readonly TerrainRouteSegment[],
): RouteDirectionCue | null {
  let distanceToCue = AR_ROUTE_GUIDE_DISTANCE;

  for (const segment of segments) {
    for (let index = 1; index < segment.points.length; index += 1) {
      const from = segment.points[index - 1];
      const to = segment.points[index];
      const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
      if (length < 0.02) continue;

      const heading = routeHeading(from, to);
      if (distanceToCue <= length) {
        const fraction = distanceToCue / length;
        return {
          position: [
            from[0] + (to[0] - from[0]) * fraction,
            from[1] + (to[1] - from[1]) * fraction,
            from[2] + (to[2] - from[2]) * fraction,
          ],
          rotationY: heading,
          band: segment.band,
        };
      }
      distanceToCue -= length;
    }
  }

  return null;
}

function TerrainHologram({
  model,
  routeGeometry,
  routeOriginPosition,
  observerPosition,
  terrainProfile,
  trackingReady,
  compassReady,
}: {
  model: LocalTerrainModel | null | undefined;
  routeGeometry: readonly number[][] | null | undefined;
  routeOriginPosition: LatLng | null | undefined;
  observerPosition: LatLng | null | undefined;
  terrainProfile: readonly TerrainProfilePoint[] | null | undefined;
  trackingReady: boolean;
  compassReady: boolean;
}) {
  const routeProjectionReady =
    trackingReady && compassReady && observerPosition != null;
  const visibleRouteGeometry = useMemo(
    () =>
      routeProjectionReady
        ? routeGeometryAheadOfPosition(
            routeGeometry,
            routeOriginPosition,
            observerPosition,
          ) ?? routeGeometry
        : null,
    [
      routeGeometry,
      routeOriginPosition,
      observerPosition,
      routeProjectionReady,
    ],
  );
  const routeCenter = routeProjectionReady ? observerPosition : null;
  const worldOffset = useMemo(
    () => arWorldOffsetForPosition(routeOriginPosition ?? observerPosition, observerPosition),
    [observerPosition, routeOriginPosition],
  );
  const maxRouteDistanceM = useMemo(
    () =>
      routeProjectionReady
        ? routeGeometryMaxDistanceM(routeGeometry, routeCenter)
        : 0,
    [routeCenter, routeGeometry, routeProjectionReady],
  );
  const routeSegments = useMemo<TerrainRouteSegment[]>(
    () =>
      buildGeographicTerrainRouteSegments(
        model,
        visibleRouteGeometry,
        routeCenter,
        AR_ROUTE_TERRAIN_RADIUS_M,
        terrainProfile,
        {
          maxSegments: MAX_AR_ROUTE_SEGMENT_SLOTS,
          realScaleRadiusM: AR_ROUTE_REAL_SCALE_RADIUS_M,
          maxRenderedDistanceM: AR_ROUTE_REAL_SCALE_RADIUS_M,
          maxVirtualDistanceM: AR_ROUTE_DESTINATION_VIRTUAL_DISTANCE_M,
          maxRouteDistanceM,
          worldOffset,
        },
      ),
    [
      model,
      visibleRouteGeometry,
      routeCenter,
      terrainProfile,
      maxRouteDistanceM,
      worldOffset,
      routeProjectionReady,
    ],
  );
  const remainingRouteDistanceM = useMemo(
    () =>
      routeProjectionReady
        ? routeRemainingDistanceM(
            routeGeometry,
            routeOriginPosition,
            observerPosition,
          )
        : null,
    [
      routeGeometry,
      routeOriginPosition,
      observerPosition,
      routeProjectionReady,
    ],
  );
  const destinationPosition = useMemo(
    () => {
      if (!routeProjectionReady) return null;
      if (
        remainingRouteDistanceM == null ||
        remainingRouteDistanceM > AR_ROUTE_DESTINATION_SHOW_WITHIN_M
      ) {
        return null;
      }
      return buildGeographicTerrainRouteDestination(
        model,
        routeGeometry,
        routeCenter,
        AR_ROUTE_TERRAIN_RADIUS_M,
        {
          realScaleRadiusM: AR_ROUTE_REAL_SCALE_RADIUS_M,
          maxVirtualDistanceM: AR_ROUTE_DESTINATION_VIRTUAL_DISTANCE_M,
          maxRouteDistanceM,
          worldOffset,
        },
      );
    },
    [
      model,
      routeGeometry,
      routeCenter,
      maxRouteDistanceM,
      remainingRouteDistanceM,
      worldOffset,
      routeProjectionReady,
    ],
  );
  const routeDirectionCue = useMemo(
    () => buildRouteDirectionCue(routeSegments),
    [routeSegments],
  );
  const canRenderRoute = routeProjectionReady && trackingReady;

  useEffect(() => {
    peakArLog("route overlay recomputed", {
      hasModel: Boolean(model),
      observerElevationM: model?.observerElevationM ?? null,
      routePointCount: routeGeometry?.length ?? 0,
      visibleRoutePointCount: visibleRouteGeometry?.length ?? 0,
      lineCount: routeSegments.length,
      directionCueRendered: routeDirectionCue != null,
      terrainRadiusM: AR_ROUTE_TERRAIN_RADIUS_M,
      nearRouteRadiusM: AR_ROUTE_REAL_SCALE_RADIUS_M,
      destinationVirtualDistanceM: AR_ROUTE_DESTINATION_VIRTUAL_DISTANCE_M,
      destinationShowWithinM: AR_ROUTE_DESTINATION_SHOW_WITHIN_M,
      remainingRouteDistanceM:
        remainingRouteDistanceM == null
          ? null
          : Number(remainingRouteDistanceM.toFixed(1)),
      destinationRendered: destinationPosition != null,
      routeProjectionReady,
      trackingReady,
      hasDestination: destinationPosition != null,
      routeOriginPosition: peakArPositionSummary(routeOriginPosition),
      observerPosition: peakArPositionSummary(observerPosition),
      worldOffset: worldOffset.map((value) => Number(value.toFixed(3))),
    });
  }, [
    model,
    routeGeometry,
    visibleRouteGeometry,
    routeSegments.length,
    routeDirectionCue,
    destinationPosition,
    remainingRouteDistanceM,
    routeOriginPosition,
    observerPosition,
    worldOffset,
    routeProjectionReady,
    trackingReady,
  ]);

  // Keep the native route node tree mounted while the moving GPS fix causes
  // the visible near-field to be recomputed. Removing all route children in
  // that transition can make Viro lose the AR overlay on iOS.
  if (
    !routeProjectionReady &&
    routeGeometry == null &&
    routeSegments.length === 0 &&
    destinationPosition == null
  ) {
    return null;
  }

  return (
    <ViroNode
      renderingOrder={20}
      opacity={0.96}
      viroTag="terrain-route-ar"
    >
      {Array.from({ length: MAX_AR_ROUTE_SEGMENT_SLOTS }, (_, index) => {
        const segment = routeSegments[index] ?? null;
        const points: TerrainRouteLine = segment
          ? segment.points.map(
              ([x, y, z]): TerrainVertex => [
                x,
                AR_ROUTE_GROUND_OFFSET + y + 0.045,
                z,
              ],
            )
          : HIDDEN_AR_ROUTE_POINTS;
        return (
          <ViroPolyline
            key={`terrain-route-line-slot-${index}`}
            points={points}
            thickness={segment?.thickness ?? 0.032}
            materials={
              segment
                ? TERRAIN_ROUTE_MATERIALS[segment.band]
                : TERRAIN_ROUTE_MATERIALS.green
            }
            // Keep the route itself as a subtle, real ground-plane trace. The
            // smaller guide cue below handles the upright-phone case without
            // turning the whole route into a screen-facing graphic.
            opacity={segment && canRenderRoute ? 0.42 : 0}
            renderingOrder={24}
            viroTag={`terrain-route-line-slot-${index}`}
          />
        );
      })}
      <ViroNode
        position={
          routeDirectionCue && canRenderRoute
            ? [
                routeDirectionCue.position[0],
                AR_ROUTE_GROUND_OFFSET +
                  routeDirectionCue.position[1] +
                  AR_ROUTE_GUIDE_ELEVATION,
                routeDirectionCue.position[2],
              ]
            : [0, -1000, 0]
        }
        rotation={[0, routeDirectionCue?.rotationY ?? 0, 0]}
        opacity={routeDirectionCue && canRenderRoute ? 0.92 : 0}
        renderingOrder={28}
        transformBehaviors="billboard"
        viroTag="terrain-route-direction-cue"
      >
        <ViroPolyline
          points={[
            [
              -AR_ROUTE_GUIDE_HALF_WIDTH,
              -AR_ROUTE_GUIDE_LENGTH * 0.42,
              0,
            ],
            [0, AR_ROUTE_GUIDE_LENGTH * 0.58, 0],
            [
              AR_ROUTE_GUIDE_HALF_WIDTH,
              -AR_ROUTE_GUIDE_LENGTH * 0.42,
              0,
            ],
          ]}
          thickness={AR_ROUTE_GUIDE_THICKNESS}
          materials={
            routeDirectionCue
              ? TERRAIN_ROUTE_MATERIALS[routeDirectionCue.band]
              : TERRAIN_ROUTE_MATERIALS.green
          }
          transformBehaviors="billboard"
        />
      </ViroNode>
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
        scale={
          destinationPosition
            ? finishFlagScale(destinationPosition)
            : [1, 1, 1]
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
  worldOffset,
  trackingReady,
}: {
  model: LocalTerrainModel | null | undefined;
  worldOffset: [number, number, number];
  trackingReady: boolean;
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
    peakArLog("terrain texture request prepared", {
      materialName,
      center: peakArPositionSummary(model.center),
      radiusM: model.radiusM,
      texture: "swisstopo.pixelkarte-farbe",
      textureSize: "1024x1024",
    });
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
    peakArLog("terrain texture material registered", {
      materialName,
    });
  }, [model]);

  useEffect(() => {
    peakArLog("terrain surface mesh prepared", {
      hasModel: Boolean(model),
      vertexCount: mesh?.vertices.length ?? 0,
      triangleCount: mesh?.triangleIndices.length ?? 0,
      radiusM: model?.radiusM ?? null,
      center: peakArPositionSummary(model?.center),
      textureMaterial,
    });
  }, [mesh, model, textureMaterial]);

  if (!mesh) return null;

  return (
    <ViroGeometry
      vertices={mesh.vertices}
      normals={mesh.normals}
      texcoords={mesh.texcoords}
      triangleIndices={mesh.triangleIndices}
      materials={textureMaterial ?? TERRAIN_SURFACE_MATERIAL}
      // Never show a floating terrain graphic before ARKit has delivered a
      // stable tracking state. A camera image alone is not an anchor.
      opacity={trackingReady ? (textureMaterial ? 0.92 : 0.32) : 0}
      position={[
        worldOffset[0],
        AR_ROUTE_GROUND_OFFSET + worldOffset[1],
        worldOffset[2],
      ]}
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

function finishFlagScale(
  position: TerrainVertex,
): [number, number, number] {
  const distanceM = Math.max(1, Math.hypot(position[0], position[2]));
  const viewportWidthPx = Math.max(1, Dimensions.get("window").width);
  const focalLengthPx =
    viewportWidthPx /
    (2 * Math.tan(ESTIMATED_CAMERA_HORIZONTAL_FOV_RAD / 2));
  const minimumWorldWidth =
    (MIN_FINISH_FLAG_WIDTH_PX * distanceM) / focalLengthPx;
  const scale = Math.max(1, minimumWorldWidth / FINISH_FLAG_WIDTH);
  return [scale, scale, scale];
}

function PeakArScene({ sceneNavigator }: PeakArSceneProps) {
  const {
    debugSessionId = "unknown",
    onSceneMounted,
    onSceneUnmounted,
    peaks = [],
    showPeaks = true,
    trackingReady = false,
    compassReady = false,
    observerAccuracyM = null,
    observerFixAgeMs = null,
    observerRouteDistanceM = null,
    terrainProfile = null,
    terrainModel = null,
    routeGeometry = null,
    routeOriginPosition = null,
    observerPosition = null,
    observerElevationM = null,
    selectedPeakId = null,
    onPeakPress,
    onError,
    onTrackingUpdated,
  } =
    sceneNavigator?.viroAppProps ?? {};
  const worldOffset = arWorldOffsetForPosition(
    routeOriginPosition ?? observerPosition,
    observerPosition,
  );
  const trackingCallbackCountRef = useRef(0);
  const firstTrackingCallbackAtRef = useRef<number | null>(null);
  const firstReadyAtRef = useRef<number | null>(null);
  const sceneMountedAtRef = useRef(Date.now());
  const lastNativeTrackingLogAtRef = useRef(0);
  const previousNativeStateRef = useRef<ViroTrackingState | null>(null);
  const previousNativeReasonRef = useRef<ViroTrackingReason | null>(null);
  const viroErrorCountRef = useRef(0);
  const handleNativeTrackingUpdated = useCallback(
    (state: ViroTrackingState, reason: ViroTrackingReason) => {
      const now = Date.now();
      trackingCallbackCountRef.current += 1;
      if (firstTrackingCallbackAtRef.current == null) {
        firstTrackingCallbackAtRef.current = now;
      }
      if (
        state === ViroTrackingStateConstants.TRACKING_NORMAL &&
        firstReadyAtRef.current == null
      ) {
        firstReadyAtRef.current = now;
      }
      const stateChanged =
        previousNativeStateRef.current !== state ||
        previousNativeReasonRef.current !== reason;
      const shouldLog =
        stateChanged ||
        now - lastNativeTrackingLogAtRef.current >=
          NATIVE_TRACKING_LOG_INTERVAL_MS;
      if (shouldLog) {
        lastNativeTrackingLogAtRef.current = now;
        peakArLog("native tracking callback received", {
          sessionId: debugSessionId,
          state,
          reason,
          arKitReason: peakArTrackingReasonSummary(reason),
          callbackCount: trackingCallbackCountRef.current,
          firstCallbackLatencyMs:
            firstTrackingCallbackAtRef.current == null
              ? null
              : firstTrackingCallbackAtRef.current - sceneMountedAtRef.current,
          readyLatencyMs:
            firstReadyAtRef.current == null
              ? null
              : firstReadyAtRef.current - sceneMountedAtRef.current,
          throttled: !stateChanged,
        });
      }
      previousNativeStateRef.current = state;
      previousNativeReasonRef.current = reason;
      onTrackingUpdated?.(state, reason);
    },
    [debugSessionId, onTrackingUpdated],
  );

  useEffect(() => {
    const sceneMountCount = onSceneMounted?.() ?? null;
    const sceneMountedAt = Date.now();
    sceneMountedAtRef.current = sceneMountedAt;
    peakArLog("Viro scene mounted", {
      sessionId: debugSessionId,
      sceneMountCount,
      hasNavigatorProps: Boolean(sceneNavigator?.viroAppProps),
      runtime: getRuntimeDiagnostics(),
    });
    return () => {
      const sceneUnmountCount = onSceneUnmounted?.() ?? null;
      peakArLog("Viro scene unmounted", {
        sessionId: debugSessionId,
        sceneMountCount,
        sceneUnmountCount,
        sceneLifetimeMs: Date.now() - sceneMountedAt,
        nativeTrackingCallbackCount: trackingCallbackCountRef.current,
        viroErrorCount: viroErrorCountRef.current,
      });
    };
  }, [debugSessionId, onSceneMounted, onSceneUnmounted]);

  useEffect(() => {
    let validPeakCount = 0;
    let invalidPeakCount = 0;
    let occludedPeakCount = 0;
    for (const peak of peaks) {
      if (!peakPosition(peak)) {
        invalidPeakCount += 1;
        continue;
      }
      validPeakCount += 1;
      if (terrainVisibilityForPeak(terrainModel, peak, observerElevationM) === "occluded") {
        occludedPeakCount += 1;
      }
    }
    peakArLog("Viro scene data updated", {
      peakCount: peaks.length,
      validPeakCount,
      invalidPeakCount,
      occludedPeakCount,
      selectedPeakId,
      routePointCount: routeGeometry?.length ?? 0,
      terrainProfilePointCount: terrainProfile?.length ?? 0,
      hasTerrainModel: Boolean(terrainModel),
      terrainModelRadiusM: terrainModel?.radiusM ?? null,
      routeOriginPosition: peakArPositionSummary(routeOriginPosition),
      observerPosition: peakArPositionSummary(observerPosition),
      observerAccuracyM,
      observerFixAgeMs,
      observerRouteDistanceM,
      observerElevationM,
      worldOffset: worldOffset.map((value) => Number(value.toFixed(3))),
      worldOffsetMeters: peakArWorldOffsetSummary(worldOffset),
    });
  }, [
    observerElevationM,
    observerAccuracyM,
    observerFixAgeMs,
    observerRouteDistanceM,
    observerPosition,
    peaks,
    routeGeometry,
    routeOriginPosition,
    selectedPeakId,
    terrainModel,
    terrainProfile,
    worldOffset,
  ]);

  return (
    <ViroARScene
      onError={() => {
        viroErrorCountRef.current += 1;
        peakArLog("Viro scene error", {
          sessionId: debugSessionId,
          viroErrorCount: viroErrorCountRef.current,
          nativeTrackingCallbackCount: trackingCallbackCountRef.current,
          peakCount: peaks.length,
          routePointCount: routeGeometry?.length ?? 0,
          hasTerrainModel: Boolean(terrainModel),
          observerPosition: peakArPositionSummary(observerPosition),
        });
        onError?.();
      }}
      onTrackingUpdated={handleNativeTrackingUpdated}
    >
      {/* The model is observer-centred and uses geographic bearings. With
          GravityAndHeading, heading 0 is the stable geographic Viro frame. */}
      <TerrainSurface
        model={terrainModel}
        worldOffset={worldOffset}
        trackingReady={trackingReady}
      />
      <TerrainHologram
        model={terrainModel}
        routeGeometry={routeGeometry}
        routeOriginPosition={routeOriginPosition}
        observerPosition={observerPosition}
        terrainProfile={terrainProfile}
        trackingReady={trackingReady}
        compassReady={compassReady}
      />
      {Array.from({ length: MAX_AR_PEAK_SLOTS }, (_, slotIndex) => {
          const peak = trackingReady && showPeaks && slotIndex < MAX_VISIBLE_AR_PEAKS
          ? peaks[slotIndex] ?? null
          : null;
        const position: [number, number, number] = peak
          ? peakPosition(peak) ?? [0, -1000, 0]
          : [0, -1000, 0];
        const worldPosition: [number, number, number] = peak
          ? [
              position[0] + worldOffset[0],
              position[1] + worldOffset[1],
              position[2] + worldOffset[2],
            ]
          : position;
        const terrainVisibility = peak
          ? terrainVisibilityForPeak(terrainModel, peak, observerElevationM)
          : "unknown";
        const isSelected = peak != null && peak.id === selectedPeakId;

        return (
          <ViroNode
            key={`peak-slot-${slotIndex}`}
            position={worldPosition}
            scale={peak ? peakMarkerScale(peak) : [1, 1, 1]}
            // Keep occluded markers in the native tree. Only their opacity
            // changes, avoiding the iOS 26 removeReactSubview crash. Empty
            // slots stay mounted as invisible nodes when new data arrives.
            opacity={
              peak == null || terrainVisibility === "occluded"
                ? 0
                : terrainVisibility === "unknown"
                  ? 0.6
                  : isSelected
                    ? 0.94
                    : 0.72
            }
            transformBehaviors="billboard"
            renderingOrder={100}
            onClick={
              peak && trackingReady
                ? () => {
                    peakArLog("peak marker pressed", {
                      peakId: peak.id,
                      peakName: peak.name,
                      bearingDeg: peak.bearingDeg,
                      distanceKm: peak.distanceKm,
                      elevationM: peak.elevationM,
                      elevationAngleDeg: peak.elevationAngleDeg,
                      terrainVisibility,
                    });
                    onPeakPress?.(peak.id);
                  }
                : undefined
            }
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
                position={[0, 0.14, 0]}
                width={0.025}
                height={0.28}
                length={0.025}
              materials={PEAK_RED_MATERIAL}
              shadowCastingBitMask={0}
            />

            {/* Compact pin: the old tall capsule obscured the camera view. */}
            <ViroBox
              position={[0, 0.62, 0]}
              width={0.26}
              height={0.78}
              length={0.06}
              materials={PEAK_RED_MATERIAL}
              shadowCastingBitMask={0}
            />
            <ViroSphere
              position={[0, 0.23, 0]}
              radius={0.13}
              widthSegmentCount={12}
              heightSegmentCount={8}
              materials={PEAK_RED_MATERIAL}
              shadowCastingBitMask={0}
            />
            <ViroSphere
              position={[0, 1.01, 0]}
              radius={0.13}
              widthSegmentCount={12}
              heightSegmentCount={8}
              materials={PEAK_RED_MATERIAL}
              shadowCastingBitMask={0}
            />

            {/* White inset keeps the pin readable against bright terrain. */}
            <ViroBox
              position={[0, 0.61, 0.015]}
              width={0.22}
              height={0.62}
              length={0.07}
              materials={PEAK_WHITE_MATERIAL}
              shadowCastingBitMask={0}
            />
            <ViroSphere
              position={[0, 0.28, 0.015]}
              radius={0.11}
              widthSegmentCount={12}
              heightSegmentCount={8}
              materials={PEAK_WHITE_MATERIAL}
              shadowCastingBitMask={0}
            />

            <ViroText
              text={peak?.name.toUpperCase() ?? ""}
              position={[0, 1.27, 0.075]}
              width={2.2}
              height={0.24}
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
              position={[0, 1.06, 0.075]}
              width={0.68}
              height={0.18}
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
            <ViroText
              text={peak && terrainVisibility === "unknown" ? "?" : ""}
              position={[0, 1.23, 0.075]}
              width={0.18}
              height={0.18}
              color={PEAK_RED}
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
  showPeaks = true,
  terrainProfile = null,
  terrainModel = null,
  routeGeometry = null,
  observerPosition = null,
  observerAccuracyM = null,
  observerFixAgeMs = null,
  observerRouteDistanceM = null,
  compassReady = false,
  mapLayer = "topo",
  observerElevationM = null,
  selectedPeakId = null,
  onPeakPress,
  onTrackingStateChange,
  onError,
}: PeakArNavigatorProps) {
  const sessionIdRef = useRef<string | null>(null);
  if (sessionIdRef.current == null) {
    sessionIdRef.current = createPeakArSessionId();
  }
  const sessionId = sessionIdRef.current;
  const navigatorMountedAtRef = useRef(Date.now());
  const navigatorMountCountRef = useRef(0);
  const sceneMountCountRef = useRef(0);
  const sceneUnmountCountRef = useRef(0);
  const supportCheckCountRef = useRef(0);
  const nativeTrackingCallbackCountRef = useRef(0);
  const firstNativeTrackingCallbackAtRef = useRef<number | null>(null);
  const firstReadyAtRef = useRef<number | null>(null);
  const startupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigatorRefEventCountRef = useRef(0);
  const supportStateRef = useRef<"checking" | "supported" | "unsupported">(
    "checking",
  );
  const peakCountRef = useRef(peaks.length);
  peakCountRef.current = peaks.length;
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
  const [trackingReady, setTrackingReady] = useState(false);
  const navigatorRef = useRef<{
    _resetARSession?: (resetTracking: boolean, removeAnchors: boolean) => void;
  } | null>(null);
  const trackingStateRef = useRef<ViroTrackingState | null>(null);
  const trackingReasonRef = useRef<ViroTrackingReason | null>(null);
  const trackingResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTrackingResetAtRef = useRef(0);
  supportStateRef.current = supportState;

  const clearStartupTimeout = useCallback(() => {
    if (startupTimeoutRef.current) {
      clearTimeout(startupTimeoutRef.current);
      startupTimeoutRef.current = null;
    }
  }, []);

  const clearTrackingResetTimer = useCallback(() => {
    if (trackingResetTimerRef.current) {
      clearTimeout(trackingResetTimerRef.current);
      trackingResetTimerRef.current = null;
    }
  }, []);

  const handleSceneMounted = useCallback(() => {
    sceneMountCountRef.current += 1;
    peakArLog("Viro scene mount counted", {
      sessionId,
      sceneMountCount: sceneMountCountRef.current,
      navigatorMountCount: navigatorMountCountRef.current,
    });
    return sceneMountCountRef.current;
  }, [sessionId]);

  const handleSceneUnmounted = useCallback(() => {
    sceneUnmountCountRef.current += 1;
    peakArLog("Viro scene unmount counted", {
      sessionId,
      sceneUnmountCount: sceneUnmountCountRef.current,
      nativeTrackingCallbackCount: nativeTrackingCallbackCountRef.current,
    });
    return sceneUnmountCountRef.current;
  }, [sessionId]);

  useEffect(() => {
    navigatorMountCountRef.current += 1;
    peakArLog("AR navigator mounted", {
      sessionId,
      navigatorMountCount: navigatorMountCountRef.current,
      navigatorMountedAt: new Date(navigatorMountedAtRef.current).toISOString(),
      runtime: getRuntimeDiagnostics(),
      peakCount: peaks.length,
      routePointCount: routeGeometry?.length ?? 0,
      terrainProfilePointCount: terrainProfile?.length ?? 0,
      hasTerrainModel: Boolean(terrainModel),
      observerPosition: peakArPositionSummary(observerPosition),
      observerAccuracyM,
      observerFixAgeMs,
      observerRouteDistanceM,
      observerElevationM,
      mapLayer,
      showPeaks,
      trackingReady,
      compassReady,
    });
    return () => {
      clearTrackingResetTimer();
      clearStartupTimeout();
      peakArLog("AR navigator unmounted", {
        sessionId,
        navigatorMountCount: navigatorMountCountRef.current,
        navigatorLifetimeMs: Date.now() - navigatorMountedAtRef.current,
        supportCheckCount: supportCheckCountRef.current,
        sceneMountCount: sceneMountCountRef.current,
        sceneUnmountCount: sceneUnmountCountRef.current,
        nativeTrackingCallbackCount: nativeTrackingCallbackCountRef.current,
        lastTrackingState: trackingStateRef.current,
        lastTrackingReason: trackingReasonRef.current,
      });
    };
  }, [clearStartupTimeout, clearTrackingResetTimer, sessionId]);

  useEffect(() => {
    peakArLog("AR navigator props updated", {
      peakCount: peaks.length,
      routePointCount: routeGeometry?.length ?? 0,
      terrainProfilePointCount: terrainProfile?.length ?? 0,
      hasTerrainModel: Boolean(terrainModel),
      terrainModelRadiusM: terrainModel?.radiusM ?? null,
      observerPosition: peakArPositionSummary(observerPosition),
      observerAccuracyM,
      observerFixAgeMs,
      observerRouteDistanceM,
      observerElevationM,
      selectedPeakId,
      mapLayer,
      compassReady,
      supportState,
      sessionId,
      navigatorMountCount: navigatorMountCountRef.current,
      sceneMountCount: sceneMountCountRef.current,
      sceneUnmountCount: sceneUnmountCountRef.current,
      supportCheckCount: supportCheckCountRef.current,
      nativeTrackingCallbackCount: nativeTrackingCallbackCountRef.current,
      worldOriginPosition: peakArPositionSummary(worldOriginPosition),
    });
  }, [
    mapLayer,
    compassReady,
    showPeaks,
    trackingReady,
    observerElevationM,
    observerAccuracyM,
    observerFixAgeMs,
    observerRouteDistanceM,
    observerPosition,
    peaks,
    routeGeometry,
    selectedPeakId,
    supportState,
    terrainModel,
    terrainProfile,
    worldOriginPosition,
  ]);

  useEffect(() => {
    if (worldOriginPosition || !observerPosition) return;
    const origin = routeOriginForAR(observerPosition, routeGeometry);
    setWorldOriginPosition(origin);
    peakArLog("fixed geographic world origin", {
      gps: peakArPositionSummary(observerPosition),
      routeOrigin: peakArPositionSummary(origin),
      routePointCount: routeGeometry?.length ?? 0,
    });
  }, [observerPosition, routeGeometry, worldOriginPosition]);

  const handleTrackingUpdated = useCallback(
    (state: ViroTrackingState, reason: ViroTrackingReason) => {
      const now = Date.now();
      nativeTrackingCallbackCountRef.current += 1;
      if (firstNativeTrackingCallbackAtRef.current == null) {
        firstNativeTrackingCallbackAtRef.current = now;
      }
      if (
        state === ViroTrackingStateConstants.TRACKING_NORMAL &&
        firstReadyAtRef.current == null
      ) {
        firstReadyAtRef.current = now;
      }
      clearStartupTimeout();
      const changed =
        trackingStateRef.current !== state ||
        trackingReasonRef.current !== reason;
      trackingStateRef.current = state;
      trackingReasonRef.current = reason;
      const nextTrackingState =
        state === ViroTrackingStateConstants.TRACKING_NORMAL
          ? "ready"
          : state === ViroTrackingStateConstants.TRACKING_LIMITED
            ? "limited"
            : "unavailable";
      setTrackingReady(nextTrackingState === "ready");

      if (changed) {
        onTrackingStateChange?.(nextTrackingState);
        peakArLog("tracking state changed", {
          sessionId,
          state,
          reason,
          arKitReason: peakArTrackingReasonSummary(reason),
          callbackCount: nativeTrackingCallbackCountRef.current,
          firstCallbackLatencyMs:
            firstNativeTrackingCallbackAtRef.current == null
              ? null
              : firstNativeTrackingCallbackAtRef.current -
                navigatorMountedAtRef.current,
          readyLatencyMs:
            firstReadyAtRef.current == null
              ? null
              : firstReadyAtRef.current - navigatorMountedAtRef.current,
          needsRecovery:
            state === ViroTrackingStateConstants.TRACKING_UNAVAILABLE ||
            (state === ViroTrackingStateConstants.TRACKING_LIMITED &&
              reason === ViroARTrackingReasonConstants.TRACKING_REASON_EXCESSIVE_MOTION),
        });
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
      peakArLog("tracking recovery scheduled", {
        state,
        reason,
        arKitReason: peakArTrackingReasonSummary(reason),
        delayMs,
        lastTrackingResetAt: lastTrackingResetAtRef.current || null,
      });
      trackingResetTimerRef.current = setTimeout(() => {
        trackingResetTimerRef.current = null;
        const stillUnstable =
          trackingStateRef.current === state &&
          trackingReasonRef.current === reason;
        const cooldownElapsed =
          Date.now() - lastTrackingResetAtRef.current > 5000;
        if (!stillUnstable || !cooldownElapsed) {
          peakArLog("tracking recovery skipped", {
            state,
            reason,
            arKitReason: peakArTrackingReasonSummary(reason),
            stillUnstable,
            cooldownElapsed,
          });
          return;
        }

        lastTrackingResetAtRef.current = Date.now();
        peakArLog("resetting AR tracking after sustained loss", {
          state,
          reason,
          arKitReason: peakArTrackingReasonSummary(reason),
        });
        if (!navigatorRef.current?._resetARSession) {
          peakArLog("tracking reset unavailable: navigator ref missing", {
            state,
            reason,
            arKitReason: peakArTrackingReasonSummary(reason),
          });
          return;
        }
        navigatorRef.current._resetARSession(true, false);
        peakArLog("tracking reset requested", {
          state,
          reason,
          arKitReason: peakArTrackingReasonSummary(reason),
          resetTracking: true,
          removeAnchors: false,
        });
      }, delayMs);
    },
    [clearStartupTimeout, clearTrackingResetTimer, onTrackingStateChange, sessionId],
  );

  useEffect(() => {
    supportCheckCountRef.current += 1;
    const supportCheckNumber = supportCheckCountRef.current;
    const supportCheckStartedAt = Date.now();
    onTrackingStateChange?.("initializing");
    peakArLog("AR support check started", {
      sessionId,
      supportCheckCount: supportCheckNumber,
    });
    let cancelled = false;

    isARSupportedOnDevice()
      .then(({ isARSupported }) => {
        const durationMs = Date.now() - supportCheckStartedAt;
        if (cancelled) {
          peakArLog("AR support result ignored after unmount", {
            sessionId,
            supportCheckCount: supportCheckNumber,
            durationMs,
            isARSupported,
          });
          return;
        }
        peakArLog("AR support check completed", {
          sessionId,
          supportCheckCount: supportCheckNumber,
          durationMs,
          isARSupported,
        });
        if (isARSupported) {
          setSupportState("supported");
        } else {
          setSupportState("unsupported");
          peakArLog("AR unsupported on device", {
            runtime: getRuntimeDiagnostics(),
          });
          onError?.();
        }
      })
      .catch((error) => {
        const durationMs = Date.now() - supportCheckStartedAt;
        if (cancelled) {
          peakArLog("AR support check error ignored after unmount", {
            sessionId,
            supportCheckCount: supportCheckNumber,
            durationMs,
            error: peakArErrorSummary(error),
          });
          return;
        }
        peakArLog("AR support check failed", {
          sessionId,
          supportCheckCount: supportCheckNumber,
          durationMs,
          error: peakArErrorSummary(error),
          runtime: getRuntimeDiagnostics(),
        });
        setSupportState("unsupported");
        onError?.();
      });

    return () => {
      cancelled = true;
      peakArLog("AR support check cancelled", {
        sessionId,
        supportCheckCount: supportCheckNumber,
        durationMs: Date.now() - supportCheckStartedAt,
      });
    };
  }, [onError, onTrackingStateChange, sessionId]);

  useEffect(() => {
    if (supportState !== "supported") {
      clearStartupTimeout();
      return;
    }
    const startedAt = Date.now();
    peakArLog("native tracking startup watchdog started", {
      sessionId,
      timeoutMs: NATIVE_TRACKING_STARTUP_TIMEOUT_MS,
      supportCheckCount: supportCheckCountRef.current,
    });
    startupTimeoutRef.current = setTimeout(() => {
      startupTimeoutRef.current = null;
      if (nativeTrackingCallbackCountRef.current > 0) return;
      peakArLog("native tracking startup timeout", {
        sessionId,
        timeoutMs: NATIVE_TRACKING_STARTUP_TIMEOUT_MS,
        elapsedMs: Date.now() - startedAt,
        supportState: supportStateRef.current,
        navigatorRefAttached: Boolean(navigatorRef.current),
        navigatorRefEventCount: navigatorRefEventCountRef.current,
        navigatorMountCount: navigatorMountCountRef.current,
        sceneMountCount: sceneMountCountRef.current,
        sceneUnmountCount: sceneUnmountCountRef.current,
        nativeTrackingCallbackCount: nativeTrackingCallbackCountRef.current,
        runtime: getRuntimeDiagnostics(),
      });
    }, NATIVE_TRACKING_STARTUP_TIMEOUT_MS);
    return clearStartupTimeout;
  }, [clearStartupTimeout, sessionId, supportState]);

  useEffect(() => {
    peakArLog("AR support state changed", {
      sessionId,
      supportState,
      hasNavigatorRef: Boolean(navigatorRef.current),
      supportCheckCount: supportCheckCountRef.current,
      nativeTrackingCallbackCount: nativeTrackingCallbackCountRef.current,
    });
  }, [sessionId, supportState]);

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
      debugSessionId: sessionId,
      onSceneMounted: handleSceneMounted,
      onSceneUnmounted: handleSceneUnmounted,
      showPeaks,
      trackingReady,
      terrainProfile,
      terrainModel,
      compassReady,
      observerAccuracyM,
      observerFixAgeMs,
      observerRouteDistanceM,
      routeGeometry,
      routeOriginPosition: worldOriginPosition ?? observerPosition,
      observerPosition,
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
      observerAccuracyM,
      observerFixAgeMs,
      observerRouteDistanceM,
      onPeakPress,
      peaks,
      terrainProfile,
      routeGeometry,
      observerPosition,
      worldOriginPosition,
      mapLayer,
      compassReady,
      selectedPeakId,
      showPeaks,
      trackingReady,
      terrainModel,
      handleTrackingUpdated,
      handleSceneMounted,
      handleSceneUnmounted,
      sessionId,
    ],
  );

  const handleNavigatorRef = useCallback((instance: unknown) => {
    navigatorRefEventCountRef.current += 1;
    navigatorRef.current = instance as typeof navigatorRef.current;
    peakArLog(
      instance
        ? "Viro navigator ref attached"
        : "Viro navigator ref detached",
      {
        sessionId,
        supportState: supportStateRef.current,
        peakCount: peakCountRef.current,
        navigatorRefEventCount: navigatorRefEventCountRef.current,
        navigatorMountCount: navigatorMountCountRef.current,
        sceneMountCount: sceneMountCountRef.current,
      },
    );
  }, [sessionId]);

  // Do not create the native Viro surface until ARKit/ARCore has confirmed
  // that this device can run it. Unsupported devices otherwise fail during
  // native camera-session creation, before Viro can report onError.
  if (supportState !== "supported") return null;

  return (
    <ViroARSceneNavigator
      ref={handleNavigatorRef}
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