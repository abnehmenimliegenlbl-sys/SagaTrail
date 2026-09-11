import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Pedometer } from "expo-sensors";
import { Platform } from "react-native";

import { makeLogger } from "@/lib/debugLog";
import { NATIVE_MODULES_AVAILABLE } from "@/lib/nativeEnv";
import { getRuntimeDiagnostics } from "@/lib/runtimeDiagnostics";
import { readSpeechPermissionWithRetry } from "@/lib/speechPermission";

const CONFIRMED_KEY = "__st_required_permissions_confirmed_v1__";
const permissionGateLog = makeLogger("[PERMISSION-GATE]", "permission_gate");

export type RequiredPermissionKey =
  | "location"
  | "microphone"
  | "motion"
  | "notifications";

export type RequiredPermissionStatuses = Record<RequiredPermissionKey, boolean>;

export interface RequiredPermissionSnapshot {
  statuses: RequiredPermissionStatuses;
  allGranted: boolean;
  previouslyConfirmed: boolean;
}

const EMPTY_STATUSES: RequiredPermissionStatuses = {
  location: false,
  microphone: false,
  motion: false,
  notifications: false,
};

export async function readRequiredPermissionSnapshot(
  reason: string,
): Promise<RequiredPermissionSnapshot> {
  if (Platform.OS === "web") {
    return {
      statuses: {
        location: true,
        microphone: true,
        motion: true,
        notifications: true,
      },
      allGranted: true,
      previouslyConfirmed: true,
    };
  }

  const previousEvidence = await AsyncStorage.getItem(CONFIRMED_KEY).catch(() => null);
  const [location, microphone, motion, notifications] = await Promise.all([
    Location.getForegroundPermissionsAsync()
      .then((permission) => permission.granted)
      .catch(() => false),
    NATIVE_MODULES_AVAILABLE
      ? readSpeechPermissionWithRetry(async () =>
          (await import("expo-speech-recognition")).ExpoSpeechRecognitionModule.getPermissionsAsync()
        )
          .then((status) => status === "granted")
          .catch(() => false)
      : Promise.resolve(false),
    Pedometer.getPermissionsAsync()
      .then((permission) => permission.granted)
      .catch(() => false),
    Notifications.getPermissionsAsync()
      .then((permission) => permission.granted)
      .catch(() => false),
  ]);

  const statuses = { location, microphone, motion, notifications };
  const allGranted = Object.values(statuses).every(Boolean);
  const previouslyConfirmed = previousEvidence !== null;
  const runtime = getRuntimeDiagnostics();

  permissionGateLog("required permissions checked", {
    ...runtime,
    reason,
    statuses,
    allGranted,
    previouslyConfirmed,
    lostAfterPreviousConfirmation: previouslyConfirmed && !allGranted,
  });

  if (allGranted) {
    await AsyncStorage.setItem(
      CONFIRMED_KEY,
      JSON.stringify({
        confirmedAt: Date.now(),
        runtime,
        statuses,
      }),
    ).catch(() => {});
  }

  return {
    statuses: { ...EMPTY_STATUSES, ...statuses },
    allGranted,
    previouslyConfirmed,
  };
}