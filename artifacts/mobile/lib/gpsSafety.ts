export const GPS_FRESHNESS_WINDOW_MS = 3 * 60 * 1000;

export interface GpsFreshnessInput {
  permissionGranted: boolean;
  hasPosition: boolean;
  lastFixAtMs: number;
  nowMs?: number;
  freshnessWindowMs?: number;
}

export function isFreshGpsFix(input: GpsFreshnessInput): boolean {
  if (
    !input.permissionGranted ||
    !input.hasPosition ||
    !Number.isFinite(input.lastFixAtMs) ||
    input.lastFixAtMs <= 0
  ) {
    return false;
  }
  const ageMs = (input.nowMs ?? Date.now()) - input.lastFixAtMs;
  const freshnessWindowMs = input.freshnessWindowMs ?? GPS_FRESHNESS_WINDOW_MS;
  return Number.isFinite(ageMs) && ageMs <= freshnessWindowMs;
}