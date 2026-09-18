import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D, GLAS_3D_STARK } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { CantonWappen } from "@/components/brand/CantonWappen";
import { PremiumUpsellBanner } from "@/components/brand/PremiumUpsellBanner";
import { ProfileAvatar } from "@/components/brand/ProfileAvatar";
import { Skeleton } from "@/components/brand/Skeleton";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { CantonWithRoutes } from "@/constants/routes";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useHomeStrings } from "@/lib/i18n/screens/home";
import { useOnboardingStrings } from "@/lib/i18n/screens/onboarding";
import { translateCanton } from "@/lib/i18n/cantonNames";
import { LanguageCode } from "@/lib/i18n/languageCode";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import {
  hasPurchasedPack,
  kantonSlug,
  packEntitlementFuerKanton,
} from "@/lib/kantonSlug";
import { hapticSelection } from "@/lib/haptics";
import { useMeetupStrings } from "@/lib/i18n/screens/meetups";
import {
  MEETUP_HOME_BANNER,
  THEME_WORLD_HOME_BANNER,
} from "@/lib/themeWorldVisuals";

const WEB_TOP = 67;

export default function Entdecken() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    profile,
    language,
    activeHike,
    clearActiveHike,
    premium,
    freeHikeUsed,
    pendingPackRewards,
  } = useApp();
  const { isElite } = useSubscription();
  const t = useHomeStrings();
  const meetupT = useMeetupStrings();
  const recommendationCopy =
    language === "de" || language === "gsw"
      ? {
          eyebrow: "DEIN TAG",
          title: "Beste Route für heute",
          hint: "Zeit, Begleitung, Wetter und ÖV zusammen entscheiden lassen",
          cta: "Empfehlung öffnen",
        }
      : {
          eyebrow: "YOUR DAY",
          title: "Best route for today",
          hint: "Choose with time, group, weather and transport together",
          cta: "Open recommendation",
        };

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;
  const onboardingStrings = useOnboardingStrings();
  const archetypeTitle = profile?.archetype
    ? onboardingStrings.archetypes[profile.archetype].title
    : "";

  const { cantons, ready, sagas } = useCatalog();
  const [cantonQuery, setCantonQuery] = React.useState("");
  const visibleCantons = React.useMemo(() => {
    const query = cantonQuery.trim().toLocaleLowerCase();
    const filtered = query
      ? cantons.filter((entry) =>
          translateCanton(entry.canton, language as LanguageCode)
            .toLocaleLowerCase()
            .includes(query),
        )
      : cantons;
    return [...filtered].sort((a, b) => a.canton.localeCompare(b.canton, "de"));
  }, [cantonQuery, cantons, language]);

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <ProfileAvatar avatarUrl={profile?.avatarUrl} name={profile?.name} size={58} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
              {t.welcomeBack}
            </Text>
            <Text style={[styles.name, { color: colors.foreground }]}>
              {profile?.name ?? t.defaultName}
            </Text>
            <Text style={[styles.archetype, { color: colors.accent }]}>
              {archetypeTitle}
            </Text>
          </View>
        </View>

        {activeHike && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Pressable
              onPress={() =>
                router.push(
                  `/hike/${encodeURIComponent(activeHike.sagaId)}?routeId=${encodeURIComponent(activeHike.routeId)}&resume=1`,
                )
              }
              style={[
                styles.resumeCard,
                styles.resumeCardCompact,
                { backgroundColor: colors.glassBgStrong, borderColor: colors.accent, borderRadius: colors.radius },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.resumeEyebrow, { color: colors.accent }]}>
                  {t.resumeTitle.toUpperCase()}
                </Text>
                <Text style={[styles.resumeName, { color: colors.foreground }]} numberOfLines={1}>
                  {activeHike.routeName}
                </Text>
                <View style={styles.resumeCtaRowCompact}>
                  <Feather name="play" size={14} color={colors.accent} />
                  <Text style={[styles.resumeCta, { color: colors.accent }]}>{t.resumeCta}</Text>
                </View>
              </View>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  clearActiveHike();
                }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t.resumeDismiss}
                style={styles.resumeClose}
              >
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            </Pressable>
          </Animated.View>
        )}

        {freeHikeUsed && !premium && !isElite && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <PremiumUpsellBanner
              title={t.premiumBannerTitle}
              body={t.premiumBannerBody}
              cta={t.premiumBannerCta}
            />
          </Animated.View>
        )}

        {pendingPackRewards > 0 && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Pressable
              onPress={() => router.push("/referral-reward")}
              style={[
                styles.resumeCard,
                { backgroundColor: colors.glassBgStrong, borderColor: colors.accent, borderRadius: colors.radius },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.resumeEyebrow, { color: colors.accent }]}>
                  {t.referralRewardTitle.toUpperCase()}
                </Text>
                <Text style={[styles.resumeName, { color: colors.foreground }]}>
                  {t.referralRewardCta}
                </Text>
              </View>
              <Feather name="gift" size={22} color={colors.accent} />
            </Pressable>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <Pressable
            onPress={() => router.push("/treffpunkte")}
            style={[
              styles.meetupCard,
              {
                borderColor: colors.glassBorder,
                borderRadius: colors.radius,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={meetupT.title}
          >
            <ExpoImage
              source={MEETUP_HOME_BANNER}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient
              colors={["rgba(7,16,20,0.08)", "rgba(7,16,20,0.84)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.themeWorldCardContent}>
              <View style={[styles.themeWorldIcon, { backgroundColor: colors.accent + "D9" }]}>
                <Feather name="users" size={19} color={colors.backgroundDeep} />
              </View>
              <View style={styles.themeWorldCardText}>
                <Text style={[styles.themeWorldLabel, { color: "#FFFFFF" }]}>
                  {meetupT.title}
                </Text>
                <Text style={[styles.themeWorldHint, { color: "rgba(255,255,255,0.78)" }]} numberOfLines={2}>
                  {meetupT.intro}
                </Text>
              </View>
              <Feather name="chevron-right" size={21} color="#FFFFFF" />
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.themeWorldsSection}>
          <Pressable
            onPress={() => router.push("/themenwelten")}
            accessibilityRole="button"
            accessibilityLabel={t.themeWorldsTitle}
            style={[
              styles.themeWorldCard,
              {
                borderColor: colors.glassBorder,
                borderRadius: colors.radius,
              },
            ]}
          >
            <ExpoImage
              source={THEME_WORLD_HOME_BANNER}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <LinearGradient
              colors={["rgba(7,16,20,0.08)", "rgba(7,16,20,0.82)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.themeWorldCardContent}>
              <View style={[styles.themeWorldIcon, { backgroundColor: colors.accent + "D9" }]}>
                <Feather name="compass" size={19} color={colors.backgroundDeep} />
              </View>
              <View style={styles.themeWorldCardText}>
                <Text style={[styles.themeWorldLabel, { color: "#FFFFFF" }]}>
                  {t.themeWorldsTitle}
                </Text>
                <Text style={[styles.themeWorldHint, { color: "rgba(255,255,255,0.78)" }]}>
                  {t.themeWorldsHint}
                </Text>
              </View>
              <Feather name="chevron-right" size={21} color="#FFFFFF" />
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.themeWorldsSection}>
          <Pressable
            onPress={() => router.push("/empfehlung")}
            accessibilityRole="button"
            accessibilityLabel={recommendationCopy.title}
            style={[
              styles.recommendationCard,
              {
                backgroundColor: colors.glassBgStrong,
                borderColor: colors.accent,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={[styles.recommendationGlow, { backgroundColor: colors.accent + "18" }]} />
            <View style={styles.recommendationContent}>
              <View style={styles.recommendationTopline}>
                <View
                  style={[
                    styles.recommendationIcon,
                    { backgroundColor: colors.accent + "1F", borderColor: colors.accent + "66" },
                  ]}
                >
                  <Feather name="sunrise" size={19} color={colors.accent} />
                </View>
                <Text style={[styles.recommendationEyebrow, { color: colors.accent }]}>
                  {recommendationCopy.eyebrow}
                </Text>
                <Feather name="arrow-up-right" size={20} color={colors.accent} />
              </View>
              <Text style={[styles.recommendationTitle, { color: colors.foreground }]}>
                {recommendationCopy.title}
              </Text>
              <Text style={[styles.recommendationHint, { color: colors.mutedForeground }]}>
                {recommendationCopy.hint}
              </Text>
              <View style={styles.recommendationCta}>
                <Text style={[styles.recommendationCtaText, { color: colors.accent }]}>
                  {recommendationCopy.cta}
                </Text>
                <View style={[styles.recommendationCtaLine, { backgroundColor: colors.accent }]} />
              </View>
            </View>
          </Pressable>
        </Animated.View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.cantonsTitle}
          </Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            {t.allCantonsHint(cantons.length)}
          </Text>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder, borderRadius: colors.radius }]}>
          <Feather name="search" size={17} color={colors.mutedForeground} />
          <TextInput
            value={cantonQuery}
            onChangeText={setCantonQuery}
            placeholder={t.searchCanton}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            accessibilityLabel={t.searchCanton}
            returnKeyType="search"
          />
          {cantonQuery.length > 0 && (
            <Pressable onPress={() => setCantonQuery("")} hitSlop={10} accessibilityLabel={t.clearSearch}>
              <Feather name="x-circle" size={17} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {!ready
            ? [0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={76} radius={colors.radius} style={{ marginBottom: 12 }} />
              ))
            : visibleCantons.map((entry, i) => (
                <CantonCard
                  key={entry.canton}
                  entry={entry}
                  index={i}
                  onPress={() =>
                    router.push(`/kanton/${encodeURIComponent(entry.canton)}`)
                  }
                />
              ))}
        </View>

        <SparkDivider style={{ marginHorizontal: 20, marginVertical: 24 }} />

        <View style={{ paddingHorizontal: 20 }}>
             <Animated.View entering={FadeInDown.delay(visibleCantons.length * 60)}>
            <Pressable
              onPress={() => { hapticSelection(); router.push("/eigene-route"); }}
              accessibilityRole="button"
              accessibilityLabel={t.customRouteTitle}
              style={[
                styles.cantonCard,
                {
                  backgroundColor: colors.glassBg,
                  borderColor: colors.glassBorder,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={styles.cantonIcon}>
                <Feather name="navigation" size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cantonName, { color: colors.foreground }]}>
                  {t.customRouteTitle}
                </Text>
                <Text style={[styles.cantonMeta, { color: colors.mutedForeground }]}>
                  {t.customRouteHint}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </Background>
  );
}

function CantonCard({
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

  // Sagen-Fortschritt des Kantons — nur wenn der Kanton kuratierte Sagen hat.
  const cantonSagas = sagas.filter((s) => s.canton === entry.canton);
  const discovered = cantonSagas.filter((s) =>
    achievements.some((a) => a.id === s.id)
  ).length;
  const availablePurchasedPacks = Array.from(
    new Set([...purchasedPacks, ...(profile?.purchasedPacks ?? [])]),
  );
  const packSlug = kantonSlug(entry.canton);
  const packUnlocked =
    isElite ||
    hasPurchasedPack(availablePurchasedPacks, packSlug) ||
    (subscription.hatEntitlement?.(packEntitlementFuerKanton(packSlug)) ?? false);
  const accessibleTotal = packUnlocked
    ? cantonSagas.length
    : Math.min(1, cantonSagas.length);
  const progressDiscovered = Math.min(discovered, accessibleTotal);

  const cantonLabel = translateCanton(entry.canton, language as LanguageCode);
  return (
    <Animated.View entering={FadeInDown.delay(index * 60)}>
      <Pressable
        onPress={() => { hapticSelection(); onPress(); }}
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
            {translateCanton(entry.canton, language as LanguageCode)}
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
                 { color: progressDiscovered > 0 ? colors.accent : colors.mutedForeground },
              ]}
            >
              {t.sagaProgress(progressDiscovered, accessibleTotal)}
            </Text>
          )}
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  resumeCard: {
    ...GLAS_3D_STARK,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    padding: 16,
  },
  resumeCardCompact: {
    alignItems: "center",
    paddingVertical: 11,
  },
  resumeEyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5 },
  resumeName: { fontFamily: fonts.titleBold, fontSize: 20, marginTop: 4 },
  resumeHint: { fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  resumeCtaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  resumeCtaRowCompact: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  resumeCta: { fontFamily: fonts.bodyBold, fontSize: 14 },
  resumeClose: { padding: 2 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, paddingVertical: 10 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  greeting: { fontFamily: fonts.body, fontSize: 14 },
  name: { fontFamily: fonts.titleBold, fontSize: 30, marginTop: 2 },
  archetype: { fontFamily: fonts.story, fontSize: 14, marginTop: 2 },
  meetupCard: {
    aspectRatio: 3,
    borderWidth: 1,
    overflow: "hidden",
    ...GLAS_3D,
  },
  themeWorldsSection: { marginTop: 8 },
  recommendationCard: {
    marginHorizontal: 20,
    minHeight: 188,
    borderWidth: 1,
    overflow: "hidden",
    ...GLAS_3D_STARK,
  },
  recommendationGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -130,
    right: -54,
  },
  recommendationContent: { flex: 1, padding: 17 },
  recommendationTopline: { flexDirection: "row", alignItems: "center", gap: 10 },
  recommendationIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendationEyebrow: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.6, flex: 1 },
  recommendationTitle: { fontFamily: fonts.titleBold, fontSize: 22, lineHeight: 27, marginTop: 18 },
  recommendationHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 5, maxWidth: 310 },
  recommendationCta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  recommendationCtaText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  recommendationCtaLine: { width: 34, height: 2, borderRadius: 1 },
  themeWorldCard: {
    aspectRatio: 3,
    marginHorizontal: 20,
    borderWidth: 1,
    overflow: "hidden",
    ...GLAS_3D,
  },
  themeWorldCardContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    padding: 16,
  },
  themeWorldCardText: { flex: 1 },
  themeWorldHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  themeWorldIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  themeWorldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 10,
  },
  section: { paddingHorizontal: 20, marginTop: 28, marginBottom: 14 },
  sectionTitle: { fontFamily: fonts.titleBold, fontSize: 22 },
  sectionHint: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  cantonCard: { ...GLAS_3D,
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
  // Kantonsnamen bewusst in der nativen Systemschrift:
  // iOS = San Francisco, Android = Roboto, Web = system-ui.
  cantonName: { fontSize: 19 },
  cantonMeta: { fontFamily: fonts.mono, fontSize: 12, marginTop: 3 },
});
