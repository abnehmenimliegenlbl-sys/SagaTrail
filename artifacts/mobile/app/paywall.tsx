import { Feather } from "@expo/vector-icons";
import { hapticError, hapticSelection, hapticSuccess } from "@/lib/haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { alert } from "@/lib/appAlert";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { Skeleton } from "@/components/brand/Skeleton";
import { SparkDivider, SparkMountain } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { usePaywallStrings } from "@/lib/i18n/screens/paywall";
import { useSharedStrings } from "@/lib/i18n/screens/shared";
import { iapLog, useSubscription } from "@/lib/revenuecat";

const WEB_TOP = 67;

export default function Paywall() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { premium } = useApp();
  const {
    offerings,
    isElite,
    isFamily,
    isLoading,
    purchase,
    restore,
    isPurchasing,
    isRestoring,
  } = useSubscription();
  const t = usePaywallStrings();
  const ts = useSharedStrings();

  const [busy, setBusy] = useState(false);
  const [buyingKey, setBuyingKey] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  const upgradeMode = premium && !isElite;
  const defaultUpgradePlan: PlanKey = isFamily ? "eliteFamily" : "elite";

  const plaene = useMemo(() => {
    const pakete = offerings?.current?.availablePackages ?? [];
    const reihenfolge = upgradeMode
      ? (["elite", "eliteFamily"] as PlanKey[])
      : PLAN_REIHENFOLGE;
    return reihenfolge.flatMap((key) => {
      const paket = pakete.find((p) => PAKET_ZU_PLAN[p.identifier] === key);
      return paket ? [{ key, paket }] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerings, upgradeMode]);

  const isBuying = buyingKey !== null || isPurchasing;

  const buy = async (planKey: PlanKey, pkg: (typeof plaene)[0]["paket"]) => {
    if (isBuying) return;
    iapLog("paywall.buy: Tippe auf Plan", {
      planKey,
      identifier: pkg.identifier,
      productId: pkg.product.identifier,
    });
    setBuyingKey(planKey);
    hapticSelection();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setBuyingKey(null);
      iapLog("paywall.buy: 45s-Timeout ausgeloest — Kauf haengt");
      alert(t.purchaseErrorTitle, t.purchaseTimeoutMsg);
    }, 45000);
    try {
      await purchase(pkg);
      clearTimeout(timeoutId);
      if (timedOut) {
        iapLog("paywall.buy: Kauf kam nach Timeout noch durch");
        return;
      }
      iapLog("paywall.buy: Kauf-Promise aufgeloest, navigiere weiter");
      hapticSuccess();
      const istPremiumPlan = ["monthly", "yearly", "family"].includes(planKey);
      setTimeout(() => {
        if (!mountedRef.current) return;
        if (istPremiumPlan) {
          router.replace("/welcome-sagenpaket");
        } else {
          router.back();
        }
      }, 600);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (timedOut) return;
      hapticError();
      iapLog("paywall.buy: Kauf-Promise abgelehnt", {
        code: err?.code,
        message: err?.message,
        userCancelled: err?.userCancelled,
      });
      const errStr = String(err?.message ?? err?.underlyingErrorMessage ?? "");
      const bereitsAbonniert =
        err?.code === "2" ||
        err?.code === 2 ||
        /already\s+(subscribed|purchased|owns|active)/i.test(errStr) ||
        /receipt.*(not valid|invalid)|invalid.*receipt/i.test(errStr);
      if (bereitsAbonniert) {
        iapLog("paywall.buy: als 'bereits abonniert' erkannt, starte restorePurchases", {
          code: err?.code,
          errStr,
        });
        try {
          await restore();
        } catch (restoreErr) {
          iapLog("paywall.buy: restorePurchases fehlgeschlagen", {
            message:
              restoreErr instanceof Error
                ? restoreErr.message
                : String(restoreErr),
          });
        }
        setTimeout(() => {
          if (!mountedRef.current) return;
          alert(t.restoreSuccessTitle, t.restoreSuccessMsg);
        }, 600);
      } else if (!err?.userCancelled) {
        setTimeout(() => {
          if (!mountedRef.current) return;
          alert(t.purchaseErrorTitle, err?.message ?? String(err));
        }, 600);
      }
    } finally {
      clearTimeout(timeoutId);
      if (!timedOut) setBuyingKey(null);
    }
  };

  const onRestore = async () => {
    iapLog("paywall.onRestore: Tippe auf Wiederherstellen");
    setBusy(true);
    try {
      const customerInfo = await restore();
      const hasActive = !!customerInfo.entitlements.active["premium"];
      iapLog("paywall.onRestore: Ergebnis", { hasActive });
      setTimeout(() => {
        if (!mountedRef.current) return;
        if (hasActive) {
          alert(t.restoreSuccessTitle, t.restoreSuccessMsg);
        } else {
          alert(t.restoreNoneTitle, t.restoreNoneMsg);
        }
      }, 600);
    } catch (err: any) {
      iapLog("paywall.onRestore: Fehler", {
        code: err?.code,
        message: err?.message,
      });
      setTimeout(() => {
        if (!mountedRef.current) return;
        alert(t.restoreErrorTitle, err?.message ?? t.restoreErrorMsg);
      }, 600);
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
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={ts.close}
          >
            <Feather name="x" size={26} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <SparkMountain size={90} pulsing />
          <Text style={[styles.title, { color: colors.foreground }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: colors.accent }]}>{t.subtitle}</Text>
        </View>

        {isElite ? (
          <View style={[styles.activeBox, { borderColor: colors.accent }]}>
            <Feather name="check-circle" size={22} color={colors.accent} />
            <Text style={[styles.activeText, { color: colors.foreground }]}>
              {t.activeBox}
            </Text>
          </View>
        ) : (
          <>
            <SparkDivider style={{ marginVertical: 24 }} />

            {upgradeMode ? (
              <View style={[styles.activeBox, { borderColor: colors.glassBorder, marginBottom: 20 }]}>
                <Feather name="zap" size={22} color={colors.accent} />
                <Text style={[styles.activeText, { color: colors.foreground }]}>
                  {isFamily ? t.upgradeFamilyBox : t.upgradeBox}
                </Text>
              </View>
            ) : (
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
            )}

            {isLoading ? (
              <View style={{ gap: 10 }}>
                {(upgradeMode ? ["elite", "eliteFamily"] : PLAN_REIHENFOLGE).map((key) => (
                  <Skeleton key={key} height={74} radius={colors.radius} />
                ))}
              </View>
            ) : plaene.length > 0 ? (
              <View style={{ gap: 10 }}>
                {plaene.map(({ key, paket }) => {
                  const isThisBuying = buyingKey === key;
                  const disabled = isBuying || busy || isRestoring;
                  const badge = t.planBadges[key];
                  return (
                    <Pressable
                      key={key}
                      onPress={() => buy(key, paket)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityLabel={`${t.planNames[key]} — ${paket.product.priceString}`}
                      style={({ pressed }) => [
                        styles.planCard,
                        {
                          borderColor: isThisBuying
                            ? colors.accent
                            : colors.glassBorder,
                          backgroundColor:
                            pressed && !disabled
                              ? colors.glassBgStrong
                              : colors.glassBg,
                          borderRadius: colors.radius,
                          opacity: disabled && !isThisBuying ? 0.45 : 1,
                        },
                      ]}
                    >
                      {badge ? (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: colors.accent },
                          ]}
                        >
                          <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                      ) : null}

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.planTitle, { color: colors.foreground }]}>
                          {t.planNames[key]}
                        </Text>
                        <Text style={[styles.planTagline, { color: colors.mutedForeground }]}>
                          {t.planTaglines[key]}
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end", minWidth: 72 }}>
                        {isThisBuying ? (
                          <ActivityIndicator color={colors.accent} size="small" />
                        ) : (
                          <>
                            <Text style={[styles.planPrice, { color: colors.foreground }]}>
                              {paket.product.priceString}
                            </Text>
                            <Text style={[styles.planPer, { color: colors.mutedForeground }]}>
                              {key === "monthly" ? t.planPer : t.perYear}
                            </Text>
                          </>
                        )}
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

            <Pressable
              onPress={onRestore}
              disabled={busy || isRestoring || isBuying}
              style={styles.restore}
              accessibilityRole="button"
              accessibilityLabel={t.restoreBtn}
            >
              <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
                {busy || isRestoring ? "…" : t.restoreBtn}
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
    overflow: "visible",
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    zIndex: 1,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#fff",
    letterSpacing: 0.3,
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
  activeBox: {
    ...GLAS_3D,
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
