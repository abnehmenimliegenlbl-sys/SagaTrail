import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  LinearFilter,
  type PerspectiveCamera,
  Texture,
} from "three";

import {
  buildLocalTerrainMesh,
  type LocalTerrainMesh,
  type LocalTerrainModel,
} from "@/lib/terrainModel";
import { loadNativeThreeTexture } from "@/lib/nativeThreeTexture";
import type {
  PeakTerrainGlProps,
  PeakTerrainTextureMode,
} from "./PeakTerrainGl.types";

const TERRAIN_WORLD_UNITS_PER_METRE = 0.04;
const TERRAIN_MINIMUM_RADIUS_M = 0;
const CAMERA_FRAMING_MINIMUM_RADIUS_M = 300;
const TERRAIN_HORIZONTAL_SCALE = 0.48;
const TERRAIN_VERTICAL_SCALE = 1.05;

type TextureBounds = {
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
};

type PanoramaTile = {
  key: string;
  bounds: TextureBounds;
  size: number;
  detail?: boolean;
};

const FULL_TEXTURE_BOUNDS: TextureBounds = {
  uMin: 0,
  uMax: 1,
  vMin: 0,
  vMax: 1,
};

const PANORAMA_BASE_TILES: PanoramaTile[] = Array.from(
  { length: 2 },
  (_, row) =>
    Array.from({ length: 3 }, (_, column) => ({
      key: `base-${row}-${column}`,
      bounds: {
        uMin: column / 3,
        uMax: (column + 1) / 3,
        vMin: row / 2,
        vMax: (row + 1) / 2,
      },
      size: 1024,
    })),
).flat();

const PANORAMA_DETAIL_TILES: PanoramaTile[] = Array.from(
  { length: 4 },
  (_, row) =>
    Array.from({ length: 4 }, (_, column) => ({
      key: `detail-${row}-${column}`,
      bounds: {
        uMin: 0.4 + column * 0.05,
        uMax: 0.4 + (column + 1) * 0.05,
        vMin: 0.4 + row * 0.05,
        vMax: 0.4 + (row + 1) * 0.05,
      },
      size: 1024,
      detail: true,
    })),
).flat();

function swissTopoTextureUrl(
  model: LocalTerrainModel,
  textureMode: PeakTerrainTextureMode,
  tile: PanoramaTile | null = null,
): string {
  const latitudeRadiusDeg = model.radiusM / 111_320;
  const longitudeRadiusDeg =
    model.radiusM /
    Math.max(
      1,
      111_320 * Math.cos((model.center.lat * Math.PI) / 180),
    );
  const bounds = tile?.bounds ?? FULL_TEXTURE_BOUNDS;
  const south =
    model.center.lat + (bounds.vMin - 0.5) * latitudeRadiusDeg * 2;
  const north =
    model.center.lat + (bounds.vMax - 0.5) * latitudeRadiusDeg * 2;
  const west =
    model.center.lng + (bounds.uMin - 0.5) * longitudeRadiusDeg * 2;
  const east =
    model.center.lng + (bounds.uMax - 0.5) * longitudeRadiusDeg * 2;
  const size = tile?.size ?? 2048;
  const params = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS:
      textureMode === "satellite"
        ? "ch.swisstopo.swissimage"
        : "ch.swisstopo.pixelkarte-farbe",
    STYLES: "default",
    CRS: "EPSG:4326",
    BBOX: [south, west, north, east].join(","),
    WIDTH: String(size),
    HEIGHT: String(size),
    FORMAT: "image/jpeg",
  });
  return `https://wms.geo.admin.ch/?${params.toString()}`;
}

type ClippedVertex = {
  position: [number, number, number];
  uv: [number, number];
};

function clipPolygon(
  polygon: ClippedVertex[],
  inside: (vertex: ClippedVertex) => boolean,
  intersection: (from: ClippedVertex, to: ClippedVertex) => ClippedVertex,
): ClippedVertex[] {
  const output: ClippedVertex[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const from = polygon[index];
    const to = polygon[(index + 1) % polygon.length];
    const fromInside = inside(from);
    const toInside = inside(to);
    if (fromInside && toInside) output.push(to);
    else if (fromInside) output.push(intersection(from, to));
    else if (toInside) {
      output.push(intersection(from, to));
      output.push(to);
    }
  }
  return output;
}

function interpolateVertex(
  from: ClippedVertex,
  to: ClippedVertex,
  fraction: number,
): ClippedVertex {
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

function clipTriangleToBounds(
  triangle: ClippedVertex[],
  bounds: TextureBounds,
): ClippedVertex[] {
  let polygon = triangle;
  const clip = (
    axis: 0 | 1,
    limit: number,
    keepGreater: boolean,
  ) => {
    polygon = clipPolygon(
      polygon,
      (vertex) =>
        keepGreater
          ? vertex.uv[axis] >= limit
          : vertex.uv[axis] <= limit,
      (from, to) => {
        const denominator = to.uv[axis] - from.uv[axis];
        const fraction =
          Math.abs(denominator) < 1e-9
            ? 0
            : (limit - from.uv[axis]) / denominator;
        return interpolateVertex(from, to, fraction);
      },
    );
  };
  clip(0, bounds.uMin, true);
  clip(0, bounds.uMax, false);
  clip(1, bounds.vMin, true);
  clip(1, bounds.vMax, false);
  return polygon;
}

function terrainGeometry(
  mesh: LocalTerrainMesh,
  textureBounds: TextureBounds = FULL_TEXTURE_BOUNDS,
): BufferGeometry {
  const geometry = new BufferGeometry();
  // Keep the terrain closed up to the observer. With the dense progressive
  // SwissTopo rings, the foreground no longer needs an artificial hole.
  const minimumPanoramaRadius =
    TERRAIN_MINIMUM_RADIUS_M * TERRAIN_WORLD_UNITS_PER_METRE;
  const visibleTriangles = mesh.triangleIndices.filter((triangle) =>
    triangle.every((vertexIndex) => {
      const vertex = mesh.vertices[vertexIndex];
      return (
        vertex != null &&
        Math.hypot(vertex[0], vertex[2]) >= minimumPanoramaRadius
      );
    }),
  );
  const positions: number[] = [];
  const uvs: number[] = [];
  const uSpan = textureBounds.uMax - textureBounds.uMin;
  const vSpan = textureBounds.vMax - textureBounds.vMin;
  for (const triangle of visibleTriangles) {
    const clipped = clipTriangleToBounds(
      triangle.map((vertexIndex) => ({
        position: mesh.vertices[vertexIndex],
        uv: mesh.texcoords[vertexIndex],
      })),
      textureBounds,
    );
    for (let index = 1; index < clipped.length - 1; index += 1) {
      for (const vertex of [clipped[0], clipped[index], clipped[index + 1]]) {
        positions.push(...vertex.position);
        uvs.push(
          (vertex.uv[0] - textureBounds.uMin) / uSpan,
          (vertex.uv[1] - textureBounds.vMin) / vSpan,
        );
      }
    }
  }
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(positions), 3),
  );
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function terrainCameraFraming(terrainModel: LocalTerrainModel): {
  targetY: number;
  fov: number;
} {
  const mesh = buildLocalTerrainMesh(terrainModel, 0);
  if (!mesh) return { targetY: 7, fov: 42 };

  const minimumRadius =
    CAMERA_FRAMING_MINIMUM_RADIUS_M * TERRAIN_WORLD_UNITS_PER_METRE;
  const angles = mesh.vertices
    .filter(
      ([x, , z]) => Math.hypot(x, z) >= minimumRadius,
    )
    .map(([x, y, z]) => {
      const horizontalDistance =
        Math.hypot(x, z) * TERRAIN_HORIZONTAL_SCALE;
      const verticalDistance = y * TERRAIN_VERTICAL_SCALE - 0.8;
      return Math.atan2(verticalDistance, horizontalDistance);
    })
    .filter(Number.isFinite);

  if (angles.length < 2) return { targetY: 7, fov: 42 };
  const minimumAngle = Math.min(...angles);
  const maximumAngle = Math.max(...angles);
  const centreAngle = (minimumAngle + maximumAngle) / 2;
  const angleSpanDeg = ((maximumAngle - minimumAngle) * 180) / Math.PI;
  return {
    targetY: Math.tan(centreAngle) * 70,
    fov: Math.max(22, Math.min(52, angleSpanDeg + 12)),
  };
}

function CameraRig({ terrainModel }: { terrainModel: LocalTerrainModel }) {
  const camera = useThree((state) => state.camera);
  const framing = useMemo(
    () => terrainCameraFraming(terrainModel),
    [terrainModel],
  );
  useEffect(() => {
    // Panorama viewpoint: the observer is the geographic origin of the radial
    // DTM mesh and looks outward, rather than looking down at that origin.
    camera.position.set(0, 0.8, 0);
    camera.lookAt(0, framing.targetY, -70);
    const perspectiveCamera = camera as PerspectiveCamera;
    if (perspectiveCamera.isPerspectiveCamera) {
      perspectiveCamera.fov = framing.fov;
    }
    camera.updateProjectionMatrix();
  }, [camera, framing]);
  return null;
}

function TerrainMesh({
  terrainModel,
  bearingDeg,
  textureMode,
  fallbackColor,
  onReady,
}: Pick<
  PeakTerrainGlProps,
  "terrainModel" | "bearingDeg" | "textureMode" | "fallbackColor" | "onReady"
>) {
  const renderer = useThree((state) => state.gl);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const localMesh = useMemo(
    () => buildLocalTerrainMesh(terrainModel, 0),
    [terrainModel],
  );
  const baseTiles = PANORAMA_BASE_TILES;
  const tiles = useMemo<PanoramaTile[]>(
    () => [...baseTiles, ...PANORAMA_DETAIL_TILES],
    [baseTiles],
  );
  const geometries = useMemo(
    () =>
      localMesh
        ? new Map(
            tiles.map((tile) => [
              tile.key,
              terrainGeometry(localMesh, tile.bounds),
            ]),
          )
        : new Map<string, BufferGeometry>(),
    [localMesh, tiles],
  );
  const [textures, setTextures] = useState(new Map<string, Texture>());
  const [textureGenerationKey, setTextureGenerationKey] = useState<
    string | null
  >(null);
  const [textureTerrainModel, setTextureTerrainModel] =
    useState<LocalTerrainModel | null>(null);
  const texturesRef = useRef(textures);
  texturesRef.current = textures;
  const pendingReadyFramesRef = useRef(-1);
  const baseTileCount = PANORAMA_BASE_TILES.length;
  const currentGenerationKey = [
    textureMode,
    terrainModel.center.lat,
    terrainModel.center.lng,
    terrainModel.radiusM,
    terrainModel.fetchedAt,
    terrainModel.sectors,
    terrainModel.rings,
    terrainModel.rays.length,
  ].join(":");

  useFrame(() => {
    if (
      textures.size < baseTileCount ||
      pendingReadyFramesRef.current < 0
    ) {
      return;
    }
    pendingReadyFramesRef.current += 1;
    if (pendingReadyFramesRef.current < 2) return;
    pendingReadyFramesRef.current = -1;
    onReadyRef.current?.();
  });

  useEffect(() => {
    let active = true;
    pendingReadyFramesRef.current = -1;
    const previousGeneration = texturesRef.current;
    const emptyGeneration = new Map<string, Texture>();
    texturesRef.current = emptyGeneration;
    setTextures(emptyGeneration);
    setTextureGenerationKey(null);
    setTextureTerrainModel(null);
    previousGeneration.forEach((texture) => texture.dispose());

    const loadTile = async (tile: PanoramaTile): Promise<Texture> => {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (!active) throw new Error("Panorama texture load cancelled");
        try {
          const loaded = await loadNativeThreeTexture(
            swissTopoTextureUrl(
              terrainModel,
              textureMode,
              tile,
            ),
          );
          loaded.anisotropy = renderer.capabilities.getMaxAnisotropy();
           loaded.generateMipmaps = false;
           loaded.minFilter = LinearFilter;
           loaded.magFilter = LinearFilter;
          loaded.needsUpdate = true;
          return loaded;
        } catch (error) {
          lastError = error;
          if (attempt < 2 && active) {
            await new Promise((resolve) =>
              setTimeout(resolve, 1_500 * (attempt + 1)),
            );
          }
        }
      }
      throw lastError;
    };

    const loadInPairs = async (
      requestedTiles: PanoramaTile[],
    ): Promise<Map<string, Texture>> => {
      const loaded = new Map<string, Texture>();
      try {
        for (let index = 0; index < requestedTiles.length; index += 2) {
          if (!active) break;
          const pair = requestedTiles.slice(index, index + 2);
          const results = await Promise.allSettled(
            pair.map(async (tile) => [tile.key, await loadTile(tile)] as const),
          );
          const fulfilled = results
            .filter(
              (
                result,
              ): result is PromiseFulfilledResult<readonly [string, Texture]> =>
                result.status === "fulfilled",
            )
            .map((result) => result.value);
          const failed = results.find(
            (result): result is PromiseRejectedResult =>
              result.status === "rejected",
          );
          if (failed) {
            fulfilled.forEach(([, texture]) => texture.dispose());
            throw failed.reason;
          }
          if (!active) {
            fulfilled.forEach(([, texture]) => texture.dispose());
            break;
          }
          fulfilled.forEach(([key, texture]) => loaded.set(key, texture));
        }
        return loaded;
      } catch (error) {
        loaded.forEach((texture) => texture.dispose());
        throw error;
      }
    };

    const loadTextures = async () => {
      try {
        const complete = await loadInPairs(tiles);
        if (!active || complete.size !== tiles.length) {
          complete.forEach((texture) => texture.dispose());
          return;
        }
        const previous = texturesRef.current;
        texturesRef.current = complete;
        setTextures(complete);
        setTextureGenerationKey(currentGenerationKey);
        setTextureTerrainModel(terrainModel);
        previous.forEach((texture) => texture.dispose());
        pendingReadyFramesRef.current = 0;

      } catch (error) {
        console.warn(
          "[TerrainGL] panorama textures failed after retries",
          error,
        );
      }
    };
    void loadTextures();
    return () => {
      active = false;
    };
  }, [
    currentGenerationKey,
    renderer,
    terrainModel,
    textureMode,
    baseTiles,
    tiles,
  ]);

  useEffect(
    () => () => {
      geometries.forEach((geometry) => geometry.dispose());
    },
    [geometries],
  );

  useEffect(
    () => () => {
      texturesRef.current.forEach((texture) => texture.dispose());
      texturesRef.current.clear();
    },
    [],
  );

  // Never expose the solid fallback mesh. Until the geographic texture has
  // successfully reached Expo GL, PeakPanorama shows its loading surface.
  if (
    !localMesh ||
    textureTerrainModel !== terrainModel ||
    textureGenerationKey !== currentGenerationKey ||
    textures.size < baseTileCount
  ) {
    return null;
  }

  const rotation: [number, number, number] = [
    0,
    (bearingDeg * Math.PI) / 180,
    0,
  ];
  // The real elevation differences are preserved, but a modest vertical
  // exaggeration makes the terrain silhouette readable in the small panorama.
  const terrainScale: [number, number, number] = [
    TERRAIN_HORIZONTAL_SCALE,
    TERRAIN_VERTICAL_SCALE,
    TERRAIN_HORIZONTAL_SCALE,
  ];

  return (
    <>
      {tiles.map((tile) => {
        const texture = textures.get(tile.key);
        const geometry = geometries.get(tile.key);
        if (!texture || !geometry) return null;
        return (
          <mesh
            key={tile.key}
            geometry={geometry}
            rotation={rotation}
            scale={terrainScale}
            position={[0, 0, 0]}
            renderOrder={tile.detail ? 2 : 1}
          >
            <meshBasicMaterial
              map={texture}
              color="#FFFFFF"
              side={DoubleSide}
              depthTest
              depthWrite
              polygonOffset={tile.detail}
              polygonOffsetFactor={tile.detail ? -2 : 0}
              polygonOffsetUnits={tile.detail ? -4 : 0}
            />
          </mesh>
        );
      })}
    </>
  );
}

export default function PeakTerrainGlRenderer({
  terrainModel,
  bearingDeg,
  textureMode,
  backgroundColor,
  fallbackColor,
  onReady,
}: PeakTerrainGlProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas
        style={styles.canvas}
        camera={{
          position: [0, 0.8, 0],
          fov: 42,
          near: 0.03,
          far: 500,
        }}
      >
        <color attach="background" args={[backgroundColor]} />
        <CameraRig terrainModel={terrainModel} />
        <TerrainMesh
          terrainModel={terrainModel}
          bearingDeg={bearingDeg}
          textureMode={textureMode}
          fallbackColor={fallbackColor}
          onReady={onReady}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});