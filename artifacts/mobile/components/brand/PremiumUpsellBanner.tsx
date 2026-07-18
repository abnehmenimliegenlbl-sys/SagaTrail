import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GLAS_3D_STARK } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { hapticSelection } from "@/lib/haptics";

interface Props {
  title: string;
  body: string;
  cta: string;
  style?: import("react-native").ViewStyle;
}

export function PremiumUpsellBanner({ title, body, cta, style }: Props) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        router.push("/paywall");
      }}
      accessibilityRole="button"
      accessibilityLabel={cta}
      style={[
        styles.banner,
        GLAS_3D_STARK,
        {
          backgroundColor: colors.accent + "15",
          borderColor: colors.accent,
          borderRadius: colors.radius,
        },
        style,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.accent + "25" }]}>
        <Feather name="unlock" size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]} numberOfLines={2}>
          {body}
        </Text>
      </View>
      <View style={[styles.ctaBadge, { backgroundColor: colors.accent }]}>
        <Text style={[styles.ctaText, { color: colors.accentForeground }]}>{cta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 18,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  ctaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ctaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
});
