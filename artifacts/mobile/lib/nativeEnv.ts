import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Zentrale Erkennung von Expo Go, da mehrere native Module (Sprach-
 * erkennung, Hintergrund-Standort/-Audio) beim blossen Import bereits
 * abstuerzen, wenn kein natives Modul verfuegbar ist. `Platform.OS` allein
 * reicht nicht, da Expo Go weiterhin "ios"/"android" meldet.
 */
export const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const NATIVE_MODULES_AVAILABLE = Platform.OS !== "web" && !IS_EXPO_GO;
