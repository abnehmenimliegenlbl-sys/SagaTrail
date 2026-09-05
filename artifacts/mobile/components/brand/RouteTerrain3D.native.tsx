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
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  SRGBColorSpace,
  Texture,
  Vector3,
} from "three";

import { createTerrainArea } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
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
type ViewMode = "overview" | "walk" | "flight";

const gradeColors = {
  green: "#39FF14",
  yellow: "#FFF700",
  orange: "#FF7A00",
  red: "#FF1744",
};
const ThreeLine: any = "line";
const radians = Math.PI / 180;
const mapTextureSizes: readonly number[] = [1536, 1024];

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
  const localUri = `${cacheDirectory}${cacheName}.jpg`;
  await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(
    () => undefined,
  );
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const result = await Promise.race([
    FileSystem.downloadAsync(url, localUri),
    new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error("Textur-Download hat zu lange gedauert.")),
        25_000,
      );
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Textur-Download fehlgeschlagen (${result.status}).`);
  }
  const { width, height } = await imageSize(result.uri);
  const texture = new Texture();
  texture.image = {
    data: { localUri: result.uri },
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

function swissTopoTextureUrl(grid: TerrainGrid, size: number): string {
  const { south, west, north, east } = grid.bounds;
  return `https://wms.geo.admin.ch/?${new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.3.0",
    LAYERS: "ch.swisstopo.swissimage",
    STYLES: "default",
    CRS: "EPSG:4326",
    BBOX: `${south},${west},${north},${east}`,
    WIDTH: String(size),
    HEIGHT: String(size),
    FORMAT: "image/jpeg",
  }).toString()}`;
}

function swissSurfaceReliefUrl(grid: TerrainGrid, size: number): string {
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
    WIDTH: String(size),
    HEIGHT: String(size),
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
    <ThreeLine geometry={geometry}>
      <lineBasicMaterial
        color={color}
        linewidth={6}
        transparent
        opacity={0.98}
        blending={AdditiveBlending}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
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
            color="#DA291C"
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
}: {
  model: Model;
  mode: ViewMode;
  runId: number;
  onFlightComplete: () => void;
  onMapLoadState: (state: "loading" | "ready" | "error") => void;
}) {
  const terrain = useMemo(() => buildTerrainGeometry(model.grid), [model.grid]);
  const routeDistanceList = useMemo(
    () => routeDistances(model.geometry),
    [model.geometry],
  );
  const [texture, setTexture] = useState<Texture | null>(null);
  const [reliefTexture, setReliefTexture] = useState<Texture | null>(null);
  const [revealedDistanceKm, setRevealedDistanceKm] = useState(0);
  const revealedDistanceRef = useRef(0);
  const flightCompleted = useRef(false);
  const camera = useThree((state) => state.camera);
  const viewport = useThree((state) => state.size);

  useEffect(() => {
    let active = true;
    setTexture(null);
    onMapLoadState("loading");
    const loadBaseMap = async () => {
      let lastError: unknown;
      for (const size of mapTextureSizes) {
        try {
          return await loadRouteMapTexture(
            swissTopoTextureUrl(model.grid, size),
            `route-terrain-basemap-${size}`,
          );
        } catch (error) {
          lastError = error;
          console.warn(
            `[RouteTerrain3D] SwissTopo texture ${size}x${size} failed`,
            error,
          );
        }
      }
      throw lastError;
    };
    loadBaseMap()
      .then((loaded) => {
        if (!active) {
          loaded.dispose();
          return;
        }
        setTexture(loaded);
        onMapLoadState("ready");
      })
      .catch((error) => {
        console.warn("[RouteTerrain3D] SwissTopo texture failed", error);
        if (active) onMapLoadState("error");
      });
    return () => {
      active = false;
    };
  }, [model.grid, onMapLoadState]);
  useEffect(() => {
    if (!texture) return;
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
  }, [model.grid, texture]);
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
  useEffect(() => {
    flightCompleted.current = false;
    const initialDistance = mode === "overview" ? routeLengthKm : 0;
    revealedDistanceRef.current = initialDistance;
    setRevealedDistanceKm(initialDistance);
  }, [mode, routeLengthKm, runId]);

  useFrame((_, delta) => {
    if (mode !== "overview") {
      const next = Math.min(
        routeLengthKm,
        revealedDistanceRef.current + delta * 0.5,
      );
      revealedDistanceRef.current = next;
      setRevealedDistanceKm(next);
      if (
        mode === "flight" &&
        next >= routeLengthKm &&
        !flightCompleted.current
      ) {
        flightCompleted.current = true;
        onFlightComplete();
      }
    }
    const marker = pointAtRouteDistance(
      route,
      routeDistanceList,
      revealedDistanceRef.current,
    );
    if (mode === "flight" && marker) {
      camera.up.set(0, 1, 0);
      camera.position.lerp(
        new Vector3(marker.x + 75, marker.y + 90, marker.z + 120),
        0.035,
      );
      camera.lookAt(marker);
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
      {visibleGradeLines.map((line, index) => (
        <RouteLine key={index} {...line} />
      ))}
      {route[0] && <RouteEndpointFlag position={route[0]} kind="start" />}
      {route.at(-1) && (
        <RouteEndpointFlag position={route.at(-1)!} kind="finish" />
      )}
      {mode === "flight" && marker && (
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
  const [mode, setMode] = useState<ViewMode>("overview");
  const [runId, setRunId] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
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
        <Pressable
          onPress={onClose}
          style={styles.close}
          accessibilityLabel="3D-Ansicht schliessen"
        >
          <Feather name="x" size={25} color="#fff" />
        </Pressable>
        {model && loadProgress === 100 && !error && (
          <View style={styles.controls}>
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
                  onPress={() => selectMode(value)}
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
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: "#E8E2D9",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  control: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  controlActive: { backgroundColor: "#DA291C" },
  controlText: { color: "#15231D", fontSize: 12, fontWeight: "700" },
  controlTextActive: { color: "#FFFFFF" },
});
