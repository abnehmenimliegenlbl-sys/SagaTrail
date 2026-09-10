import { DeviceEventEmitter, NativeModules, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  isMeaningfulWatchStatusUpdate,
  type WatchStatusGateSnapshot,
} from "./watchStatusGate";
import { makeLogger } from "./debugLog";

const watchCompanionLog = makeLogger("[WATCH-COMPANION]", "watch_companion");

/** Wire format shared with the optional SagaTrailCompanion native module. */
export const HIKE_LIVE_STATE_VERSION = 1 as const;
export const LIVE_SNAPSHOT_MIN_INTERVAL_MS = 7_500;

export type DataFreshness = "fresh" | "stale" | "unavailable";
export type HikeSessionStatus = "preparing" | "active" | "paused" | "finished" | "sos_requested";
export type SosAcknowledgement = "none" | "acknowledged" | "failed";
export type HeartRateSource = "watch" | "garmin" | "phone";
export type SafetyCheckinStatus = "idle" | "active" | "overdue";

export interface WatchNavigation {
  direction: "left" | "right";
  bearingDeg: number | null;
  distanceM: number | null;
}

export interface WatchTerrainSection {
  direction: "up" | "down";
  gradePct: number;
  remainingM: number;
  startsInM: number;
}

export interface WatchSafetyCheckin {
  status: SafetyCheckinStatus;
  remainingSec: number;
  liveLinkActive: boolean;
}

export interface WatchMapPoint {
  lat: number;
  lng: number;
}

export interface WatchMapState {
  route: WatchMapPoint[];
  current: WatchMapPoint | null;
  gpsFresh: boolean;
}

export interface WatchOffRoute {
  distanceM: number;
  bearingToRouteDeg: number | null;
}

export interface WatchWeather {
  temperatureC: number;
  weatherCode: number;
  windKmh: number;
  windGustsKmh: number;
  precipitationMm: number;
  isThunderstorm: boolean;
}

export interface WatchDaylight {
  sunsetAtEpochMs: number;
  arrivalAfterSunset: boolean;
}

export interface WatchPoiStory {
  id: string;
  name: string;
  imageUrl: string | null;
  text: string;
}

export interface HikeLiveState {
  version: typeof HIKE_LIVE_STATE_VERSION;
  sequence: number;
  timestamp: number;
  gpsFreshness: DataFreshness;
  nextNavigation: WatchNavigation | null;
  upcomingNavigations?: WatchNavigation[];
  plannedAscentM?: number | null;
  remainingAscentM?: number | null;
  terrainSection?: WatchTerrainSection | null;
  safetyCheckin?: WatchSafetyCheckin | null;
  map?: WatchMapState | null;
  offRoute?: WatchOffRoute | null;
  weather?: WatchWeather | null;
  daylight?: WatchDaylight | null;
  poiStory?: WatchPoiStory | null;
  language?: string;
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
    kind: "safety" | "narration" | "sos" | "discovery";
    text: string;
    critical: boolean;
    haptic?: "click" | "notification" | "success";
  } | null;
  /** True only while narration audio is actually playing on the phone. */
  audioPlaying: boolean;
  remainingDistanceM?: number | null;
  remainingSeconds?: number | null;
  arrivalAtEpochMs?: number | null;
  /** Set only after the phone has handled a companion SOS request. */
  sosAcknowledgement?: SosAcknowledgement;
  /** Explicitly mirrors the phone's active hiking state for older watch UIs. */
  isHiking: boolean;
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
  activate?: () => void;
  selectGarminDevice?: () => void;
  publishLiveState?: (state: HikeLiveState) => void | Promise<void>;
};

type HeartRateEvent = { bpm?: unknown; measuredAt?: unknown; source?: unknown };
type SosRequestEvent = { requestedAt?: unknown };
type HikeCommandEvent = { command?: unknown; durationMinutes?: unknown };

let permissionGranted: boolean | null = null;
let nativeCompanionActivated = false;
let statusNotificationId: string | null = null;
let lastStatusSentAt = 0;
let lastLiveStateSentAt = 0;
let lastStatusSnapshot: WatchStatusGateSnapshot | null = null;

function companionModule(): CompanionModule | null {
  if (Platform.OS === "web") return null;
  const module = NativeModules.SagaTrailCompanion as CompanionModule | undefined;
  return module?.publishLiveState ? module : null;
}

function activateNativeCompanion(module: CompanionModule): void {
  if (nativeCompanionActivated) return;
  try {
    // The iPhone half owns its WCSession too. Without this call the first
    // application-context update can happen before the phone session is
    // activated, leaving the watch on its initial "waiting for iPhone" view.
    module.activate?.();
    nativeCompanionActivated = true;
  } catch {
    // Native activation must never interrupt the hike.
  }
}

export function hasNativeWatchCompanion(): boolean {
  return companionModule() !== null;
}

/** Opens Garmin Connect Mobile's device-selection flow where the platform supports it. */
export function selectGarminDevice(): boolean {
  if (!canSelectGarminDevice()) return false;
  const module = NativeModules.SagaTrailCompanion as CompanionModule | undefined;
  try {
    module!.selectGarminDevice!();
    return true;
  } catch {
    return false;
  }
}

export function canSelectGarminDevice(): boolean {
  if (Platform.OS === "web") return false;
  const module = NativeModules.SagaTrailCompanion as CompanionModule | undefined;
  return typeof module?.selectGarminDevice === "function";
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
  if (typeof state.isHiking !== "boolean") return false;
  if (typeof state.audioPlaying !== "boolean") return false;
  for (const numericValue of [state.elapsedSec, state.walkedDistanceM, state.ascentM, state.steps]) {
    if (typeof numericValue !== "number" && numericValue !== null) return false;
    if (numericValue !== null && (!Number.isFinite(numericValue) || numericValue < 0)) return false;
  }
  const isValidNavigation = (value: unknown): value is WatchNavigation => {
    if (!value || typeof value !== "object") return false;
    const navigation = value as Partial<WatchNavigation>;
    return (
      (navigation.direction === "left" || navigation.direction === "right") &&
      (navigation.bearingDeg === null || Number.isFinite(navigation.bearingDeg)) &&
      (navigation.distanceM === null ||
        (typeof navigation.distanceM === "number" &&
          navigation.distanceM >= 0 &&
          Number.isFinite(navigation.distanceM)))
    );
  };
  if (state.nextNavigation && !isValidNavigation(state.nextNavigation)) return false;
  if (
    state.upcomingNavigations !== undefined &&
    (!Array.isArray(state.upcomingNavigations) ||
      state.upcomingNavigations.length > 3 ||
      !state.upcomingNavigations.every(isValidNavigation))
  ) return false;
  const isValidTerrainSection = (value: unknown): value is WatchTerrainSection => {
    if (!value || typeof value !== "object") return false;
    const terrain = value as Partial<WatchTerrainSection>;
    return (
      (terrain.direction === "up" || terrain.direction === "down") &&
      typeof terrain.gradePct === "number" &&
      Number.isFinite(terrain.gradePct) &&
      terrain.gradePct >= 0 &&
      typeof terrain.remainingM === "number" &&
      Number.isFinite(terrain.remainingM) &&
      terrain.remainingM >= 0 &&
      typeof terrain.startsInM === "number" &&
      Number.isFinite(terrain.startsInM) &&
      terrain.startsInM >= 0
    );
  };
  if (state.terrainSection !== undefined && state.terrainSection !== null && !isValidTerrainSection(state.terrainSection)) {
    return false;
  }
  if (state.safetyCheckin !== undefined && state.safetyCheckin !== null) {
    const checkin = state.safetyCheckin;
    if (
      !["idle", "active", "overdue"].includes(checkin.status) ||
      !Number.isFinite(checkin.remainingSec) ||
      checkin.remainingSec < 0 ||
      typeof checkin.liveLinkActive !== "boolean"
    ) return false;
  }
  if (state.map !== undefined && state.map !== null) {
    const map = state.map;
    const validPoint = (point: unknown): point is WatchMapPoint => {
      if (!point || typeof point !== "object") return false;
      const candidate = point as Partial<WatchMapPoint>;
      return (
        typeof candidate.lat === "number" &&
        Number.isFinite(candidate.lat) &&
        candidate.lat >= -90 &&
        candidate.lat <= 90 &&
        typeof candidate.lng === "number" &&
        Number.isFinite(candidate.lng) &&
        candidate.lng >= -180 &&
        candidate.lng <= 180
      );
    };
    if (
      !Array.isArray(map.route) ||
      map.route.length < 2 ||
      map.route.length > 120 ||
      !map.route.every(validPoint) ||
      (map.current !== null && !validPoint(map.current)) ||
      typeof map.gpsFresh !== "boolean"
    ) return false;
  }
  if (state.offRoute !== undefined && state.offRoute !== null &&
      (typeof state.offRoute.distanceM !== "number" ||
       !Number.isFinite(state.offRoute.distanceM) ||
       state.offRoute.distanceM < 0 ||
       (state.offRoute.bearingToRouteDeg !== null &&
        (typeof state.offRoute.bearingToRouteDeg !== "number" ||
          !Number.isFinite(state.offRoute.bearingToRouteDeg))))) return false;
  if (state.weather !== undefined && state.weather !== null &&
      (typeof state.weather.temperatureC !== "number" ||
       !Number.isFinite(state.weather.temperatureC) ||
       typeof state.weather.weatherCode !== "number" ||
       !Number.isFinite(state.weather.weatherCode) ||
       typeof state.weather.windKmh !== "number" ||
       !Number.isFinite(state.weather.windKmh) ||
       typeof state.weather.windGustsKmh !== "number" ||
       !Number.isFinite(state.weather.windGustsKmh) ||
       typeof state.weather.precipitationMm !== "number" ||
       !Number.isFinite(state.weather.precipitationMm) ||
       typeof state.weather.isThunderstorm !== "boolean")) return false;
  if (state.daylight !== undefined && state.daylight !== null &&
      (typeof state.daylight.sunsetAtEpochMs !== "number" ||
       !Number.isFinite(state.daylight.sunsetAtEpochMs) ||
       typeof state.daylight.arrivalAfterSunset !== "boolean")) return false;
  if (state.poiStory !== undefined && state.poiStory !== null) {
    if (
      typeof state.poiStory.id !== "string" ||
      state.poiStory.id.length === 0 ||
      state.poiStory.id.length > 180 ||
      typeof state.poiStory.name !== "string" ||
      state.poiStory.name.length === 0 ||
      state.poiStory.name.length > 180 ||
      typeof state.poiStory.text !== "string" ||
      state.poiStory.text.length === 0 ||
      state.poiStory.text.length > 8_000 ||
      (state.poiStory.imageUrl !== null &&
        (typeof state.poiStory.imageUrl !== "string" ||
          state.poiStory.imageUrl.length > 2_000 ||
          !/^https?:\/\//i.test(state.poiStory.imageUrl)))
    ) return false;
  }
  for (const plannedValue of [state.plannedAscentM, state.remainingAscentM]) {
    if (plannedValue !== undefined && plannedValue !== null &&
        (typeof plannedValue !== "number" || !Number.isFinite(plannedValue) || plannedValue < 0)) {
      return false;
    }
  }
  if (state.heartRate && (
    !Number.isFinite(state.heartRate.bpm) || state.heartRate.bpm <= 0 ||
    !Number.isFinite(state.heartRate.measuredAt) ||
    !["fresh", "stale", "unavailable"].includes(state.heartRate.freshness) ||
    !["watch", "garmin", "phone"].includes(state.heartRate.source)
  )) return false;
  if (
    state.sosAcknowledgement !== undefined &&
    !["none", "acknowledged", "failed"].includes(state.sosAcknowledgement)
  ) return false;
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
  if (!isValidHikeLiveState(state)) {
    watchCompanionLog("publish rejected: invalid state", {
      sessionStatus: state && typeof state === "object" ? (state as Partial<HikeLiveState>).sessionStatus : null,
      isHiking: state && typeof state === "object" ? (state as Partial<HikeLiveState>).isHiking : null,
    });
    return false;
  }
  const now = options?.now ?? Date.now();
  if (!options?.force && now - lastLiveStateSentAt < LIVE_SNAPSHOT_MIN_INTERVAL_MS) return false;
  lastLiveStateSentAt = now;
  const module = companionModule();
  if (!module) {
    watchCompanionLog("publish skipped: native module unavailable", {
      sessionStatus: state.sessionStatus,
      isHiking: state.isHiking,
      sequence: state.sequence,
      platform: Platform.OS,
    });
    return false;
  }
  activateNativeCompanion(module);
  try {
    await module.publishLiveState!(state);
    watchCompanionLog("publish accepted by native module", {
      sessionStatus: state.sessionStatus,
      isHiking: state.isHiking,
      sequence: state.sequence,
    });
    return true;
  } catch (error) {
    watchCompanionLog("publish threw", {
      sessionStatus: state.sessionStatus,
      isHiking: state.isHiking,
      sequence: state.sequence,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export function subscribeToCompanionEvents(handlers: {
  onHeartRate: (event: { bpm: number; measuredAt: number; source: HeartRateSource }) => void;
  onSosRequest: (event: { requestedAt: number }) => void;
  onHikeCommand: (event: {
    command: "start" | "pause" | "resume" | "safetyStart" | "safetyConfirm";
    durationMinutes?: 30 | 60 | 120;
  }) => void;
}): () => void {
  if (Platform.OS === "web" || !companionModule()) return () => {};
  const heartRate = DeviceEventEmitter.addListener("SagaTrailCompanion.heartRate", (event: HeartRateEvent) => {
    const bpm = finiteOrNull(event?.bpm);
    const measuredAt = finiteOrNull(event?.measuredAt) ?? Date.now();
    if (bpm !== null && bpm > 0) {
      const source = event?.source === "phone"
        ? "phone"
        : event?.source === "garmin"
          ? "garmin"
          : "watch";
      handlers.onHeartRate({ bpm, measuredAt, source });
    }
  });
  const sos = DeviceEventEmitter.addListener("SagaTrailCompanion.sosRequest", (event: SosRequestEvent) => {
    handlers.onSosRequest({ requestedAt: finiteOrNull(event?.requestedAt) ?? Date.now() });
  });
  const command = DeviceEventEmitter.addListener("SagaTrailCompanion.hikeCommand", (event: HikeCommandEvent) => {
    if (event?.command === "start" || event?.command === "pause" || event?.command === "resume") {
      handlers.onHikeCommand({ command: event.command });
    } else if (event?.command === "safetyConfirm") {
      handlers.onHikeCommand({ command: event.command });
    } else if (
      event?.command === "safetyStart" &&
      (event.durationMinutes === 30 || event.durationMinutes === 60 || event.durationMinutes === 120)
    ) {
      handlers.onHikeCommand({ command: event.command, durationMinutes: event.durationMinutes });
    }
  });
  const nativeEvent = DeviceEventEmitter.addListener("SagaTrailWatchEvent", (event: {
    type?: unknown;
    payload?: { message?: unknown };
  }) => {
    if (event?.type === "protocolError") {
      watchCompanionLog("native protocol error", {
        message: typeof event.payload?.message === "string" ? event.payload.message : "unknown",
      });
    }
  });
  const nativeStatus = DeviceEventEmitter.addListener("SagaTrailWatchStatus", (event: {
    reachable?: unknown;
    paired?: unknown;
    watchAppInstalled?: unknown;
  }) => {
    watchCompanionLog("native connectivity status", {
      reachable: event?.reachable === true,
      paired: event?.paired === true,
      watchAppInstalled: event?.watchAppInstalled === true,
    });
  });
  return () => {
    heartRate.remove();
    sos.remove();
    command.remove();
    nativeEvent.remove();
    nativeStatus.remove();
  };
}

export async function prepareWatchCompanion(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  // The native companion is a persistent device connection, not a per-hike
  // opt-in. Activate every installed companion as soon as a hike screen uses
  // the Watch card; notification permission is only needed for the fallback
  // mirror on devices without the native protocol.
  const module = companionModule();
  if (module) {
    activateNativeCompanion(module);
    return true;
  }
  if (permissionGranted != null) return permissionGranted;
  try {
    const current = await Notifications.getPermissionsAsync();
    return (permissionGranted = current.granted);
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