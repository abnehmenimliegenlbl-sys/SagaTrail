import React, { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { SparkMountain } from "@/components/brand/SparkMountain";
import colorTokens from "@/constants/colors";
import { fonts } from "@/constants/typography";

const colors = colorTokens.dark;

interface ShareCardProps {
  sagaTitle: string;
  routeName: string;
  distanceKm: number;
  ascentM: number;
  sacScale: string;
  distanceLabel: string;
  ascentLabel: string;
}

/**
 * Markierte Share-Grafik fuer den OS-Share-Sheet: quadratische Karte mit
 * Sagentitel, Route und Kennzahlen. Wird unsichtbar gerendert und per
 * react-native-view-shot als Bild abfotografiert.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { sagaTitle, routeName, distanceKm, ascentM, sacScale, distanceLabel, ascentLabel },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.inner}>
        <View style={styles.mark}>
          <SparkMountain size={72} />
        </View>
        <Text style={styles.brand}>SAGATRAIL</Text>
        <Text style={styles.saga} numberOfLines={3}>
          {sagaTitle}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.route} numberOfLines={2}>
          {routeName}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{distanceKm} km</Text>
            <Text style={styles.statLabel}>{distanceLabel}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{ascentM} hm</Text>
            <Text style={styles.statLabel}>{ascentLabel}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{sacScale}</Text>
            <Text style={styles.statLabel}>SAC</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 360,
    height: 360,
    backgroundColor: colors.backgroundDeep,
    padding: 16,
  },
  inner: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mark: { marginBottom: 4 },
  brand: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 4,
    color: colors.accent,
    marginBottom: 10,
  },
  saga: {
    fontFamily: fonts.titleBlack,
    fontSize: 22,
    lineHeight: 28,
    color: colors.foreground,
    textAlign: "center",
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: colors.accent,
    marginVertical: 12,
  },
  route: {
    fontFamily: fonts.story,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 28,
    marginTop: 18,
  },
  stat: { alignItems: "center" },
  statVal: { fontFamily: fonts.monoBold, fontSize: 16, color: colors.foreground },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
  },
});
