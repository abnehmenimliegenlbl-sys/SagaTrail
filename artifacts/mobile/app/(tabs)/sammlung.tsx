import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { kantonsKuerzel } from "@/constants/cantonKuerzel";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { AchievementMarker, SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useColors } from "@/hooks/useColors";
import { useCollectionStrings } from "@/lib/i18n/screens/collection";

const WEB_TOP = 67;

export default function Sammlung() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { achievements } = useApp();
  const { sagas } = useCatalog();
  const t = useCollectionStrings();

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;
  const unlockedIds = new Set(achievements.map((a) => a.id));
  const cantons = Array.from(new Set(sagas.map((s) => s.canton)));

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

        <SparkDivider style={{ marginVertical: 24 }} />

        {achievements.length === 0 && (
          <View style={styles.empty}>
            <Feather name="award" size={30} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {t.emptyState}
            </Text>
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
                  <Text
                    style={[
                      styles.wappenText,
                      { color: complete ? colors.accent : colors.mutedForeground },
                    ]}
                  >
                    {kantonsKuerzel(canton)}
                  </Text>
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
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
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
  cantonCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
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
});
