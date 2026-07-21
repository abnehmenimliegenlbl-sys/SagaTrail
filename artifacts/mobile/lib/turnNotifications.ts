import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Notifications from "expo-notifications";
import { hapticHeavy, hapticWarning } from "./haptics";

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

// Handler SOFORT beim Import setzen — nicht lazy in bereiteAbbiegeMitteilungenVor.
// Surface- und Meilenstein-Mitteilungen koennen feuern, bevor bereite... je
// aufgerufen wird; ohne fruehzeitig gesetzten Handler erscheinen sie nicht im
// Notification Center und werden von watchOS nicht gespiegelt.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      // Muss true sein: Apple Watch spiegelt nur Mitteilungen,
      // die im Notification Center (Liste) landen.
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Fragt (nativ) die Mitteilungs-Berechtigung an; liefert true bei Erlaubnis. */
export async function bereiteAbbiegeMitteilungenVor(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
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

/**
 * Loest eine POI-Mitteilung aus, waehrend der Erzaehler ueber den Ort spricht —
 * wenn moeglich MIT Bild: Das Wikipedia-Bild wird kurz in den Cache geladen und
 * als Anhang mitgegeben. iOS zeigt den Anhang auch auf einer gekoppelten Watch
 * (Bild in der gespiegelten Mitteilung). Schlaegt der Bild-Download fehl, geht
 * die Mitteilung ohne Bild raus — nie gar nicht.
 */
export async function sendePoiMitteilung(
  titel: string,
  text: string,
  bildUrl?: string | null
): Promise<void> {
  if (Platform.OS === "web") return;
  // Haptik sofort beim Senden — unabhaengig davon, ob die App im Vordergrund
  // ist. Beim Wandern liegt das Handy oft in der Tasche; der Impuls am
  // Handgelenk (Watch-Spiegelung) kommt zusaetzlich ueber die Notification.
  hapticWarning();
  let lokalesBild: string | null = null;
  if (bildUrl) {
    try {
      // Dateiendung aus der URL uebernehmen, damit iOS den Anhangstyp erkennt.
      const endung = /\.(png|gif)(\?|$)/i.test(bildUrl)
        ? bildUrl.toLowerCase().includes(".png")
          ? "png"
          : "gif"
        : "jpg";
      const ziel = `${FileSystem.cacheDirectory}poi-notif-${Date.now()}.${endung}`;
      const res = await FileSystem.downloadAsync(bildUrl, ziel);
      if (res.status === 200) lokalesBild = res.uri;
    } catch {
      // Ohne Bild weitermachen.
    }
  }
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titel,
        body: text,
        sound: false,
        // Anhaenge sind ein iOS-Konzept; Android ignoriert das Feld einfach.
        attachments: lokalesBild
          ? [{ identifier: "poi-bild", url: lokalesBild, type: null }]
          : undefined,
      },
      trigger: null,
    });
  } catch {
    // Best effort — eine fehlgeschlagene Mitteilung darf die Wanderung nie stoeren.
  }
}

/** Loest sofort eine lokale Abbiege-Mitteilung aus (nativ, best effort). */
export async function sendeAbbiegeMitteilung(titel: string, text: string): Promise<void> {
  if (Platform.OS === "web") return;
  // Starke Haptik fuer Abbiegehinweise — muss auch mit Handschuhen spuerbar sein.
  hapticHeavy();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titel,
        body: text,
        sound: false,
      },
      trigger: null,
    });
  } catch {
    // Best effort — eine fehlgeschlagene Mitteilung darf die Wanderung nie stoeren.
  }
}
