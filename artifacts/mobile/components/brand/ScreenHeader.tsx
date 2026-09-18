import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { fonts } from "@/constants/typography";
import { BackButton } from "@/components/brand/BackButton";
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
        <BackButton accessibilityLabel={t.back} onPress={() => router.back()} />
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
