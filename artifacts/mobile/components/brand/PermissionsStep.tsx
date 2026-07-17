import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Pedometer } from "expo-sensors";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GLAS_3D } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { NATIVE_MODULES_AVAILABLE } from "@/lib/nativeEnv";
import { useOnboardingStrings } from "@/lib/i18n/screens/onboarding";
import { PermissionModal } from "./PermissionModal";

/**
 * Onboarding-Schritt, der VOR den echten OS-Berechtigungsdialogen im
 * App-Design erklaert, wofuer SagaTrail Standort, Mikrofon, Bewegung und
 * Benachrichtigungen braucht. Die eigentliche OS-Anfrage wird erst nach
 * Bestaetigung im gestylten Modal ausgeloest. Kamera wird nicht abgefragt,
 * da die App keine Kamerafunktion hat.
 */

type PermissionKey = "location" | "microphone" | "motion" | "notifications";
type PermissionStatus = "pending" | "granted" | "denied";

const ICONS: Record<PermissionKey, keyof typeof Feather.glyphMap> = {
  location: "map-pin",
  microphone: "mic",
  motion: "activity",
  notifications: "bell",
};

export function PermissionsStep() {
  const colors = useColors();
  const t = useOnboardingStrings();
  const [statuses, setStatuses] = useState<Record<PermissionKey, PermissionStatus>>({
    location: "pending",
    microphone: "pending",
    motion: "pending",
    notifications: "pending",
  });
  const [activeModal, setActiveModal] = useState<PermissionKey | null>(null);

  const requestNative = async (key: PermissionKey) => {
    if (Platform.OS === "web") {
      setStatuses((s) => ({ ...s, [key]: "granted" }));
      return;
    }
    try {
      let granted = false;
      if (key === "location") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        granted = status === "granted";
      } else if (key === "microphone") {
        if (NATIVE_MODULES_AVAILABLE) {
          const mod = await import("expo-speech-recognition");
          const perm = await mod.ExpoSpeechRecognitionModule.requestPermissionsAsync();
          granted = !!perm.granted;
        } else {
          granted = false;
        }
      } else if (key === "motion") {
        const perm = await Pedometer.requestPermissionsAsync();
        granted = !!perm.granted;
      } else if (key === "notifications") {
        const perm = await Notifications.requestPermissionsAsync();
        granted = perm.status === "granted";
      }
      setStatuses((s) => ({ ...s, [key]: granted ? "granted" : "denied" }));
    } catch {
      setStatuses((s) => ({ ...s, [key]: "denied" }));
    }
  };

  const keys: PermissionKey[] = ["location", "microphone", "motion", "notifications"];

  const activeStrings = activeModal ? t.permissions[activeModal] : null;

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
            <Pressable
              onPress={() => setActiveModal(key)}
              disabled={status === "granted"}
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
            </Pressable>
          </Animated.View>
        );
      })}

      {activeModal && activeStrings && (
        <PermissionModal
          visible
          onRequestClose={() => setActiveModal(null)}
          icon={ICONS[activeModal]}
          title={activeStrings.title}
          message={activeStrings.message}
          allowLabel={activeStrings.allow}
          skipLabel={t.permissionSkip}
          onAllow={() => {
            const key = activeModal;
            setActiveModal(null);
            requestNative(key);
          }}
          onSkip={() => setActiveModal(null)}
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
});
