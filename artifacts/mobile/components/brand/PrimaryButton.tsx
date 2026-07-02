import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "ghost" | "gold";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  haptic?: boolean;
}

/**
 * Primaeraktion (almrausch) laut Style Guide. Reserviert fuer echte Aktionen.
 * `ghost` und `gold` fuer sekundaere/hervorgehobene Aktionen.
 */
export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  haptic = true,
}: PrimaryButtonProps) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg =
    variant === "primary"
      ? colors.primary
      : variant === "gold"
        ? colors.accent
        : "transparent";
  const fg =
    variant === "gold"
      ? colors.accentForeground
      : variant === "ghost"
        ? colors.foreground
        : colors.primaryForeground;

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || loading}
        onPressIn={() => {
          scale.value = withTiming(0.96, { duration: 90 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 120 });
        }}
        onPress={() => {
          if (haptic && Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          onPress();
        }}
        style={[
          styles.button,
          {
            backgroundColor: bg,
            borderRadius: colors.radius,
            borderWidth: variant === "ghost" ? 1 : 0,
            borderColor: colors.glassBorder,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <View style={styles.inner}>
            <Text style={[styles.label, { color: fg }]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: { flexDirection: "row", alignItems: "center", gap: 10 },
  label: {
    fontFamily: fonts.titleBold,
    fontSize: 17,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
