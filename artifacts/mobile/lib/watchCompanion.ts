import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

export interface WatchLiveSnapshot {
  direction: string;
  heading: number | null;
  remainingKm: number;
  heartRateBpm: number | null;
  hasFreshGps: boolean;
}

let permissionGranted: boolean | null = null;
let statusNotificationId: string | null = null;
let lastStatusSentAt = 0;

/**
 * Die Watch-Begleitung nutzt die native Notification-Spiegelung:
 * Apple Watch, Wear OS, Garmin und Samsung können die Hinweise ihres
 * gekoppelten Telefons am Handgelenk anzeigen. Eine separate Watch-App wird
 * damit nicht vorgetäuscht.
 */
export async function prepareWatchCompanion(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (permissionGranted != null) return permissionGranted;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      permissionGranted = true;
      return true;
    }
    if (!current.canAskAgain) {
      permissionGranted = false;
      return false;
    }
    const asked = await Notifications.requestPermissionsAsync();
    permissionGranted = asked.granted;
    return permissionGranted;
  } catch {
    permissionGranted = false;
    return false;
  }
}

export async function sendWatchStatus(
  snapshot: WatchLiveSnapshot,
  options?: { force?: boolean },
): Promise<boolean> {
  if (Platform.OS === "web" || !snapshot.hasFreshGps) return false;
  if (!(await prepareWatchCompanion())) return false;

  const now = Date.now();
  if (!options?.force && now - lastStatusSentAt < 45_000) return true;
  lastStatusSentAt = now;

  if (statusNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(statusNotificationId).catch(() => {});
  }

  const pulse = snapshot.heartRateBpm == null
    ? "Puls —"
    : `Puls ${Math.round(snapshot.heartRateBpm)} bpm`;
  try {
    statusNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `SagaTrail · ${snapshot.direction}`,
        body: `${snapshot.remainingKm.toFixed(1)} km übrig · ${pulse}`,
        sound: false,
        threadIdentifier: "sagatrail-watch-status",
        data: {
          kind: "watch-status",
          heading: snapshot.heading,
          remainingKm: snapshot.remainingKm,
          heartRateBpm: snapshot.heartRateBpm,
        },
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}

/** SOS-Hinweis mit aktueller Position an die gekoppelte Watch spiegeln. */
export async function sendWatchSos(position: { lat: number; lng: number } | null): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (!(await prepareWatchCompanion())) return false;
  const coordinates = position
    ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
    : "GPS-Position nicht verfügbar";
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "SagaTrail · SOS",
        body: `Notfallansicht geöffnet · ${coordinates}`,
        sound: "default",
        data: { kind: "watch-sos", coordinates },
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}

export async function clearWatchStatus(): Promise<void> {
  if (Platform.OS === "web" || !statusNotificationId) return;
  await Notifications.cancelScheduledNotificationAsync(statusNotificationId).catch(() => {});
  statusNotificationId = null;
  lastStatusSentAt = 0;
}