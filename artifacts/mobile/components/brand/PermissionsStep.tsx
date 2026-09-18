import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Pedometer } from "expo-sensors";
import React, { useEffect, useState } from "react";
import {
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GLAS_3D } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { NATIVE_MODULES_AVAILABLE } from "@/lib/nativeEnv";
import { useOnboardingStrings } from "@/lib/i18n/screens/onboarding";
import {
  isSpeechPermissionGranted,
  readSpeechPermissionWithRetry,
} from "@/lib/speechPermission";
import { PrimaryButton } from "./PrimaryButton";

/**
 * Onboarding-Schritt, der die Pflichtberechtigungen in einer einzigen
 * sequenziellen Aktion anfordert. Die einzelnen Karten zeigen nur den
 * Status; Kamera bleibt eine optionale, kontextbezogene Funktion.
 */

type PermissionKey = "location" | "microphone" | "motion" | "notifications";
type PermissionStatus = "pending" | "granted" | "denied";

const ICONS: Record<PermissionKey, keyof typeof Feather.glyphMap> = {
  location: "map-pin",
  microphone: "mic",
  motion: "activity",
  notifications: "bell",
};

export function PermissionsStep({
  onAllGrantedChange,
}: {
  onAllGrantedChange?: (granted: boolean) => void;
}) {
  const colors = useColors();
  const t = useOnboardingStrings();
  const [statuses, setStatuses] = useState<Record<PermissionKey, PermissionStatus>>({
    location: "pending",
    microphone: "pending",
    motion: "pending",
    notifications: "pending",
  });
  const [requestingAll, setRequestingAll] = useState(false);
  const [settingsBlocked, setSettingsBlocked] = useState<
    Partial<Record<PermissionKey, boolean>>
  >({});

  useEffect(() => {
    let cancelled = false;
    const readStatuses = async () => {
      if (Platform.OS === "web") {
        setStatuses({
          location: "granted",
          microphone: "granted",
          motion: "granted",
          notifications: "granted",
        });
        return;
      }
      try {
        const foregroundLocation = await Location.getForegroundPermissionsAsync();
        const microphone = NATIVE_MODULES_AVAILABLE
          ? await readSpeechPermissionWithRetry(async () =>
              (await import("expo-speech-recognition")).ExpoSpeechRecognitionModule.getPermissionsAsync()
            )
          : "denied";
        const motion = await Pedometer.getPermissionsAsync();
        const notifications = await Notifications.getPermissionsAsync();
        if (cancelled) return;
        setStatuses({
          location:
            foregroundLocation.status === Location.PermissionStatus.GRANTED
              ? "granted"
              : "pending",
          microphone: microphone === "granted" ? "granted" : "pending",
          motion: motion.granted ? "granted" : "pending",
          notifications: notifications.granted ? "granted" : "pending",
        });
      } catch {
        // Die einzelnen Karten bleiben ausstehend und können erneut gestartet
        // werden, falls ein Gerät den Status nicht lesen kann.
      }
    };
    void readStatuses();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void readStatuses();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  const keys: PermissionKey[] = ["location", "microphone", "motion", "notifications"];
  // Kamera ist bewusst nicht Teil dieses Gates. Alle Berechtigungen, die
  // für Onboarding und den vollständigen Wanderfluss benötigt werden, müssen
  // hier gemeinsam bestätigt sein.
  const allGranted = keys.every((key) => statuses[key] === "granted");

  useEffect(() => {
    onAllGrantedChange?.(allGranted);
  }, [allGranted, onAllGrantedChange]);

  const requestNative = async (key: PermissionKey) => {
    if (Platform.OS === "web") {
      setStatuses((s) => ({ ...s, [key]: "granted" }));
      return { granted: true, canAskAgain: true };
    }
    try {
      let granted = false;
      let canAskAgain = true;
      if (key === "location") {
        const foreground = await Location.requestForegroundPermissionsAsync();
        // Foreground access is sufficient for live navigation. Background
        // tracking remains optional and is requested only when needed by an
        // active hike, so onboarding is not blocked by iOS's separate
        // "Always" decision.
        granted = foreground.status === Location.PermissionStatus.GRANTED;
        canAskAgain = foreground.canAskAgain;
      } else if (key === "microphone") {
        if (NATIVE_MODULES_AVAILABLE) {
          const mod = await import("expo-speech-recognition");
          const perm = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
          granted = isSpeechPermissionGranted(perm);
          canAskAgain = perm.canAskAgain;
        } else {
          granted = false;
        }
      } else if (key === "motion") {
        const perm = await Pedometer.requestPermissionsAsync();
        granted = !!perm.granted;
        canAskAgain = perm.canAskAgain;
      } else if (key === "notifications") {
        const perm = await Notifications.requestPermissionsAsync();
        granted = perm.status === "granted";
        canAskAgain = perm.canAskAgain;
      }
      setStatuses((s) => ({ ...s, [key]: granted ? "granted" : "denied" }));
      setSettingsBlocked((s) => ({ ...s, [key]: !canAskAgain }));
      return { granted, canAskAgain };
    } catch {
      setStatuses((s) => ({ ...s, [key]: "denied" }));
      return { granted: false, canAskAgain: true };
    }
  };

  const requestAll = async () => {
    if (requestingAll || allGranted) return;
    setRequestingAll(true);
    try {
      let requiresSettings = false;
      for (const key of keys) {
        if (statuses[key] !== "granted") {
          const result = await requestNative(key);
          if (!result.granted && !result.canAskAgain) {
            requiresSettings = true;
          }
        }
      }
      if (requiresSettings) {
        await Linking.openSettings();
      }
    } finally {
      setRequestingAll(false);
    }
  };

  const requestOne = async (key: PermissionKey) => {
    const result = await requestNative(key);
    if (!result.granted && !result.canAskAgain && Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch {
        // Die Karte bleibt sichtbar und kann nach einer manuellen Änderung
        // beim nächsten App-Fokus erneut gelesen werden.
      }
    }
  };

  return (
    <View>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        {t.permissionsHint}
      </Text>
      {keys.map((key, i) => {
        const status = statuses[key];
        const strings = t.permissions[key];
        return (
          <Animated.View key={key} entering={FadeInDown.delay(i * 70)}>
            <View
              style={[
                styles.card,
                {
                  borderColor:
                    status === "granted" ? colors.accent : colors.glassBorder,
                  backgroundColor:
                    status === "granted" ? colors.glassBgStrong : colors.glassBg,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                ]}
              >
                <Feather name={ICONS[key]} size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {strings.title}
                </Text>
                <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
                  {strings.message}
                </Text>
              </View>
              <Text
                style={[
                  styles.status,
                  {
                    color:
                      status === "granted"
                        ? colors.accent
                        : status === "denied"
                          ? colors.destructive
                          : colors.mutedForeground,
                  },
                ]}
              >
                {status === "granted"
                  ? t.permissionStatusGranted
                  : status === "denied"
                    ? t.permissionStatusDenied
                    : t.permissionStatusPending}
              </Text>
              {status !== "granted" && (
                <Pressable
                  onPress={() =>
                    void (settingsBlocked[key]
                      ? Linking.openSettings()
                      : requestOne(key))
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    settingsBlocked[key]
                      ? "Systemeinstellungen öffnen"
                      : `${strings.title} erlauben`
                  }
                  style={[styles.permissionAction, { borderColor: colors.accent }]}
                >
                  <Feather
                    name={settingsBlocked[key] ? "settings" : "check"}
                    size={14}
                    color={colors.accent}
                  />
                </Pressable>
              )}
            </View>
          </Animated.View>
        );
      })}

      {!allGranted && (
        <PrimaryButton
          label={t.permissionAllowAll}
          onPress={requestAll}
          loading={requestingAll}
          disabled={requestingAll}
          style={{ marginTop: 4 }}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginBottom: 18 },
  card: {
    ...GLAS_3D,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontFamily: fonts.titleBold, fontSize: 16 },
  cardBody: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  status: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.5 },
  permissionAction: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
