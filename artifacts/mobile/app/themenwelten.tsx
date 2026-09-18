import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  ROUTE_THEME_KEYS,
  routeThemeLabel,
} from "@/lib/routeThemes";
import { useThemeWorldStrings } from "@/lib/i18n/screens/themeWorld";
import { THEME_WORLD_IMAGES } from "@/lib/themeWorldVisuals";

const WEB_TOP = 67;

export default function Themenwelten() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useApp();
  const strings = useThemeWorldStrings();
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  return (
    <Background>
      <Stack.Screen options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow={strings.eyebrow} title={strings.catalogTitle} onBack />
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {strings.catalogIntro}
        </Text>

        <View style={styles.grid}>
          {ROUTE_THEME_KEYS.map((theme, index) => (
            <Animated.View key={theme} entering={FadeInDown.delay(index * 45).duration(360)}>
              <Pressable
                onPress={() => router.push(`/themenwelt/${theme}`)}
                accessibilityRole="button"
                accessibilityLabel={routeThemeLabel(theme, language)}
                style={[
                  styles.card,
                  {
                    borderColor: colors.glassBorder,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <ExpoImage
                  source={THEME_WORLD_IMAGES[theme]}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["rgba(7,16,20,0.02)", "rgba(7,16,20,0.88)"]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.cardContent}>
                  <View style={[styles.icon, { backgroundColor: colors.accent + "D9" }]}>
                    <Feather name="compass" size={18} color={colors.backgroundDeep} />
                  </View>
                  <View style={styles.labelWrap}>
                    <Text style={styles.label} numberOfLines={2}>
                      {routeThemeLabel(theme, language)}
                    </Text>
                    <Text style={styles.eyebrow}>{strings.eyebrow}</Text>
                  </View>
                  <Feather name="chevron-right" size={21} color="#FFFFFF" />
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
    marginBottom: 18,
  },
  grid: { gap: 12 },
  card: {
    height: 152,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    padding: 16,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  labelWrap: { flex: 1 },
  label: {
    color: "#FFFFFF",
    fontFamily: fonts.titleBold,
    fontSize: 19,
    lineHeight: 23,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.74)",
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 4,
    textTransform: "uppercase",
  },
});