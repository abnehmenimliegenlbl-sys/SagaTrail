import { Canvas, useThree } from "@react-three/fiber/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
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
const TERRAIN_MINIMUM_RADIUS_M = 300;
const TERRAIN_HORIZONTAL_SCALE = 0.48;
const TERRAIN_VERTICAL_SCALE = 1.05;

function swissTopoTextureUrl(
  model: LocalTerrainModel,
  textureMode: PeakTerrainTextureMode,
): string {
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
    LAYERS:
      textureMode === "satellite"
        ? "ch.swisstopo.swissimage"
        : "ch.swisstopo.pixelkarte-farbe",
    STYLES: "default",
    CRS: "EPSG:4326",
    BBOX: [
      model.center.lat - latitudeRadiusDeg,
      model.center.lng - longitudeRadiusDeg,
      model.center.lat + latitudeRadiusDeg,
      model.center.lng + longitudeRadiusDeg,
    ].join(","),
    // Use a high-resolution source for the tall native panorama. The complete
    // terrain mesh receives one image at one scale, avoiding mixed zoom levels.
    WIDTH: "3072",
    HEIGHT: "3072",
    FORMAT: "image/jpeg",
  });
  return `https://wms.geo.admin.ch/?${params.toString()}`;
}

function terrainGeometry(mesh: LocalTerrainMesh): BufferGeometry {
  const geometry = new BufferGeometry();
  // buildLocalTerrainMesh uses 0.04 world units per metre. Omitting only the
  // innermost 300 m reduces the oversized foreground without losing nearby
  // terrain silhouettes.
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
  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(mesh.vertices.flat()), 3),
  );
  geometry.setAttribute(
    "uv",
    new BufferAttribute(new Float32Array(mesh.texcoords.flat()), 2),
  );
  geometry.setIndex(
    new BufferAttribute(new Uint32Array(visibleTriangles.flat()), 1),
  );
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
    TERRAIN_MINIMUM_RADIUS_M * TERRAIN_WORLD_UNITS_PER_METRE;
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
  const geometry = useMemo(
    () => (localMesh ? terrainGeometry(localMesh) : null),
    [localMesh],
  );
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let active = true;
    // Keep the previous geographic texture visible until its replacement has
    // fully downloaded and reached Expo GL. Fast pan/heading updates must not
    // expose the solid-color loading material between valid textures.
    const loadTexture = async () => {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 3 && active; attempt += 1) {
        try {
          const loadedTexture = await loadNativeThreeTexture(
            swissTopoTextureUrl(terrainModel, textureMode),
          );
          if (!active) {
            loadedTexture.dispose();
            return;
          }
          loadedTexture.anisotropy =
            renderer.capabilities.getMaxAnisotropy();
          loadedTexture.needsUpdate = true;
          setTexture(loadedTexture);
          onReadyRef.current?.();
          return;
        } catch (error) {
          lastError = error;
          if (attempt < 2 && active) {
            await new Promise((resolve) =>
              setTimeout(resolve, 1_500 * (attempt + 1)),
            );
          }
        }
      }
      if (active) {
        console.warn(
          "[TerrainGL] SwissTopo texture failed after retries",
          lastError,
        );
      }
    };
    void loadTexture();
    return () => {
      active = false;
    };
  }, [renderer, terrainModel, textureMode]);

  useEffect(
    () => () => {
      geometry?.dispose();
      texture?.dispose();
    },
    [geometry, texture],
  );

  if (!geometry) return null;

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
      <mesh
        geometry={geometry}
        rotation={rotation}
        scale={terrainScale}
        position={[0, 0, 0]}
      >
        <meshBasicMaterial
          map={texture}
          color={texture ? "#FFFFFF" : fallbackColor}
          side={DoubleSide}
        />
      </mesh>
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