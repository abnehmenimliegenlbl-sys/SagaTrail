import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

/**
 * Durchgaengiger Hintergrund-Verlauf, folgt dem aktiven Hell/Dunkel-Modus.
 * `deep` fuer Splash/Onboarding (nachthimmel), sonst talschatten.
 */
export function Background({
  children,
  deep = false,
  style,
}: {
  children: React.ReactNode;
  deep?: boolean;
  style?: ViewStyle;
}) {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.talschatten }, style]}>
      <LinearGradient
        colors={
          deep
            ? [colors.nachthimmel, colors.talschatten, colors.nachthimmel]
            : [colors.talschatten, colors.nachthimmel]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
