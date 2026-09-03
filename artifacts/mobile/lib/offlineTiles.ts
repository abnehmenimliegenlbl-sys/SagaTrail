import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

import { LatLng } from "@/types";

/**
 * Offline-Kartenkacheln (amtliche swisstopo-Pixelkarte) fuer eine Wanderung.
 *
 * Es werden dieselben amtlichen swisstopo-Pixelkarten-Kacheln (EPSG:3857,
 * Standard-XYZ, kein API-Schluessel) wie in der Live-Kartenansicht
 * heruntergeladen und lokal via expo-file-system abgelegt.
 *
 * Zwei Download-Modi:
 * - downloadTiles(sagaId, center): klassischer Startpunkt-Korridor (einzelner
 *   Mittelpunkt, fester Radius).
 * - downloadTilesAlongRoute(sagaId, points): deckelt die gesamte Route ab —
 *   nimmt Abtastpunkte entlang der Geometrie, berechnet die Kacheln fuer jeden
 *   Punkt und dedupliziert per Set. Geeignet, wenn die Route-Geometrie
 *   verfuegbar ist.
 *
 * Das Waymarked-Trails-Overlay wird bewusst NICHT offline gesichert — es ist
 * eine reine Zusatzebene, die online nachlaedt sobald Empfang besteht.
 *
 * Web hat kein Dateisystem — dort sind alle Operationen bewusste No-Ops.
 */

// Feste Subdomain fuer deterministische, cachebare Download-URLs.
const TILE_URL = (z: number, x: number, y: number) =>
  `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/${z}/${x}/${y}.jpeg`;

// Zoomstufen und jeweiliger Radius (in Kacheln) fuer den Startpunkt-Korridor.
const LEVELS: { zoom: number; radius: number }[] = [
  { zoom: 13, radius: 1 },
  { zoom: 14, radius: 2 },
  { zoom: 15, radius: 3 },
];

// Fuer den Routen-Korridor: kleiner Radius (1) damit Tile-Zahl beherrschbar bleibt;
// die Streckenabdeckung kommt durch viele Abtastpunkte, nicht durch grossen Radius.
const ROUTE_LEVELS: { zoom: number; radius: number }[] = [
  { zoom: 13, radius: 1 },
  { zoom: 14, radius: 1 },
  { zoom: 15, radius: 1 },
];

// Maximale Abtastpunkte pro Zoomstufe, damit bei langen Routen (>200 Punkte)
// die Tile-Anzahl nicht explodiert. 80 Punkte × (3+3+3) Tiles/Punkt = ~720 max.
const MAX_SAMPLES_PER_ZOOM = 80;

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

/** Liefert alle Kacheln des begrenzten Korridors rund um einen Mittelpunkt. */
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

/**
 * Liefert alle Kacheln entlang einer Route (Geometrie als LatLng-Array).
 * Abtastpunkte werden pro Zoomstufe auf MAX_SAMPLES_PER_ZOOM begrenzt;
 * Duplikate werden per Set-Key dedupliziert.
 */
export function tilesForRoute(points: LatLng[]): TileCoord[] {
  if (points.length === 0) return [];
  const seen = new Set<string>();
  const tiles: TileCoord[] = [];

  for (const { zoom, radius } of ROUTE_LEVELS) {
    // Gleichmaessige Abtastung der Geometrie-Punkte
    const step = Math.max(1, Math.ceil(points.length / MAX_SAMPLES_PER_ZOOM));
    const max = 2 ** zoom;

    for (let i = 0; i < points.length; i += step) {
      const pt = points[i];
      const { x: cx, y: cy } = lngLatToTile(pt.lat, pt.lng, zoom);
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= max || y >= max) continue;
          const key = `${zoom}/${x}/${y}`;
          if (!seen.has(key)) {
            seen.add(key);
            tiles.push({ z: zoom, x, y });
          }
        }
      }
    }
    // Letzten Punkt immer aufnehmen (Ziel der Route)
    const last = points[points.length - 1];
    const { x: cx, y: cy } = lngLatToTile(last.lat, last.lng, zoom);
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= max || y >= max) continue;
        const key = `${zoom}/${x}/${y}`;
        if (!seen.has(key)) {
          seen.add(key);
          tiles.push({ z: zoom, x, y });
        }
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
  totalCount: number;
  failedCount: number;
  complete: boolean;
}

/** Laedt eine Liste von Kacheln herunter und legt sie lokal ab. Interne Hilfsfunktion. */
async function downloadTileList(
  sagaId: string,
  tiles: TileCoord[],
  onProgress?: (done: number, total: number) => void
): Promise<TileDownloadResult> {
  const dir = tilesDir(sagaId);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

  let done = 0;
  let sizeBytes = 0;
  let tileCount = 0;
  let failedCount = 0;

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
      if (!(await FileSystem.getInfoAsync(dest)).exists) failedCount += 1;
    } catch {
      failedCount += 1;
      // Einzelne fehlende Kachel ist unkritisch — online faellt sie spaeter zurueck.
    }
    done += 1;
    onProgress?.(done, tiles.length);
  }

  return {
    tileCount,
    sizeBytes,
    totalCount: tiles.length,
    failedCount,
    complete: failedCount === 0,
  };
}

/**
 * Laedt die Korridor-Kacheln rund um einen Startpunkt herunter.
 * Fuer die volle Routenabdeckung: downloadTilesAlongRoute verwenden.
 * Web: No-Op.
 */
export async function downloadTiles(
  sagaId: string,
  center: LatLng,
  onProgress?: (done: number, total: number) => void
): Promise<TileDownloadResult> {
  if (Platform.OS === "web") return { tileCount: 0, sizeBytes: 0, totalCount: 0, failedCount: 0, complete: true };
  return downloadTileList(sagaId, tilesForCorridor(center), onProgress);
}

/**
 * Laedt Kacheln entlang der gesamten Routen-Geometrie herunter.
 * Deckelt die komplette Strecke ab (nicht nur den Startpunkt).
 * Web: No-Op.
 */
export async function downloadTilesAlongRoute(
  sagaId: string,
  points: LatLng[],
  onProgress?: (done: number, total: number) => void
): Promise<TileDownloadResult> {
  if (Platform.OS === "web") return { tileCount: 0, sizeBytes: 0, totalCount: 0, failedCount: 0, complete: true };
  if (points.length === 0) return { tileCount: 0, sizeBytes: 0, totalCount: 0, failedCount: 0, complete: true };
  return downloadTileList(sagaId, tilesForRoute(points), onProgress);
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
