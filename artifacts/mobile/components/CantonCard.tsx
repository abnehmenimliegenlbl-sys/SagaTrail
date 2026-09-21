import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { GLAS_3D } from "@/constants/depth";
import { CantonWappen } from "@/components/brand/CantonWappen";
import type { CantonWithRoutes } from "@/constants/routes";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useHomeStrings } from "@/lib/i18n/screens/home";
import { translateCanton } from "@/lib/i18n/cantonNames";
import { LanguageCode } from "@/lib/i18n/languageCode";
import { useColors } from "@/hooks/useColors";
import {
  hasPurchasedPack,
  kantonSlug,
  packEntitlementFuerKanton,
} from "@/lib/kantonSlug";
import { hapticSelection } from "@/lib/haptics";
import { useSubscription } from "@/lib/revenuecat";

export function CantonCard({
  entry,
  index,
  highlight,
  onPress,
}: {
  entry: CantonWithRoutes;
  index: number;
  highlight?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const t = useHomeStrings();
  const { achievements, language, profile, purchasedPacks } = useApp();
  const subscription = useSubscription();
  const { isElite } = subscription;
  const { sagas } = useCatalog();

  const cantonSagas = sagas.filter((s) => s.canton === entry.canton);
  const discovered = cantonSagas.filter((s) =>
    achievements.some((a) => a.id === s.id),
  ).length;
  const availablePurchasedPacks = Array.from(
    new Set([...purchasedPacks, ...(profile?.purchasedPacks ?? [])]),
  );
  const packSlug = kantonSlug(entry.canton);
  const packUnlocked =
    isElite ||
    hasPurchasedPack(availablePurchasedPacks, packSlug) ||
    (subscription.hatEntitlement?.(packEntitlementFuerKanton(packSlug)) ??
      false);
  const accessibleTotal = packUnlocked
    ? cantonSagas.length
    : Math.min(1, cantonSagas.length);
  const progressDiscovered = Math.min(discovered, accessibleTotal);
  const cantonLabel = translateCanton(entry.canton, language as LanguageCode);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60)}>
      <Pressable
        onPress={() => {
          hapticSelection();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${cantonLabel} — ${entry.routeCount > 0 ? t.routeCount(entry.routeCount) : t.liveFromSwisstopo}`}
        style={[
          styles.cantonCard,
          {
            backgroundColor: colors.glassBg,
            borderColor: highlight ? colors.accent : colors.glassBorder,
            borderRadius: colors.radius,
          },
        ]}
      >
        <View
          style={[
            styles.cantonIcon,
            {
              borderColor: colors.glassBorder,
              backgroundColor: "transparent",
            },
          ]}
        >
          <CantonWappen canton={entry.canton} size={38} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cantonName, { color: colors.foreground }]}>
            {cantonLabel}
          </Text>
          <Text style={[styles.cantonMeta, { color: colors.mutedForeground }]}>
            {entry.routeCount > 0
              ? t.routeCount(entry.routeCount)
              : t.liveFromSwisstopo}
          </Text>
          {cantonSagas.length > 0 && (
            <Text
              style={[
                styles.cantonMeta,
                {
                  color:
                    progressDiscovered > 0
                      ? colors.accent
                      : colors.mutedForeground,
                },
              ]}
            >
              {t.sagaProgress(progressDiscovered, accessibleTotal)}
            </Text>
          )}
        </View>
        <Feather
          name="chevron-right"
          size={20}
          color={colors.mutedForeground}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cantonCard: {
    ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cantonIcon: {
    width: 44,
    height: 48,
    borderWidth: 1.5,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cantonName: { fontSize: 19 },
  cantonMeta: { fontFamily: fonts.mono, fontSize: 12, marginTop: 3 },
});