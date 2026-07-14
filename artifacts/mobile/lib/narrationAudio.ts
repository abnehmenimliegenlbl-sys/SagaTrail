import * as FileSystem from "expo-file-system/legacy";

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
  const base64 = await new Promise<string>((resolve, reject) => {
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

  const uri = (FileSystem.cacheDirectory ?? "") + "narration_current.mp3";
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

/** @deprecated Nutze blobToTempFileUri — data:-URIs werden von expo-av auf iOS nicht unterstuetzt. */
export function blobToDataUri(blob: Blob): Promise<string> {
  return blobToTempFileUri(blob);
}
