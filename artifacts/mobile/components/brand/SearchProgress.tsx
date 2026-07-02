import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

/**
 * Unbestimmter Suchfortschritt fuer die Kantonsuche.
 *
 * Die erste Suche eines Kantons dauert laenger (der Server durchsucht live
 * OpenStreetMap und laedt swisstopo-Hoehenprofile), danach ist sie schnell.
 * Weil der Server keinen echten Fortschritt streamt, ist die Anzeige bewusst
 * unbestimmt: ein durchlaufender Balken plus wechselnde Statuszeilen signalisieren
 * "hier passiert noch etwas", ohne einen falschen Prozentwert vorzutaeuschen.
 */

const STEP_MS = 2400;

export function SearchProgress({ cantonName }: { cantonName?: string }) {
  const colors = useColors();
  const [trackWidth, setTrackWidth] = useState(0);
  const [step, setStep] = useState(0);

  const steps = [
    `${cantonName || "Kanton"} wird durchsucht …`,
    "Passende Routen werden herausgefiltert …",
    "Höhenprofile von swisstopo werden geladen …",
    "Routen werden zusammengestellt …",
  ];

  // Statuszeile schrittweise weiterschalten und auf der letzten Zeile halten.
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => Math.min(s + 1, steps.length - 1));
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [steps.length]);

  // Balkensegment endlos von links nach rechts durchlaufen lassen.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  const segmentWidth = trackWidth * 0.4;
  const barStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [-segmentWidth, trackWidth],
        ),
      },
    ],
  }));

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        Echte Wanderrouten werden gesucht
      </Text>

      <View
        onLayout={onTrackLayout}
        style={[styles.track, { backgroundColor: colors.glassBgStrong }]}
      >
        {segmentWidth > 0 && (
          <Animated.View
            style={[
              styles.segment,
              { width: segmentWidth, backgroundColor: colors.accent },
              barStyle,
            ]}
          />
        )}
      </View>

      <Text style={[styles.status, { color: colors.mutedForeground }]}>
        {steps[step]}
      </Text>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Die erste Suche eines Kantons dauert einen Moment, danach geht es schnell.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  title: {
    fontFamily: fonts.titleBold,
    fontSize: 17,
    letterSpacing: 0.3,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  segment: {
    height: 6,
    borderRadius: 3,
  },
  status: {
    fontFamily: fonts.mono,
    fontSize: 12.5,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
  },
});
