import { Canvas, useThree } from "@react-three/fiber/native";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Texture,
} from "three";

import {
  buildLocalTerrainMesh,
  type LocalTerrainMesh,
  type LocalTerrainModel,
} from "@/lib/terrainModel";
import { loadNativeThreeTexture } from "@/lib/nativeThreeTexture";
import type { PeakTerrainGlProps } from "./PeakTerrainGl.types";

function swissTopoTextureUrl(model: LocalTerrainModel): string {
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
    // Orthophoto without place names or map symbols keeps the panorama legible.
    LAYERS: "ch.swisstopo.swissimage",
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
  return `https://wms.geo.admin.ch/?${params.toString()}`;
}

function terrainGeometry(mesh: LocalTerrainMesh): BufferGeometry {
  const geometry = new BufferGeometry();
  // buildLocalTerrainMesh uses 0.04 world units per metre. Omitting only the
  // innermost 200 m reduces the oversized foreground without losing nearby
  // terrain silhouettes.
  const minimumPanoramaRadius = 200 * 0.04;
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

function CameraRig() {
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    // Panorama viewpoint: the observer is the geographic origin of the radial
    // DTM mesh and looks outward, rather than looking down at that origin.
    camera.position.set(0, 0.8, 0);
    // Aim slightly above horizontal so nearby ground does not consume the
    // lower half of the compact panorama; distant terrain stays in view.
    camera.lookAt(0, 11, -70);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

function TerrainMesh({
  terrainModel,
  bearingDeg,
  fallbackColor,
}: Pick<
  PeakTerrainGlProps,
  "terrainModel" | "bearingDeg" | "fallbackColor"
>) {
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
    loadNativeThreeTexture(swissTopoTextureUrl(terrainModel))
      .then((loadedTexture) => {
        if (!active) {
          loadedTexture.dispose();
          return;
        }
        setTexture(loadedTexture);
      })
      .catch((error) => {
        console.warn("[TerrainGL] SwissTopo texture failed", error);
      });
    return () => {
      active = false;
    };
  }, [terrainModel]);

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
    (-bearingDeg * Math.PI) / 180,
    0,
  ];
  // The real elevation differences are preserved, but a modest vertical
  // exaggeration makes the terrain silhouette readable in the small panorama.
  const terrainScale: [number, number, number] = [0.48, 1.05, 0.48];

  return (
    <>
      <mesh
        geometry={geometry}
        rotation={rotation}
        scale={terrainScale}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          map={texture}
          color={texture ? "#FFFFFF" : fallbackColor}
          roughness={0.9}
          metalness={0}
          side={DoubleSide}
        />
      </mesh>
      {texture && (
        <mesh
          geometry={geometry}
          rotation={rotation}
          scale={terrainScale}
          position={[0, 0.012, 0]}
        >
          <meshBasicMaterial
            color="#B42323"
            wireframe
            transparent
            opacity={0.07}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      )}
    </>
  );
}

export default function PeakTerrainGlRenderer({
  terrainModel,
  bearingDeg,
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
          fov: 65,
          near: 0.03,
          far: 500,
        }}
        onCreated={() => onReady?.()}
      >
        <color attach="background" args={[backgroundColor]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[70, 110, 80]} intensity={2.8} />
        <CameraRig />
        <TerrainMesh
          terrainModel={terrainModel}
          bearingDeg={bearingDeg}
          fallbackColor={fallbackColor}
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