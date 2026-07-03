import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { AchievementMarker, SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { useOnboardingStrings } from "@/lib/i18n/screens/onboarding";
import { useSummaryStrings } from "@/lib/i18n/screens/summary";

const WEB_TOP = 67;

export default function Summary() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lastHike, profile } = useApp();

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;
  const onboardingStrings = useOnboardingStrings();
  const t = useSummaryStrings();
  const archetype = profile?.archetype
    ? onboardingStrings.archetypes[profile.archetype].title
    : undefined;

  if (!lastHike) {
    return (
      <Background>
        <View style={styles.center}>
          <Text style={{ color: colors.foreground, fontFamily: fonts.titleBold }}>
            {t.noHikeFound}
          </Text>
          <PrimaryButton label={t.backToOverview} onPress={() => router.replace("/")} />
        </View>
      </Background>
    );
  }

  const decisions = lastHike.chapters.filter((c) => c.isDecisionPoint);

  const share = async () => {
    const text = t.shareTextTemplate(lastHike.routeName, lastHike.distanceKm);
    if (Platform.OS === "web") {
      return;
    }
    try {
      await Share.share({ message: text });
    } catch {
      // Teilen abgebrochen — kein Fehlerzustand noetig
    }
  };

  return (
    <Background deep>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 22,
          paddingBottom: insets.bottom + 60,
        }}
      >
        <Animated.View entering={FadeIn} style={styles.hero}>
          <AchievementMarker size={100} unlocked />
          <Text style={[styles.unlocked, { color: colors.accent }]}>
            {t.achievementUnlocked}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {lastHike.routeName}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {t.archetypeSub(archetype ?? "")}
          </Text>
        </Animated.View>

        <SparkDivider style={{ marginVertical: 26 }} />

        <Animated.View entering={FadeInDown} style={styles.statsRow}>
          <Stat value={`${lastHike.distanceKm}`} unit="km" label={t.stats.distance} />
          <Stat value={`${lastHike.ascentM}`} unit="hm" label={t.stats.ascent} />
          <Stat value={lastHike.sacScale} unit="" label={t.stats.sac} />
          <Stat value={`${lastHike.chapters.length}`} unit="" label={t.stats.chapters} />
        </Animated.View>

        {decisions.length > 0 && (
          <View style={{ marginTop: 30 }}>
            <Text style={[styles.blockTitle, { color: colors.foreground }]}>
              {t.blockTitle}
            </Text>
            {decisions.map((d) => {
              const chosen =
                d.chosenOptionIndex != null
                  ? d.decision?.options[d.chosenOptionIndex]
                  : null;
              return (
                <View
                  key={d.id}
                  style={[
                    styles.decisionCard,
                    { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                  ]}
                >
                  <Text style={[styles.decisionQ, { color: colors.mutedForeground }]}>
                    {d.decision?.question}
                  </Text>
                  <Text style={[styles.decisionA, { color: colors.foreground }]}>
                    {chosen ? chosen.label : t.noChoiceMade}
                  </Text>
                  {chosen && (
                    <Text style={[styles.decisionTone, { color: colors.accent }]}>
                      {chosen.archetypeHint}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={share}
          style={[styles.shareBtn, { borderColor: colors.glassBorder }]}
        >
          <Feather name="share-2" size={18} color={colors.foreground} />
          <Text style={[styles.shareText, { color: colors.foreground }]}>
            {t.shareBtn}
          </Text>
        </Pressable>

        <PrimaryButton
          label={t.backButton}
          onPress={() => router.replace("/")}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </Background>
  );
}

function Stat({ value, unit, label }: { value: string; unit: string; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.stat}>
      <View style={styles.statValRow}>
        <Text style={[styles.statVal, { color: colors.foreground }]}>{value}</Text>
        {unit ? <Text style={[styles.statUnit, { color: colors.accent }]}>{unit}</Text> : null}
      </View>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  hero: { alignItems: "center", marginTop: 12 },
  unlocked: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, marginTop: 18 },
  title: { fontFamily: fonts.titleBlack, fontSize: 32, marginTop: 8, textAlign: "center" },
  sub: { fontFamily: fonts.story, fontSize: 15, marginTop: 6 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "center", flex: 1 },
  statValRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  statVal: { fontFamily: fonts.monoBold, fontSize: 26 },
  statUnit: { fontFamily: fonts.mono, fontSize: 12 },
  statLabel: { fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  blockTitle: { fontFamily: fonts.titleBold, fontSize: 22, marginBottom: 14 },
  decisionCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 12 },
  decisionQ: { fontFamily: fonts.body, fontSize: 13 },
  decisionA: { fontFamily: fonts.story, fontSize: 17, marginTop: 6, lineHeight: 24 },
  decisionTone: { fontFamily: fonts.mono, fontSize: 11, marginTop: 6 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 30,
  },
  shareText: { fontFamily: fonts.bodyMedium, fontSize: 15 },
});
