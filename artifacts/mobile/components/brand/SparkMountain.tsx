import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Polygon } from "react-native-svg";

import colors from "@/constants/colors";

/**
 * Signaturelement "Bergsilhouette mit Funke".
 * Drei Formen: pulsierendes Ladeelement, feiner Abschnittstrenner,
 * Achievement-Marke (Funke im goldenen Ring).
 */

interface SparkMountainProps {
  size?: number;
  pulsing?: boolean;
  mountainColor?: string;
  sparkColor?: string;
}

function Spark({ size, color }: { size: number; color: string }) {
  const c = size / 2;
  const r = size * 0.5;
  const inner = size * 0.16;
  // Vierzackiger Funke
  const points = [
    `${c},${c - r}`,
    `${c + inner},${c - inner}`,
    `${c + r},${c}`,
    `${c + inner},${c + inner}`,
    `${c},${c + r}`,
    `${c - inner},${c + inner}`,
    `${c - r},${c}`,
    `${c - inner},${c - inner}`,
  ].join(" ");
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={points} fill={color} />
    </Svg>
  );
}

export function SparkMountain({
  size = 72,
  pulsing = false,
  mountainColor = colors.dark.talschatten,
  sparkColor = colors.dark.altgold,
}: SparkMountainProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.6);

  useEffect(() => {
    if (pulsing) {
      scale.value = withRepeat(
        withTiming(1.18, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      glow.value = withRepeat(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [pulsing, scale, glow]);

  const sparkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: glow.value,
  }));

  const sparkSize = size * 0.42;
  const mountainW = size;
  const mountainH = size * 0.5;

  return (
    <View style={{ width: size, height: size, alignItems: "center" }}>
      <Animated.View style={[styles.spark, sparkStyle]}>
        <Spark size={sparkSize} color={sparkColor} />
      </Animated.View>
      <View style={styles.mountain}>
        <Svg
          width={mountainW}
          height={mountainH}
          viewBox={`0 0 ${mountainW} ${mountainH}`}
        >
          <Polygon
            points={`0,${mountainH} ${mountainW * 0.32},${mountainH * 0.15} ${
              mountainW * 0.5
            },${mountainH * 0.45} ${mountainW * 0.68},${mountainH * 0.05} ${
              mountainW
            },${mountainH}`}
            fill={mountainColor}
          />
          <Path
            d={`M${mountainW * 0.68},${mountainH * 0.05} L${
              mountainW * 0.6
            },${mountainH * 0.32} L${mountainW * 0.76},${
              mountainH * 0.32
            } Z`}
            fill={colors.dark.gletscherweiss}
            opacity={0.85}
          />
        </Svg>
      </View>
    </View>
  );
}

interface MarkerProps {
  size?: number;
  unlocked?: boolean;
}

/** Achievement-Marke: Funke in goldenem Ring (gesperrt = gedaempft). */
export function AchievementMarker({ size = 64, unlocked = false }: MarkerProps) {
  const ring = unlocked ? colors.dark.altgold : colors.dark.moosgrau;
  const spark = unlocked ? colors.dark.altgold : colors.dark.moosgrau;
  return (
    <View
      style={[
        markerStyles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ring,
          opacity: unlocked ? 1 : 0.4,
        },
      ]}
    >
      <Spark size={size * 0.5} color={spark} />
    </View>
  );
}

interface DividerProps {
  color?: string;
  sparkColor?: string;
  style?: ViewStyle;
}

/** Feiner Abschnittstrenner: Funke zwischen zwei duennen Linien. */
export function SparkDivider({
  color = colors.dark.moosgrau,
  sparkColor = colors.dark.altgold,
  style,
}: DividerProps) {
  return (
    <View style={[dividerStyles.row, style]}>
      <View style={[dividerStyles.line, { backgroundColor: color }]} />
      <View style={dividerStyles.spark}>
        <Spark size={12} color={sparkColor} />
      </View>
      <View style={[dividerStyles.line, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  spark: { position: "absolute", top: 0 },
  mountain: { position: "absolute", bottom: 0 },
});

const markerStyles = StyleSheet.create({
  ring: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

const dividerStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  line: { flex: 1, height: 1, opacity: 0.4 },
  spark: { opacity: 0.9 },
});
