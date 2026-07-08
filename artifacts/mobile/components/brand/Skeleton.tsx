import React, { useEffect } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

/**
 * Pulsierender Platzhalter waehrend Inhalte laden — verhindert
 * Layout-Spruenge, weil er dieselbe Flaeche wie der spaetere Inhalt belegt.
 */
export function Skeleton({
  height,
  width = "100%",
  radius = 14,
  style,
}: {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: ViewStyle;
}) {
  const colors = useColors();
  const puls = useSharedValue(0.45);

  useEffect(() => {
    puls.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 700 }),
        withTiming(0.45, { duration: 700 }),
      ),
      -1,
    );
  }, [puls]);

  const animStyle = useAnimatedStyle(() => ({ opacity: puls.value }));

  return (
    <Animated.View
      style={[
        styles.basis,
        { height, width, borderRadius: radius, backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
        animStyle,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  basis: { borderWidth: 1 },
});
