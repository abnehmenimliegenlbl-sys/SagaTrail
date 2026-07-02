import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import colors from "@/constants/colors";

/**
 * Durchgaengiger dunkler Verlauf (Berg bei Daemmerung).
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
  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={
          deep
            ? [colors.dark.nachthimmel, "#0C1416", colors.dark.nachthimmel]
            : [colors.dark.talschatten, colors.dark.nachthimmel]
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
  root: { flex: 1, backgroundColor: colors.dark.talschatten },
});
