import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

export function StartupState({ title = "SagaTrail is getting ready", detail = "Your data and hikes are loading." }: {
  title?: string;
  detail?: string;
}) {
  const colors = useColors();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.talschatten }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${title}. ${detail}`}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.glassBgStrong, borderColor: colors.glassBorder },
        ]}
      >
        <Feather name="compass" size={30} color={colors.accent} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.detail, { color: colors.mutedForeground }]}>{detail}</Text>
      <ActivityIndicator color={colors.accent} size="small" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.titleBold,
    fontSize: 24,
    textAlign: "center",
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 300,
  },
  spinner: { marginTop: 22 },
});