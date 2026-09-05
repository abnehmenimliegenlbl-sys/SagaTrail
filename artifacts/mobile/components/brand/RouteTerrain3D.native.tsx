import { Feather } from "@expo/vector-icons";
import { Canvas, useFrame, useThree } from "@react-three/fiber/native";
import { GLView } from "expo-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Texture,
  Vector3,
} from "three";

import { createTerrainArea } from "@workspace/api-client-react";
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
    LAYERS: "ch.swisstopo.swissimage",
    STYLES: "default",
    CRS: "EPSG:4326",
    BBOX: `${south},${west},${north},${east}`,
    WIDTH: "3072",
    HEIGHT: "3072",
    FORMAT: "image/jpeg",
  }).toString()}`;
}

function swissSurfaceReliefUrl(grid: TerrainGrid): string {
  const { south, west, north, east } = grid.bounds;
  return `https://wms.geo.admin.ch/?${new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS:
      "ch.swisstopo.swisssurface3d-reliefschattierung-multidirektional",
    STYLES: "default",
    CRS: "EPSG:4326",
    BBOX: `${south},${west},${north},${east}`,
    WIDTH: "3072",
    HEIGHT: "3072",
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
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
    elevationM * 3,
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
    group.current.rotation.y = Math.atan2(
      camera.position.x - position.x,
      camera.position.z - position.z,
    );
  });

  return (
    <group ref={group} position={[position.x, position.y, position.z]}>
      <mesh position={[0, 22, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 44, 8]} />
        <meshStandardMaterial color="#D1D5DB" metalness={0.65} roughness={0.35} />
      </mesh>
      {kind === "start" ? (
        <mesh geometry={startFlagGeometry}>
          <meshStandardMaterial color="#DA291C" side={DoubleSide} />
        </mesh>
      ) : (
        Array.from({ length: 2 }, (_, row) =>
          Array.from({ length: 3 }, (_, column) => (
            <mesh
              key={`finish-${row}-${column}`}
              position={[5 + column * 10, 40.5 - row * 7, 0]}
            >
              <boxGeometry args={[10, 7, 0.8]} />
              <meshStandardMaterial
                color={(row + column) % 2 === 0 ? "#111111" : "#FFFFFF"}
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
  const [reliefTexture, setReliefTexture] = useState<Texture | null>(null);
  const [progress, setProgress] = useState(0);
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.size);

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
  useEffect(() => {
    let active = true;
    loadNativeThreeTexture(swissSurfaceReliefUrl(model.grid))
      .then((loaded) => {
        if (!active) {
          loaded.dispose();
          return;
        }
        setReliefTexture(loaded);
      })
      .catch((error) => {
        console.warn("[RouteTerrain3D] swissSURFACE3D relief failed", error);
      });
    return () => {
      active = false;
    };
  }, [model.grid]);
  useEffect(() => () => terrain.dispose(), [terrain]);
  useEffect(() => () => texture?.dispose(), [texture]);
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
    if (!follow) {
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
  }, [camera, follow, overview, viewport.height, viewport.width]);

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
      camera.up.set(0, 1, 0);
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
      {texture && (
        <mesh geometry={terrain}>
          <meshStandardMaterial
            map={texture}
            color="#fff"
            roughness={1}
            metalness={0}
            side={DoubleSide}
          />
        </mesh>
      )}
      {texture && reliefTexture && (
        <mesh geometry={terrain}>
          <meshBasicMaterial
            map={reliefTexture}
            transparent
            opacity={0.16}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
      {gradeLines.map((line, index) => (
        <RouteLine key={index} {...line} />
      ))}
      {route[0] && <RouteEndpointFlag position={route[0]} kind="start" />}
      {route.at(-1) && (
        <RouteEndpointFlag position={route.at(-1)!} kind="finish" />
      )}
      {marker && (
        <mesh position={[marker.x, marker.y, marker.z]}>
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
  const window = useWindowDimensions();
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
        if (active) setModel({ grid, geometry, profile: terrainProfile });
      })
      .catch(
        () => active && setError("Das 3D-Gelände konnte nicht geladen werden."),
      );
    return () => {
      active = false;
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
