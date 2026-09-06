import { DeviceEventEmitter, NativeModules, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  isMeaningfulWatchStatusUpdate,
  type WatchStatusGateSnapshot,
} from "./watchStatusGate";

/** Wire format shared with the optional SagaTrailCompanion native module. */
export const HIKE_LIVE_STATE_VERSION = 1 as const;
export const LIVE_SNAPSHOT_MIN_INTERVAL_MS = 7_500;

export type DataFreshness = "fresh" | "stale" | "unavailable";
export type HikeSessionStatus = "preparing" | "active" | "paused" | "finished" | "sos_requested";
export type HeartRateSource = "watch" | "phone";

export interface HikeLiveState {
  version: typeof HIKE_LIVE_STATE_VERSION;
  sequence: number;
  timestamp: number;
  gpsFreshness: DataFreshness;
  nextNavigation: {
    direction: "left" | "right";
    bearingDeg: number | null;
    distanceM: number | null;
  } | null;
  elapsedSec: number | null;
  walkedDistanceM: number | null;
  /** Null when an actual climbed-height measurement is not available. */
  ascentM: number | null;
  steps: number | null;
  heartRate: {
    bpm: number;
    measuredAt: number;
    freshness: DataFreshness;
    source: HeartRateSource;
  } | null;
  activeAlert: {
    kind: "safety" | "narration" | "sos";
    text: string;
    critical: boolean;
  } | null;
  sessionStatus: HikeSessionStatus;
}

export interface WatchLiveSnapshot {
  direction: string;
  heading: number | null;
  remainingKm: number;
  hasFreshGps: boolean;
  position: { lat: number; lng: number } | null;
}

type CompanionModule = {
  publishLiveState?: (state: HikeLiveState) => void | Promise<void>;
};

type HeartRateEvent = { bpm?: unknown; measuredAt?: unknown; source?: unknown };
type SosRequestEvent = { requestedAt?: unknown };

let permissionGranted: boolean | null = null;
let statusNotificationId: string | null = null;
let lastStatusSentAt = 0;
let lastLiveStateSentAt = 0;
let lastStatusSnapshot: WatchStatusGateSnapshot | null = null;

function companionModule(): CompanionModule | null {
  if (Platform.OS === "web") return null;
  const module = NativeModules.SagaTrailCompanion as CompanionModule | undefined;
  return module?.publishLiveState ? module : null;
}

export function hasNativeWatchCompanion(): boolean {
  return companionModule() !== null;
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Reject malformed states before they cross the JS/native boundary. */
export function isValidHikeLiveState(value: unknown): value is HikeLiveState {
  const state = value as Partial<HikeLiveState> | null;
  if (!state || state.version !== HIKE_LIVE_STATE_VERSION) return false;
  if (typeof state.sequence !== "number" || !Number.isInteger(state.sequence) || state.sequence < 0 || !Number.isFinite(state.timestamp)) return false;
  if (!("nextNavigation" in state) || !("heartRate" in state) || !("activeAlert" in state)) return false;
  if (!["fresh", "stale", "unavailable"].includes(state.gpsFreshness as string)) return false;
  if (!["preparing", "active", "paused", "finished", "sos_requested"].includes(state.sessionStatus as string)) return false;
  for (const numericValue of [state.elapsedSec, state.walkedDistanceM, state.ascentM, state.steps]) {
    if (typeof numericValue !== "number" && numericValue !== null) return false;
    if (numericValue !== null && (!Number.isFinite(numericValue) || numericValue < 0)) return false;
  }
  if (state.nextNavigation && (
    !["left", "right"].includes(state.nextNavigation.direction) ||
    (state.nextNavigation.bearingDeg !== null && !Number.isFinite(state.nextNavigation.bearingDeg)) ||
    (state.nextNavigation.distanceM !== null && (state.nextNavigation.distanceM < 0 || !Number.isFinite(state.nextNavigation.distanceM)))
  )) return false;
  if (state.heartRate && (
    !Number.isFinite(state.heartRate.bpm) || state.heartRate.bpm <= 0 ||
    !Number.isFinite(state.heartRate.measuredAt) ||
    !["fresh", "stale", "unavailable"].includes(state.heartRate.freshness) ||
    !["watch", "phone"].includes(state.heartRate.source)
  )) return false;
  return true;
}

export function serializeHikeLiveState(state: HikeLiveState): string | null {
  return isValidHikeLiveState(state) ? JSON.stringify(state) : null;
}

/** Publishes to a real companion when installed; notification mirroring remains the fallback. */
export async function publishHikeLiveState(
  state: HikeLiveState,
  options?: { force?: boolean; now?: number },
): Promise<boolean> {
  if (!isValidHikeLiveState(state)) return false;
  const now = options?.now ?? Date.now();
  if (!options?.force && now - lastLiveStateSentAt < LIVE_SNAPSHOT_MIN_INTERVAL_MS) return false;
  lastLiveStateSentAt = now;
  const module = companionModule();
  if (!module) return false;
  try {
    await module.publishLiveState!(state);
    return true;
  } catch {
    return false;
  }
}

export function subscribeToCompanionEvents(handlers: {
  onHeartRate: (event: { bpm: number; measuredAt: number; source: HeartRateSource }) => void;
  onSosRequest: (event: { requestedAt: number }) => void;
}): () => void {
  if (Platform.OS === "web" || !companionModule()) return () => {};
  const heartRate = DeviceEventEmitter.addListener("SagaTrailCompanion.heartRate", (event: HeartRateEvent) => {
    const bpm = finiteOrNull(event?.bpm);
    const measuredAt = finiteOrNull(event?.measuredAt) ?? Date.now();
    if (bpm !== null && bpm > 0) handlers.onHeartRate({ bpm, measuredAt, source: event?.source === "phone" ? "phone" : "watch" });
  });
  const sos = DeviceEventEmitter.addListener("SagaTrailCompanion.sosRequest", (event: SosRequestEvent) => {
    handlers.onSosRequest({ requestedAt: finiteOrNull(event?.requestedAt) ?? Date.now() });
  });
  return () => { heartRate.remove(); sos.remove(); };
}

export async function prepareWatchCompanion(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  if (permissionGranted != null) return permissionGranted;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return (permissionGranted = true);
    if (!current.canAskAgain) return (permissionGranted = false);
    return (permissionGranted = (await Notifications.requestPermissionsAsync()).granted);
  } catch {
    return (permissionGranted = false);
  }
}

/** Notification mirror for companions without the optional native protocol module. */
export async function sendWatchStatus(snapshot: WatchLiveSnapshot, options?: { force?: boolean }): Promise<boolean> {
  // A real companion receives the private live-state channel. Scheduling a
  // phone notification as well would visibly notify the user every cycle.
  if (
    Platform.OS === "web" ||
    hasNativeWatchCompanion() ||
    !snapshot.hasFreshGps
  ) return false;
  const now = Date.now();
  if (
    !options?.force &&
    (!isMeaningfulWatchStatusUpdate(lastStatusSnapshot, snapshot) ||
      now - lastStatusSentAt < 45_000)
  ) return true;
  if (!(await prepareWatchCompanion())) return false;
  lastStatusSentAt = now;
  if (statusNotificationId) await Notifications.cancelScheduledNotificationAsync(statusNotificationId).catch(() => {});
  try {
    statusNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `SagaTrail · ${snapshot.direction}`,
        body: `${snapshot.remainingKm.toFixed(1)} km übrig`,
        sound: false,
        data: { kind: "watch-status", heading: snapshot.heading, remainingKm: snapshot.remainingKm },
      }, trigger: null,
    });
    lastStatusSnapshot = {
      direction: snapshot.direction,
      remainingKm: snapshot.remainingKm,
      position: snapshot.position,
    };
    return true;
  } catch { return false; }
}

/** SOS mirrors an instruction only; coordinates never enter notification body or data. */
export async function sendWatchSos(_position: { lat: number; lng: number } | null): Promise<boolean> {
  if (Platform.OS === "web" || !(await prepareWatchCompanion())) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: "SagaTrail · SOS", body: "Notfallansicht auf dem Telefon geöffnet", sound: "default", data: { kind: "watch-sos" } },
      trigger: null,
    });
    return true;
  } catch { return false; }
}

export async function clearWatchStatus(): Promise<void> {
  if (Platform.OS !== "web" && statusNotificationId) await Notifications.cancelScheduledNotificationAsync(statusNotificationId).catch(() => {});
  statusNotificationId = null;
  lastStatusSentAt = 0;
  lastLiveStateSentAt = 0;
  lastStatusSnapshot = null;
}