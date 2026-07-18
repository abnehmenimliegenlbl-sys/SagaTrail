import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useLegalStrings } from "@/lib/i18n/screens/legal";

const WEB_TOP = 67;

export default function LegalDoc() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useLegalStrings();
  const { doc } = useLocalSearchParams<{ doc: string }>();

  const isPrivacy = (doc ?? "datenschutz") === "datenschutz";
  const title = isPrivacy ? t.datenschutzTitle : t.impressumTitle;
  const sections = isPrivacy ? t.datenschutz : t.impressum;

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 60,
        }}
      >
        <ScreenHeader eyebrow={t.eyebrow} title={title} onBack />
        <SparkDivider style={{ marginVertical: 22 }} />
        {sections.map((s) => (
          <React.Fragment key={s.q}>
            <Text style={[styles.h, { color: colors.accent }]}>{s.q}</Text>
            <Text style={[styles.p, { color: colors.foreground }]}>{s.a}</Text>
          </React.Fragment>
        ))}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: fonts.titleBold, fontSize: 18, marginTop: 20, marginBottom: 6 },
  p: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24 },
});
