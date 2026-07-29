import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { GLAS_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { SparkMountain } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { translateCanton } from "@/lib/i18n/cantonNames";
import { kantonSlug } from "@/lib/kantonSlug";
import { useReferralRewardStrings } from "@/lib/i18n/screens/referral-reward";
import { getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { alert } from "@/lib/appAlert";

const GERMAN_CANTON_NAMES = [
  "Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden",
  "Basel-Landschaft", "Basel-Stadt", "Bern", "Freiburg", "Genf",
  "Glarus", "Graubünden", "Jura", "Luzern", "Neuenburg", "Nidwalden",
  "Obwalden", "Schaffhausen", "Schwyz", "Solothurn", "St. Gallen",
  "Tessin", "Thurgau", "Uri", "Waadt", "Wallis", "Zug", "Zürich",
];

export default function ReferralReward() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { language, pendingPackRewards } = useApp();
  const queryClient = useQueryClient();
  const t = useReferralRewardStrings();

  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const selectedGermanName = GERMAN_CANTON_NAMES.find(
    (n) => kantonSlug(n) === selected,
  );

  const claim = async () => {
    if (!selected || loading) return;
    setLoading(true);
    try {
      const token = await getToken();
      const baseUrl = getApiBaseUrl() ?? "";
      const res = await fetch(`${baseUrl}/api/me/pack-reward/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ packSlug: selected }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        let msg = body;
        try { msg = JSON.parse(body)?.error ?? body; } catch {}
        throw new Error(msg || `Fehler ${res.status}`);
      }
      await queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Fehler", msg);
    } finally {
      setLoading(false);
    }
  };

  if (done && selectedGermanName) {
    const cantonLabel = translateCanton(selectedGermanName, language as any);
    return (
      <Background deep>
        <View style={[styles.successContainer, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
          <View style={styles.successIcon}>
            <Feather name="gift" size={56} color={colors.accent} />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>
            {t.successTitle}
          </Text>
          <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
            {cantonLabel} — {t.successBody}
          </Text>
          <PrimaryButton
            label={t.successButton}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)");
            }}
            style={{ marginTop: 32 }}
          />
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignSelf: "center", marginBottom: 16 }}>
          <SparkMountain size={48} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{t.title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t.subtitle}</Text>

        {pendingPackRewards > 1 && (
          <View style={[styles.badge, { borderColor: colors.accent }]}>
            <Feather name="gift" size={14} color={colors.accent} />
            <Text style={[styles.badgeText, { color: colors.accent }]}>
              ×{pendingPackRewards}
            </Text>
          </View>
        )}

        <Text style={[styles.chooseHint, { color: colors.mutedForeground }]}>{t.chooseHint}</Text>

        <View style={styles.grid}>
          {GERMAN_CANTON_NAMES.map((name) => {
            const slug = kantonSlug(name);
            const label = translateCanton(name, language as any);
            const isSelected = selected === slug;
            return (
              <Pressable
                key={slug}
                onPress={() => setSelected(slug)}
                style={[
                  styles.chip,
                  GLAS_3D,
                  {
                    borderColor: isSelected ? colors.accent : colors.glassBorder,
                    backgroundColor: isSelected ? colors.accent + "22" : colors.glassBg,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? colors.accent : colors.foreground },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          label={loading ? t.claimingButton : t.claimButton}
          onPress={claim}
          disabled={!selected || loading}
          style={{ marginTop: 32 }}
        />
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.titleBold,
    fontSize: 26,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: {
    fontFamily: fonts.mono,
    fontSize: 14,
  },
  chooseHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontFamily: fonts.titleBold,
    fontSize: 28,
    textAlign: "center",
  },
  successBody: {
    fontFamily: fonts.body,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});
