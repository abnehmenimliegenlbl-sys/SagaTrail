import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { SparkDivider, SparkMountain } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const WEB_TOP = 67;

const FEATURES = [
  "Alle 26 Kantone und ihre Sagen",
  "Unbegrenzte Wanderungen",
  "Erweiterte Charakter-Anpassung",
  "Alle Archetypen und Erzählstimmen",
  "Gruppenmodus ohne Limit",
];

type Plan = "monat" | "jahr";

export default function Paywall() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { unlockPremium, premium } = useApp();

  const [plan, setPlan] = useState<Plan>("jahr");
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  const buy = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    unlockPremium();
    Alert.alert(
      "Willkommen bei Premium",
      "Alle Kantone und Sagen sind jetzt freigeschaltet.",
      [{ text: "Los geht's", onPress: () => router.back() }]
    );
  };

  return (
    <Background deep>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <View style={styles.closeRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={26} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <SparkMountain size={90} pulsing />
          <Text style={[styles.title, { color: colors.foreground }]}>
            SAGATRAIL PREMIUM
          </Text>
          <Text style={[styles.subtitle, { color: colors.accent }]}>
            Die ganze Schweiz und all ihre Legenden
          </Text>
        </View>

        {premium ? (
          <View style={[styles.activeBox, { borderColor: colors.accent }]}>
            <Feather name="check-circle" size={22} color={colors.accent} />
            <Text style={[styles.activeText, { color: colors.foreground }]}>
              Premium ist bereits aktiv. Viel Freude auf allen Wegen.
            </Text>
          </View>
        ) : (
          <>
            <SparkDivider style={{ marginVertical: 24 }} />

            <View style={styles.features}>
              {FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Feather name="check" size={18} color={colors.accent} />
                  <Text style={[styles.featureText, { color: colors.foreground }]}>
                    {f}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.plans}>
              <PlanCard
                active={plan === "jahr"}
                onPress={() => setPlan("jahr")}
                title="Jahresabo"
                price="CHF 59.–"
                per="/ Jahr"
                badge="2 Monate gratis"
              />
              <PlanCard
                active={plan === "monat"}
                onPress={() => setPlan("monat")}
                title="Monatsabo"
                price="CHF 6.90"
                per="/ Monat"
              />
            </View>

            <PrimaryButton
              label={plan === "jahr" ? "Jahresabo starten" : "Monatsabo starten"}
              onPress={buy}
              style={{ marginTop: 22 }}
            />
            <Pressable
              onPress={() =>
                Alert.alert(
                  "Kauf wiederherstellen",
                  "In diesem Erststart-Build sind noch keine echten Käufe hinterlegt."
                )
              }
              style={styles.restore}
            >
              <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
                Kauf wiederherstellen
              </Text>
            </Pressable>

            <Text style={[styles.legal, { color: colors.mutedForeground }]}>
              Abonnement verlängert sich automatisch, bis es gekündigt wird. In
              diesem Build werden keine echten Zahlungen ausgelöst.
            </Text>
          </>
        )}
      </ScrollView>
    </Background>
  );
}

function PlanCard({
  active,
  onPress,
  title,
  price,
  per,
  badge,
}: {
  active: boolean;
  onPress: () => void;
  title: string;
  price: string;
  per: string;
  badge?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.planCard,
        {
          borderColor: active ? colors.accent : colors.glassBorder,
          backgroundColor: active ? colors.glassBgStrong : colors.glassBg,
          borderRadius: colors.radius,
        },
      ]}
    >
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.badgeText, { color: colors.accentForeground }]}>
            {badge.toUpperCase()}
          </Text>
        </View>
      ) : null}
      <Text style={[styles.planTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.planPrice, { color: colors.foreground }]}>{price}</Text>
      <Text style={[styles.planPer, { color: colors.mutedForeground }]}>{per}</Text>
      <View
        style={[
          styles.radio,
          {
            borderColor: active ? colors.accent : colors.glassBorder,
            backgroundColor: active ? colors.accent : "transparent",
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  closeRow: { alignItems: "flex-end", marginBottom: 6 },
  hero: { alignItems: "center", marginTop: 6 },
  title: {
    fontFamily: fonts.titleBlack,
    fontSize: 30,
    letterSpacing: 2,
    marginTop: 16,
    textAlign: "center",
  },
  subtitle: { fontFamily: fonts.story, fontSize: 15, marginTop: 6, textAlign: "center" },
  features: { gap: 14, marginBottom: 24 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { fontFamily: fonts.bodyMedium, fontSize: 15, flex: 1 },
  plans: { flexDirection: "row", gap: 12 },
  planCard: { flex: 1, borderWidth: 1, padding: 18, minHeight: 140 },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  badgeText: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.5 },
  planTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  planPrice: { fontFamily: fonts.monoBold, fontSize: 24, marginTop: 10 },
  planPer: { fontFamily: fonts.mono, fontSize: 12, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    marginTop: 14,
  },
  restore: { alignItems: "center", paddingVertical: 16 },
  restoreText: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  legal: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 8,
  },
  activeBox: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: 30,
  },
  activeText: { fontFamily: fonts.body, fontSize: 15, flex: 1, lineHeight: 22 },
});
