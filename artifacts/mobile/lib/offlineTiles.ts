import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import { LatLng } from "@/types";

/**
 * Offline-Kartenkacheln (Carto Voyager) fuer eine Wanderung.
 *
 * Es werden dieselben hellen Carto-Voyager-Basiskacheln (EPSG:3857,
 * Standard-XYZ, kein API-Schluessel) wie in der Live-Kartenansicht fuer
 * einen begrenzten Korridor rund um den Startpunkt in wenigen Zoomstufen
 * heruntergeladen und lokal via expo-file-system abgelegt. Der Umfang ist
 * bewusst eng begrenzt, damit der Speicherbedarf klein bleibt. Das
 * Wanderwege-Overlay (Waymarked Trails) wird bewusst NICHT offline
 * gesichert — es ist eine reine Zusatzebene, die offline einfach fehlt und
 * online nachlaedt, sobald wieder Empfang besteht.
 *
 * Web hat kein Dateisystem — dort sind alle Operationen bewusste No-Ops und die
 * Karte bleibt online.
 */

// Feste Subdomain fuer deterministische, cachebare Download-URLs (die
// Live-Karte rotiert 'abcd' fuer Parallelitaet, das ist hier nicht noetig).
const TILE_URL = (z: number, x: number, y: number) =>
  `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;

// Zoomstufen und jeweiliger Radius (in Kacheln) rund um den Startpunkt.
// Eng gehalten fuer einen kleinen, vorhersehbaren Speicherbedarf.
const LEVELS: { zoom: number; radius: number }[] = [
  { zoom: 13, radius: 1 },
  { zoom: 14, radius: 2 },
  { zoom: 15, radius: 3 },
];

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

/** Rechnet geografische Koordinaten in eine Slippy-Map-Kachel um. */
export function lngLatToTile(lat: number, lng: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

/** Liefert alle Kacheln des begrenzten Korridors rund um den Mittelpunkt. */
export function tilesForCorridor(center: LatLng): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (const { zoom, radius } of LEVELS) {
    const { x: cx, y: cy } = lngLatToTile(center.lat, center.lng, zoom);
    const max = 2 ** zoom;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= max || y >= max) continue;
        tiles.push({ z: zoom, x, y });
      }
    }
  }
  return tiles;
}

function tilesDir(sagaId: string): string {
  return `${FileSystem.documentDirectory}tiles/${sagaId}/`;
}

function tileFile(sagaId: string, t: TileCoord): string {
  return `${tilesDir(sagaId)}${t.z}_${t.x}_${t.y}.png`;
}

function tileKey(t: TileCoord): string {
  return `${t.z}/${t.x}/${t.y}`;
}

export interface TileDownloadResult {
  tileCount: number;
  sizeBytes: number;
}

/**
 * Laedt die Korridor-Kacheln herunter und legt sie lokal ab.
 * `onProgress(done, total)` meldet den Fortschritt. Web: No-Op.
 */
export async function downloadTiles(
  sagaId: string,
  center: LatLng,
  onProgress?: (done: number, total: number) => void
): Promise<TileDownloadResult> {
  if (Platform.OS === "web") return { tileCount: 0, sizeBytes: 0 };

  const tiles = tilesForCorridor(center);
  const dir = tilesDir(sagaId);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

  let done = 0;
  let sizeBytes = 0;
  let tileCount = 0;

  for (const t of tiles) {
    const dest = tileFile(sagaId, t);
    try {
      const existing = await FileSystem.getInfoAsync(dest);
      if (existing.exists) {
        sizeBytes += existing.size ?? 0;
        tileCount += 1;
      } else {
        const res = await FileSystem.downloadAsync(TILE_URL(t.z, t.x, t.y), dest);
        if (res.status === 200) {
          const info = await FileSystem.getInfoAsync(dest);
          sizeBytes += info.exists ? info.size ?? 0 : 0;
          tileCount += 1;
        }
      }
    } catch {
      // Einzelne fehlende Kachel ist unkritisch — online faellt sie spaeter zurueck.
    }
    done += 1;
    onProgress?.(done, tiles.length);
  }

  return { tileCount, sizeBytes };
}

/** Liest alle lokal vorhandenen Kacheln als Base64-Data-URIs (Schluessel `z/x/y`). */
export async function loadTilesBase64(sagaId: string): Promise<Record<string, string>> {
  if (Platform.OS === "web") return {};
  const dir = tilesDir(sagaId);
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return {};

  const files = await FileSystem.readDirectoryAsync(dir).catch(() => [] as string[]);
  const out: Record<string, string> = {};
  for (const name of files) {
    const match = name.match(/^(\d+)_(\d+)_(\d+)\.(png|jpeg)$/);
    if (!match) continue;
    const key = `${match[1]}/${match[2]}/${match[3]}`;
    const mime = match[4] === "jpeg" ? "image/jpeg" : "image/png";
    try {
      const b64 = await FileSystem.readAsStringAsync(`${dir}${name}`, {
        encoding: FileSystem.EncodingType.Base64,
      });
      out[key] = `data:${mime};base64,${b64}`;
    } catch {
      // defekte Kachel ueberspringen
    }
  }
  return out;
}

/** Loescht alle lokalen Kacheln einer Wanderung. Web: No-Op. */
export async function deleteTiles(sagaId: string): Promise<void> {
  if (Platform.OS === "web") return;
  await FileSystem.deleteAsync(tilesDir(sagaId), { idempotent: true }).catch(() => {});
}

/** Prueft, ob lokale Kacheln vorhanden sind. */
export async function hasTiles(sagaId: string): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const info = await FileSystem.getInfoAsync(tilesDir(sagaId));
  return info.exists;
}

export { tileKey };
