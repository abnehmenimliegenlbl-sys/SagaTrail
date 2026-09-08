import type { HikeLiveState } from "./watchCompanion";

export type GarminSosAcknowledgement = "none" | "acknowledged" | "failed";

export interface GarminHikeLiveState {
  protocolVersion: 1;
  type: "hikeLiveState";
  bridge: "connectIqMobile";
  companionStatus: "connected" | "disconnected";
  updatedAtMs: number;
  direction: string;
  sessionStatus: "preparing" | "active" | "paused" | "finished" | "sos_requested";
  nextInstruction: string;
  heading?: number;
  remainingKm: number;
  heartRateBpm?: number;
  hasFreshGps: boolean;
  elapsedS?: number;
  totalDistanceM?: number;
  ascentM?: number;
  steps?: number;
  remainingDistanceM?: number;
  remainingSeconds?: number;
  arrivalAtEpochMs?: number;
  plannedAscentM?: number;
  remainingAscentM?: number;
  upcomingNavigations?: Array<{
    direction: "left" | "right";
    heading?: number;
    distanceM?: number;
  }>;
  terrainSection?: {
    direction: "up" | "down";
    gradePct: number;
    remainingM: number;
    startsInM: number;
  };
  safetyCheckin?: {
    status: "idle" | "active" | "overdue";
    remainingSec: number;
    liveLinkActive: boolean;
  };
  offRoute?: {
    distanceM: number;
    bearingToRouteDeg?: number;
  };
  weather?: {
    temperatureC: number;
    weatherCode: number;
    windKmh: number;
    windGustsKmh: number;
    precipitationMm: number;
    isThunderstorm: boolean;
  };
  daylight?: {
    sunsetAtEpochMs: number;
    arrivalAfterSunset: boolean;
  };
  poiStory?: {
    id: string;
    name: string;
    text: string;
    imageUrl?: string;
  };
  language?: string;
  freshnessS: number;
  safetyText: string;
  narrationText: string;
  alertKind?: "safety" | "narration" | "sos" | "discovery";
  alertText?: string;
  sosAcknowledgement: GarminSosAcknowledgement;
}

export interface GarminSosRequest {
  protocolVersion: 1;
  type: "sosRequest";
  requestId: number;
}

const COORDINATE_KEYS = /"(?:lat|lng|latitude|longitude|coordinates|geometry|position|route)"\s*:/i;

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function withoutCoordinates(value: unknown): boolean {
  return !COORDINATE_KEYS.test(JSON.stringify(value) ?? "");
}

export function toGarminHikeLiveState(
  state: HikeLiveState,
  companionStatus: GarminHikeLiveState["companionStatus"],
  nowMs = Date.now(),
): GarminHikeLiveState {
  const navigation = state.nextNavigation;
  const alert = state.activeAlert;
  const payload: GarminHikeLiveState = {
    protocolVersion: 1,
    type: "hikeLiveState",
    bridge: "connectIqMobile",
    companionStatus,
    updatedAtMs: state.timestamp,
    direction: navigation?.direction ?? "none",
    sessionStatus: state.sessionStatus,
    nextInstruction: alert?.text ?? (navigation ? `Turn ${navigation.direction}` : "Continue on route"),
    remainingKm: Math.max(0, (navigation?.distanceM ?? state.remainingDistanceM ?? 0) / 1000),
    hasFreshGps: state.gpsFreshness === "fresh",
    freshnessS: Math.max(0, (nowMs - state.timestamp) / 1000),
    safetyText: alert?.kind === "safety" ? alert.text : "",
    narrationText: alert?.kind === "narration" ? alert.text : "",
    ...(alert ? { alertKind: alert.kind, alertText: alert.text } : {}),
    // A canonical live state has no phone-side SOS result. Never infer one
    // from sessionStatus; only the phone emergency flow may send an ack.
    sosAcknowledgement: state.sosAcknowledgement ?? "none",
  };
  if (navigation?.bearingDeg != null) payload.heading = navigation.bearingDeg;
  if (state.heartRate?.bpm != null) payload.heartRateBpm = state.heartRate.bpm;
  if (state.elapsedSec != null) payload.elapsedS = state.elapsedSec;
  if (state.walkedDistanceM != null) payload.totalDistanceM = state.walkedDistanceM;
  if (state.ascentM != null) payload.ascentM = state.ascentM;
  if (state.steps != null) payload.steps = state.steps;
  if (state.remainingDistanceM != null) payload.remainingDistanceM = state.remainingDistanceM;
  if (state.remainingSeconds != null) payload.remainingSeconds = state.remainingSeconds;
  if (state.arrivalAtEpochMs != null) payload.arrivalAtEpochMs = state.arrivalAtEpochMs;
  if (state.plannedAscentM != null) payload.plannedAscentM = state.plannedAscentM;
  if (state.remainingAscentM != null) payload.remainingAscentM = state.remainingAscentM;
  if (state.upcomingNavigations?.length) {
    payload.upcomingNavigations = state.upcomingNavigations.map((item) => ({
      direction: item.direction,
      ...(item.bearingDeg == null ? {} : { heading: item.bearingDeg }),
      ...(item.distanceM == null ? {} : { distanceM: item.distanceM }),
    }));
  }
  if (state.terrainSection != null) payload.terrainSection = state.terrainSection;
  if (state.safetyCheckin != null) payload.safetyCheckin = state.safetyCheckin;
  if (state.offRoute != null) {
    payload.offRoute = {
      distanceM: state.offRoute.distanceM,
      ...(state.offRoute.bearingToRouteDeg == null ? {} : { bearingToRouteDeg: state.offRoute.bearingToRouteDeg }),
    };
  }
  if (state.weather != null) payload.weather = state.weather;
  if (state.daylight != null) payload.daylight = state.daylight;
  if (state.poiStory != null) {
    payload.poiStory = {
      id: state.poiStory.id,
      name: state.poiStory.name,
      text: state.poiStory.text,
      ...(state.poiStory.imageUrl ? { imageUrl: state.poiStory.imageUrl } : {}),
    };
  }
  if (state.language) payload.language = state.language;
  return payload;
}

export function withGarminSosAcknowledgement(
  payload: GarminHikeLiveState,
  acknowledgement: Exclude<GarminSosAcknowledgement, "none">,
): GarminHikeLiveState {
  return { ...payload, sosAcknowledgement: acknowledgement };
}

export function isValidGarminHikeLiveState(value: unknown): value is GarminHikeLiveState {
  if (!value || typeof value !== "object" || !withoutCoordinates(value)) return false;
  const payload = value as Partial<GarminHikeLiveState>;
  return (
    payload.protocolVersion === 1 &&
    payload.type === "hikeLiveState" &&
    payload.bridge === "connectIqMobile" &&
    (payload.companionStatus === "connected" || payload.companionStatus === "disconnected") &&
    finiteNumber(payload.updatedAtMs) &&
    typeof payload.direction === "string" &&
    ["preparing", "active", "paused", "finished", "sos_requested"].includes(payload.sessionStatus as string) &&
    typeof payload.nextInstruction === "string" &&
    finiteNumber(payload.remainingKm) &&
    typeof payload.hasFreshGps === "boolean" &&
    finiteNumber(payload.freshnessS) &&
    typeof payload.safetyText === "string" &&
    typeof payload.narrationText === "string" &&
    (payload.poiStory === undefined ||
      (typeof payload.poiStory.id === "string" &&
        payload.poiStory.id.length > 0 &&
        typeof payload.poiStory.name === "string" &&
        payload.poiStory.name.length > 0 &&
        typeof payload.poiStory.text === "string" &&
        payload.poiStory.text.length > 0 &&
        payload.poiStory.text.length <= 8_000 &&
        (payload.poiStory.imageUrl === undefined || typeof payload.poiStory.imageUrl === "string"))) &&
    (payload.sosAcknowledgement === "none" ||
      payload.sosAcknowledgement === "acknowledged" ||
      payload.sosAcknowledgement === "failed")
  );
}

export function parseGarminSosRequest(value: unknown): GarminSosRequest | null {
  if (!value || typeof value !== "object" || !withoutCoordinates(value)) return null;
  const request = value as Partial<GarminSosRequest>;
  if (request.protocolVersion !== 1 || request.type !== "sosRequest" || !finiteNumber(request.requestId)) {
    return null;
  }
  return {
    protocolVersion: 1,
    type: "sosRequest",
    requestId: request.requestId,
  };
}