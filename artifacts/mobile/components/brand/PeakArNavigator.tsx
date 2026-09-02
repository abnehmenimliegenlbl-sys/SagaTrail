import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

/**
 * TypeScript fallback for platforms without a native AR implementation.
 * Metro uses the platform-specific files on iOS, Android, and web.
 */
export function PeakArNavigator(_props: PeakArNavigatorProps) {
  return null;
}