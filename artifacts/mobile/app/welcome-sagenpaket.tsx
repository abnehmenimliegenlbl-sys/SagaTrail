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
import { useWelcomeSagenpaketStrings } from "@/lib/i18n/screens/welcome-sagenpaket";
import { getGetMyProfileQueryKey } from "@workspace/api-client-react";

const GERMAN_CANTON_NAMES = [
  "Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden",
  "Basel-Landschaft", "Basel-Stadt", "Bern", "Freiburg", "Genf",
  "Glarus", "Graubünden", "Jura", "Luzern", "Neuenburg", "Nidwalden",
  "Obwalden", "Schaffhausen", "Schwyz", "Solothurn", "St. Gallen",
  "Tessin", "Thurgau", "Uri", "Waadt", "Wallis", "Zug", "Zürich",
];

export default function WelcomeSagenpaket() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const { language } = useApp();
  const queryClient = useQueryClient();
  const t = useWelcomeSagenpaketStrings();

  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const selectedGermanName = GERMAN_CANTON_NAMES.find(
    (n) => kantonSlug(n) === selected
  );

  const claim = async () => {
    if (!selected || loading) return;
    setLoading(true);
    try {
      const token = await getToken();
      const baseUrl = getApiBaseUrl() ?? "";
      const res = await fetch(`${baseUrl}/api/me/welcome-sagenpaket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ kanton: selected }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        throw new Error(err || `Server-Fehler ${res.status}`);
      }
      await queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      setDone(true);
    } catch {
      // Fehler werden im UI als alert angezeigt — hier nur loading zurücksetzen.
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
          <Text style={[styles.successMsg, { color: colors.mutedForeground }]}>
            {t.successMsg.replace("{{canton}}", cantonLabel)}
          </Text>
          <View style={{ marginTop: 32, width: "100%" }}>
            <PrimaryButton
              label={t.successBtn}
              onPress={() => router.back()}
            />
          </View>
        </View>
      </Background>
    );
  }

  return (
    <Background deep>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Feather name="gift" size={44} color={colors.accent} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            {t.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t.subtitle}
          </Text>
        </View>

        <Text style={[styles.chooseLabel, { color: colors.mutedForeground }]}>
          {t.chooseLabel}
        </Text>

        <View style={styles.grid}>
          {GERMAN_CANTON_NAMES.map((germanName) => {
            const slug = kantonSlug(germanName);
            const label = translateCanton(germanName, language as any);
            const isSelected = selected === slug;
            return (
              <Pressable
                key={slug}
                onPress={() => setSelected(slug)}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ checked: isSelected }}
                style={[
                  styles.cantonCard,
                  GLAS_3D,
                  {
                    borderColor: isSelected ? colors.accent : colors.glassBorder,
                    backgroundColor: isSelected ? colors.glassBgStrong : colors.glassBg,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                {isSelected && (
                  <Feather
                    name="check"
                    size={14}
                    color={colors.accent}
                    style={styles.checkIcon}
                  />
                )}
                <Text
                  style={[
                    styles.cantonName,
                    { color: isSelected ? colors.accent : colors.foreground },
                  ]}
                  numberOfLines={2}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + 16, borderTopColor: colors.glassBorder },
        ]}
      >
        <PrimaryButton
          label={loading ? t.loadingBtn : t.confirmBtn}
          onPress={claim}
          disabled={!selected || loading}
        />
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
    paddingTop: 8,
  },
  title: {
    fontFamily: fonts.titleBold,
    fontSize: 22,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  chooseLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cantonCard: {
    width: "47.5%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    minHeight: 52,
    justifyContent: "center",
    position: "relative",
  },
  checkIcon: {
    position: "absolute",
    top: 7,
    right: 9,
  },
  cantonName: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 17,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    fontSize: 24,
    textAlign: "center",
  },
  successMsg: {
    fontFamily: fonts.body,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
