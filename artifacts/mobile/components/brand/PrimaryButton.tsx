import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

import { GLAS_3D, GLAS_3D_STARK } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "ghost" | "gold" | "secondary";

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
 * Primaeraktion (almrausch/Schweizer Rot) laut Style Guide, mit starkem
 * 3D-Effekt (Farbverlauf + Glanzkante + tiefer Schatten). `gold` bleibt
 * fest fuer Premium-/Sagenpaket-Aktionen reserviert — mit eigenem
 * diagonalem Glanzstreifen statt des roten Farbverlaufs. `ghost` fuer
 * sekundaere Aktionen.
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

  const baseColor = variant === "gold" ? colors.altgold : colors.primary;
  const fg =
    variant === "gold"
      ? "#10181A"
      : variant === "ghost"
        ? colors.foreground
        : variant === "secondary"
          ? colors.accent
          : colors.primaryForeground;

  const flat = variant === "ghost" || variant === "secondary";

  const gradientColors: [string, string, string] = flat
    ? ["transparent", "transparent", "transparent"]
    : [withAlpha(baseColor, 0.95), baseColor, withAlpha(baseColor, 0.78)];

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
            borderRadius: colors.radius,
            borderWidth: 1,
            borderColor:
              variant === "ghost"
                ? colors.glassBorder
                : variant === "secondary"
                  ? colors.accent
                  : "rgba(255,255,255,0.18)",
            opacity: disabled ? 0.5 : 1,
            overflow: "hidden",
          },
          variant === "ghost" ? { backgroundColor: "transparent" } : null,
          variant === "secondary" ? { backgroundColor: colors.glassBgStrong } : null,
          variant === "secondary" ? GLAS_3D : GLAS_3D_STARK,
          variant === "primary" || variant === "gold"
            ? { shadowColor: baseColor, shadowOpacity: 0.55 }
            : null,
        ]}
      >
        {!flat && (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {!flat && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderTopWidth: 1.5,
                borderColor: "rgba(255,255,255,0.4)",
                borderRadius: colors.radius,
              },
            ]}
          />
        )}
        {!flat && (
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(255,255,255,0.32)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.55 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {variant === "gold" && (
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.55)",
              "rgba(255,255,255,0)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            locations={[0.35, 0.5, 0.65]}
            style={StyleSheet.absoluteFill}
          />
        )}
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

/** Haengt eine Alpha-Komponente an einen #RRGGBB-Hex-Farbwert an. */
function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length !== 7) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
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
