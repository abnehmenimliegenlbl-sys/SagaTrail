import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface LoadingBarProps {
  width?: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
}

/**
 * Indeterminate Ladebalken: ein Lichtband laeuft in Dauerschleife ueber die
 * Spur. Wird verwendet, wenn kein echter Fortschrittswert bekannt ist (z. B.
 * waehrend die Sage/Story im Hintergrund aufbereitet wird).
 */
export function LoadingBar({
  width = 160,
  height = 4,
  trackColor,
  fillColor,
}: LoadingBarProps) {
  const colors = useColors();
  const finalTrack = trackColor ?? colors.trackGroove;
  const finalFill = fillColor ?? colors.accent;
  const segmentW = width * 0.4;
  const x = useSharedValue(-segmentW);

  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withTiming(width, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(-segmentW, { duration: 0 })
      ),
      -1
    );
  }, [x, width, segmentW]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View
      style={[
        styles.track,
        { width, height, borderRadius: height / 2, backgroundColor: finalTrack },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width: segmentW,
            height,
            borderRadius: height / 2,
            backgroundColor: finalFill,
          },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: "hidden" },
  fill: { position: "absolute", opacity: 0.9 },
});
