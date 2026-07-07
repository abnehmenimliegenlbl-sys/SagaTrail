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
 *
 * Zweischichtiger Aufbau: Der aeussere Rahmen traegt 3D-Kanten und Schatten
 * (KEIN overflow:"hidden", sonst wird der Schatten abgeschnitten); die innere
 * Schicht clippt Blur und Inhalt auf den Radius.
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
    <View
      style={[
        styles.wrap,
        {
          borderRadius: colors.radius,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        },
        GLAS_3D,
        style,
      ]}
    >
      <View style={[styles.clip, { borderRadius: colors.radius - 1 }]}>
        <BlurView
          intensity={intensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: strong ? colors.glassBgStrong : colors.glassBg },
          ]}
        />
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  clip: { overflow: "hidden" },
  content: { padding: 16 },
});
