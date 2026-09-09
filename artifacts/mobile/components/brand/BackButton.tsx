import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface BackButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
}

/**
 * SagaTrail standard back control.
 *
 * The chevron is drawn with native Views instead of an icon-font glyph. This
 * keeps the back mark visible even when the Feather font has not finished
 * loading in a native bundle.
 */
export function BackButton({ accessibilityLabel, onPress }: BackButtonProps) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.primaryForeground,
          borderColor: colors.accent,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <View style={styles.chevron} pointerEvents="none">
        <View style={[styles.arm, styles.armTop, { backgroundColor: colors.accent }]} />
        <View style={[styles.arm, styles.armBottom, { backgroundColor: colors.accent }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    width: 15,
    height: 22,
    position: "relative",
  },
  arm: {
    position: "absolute",
    left: 1,
    width: 12,
    height: 2.5,
    borderRadius: 2,
  },
  armTop: {
    top: 5,
    transform: [{ rotate: "-45deg" }],
  },
  armBottom: {
    top: 14,
    transform: [{ rotate: "45deg" }],
  },
});