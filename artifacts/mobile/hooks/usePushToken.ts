import * as Notifications from "expo-notifications";
import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import { Platform } from "react-native";
import { getApiBaseUrl } from "@/lib/apiConfig";

/**
 * Registriert den Expo-Push-Token des Geraets beim Server, sobald der Nutzer
 * eingeloggt ist und die Benachrichtigungsberechtigung vorliegt.
 * Fehler werden still geschluckt — die App laeuft auch ohne Push-Token.
 */
export function usePushToken(): void {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isSignedIn || Platform.OS === "web") return;
    void (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") return;
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const pushToken = tokenData.data;
        const authToken = await getToken();
        if (!authToken) return;
        const base = getApiBaseUrl();
        const url = base ? `${base}/api/me/push-token` : "/api/me/push-token";
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token: pushToken }),
        });
      } catch {
        // Push-Token-Registrierung nicht kritisch
      }
    })();
  }, [isSignedIn]);
}
