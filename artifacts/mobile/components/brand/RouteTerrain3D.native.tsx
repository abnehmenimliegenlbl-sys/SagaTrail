import { Feather } from "@expo/vector-icons";
import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import * as FileSystem from "expo-file-system/legacy";
import { GLView } from "expo-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Box3,
  DoubleSide,
  Group,
  NormalBlending,
  SRGBColorSpace,
  Texture,
  Vector3,
  Mesh,
} from "three";

import { createTerrainArea } from "@workspace/api-client-react";
import { BackButton } from "@/components/brand/BackButton";
import { useColors } from "@/hooks/useColors";
import {
  buildRouteGradeSegments,
  getSmoothedGradePctAtDistance,
  type TerrainProfilePoint,
} from "@/lib/terrainCues";
import { hapticRigid } from "@/lib/haptics";
import { parseTerrainCorridor, type TerrainGrid } from "@/lib/routeTerrain3d";

type Props = {
  visible: boolean;
  onClose: () => void;
  geometry: number[][] | null | undefined;
  terrainProfile: TerrainProfilePoint[] | null;
};

type Model = {
  grid: TerrainGrid;
  geometry: number[][];
  profile: TerrainProfilePoint[];
};
type ViewMode = "overview" | "walk" | "flight";
type WalkProgress = {
  distanceM: number;
  ascentM: number;
  minutes: number;
  bearingDeg: number;
};
type MapBounds = TerrainGrid["bounds"];
type MapTile = {
  bounds: MapBounds;
  key: string;
  rowStart?: number;
  rowEnd?: number;
  columnStart?: number;
  columnEnd?: number;
};
type LoadedFlightTile = {
  tile: MapTile;
  texture: Texture;
  geometry: BufferGeometry;
};

const gradeColors = {
  green: "#39FF14",
  yellow: "#FFFF00",
  orange: "#FF8000",
  red: "#FF003C",
};
const ThreeLine: any = "line";
const radians = Math.PI / 180;
const mapTextureSizes: readonly number[] = [1024, 768];
const walkSpeedKmPerSecond = 1;
const flightSpeedKmPerSecond = 0.32;
const flightTileSpacingKm = 1.2;
const flightSkyColor = "#8EA6AA";
const maxTerrainAreaGeometryPoints = 500;

function gradeInstrumentColor(gradePct: number | null): string {
  const absoluteGrade = Math.abs(gradePct ?? 0);
  if (absoluteGrade >= 30) return gradeColors.red;
  if (absoluteGrade >= 20) return gradeColors.orange;
  if (absoluteGrade >= 10) return gradeColors.yellow;
  return gradeColors.green;
}

function gradeInstrumentLabel(gradePct: number | null): string {
  if (gradePct == null || !Number.isFinite(gradePct)) return "—";
  const rounded = Math.round(gradePct);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function gradeInstrumentAccessibilityLabel(gradePct: number | null): string {
  if (gradePct == null || !Number.isFinite(gradePct)) return "Neigung wird berechnet";
  const rounded = Math.round(gradePct);
  if (rounded > 0) return `Steigung ${rounded} Prozent`;
  if (rounded < 0) return `Gefälle ${Math.abs(rounded)} Prozent`;
  return "Ebene Route, 0 Prozent";
}
const flightSkyVertexShader = `
  varying vec3 vWorldDirection;

  void main() {
    vWorldDirection = normalize((modelMatrix * vec4(position, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const flightSkyFragmentShader = `
  varying vec3 vWorldDirection;

  void main() {
    vec3 direction = normalize(vWorldDirection);
    float height = direction.y;

    vec3 horizon = vec3(0.72, 0.80, 0.80);
    vec3 zenith = vec3(0.19, 0.39, 0.60);
    float skyBlend = smoothstep(-0.12, 0.72, height);
    vec3 color = mix(horizon, zenith, skyBlend);

    // Thin atmospheric haze keeps the horizon bright without making the
    // background look like a flat UI color.
    float horizonHaze = exp(-max(height, -0.05) * 8.0);
    color = mix(color, vec3(0.86, 0.88, 0.85), horizonHaze * 0.22);

    // Two low-frequency layers create very soft cloud banks. They are kept
    // subtle so the route and terrain remain the visual focus.
    vec2 cloudCoordinates = direction.xz / max(height + 0.16, 0.16);
    float cloudWave =
      sin(cloudCoordinates.x * 2.4 + sin(cloudCoordinates.y * 1.7)) * 0.5 +
      sin(cloudCoordinates.y * 3.1 + sin(cloudCoordinates.x * 1.3)) * 0.3 +
      sin((cloudCoordinates.x + cloudCoordinates.y) * 5.2) * 0.2;
    float cloudBand = smoothstep(0.42, 0.82, cloudWave);
    float cloudVisibility = smoothstep(-0.02, 0.5, height) * 0.12;
    color = mix(color, vec3(0.94, 0.95, 0.92), cloudBand * cloudVisibility);

    vec3 sunDirection = normalize(vec3(-0.38, 0.72, -0.52));
    float sunAlignment = max(dot(direction, sunDirection), 0.0);
    float sunGlow = pow(sunAlignment, 10.0) * 0.16;
    float sunCore = pow(sunAlignment, 180.0) * 0.72;
    color += vec3(1.0, 0.88, 0.66) * (sunGlow + sunCore);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function stableUrlHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function mapTiles(grid: TerrainGrid): MapTile[] {
  const rowBreaks = [0, Math.floor((grid.rows - 1) / 2), grid.rows - 1];
  const columnBreaks = [
    0,
    Math.floor((grid.columns - 1) / 3),
    Math.floor(((grid.columns - 1) * 2) / 3),
    grid.columns - 1,
  ];
  return Array.from({ length: 2 }, (_, row) =>
    Array.from({ length: 3 }, (_, column) => {
      const rowStart = rowBreaks[row];
      const rowEnd = rowBreaks[row + 1];
      const columnStart = columnBreaks[column];
      const columnEnd = columnBreaks[column + 1];
      const corners = [
        grid.grid[rowStart][columnStart],
        grid.grid[rowStart][columnEnd],
        grid.grid[rowEnd][columnStart],
        grid.grid[rowEnd][columnEnd],
      ];
      return {
        key: `${row}-${column}`,
        rowStart,
        rowEnd,
        columnStart,
        columnEnd,
        bounds: {
          south: Math.min(...corners.map((cell) => cell.lat)),
          north: Math.max(...corners.map((cell) => cell.lat)),
          west: Math.min(...corners.map((cell) => cell.lng)),
          east: Math.max(...corners.map((cell) => cell.lng)),
        },
      };
    }),
  ).flat();
}

function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

async function loadRouteMapTexture(
  url: string,
  cacheName: string,
): Promise<Texture> {
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) throw new Error("Kein Textur-Cache verfügbar.");
  const localUri = `${cacheDirectory}${cacheName}-${stableUrlHash(url)}.jpg`;
  const cached = await FileSystem.getInfoAsync(localUri);
  let imageUri = localUri;
  if (!cached.exists || cached.size === 0) {
    if (cached.exists) {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    }
    const temporaryUri = `${localUri}.download`;
    await FileSystem.deleteAsync(temporaryUri, { idempotent: true });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        FileSystem.downloadAsync(url, temporaryUri),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error("Textur-Download hat zu lange gedauert.")),
            25_000,
          );
        }),
      ]);
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Textur-Download fehlgeschlagen (${result.status}).`);
      }
      await FileSystem.moveAsync({ from: temporaryUri, to: localUri });
    } catch (error) {
      await FileSystem.deleteAsync(temporaryUri, { idempotent: true });
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  const { width, height } = await imageSize(imageUri);
  const texture = new Texture();
  texture.image = {
    data: { localUri: imageUri },
    width,
    height,
  };
  texture.flipY = true;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  (texture as Texture & { isDataTexture: boolean }).isDataTexture = true;
  return texture;
}

function distanceKm(a: number[], b: number[]): number {
  const deltaLat = (b[0] - a[0]) * radians;
  const deltaLng = (b[1] - a[1]) * radians;
  const longitude = deltaLng * Math.cos(((a[0] + b[0]) / 2) * radians);
  return 6371 * Math.sqrt(deltaLat * deltaLat + longitude * longitude);
}

function sampleTerrainAreaGeometry(
  geometry: [number, number][],
): [number, number][] {
  if (geometry.length <= maxTerrainAreaGeometryPoints) return geometry;

  return Array.from(
    { length: maxTerrainAreaGeometryPoints },
    (_, index) => {
      const sourceIndex = Math.round(
        (index * (geometry.length - 1)) /
          (maxTerrainAreaGeometryPoints - 1),
      );
      return geometry[sourceIndex]!;
    },
  );
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

type FlightCameraPlan = {
  cameraPosition: Vector3;
  target: Vector3;
  markerFocus: Vector3;
  horizontalDirection: Vector3;
};

function flightCorridorCenter(
  route: Vector3[],
  routeDistanceList: number[],
  distanceKm: number,
): Vector3 | null {
  const routeLengthKm = routeDistanceList.at(-1) ?? 0;
  const corridorWindowKm = 0.45;
  const sampleCount = 9;
  const center = new Vector3();
  let weightTotal = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const normalized = index / (sampleCount - 1);
    const offsetKm = (normalized * 2 - 1) * corridorWindowKm;
    const sample = pointAtRouteDistance(
      route,
      routeDistanceList,
      clampNumber(distanceKm + offsetKm, 0, routeLengthKm),
    );
    if (!sample) continue;
    const weight = 1 - Math.abs(normalized * 2 - 1) * 0.78;
    center.addScaledVector(sample, weight);
    weightTotal += weight;
  }

  return weightTotal > 0 ? center.multiplyScalar(1 / weightTotal) : null;
}

function clampFlightPointToTerrain(
  point: Vector3,
  terrainBounds: Box3,
  marginM: number,
): { point: Vector3; outside: boolean } {
  const width = Math.max(0, terrainBounds.max.x - terrainBounds.min.x);
  const depth = Math.max(0, terrainBounds.max.z - terrainBounds.min.z);
  const xMargin = Math.min(marginM, width / 2);
  const zMargin = Math.min(marginM, depth / 2);
  const minimumX = terrainBounds.min.x + xMargin;
  const maximumX = terrainBounds.max.x - xMargin;
  const minimumZ = terrainBounds.min.z + zMargin;
  const maximumZ = terrainBounds.max.z - zMargin;
  const outside =
    point.x < minimumX ||
    point.x > maximumX ||
    point.z < minimumZ ||
    point.z > maximumZ;

  return {
    point: new Vector3(
      clampNumber(point.x, minimumX, maximumX),
      point.y,
      clampNumber(point.z, minimumZ, maximumZ),
    ),
    outside,
  };
}

function terrainHeightNearPoint(
  grid: TerrainGrid,
  point: Vector3,
  radiusM: number,
): number | null {
  let nearestDistance = Infinity;
  let nearestHeight: number | null = null;
  let highestNearby = -Infinity;
  const radiusSquared = radiusM * radiusM;

  for (const row of grid.grid) {
    for (const cell of row) {
      if (cell.elevationM == null) continue;
      const world = toWorld(grid, cell.lat, cell.lng, cell.elevationM);
      const dx = world.x - point.x;
      const dz = world.z - point.z;
      const distanceSquared = dx * dx + dz * dz;
      if (distanceSquared < nearestDistance) {
        nearestDistance = distanceSquared;
        nearestHeight = world.y;
      }
      if (distanceSquared <= radiusSquared) {
        highestNearby = Math.max(highestNearby, world.y);
      }
    }
  }

  return highestNearby > -Infinity ? highestNearby : nearestHeight;
}

function flightCameraPlan(
  route: Vector3[],
  routeDistanceList: number[],
  revealedDistanceKm: number,
  grid: TerrainGrid,
  terrainBounds: Box3,
): FlightCameraPlan | null {
  const marker = pointAtRouteDistance(
    route,
    routeDistanceList,
    revealedDistanceKm,
  );
  if (!marker) return null;
  const routeLengthKm = routeDistanceList.at(-1) ?? revealedDistanceKm;
  const directionSampleDistanceKm = 0.18;
  const behind =
    pointAtRouteDistance(
      route,
      routeDistanceList,
      Math.max(0, revealedDistanceKm - directionSampleDistanceKm),
    ) ?? marker;
  const ahead =
    pointAtRouteDistance(
      route,
      routeDistanceList,
      Math.min(
        routeLengthKm,
        revealedDistanceKm + directionSampleDistanceKm,
      ),
    ) ?? marker;
  const horizontalDirection = new Vector3(
    ahead.x - behind.x,
    0,
    ahead.z - behind.z,
  );
  const horizontalDistance = horizontalDirection.length();
  if (horizontalDistance < 0.001) {
    horizontalDirection.set(
      ahead.x - marker.x,
      0,
      ahead.z - marker.z,
    );
    if (horizontalDirection.length() < 0.001) {
      horizontalDirection.set(0, 0, -1);
    }
  }
  if (horizontalDirection.length() >= 0.001) {
    horizontalDirection.normalize();
  } else {
    horizontalDirection.set(0, 0, -1);
  }

  // Follow the route directly. The camera stays behind the current point and
  // looks ahead along the local slope.
  const slope =
    (ahead.y - behind.y) / Math.max(1, horizontalDistance);
  const cameraDistance = 130;
  const cameraHeight = 68;
  const desiredCamera = marker
    .clone()
    .addScaledVector(horizontalDirection, -cameraDistance);
  const markerTerrainHeight = terrainHeightNearPoint(grid, marker, 450);
  const cameraTerrainHeight = terrainHeightNearPoint(grid, desiredCamera, 220);
  const nearbyTerrainHeight = Math.max(
    markerTerrainHeight ?? -Infinity,
    cameraTerrainHeight ?? -Infinity,
  );
  desiredCamera.y = Math.max(
    marker.y + cameraHeight,
    nearbyTerrainHeight > -Infinity
      ? nearbyTerrainHeight + 600
      : marker.y + cameraHeight,
  );

  const desiredTarget = marker
    .clone()
    .addScaledVector(horizontalDirection, 120);
  desiredTarget.y = marker.y + clampNumber(slope * 120, -40, 40) - 6;
  if (nearbyTerrainHeight != null) {
    desiredTarget.y = Math.max(desiredTarget.y, nearbyTerrainHeight - 20);
  }
  const markerFocus = marker.clone();
  markerFocus.y += 8;

  const safeCamera = clampFlightPointToTerrain(
    desiredCamera,
    terrainBounds,
    45,
  );
  const safeTarget = clampFlightPointToTerrain(
    desiredTarget,
    terrainBounds,
    20,
  );

  return {
    cameraPosition: safeCamera.point,
    target: safeTarget.point,
    markerFocus,
    horizontalDirection: horizontalDirection.clone(),
  };
}

function swissMapImageDimensions(
  bounds: MapBounds,
  maximumEdge: number,
): { width: number; height: number } {
  const centerLat = (bounds.south + bounds.north) / 2;
  const widthM =
    Math.max(bounds.east - bounds.west, 1e-9) *
    111_320 *
    Math.cos(centerLat * radians);
  const heightM =
    Math.max(bounds.north - bounds.south, 1e-9) * 111_320;
  const aspect = widthM / Math.max(heightM, 1);
  if (aspect >= 1) {
    return {
      width: maximumEdge,
      height: Math.max(64, Math.round(maximumEdge / aspect)),
    };
  }
  return {
    width: Math.max(64, Math.round(maximumEdge * aspect)),
    height: maximumEdge,
  };
}

function swissTopoTextureUrl(bounds: MapBounds, size: number): string {
  const { south, west, north, east } = bounds;
  const { width, height } = swissMapImageDimensions(bounds, size);
  return `https://wms.geo.admin.ch/?${new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS: "ch.swisstopo.swissimage",
    STYLES: "default",
    CRS: "EPSG:4326",
    BBOX: `${south},${west},${north},${east}`,
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: "image/jpeg",
  }).toString()}`;
}

function swissSurfaceReliefUrl(grid: TerrainGrid, size: number): string {
  const { south, west, north, east } = grid.bounds;
  const { width, height } = swissMapImageDimensions(grid.bounds, size);
  return `https://wms.geo.admin.ch/?${new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS:
      "ch.swisstopo.swisssurface3d-reliefschattierung-multidirektional",
    STYLES: "default",
    CRS: "EPSG:4326",
    BBOX: `${south},${west},${north},${east}`,
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
  }).toString()}`;
}

type ClippedTerrainVertex = {
  position: [number, number, number];
  uv: [number, number];
};

function interpolateTerrainVertex(
  from: ClippedTerrainVertex,
  to: ClippedTerrainVertex,
  fraction: number,
): ClippedTerrainVertex {
  return {
    position: [
      from.position[0] + (to.position[0] - from.position[0]) * fraction,
      from.position[1] + (to.position[1] - from.position[1]) * fraction,
      from.position[2] + (to.position[2] - from.position[2]) * fraction,
    ],
    uv: [
      from.uv[0] + (to.uv[0] - from.uv[0]) * fraction,
      from.uv[1] + (to.uv[1] - from.uv[1]) * fraction,
    ],
  };
}

function clipTerrainPolygon(
  polygon: ClippedTerrainVertex[],
  axis: 0 | 1,
  limit: number,
  keepGreater: boolean,
): ClippedTerrainVertex[] {
  const output: ClippedTerrainVertex[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const from = polygon[index];
    const to = polygon[(index + 1) % polygon.length];
    const fromInside = keepGreater
      ? from.uv[axis] >= limit
      : from.uv[axis] <= limit;
    const toInside = keepGreater
      ? to.uv[axis] >= limit
      : to.uv[axis] <= limit;
    if (fromInside && toInside) {
      output.push(to);
    } else if (fromInside) {
      const denominator = to.uv[axis] - from.uv[axis];
      const fraction =
        Math.abs(denominator) < 1e-9
          ? 0
          : (limit - from.uv[axis]) / denominator;
      output.push(interpolateTerrainVertex(from, to, fraction));
    } else if (toInside) {
      const denominator = to.uv[axis] - from.uv[axis];
      const fraction =
        Math.abs(denominator) < 1e-9
          ? 0
          : (limit - from.uv[axis]) / denominator;
      output.push(interpolateTerrainVertex(from, to, fraction));
      output.push(to);
    }
  }
  return output;
}

function clipTerrainTriangle(
  triangle: ClippedTerrainVertex[],
): ClippedTerrainVertex[] {
  let polygon = triangle;
  polygon = clipTerrainPolygon(polygon, 0, 0, true);
  polygon = clipTerrainPolygon(polygon, 0, 1, false);
  polygon = clipTerrainPolygon(polygon, 1, 0, true);
  polygon = clipTerrainPolygon(polygon, 1, 1, false);
  return polygon;
}

function toWorld(
  grid: TerrainGrid,
  lat: number,
  lng: number,
  elevationM: number,
) {
  const { south, west, north, east } = grid.bounds;
  const centerLat = (south + north) / 2;
  return new Vector3(
    (lng - (west + east) / 2) * 111_320 * Math.cos(centerLat * radians),
    elevationM * 3,
    -(lat - (south + north) / 2) * 111_320,
  );
}

function renderTerrainElevations(
  grid: TerrainGrid,
): Array<Array<number | null>> {
  const elevations = grid.grid.map((row) =>
    row.map((cell) => cell.elevationM),
  );
  const maxRadius = Math.max(grid.rows, grid.columns);

  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      if (elevations[row][column] != null) continue;

      let nearest: number | null = null;
      for (let radius = 1; radius <= maxRadius && nearest == null; radius += 1) {
        const rowStart = Math.max(0, row - radius);
        const rowEnd = Math.min(grid.rows - 1, row + radius);
        const columnStart = Math.max(0, column - radius);
        const columnEnd = Math.min(grid.columns - 1, column + radius);
        for (let candidateRow = rowStart; candidateRow <= rowEnd; candidateRow += 1) {
          for (
            let candidateColumn = columnStart;
            candidateColumn <= columnEnd;
            candidateColumn += 1
          ) {
            if (
              Math.max(
                Math.abs(candidateRow - row),
                Math.abs(candidateColumn - column),
              ) !== radius
            ) {
              continue;
            }
            const candidate = elevations[candidateRow][candidateColumn];
            if (candidate != null) {
              nearest = candidate;
              break;
            }
          }
          if (nearest != null) break;
        }
      }
      elevations[row][column] = nearest;
    }
  }

  return elevations;
}

function buildTerrainGeometry(
  grid: TerrainGrid,
  textureBounds: MapBounds = grid.bounds,
  tile?: MapTile,
): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const elevations = renderTerrainElevations(grid);
  const clipToTextureBounds =
    tile != null &&
    tile.rowStart == null &&
    tile.rowEnd == null &&
    tile.columnStart == null &&
    tile.columnEnd == null;

  for (let rowIndex = 0; rowIndex < grid.grid.length; rowIndex += 1) {
    const row = grid.grid[rowIndex];
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const cell = row[columnIndex];
      const position = toWorld(
        grid,
        cell.lat,
        cell.lng,
        elevations[rowIndex][columnIndex] ?? 0,
      );
      positions.push(position.x, position.y, position.z);
      const u =
        (cell.lng - textureBounds.west) /
        (textureBounds.east - textureBounds.west);
      const v =
        (cell.lat - textureBounds.south) /
        (textureBounds.north - textureBounds.south);
      uvs.push(u, v);
    }
  }

  const sourcePositions = positions.slice();
  const sourceUvs = uvs.slice();
  if (clipToTextureBounds) {
    positions.length = 0;
    uvs.length = 0;
  }
  const appendClippedTriangle = (triangle: [number, number, number]) => {
    const clipped = clipTerrainTriangle(
      triangle.map((vertexIndex) => ({
        position: [
          sourcePositions[vertexIndex * 3],
          sourcePositions[vertexIndex * 3 + 1],
          sourcePositions[vertexIndex * 3 + 2],
        ],
        uv: [
          sourceUvs[vertexIndex * 2],
          sourceUvs[vertexIndex * 2 + 1],
        ],
      })),
    );
    if (clipped.length < 3) return;
    const startIndex = positions.length / 3;
    for (const vertex of clipped) {
      positions.push(...vertex.position);
      uvs.push(...vertex.uv);
    }
    for (let index = 1; index < clipped.length - 1; index += 1) {
      indices.push(startIndex, startIndex + index, startIndex + index + 1);
    }
  };

  const valid = (row: number, column: number) =>
    elevations[row][column] != null;
  for (let row = 0; row < grid.rows - 1; row++) {
    for (let column = 0; column < grid.columns - 1; column++) {
      if (
        tile?.rowStart != null &&
        tile.rowEnd != null &&
        tile.columnStart != null &&
        tile.columnEnd != null
      ) {
        if (
          row < tile.rowStart ||
          row >= tile.rowEnd ||
          column < tile.columnStart ||
          column >= tile.columnEnd
        ) {
          continue;
        }
      } else if (!clipToTextureBounds) {
        const cellCenterLat =
          (grid.grid[row][column].lat + grid.grid[row + 1][column + 1].lat) / 2;
        const cellCenterLng =
          (grid.grid[row][column].lng + grid.grid[row + 1][column + 1].lng) / 2;
        if (
          cellCenterLat < textureBounds.south ||
          cellCenterLat >= textureBounds.north ||
          cellCenterLng < textureBounds.west ||
          cellCenterLng >= textureBounds.east
        ) {
          continue;
        }
      }
      const topLeft = row * grid.columns + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + grid.columns;
      const bottomRight = bottomLeft + 1;
      if (
        valid(row, column) &&
        valid(row, column + 1) &&
        valid(row + 1, column)
      ) {
        if (clipToTextureBounds) {
          appendClippedTriangle([topLeft, bottomLeft, topRight]);
        } else {
          indices.push(topLeft, bottomLeft, topRight);
        }
      }
      if (
        valid(row, column + 1) &&
        valid(row + 1, column) &&
        valid(row + 1, column + 1)
      ) {
        if (clipToTextureBounds) {
          appendClippedTriangle([topRight, bottomLeft, bottomRight]);
        } else {
          indices.push(topRight, bottomLeft, bottomRight);
        }
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function altitudeAt(
  profile: TerrainProfilePoint[],
  distance: number,
): number | null {
  if (profile.length < 2) return null;
  const origin = profile[0].distanceKm;
  const last = profile[profile.length - 1];
  if (distance < 0 || distance > last.distanceKm - origin) return null;
  for (let index = 1; index < profile.length; index++) {
    const previous = profile[index - 1];
    const next = profile[index];
    const start = previous.distanceKm - origin;
    const end = next.distanceKm - origin;
    if (distance <= end) {
      const fraction = (distance - start) / Math.max(0.000001, end - start);
      return previous.altM + (next.altM - previous.altM) * fraction;
    }
  }
  return last.altM;
}

function routeDistances(route: number[][]): number[] {
  const distances = [0];
  for (let index = 1; index < route.length; index++) {
    distances.push(
      distances[index - 1] + distanceKm(route[index - 1], route[index]),
    );
  }
  return distances;
}

function cumulativeAscent(
  profile: TerrainProfilePoint[],
  distances: number[],
): number[] {
  const values = [0];
  let total = 0;
  for (let index = 1; index < distances.length; index += 1) {
    const previous = altitudeAt(profile, distances[index - 1]);
    const current = altitudeAt(profile, distances[index]);
    if (previous != null && current != null && current > previous) {
      total += current - previous;
    }
    values.push(total);
  }
  return values;
}

function valueAtDistance(
  values: number[],
  distances: number[],
  distance: number,
): number {
  const lastIndex = Math.min(values.length, distances.length) - 1;
  if (lastIndex < 0) return 0;
  if (distance <= 0) return values[0] ?? 0;
  if (distance >= distances[lastIndex]) return values[lastIndex] ?? 0;
  let high = 1;
  while (high <= lastIndex && distances[high] < distance) high += 1;
  const low = Math.max(0, high - 1);
  const span = distances[high] - distances[low];
  const fraction = span > 0 ? (distance - distances[low]) / span : 0;
  return (
    (values[low] ?? 0) +
    ((values[high] ?? values[low] ?? 0) - (values[low] ?? 0)) * fraction
  );
}

function routeBearingAtDistance(
  geometry: number[][],
  distances: number[],
  distance: number,
): number {
  const next = geoPointAtRouteDistance(
    geometry,
    distances,
    Math.min(distances.at(-1) ?? 0, distance + 0.03),
  );
  const current = geoPointAtRouteDistance(geometry, distances, distance);
  if (!current || !next) return 0;
  const deltaLng = (next[1] - current[1]) * radians;
  const lat1 = current[0] * radians;
  const lat2 = next[0] * radians;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (Math.atan2(y, x) / radians + 360) % 360;
}

function estimatedWalkedMinutes(distanceKm: number, ascentM: number): number {
  const horizontalHours = Math.max(0, distanceKm) / 4;
  const verticalHours = Math.max(0, ascentM) / 400;
  const hours =
    Math.max(horizontalHours, verticalHours) +
    Math.min(horizontalHours, verticalHours) / 2;
  return Math.max(0, Math.round(hours * 60));
}

function geoPointAtRouteDistance(
  points: number[][],
  distances: number[],
  distance: number,
): number[] | undefined {
  const lastIndex = Math.min(points.length, distances.length) - 1;
  if (lastIndex < 0) return undefined;
  if (distance <= 0) return points[0];
  if (distance >= distances[lastIndex]) return points[lastIndex];
  let high = 1;
  while (high <= lastIndex && distances[high] < distance) high += 1;
  const low = Math.max(0, high - 1);
  const span = distances[high] - distances[low];
  const fraction = span > 0 ? (distance - distances[low]) / span : 0;
  return [
    points[low][0] + (points[high][0] - points[low][0]) * fraction,
    points[low][1] + (points[high][1] - points[low][1]) * fraction,
  ];
}

function flightDetailTiles(
  geometry: number[][],
  distances: number[],
  bounds: MapBounds,
): MapTile[] {
  const routeLengthKm = distances.at(-1) ?? 0;
  const spacingKm = flightTileSpacingKm;
  const radiusM = 900;
  const count = Math.max(1, Math.ceil(routeLengthKm / spacingKm) + 1);
  return Array.from({ length: count }, (_, index) => {
    const distanceKm = Math.min(routeLengthKm, index * spacingKm);
    const center =
      geoPointAtRouteDistance(geometry, distances, distanceKm) ?? geometry[0];
    const latitudeRadius = radiusM / 111_320;
    const longitudeRadius =
      radiusM /
      (111_320 * Math.max(0.2, Math.cos(center[0] * radians)));
    return {
      key: `flight-${index}`,
      bounds: {
        south: Math.max(bounds.south, center[0] - latitudeRadius),
        north: Math.min(bounds.north, center[0] + latitudeRadius),
        west: Math.max(bounds.west, center[1] - longitudeRadius),
        east: Math.min(bounds.east, center[1] + longitudeRadius),
      },
    };
  });
}

function FlightMarker({
  position,
}: {
  position: Vector3;
}) {
  return (
    <mesh
      position={[position.x, position.y + 8, position.z]}
      renderOrder={1000}
      frustumCulled={false}
    >
      <sphereGeometry args={[4, 16, 10]} />
      <meshBasicMaterial
        color="#B6FF00"
        side={DoubleSide}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function FlightSky() {
  const sky = useRef<Mesh>(null);
  const camera = useThree((state) => state.camera);

  useFrame(() => {
    // Keep the procedural sky centered on the viewer so the horizon remains
    // infinitely distant while the terrain and route continue to move.
    sky.current?.position.copy(camera.position);
  });

  return (
    <mesh
      ref={sky}
      renderOrder={-100}
      frustumCulled={false}
    >
      <sphereGeometry args={[50_000, 32, 16]} />
      <shaderMaterial
        vertexShader={flightSkyVertexShader}
        fragmentShader={flightSkyFragmentShader}
        side={BackSide}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function pointAtRouteDistance(
  points: Vector3[],
  distances: number[],
  distance: number,
): Vector3 | undefined {
  const lastIndex = Math.min(points.length, distances.length) - 1;
  if (lastIndex < 0) return undefined;
  if (distance <= 0) return points[0];
  if (distance >= distances[lastIndex]) return points[lastIndex];
  let high = 1;
  while (high <= lastIndex && distances[high] < distance) high += 1;
  const low = Math.max(0, high - 1);
  const span = distances[high] - distances[low];
  const fraction =
    span > 0 ? (distance - distances[low]) / span : 0;
  return points[low].clone().lerp(points[high], fraction);
}

/** Distance along a polyline, including projection onto an interpolated segment. */
function distanceAlongRoute(
  point: number[],
  route: number[][],
  distances: number[],
): number {
  let closestDistance = Infinity;
  let result = 0;
  for (let index = 1; index < route.length; index++) {
    const a = route[index - 1];
    const b = route[index];
    const latitudeScale = 111.32;
    const longitudeScale = 111.32 * Math.cos(((a[0] + b[0]) / 2) * radians);
    const x = (point[1] - a[1]) * longitudeScale;
    const y = (point[0] - a[0]) * latitudeScale;
    const dx = (b[1] - a[1]) * longitudeScale;
    const dy = (b[0] - a[0]) * latitudeScale;
    const fraction = Math.max(
      0,
      Math.min(1, (x * dx + y * dy) / Math.max(0.00000001, dx * dx + dy * dy)),
    );
    const error = (x - dx * fraction) ** 2 + (y - dy * fraction) ** 2;
    if (error < closestDistance) {
      closestDistance = error;
      result =
        distances[index - 1] +
        (distances[index] - distances[index - 1]) * fraction;
    }
  }
  return result;
}

function RouteLine({ color, points }: { color: string; points: Vector3[] }) {
  const geometry = useMemo(
    () => new BufferGeometry().setFromPoints(points),
    [points],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      <ThreeLine geometry={geometry} renderOrder={20}>
        <lineBasicMaterial
          color="#061A0B"
          linewidth={15}
          transparent
          opacity={0.94}
          blending={NormalBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </ThreeLine>
      <ThreeLine geometry={geometry} renderOrder={21}>
        <lineBasicMaterial
          color={color}
          linewidth={30}
          transparent
          opacity={0.08}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </ThreeLine>
      <ThreeLine geometry={geometry} renderOrder={22}>
        <lineBasicMaterial
          color={color}
          linewidth={19}
          transparent
          opacity={0.16}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </ThreeLine>
      <ThreeLine geometry={geometry} renderOrder={23}>
        <lineBasicMaterial
          color={color}
          linewidth={12}
          transparent
          opacity={0.38}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </ThreeLine>
      <ThreeLine geometry={geometry} renderOrder={24}>
        <lineBasicMaterial
          color={color}
          linewidth={6}
          transparent
          opacity={1}
          blending={NormalBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </ThreeLine>
    </>
  );
}

function RouteProgressPulse({ position }: { position: Vector3 }) {
  const group = useRef<Group>(null);
  const haloMaterial = useRef<any>(null);
  const phase = useRef(0);

  useFrame((_, delta) => {
    phase.current = (phase.current + delta * 4.2) % (Math.PI * 2);
    const wave = (Math.sin(phase.current) + 1) / 2;
    const scale = 0.74 + wave * 1.06;
    group.current?.scale.setScalar(scale);
    if (haloMaterial.current) {
      haloMaterial.current.opacity = 0.38 + wave * 0.52;
    }
  });

  return (
    <group
      ref={group}
      position={[position.x, position.y + 10, position.z]}
      renderOrder={30}
      frustumCulled={false}
    >
      <mesh>
        <sphereGeometry args={[96, 16, 10]} />
        <meshBasicMaterial
          color="#39FF14"
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[68, 16, 10]} />
        <meshBasicMaterial
          color="#39FF14"
          transparent
          opacity={0.28}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[44, 16, 10]} />
        <meshBasicMaterial
          ref={haloMaterial}
          color="#8CFF66"
          transparent
          opacity={0.3}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[16, 16, 10]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={1}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function RouteTransitionLight({
  position,
  color,
}: {
  position: Vector3;
  color: string;
}) {
  return (
    <mesh
      position={[position.x, position.y + 5, position.z]}
      renderOrder={24}
    >
      <sphereGeometry args={[3.5, 12, 8]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.86}
        blending={AdditiveBlending}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function RouteEndpointFlag({
  position,
  kind,
}: {
  position: Vector3;
  kind: "start" | "finish";
}) {
  const group = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const startFlagGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(
        new Float32Array([0, 44, 0, 32, 36, 0, 0, 28, 0]),
        3,
      ),
    );
    geometry.setIndex([0, 1, 2]);
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  useEffect(() => () => startFlagGeometry.dispose(), [startFlagGeometry]);
  useFrame(() => {
    if (!group.current) return;
    const distance = camera.position.distanceTo(position);
    group.current.scale.setScalar(
      Math.max(4, Math.min(20, distance / 1_250)),
    );
    group.current.rotation.y = Math.atan2(
      camera.position.x - position.x,
      camera.position.z - position.z,
    );
  });

  return (
    <group
      ref={group}
      position={[position.x, position.y, position.z]}
      frustumCulled={false}
    >
      <mesh position={[0, 22, 0]} renderOrder={20}>
        <cylinderGeometry args={[1.5, 1.5, 44, 8]} />
        <meshStandardMaterial
          color="#D1D5DB"
          metalness={0.65}
          roughness={0.35}
          depthTest={false}
        />
      </mesh>
      {kind === "start" ? (
        <mesh geometry={startFlagGeometry} renderOrder={21}>
          <meshStandardMaterial
            color="#CC0000"
            side={DoubleSide}
            depthTest={false}
          />
        </mesh>
      ) : (
        Array.from({ length: 2 }, (_, row) =>
          Array.from({ length: 3 }, (_, column) => (
            <mesh
              key={`finish-${row}-${column}`}
              position={[5 + column * 10, 40.5 - row * 7, 0]}
              renderOrder={21}
            >
              <boxGeometry args={[10, 7, 0.8]} />
              <meshStandardMaterial
                color={(row + column) % 2 === 0 ? "#111111" : "#FFFFFF"}
                depthTest={false}
              />
            </mesh>
          )),
        )
      )}
    </group>
  );
}

function Scene({
  model,
  mode,
  runId,
  onFlightComplete,
  onMapLoadState,
  onWalkProgress,
}: {
  model: Model;
  mode: ViewMode;
  runId: number;
  onFlightComplete: () => void;
  onMapLoadState: (state: "loading" | "ready" | "error") => void;
  onWalkProgress: (progress: WalkProgress) => void;
}) {
  const terrain = useMemo(() => buildTerrainGeometry(model.grid), [model.grid]);
  const terrainBounds = useMemo(() => {
    terrain.computeBoundingBox();
    return (
      terrain.boundingBox?.clone() ??
      new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1))
    );
  }, [terrain]);
  const tiles = useMemo(() => mapTiles(model.grid), [model.grid]);
  const tileTerrains = useMemo(
    () =>
      tiles.map((tile) =>
        buildTerrainGeometry(model.grid, tile.bounds, tile),
      ),
    [model.grid, tiles],
  );
  const routeDistanceList = useMemo(
    () => routeDistances(model.geometry),
    [model.geometry],
  );
  const ascentList = useMemo(
    () => cumulativeAscent(model.profile, routeDistanceList),
    [model.profile, routeDistanceList],
  );
  const flightTiles = useMemo(
    () =>
      flightDetailTiles(
        model.geometry,
        routeDistanceList,
        model.grid.bounds,
      ),
    [model.geometry, model.grid.bounds, routeDistanceList],
  );
  const [textures, setTextures] = useState<Texture[]>([]);
  const [reliefTexture, setReliefTexture] = useState<Texture | null>(null);
  const [flightTileVersion, setFlightTileVersion] = useState(0);
  const loadedFlightTiles = useRef(new Map<number, LoadedFlightTile>());
  const loadingFlightTiles = useRef(new Set<number>());
  const failedFlightTiles = useRef(new Set<number>());
  const wantedFlightTiles = useRef(new Set<number>());
  const [revealedDistanceKm, setRevealedDistanceKm] = useState(0);
  const revealedDistanceRef = useRef(0);
  const lastWalkProgress = useRef("");
  const flightCompleted = useRef(false);
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.size);
  const smoothedFlightTarget = useRef<Vector3 | null>(null);

  useEffect(() => {
    let active = true;
    setTextures([]);
    onMapLoadState("loading");
    const loadTile = async (tile: MapTile) => {
      let lastError: unknown;
      for (const size of mapTextureSizes) {
        try {
          return await loadRouteMapTexture(
            swissTopoTextureUrl(tile.bounds, size),
            `route-terrain-basemap-${tile.key}-${size}`,
          );
        } catch (error) {
          lastError = error;
          console.warn(
            `[RouteTerrain3D] SwissTopo tile ${tile.key} ${size}x${size} failed`,
            error,
          );
        }
      }
      throw lastError;
    };
    const loadBaseMap = async () => {
      const loaded: Texture[] = [];
      for (let index = 0; index < tiles.length; index += 2) {
        loaded.push(...(await Promise.all(tiles.slice(index, index + 2).map(loadTile))));
      }
      return loaded;
    };
    loadBaseMap()
      .then((loaded) => {
        if (!active) {
          loaded.forEach((texture) => texture.dispose());
          return;
        }
        setTextures(loaded);
        onMapLoadState("ready");
      })
      .catch((error) => {
        console.warn("[RouteTerrain3D] SwissTopo texture failed", error);
        if (active) onMapLoadState("error");
      });
    return () => {
      active = false;
    };
  }, [onMapLoadState, tiles]);
  useEffect(() => {
    if (textures.length !== tiles.length) return;
    let active = true;
    const loadRelief = async () => {
      for (const size of mapTextureSizes) {
        try {
          return await loadRouteMapTexture(
            swissSurfaceReliefUrl(model.grid, size),
            `route-terrain-relief-${size}`,
          );
        } catch (error) {
          console.warn(
            `[RouteTerrain3D] swissSURFACE3D relief ${size}x${size} failed`,
            error,
          );
        }
      }
      return null;
    };
    loadRelief()
      .then((loaded) => {
        if (!loaded) return;
        if (!active) {
          loaded.dispose();
          return;
        }
        setReliefTexture(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [model.grid, textures.length, tiles.length]);
  useEffect(() => () => terrain.dispose(), [terrain]);
  useEffect(
    () => () => tileTerrains.forEach((geometry) => geometry.dispose()),
    [tileTerrains],
  );
  useEffect(
    () => () => textures.forEach((texture) => texture.dispose()),
    [textures],
  );
  useEffect(() => () => reliefTexture?.dispose(), [reliefTexture]);

  const route = useMemo(() => {
    return model.geometry
      .map((point, index) => {
        const elevation = altitudeAt(model.profile, routeDistanceList[index]);
        return elevation == null
          ? null
          : toWorld(model.grid, point[0], point[1], elevation + 5);
      })
      .filter((point): point is Vector3 => point != null);
  }, [model, routeDistanceList]);

  const gradeLines = useMemo(
    () =>
      buildRouteGradeSegments(model.geometry, model.profile)
        .map((segment) => {
          const startDistance = distanceAlongRoute(
            segment.coordinates[0],
            model.geometry,
            routeDistanceList,
          );
          const endDistance = distanceAlongRoute(
            segment.coordinates[1],
            model.geometry,
            routeDistanceList,
          );
          const startElevation = altitudeAt(model.profile, startDistance);
          const endElevation = altitudeAt(model.profile, endDistance);
          if (startElevation == null || endElevation == null) return null;
          return {
            color: gradeColors[segment.band],
            startDistance,
            endDistance,
            points: [
              toWorld(
                model.grid,
                segment.coordinates[0][0],
                segment.coordinates[0][1],
                startElevation + 7,
              ),
              toWorld(
                model.grid,
                segment.coordinates[1][0],
                segment.coordinates[1][1],
                endElevation + 7,
              ),
            ],
          };
        })
        .filter(
          (
            line,
          ): line is {
            color: string;
            startDistance: number;
            endDistance: number;
            points: Vector3[];
          } => line != null,
        ),
    [model, routeDistanceList],
  );

  const overview = useMemo(() => {
    const positions = terrain.getAttribute("position") as BufferAttribute;
    let terrainMinX = Infinity,
      terrainMaxX = -Infinity,
      terrainMinY = Infinity,
      terrainMaxY = -Infinity,
      terrainMinZ = Infinity,
      terrainMaxZ = -Infinity;
    for (let index = 0; index < positions.count; index++) {
      terrainMinX = Math.min(terrainMinX, positions.getX(index));
      terrainMaxX = Math.max(terrainMaxX, positions.getX(index));
      terrainMinY = Math.min(terrainMinY, positions.getY(index));
      terrainMaxY = Math.max(terrainMaxY, positions.getY(index));
      terrainMinZ = Math.min(terrainMinZ, positions.getZ(index));
      terrainMaxZ = Math.max(terrainMaxZ, positions.getZ(index));
    }
    const frame = route.length >= 2
      ? {
          minX: Math.min(...route.map((point) => point.x)),
          maxX: Math.max(...route.map((point) => point.x)),
          minY: Math.min(...route.map((point) => point.y)),
          maxY: Math.max(...route.map((point) => point.y)),
          minZ: Math.min(...route.map((point) => point.z)),
          maxZ: Math.max(...route.map((point) => point.z)),
        }
      : {
          minX: terrainMinX,
          maxX: terrainMaxX,
          minY: terrainMinY,
          maxY: terrainMaxY,
          minZ: terrainMinZ,
          maxZ: terrainMaxZ,
        };
    return {
      target: new Vector3(
        (frame.minX + frame.maxX) / 2,
        (frame.minY + frame.maxY) / 2,
        (frame.minZ + frame.maxZ) / 2,
      ),
    };
  }, [route, terrain]);

  useEffect(() => {
    if (mode !== "flight") {
      const tilt = (48 * Math.PI) / 180;
      const verticalFov = (48 * Math.PI) / 180;
      const aspect = Math.max(0.1, viewport.width / viewport.height);
      const horizontalFov =
        2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
      const sinTilt = Math.sin(tilt);
      const cosTilt = Math.cos(tilt);
      const tanVertical = Math.tan(verticalFov / 2) * 0.94;
      const tanHorizontal = Math.tan(horizontalFov / 2) * 0.94;
      let distance = 300;
      for (const point of route) {
        const relativeX = point.x - overview.target.x;
        const relativeY = point.y - overview.target.y;
        const relativeZ = point.z - overview.target.z;
        const projectedY = relativeY * cosTilt - relativeZ * sinTilt;
        const towardCamera = relativeY * sinTilt + relativeZ * cosTilt;
        distance = Math.max(
          distance,
          towardCamera + Math.abs(relativeX) / tanHorizontal,
          towardCamera + Math.abs(projectedY) / tanVertical,
        );
      }
      camera.up.set(0, 1, 0);
      camera.position.set(
        overview.target.x,
        overview.target.y + distance * sinTilt,
        overview.target.z + distance * cosTilt,
      );
      camera.lookAt(overview.target);
      camera.updateProjectionMatrix();
    }
  }, [camera, mode, overview, viewport.height, viewport.width]);

  const routeLengthKm = routeDistanceList.at(-1) ?? 0;
  const activeFlightTileIndex = Math.min(
    flightTiles.length - 1,
    Math.max(0, Math.floor(revealedDistanceKm / flightTileSpacingKm)),
  );
  useEffect(() => {
    flightCompleted.current = false;
    const initialDistance = mode === "overview" ? routeLengthKm : 0;
    revealedDistanceRef.current = initialDistance;
    setRevealedDistanceKm(initialDistance);
    lastWalkProgress.current = "";
    if (mode === "walk" || mode === "flight") {
      onWalkProgress({
        distanceM: 0,
        ascentM: 0,
        minutes: 0,
        bearingDeg: routeBearingAtDistance(model.geometry, routeDistanceList, 0),
      });
    }
  }, [mode, model.geometry, onWalkProgress, routeDistanceList, routeLengthKm, runId]);

  useEffect(() => {
    const disposeAll = () => {
      loadedFlightTiles.current.forEach(({ texture, geometry }) => {
        texture.dispose();
        geometry.dispose();
      });
      loadedFlightTiles.current.clear();
      loadingFlightTiles.current.clear();
      failedFlightTiles.current.clear();
      setFlightTileVersion((value) => value + 1);
    };
    if (mode === "walk") {
      wantedFlightTiles.current = new Set();
      disposeAll();
      return;
    }

    const wantedIndices =
      mode === "flight"
        ? Array.from(
            { length: 7 },
            (_, offset) => activeFlightTileIndex + offset - 2,
          )
        : textures.length === tiles.length
          ? [0, 1, 2]
          : [];
    const wanted = new Set(
      wantedIndices.filter(
        (index) => index >= 0 && index < flightTiles.length,
      ),
    );
    wantedFlightTiles.current = wanted;
    loadedFlightTiles.current.forEach((loaded, index) => {
      if (wanted.has(index)) return;
      loaded.texture.dispose();
      loaded.geometry.dispose();
      loadedFlightTiles.current.delete(index);
    });
    setFlightTileVersion((value) => value + 1);

    for (const index of wanted) {
      if (
        loadedFlightTiles.current.has(index) ||
        loadingFlightTiles.current.has(index)
      ) {
        continue;
      }
      loadingFlightTiles.current.add(index);
      failedFlightTiles.current.delete(index);
      const tile = flightTiles[index];
      const load = async () => {
        let lastError: unknown;
        for (const size of mapTextureSizes) {
          try {
            const texture = await loadRouteMapTexture(
              swissTopoTextureUrl(tile.bounds, size),
              `route-terrain-detail-${index}-${size}`,
            );
            if (!wantedFlightTiles.current.has(index)) {
              texture.dispose();
              return;
            }
            failedFlightTiles.current.delete(index);
            loadedFlightTiles.current.set(index, {
              tile,
              texture,
              geometry: buildTerrainGeometry(model.grid, tile.bounds, tile),
            });
            setFlightTileVersion((value) => value + 1);
            return;
          } catch (error) {
            lastError = error;
          }
        }
        console.warn(
          `[RouteTerrain3D] flight detail tile ${index} failed`,
          lastError,
        );
        failedFlightTiles.current.add(index);
        setFlightTileVersion((value) => value + 1);
      };
      void load().finally(() => loadingFlightTiles.current.delete(index));
    }
  }, [
    activeFlightTileIndex,
    flightTiles,
    mode,
    model.grid,
    textures.length,
    tiles.length,
  ]);

  useEffect(
    () => () => {
      wantedFlightTiles.current = new Set();
      loadedFlightTiles.current.forEach(({ texture, geometry }) => {
        texture.dispose();
        geometry.dispose();
      });
      loadedFlightTiles.current.clear();
    },
    [],
  );

  const activeFlightTileReady =
    mode !== "flight" ||
    loadedFlightTiles.current.has(activeFlightTileIndex) ||
    failedFlightTiles.current.has(activeFlightTileIndex);

  useFrame((_, delta) => {
    if (mode !== "overview" && activeFlightTileReady) {
      const next = Math.min(
        routeLengthKm,
        revealedDistanceRef.current +
          delta *
            (mode === "walk"
              ? walkSpeedKmPerSecond
              : flightSpeedKmPerSecond),
      );
      revealedDistanceRef.current = next;
      setRevealedDistanceKm(next);
      if (mode === "walk" || mode === "flight") {
        const distanceM = Math.round(next * 1000);
        const ascentM = Math.round(valueAtDistance(ascentList, routeDistanceList, next));
        const progress: WalkProgress = {
          distanceM,
          ascentM,
          minutes: estimatedWalkedMinutes(distanceM / 1000, ascentM),
          bearingDeg: routeBearingAtDistance(model.geometry, routeDistanceList, next),
        };
        const progressKey = `${distanceM}:${ascentM}:${progress.minutes}:${Math.round(progress.bearingDeg)}`;
        if (progressKey !== lastWalkProgress.current) {
          lastWalkProgress.current = progressKey;
          onWalkProgress(progress);
        }
      }
      if (
        mode === "flight" &&
        next >= routeLengthKm &&
        !flightCompleted.current
      ) {
        flightCompleted.current = true;
        onFlightComplete();
      }
    }
    const cameraPlan =
      mode === "flight"
        ? flightCameraPlan(
            route,
            routeDistanceList,
            revealedDistanceRef.current,
            model.grid,
            terrainBounds,
          )
        : null;
    if (cameraPlan) {
      camera.up.set(0, 1, 0);
      const horizontalBlend = 1 - Math.exp(-delta * 1.7);
      const verticalBlend = 1 - Math.exp(-delta * 2.1);
      const targetBlend = 1 - Math.exp(-delta * 1.45);
      camera.position.x +=
        (cameraPlan.cameraPosition.x - camera.position.x) * horizontalBlend;
      camera.position.z +=
        (cameraPlan.cameraPosition.z - camera.position.z) * horizontalBlend;
      camera.position.y +=
        (cameraPlan.cameraPosition.y - camera.position.y) * verticalBlend;
      if (!smoothedFlightTarget.current) {
        smoothedFlightTarget.current = cameraPlan.target.clone();
      } else {
        smoothedFlightTarget.current.lerp(cameraPlan.target, targetBlend);
      }
      camera.lookAt(smoothedFlightTarget.current);
      // lookAt() can preserve a non-zero roll on the native GL camera after
      // the previous overview orientation. Keep its pitch and heading, but
      // force a level horizon for the flight view.
      camera.rotation.set(
        camera.rotation.x,
        camera.rotation.y,
        0,
        "YXZ",
      );
      camera.updateMatrixWorld();
    } else if (mode !== "flight") {
      smoothedFlightTarget.current = null;
    }
  });

  const marker = pointAtRouteDistance(
    route,
    routeDistanceList,
    revealedDistanceKm,
  );
  const visibleGradeLines = gradeLines
    .map((line) => {
      if (revealedDistanceKm <= line.startDistance) return null;
      if (revealedDistanceKm >= line.endDistance) return line;
      const fraction =
        (revealedDistanceKm - line.startDistance) /
        Math.max(0.000001, line.endDistance - line.startDistance);
      return {
        ...line,
        points: [
          line.points[0],
          line.points[0].clone().lerp(line.points[1], fraction),
        ],
      };
    })
    .filter((line): line is NonNullable<typeof line> => line != null);
  const visibleFlightTiles = useMemo(
    () => Array.from(loadedFlightTiles.current.values()),
    [flightTileVersion],
  );
  const showTerrainFallback =
    mode !== "flight" || textures.length < tiles.length;

  return (
    <>
      {mode === "flight" && <FlightSky />}
      <color
        attach="background"
        args={[mode === "flight" ? flightSkyColor : "#101A16"]}
      />
      <ambientLight intensity={1.35} />
      <directionalLight position={[300, 700, 400]} intensity={2.4} />
      {showTerrainFallback && (
        <mesh geometry={terrain} renderOrder={-10}>
          <meshBasicMaterial
            color="#263A31"
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
      {textures.map((texture, index) => (
        <mesh
          key={tiles[index].key}
          geometry={tileTerrains[index]}
          renderOrder={1}
        >
          <meshStandardMaterial
            map={texture}
            color="#fff"
            roughness={1}
            metalness={0}
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      ))}
      {visibleFlightTiles.map(({ tile, texture, geometry }) => (
        <mesh key={tile.key} geometry={geometry} renderOrder={2}>
          <meshBasicMaterial
            map={texture}
            side={DoubleSide}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
            toneMapped={false}
          />
        </mesh>
      ))}
      {textures.length === tiles.length && reliefTexture && (
        <mesh geometry={terrain}>
          <meshBasicMaterial
            map={reliefTexture}
            transparent
            opacity={0.16}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-3}
            polygonOffsetUnits={-3}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
      {visibleGradeLines.map((line, index) => (
        <RouteLine key={index} {...line} />
      ))}
      {mode !== "flight" &&
        visibleGradeLines.slice(1).map((line, index) => (
          <RouteTransitionLight
            key={`transition-${index}`}
            position={line.points[0]}
            color={line.color}
          />
        ))}
      {route[0] && (
        <RouteEndpointFlag position={route[0]} kind="start" />
      )}
      {route.at(-1) && (
        <RouteEndpointFlag position={route.at(-1)!} kind="finish" />
      )}
      {mode === "walk" && marker && <RouteProgressPulse position={marker} />}
      {mode === "flight" && marker && (
        <FlightMarker position={marker} />
      )}
    </>
  );
}

function WalkMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: any;
}) {
  return (
    <View style={styles.walkMetric}>
      <Feather name={icon} size={17} color="#15231D" />
      <Text style={styles.walkMetricLabel}>{label}</Text>
      <Text style={styles.walkMetricValue}>{value}</Text>
    </View>
  );
}

function GradeAttitudeInstrument({ gradePct }: { gradePct: number | null }) {
  const color = gradeInstrumentColor(gradePct);
  const label = gradeInstrumentLabel(gradePct);
  // A positive route grade means the virtual hiker pitches upward. In a
  // conventional artificial horizon the ground/horizon shifts down behind
  // the fixed aircraft symbol for positive pitch.
  const horizonTop = 21 + Math.max(-11, Math.min(11, (gradePct ?? 0) * 0.52));

  return (
    <View
      style={[styles.walkMetric, styles.attitudeMetric]}
      accessible
      accessibilityLabel={gradeInstrumentAccessibilityLabel(gradePct)}
    >
      <Text style={styles.walkMetricLabel}>Neigung</Text>
      <View style={styles.attitudeInstrument}>
        <View
          style={[
            styles.attitudeSky,
            { bottom: Math.max(0, 42 - horizonTop) },
          ]}
        />
        <View
          style={[
            styles.attitudeHorizon,
            { top: horizonTop, backgroundColor: color },
          ]}
        />
        <View pointerEvents="none" style={styles.attitudeAircraft}>
          <View style={styles.attitudeWing} />
          <View style={styles.attitudeNose} />
          <View style={styles.attitudeWing} />
        </View>
        <Text style={[styles.attitudeValue, { color }]}>{label}</Text>
      </View>
    </View>
  );
}

export default function RouteTerrain3D({
  visible,
  onClose,
  geometry,
  terrainProfile,
}: Props) {
  const colors = useColors();
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState<boolean | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("overview");
  const [runId, setRunId] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [walkProgress, setWalkProgress] = useState<WalkProgress | null>(null);
  const currentGradePct = useMemo(
    () =>
      model && walkProgress
        ? getSmoothedGradePctAtDistance(
            model.profile,
            walkProgress.distanceM / 1000,
          )
        : null,
    [model, walkProgress?.distanceM],
  );
  const updateWalkProgress = useMemo(
    () => (progress: WalkProgress) => setWalkProgress(progress),
    [],
  );
  const mapLoadState = useMemo(
    () => (state: "loading" | "ready" | "error") => {
      if (state === "loading") setLoadProgress((value) => Math.max(value, 70));
      if (state === "ready") setLoadProgress(100);
      if (state === "error") {
        setError("Die Satellitenkarte konnte nicht geladen werden.");
      }
    },
    [],
  );
  const flightComplete = useMemo(() => () => setMode("overview"), []);
  const selectMode = (nextMode: ViewMode) => {
    setMode(nextMode);
    setRunId((value) => value + 1);
    if (nextMode === "overview") {
      setWalkProgress(null);
    } else {
      setWalkProgress({
        distanceM: 0,
        ascentM: 0,
        minutes: 0,
        bearingDeg: 0,
      });
    }
  };

  useEffect(() => {
    if (loadProgress < 70 || loadProgress >= 100 || error) return;
    const timer = setInterval(
      () => setLoadProgress((value) => Math.min(95, value + 1)),
      220,
    );
    return () => clearInterval(timer);
  }, [error, loadProgress]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setReady(null);
    setModel(null);
    setError(null);
    setMode("overview");
    setWalkProgress(null);
    setLoadProgress(5);
    GLView.createContextAsync()
      .then((context) => GLView.destroyContextAsync(context).then(() => true))
      .then((available) => {
        if (!active) return;
        setReady(available);
        if (available) setLoadProgress(20);
      })
      .catch(() => active && setReady(false));
    return () => {
      active = false;
    };
  }, [visible]);

  useEffect(() => {
    if (visible && ready === false)
      setError("Die native 3D-Grafik ist auf diesem Gerät nicht verfügbar.");
  }, [visible, ready]);

  useEffect(() => {
    if (!visible || ready !== true) return;
    if (
      !geometry ||
      geometry.length < 2 ||
      !terrainProfile ||
      terrainProfile.length < 2
    ) {
      setError("Für diese Route fehlen die benötigten Geländedaten.");
      return;
    }
    let active = true;
    setLoadProgress(30);
    const progressTimer = setInterval(
      () => setLoadProgress((value) => Math.min(65, value + 2)),
      180,
    );
    const corridorGeometry = sampleTerrainAreaGeometry(
      geometry.map(
      (point) => [point[0], point[1]] as [number, number],
      ),
    );
    createTerrainArea({
      geometry: corridorGeometry,
      options: {
        rows: 40,
        columns: 40,
        paddingM: 5000,
        viewportAspect: Math.max(
          0.4,
          Math.min(1, window.width / window.height),
        ),
      },
    })
      .then((data) => {
        const grid = parseTerrainCorridor(data);
        if (!grid) throw new Error();
        if (active) {
          clearInterval(progressTimer);
          setLoadProgress(70);
          setModel({ grid, geometry, profile: terrainProfile });
        }
      })
      .catch(() => {
        clearInterval(progressTimer);
        if (active) setError("Das 3D-Gelände konnte nicht geladen werden.");
      });
    return () => {
      active = false;
      clearInterval(progressTimer);
    };
  }, [
    visible,
    ready,
    geometry,
    terrainProfile,
    window.height,
    window.width,
  ]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {model && (
          <Canvas
            style={styles.canvas}
            camera={{ position: [0, 500, 700], fov: 48, near: 1, far: 100000 }}
          >
            <Scene
              model={model}
              mode={mode}
              runId={runId}
              onFlightComplete={flightComplete}
              onMapLoadState={mapLoadState}
              onWalkProgress={updateWalkProgress}
            />
          </Canvas>
        )}
        {(!model || loadProgress < 100 || error) && (
          <View style={[styles.status, { backgroundColor: colors.background }]}>
            {error ? (
              <>
                <Text style={[styles.statusText, { color: colors.foreground }]}>
                  {error}
                </Text>
                <Text
                  style={[styles.statusHint, { color: colors.mutedForeground }]}
                >
                  Es werden keine Höhenwerte geschätzt.
                </Text>
              </>
            ) : (
              <>
                <ActivityIndicator color={colors.accent} />
                <Text style={[styles.statusText, { color: colors.foreground }]}>
                  {loadProgress < 20
                    ? "3D-Grafik wird vorbereitet …"
                    : loadProgress < 70
                      ? "3D-Gelände wird geladen …"
                      : "Satellitenkarte wird geladen …"}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${loadProgress}%`,
                        backgroundColor: colors.accent,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.statusHint, { color: colors.mutedForeground }]}
                >
                  {Math.round(loadProgress)} %
                </Text>
              </>
            )}
          </View>
        )}
        {(mode === "walk" || mode === "flight") && model && walkProgress && (
          <View style={[styles.walkStatus, { top: insets.top }]}>
            <BackButton
              accessibilityLabel="Zurück zur Übersicht"
              onPress={onClose}
              style={styles.walkBackButton}
            />
            <View style={styles.walkMetricRow}>
              <WalkMetric label="Gegangene Distanz" value={`${walkProgress.distanceM} m`} icon="map" />
              <WalkMetric label="Höhenmeter" value={`${walkProgress.ascentM} m`} icon="trending-up" />
              <WalkMetric label="Gehzeit" value={`${walkProgress.minutes} min`} icon="clock" />
              <GradeAttitudeInstrument gradePct={currentGradePct} />
            </View>
          </View>
        )}
        {mode === "overview" && (model || error) && (
          <BackButton
            accessibilityLabel="Zurück zur App"
            onPress={onClose}
            style={[styles.backButton, { top: insets.top + 8 }]}
          />
        )}
        {model && loadProgress === 100 && !error && (
          <View style={[styles.controls, { paddingBottom: 8 }]}>
            {(
              [
                ["overview", "map", "Übersicht"],
                ["walk", "edit-3", "Gehen"],
                ["flight", "navigation", "Flug"],
              ] as const
            ).map(([value, icon, label]) => {
              const active = mode === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    hapticRigid();
                    selectMode(value);
                  }}
                  style={[styles.control, active && styles.controlActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Feather
                    name={icon}
                    size={20}
                    color={active ? "#FFFFFF" : "#15231D"}
                  />
                  <Text
                    style={[
                      styles.controlText,
                      active && styles.controlTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#101A16" },
  canvas: { flex: 1 },
  status: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  statusText: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  statusHint: { fontSize: 14, textAlign: "center" },
  progressTrack: {
    width: "78%",
    maxWidth: 320,
    height: 8,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: "#FFFFFF22",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  walkStatus: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 7,
    zIndex: 10,
  },
  backButton: {
    position: "absolute",
    left: 12,
    zIndex: 10,
  },
  walkBackButton: {
    flexShrink: 0,
    marginTop: 1,
    marginRight: 6,
  },
  walkMetricRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 4,
    marginTop: 0,
  },
  walkMetric: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: "#F3F5F1",
  },
  walkMetricLabel: {
    color: "#647067",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  walkMetricValue: {
    color: "#15231D",
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  attitudeMetric: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  attitudeInstrument: {
    width: 58,
    height: 42,
    overflow: "hidden",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#15231D",
    backgroundColor: "#4A5A45",
    alignItems: "center",
    justifyContent: "center",
  },
  attitudeSky: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#73BFE9",
  },
  attitudeHorizon: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
  },
  attitudeAircraft: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    top: 18,
  },
  attitudeWing: {
    width: 15,
    height: 2,
    backgroundColor: "#FFFFFF",
  },
  attitudeNose: {
    width: 6,
    height: 6,
    marginHorizontal: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#15231D",
    backgroundColor: "#FFFFFF",
  },
  attitudeValue: {
    position: "absolute",
    bottom: 2,
    alignSelf: "center",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
    fontVariant: ["tabular-nums"],
    textShadowColor: "#15231D",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 2,
    paddingHorizontal: 8,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "#E8E2D9",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 10,
  },
  control: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  controlActive: { backgroundColor: "#CC0000" },
  controlText: { color: "#15231D", fontSize: 11, fontWeight: "700" },
  controlTextActive: { color: "#FFFFFF" },
});
