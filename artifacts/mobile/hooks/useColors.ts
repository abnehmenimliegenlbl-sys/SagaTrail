import colors from "@/constants/colors";
import { useThemeModeSafe } from "@/contexts/AppContext";

/**
 * Returns the design tokens for the active display mode.
 *
 * SagaTrail nutzt ein Schweizer Rot-Weiss-Design mit zwei Modi ("hell" /
 * "dunkel"), die der Nutzer in den Einstellungen umschaltet — unabhaengig
 * vom Systemschema des Geraets (siehe `AppContext.themeMode`).
 */
export function useColors() {
  const themeMode = useThemeModeSafe();
  return { ...colors[themeMode], radius: colors.radius };
}
