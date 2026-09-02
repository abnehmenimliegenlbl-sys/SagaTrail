import { Feather } from "@expo/vector-icons";
import type { ImageSourcePropType } from "react-native";
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { DimensionValue } from "react-native";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import type { PanoramaGipfel } from "@/lib/panorama";

const PANORAMA_VIEW_DEGREES = 140;

export interface PeakPanoramaStrings {
  title: string;
  hint: string;
  needCompass: string;
  noGps: string;
  noPeaks: string;
  detected: string;
  distance: (distance: string) => string;
}

interface PeakPanoramaProps {
  source: ImageSourcePropType;
  peaks: PanoramaGipfel[];
  heading: number | null;
  hasGps: boolean;
  strings: PeakPanoramaStrings;
}

function markerLeft(relativeBearingDeg: number): DimensionValue {
  const percentage = 50 + (relativeBearingDeg / PANORAMA_VIEW_DEGREES) * 100;
  return `${Math.max(8, Math.min(92, percentage))}%`;
}

export function PeakPanorama({
  source,
  peaks,
  heading,
  hasGps,
  strings,
}: PeakPanoramaProps) {
  const colors = useColors();
  const visiblePeaks =
    heading == null
      ? []
      : peaks
          .filter(
            (peak) =>
              peak.relativeBearingDeg != null &&
              Math.abs(peak.relativeBearingDeg) <= PANORAMA_VIEW_DEGREES / 2,
          )
          .slice(0, 4);
  const focusedPeak = visiblePeaks.find(
    (peak) =>
      peak.relativeBearingDeg != null &&
      Math.abs(peak.relativeBearingDeg) <= 18,
  );

  let status = strings.noPeaks;
  if (!hasGps) status = strings.noGps;
  else if (heading == null) status = strings.needCompass;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
      ]}
      accessibilityLabel={strings.title}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Feather name="triangle" size={16} color={colors.accent} />
          <Text style={[styles.title, { color: colors.accent }]}>
            {strings.title}
          </Text>
        </View>
        {heading != null && (
          <Text style={[styles.heading, { color: colors.foreground }]}>
            {Math.round(heading)}°
          </Text>
        )}
      </View>

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        {strings.hint}
      </Text>

      <View style={styles.imageFrame}>
        <ImageBackground
          source={source}
          resizeMode="cover"
          style={styles.image}
          imageStyle={styles.imageRadius}
        >
          <View style={styles.imageScrim} />
          <View style={styles.horizon} />
          {visiblePeaks.map((peak, index) => (
            <View
              key={peak.id}
              style={[
                styles.marker,
                {
                  left: markerLeft(peak.relativeBearingDeg ?? 0),
                  top: 16 + (index % 3) * 26,
                },
              ]}
            >
              <View
                style={[
                  styles.markerLabel,
                  {
                    backgroundColor: colors.glassBgStrong,
                    borderColor:
                      focusedPeak?.id === peak.id
                        ? colors.primary
                        : colors.glassBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.markerName, { color: colors.photoScrimText }]}
                  numberOfLines={1}
                >
                  {peak.name}
                </Text>
                <Text
                  style={[styles.markerDistance, { color: colors.photoScrimMuted }]}
                >
                  {strings.distance(peak.distanceKm.toFixed(1))}
                </Text>
              </View>
              <View
                style={[
                  styles.markerStem,
                  {
                    backgroundColor:
                      focusedPeak?.id === peak.id
                        ? colors.primary
                        : colors.photoScrimText,
                  },
                ]}
              />
            </View>
          ))}
          {heading != null && (
            <View
              style={[
                styles.centerLine,
                { backgroundColor: colors.primary },
              ]}
            />
          )}
          <View style={styles.imageFooter}>
            <Feather
              name={focusedPeak ? "crosshair" : "compass"}
              size={13}
              color={colors.photoScrimText}
            />
            <Text
              style={[styles.status, { color: colors.photoScrimText }]}
              numberOfLines={1}
            >
              {focusedPeak
                ? `${strings.detected}: ${focusedPeak.name}`
                : status}
            </Text>
          </View>
        </ImageBackground>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  heading: { fontFamily: fonts.monoBold, fontSize: 14 },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 7 },
  imageFrame: { marginTop: 11, height: 190, borderRadius: 12, overflow: "hidden" },
  image: { flex: 1, justifyContent: "flex-end" },
  imageRadius: { borderRadius: 12 },
  imageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.17)",
  },
  horizon: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "54%",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.45)",
  },
  marker: {
    position: "absolute",
    width: 130,
    alignItems: "center",
    transform: [{ translateX: -65 }],
  },
  markerLabel: {
    maxWidth: 130,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center",
  },
  markerName: { fontFamily: fonts.titleBold, fontSize: 12 },
  markerDistance: { fontFamily: fonts.mono, fontSize: 9, marginTop: 2 },
  markerStem: { width: 1, height: 42, opacity: 0.9 },
  centerLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
    opacity: 0.9,
  },
  imageFooter: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  status: { flex: 1, fontFamily: fonts.body, fontSize: 12 },
});