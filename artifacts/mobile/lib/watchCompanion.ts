import { DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  isMeaningfulWatchStatusUpdate,
  type WatchStatusGateSnapshot,
} from "./watchStatusGate";
import { makeLogger } from "./debugLog";

const watchCompanionLog = makeLogger("[WATCH-COMPANION]", "watch_companion");

type NativeConnectivityStatus = {
  reachable: boolean;
  paired: boolean;
  watchAppInstalled: boolean;
};

const CONNECTIVITY_STABILITY_MS = 1_500;
let lastStableConnectivityKey: string | null = null;
let pendingConnectivity: NativeConnectivityStatus | null = null;
let connectivityTimer: ReturnType<typeof setTimeout> | null = null;

function logStableConnectivity(status: NativeConnectivityStatus) {
  const key = `${status.reachable}:${status.paired}:${status.watchAppInstalled}`;
  if (key === lastStableConnectivityKey) return;
  lastStableConnectivityKey = key;
  watchCompanionLog("native connectivity status stable", status);
}

/** Wire format shared with the optional SagaTrailCompanion native module. */
export const HIKE_LIVE_STATE_VERSION = 1 as const;
// Routine Watch snapshots do not need sub-10-second precision: the iPhone
// remains authoritative for GPS and local turn notifications. Urgent states
// use the shorter interval below so turn approach, SOS, and safety changes
// remain responsive.
export const LIVE_SNAPSHOT_MIN_INTERVAL_MS = 15_000;
const LIVE_SNAPSHOT_URGENT_INTERVAL_MS = 7_500;
const WATCH_INACTIVE_SNAPSHOT_INTERVAL_MS = 30_000;
let watchDisplayActive: boolean | null = null;

export type DataFreshness = "fresh" | "stale" | "unavailable";
export type HikeSessionStatus = "preparing" | "active" | "paused" | "finished" | "sos_requested";
export type SosAcknowledgement = "none" | "acknowledged" | "failed";
export type HeartRateSource = "watch" | "garmin" | "phone";
export type SafetyCheckinStatus = "idle" | "active" | "overdue";
export type WatchRouteGradeBand = "green" | "yellow" | "orange" | "red";

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

export interface WatchUpcomingGradeChange {
  direction: "up" | "down";
  gradePct: number;
  distanceM: number;
}

export interface WatchUpcomingSurfaceChange {
  surface: "asphalt" | "kies" | "fels" | "holz" | "naturweg";
  distanceM: number;
}

export interface WatchUpcomingAttraction {
  name: string;
  distanceM: number;
}

export interface WatchSafetyCheckin {
  status: SafetyCheckinStatus;
  remainingSec: number;
  expiresAtEpochMs?: number | null;
  liveLinkActive: boolean;
}

export interface WatchMapPoint {
  lat: number;
  lng: number;
  gradeBand?: WatchRouteGradeBand;
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
  kind?: "poi" | "partner";
}

export interface WatchStoryAudio {
  isPlaying: boolean;
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
  upcomingGradeChange?: WatchUpcomingGradeChange | null;
  upcomingSurfaceChange?: WatchUpcomingSurfaceChange | null;
  upcomingAttraction?: WatchUpcomingAttraction | null;
  safetyCheckin?: WatchSafetyCheckin | null;
  map?: WatchMapState | null;
  offRoute?: WatchOffRoute | null;
  weather?: WatchWeather | null;
  daylight?: WatchDaylight | null;
  poiStory?: WatchPoiStory | null;
  storyAudio?: WatchStoryAudio | null;
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
    action?: "openPoiStory";
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
  markWatchActionListenersReady?: () => void;
  drainPendingWatchActions?: () => void;
  selectGarminDevice?: () => void;
  publishLiveState?: (state: HikeLiveState) => void | Promise<void>;
  getLatestHeartRate?: () => Promise<HeartRateEvent | null>;
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
let lastInvalidStateLogKey: string | null = null;
let lastOmittedFieldsLogKey: string | null = null;

function liveStateDebugSummary(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return { kind: typeof value };
  }
  const state = value as Partial<HikeLiveState>;
  const numeric = {
    sequence: state.sequence,
    timestampFinite: Number.isFinite(state.timestamp),
    elapsedSecFinite: state.elapsedSec == null || Number.isFinite(state.elapsedSec),
    walkedDistanceFinite: state.walkedDistanceM == null || Number.isFinite(state.walkedDistanceM),
    ascentFinite: state.ascentM == null || Number.isFinite(state.ascentM),
    stepsFinite: state.steps == null || Number.isFinite(state.steps),
    remainingDistanceFinite:
      state.remainingDistanceM == null || Number.isFinite(state.remainingDistanceM),
    remainingSecondsFinite:
      state.remainingSeconds == null || Number.isFinite(state.remainingSeconds),
    arrivalFinite:
      state.arrivalAtEpochMs == null || Number.isFinite(state.arrivalAtEpochMs),
    remainingAscentFinite:
      state.remainingAscentM == null || Number.isFinite(state.remainingAscentM),
  };
  return {
    version: state.version,
    sessionStatus: state.sessionStatus,
    isHiking: state.isHiking,
    gpsFreshness: state.gpsFreshness,
    hasNavigation: state.nextNavigation != null,
    upcomingNavigationCount: state.upcomingNavigations?.length ?? 0,
    hasSafetyCheckin: state.safetyCheckin != null,
    safetyStatus: state.safetyCheckin?.status ?? null,
    hasMap: state.map != null,
    mapPointCount: state.map?.route?.length ?? 0,
    hasWeather: state.weather != null,
    hasPoiStory: state.poiStory != null,
    poiStoryId: state.poiStory?.id ?? null,
    poiStoryKind: state.poiStory?.kind ?? null,
    poiStoryTextLength: state.poiStory?.text.length ?? 0,
    hasActiveAlert: state.activeAlert != null,
    activeAlertAction: state.activeAlert?.action ?? null,
    sosAcknowledgement: state.sosAcknowledgement ?? null,
    numeric,
  };
}

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
  if (state.upcomingGradeChange !== undefined && state.upcomingGradeChange !== null) {
    const change = state.upcomingGradeChange;
    if (
      !["up", "down"].includes(change.direction) ||
      !Number.isFinite(change.gradePct) ||
      change.gradePct < 0 ||
      !Number.isFinite(change.distanceM) ||
      change.distanceM < 0
    ) return false;
  }
  if (state.upcomingSurfaceChange !== undefined && state.upcomingSurfaceChange !== null) {
    const change = state.upcomingSurfaceChange;
    if (
      !["asphalt", "kies", "fels", "holz", "naturweg"].includes(change.surface) ||
      !Number.isFinite(change.distanceM) ||
      change.distanceM < 0
    ) return false;
  }
  if (state.upcomingAttraction !== undefined && state.upcomingAttraction !== null) {
    const attraction = state.upcomingAttraction;
    if (
      typeof attraction.name !== "string" ||
      attraction.name.trim().length === 0 ||
      attraction.name.length > 180 ||
      !Number.isFinite(attraction.distanceM) ||
      attraction.distanceM < 0
    ) return false;
  }
  if (state.safetyCheckin !== undefined && state.safetyCheckin !== null) {
    const checkin = state.safetyCheckin;
    if (
      !["idle", "active", "overdue"].includes(checkin.status) ||
      !Number.isFinite(checkin.remainingSec) ||
      checkin.remainingSec < 0 ||
      (checkin.expiresAtEpochMs !== undefined &&
        checkin.expiresAtEpochMs !== null &&
        (!Number.isFinite(checkin.expiresAtEpochMs) || checkin.expiresAtEpochMs <= 0)) ||
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
        candidate.lng <= 180 &&
        (candidate.gradeBand === undefined ||
          candidate.gradeBand === "green" ||
          candidate.gradeBand === "yellow" ||
          candidate.gradeBand === "orange" ||
          candidate.gradeBand === "red")
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
      (state.poiStory.kind !== undefined &&
        state.poiStory.kind !== "poi" &&
        state.poiStory.kind !== "partner") ||
      (state.poiStory.imageUrl !== undefined &&
        state.poiStory.imageUrl !== null &&
        (typeof state.poiStory.imageUrl !== "string" ||
          state.poiStory.imageUrl.length > 2_000 ||
          !/^https?:\/\//i.test(state.poiStory.imageUrl)))
    ) return false;
  }
  if (state.storyAudio !== undefined && state.storyAudio !== null) {
    if (
      typeof state.storyAudio.isPlaying !== "boolean" ||
      typeof state.storyAudio.text !== "string" ||
      state.storyAudio.text.length === 0 ||
      state.storyAudio.text.length > 2_000
    ) return false;
  }
  if (
    state.activeAlert?.action !== undefined &&
    state.activeAlert.action !== "openPoiStory"
  ) return false;
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

const OPTIONAL_LIVE_STATE_FIELDS: ReadonlyArray<keyof HikeLiveState> = [
  "nextNavigation",
  "upcomingNavigations",
  "plannedAscentM",
  "remainingAscentM",
  "terrainSection",
  "upcomingGradeChange",
  "upcomingSurfaceChange",
  "upcomingAttraction",
  "safetyCheckin",
  "map",
  "offRoute",
  "weather",
  "daylight",
  "poiStory",
  "storyAudio",
  "heartRate",
  "activeAlert",
  "remainingDistanceM",
  "remainingSeconds",
  "arrivalAtEpochMs",
  "sosAcknowledgement",
];

function prepareHikeLiveStateForPublish(
  state: HikeLiveState,
): { state: HikeLiveState | null; omittedFields: string[] } {
  const prepared = {
    ...state,
    nextNavigation: null,
    heartRate: null,
    activeAlert: null,
  } as HikeLiveState;
  const preparedRecord = prepared as unknown as Record<string, unknown>;
  const originalRecord = state as unknown as Record<string, unknown>;

  for (const field of OPTIONAL_LIVE_STATE_FIELDS) {
    if (field === "nextNavigation" || field === "heartRate" || field === "activeAlert") continue;
    delete preparedRecord[field];
  }
  if (!isValidHikeLiveState(prepared)) {
    return { state: null, omittedFields: [] };
  }

  const omittedFields: string[] = [];
  for (const field of OPTIONAL_LIVE_STATE_FIELDS) {
    if (!(field in originalRecord)) continue;
    const previousValue = preparedRecord[field];
    const hadPreviousValue = field in preparedRecord;
    preparedRecord[field] = originalRecord[field];
    if (!isValidHikeLiveState(prepared)) {
      if (hadPreviousValue) preparedRecord[field] = previousValue;
      else delete preparedRecord[field];
      omittedFields.push(field);
    }
  }
  return { state: prepared, omittedFields };
}

export function serializeHikeLiveState(state: HikeLiveState): string | null {
  return isValidHikeLiveState(state) ? JSON.stringify(state) : null;
}

/** Publishes to a real companion when installed; notification mirroring remains the fallback. */
export async function publishHikeLiveState(
  state: HikeLiveState,
  options?: { force?: boolean; now?: number },
): Promise<boolean> {
  const prepared = prepareHikeLiveStateForPublish(state);
  if (!prepared.state) {
    const summary = liveStateDebugSummary(state);
    const logKey = JSON.stringify(summary);
    if (logKey !== lastInvalidStateLogKey) {
      lastInvalidStateLogKey = logKey;
      watchCompanionLog("publish rejected: invalid core state", summary);
    }
    return false;
  }
  lastInvalidStateLogKey = null;
  const publishState = prepared.state;
  const omittedFieldsLogKey = prepared.omittedFields.join(",");
  if (omittedFieldsLogKey) {
    if (omittedFieldsLogKey !== lastOmittedFieldsLogKey) {
      watchCompanionLog("publish omitted invalid optional fields", {
        omittedFields: prepared.omittedFields,
        sessionStatus: publishState.sessionStatus,
        isHiking: publishState.isHiking,
        poiStoryId: publishState.poiStory?.id ?? null,
        activeAlertAction: publishState.activeAlert?.action ?? null,
      });
    }
    lastOmittedFieldsLogKey = omittedFieldsLogKey;
  } else {
    lastOmittedFieldsLogKey = null;
  }
  const now = options?.now ?? Date.now();
  const force = options?.force === true;
  const age = now - lastLiveStateSentAt;
  const turnIsNear =
    publishState.nextNavigation?.distanceM != null &&
    publishState.nextNavigation.distanceM <= 150;
  const safetyIsActive =
    publishState.safetyCheckin?.status === "active" ||
    publishState.safetyCheckin?.status === "overdue";
  const urgent =
    turnIsNear ||
    safetyIsActive ||
    publishState.sessionStatus === "sos_requested" ||
    publishState.activeAlert != null;
  const minimumInterval = urgent
    ? LIVE_SNAPSHOT_URGENT_INTERVAL_MS
    : watchDisplayActive === false
      ? WATCH_INACTIVE_SNAPSHOT_INTERVAL_MS
      : LIVE_SNAPSHOT_MIN_INTERVAL_MS;
  if (!force && age < minimumInterval) {
    if (publishState.safetyCheckin?.status === "active" || publishState.sessionStatus === "sos_requested") {
      watchCompanionLog("publish throttled for critical state", {
        sequence: publishState.sequence,
        sessionStatus: publishState.sessionStatus,
        safetyStatus: publishState.safetyCheckin?.status ?? null,
        ageMs: age,
      });
    }
    return false;
  }
  watchCompanionLog("publish attempt", {
    sequence: publishState.sequence,
    sessionStatus: publishState.sessionStatus,
    isHiking: publishState.isHiking,
    force,
    safetyStatus: publishState.safetyCheckin?.status ?? null,
    sosAcknowledgement: publishState.sosAcknowledgement ?? null,
    poiStoryId: publishState.poiStory?.id ?? null,
    poiStoryKind: publishState.poiStory?.kind ?? null,
    poiStoryTextLength: publishState.poiStory?.text.length ?? 0,
    activeAlertAction: publishState.activeAlert?.action ?? null,
  });
  const module = companionModule();
  if (!module) {
    watchCompanionLog("publish skipped: native module unavailable", {
      sessionStatus: publishState.sessionStatus,
      isHiking: publishState.isHiking,
      sequence: publishState.sequence,
      platform: Platform.OS,
    });
    return false;
  }
  activateNativeCompanion(module);
  try {
    await module.publishLiveState!(publishState);
    // Only throttle after the native bridge accepted the snapshot. If the
    // module is unavailable or throws during startup, the next React state
    // change must be allowed to retry instead of being suppressed for 7.5 s.
    lastLiveStateSentAt = now;
    watchCompanionLog("publish accepted by native module", {
      sessionStatus: publishState.sessionStatus,
      isHiking: publishState.isHiking,
      sequence: publishState.sequence,
      poiStoryId: publishState.poiStory?.id ?? null,
      activeAlertAction: publishState.activeAlert?.action ?? null,
    });
    return true;
  } catch (error) {
    watchCompanionLog("publish threw in native module", {
      ...liveStateDebugSummary(publishState),
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
  onWatchVisibility?: (active: boolean) => void;
}): () => void {
  const module = companionModule();
  if (Platform.OS === "web" || !module) {
    watchCompanionLog("event subscription skipped", {
      platform: Platform.OS,
      nativeModuleAvailable: Boolean(module),
    });
    return () => {};
  }
  watchCompanionLog("event subscription attaching", {
    platform: Platform.OS,
    nativeModuleAvailable: true,
  });
  const eventEmitter = Platform.OS === "ios"
    ? new NativeEventEmitter(NativeModules.SagaTrailCompanion)
    : DeviceEventEmitter;
  let active = true;
  let lastForwardedHeartRateAt = 0;
  const forwardHeartRate = (event: HeartRateEvent | null | undefined) => {
    if (!active) return;
    const bpm = finiteOrNull(event?.bpm);
    const measuredAt = finiteOrNull(event?.measuredAt) ?? Date.now();
    if (bpm !== null && bpm > 0 && measuredAt > lastForwardedHeartRateAt) {
      lastForwardedHeartRateAt = measuredAt;
      const source = event?.source === "phone"
        ? "phone"
        : event?.source === "garmin"
          ? "garmin"
          : "watch";
      handlers.onHeartRate({ bpm, measuredAt, source });
      watchCompanionLog("heart-rate event forwarded", { source, measuredAt, bpm });
    } else {
      watchCompanionLog("heart-rate event ignored", {
        hasBpm: bpm !== null,
        measuredAt,
        lastForwardedHeartRateAt,
      });
    }
  };
  const heartRate = eventEmitter.addListener(
    "SagaTrailCompanion.heartRate",
    forwardHeartRate,
  );
  const sos = eventEmitter.addListener("SagaTrailCompanion.sosRequest", (event: SosRequestEvent) => {
    const requestedAt = finiteOrNull(event?.requestedAt) ?? Date.now();
    watchCompanionLog("SOS event received by JS", { requestedAt });
    handlers.onSosRequest({ requestedAt });
  });
  const command = eventEmitter.addListener("SagaTrailCompanion.hikeCommand", (event: HikeCommandEvent) => {
    if (event?.command === "start" || event?.command === "pause" || event?.command === "resume") {
      watchCompanionLog("hike command received by JS", { command: event.command });
      handlers.onHikeCommand({ command: event.command });
    } else if (event?.command === "safetyConfirm") {
      watchCompanionLog("safety confirmation received by JS", { command: event.command });
      handlers.onHikeCommand({ command: event.command });
    } else if (
      event?.command === "safetyStart" &&
      (event.durationMinutes === 30 || event.durationMinutes === 60 || event.durationMinutes === 120)
    ) {
      watchCompanionLog("safety start received by JS", {
        command: event.command,
        durationMinutes: event.durationMinutes,
      });
      handlers.onHikeCommand({ command: event.command, durationMinutes: event.durationMinutes });
    } else {
      watchCompanionLog("invalid hike command ignored by JS", {
        command: event?.command ?? null,
        hasDuration: event?.durationMinutes != null,
      });
    }
  });
  const nativeEvent = eventEmitter.addListener("SagaTrailWatchEvent", (event: {
    type?: unknown;
    payload?: { message?: unknown };
  }) => {
    if (event?.type === "protocolError") {
      watchCompanionLog("native protocol error", {
        message: typeof event.payload?.message === "string" ? event.payload.message : "unknown",
      });
    }
  });
  const nativeStatus = eventEmitter.addListener("SagaTrailWatchStatus", (event: {
    reachable?: unknown;
    paired?: unknown;
    watchAppInstalled?: unknown;
  }) => {
    const status: NativeConnectivityStatus = {
      reachable: event?.reachable === true,
      paired: event?.paired === true,
      watchAppInstalled: event?.watchAppInstalled === true,
    };
    const key = `${status.reachable}:${status.paired}:${status.watchAppInstalled}`;
    if (key === lastStableConnectivityKey) return;
    if (
      status.reachable &&
      status.paired &&
      status.watchAppInstalled
    ) {
      if (connectivityTimer !== null) {
        clearTimeout(connectivityTimer);
        connectivityTimer = null;
      }
      pendingConnectivity = null;
      logStableConnectivity(status);
      return;
    }
    pendingConnectivity = status;
    if (connectivityTimer !== null) return;
    connectivityTimer = setTimeout(() => {
      connectivityTimer = null;
      const next = pendingConnectivity;
      pendingConnectivity = null;
      if (next) logStableConnectivity(next);
    }, CONNECTIVITY_STABILITY_MS);
  });
  const watchVisibility = eventEmitter.addListener(
    "SagaTrailCompanion.watchVisibility",
    (event: { active?: unknown }) => {
      if (typeof event?.active !== "boolean") return;
      watchDisplayActive = event.active;
      handlers.onWatchVisibility?.(event.active);
      watchCompanionLog("watch display visibility received", {
        active: event.active,
      });
    },
  );
  // RCTEventEmitter starts observing after the first listener is registered.
  // Register every event-specific listener before activation or draining the
  // native queue so a cold-start safety command cannot be replayed too early.
  activateNativeCompanion(module);
  module.markWatchActionListenersReady?.();
  module.drainPendingWatchActions?.();
  watchCompanionLog("watch action listeners marked ready; pending actions drain requested");
  void module.getLatestHeartRate?.()
    .then((event) => {
      watchCompanionLog("latest heart-rate replay received", { present: event != null });
      forwardHeartRate(event);
    })
    .catch((error) => watchCompanionLog("latest heart-rate replay failed", {
      message: error instanceof Error ? error.message : String(error),
    }));
  return () => {
    active = false;
    watchCompanionLog("event subscription detached");
    heartRate.remove();
    sos.remove();
    command.remove();
    nativeEvent.remove();
    nativeStatus.remove();
    watchVisibility.remove();
  };
}

export async function prepareWatchCompanion(): Promise<boolean> {
  if (Platform.OS === "web") {
    watchCompanionLog("prepare skipped on web");
    return false;
  }
  // The native companion is a persistent device connection, not a per-hike
  // opt-in. Activate every installed companion as soon as a hike screen uses
  // the Watch card; notification permission is only needed for the fallback
  // mirror on devices without the native protocol.
  const module = companionModule();
  if (module) {
    activateNativeCompanion(module);
    watchCompanionLog("prepare succeeded: native companion available");
    return true;
  }
  if (permissionGranted != null) {
    watchCompanionLog("prepare reused notification permission result", { granted: permissionGranted });
    return permissionGranted;
  }
  try {
    const current = await Notifications.getPermissionsAsync();
    permissionGranted = current.granted;
    watchCompanionLog("prepare completed with notification fallback", { granted: permissionGranted });
    return permissionGranted;
  } catch (error) {
    watchCompanionLog("prepare failed", {
      message: error instanceof Error ? error.message : String(error),
    });
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
  watchCompanionLog("SOS notification requested", { platform: Platform.OS });
  if (Platform.OS === "web" || !(await prepareWatchCompanion())) {
    watchCompanionLog("SOS notification unavailable");
    return false;
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: "SagaTrail · SOS", body: "Notfallansicht auf dem Telefon geöffnet", sound: "default", data: { kind: "watch-sos" } },
      trigger: null,
    });
    watchCompanionLog("SOS notification scheduled");
    return true;
  } catch (error) {
    watchCompanionLog("SOS notification failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function clearWatchStatus(): Promise<void> {
  if (Platform.OS !== "web" && statusNotificationId) await Notifications.cancelScheduledNotificationAsync(statusNotificationId).catch(() => {});
  statusNotificationId = null;
  lastStatusSentAt = 0;
  lastLiveStateSentAt = 0;
  lastStatusSnapshot = null;
}