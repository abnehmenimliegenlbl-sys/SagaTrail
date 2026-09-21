import * as FileSystem from "expo-file-system/legacy";
import { getApiBaseUrl } from "./apiConfig";

export interface MeetupPhoto {
  id: string;
  uploaderId: string;
  uploaderName: string;
  url: string;
  selected: boolean;
  createdAt: string;
  isOwn: boolean;
}

export interface MeetupPhotoList {
  consentVersion: string;
  isOrganizer: boolean;
  allowNameMention: boolean;
  photos: MeetupPhoto[];
}

async function authHeaders(getToken: () => Promise<string | null>): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function jsonRequest<T>(
  path: string,
  getToken: () => Promise<string | null>,
  init: RequestInit = {},
): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeaders(getToken)),
    ...(init.headers ?? {}),
  };
  const response = await fetch(`${getApiBaseUrl() ?? ""}${path}`, { ...init, headers });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Anfrage fehlgeschlagen");
  return response.json() as Promise<T>;
}

export function fetchMeetupPhotos(meetupId: string, getToken: () => Promise<string | null>) {
  return jsonRequest<MeetupPhotoList>(`/api/meetups/${encodeURIComponent(meetupId)}/photos`, getToken);
}

export function saveMeetupNameConsent(
  meetupId: string,
  allowNameMention: boolean,
  getToken: () => Promise<string | null>,
) {
  return jsonRequest<{ ok: true; allowNameMention: boolean }>(
    `/api/meetups/${encodeURIComponent(meetupId)}/photo-consent`,
    getToken,
    {
      method: "PATCH",
      body: JSON.stringify({ allowNameMention, consentVersion: "2026-09-21" }),
    },
  );
}

export async function uploadMeetupPhoto(
  meetupId: string,
  localUri: string,
  getToken: () => Promise<string | null>,
  mimeType = "image/jpeg",
): Promise<{ id: string }> {
  const base = getApiBaseUrl() ?? "";
  const token = await getToken();
  const contentType = ["image/jpeg", "image/png", "image/webp"].includes(mimeType)
    ? mimeType
    : "image/jpeg";
  const query = new URLSearchParams({
    consentVersion: "2026-09-21",
    rightsConsent: "1",
    depictedPeopleConsent: "1",
  });
  const result = await FileSystem.uploadAsync(
    `${base}/api/meetups/${encodeURIComponent(meetupId)}/photos/upload?${query.toString()}`,
    localUri,
    {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        "Content-Type": contentType,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (result.status < 200 || result.status >= 300) {
    let message = "Foto-Upload fehlgeschlagen";
    try { message = (JSON.parse(result.body) as { error?: string }).error ?? message; } catch {}
    throw new Error(message);
  }
  return JSON.parse(result.body || "{}") as { id: string };
}

export function deleteMeetupPhoto(
  meetupId: string,
  photoId: string,
  getToken: () => Promise<string | null>,
) {
  return jsonRequest<{ ok: true }>(
    `/api/meetups/${encodeURIComponent(meetupId)}/photos/${encodeURIComponent(photoId)}`,
    getToken,
    { method: "DELETE" },
  );
}

export function prepareMeetupShare(
  meetupId: string,
  selectedPhotoIds: string[],
  caption: string,
  getToken: () => Promise<string | null>,
) {
  return jsonRequest<{
    caption: string;
    routeName: string;
    startsAt: string | null;
    participantNames: string[];
    photos: Array<{ id: string; url: string }>;
  }>(
    `/api/meetups/${encodeURIComponent(meetupId)}/photos/share`,
    getToken,
    {
      method: "POST",
      body: JSON.stringify({ selectedPhotoIds, caption }),
    },
  );
}