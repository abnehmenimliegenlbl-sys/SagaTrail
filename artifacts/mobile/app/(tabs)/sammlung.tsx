import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { CantonWappen } from "@/components/brand/CantonWappen";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { AchievementMarker, SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useColors } from "@/hooks/useColors";
import { useCollectionStrings } from "@/lib/i18n/screens/collection";
import { computeRankStatus, computeSparkPoints } from "@/lib/rank";
import { HikeSession } from "@/types";

const WEB_TOP = 67;

// Monatsnamen folgen der gewaehlten UI-Sprache, nicht dem OS-Gebietsschema.
const MONATS_LOCALE: Record<string, string> = {
  de: "de-CH",
  gsw: "de-CH",
  en: "en-GB",
  fr: "fr-CH",
  it: "it-CH",
  es: "es-ES",
  pt: "pt-PT",
  zh: "zh-CN",
};

export default function Sammlung() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { achievements, hikeHistory, language } = useApp();
  const { sagas } = useCatalog();
  const t = useCollectionStrings();

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;
  const unlockedIds = new Set(achievements.map((a) => a.id));
  const cantons = React.useMemo(() => {
    const namen = Array.from(new Set(sagas.map((s) => s.canton)));
    const discoveredCount = (canton: string) =>
      sagas.filter((s) => s.canton === canton && unlockedIds.has(s.id)).length;
    return namen.sort((a, b) => {
      const diff = discoveredCount(b) - discoveredCount(a);
      if (diff !== 0) return diff;
      return a.localeCompare(b, "de");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sagas, achievements]);

  // Gamification: Rang steigt durch gehörte Sagen + abgeschlossene
  // Wanderungen — komplett lokal berechnet, kein Server-Roundtrip nötig.
  const sparkPoints = computeSparkPoints(achievements.length, hikeHistory.length);
  const rankStatus = computeRankStatus(sparkPoints);
  const rankName = t.ranks[rankStatus.index] ?? t.ranks[0];
  const nextRankName = t.ranks[rankStatus.index + 1];

  // Tagebuch nach Monaten gruppieren (neueste zuerst) — bei vielen
  // Wanderungen bleibt die Liste so ueberschaubar.
  const tagebuchMonate = React.useMemo(() => {
    const locale = MONATS_LOCALE[language] ?? "de-CH";
    const sortiert = [...hikeHistory].sort((a, b) => b.startedAt - a.startedAt);
    const gruppen: { schluessel: string; titel: string; eintraege: HikeSession[] }[] = [];
    for (const hike of sortiert) {
      const d = new Date(hike.startedAt);
      const schluessel = `${d.getFullYear()}-${d.getMonth()}`;
      let gruppe = gruppen.find((g) => g.schluessel === schluessel);
      if (!gruppe) {
        gruppe = {
          schluessel,
          titel: d.toLocaleDateString(locale, { month: "long", year: "numeric" }),
          eintraege: [],
        };
        gruppen.push(gruppe);
      }
      gruppe.eintraege.push(hike);
    }
    return gruppen;
  }, [hikeHistory, language]);

  // Wanderstatistik aus dem Tagebuch (alle abgeschlossenen Wanderungen)
  const totalKm = hikeHistory.reduce((sum, h) => sum + (h.distanceKm || 0), 0);
  const totalAscent = hikeHistory.reduce((sum, h) => sum + (h.ascentM || 0), 0);

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow={t.eyebrow} title={t.title} />

        <View
          style={[
            styles.rankCard,
            { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
          ]}
        >
          <View style={styles.rankHead}>
            <Feather name="award" size={20} color={colors.accent} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.rankSectionTitle, { color: colors.mutedForeground }]}>
                {t.rankSectionTitle}
              </Text>
              <Text style={[styles.rankName, { color: colors.foreground }]}>{rankName}</Text>
            </View>
            <Text style={[styles.rankPoints, { color: colors.accent }]}>
              {sparkPoints} {t.pointsLabel}
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.glassBorder, marginTop: 12, marginBottom: 0 }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.accent,
                  width: `${Math.round(rankStatus.progress * 100)}%`,
                },
              ]}
            />
          </View>

          <Text style={[styles.rankHint, { color: colors.mutedForeground }]}>
            {rankStatus.isMaxRank || !nextRankName
              ? t.maxRankReached
              : t.nextRankProgress(rankStatus.pointsToNext, nextRankName)}
          </Text>
        </View>

        <View style={[styles.statRow]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.accent }]}>
              {achievements.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {t.sagasExperienced}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.glassBorder }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.accent }]}>
              {sagas.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {t.total}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.glassBorder }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.accent }]}>
              {cantons.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {t.cantons}
            </Text>
          </View>
        </View>

        {hikeHistory.length > 0 && (
          <View
            style={[
              styles.wanderStats,
              { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
            ]}
          >
            <Text style={[styles.wanderStatsTitle, { color: colors.foreground }]}>
              {t.statsTitle}
            </Text>
            <View style={styles.wanderStatsRow}>
              <View style={styles.stat}>
                <Text style={[styles.wanderStatNum, { color: colors.accent }]}>
                  {totalKm.toFixed(totalKm >= 100 ? 0 : 1)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  {t.statsKm}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.wanderStatNum, { color: colors.accent }]}>
                  {Math.round(totalAscent)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  {t.statsAscent}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.wanderStatNum, { color: colors.accent }]}>
                  {hikeHistory.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  {t.statsHikes}
                </Text>
              </View>
            </View>
          </View>
        )}

        <SparkDivider style={{ marginVertical: 24 }} />

        {achievements.length === 0 && (
          <View style={styles.empty}>
            <Feather name="award" size={30} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {t.emptyState}
            </Text>
            <PrimaryButton
              label={t.emptyCta}
              onPress={() => router.push("/")}
              style={{ marginTop: 18, alignSelf: "stretch" }}
            />
          </View>
        )}

        <Text style={[styles.albumTitle, { color: colors.foreground }]}>
          {t.albumTitle}
        </Text>

        {cantons.map((canton, ci) => {
          const cantonSagas = sagas.filter((s) => s.canton === canton);
          const discovered = cantonSagas.filter((s) => unlockedIds.has(s.id)).length;
          const complete = discovered === cantonSagas.length && discovered > 0;
          return (
            <Animated.View
              key={canton}
              entering={FadeInDown.delay(ci * 60)}
              style={[
                styles.cantonCard,
                { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
              ]}
            >
              <View style={styles.cantonHead}>
                <View
                  style={[
                    styles.wappen,
                    {
                      borderColor: complete ? colors.accent : colors.glassBorder,
                      backgroundColor: complete
                        ? colors.accent + "22"
                        : "transparent",
                    },
                  ]}
                >
                  <CantonWappen canton={canton} size={38} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cantonName, { color: colors.foreground }]}>
                    {canton}
                  </Text>
                  <Text
                    style={[styles.cantonProgress, { color: colors.mutedForeground }]}
                  >
                    {t.cantonProgress(discovered, cantonSagas.length, canton)}
                  </Text>
                </View>
                {complete && (
                  <Feather name="check-circle" size={18} color={colors.accent} />
                )}
              </View>

              <View style={[styles.progressTrack, { backgroundColor: colors.glassBorder }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.accent,
                      width: `${
                        cantonSagas.length > 0
                          ? Math.round((discovered / cantonSagas.length) * 100)
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.grid}>
                {cantonSagas.map((saga) => {
                  const unlocked = unlockedIds.has(saga.id);
                  return (
                    <View key={saga.id} style={styles.markerCell}>
                      <AchievementMarker size={64} unlocked={unlocked} />
                      <Text
                        style={[
                          styles.markerTitle,
                          {
                            color: unlocked
                              ? colors.foreground
                              : colors.mutedForeground,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {saga.title}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          );
        })}

        {hikeHistory.length > 0 && (
          <>
            <Text
              style={[
                styles.albumTitle,
                { color: colors.foreground, marginTop: 20 },
              ]}
            >
              {t.diaryTitle}
            </Text>
            {tagebuchMonate.map((monat) => (
              <View key={monat.schluessel}>
                <Text style={[styles.diaryMonth, { color: colors.mutedForeground }]}>
                  {monat.titel}
                </Text>
                {monat.eintraege.map((hike, hi) => (
                  <Animated.View
                    key={hike.id}
                    entering={FadeInDown.delay(hi * 60)}
                    style={[
                      styles.diaryCard,
                      { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                    ]}
                  >
                    {hike.photoUri && (
                      <Image
                        source={{ uri: hike.photoUri }}
                        style={styles.diaryPhoto}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.diaryBody}>
                      <Text
                        style={[styles.diaryName, { color: colors.foreground }]}
                        numberOfLines={2}
                      >
                        {hike.routeName}
                      </Text>
                      <Text style={[styles.diaryMeta, { color: colors.mutedForeground }]}>
                        {new Date(hike.startedAt).toLocaleDateString()} · {hike.distanceKm} km · {hike.ascentM} m
                      </Text>
                    </View>
                  </Animated.View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  rankCard: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
  },
  rankHead: { flexDirection: "row", alignItems: "center" },
  rankSectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  rankName: { fontFamily: fonts.titleBold, fontSize: 18, marginTop: 2 },
  rankPoints: { fontFamily: fonts.monoBold, fontSize: 14 },
  rankHint: { fontFamily: fonts.body, fontSize: 12, marginTop: 8 },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 20,
  },
  stat: { alignItems: "center", flex: 1 },
  statNum: { fontFamily: fonts.monoBold, fontSize: 30 },
  statLabel: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 40 },
  empty: { alignItems: "center", gap: 12, paddingVertical: 30 },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  albumTitle: { fontFamily: fonts.titleBold, fontSize: 22, marginBottom: 14 },
  cantonCard: { ...GLAS_3D, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  cantonHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  wappen: {
    width: 44,
    height: 48,
    borderWidth: 1.5,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  wappenText: { fontFamily: fonts.monoBold, fontSize: 14, letterSpacing: 1 },
  cantonName: { fontFamily: fonts.bodyBold, fontSize: 16 },
  cantonProgress: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  markerCell: { width: "33.33%", alignItems: "center", marginBottom: 14 },
  markerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 6,
  },
  markerCanton: { fontFamily: fonts.mono, fontSize: 10, marginTop: 2 },
  wanderStats: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginTop: 22,
  },
  wanderStatsTitle: { fontFamily: fonts.bodyBold, fontSize: 15, marginBottom: 12 },
  wanderStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  wanderStatNum: { fontFamily: fonts.monoBold, fontSize: 22 },
  diaryMonth: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 6,
  },
  diaryCard: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
  },
  diaryPhoto: { width: "100%", height: 160 },
  diaryBody: { padding: 14 },
  diaryName: { fontFamily: fonts.bodyBold, fontSize: 15 },
  diaryMeta: { fontFamily: fonts.mono, fontSize: 12, marginTop: 4 },
});
