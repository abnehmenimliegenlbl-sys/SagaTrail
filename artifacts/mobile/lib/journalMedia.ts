import * as FileSystem from "expo-file-system/legacy";

/**
 * Kopiert ein Kamera-/Snapshot-Bild aus dem temporaeren Cache in den
 * Dokumentordner. Nur diese URI darf in einer HikeSession landen: Der
 * Kamera-Cache kann beim Schliessen der Erkennung oder durch das Betriebssystem
 * geloescht werden.
 */
export async function persistJournalImage(
  sourceUri: string,
  kind: "object" | "peak",
): Promise<string> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory || sourceUri.startsWith(documentDirectory)) {
    return sourceUri;
  }
  const safeKind = kind.replace(/[^a-z0-9-]/gi, "-");
  const destination = `${documentDirectory}sagatrail-journal-${safeKind}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}