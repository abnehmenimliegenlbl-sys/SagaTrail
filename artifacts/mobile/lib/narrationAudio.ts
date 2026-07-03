/**
 * Wandelt einen von der Narration-API gelieferten MP3-Blob in eine
 * data:-URI um, die direkt an expo-av (Audio.Sound.createAsync) uebergeben
 * werden kann. Bewusst ohne expo-file-system: React Natives eingebaute
 * FileReader unterstuetzt readAsDataURL auch fuer Blobs aus fetch-Antworten.
 */
export function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("FileReader fehlgeschlagen"));
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unerwartetes FileReader-Ergebnis"));
      }
    };
    reader.readAsDataURL(blob);
  });
}
