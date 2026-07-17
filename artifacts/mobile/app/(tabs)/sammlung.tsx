import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { useSubscription } from "@/lib/revenuecat";
import { kantonSlug, SAGEN_PRO_PACK } from "@/lib/kantonSlug";
import { useColors } from "@/hooks/useColors";
import { alert } from "@/lib/appAlert";
import { useCollectionStrings } from "@/lib/i18n/screens/collection";
import { CollectionStrings } from "@/lib/i18n/screens/collection";
import { translateCanton } from "@/lib/i18n/cantonNames";
import { LanguageCode } from "@/lib/i18n/languageCode";
import { computeRankStatus, computeSparkPoints } from "@/lib/rank";
import { HikeSession } from "@/types";
import { hapticSelection } from "@/lib/haptics";

const WEB_TOP = 67;

/** Generiert einen GPX-String aus dem gespeicherten Wegverlauf einer Wanderung. */
async function exportHikeGpx(hike: HikeSession, t: CollectionStrings) {
  if (!hike.geometry || hike.geometry.length < 2) {
    alert("GPX", t.exportGpxNoData);
    return;
  }
  try {
    const name = hike.routeName.replace(/[<>&"]/g, " ");
    const startTime = hike.startedAt
      ? new Date(hike.startedAt).toISOString()
      : new Date().toISOString();
    const trkpts = hike.geometry
      .map(([lat, lng]) => `      <trkpt lat="${lat}" lon="${lng}"></trkpt>`)
      .join("\n");
    const desc = `${hike.distanceKm ?? 0} km · ${hike.ascentM ?? 0} m ↑ · SagaTrail`;
    const gpx = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<gpx version="1.1" creator="SagaTrail" xmlns="http://www.topografix.com/GPX/1/1">`,
      `  <metadata>`,
      `    <name>${name}</name>`,
      `    <time>${startTime}</time>`,
      `    <desc>${desc}</desc>`,
      `  </metadata>`,
      `  <trk>`,
      `    <name>${name}</name>`,
      `    <trkseg>`,
      trkpts,
      `    </trkseg>`,
      `  </trk>`,
      `</gpx>`,
    ].join("\n");

    const fileName =
      hike.routeName.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 50) +
      `_${new Date(hike.startedAt).toISOString().slice(0, 10)}.gpx`;
    const uri = (FileSystem.cacheDirectory ?? "") + fileName;
    await FileSystem.writeAsStringAsync(uri, gpx, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    await Sharing.shareAsync(uri, {
      mimeType: "application/gpx+xml",
      UTI: "com.topografix.gpx",
    });
  } catch {
    alert("GPX", t.exportGpxError);
  }
}

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
  const { achievements, hikeHistory, language, profile } = useApp();
  const { isElite } = useSubscription();
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
    // Sparse-Eintraege (nur {id}, kein startedAt) aus dem alten Sync herausfiltern
    const vollstaendig = hikeHistory.filter(
      (h) => h.startedAt && !isNaN(new Date(h.startedAt).getTime())
    );
    const sortiert = [...vollstaendig].sort((a, b) => b.startedAt - a.startedAt);
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
  const totalDurationH = Math.round(
    hikeHistory.reduce((sum, h) => sum + (h.durationMin || 0), 0) / 60
  );
  const longestHikeKm = hikeHistory.length > 0
    ? Math.max(...hikeHistory.map((h) => h.distanceKm || 0))
    : 0;
  const highestAscentM = hikeHistory.length > 0
    ? Math.max(...hikeHistory.map((h) => h.ascentM || 0))
    : 0;

  // Aktivitaets-Chart: Kilometer pro Monat der letzten 12 Monate.
  const monthlyKm = React.useMemo(() => {
    const now = new Date();
    const months: number[] = Array(12).fill(0);
    for (const h of hikeHistory) {
      const d = new Date(h.startedAt);
      const monthsAgo =
        (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
      if (monthsAgo >= 0 && monthsAgo < 12) {
        months[11 - monthsAgo] += h.distanceKm || 0;
      }
    }
    return months;
  }, [hikeHistory]);

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

            {/* Zeile 1: Kernzahlen */}
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

            {/* Trennlinie */}
            <View style={[styles.statsDivider, { backgroundColor: colors.glassBorder }]} />

            {/* Zeile 2: Dauer + Rekorde */}
            <View style={styles.wanderStatsRow}>
              <View style={styles.stat}>
                <Text style={[styles.wanderStatNum, { color: colors.foreground }]}>
                  {totalDurationH}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  {t.statsDuration}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.wanderStatNum, { color: colors.foreground }]}>
                  {longestHikeKm.toFixed(longestHikeKm >= 100 ? 0 : 1)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  {t.statsRecordKm}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.wanderStatNum, { color: colors.foreground }]}>
                  {Math.round(highestAscentM)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  {t.statsRecordAscent}
                </Text>
              </View>
            </View>

            {/* Trennlinie */}
            <View style={[styles.statsDivider, { backgroundColor: colors.glassBorder }]} />

            {/* Monats-Aktivitaets-Chart */}
            <Text style={[styles.monthlyTitle, { color: colors.mutedForeground }]}>
              {t.statsMonthly}
            </Text>
            <View style={styles.monthlyChart}>
              {(() => {
                const maxVal = Math.max(...monthlyKm, 1);
                return monthlyKm.map((km, i) => (
                  <View key={i} style={styles.monthlyBar}>
                    <View
                      style={[
                        styles.monthlyBarFill,
                        {
                          height: `${Math.max(4, (km / maxVal) * 100)}%` as any,
                          backgroundColor: km > 0 ? colors.accent : colors.glassBorder,
                          opacity: km > 0 ? (0.4 + 0.6 * (km / maxVal)) : 1,
                        },
                      ]}
                    />
                  </View>
                ));
              })()}
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
          const packUnlocked = isElite || (profile?.purchasedPacks ?? []).includes(kantonSlug(canton));
          const accessibleTotal = packUnlocked
            ? Math.min(SAGEN_PRO_PACK + 1, cantonSagas.length)
            : Math.min(1, cantonSagas.length);
          const complete = discovered >= accessibleTotal && accessibleTotal > 0;
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
                    {translateCanton(canton, language as LanguageCode)}
                  </Text>
                  <Text
                    style={[styles.cantonProgress, { color: colors.mutedForeground }]}
                  >
                    {t.cantonProgress(discovered, accessibleTotal, canton)}
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
                        accessibleTotal > 0
                          ? Math.round((discovered / accessibleTotal) * 100)
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
                        {saga.summaries?.[language as LanguageCode]?.title ?? saga.title}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          );
        })}

        {tagebuchMonate.length > 0 && (
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
                      <View style={styles.diaryRow}>
                        <View style={styles.diaryTextBlock}>
                          <Text
                            style={[styles.diaryName, { color: colors.foreground }]}
                            numberOfLines={2}
                          >
                            {hike.routeName}
                          </Text>
                          <Text style={[styles.diaryMeta, { color: colors.mutedForeground }]}>
                            {hike.startedAt ? new Date(hike.startedAt).toLocaleDateString() : "—"} · {hike.distanceKm ?? "?"} km · {hike.ascentM ?? "?"} m
                          </Text>
                        </View>
                        {hike.geometry && hike.geometry.length > 1 && (
                          <Pressable
                            onPress={() => { hapticSelection(); exportHikeGpx(hike, t); }}
                            style={({ pressed }) => [
                              styles.gpxBtn,
                              {
                                backgroundColor: colors.glassBg,
                                borderColor: colors.glassBorder,
                                opacity: pressed ? 0.6 : 1,
                              },
                            ]}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="GPX exportieren"
                          >
                            <Feather name="download" size={14} color={colors.mutedForeground} />
                            <Text style={[styles.gpxBtnLabel, { color: colors.mutedForeground }]}>
                              GPX
                            </Text>
                          </Pressable>
                        )}
                      </View>
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
  statsDivider: { height: 1, marginVertical: 14, borderRadius: 1 },
  monthlyTitle: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  monthlyChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 40,
    gap: 3,
  },
  monthlyBar: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  monthlyBarFill: {
    borderRadius: 2,
    width: "100%",
  },
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
  diaryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  diaryTextBlock: { flex: 1 },
  diaryName: { fontFamily: fonts.bodyBold, fontSize: 15 },
  diaryMeta: { fontFamily: fonts.mono, fontSize: 12, marginTop: 4 },
  gpxBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  gpxBtnLabel: { fontFamily: fonts.mono, fontSize: 11 },
});
