import { Feather } from "@expo/vector-icons";
import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import { GLView } from "expo-gl";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Texture,
  Vector3,
} from "three";

import { createTerrainCorridor } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { loadNativeThreeTexture } from "@/lib/nativeThreeTexture";
import {
  buildRouteGradeSegments,
  type TerrainProfilePoint,
} from "@/lib/terrainCues";
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

const gradeColors = {
  green: "#34D399",
  yellow: "#FACC15",
  orange: "#FB923C",
  red: "#F43F5E",
};
const ThreeLine: any = "line";
const radians = Math.PI / 180;

function distanceKm(a: number[], b: number[]): number {
  const deltaLat = (b[0] - a[0]) * radians;
  const deltaLng = (b[1] - a[1]) * radians;
  const longitude = deltaLng * Math.cos(((a[0] + b[0]) / 2) * radians);
  return 6371 * Math.sqrt(deltaLat * deltaLat + longitude * longitude);
}

function swissTopoTextureUrl(grid: TerrainGrid): string {
  const { south, west, north, east } = grid.bounds;
  return `https://wms.geo.admin.ch/?${new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS: "ch.swisstopo.pixelkarte-farbe",
    STYLES: "default",
    CRS: "EPSG:4326",
    BBOX: `${south},${west},${north},${east}`,
    WIDTH: "1024",
    HEIGHT: "1024",
    FORMAT: "image/jpeg",
  }).toString()}`;
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
    elevationM * 1.35,
    -(lat - (south + north) / 2) * 111_320,
  );
}

function buildTerrainGeometry(grid: TerrainGrid): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const row of grid.grid) {
    for (const cell of row) {
      // The position always comes from the service cell. A null elevation is
      // retained only as an unused vertex; it never participates in a face.
      const position = toWorld(grid, cell.lat, cell.lng, cell.elevationM ?? 0);
      positions.push(position.x, position.y, position.z);
      const u =
        (cell.lng - grid.bounds.west) / (grid.bounds.east - grid.bounds.west);
      const v =
        (cell.lat - grid.bounds.south) /
        (grid.bounds.north - grid.bounds.south);
      uvs.push(u, v);
    }
  }

  const valid = (row: number, column: number) =>
    grid.grid[row][column].elevationM != null;
  for (let row = 0; row < grid.rows - 1; row++) {
    for (let column = 0; column < grid.columns - 1; column++) {
      const topLeft = row * grid.columns + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + grid.columns;
      const bottomRight = bottomLeft + 1;
      if (
        valid(row, column) &&
        valid(row, column + 1) &&
        valid(row + 1, column)
      ) {
        indices.push(topLeft, bottomLeft, topRight);
      }
      if (
        valid(row, column + 1) &&
        valid(row + 1, column) &&
        valid(row + 1, column + 1)
      ) {
        indices.push(topRight, bottomLeft, bottomRight);
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
    <ThreeLine geometry={geometry}>
      <lineBasicMaterial color={color} linewidth={4} />
    </ThreeLine>
  );
}

function Scene({
  model,
  playing,
  follow,
}: {
  model: Model;
  playing: boolean;
  follow: boolean;
}) {
  const terrain = useMemo(() => buildTerrainGeometry(model.grid), [model.grid]);
  const routeDistanceList = useMemo(
    () => routeDistances(model.geometry),
    [model.geometry],
  );
  const [texture, setTexture] = useState<Texture | null>(null);
  const [progress, setProgress] = useState(0);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    let active = true;
    loadNativeThreeTexture(swissTopoTextureUrl(model.grid))
      .then((loaded) => {
        if (!active) {
          loaded.dispose();
          return;
        }
        setTexture(loaded);
      })
      .catch((error) => {
        console.warn("[RouteTerrain3D] SwissTopo texture failed", error);
      });
    return () => {
      active = false;
    };
  }, [model.grid]);
  useEffect(() => () => terrain.dispose(), [terrain]);
  useEffect(() => () => texture?.dispose(), [texture]);

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
          (line): line is { color: string; points: Vector3[] } => line != null,
        ),
    [model, routeDistanceList],
  );

  const overview = useMemo(() => {
    const positions = terrain.getAttribute("position") as BufferAttribute;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (let index = 0; index < positions.count; index++) {
      minX = Math.min(minX, positions.getX(index));
      maxX = Math.max(maxX, positions.getX(index));
      minY = Math.min(minY, positions.getY(index));
      maxY = Math.max(maxY, positions.getY(index));
      minZ = Math.min(minZ, positions.getZ(index));
      maxZ = Math.max(maxZ, positions.getZ(index));
    }
    const extent = Math.max(maxX - minX, maxZ - minZ, 300);
    return {
      target: new Vector3(
        (minX + maxX) / 2,
        (minY + maxY) / 2,
        (minZ + maxZ) / 2,
      ),
      extent,
      top: maxY,
    };
  }, [terrain]);

  useEffect(() => {
    if (!follow) {
      camera.position.set(
        overview.extent * 0.8,
        overview.top + overview.extent * 0.95,
        overview.extent * 1.1,
      );
      camera.lookAt(overview.target);
      camera.updateProjectionMatrix();
    }
  }, [camera, follow, overview]);

  useFrame((_, delta) => {
    if (playing) setProgress((value) => (value + delta / 24) % 1);
    const marker =
      route[
        Math.min(
          route.length - 1,
          Math.floor(progress * Math.max(0, route.length - 1)),
        )
      ];
    if (follow && marker) {
      camera.position.lerp(
        new Vector3(marker.x + 75, marker.y + 90, marker.z + 120),
        0.035,
      );
      camera.lookAt(marker);
    }
  });

  const marker =
    route[
      Math.min(
        route.length - 1,
        Math.floor(progress * Math.max(0, route.length - 1)),
      )
    ];
  return (
    <>
      <color attach="background" args={["#101A16"]} />
      <ambientLight intensity={1.35} />
      <directionalLight position={[300, 700, 400]} intensity={2.4} />
      <mesh geometry={terrain}>
        <meshStandardMaterial
          map={texture}
          color={texture ? "#fff" : "#75966d"}
          roughness={0.95}
          side={DoubleSide}
        />
      </mesh>
      {gradeLines.map((line, index) => (
        <RouteLine key={index} {...line} />
      ))}
      {marker && (
        <mesh position={marker}>
          <sphereGeometry args={[9, 16, 16]} />
          <meshStandardMaterial
            color="#fff"
            emissive="#f4b942"
            emissiveIntensity={1.5}
          />
        </mesh>
      )}
    </>
  );
}

export default function RouteTerrain3D({
  visible,
  onClose,
  geometry,
  terrainProfile,
}: Props) {
  const colors = useColors();
  const [ready, setReady] = useState<boolean | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [follow, setFollow] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setReady(null);
    setModel(null);
    setError(null);
    GLView.createContextAsync()
      .then((context) => GLView.destroyContextAsync(context).then(() => true))
      .then((available) => active && setReady(available))
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
    const corridorGeometry = geometry.map(
      (point) => [point[0], point[1]] as [number, number],
    );
    createTerrainCorridor({ geometry: corridorGeometry })
      .then((data) => {
        const grid = parseTerrainCorridor(data);
        if (!grid) throw new Error();
        if (active) setModel({ grid, geometry, profile: terrainProfile });
      })
      .catch(
        () => active && setError("Das 3D-Gelände konnte nicht geladen werden."),
      );
    return () => {
      active = false;
    };
  }, [visible, ready, geometry, terrainProfile]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {model && (
          <Canvas
            style={styles.canvas}
            camera={{ position: [0, 500, 700], fov: 48, near: 1, far: 100000 }}
          >
            <Scene model={model} playing={playing} follow={follow} />
          </Canvas>
        )}
        {!model && (
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
                  3D-Gelände wird geladen …
                </Text>
              </>
            )}
          </View>
        )}
        <Pressable
          onPress={onClose}
          style={styles.close}
          accessibilityLabel="3D-Ansicht schliessen"
        >
          <Feather name="x" size={25} color="#fff" />
        </Pressable>
        {model && (
          <View style={styles.controls}>
            <Pressable
              onPress={() => setPlaying((value) => !value)}
              style={styles.control}
            >
              <Feather
                name={playing ? "pause" : "play"}
                size={20}
                color="#fff"
              />
              <Text style={styles.controlText}>
                {playing ? "Pause" : "Start"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFollow((value) => !value)}
              style={styles.control}
            >
              <Feather
                name={follow ? "navigation" : "map"}
                size={20}
                color="#fff"
              />
              <Text style={styles.controlText}>
                {follow ? "Folgen" : "Übersicht"}
              </Text>
            </Pressable>
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  statusText: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  statusHint: { fontSize: 14, textAlign: "center" },
  close: {
    position: "absolute",
    top: 52,
    right: 18,
    padding: 11,
    borderRadius: 22,
    backgroundColor: "#15231dbb",
  },
  controls: {
    position: "absolute",
    bottom: 38,
    left: 20,
    right: 20,
    flexDirection: "row",
    gap: 10,
  },
  control: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#15231ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  controlText: { color: "#fff", fontWeight: "700" },
});
