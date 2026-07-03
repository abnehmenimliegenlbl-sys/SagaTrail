import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useSharedStrings } from "@/lib/i18n/screens/shared";

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  onBack?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ eyebrow, title, onBack, right }: ScreenHeaderProps) {
  const colors = useColors();
  const router = useRouter();
  const t = useSharedStrings();
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          accessibilityLabel={t.back}
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.backBtn, { borderColor: colors.glassBorder }]}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 2,
  },
  title: {
    fontFamily: fonts.titleBold,
    fontSize: 30,
    letterSpacing: 0.5,
  },
});
