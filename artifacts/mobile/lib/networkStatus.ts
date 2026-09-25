import { AppState, Platform } from "react-native";

import { getApiBaseUrl } from "./apiConfig";

export type NetworkStatusListener = (online: boolean) => void;

const PROBE_INTERVAL_MS = 15_000;
const PROBE_TIMEOUT_MS = 4_000;

/**
 * Browser online/offline events are not emitted by React Native on iOS/Android.
 * A small HEAD probe gives native screens a real reachability signal without
 * pulling catalog data or retrying feature requests.
 */
async function probeReachability(): Promise<boolean> {
  const base = getApiBaseUrl();
  if (!base) return true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}/api/healthz`, {
      method: "HEAD",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function subscribeToNetworkStatus(
  listener: NetworkStatusListener,
): () => void {
  let disposed = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const publishProbe = async () => {
    const online = await probeReachability();
    if (!disposed) listener(online);
  };

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const goOnline = () => listener(true);
    const goOffline = () => listener(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    listener(window.navigator?.onLine !== false);
    return () => {
      disposed = true;
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }

  void publishProbe();
  const appState = AppState.addEventListener("change", (state) => {
    if (state === "active") void publishProbe();
  });
  timer = setInterval(() => {
    if (AppState.currentState === "active") void publishProbe();
  }, PROBE_INTERVAL_MS);

  return () => {
    disposed = true;
    appState.remove();
    if (timer) clearInterval(timer);
  };
}