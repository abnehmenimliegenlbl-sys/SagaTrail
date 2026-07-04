import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

/**
 * Erlaubt es, die Wanderung (GPS-Fortschritt + Erzaehlung) auch dann
 * weiterlaufen zu lassen, wenn die App im Hintergrund ist oder das
 * Telefon gesperrt wird. TaskManager.defineTask MUSS auf Modulebene
 * (nicht in einer Komponente) registriert werden, damit iOS/Android die
 * App bei einem Hintergrund-Fix ueberhaupt wieder aufwecken koennen.
 */
export const BACKGROUND_LOCATION_TASK = "sagatrail-background-location";

type Listener = (lat: number, lng: number) => void;
const listeners = new Set<Listener>();

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const last = locations?.[locations.length - 1];
  if (!last) return;
  for (const listener of listeners) {
    listener(last.coords.latitude, last.coords.longitude);
  }
});

export function subscribeToBackgroundLocation(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Startet Standort-Updates, die auch im Hintergrund weiterlaufen
 * (Android: Foreground-Service mit Dauerbenachrichtigung; iOS: benoetigt
 * "Immer"-Standortfreigabe + UIBackgroundModes "location"). Faellt intern
 * automatisch auf reine Vordergrund-Updates zurueck, falls die
 * Hintergrundberechtigung fehlt oder die Laufzeitumgebung (z. B. Expo Go
 * auf iOS) Hintergrund-Tasks nicht unterstuetzt.
 */
export async function startBackgroundLocationTracking(
  options: Location.LocationOptions,
  notification: { title: string; body: string }
): Promise<boolean> {
  try {
    const already = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (already) return true;
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      ...options,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: notification.title,
        notificationBody: notification.body,
      },
      pausesUpdatesAutomatically: false,
    });
    return true;
  } catch {
    // Best effort — z. B. Expo Go auf iOS unterstuetzt keine echten
    // Hintergrund-Standort-Tasks. Die aufrufende Stelle faellt dann auf
    // watchPositionAsync (nur Vordergrund) zurueck.
    return false;
  }
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    const already = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (already) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch {
    // Best effort.
  }
}
