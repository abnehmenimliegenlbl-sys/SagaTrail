import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { GLAS_3D } from "@/constants/depth";
import { useColors } from "@/hooks/useColors";

/**
 * Frozen-Glass-Oberflaeche laut Style Guide.
 * Milchglas ueber Karte/Landschaft/Story: leichte gletscherweiss-Fuellung,
 * feine 1px-Kante, weicher Schatten. Nie Glas auf Glas stapeln.
 * Ausnahme (SOS/Notfall) wird bewusst NICHT hier umgesetzt.
 */

interface GlassProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  strong?: boolean;
  intensity?: number;
}

export function Glass({ children, style, strong = false, intensity = 20 }: GlassProps) {
  const colors = useColors();
  return (
    <View style={[styles.wrap, { borderRadius: colors.radius }, style]}>
      <BlurView
        intensity={intensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: strong ? colors.glassBgStrong : colors.glassBg,
            borderRadius: colors.radius,
            borderWidth: 1,
            borderColor: colors.glassBorder,
          },
          GLAS_3D,
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  content: { padding: 16 },
});
