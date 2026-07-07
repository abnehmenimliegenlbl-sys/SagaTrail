import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

/**
 * Lokale Abbiege-Mitteilungen waehrend der Live-Wanderung.
 *
 * iOS spiegelt Mitteilungen automatisch auf eine gekoppelte Apple Watch
 * (inkl. Vibration am Handgelenk), sobald das iPhone gesperrt ist — genau der
 * Normalfall beim Wandern mit dem Handy in der Tasche. Andere Uhren mit
 * Mitteilungs-Spiegelung (Garmin, Samsung, ...) funktionieren genauso.
 *
 * Im Web gibt es keine lokalen Mitteilungen — dort sind alle Funktionen
 * stille No-ops; die Abbiege-Hinweise bleiben Teil der Erzaehlung.
 */

let handlerGesetzt = false;

/** Fragt (nativ) die Mitteilungs-Berechtigung an; liefert true bei Erlaubnis. */
export async function bereiteAbbiegeMitteilungenVor(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    if (!handlerGesetzt) {
      // Auch im Vordergrund anzeigen — wer das Handy in der Hand hat, sieht
      // den Hinweis als Banner; auf der Watch kommt er ohnehin nur bei
      // gesperrtem iPhone an.
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      handlerGesetzt = true;
    }
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    // Best effort — ohne Berechtigung bleiben die Hinweise Teil der Erzaehlung.
    return false;
  }
}

/** Loest sofort eine lokale Abbiege-Mitteilung aus (nativ, best effort). */
export async function sendeAbbiegeMitteilung(titel: string, text: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: titel, body: text, sound: false },
      trigger: null,
    });
  } catch {
    // Best effort — eine fehlgeschlagene Mitteilung darf die Wanderung nie stoeren.
  }
}
