import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface BackButtonProps {
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * SagaTrail standard back control.
 *
 * The same control is used inside regular headers and image/map tiles. The
 * optional style only controls where the standard button is embedded.
 */
export function BackButton({ accessibilityLabel, onPress, style }: BackButtonProps) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [
        styles.button,
        style,
        {
          backgroundColor: colors.primaryForeground,
          borderColor: colors.accent,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <Feather name="chevron-left" size={22} color="#000000" />
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
});