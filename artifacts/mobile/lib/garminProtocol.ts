import type { HikeLiveState } from "./watchCompanion";

export type GarminSosAcknowledgement = "none" | "acknowledged" | "failed";

export interface GarminHikeLiveState {
  protocolVersion: 1;
  type: "hikeLiveState";
  bridge: "connectIqMobile";
  companionStatus: "connected" | "disconnected";
  updatedAtMs: number;
  direction: string;
  heading?: number;
  remainingKm: number;
  heartRateBpm?: number;
  hasFreshGps: boolean;
  elapsedS?: number;
  totalDistanceM?: number;
  ascentM?: number;
  steps?: number;
  freshnessS: number;
  safetyText: string;
  narrationText: string;
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
    remainingKm: Math.max(0, (navigation?.distanceM ?? state.remainingDistanceM ?? 0) / 1000),
    hasFreshGps: state.gpsFreshness === "fresh",
    freshnessS: Math.max(0, (nowMs - state.timestamp) / 1000),
    safetyText: alert?.kind === "safety" ? alert.text : "",
    narrationText: alert?.kind === "narration" ? alert.text : "",
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
    finiteNumber(payload.remainingKm) &&
    typeof payload.hasFreshGps === "boolean" &&
    finiteNumber(payload.freshnessS) &&
    typeof payload.safetyText === "string" &&
    typeof payload.narrationText === "string" &&
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