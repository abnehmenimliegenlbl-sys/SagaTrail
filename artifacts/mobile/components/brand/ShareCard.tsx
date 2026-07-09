import React, { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";

import { SparkMountain } from "@/components/brand/SparkMountain";
import colorTokens from "@/constants/colors";
import { fonts } from "@/constants/typography";

const colors = colorTokens.dark;

const MAP_W = 328;
const MAP_H = 200;
const MAP_PAD = 18;

interface ShareCardProps {
  sagaTitle: string;
  routeName: string;
  distanceKm: number;
  ascentM: number;
  sacScale: string;
  durationMin?: number;
  steps?: number;
  geometry?: number[][];
  distanceLabel: string;
  ascentLabel: string;
  timeLabel: string;
  stepsLabel: string;
}

/** Projiziert [lat, lng]-Paare in SVG-Koordinaten (gleichmaessig skaliert, zentriert). */
function projectGeometry(geometry: number[][], width: number, height: number, padding: number) {
  if (!geometry || geometry.length < 2) return null;
  let south = geometry[0][0];
  let north = geometry[0][0];
  let west = geometry[0][1];
  let east = geometry[0][1];
  for (const [lat, lng] of geometry) {
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    west = Math.min(west, lng);
    east = Math.max(east, lng);
  }
  const latSpan = Math.max(north - south, 0.0005);
  // Laengengrad wird mit dem Kosinus des Breitengrads gestaucht, damit die
  // Route nicht verzerrt wirkt.
  const lngScale = Math.cos(((south + north) / 2) * (Math.PI / 180)) || 1;
  const lngSpan = Math.max((east - west) * lngScale, 0.0005);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scale = Math.min(innerW / lngSpan, innerH / latSpan);
  const usedW = lngSpan * scale;
  const usedH = latSpan * scale;
  const offsetX = padding + (innerW - usedW) / 2;
  const offsetY = padding + (innerH - usedH) / 2;

  const points = geometry.map(([lat, lng]) => {
    const x = offsetX + (lng - west) * lngScale * scale;
    const y = offsetY + (north - lat) * scale;
    return { x, y };
  });
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  return { d, start: points[0], end: points[points.length - 1] };
}

/**
 * Markierte Share-Grafik fuer den OS-Share-Sheet: obere Haelfte mit
 * Sagentitel und Kennzahlen (Schritte, Distanz, Hoehenmeter, Zeit), untere
 * Haelfte mit der tatsaechlich gegangenen Route als Karte. Wird unsichtbar
 * gerendert und per react-native-view-shot als Bild abfotografiert.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  {
    sagaTitle,
    routeName,
    distanceKm,
    ascentM,
    sacScale,
    durationMin,
    steps,
    geometry,
    distanceLabel,
    ascentLabel,
    timeLabel,
    stepsLabel,
  },
  ref,
) {
  const route = geometry ? projectGeometry(geometry, MAP_W, MAP_H, MAP_PAD) : null;

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.inner}>
        {/* Obere Haelfte: Titel + Kennzahlen */}
        <View style={styles.top}>
          <View style={styles.mark}>
            <SparkMountain size={56} />
          </View>
          <Text style={styles.brand}>SAGATRAIL</Text>
          <Text style={styles.saga} numberOfLines={2}>
            {sagaTitle}
          </Text>
          <Text style={styles.route} numberOfLines={1}>
            {routeName}
          </Text>
          <View style={styles.statsRow}>
            {typeof steps === "number" && steps > 0 && (
              <Stat value={`${steps}`} label={stepsLabel} />
            )}
            <Stat value={`${distanceKm} km`} label={distanceLabel} />
            <Stat value={`${ascentM} hm`} label={ascentLabel} />
            {typeof durationMin === "number" && durationMin > 0 && (
              <Stat value={`${durationMin} min`} label={timeLabel} />
            )}
          </View>
        </View>

        {/* Untere Haelfte: gegangene Route */}
        <View style={styles.mapWrap}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
            <Defs>
              <SvgGradient id="shareTerrain" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#20302A" />
                <Stop offset="1" stopColor="#10181A" />
              </SvgGradient>
            </Defs>
            <Path d={`M0,0 H${MAP_W} V${MAP_H} H0 Z`} fill="url(#shareTerrain)" />
            {route ? (
              <>
                <Path
                  d={route.d}
                  stroke={colors.gletscherweiss}
                  strokeOpacity={0.25}
                  strokeWidth={7}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d={route.d}
                  stroke={colors.accent}
                  strokeWidth={4}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Circle cx={route.start.x} cy={route.start.y} r={5} fill={colors.moosgrau} />
                <Circle cx={route.end.x} cy={route.end.y} r={6} fill={colors.almrausch} />
              </>
            ) : (
              <Text style={styles.mapFallback}>{sacScale}</Text>
            )}
          </Svg>
        </View>
      </View>
    </View>
  );
});

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 360,
    height: 640,
    backgroundColor: colors.backgroundDeep,
    padding: 16,
  },
  inner: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 18,
    overflow: "hidden",
  },
  top: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 24,
  },
  mark: { marginBottom: 4 },
  brand: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 4,
    color: colors.accent,
    marginTop: 6,
    marginBottom: 10,
  },
  saga: {
    fontFamily: fonts.titleBlack,
    fontSize: 22,
    lineHeight: 28,
    color: colors.foreground,
    textAlign: "center",
  },
  route: {
    fontFamily: fonts.story,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 22,
    marginTop: 20,
  },
  stat: { alignItems: "center" },
  statVal: { fontFamily: fonts.monoBold, fontSize: 15, color: colors.foreground },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.mutedForeground,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mapWrap: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  mapFallback: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
