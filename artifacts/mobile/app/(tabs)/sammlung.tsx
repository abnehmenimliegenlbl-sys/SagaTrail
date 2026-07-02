import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { AchievementMarker, SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useColors } from "@/hooks/useColors";

const WEB_TOP = 67;

export default function Sammlung() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { achievements } = useApp();
  const { sagas } = useCatalog();

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
        <ScreenHeader eyebrow="Deine Reise" title="Sammlung" />

        <View style={[styles.statRow]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.accent }]}>
              {achievements.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Sagen erlebt
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.glassBorder }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.accent }]}>
              {sagas.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Insgesamt
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.glassBorder }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.accent }]}>
              {cantons.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Kantone
            </Text>
          </View>
        </View>

        <SparkDivider style={{ marginVertical: 24 }} />

        {achievements.length === 0 && (
          <View style={styles.empty}>
            <Feather name="award" size={30} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Noch keine Sage erlebt. Starte deine erste Wanderung, um Funken zu
              sammeln.
            </Text>
          </View>
        )}

        <View style={styles.grid}>
          {sagas.map((saga, i) => {
            const unlocked = unlockedIds.has(saga.id);
            return (
              <Animated.View
                key={saga.id}
                entering={FadeInDown.delay(i * 50)}
                style={styles.markerCell}
              >
                <AchievementMarker size={72} unlocked={unlocked} />
                <Text
                  style={[
                    styles.markerTitle,
                    { color: unlocked ? colors.foreground : colors.mutedForeground },
                  ]}
                  numberOfLines={2}
                >
                  {saga.title}
                </Text>
                <Text style={[styles.markerCanton, { color: colors.mutedForeground }]}>
                  {saga.canton}
                </Text>
              </Animated.View>
            );
          })}
        </View>
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
  grid: { flexDirection: "row", flexWrap: "wrap" },
  markerCell: { width: "33.33%", alignItems: "center", marginBottom: 24 },
  markerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 6,
  },
  markerCanton: { fontFamily: fonts.mono, fontSize: 10, marginTop: 2 },
});
