import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { fonts } from "@/constants/typography";
import { PrimaryButton } from "./PrimaryButton";

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

/**
 * Einheitlicher Leer-Zustand fuer alle Screens — Icon, Titel, optionaler
 * Untertitel und optionaler CTA-Button.
 */
export function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  const colors = useColors();
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="text"
      accessibilityLabel={[title, subtitle].filter(Boolean).join(". ")}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
        <Feather name={icon} size={28} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      ) : null}
      {ctaLabel && onCta ? (
        <PrimaryButton
          label={ctaLabel}
          onPress={onCta}
          style={{ marginTop: 20, alignSelf: "stretch" }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 8,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.titleBold,
    fontSize: 17,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
