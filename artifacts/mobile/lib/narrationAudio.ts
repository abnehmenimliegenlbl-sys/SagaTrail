import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

/**
 * Offline-Audio-Speicher fuer Kapitel-Narration.
 *
 * Heruntergeladene Kapitel-MP3s werden dauerhaft pro Saga im Dateisystem
 * abgelegt (documentDirectory/narration/{sagaId}/ch_{index}.mp3).
 * Im Hike-Screen werden sie bevorzugt vor einem Netzwerk-Request geladen.
 *
 * Das temporaere narration_current.mp3 (cacheDirectory) wird weiterhin fuer
 * on-demand TTS-Antworten genutzt, die nicht vorab heruntergeladen wurden.
 *
 * Web: Alle Offline-Operationen sind No-Ops.
 */

const narrationDir = (sagaId: string) =>
  `${FileSystem.documentDirectory ?? ""}narration/${sagaId}/`;

const chapterFile = (sagaId: string, index: number) =>
  `${narrationDir(sagaId)}ch_${index}.mp3`;

/** Liest einen Blob als Base64-String (ohne data:-Prefix). */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("FileReader fehlgeschlagen"));
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const comma = reader.result.indexOf(",");
        resolve(comma >= 0 ? reader.result.slice(comma + 1) : reader.result);
      } else {
        reject(new Error("Unerwartetes FileReader-Ergebnis"));
      }
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Schreibt einen von der Narration-API gelieferten MP3-Blob in eine
 * temporaere Datei und gibt die file://-URI zurueck.
 *
 * Hintergrund: expo-av (AVPlayer) auf iOS unterstuetzt keine data:-URIs
 * fuer Audio. Der Blob muss zuerst auf den Geraetespeicher geschrieben
 * werden, bevor er abgespielt werden kann.
 *
 * Es wird immer dieselbe Datei (narration_current.mp3) ueberschrieben,
 * damit sich keine temporaeren Audiodateien anhaeufen.
 */
export async function blobToTempFileUri(blob: Blob): Promise<string> {
  const base64 = await blobToBase64(blob);
  const uri = (FileSystem.cacheDirectory ?? "") + "narration_current.mp3";
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

/**
 * Speichert einen Narrations-MP3-Blob dauerhaft als Offline-Kapitel-Audio.
 * Bereits vorhandene Dateien werden ueberschrieben (frischer Download).
 * Web: No-Op.
 */
export async function downloadChapterAudio(
  sagaId: string,
  chapterIndex: number,
  blob: Blob
): Promise<void> {
  if (Platform.OS === "web") return;
  const dir = narrationDir(sagaId);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
  const base64 = await blobToBase64(blob);
  await FileSystem.writeAsStringAsync(chapterFile(sagaId, chapterIndex), base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Gibt die file://-URI des offline gespeicherten Kapitel-Audios zurueck,
 * oder null falls nicht vorhanden. Web: immer null.
 */
export async function getOfflineAudioUri(
  sagaId: string,
  chapterIndex: number
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const info = await FileSystem.getInfoAsync(chapterFile(sagaId, chapterIndex));
    return info.exists ? chapterFile(sagaId, chapterIndex) : null;
  } catch {
    return null;
  }
}

/**
 * Loescht alle lokal gespeicherten Kapitel-Audio-Dateien einer Saga.
 * Web: No-Op.
 */
export async function deleteNarrationAudio(sagaId: string): Promise<void> {
  if (Platform.OS === "web") return;
  await FileSystem.deleteAsync(narrationDir(sagaId), { idempotent: true }).catch(() => {});
}

/** @deprecated Nutze blobToTempFileUri — data:-URIs werden von expo-av auf iOS nicht unterstuetzt. */
export function blobToDataUri(blob: Blob): Promise<string> {
  return blobToTempFileUri(blob);
}
