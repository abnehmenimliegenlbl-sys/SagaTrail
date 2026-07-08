import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D, GLAS_3D_STARK } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { Skeleton } from "@/components/brand/Skeleton";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { CantonWithRoutes } from "@/constants/routes";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useHomeStrings } from "@/lib/i18n/screens/home";
import { useOnboardingStrings } from "@/lib/i18n/screens/onboarding";
import { useColors } from "@/hooks/useColors";

const heroImg = require("@/assets/images/hero-valley.png");

const WEB_TOP = 67;

export default function Entdecken() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, activeHike, clearActiveHike } = useApp();
  const t = useHomeStrings();

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;
  const onboardingStrings = useOnboardingStrings();
  const archetypeTitle = profile?.archetype
    ? onboardingStrings.archetypes[profile.archetype].title
    : "";

  const { cantons, ready } = useCatalog();
  const homeCanton = profile?.homeCanton;
  const homeEntry = cantons.find((c) => c.canton === homeCanton);
  const others = cantons.filter((c) => c.canton !== homeCanton);

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {t.welcomeBack}
            </Text>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {profile?.name ?? t.defaultName}
            </Text>
            <Text style={[styles.archetype, { color: colors.accent }]}>
              {archetypeTitle}
            </Text>
          </View>
        </View>

        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
          <Image source={heroImg} style={styles.heroImg} resizeMode="cover" />
          <LinearGradient
            colors={["transparent", "rgba(16,24,26,0.95)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
              {t.step1Title}
            </Text>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>
              {t.whereStart}
            </Text>
            <Text style={[styles.heroBody, { color: colors.foreground }]}>
              {t.heroBody}
            </Text>
          </View>
        </Animated.View>

        {activeHike && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Pressable
              onPress={() =>
                router.push(
                  `/hike/${encodeURIComponent(activeHike.sagaId)}?routeId=${encodeURIComponent(activeHike.routeId)}`,
                )
              }
              style={[
                styles.resumeCard,
                { backgroundColor: colors.glassBgStrong, borderColor: colors.accent, borderRadius: colors.radius },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.resumeEyebrow, { color: colors.accent }]}>
                  {t.resumeTitle.toUpperCase()}
                </Text>
                <Text style={[styles.resumeName, { color: colors.foreground }]} numberOfLines={1}>
                  {activeHike.routeName}
                </Text>
                <Text style={[styles.resumeHint, { color: colors.mutedForeground }]}>
                  {t.resumeHint(activeHike.chapterIndex + 1, activeHike.chapterCount)}
                </Text>
                <View style={styles.resumeCtaRow}>
                  <Feather name="play" size={14} color={colors.accent} />
                  <Text style={[styles.resumeCta, { color: colors.accent }]}>{t.resumeCta}</Text>
                </View>
              </View>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  clearActiveHike();
                }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t.resumeDismiss}
                style={styles.resumeClose}
              >
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            </Pressable>
          </Animated.View>
        )}

        {homeEntry && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {t.homeCantonTitle}
              </Text>
              <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
                {t.homeCantonHint}
              </Text>
            </View>
            <View style={{ paddingHorizontal: 20 }}>
              <CantonCard
                entry={homeEntry}
                index={0}
                highlight
                onPress={() =>
                  router.push(`/kanton/${encodeURIComponent(homeEntry.canton)}`)
                }
              />
            </View>
            <SparkDivider style={{ marginHorizontal: 20, marginVertical: 24 }} />
          </>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {homeEntry ? t.otherCantonsTitle : t.cantonsTitle}
          </Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            {t.allCantonsHint(cantons.length)}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {!ready
            ? /* Kantonsliste laedt noch aus dem Speicher/Server — Skeleton-Karten
                 in Kartengroesse statt leerer Flaeche. */
              [0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={76} radius={colors.radius} style={{ marginBottom: 12 }} />
              ))
            : others.map((entry, i) => (
                <CantonCard
                  key={entry.canton}
                  entry={entry}
                  index={i}
                  onPress={() =>
                    router.push(`/kanton/${encodeURIComponent(entry.canton)}`)
                  }
                />
              ))}
        </View>

        <SparkDivider style={{ marginHorizontal: 20, marginVertical: 24 }} />

        <View style={{ paddingHorizontal: 20 }}>
          <Animated.View entering={FadeInDown.delay(others.length * 60)}>
            <Pressable
              onPress={() => router.push("/eigene-route")}
              style={[
                styles.cantonCard,
                {
                  backgroundColor: colors.glassBg,
                  borderColor: colors.glassBorder,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={styles.cantonIcon}>
                <Feather name="navigation" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cantonName, { color: colors.foreground }]}>
                  {t.customRouteTitle}
                </Text>
                <Text style={[styles.cantonMeta, { color: colors.mutedForeground }]}>
                  {t.customRouteHint}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </Background>
  );
}

function CantonCard({
  entry,
  index,
  highlight,
  onPress,
}: {
  entry: CantonWithRoutes;
  index: number;
  highlight?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const t = useHomeStrings();
  const { achievements } = useApp();
  const { sagas } = useCatalog();

  // Sagen-Fortschritt des Kantons ("2 von 3 Sagen entdeckt") — nur wenn der
  // Kanton ueberhaupt kuratierte Sagen hat.
  const cantonSagas = sagas.filter((s) => s.canton === entry.canton);
  const discovered = cantonSagas.filter((s) =>
    achievements.some((a) => a.id === s.id)
  ).length;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60)}>
      <Pressable
        onPress={onPress}
        style={[
          styles.cantonCard,
          {
            backgroundColor: colors.glassBg,
            borderColor: highlight ? colors.accent : colors.glassBorder,
            borderRadius: colors.radius,
          },
        ]}
      >
        <View style={styles.cantonIcon}>
          <Feather name="map-pin" size={18} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cantonName, { color: colors.foreground }]}>
            {entry.canton}
          </Text>
          <Text style={[styles.cantonMeta, { color: colors.mutedForeground }]}>
            {entry.routeCount > 0
              ? t.routeCount(entry.routeCount)
              : t.liveFromSwisstopo}
          </Text>
          {cantonSagas.length > 0 && (
            <Text
              style={[
                styles.cantonMeta,
                { color: discovered > 0 ? colors.accent : colors.mutedForeground },
              ]}
            >
              {t.sagaProgress(discovered, cantonSagas.length)}
            </Text>
          )}
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  resumeCard: {
    ...GLAS_3D_STARK,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    padding: 16,
  },
  resumeEyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5 },
  resumeName: { fontFamily: fonts.titleBold, fontSize: 20, marginTop: 4 },
  resumeHint: { fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  resumeCtaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  resumeCta: { fontFamily: fonts.bodyBold, fontSize: 14 },
  resumeClose: { padding: 2 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  greeting: { fontFamily: fonts.body, fontSize: 14 },
  name: { fontFamily: fonts.titleBold, fontSize: 30, marginTop: 2 },
  archetype: { fontFamily: fonts.story, fontSize: 14, marginTop: 2 },
  hero: {
    marginHorizontal: 20,
    height: 230,
    borderRadius: 18,
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  heroContent: { position: "absolute", left: 18, right: 18, bottom: 18 },
  heroEyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  heroTitle: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 6 },
  heroBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 4 },
  section: { paddingHorizontal: 20, marginTop: 28, marginBottom: 14 },
  sectionTitle: { fontFamily: fonts.titleBold, fontSize: 22 },
  sectionHint: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  cantonCard: { ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cantonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  cantonName: { fontFamily: fonts.titleBold, fontSize: 19 },
  cantonMeta: { fontFamily: fonts.mono, fontSize: 12, marginTop: 3 },
});
