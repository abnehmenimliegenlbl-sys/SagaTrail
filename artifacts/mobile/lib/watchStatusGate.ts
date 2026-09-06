export type WatchStatusGateSnapshot = {
  direction: string;
  remainingKm: number;
  position: { lat: number; lng: number } | null;
};

const MIN_MOVEMENT_METERS = 60;
const MIN_FALLBACK_DISTANCE_CHANGE_KM = 0.1;

function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const lat1 = a.lat * radians;
  const lat2 = b.lat * radians;
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

/** Suppresses periodic fallback notifications when nothing meaningful changed. */
export function isMeaningfulWatchStatusUpdate(
  previous: WatchStatusGateSnapshot | null,
  current: WatchStatusGateSnapshot,
): boolean {
  if (!previous) return true;
  if (previous.direction !== current.direction) return true;

  if (previous.position && current.position) {
    if (distanceMeters(previous.position, current.position) >= MIN_MOVEMENT_METERS) {
      return true;
    }
  } else if (
    Math.abs(previous.remainingKm - current.remainingKm) >=
    MIN_FALLBACK_DISTANCE_CHANGE_KM
  ) {
    return true;
  }

  return false;
}