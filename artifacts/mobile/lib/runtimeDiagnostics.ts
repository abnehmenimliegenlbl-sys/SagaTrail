import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Platform } from "react-native";

/**
 * Non-sensitive identity of the JavaScript/native runtime currently executing.
 * This is deliberately limited to versions and update state; it never includes
 * a user ID, route, location, or auth material.
 */
export function getRuntimeDiagnostics() {
  return {
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    nativeApplicationVersion: Application.nativeApplicationVersion ?? null,
    nativeBuildVersion: Application.nativeBuildVersion ?? null,
    expoConfigVersion: Constants.expoConfig?.version ?? null,
    runtimeVersion: Updates.runtimeVersion ?? null,
    updateId: Updates.updateId ?? null,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    channel: Updates.channel ?? null,
    executionEnvironment: Constants.executionEnvironment ?? null,
    appOwnership: Constants.appOwnership ?? null,
  };
}