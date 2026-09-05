import {
  ViroAmbientLight,
  ViroCamera,
  ViroGeometry,
  ViroMaterials,
  ViroNode,
  ViroScene,
  ViroSceneNavigator,
} from "@reactvision/react-viro";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  buildLocalTerrainMesh,
  type LocalTerrainMesh,
  type LocalTerrainModel,
} from "@/lib/terrainModel";
import type { PeakTerrainPreviewProps } from "./PeakTerrainPreview";

const FALLBACK_MATERIAL = "sagatrailTerrainPreviewFallback";

ViroMaterials.createMaterials({
  [FALLBACK_MATERIAL]: {
    lightingModel: "Lambert",
    diffuseColor: "#C84A43",
    cullMode: "None",
    writesToDepthBuffer: true,
    readsFromDepthBuffer: true,
  },
});

interface TerrainPreviewSceneProps {
  sceneNavigator?: {
    viroAppProps?: PeakTerrainPreviewProps;
  };
}

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
  return `https://wms.geo.admin.ch/?${params.toString()}`;
}

function TerrainPreviewScene({ sceneNavigator }: TerrainPreviewSceneProps) {
  const { terrainModel, bearingDeg } = sceneNavigator?.viroAppProps ?? {};
  const [materialName, setMaterialName] = useState(FALLBACK_MATERIAL);
  const mesh = useMemo<LocalTerrainMesh | null>(
    () => buildLocalTerrainMesh(terrainModel, 0),
    [terrainModel],
  );

  useEffect(() => {
    if (!terrainModel) return;
    const nextMaterialName = `sagatrailTerrainPreview-${Math.round(
      terrainModel.center.lat * 10_000,
    )}-${Math.round(terrainModel.center.lng * 10_000)}`;
    ViroMaterials.createMaterials({
      [nextMaterialName]: {
        lightingModel: "Lambert",
        diffuseTexture: { uri: swissTopoTextureUrl(terrainModel) },
        diffuseIntensity: 0.96,
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
    setMaterialName(nextMaterialName);
  }, [terrainModel]);

  return (
    <ViroScene>
      <ViroAmbientLight color="#FFFFFF" intensity={650} />
      <ViroCamera
        active
        position={[0, 32, 92]}
        rotation={[-18, 0, 0]}
        fieldOfView={58}
      />
      {mesh && (
        <ViroNode
          scale={[0.42, 0.42, 0.42]}
          rotation={[0, -(bearingDeg ?? 0), 0]}
          position={[0, -13, 0]}
        >
          <ViroGeometry
            vertices={mesh.vertices}
            normals={mesh.normals}
            texcoords={mesh.texcoords}
            triangleIndices={mesh.triangleIndices}
            materials={materialName}
            renderingOrder={1}
            shadowCastingBitMask={0}
            viroTag="swisstopo-terrain-preview"
          />
        </ViroNode>
      )}
    </ViroScene>
  );
}

export function PeakTerrainPreview({
  terrainModel,
  bearingDeg,
}: PeakTerrainPreviewProps) {
  const initialScene = useMemo(
    () => ({
      // Viro injects sceneNavigator into a React scene component at runtime;
      // its declaration incorrectly types this property as a ViroScene instance.
      scene: TerrainPreviewScene as unknown as ViroScene,
    }),
    [],
  );
  const viroAppProps = useMemo(
    () => ({ terrainModel, bearingDeg }),
    [terrainModel, bearingDeg],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ViroSceneNavigator
        style={styles.navigator}
        initialScene={initialScene}
        viroAppProps={viroAppProps}
        vrModeEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navigator: {
    flex: 1,
    backgroundColor: "transparent",
  },
});