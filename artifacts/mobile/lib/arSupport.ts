import { Platform } from "react-native";

/**
 * iOS 26 can abort inside ARKit while ViroKit configures the camera photo
 * output. The exception is native and cannot be caught by JavaScript, so the
 * Viro surface must not be mounted on affected OS versions.
 */
export function isViroIos26CrashGuardActive(): boolean {
  if (Platform.OS !== "ios") return false;
  const majorVersion = Number.parseInt(String(Platform.Version), 10);
  return Number.isFinite(majorVersion) && majorVersion >= 26;
}