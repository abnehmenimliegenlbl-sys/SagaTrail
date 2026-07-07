import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { SparkDivider, SparkMountain } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { usePaywallStrings } from "@/lib/i18n/screens/paywall";
import { useSubscription } from "@/lib/revenuecat";

const WEB_TOP = 67;

export default function Paywall() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { premium } = useApp();
  const { offerings, isLoading, purchase, restore, isPurchasing, isRestoring } =
    useSubscription();
  const t = usePaywallStrings();

  const [busy, setBusy] = useState(false);
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  // Ordnet die Pakete des aktuellen Offerings den fuenf Plaenen zu.
  // Preise kommen immer aus RevenueCat — nie hart codiert.
  type PlanKey = keyof typeof t.planNames;
  const PAKET_ZU_PLAN: Record<string, PlanKey> = {
    $rc_monthly: "monthly",
    $rc_annual: "yearly",
    family: "family",
    elite: "elite",
    elite_family: "eliteFamily",
  };
  const PLAN_REIHENFOLGE: PlanKey[] = [
    "monthly",
    "yearly",
    "family",
    "elite",
    "eliteFamily",
  ];

  const plaene = useMemo(() => {
    const pakete = offerings?.current?.availablePackages ?? [];
    return PLAN_REIHENFOLGE.flatMap((key) => {
      const paket = pakete.find((p) => PAKET_ZU_PLAN[p.identifier] === key);
      return paket ? [{ key, paket }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerings]);

  const gewaehlterPlan =
    plaene.find((p) => p.key === gewaehlt) ??
    plaene.find((p) => p.key === "yearly") ??
    plaene[0];
  const packageToBuy = gewaehlterPlan?.paket;

  const buy = async () => {
    if (!packageToBuy) return;
    setBusy(true);
    try {
      await purchase(packageToBuy);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(t.successAlertTitle, t.successAlertMsg, [
        { text: t.successAlertBtn, onPress: () => router.back() },
      ]);
    } catch (err: any) {
      if (!err?.userCancelled) {
        Alert.alert(t.purchaseErrorTitle, err?.message ?? String(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const customerInfo = await restore();
      const hasActive = !!customerInfo.entitlements.active["premium"];
      if (hasActive) {
        Alert.alert(t.restoreSuccessTitle, t.restoreSuccessMsg);
      } else {
        Alert.alert(t.restoreNoneTitle, t.restoreNoneMsg);
      }
    } catch (err: any) {
      Alert.alert(t.restoreErrorTitle, err?.message ?? t.restoreErrorMsg);
    } finally {
      setBusy(false);
    }
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
          <Text style={[styles.title, { color: colors.foreground }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: colors.accent }]}>{t.subtitle}</Text>
        </View>

        {premium ? (
          <View style={[styles.activeBox, { borderColor: colors.accent }]}>
            <Feather name="check-circle" size={22} color={colors.accent} />
            <Text style={[styles.activeText, { color: colors.foreground }]}>
              {t.activeBox}
            </Text>
          </View>
        ) : (
          <>
            <SparkDivider style={{ marginVertical: 24 }} />

            <View style={styles.features}>
              {t.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Feather name="check" size={18} color={colors.accent} />
                  <Text style={[styles.featureText, { color: colors.foreground }]}>
                    {f}
                  </Text>
                </View>
              ))}
            </View>

            {isLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
            ) : plaene.length > 0 ? (
              <View style={{ gap: 10 }}>
                {plaene.map(({ key, paket }) => {
                  const aktiv = gewaehlterPlan?.key === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setGewaehlt(key)}
                      style={[
                        styles.planCard,
                        {
                          borderColor: aktiv ? colors.accent : colors.glassBorder,
                          backgroundColor: aktiv
                            ? colors.glassBgStrong
                            : colors.glassBg,
                          borderRadius: colors.radius,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.planTitle, { color: colors.foreground }]}>
                          {t.planNames[key]}
                        </Text>
                        <Text
                          style={[styles.planTagline, { color: colors.mutedForeground }]}
                        >
                          {t.planTaglines[key]}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.planPrice, { color: colors.foreground }]}>
                          {paket.product.priceString}
                        </Text>
                        <Text style={[styles.planPer, { color: colors.mutedForeground }]}>
                          {key === "monthly" ? t.planPer : t.perYear}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.legal, { color: colors.mutedForeground }]}>
                {t.unavailableMsg}
              </Text>
            )}

            <PrimaryButton
              label={busy || isPurchasing ? t.loadingOffering : t.buyBtn}
              onPress={buy}
              disabled={!packageToBuy || busy || isPurchasing}
              style={{ marginTop: 22 }}
            />
            <Pressable
              onPress={onRestore}
              disabled={busy || isRestoring}
              style={styles.restore}
            >
              <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
                {t.restoreBtn}
              </Text>
            </Pressable>

            <Text style={[styles.legal, { color: colors.mutedForeground }]}>
              {t.legalText}
            </Text>
          </>
        )}
      </ScrollView>
    </Background>
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
  planCard: {
    ...GLAS_3D,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  planTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  planTagline: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  planPrice: { fontFamily: fonts.monoBold, fontSize: 18 },
  planPer: { fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
  restore: { alignItems: "center", paddingVertical: 16 },
  restoreText: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  legal: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 8,
  },
  activeBox: { ...GLAS_3D,
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
