import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const native = Platform.OS !== "web";

/**
 * Zentrales Haptic-Vokabular fuer SagaTrail.
 *
 * Konzept:
 *   selection  — leichte Bestaetigung, Listenauswahl, Chip-Tap
 *   medium     — Bookmark-Toggle, Filter aktivieren, Modal oeffnen
 *   rigid      — Toggle-Schalter (Ein/Aus), Tab-Wechsel
 *   heavy      — Kapitelwechsel, Wegpunkt erreicht, SOS-Bereich betreten
 *   success    — Kauf erfolgreich, Hike abgeschlossen, Saga entdeckt
 *   error      — Kauffehler, Netzwerkfehler, Validierung gescheitert
 *   warning    — Off-Route, Sperrung, Wetterwarnmeldung
 *
 * Alle Funktionen sind auf Web (Expo Web) stille No-ops.
 */

export function hapticSelection(): void {
  if (!native) return;
  void Haptics.selectionAsync();
}

export function hapticMedium(): void {
  if (!native) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticRigid(): void {
  if (!native) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
}

export function hapticHeavy(): void {
  if (!native) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export function hapticSuccess(): void {
  if (!native) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticError(): void {
  if (!native) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

export function hapticWarning(): void {
  if (!native) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Doppeltes Heavy-Puls — fuer den SOS-Knopf und Hike-Abschluss-Moment. */
export function hapticDoublePulse(): void {
  if (!native) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  setTimeout(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 120);
}
