import * as FileSystem from "expo-file-system/legacy";
import { getApiBaseUrl } from "./apiConfig";

export interface WaypointPhotoMeta {
  sagaId: string;
  routeId?: string;
  chapterIndex?: number;
  lat?: number;
  lng?: number;
  caption?: string;
}

export interface UploadedPhoto {
  id: string;
  objectPath: string;
  sagaId: string;
  chapterIndex?: number | null;
  createdAt: string;
}

/**
 * Laedt ein lokales Foto (Expo-URI) direkt an den API-Server hoch.
 * Der Server schreibt es via GCS SDK nach GCS (kein Presigned-URL-Umweg)
 * und speichert die Metadaten in der DB.
 *
 * Ablauf:
 * POST /api/waypoint-photos/upload?sagaId=…&chapterIndex=…&lat=…&lng=…
 *   Body: raw JPEG (Binary)
 *   Header: Content-Type: image/jpeg, Authorization: Bearer <token>
 * Antwort: { id, objectPath, sagaId, chapterIndex, createdAt, … }
 */
export async function uploadWaypointPhoto(
  localUri: string,
  meta: WaypointPhotoMeta,
  getToken: () => Promise<string | null>
): Promise<UploadedPhoto> {
  const base = getApiBaseUrl() ?? "";
  const token = await getToken();

  const params = new URLSearchParams({ sagaId: meta.sagaId });
  if (meta.routeId) params.set("routeId", meta.routeId);
  if (meta.chapterIndex !== undefined) params.set("chapterIndex", String(meta.chapterIndex));
  if (meta.lat !== undefined) params.set("lat", String(meta.lat));
  if (meta.lng !== undefined) params.set("lng", String(meta.lng));
  if (meta.caption) params.set("caption", meta.caption);

  const url = `${base}/api/waypoint-photos/upload?${params.toString()}`;
  const headers: Record<string, string> = { "Content-Type": "image/jpeg" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const result = await FileSystem.uploadAsync(url, localUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers,
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload fehlgeschlagen: ${result.status} — ${result.body}`);
  }
  // Der Server hat den Upload akzeptiert (2xx). Auf manchen Geraeten/Proxys
  // liefert FileSystem.uploadAsync einen leeren oder unvollstaendigen Response-
  // Body zurueck, obwohl der Server korrekt geantwortet hat. JSON.parse wuerde
  // dann einen SyntaxError werfen, der als Upload-Fehler erschiene — obwohl das
  // Foto bereits sicher in GCS gespeichert ist. Daher: graceful fallback.
  try {
    return JSON.parse(result.body) as UploadedPhoto;
  } catch {
    return { id: "", objectPath: "", sagaId: meta.sagaId, chapterIndex: undefined, createdAt: new Date().toISOString() };
  }
}

/** Holt Community-Fotos fuer eine Sage vom Server. */
export async function fetchWaypointPhotos(
  sagaId: string
): Promise<UploadedPhoto[]> {
  const base = getApiBaseUrl() ?? "";
  const res = await fetch(`${base}/api/waypoint-photos?sagaId=${encodeURIComponent(sagaId)}`);
  if (!res.ok) return [];
  return res.json();
}

/** Baut die Serve-URL fuer einen objectPath. */
export function waypointPhotoUrl(objectPath: string): string {
  const base = getApiBaseUrl() ?? "";
  return `${base}/api/storage${objectPath}`;
}
