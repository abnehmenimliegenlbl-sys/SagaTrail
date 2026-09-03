import {
  ViroGeometry,
  ViroARScene,
  ViroARSceneNavigator,
  ViroMaterials,
  ViroNode,
  ViroText,
} from "@reactvision/react-viro";
import { useMemo, type JSX } from "react";
import { StyleSheet } from "react-native";

import type { PanoramaGipfel } from "@/lib/panorama";
import type { TerrainProfilePoint } from "@/lib/terrainCues";
import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

type TerrainVertex = [number, number, number];

interface PeakArSceneProps {
  sceneNavigator?: {
    viroAppProps?: {
      peaks?: readonly PanoramaGipfel[];
      terrainProfile?: readonly TerrainProfilePoint[] | null;
      onError?: () => void;
    };
  };
}

const TERRAIN_MATERIAL = "sagatrailTerrain";

ViroMaterials.createMaterials({
  [TERRAIN_MATERIAL]: {
    lightingModel: "Lambert",
    diffuseColor: "rgba(76, 128, 92, 0.76)",
    cullMode: "None",
  },
});

function buildTerrainMesh(profile: readonly TerrainProfilePoint[] | null | undefined) {
  const valid = (profile ?? [])
    .filter((point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.altM))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  if (valid.length < 2) return null;

  const samples =
    valid.length <= 24
      ? valid
      : Array.from({ length: 24 }, (_, index) => valid[Math.round((index * (valid.length - 1)) / 23)]);
  const minElevation = Math.min(...samples.map((point) => point.altM));
  const maxElevation = Math.max(...samples.map((point) => point.altM));
  const elevationRange = Math.max(1, maxElevation - minElevation);
  const startDistance = samples[0].distanceKm;
  const endDistance = samples[samples.length - 1].distanceKm;
  const distanceRange = Math.max(0.01, endDistance - startDistance);
  const vertices: TerrainVertex[] = [];
  const normals: TerrainVertex[] = [];
  const triangleIndices: TerrainVertex[] = [];

  samples.forEach((point, index) => {
    const progress = (point.distanceKm - startDistance) / distanceRange;
    const z = -3 - progress * 16;
    const y = ((point.altM - minElevation) / elevationRange) * 2.5;
    vertices.push([-2.8, y, z], [2.8, y, z]);
    normals.push([0, 1, 0], [0, 1, 0]);
    if (index > 0) {
      const previous = (index - 1) * 2;
      const current = index * 2;
      triangleIndices.push(
        [previous, current, previous + 1],
        [previous + 1, current, current + 1],
      );
    }
  });

  return { vertices, normals, triangleIndices };
}

function positionForPeak(peak: PanoramaGipfel): [number, number, number] {
  const bearing = ((peak.relativeBearingDeg ?? 0) * Math.PI) / 180;
  // AR scenes are local spaces. Compress long mountain distances logarithmically
  // so nearby and distant peaks are both readable without putting nodes outside
  // the useful tracking range.
  const depth = Math.max(4, Math.min(24, 4 + Math.sqrt(peak.distanceKm) * 2.4));
  // Nur der echte Höhenwinkel bestimmt die vertikale Lage. Bei fehlender
  // Beobachter- oder Gipfelhöhe bleibt der Marker auf dem Horizont, statt eine
  // künstliche Höhe als Messwert auszugeben.
  const height =
    peak.elevationAngleDeg == null
      ? 1.35
      : Math.max(0.35, Math.min(5.5, 1.35 + peak.elevationAngleDeg * 0.12));

  return [Math.sin(bearing) * depth, height, -Math.cos(bearing) * depth];
}

function PeakArScene({ sceneNavigator }: PeakArSceneProps) {
  const appProps = sceneNavigator?.viroAppProps;
  const peaks = appProps?.peaks ?? [];
  const terrainMesh = useMemo(
    () => buildTerrainMesh(appProps?.terrainProfile),
    [appProps?.terrainProfile],
  );
  const visiblePeaks = useMemo(
    () =>
      peaks
        .filter((peak) => peak.relativeBearingDeg != null)
        .slice(0, 6),
    [peaks],
  );

  return (
    <ViroARScene
      onError={() => appProps?.onError?.()}
    >
      {terrainMesh && (
        <ViroNode position={[0, -1.15, 0]}>
          <ViroGeometry
            vertices={terrainMesh.vertices}
            normals={terrainMesh.normals}
            triangleIndices={terrainMesh.triangleIndices}
            materials={TERRAIN_MATERIAL}
          />
        </ViroNode>
      )}
      {visiblePeaks.map((peak) => (
        <ViroNode
          key={peak.id}
          position={positionForPeak(peak)}
          transformBehaviors="billboard"
        >
          <ViroText
            text={`${peak.name}\n${peak.distanceKm.toFixed(1)} km${
              peak.elevationM != null ? ` · ${Math.round(peak.elevationM)} m` : ""
            }`}
            color="#FFFFFF"
            outerStroke={{
              type: "Outline",
              width: 2,
              color: "#10251D",
            }}
            style={styles.peakLabel}
          />
        </ViroNode>
      ))}
    </ViroARScene>
  );
}

export function PeakArNavigator({ peaks, terrainProfile, onError }: PeakArNavigatorProps) {
  return (
    <ViroARSceneNavigator
      style={StyleSheet.absoluteFillObject}
      // Viro injects sceneNavigator at runtime, but its type currently declares
      // the scene callback without the injected props.
      initialScene={{
        scene: PeakArScene as unknown as () => JSX.Element,
      }}
      viroAppProps={{ peaks, terrainProfile, onError }}
      autofocus
      worldAlignment="GravityAndHeading"
    />
  );
}

const styles = StyleSheet.create({
  peakLabel: {
    fontSize: 0.18,
    fontWeight: "700",
    textAlign: "center",
    textAlignVertical: "center",
  },
});