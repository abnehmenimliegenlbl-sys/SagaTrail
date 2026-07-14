import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
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
import { PrimaryButton } from "@/components/brand/PrimaryButton";
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
    refreshCustomerInfo,
  } = useSubscription();
  const t = usePaywallStrings();
  const ts = useSharedStrings();

  const [busy, setBusy] = useState(false);
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  // Verhindert, dass ein verzoegert geplanter Dialog (siehe buy()/onRestore())
  // noch praesentiert wird, nachdem der Nutzer diesen Screen bereits manuell
  // verlassen hat — ein natives Modal ausserhalb des noch aktiven Screens
  // praesentieren kann auf iOS zu einem UI-Deadlock (kompletter App-Freeze)
  // fuehren, wenn es mit einer laufenden Navigations-Transition kollidiert.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  // Premium-Upgrade-Modus: bereits Premium, aber noch kein Elite — nur
  // Elite-Pläne anzeigen, damit der Nutzer direkt upgraden kann.
  const upgradeMode = premium && !isElite;
  // Familien-Upgrade: Familien-Abo aktiv → Elite Familie vorauswählen.
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

  const gewaehlterPlan =
    plaene.find((p) => p.key === gewaehlt) ??
    (upgradeMode
      ? plaene.find((p) => p.key === defaultUpgradePlan)
      : plaene.find((p) => p.key === "yearly")) ??
    plaene[0];
  const packageToBuy = gewaehlterPlan?.paket;

  const buy = async () => {
    if (!packageToBuy) return;
    iapLog("paywall.buy: Tippe auf Kaufen", {
      identifier: packageToBuy.identifier,
      productId: packageToBuy.product.identifier,
    });
    setBusy(true);
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setBusy(false);
      iapLog("paywall.buy: 45s-Timeout ausgeloest — Kauf haengt");
      alert(t.purchaseErrorTitle, t.purchaseTimeoutMsg);
    }, 45000);
    try {
      await purchase(packageToBuy);
      clearTimeout(timeoutId);
      if (timedOut) {
        iapLog("paywall.buy: Kauf kam nach Timeout noch durch");
        return;
      }
      iapLog("paywall.buy: Kauf-Promise aufgeloest, navigiere zurueck");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      // Apples nativer Kauf-Dialog (StoreKit-Sheet) ist zu diesem Zeitpunkt
      // oft noch nicht vollstaendig ausgeblendet. Kurze Verzoegerung laesst
      // StoreKit die Uebergabe sauber abschliessen, bevor wir navigieren —
      // sonst kollidieren zwei UIKit-Transitionen und die App friert ein.
      setTimeout(() => {
        if (!mountedRef.current) return;
        router.back();
      }, 600);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (timedOut) return;
      iapLog("paywall.buy: Kauf-Promise abgelehnt", {
        code: err?.code,
        message: err?.message,
        userCancelled: err?.userCancelled,
      });
      // StoreKit/Play meldet manchmal "bereits abonniert" statt den Kauf
      // erfolgreich zurueckzugeben (z.B. nach Neuinstallation, oder wenn
      // unser lokaler Sync das aktive Abo noch nicht mitbekommen hat — vgl.
      // Screenshot-Bug: natives "You are currently subscribed"-Sheet ueber
      // "Angebot wird geladen"). Das ist kein Fehler, sondern ein Erfolg,
      // den wir sonst faelschlich als Kauf-Fehler anzeigen wuerden UND der
      // ohne den Refetch hier nie zu einem premium-Sync fuehrt.
      //
      // "The receipt is not valid" tritt ebenfalls auf, wenn Apple dem Nutzer
      // das "bereits abonniert"-Sheet zeigt und er OK tippt: StoreKit liefert
      // dann die bestehende Quittung, die RevenueCat bereits kennt oder die
      // aus einem anderen RC-Projekt stammt (z.B. nach einem API-Key-Wechsel).
      // Auch das ist kein Fehler — wir erzwingen restorePurchases(), das alle
      // Quittungen neu validiert und dem aktuellen RC-Customer zuordnet.
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
          // restorePurchases() ist gruendlicher als refreshCustomerInfo():
          // Es schickt alle lokalen StoreKit-Quittungen erneut an RC und
          // verknuepft sie mit dem aktuellen Customer — deckt auch den Fall
          // ab, dass ein frueherer Kauf mit einem anderen API-Key gemacht
          // wurde (dann hilft refreshCustomerInfo nicht).
          await restore();
        } catch (restoreErr) {
          // Nicht fatal: der naechste automatische Abgleich (AppContext)
          // oder ein manueller "Kauf wiederherstellen" greift spaeter.
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
      if (!timedOut) setBusy(false);
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
          // Bereits Elite — nichts mehr zu kaufen
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
              // Upgrade-Banner: Premium vorhanden, Elite fehlt noch
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
              /* Skeleton-Karten in Plangroesse — kein Layout-Sprung, wenn die
                 echten Preiskarten von RevenueCat eintreffen. */
              <View style={{ gap: 10 }}>
                {(upgradeMode ? ["elite", "eliteFamily"] : PLAN_REIHENFOLGE).map((key) => (
                  <Skeleton key={key} height={74} radius={colors.radius} />
                ))}
              </View>
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
              label={busy || isPurchasing ? t.loadingOffering : upgradeMode ? t.upgradeBtn : t.buyBtn}
              variant={upgradeMode ? "gold" : "primary"}
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
