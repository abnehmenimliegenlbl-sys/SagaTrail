import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { GLAS_3D } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { hapticSelection } from "@/lib/haptics";

export function HomeEntryCard({
  order,
  icon,
  image,
  title,
  hint,
  onPress,
}: {
  order: number;
  icon: React.ComponentProps<typeof Feather>["name"];
  image?: number;
  title: string;
  hint: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const isImageCard = image != null;
  const titleColor = isImageCard ? colors.photoScrimText : colors.foreground;
  const hintColor = isImageCard
    ? "rgba(255,255,255,0.78)"
    : colors.mutedForeground;

  return (
    <Animated.View
      entering={FadeInDown.delay(order * 70)}
      style={styles.entrySection}
    >
      <Pressable
        onPress={() => {
          hapticSelection();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={[
          styles.entryCard,
          {
            backgroundColor: isImageCard
              ? colors.glassBg
              : colors.glassBgStrong,
            borderColor: colors.glassBorder,
            borderRadius: colors.radius,
          },
        ]}
      >
        {isImageCard ? (
          <>
            <ExpoImage
              source={image}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient
              colors={["rgba(7,16,20,0.02)", "rgba(7,16,20,0.42)"]}
              style={StyleSheet.absoluteFill}
            />
          </>
        ) : (
          <LinearGradient
            colors={[colors.glassHighlight, colors.glassBgStrong]}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.entryContent}>
          <View style={[styles.entryIcon, { backgroundColor: colors.accent }]}>
            <Feather name={icon} size={19} color={colors.accentForeground} />
          </View>
          <View style={styles.entryCopy}>
            <Text
              style={[styles.entryTitle, { color: titleColor }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={[styles.entryHint, { color: hintColor }]}
              numberOfLines={2}
            >
              {hint}
            </Text>
          </View>
          <Feather name="chevron-right" size={21} color={titleColor} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  entrySection: {
    marginTop: 8,
    marginHorizontal: 20,
  },
  entryCard: {
    aspectRatio: 3,
    borderWidth: 1,
    overflow: "hidden",
    ...GLAS_3D,
  },
  entryContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  entryCopy: { flex: 1 },
  entryHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  entryTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    lineHeight: 21,
  },
});