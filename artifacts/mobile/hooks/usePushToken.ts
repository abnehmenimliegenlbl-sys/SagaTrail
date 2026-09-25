import * as Notifications from "expo-notifications";
import { useAuth } from "@clerk/expo";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { getApiBaseUrl } from "@/lib/apiConfig";

/**
 * Registriert den Expo-Push-Token des Geraets beim Server, sobald der Nutzer
 * eingeloggt ist und die Benachrichtigungsberechtigung vorliegt.
 * Fehler werden still geschluckt — die App laeuft auch ohne Push-Token.
 */
export function usePushToken(): void {
  const { isSignedIn, userId, getToken } = useAuth();
  const registeredUserRef = useRef<string | null>(null);
  const registrationInFlightRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || !userId || Platform.OS === "web") {
      registeredUserRef.current = null;
      return;
    }

    let active = true;
    const registerToken = async () => {
      if (
        !active ||
        registeredUserRef.current === userId ||
        registrationInFlightRef.current
      ) return;
      registrationInFlightRef.current = true;
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") return;
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const pushToken = tokenData.data;
        const authToken = await getToken();
        if (!authToken) return;
        const base = getApiBaseUrl();
        const url = base ? `${base}/api/me/push-token` : "/api/me/push-token";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ token: pushToken }),
        });
        if (active && response.ok) registeredUserRef.current = userId;
      } catch {
        // Beim nächsten Wechsel der App in den Vordergrund erneut versuchen.
      } finally {
        registrationInFlightRef.current = false;
      }
    };

    void registerToken();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void registerToken();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [isSignedIn, userId, getToken]);
}
