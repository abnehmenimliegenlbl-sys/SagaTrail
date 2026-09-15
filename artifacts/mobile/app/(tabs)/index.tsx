import { Feather } from "@expo/vector-icons";
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
  ROUTE_THEME_KEYS,
  routeThemeLabel,
  type RouteThemeKey,
} from "@/lib/routeThemes";

const WEB_TOP = 67;

const THEME_ICONS: Record<RouteThemeKey, React.ComponentProps<typeof Feather>["name"]> = {
  wasserwege: "droplet",
  burgen_ruinen_alte_wege: "home",
  gipfel_panorama: "triangle",
  geologie_eiszeit: "layers",
  wald_wildtiere: "map",
  alpen_landwirtschaft: "compass",
  pilger_handelswege: "navigation",
  industriekultur: "archive",
  familien_entdecker: "users",
  nacht_sterne: "moon",
  flora_jahreszeiten: "sun",
  bahn_seilbahn: "truck",
};

export default function Entdecken() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    profile,
    language,
    activeHike,
    clearActiveHike,
    lastHike,
    hikeHistory,
    premium,
    freeHikeUsed,
    pendingPackRewards,
  } = useApp();
  const { isElite } = useSubscription();
  const t = useHomeStrings();
  const meetupT = useMeetupStrings();

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
    return [...filtered].sort((a, b) => {
      const aHome = a.canton === profile?.homeCanton ? 0 : 1;
      const bHome = b.canton === profile?.homeCanton ? 0 : 1;
      return aHome - bHome || a.canton.localeCompare(b.canton, "de");
    });
  }, [cantonQuery, cantons, language, profile?.homeCanton]);

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
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

        {/* Hero */}
        <Animated.View
          entering={FadeInDown.duration(500)}
          style={[
            styles.hero,
            GLAS_3D,
            {
              backgroundColor: colors.glassBg,
              borderColor: colors.glassBorder,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
            {t.step1Title}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            {t.whereStart}
          </Text>
          <Text style={[styles.heroBody, { color: colors.mutedForeground }]}>
            {t.heroBody}
          </Text>
        </Animated.View>

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
                <Text style={[styles.resumeHint, { color: colors.mutedForeground }]}>
                  {t.resumeHint(activeHike.chapterIndex + 1, activeHike.chapterCount)}
                </Text>
                <View style={styles.resumeCtaRow}>
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

        {lastHike && (
          <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Pressable
              onPress={() => router.push(`/hike-history/${encodeURIComponent(lastHike.id)}`)}
              style={[
                styles.lastHikeCard,
                { backgroundColor: colors.glassBg, borderColor: colors.glassBorder, borderRadius: colors.radius },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Letzte Wanderung öffnen"
            >
              <View style={styles.lastHikeIcon}>
                <Feather name="book-open" size={17} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resumeEyebrow, { color: colors.accent }]}>LETZTE WANDERUNG</Text>
                <Text style={[styles.resumeName, { color: colors.foreground }]} numberOfLines={1}>
                  {lastHike.routeName}
                </Text>
                <Text style={[styles.resumeHint, { color: colors.mutedForeground }]}>
                  {hikeHistory.length} Eintrag{hikeHistory.length === 1 ? "" : "e"} im Wandertagebuch
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
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
                backgroundColor: colors.glassBg,
                borderColor: colors.glassBorder,
                borderRadius: colors.radius,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={meetupT.title}
          >
            <View style={[styles.meetupIcon, { backgroundColor: colors.accent + "1F" }]}>
              <Feather name="users" size={19} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.meetupTitle, { color: colors.foreground }]}>{meetupT.title}</Text>
              <Text style={[styles.meetupText, { color: colors.mutedForeground }]} numberOfLines={2}>
                {meetupT.intro}
              </Text>
            </View>
            <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.themeWorldsSection}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              {t.themeWorldsTitle}
            </Text>
            <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
              {t.themeWorldsHint}
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themeWorldsContent}
            accessibilityLabel={t.themeWorldsTitle}
          >
            {ROUTE_THEME_KEYS.map((theme) => (
              <View
                key={theme}
                style={[
                  styles.themeWorldCard,
                  {
                    backgroundColor: colors.glassBg,
                    borderColor: colors.glassBorder,
                    borderRadius: colors.radius,
                  },
                ]}
                accessibilityLabel={routeThemeLabel(theme, language)}
              >
                <View style={[styles.themeWorldIcon, { backgroundColor: colors.accent + "1F" }]}>
                  <Feather name={THEME_ICONS[theme]} size={18} color={colors.accent} />
                </View>
                <Text
                  style={[styles.themeWorldLabel, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {routeThemeLabel(theme, language)}
                </Text>
              </View>
            ))}
          </ScrollView>
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
            placeholder="Kanton suchen"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            accessibilityLabel="Kanton suchen"
            returnKeyType="search"
          />
          {cantonQuery.length > 0 && (
            <Pressable onPress={() => setCantonQuery("")} hitSlop={10} accessibilityLabel="Suche löschen">
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
  resumeEyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5 },
  resumeName: { fontFamily: fonts.titleBold, fontSize: 20, marginTop: 4 },
  resumeHint: { fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  resumeCtaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  resumeCta: { fontFamily: fonts.bodyBold, fontSize: 14 },
  resumeClose: { padding: 2 },
  lastHikeCard: {
    ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 14,
  },
  lastHikeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(216,168,78,0.12)",
  },
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
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  greeting: { fontFamily: fonts.body, fontSize: 14 },
  name: { fontFamily: fonts.titleBold, fontSize: 30, marginTop: 2 },
  archetype: { fontFamily: fonts.story, fontSize: 14, marginTop: 2 },
  hero: {
    marginHorizontal: 20,
    padding: 18,
    borderWidth: 1,
  },
  heroEyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  heroTitle: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 6 },
  heroBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 4 },
  meetupCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, padding: 14 },
  meetupIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  meetupTitle: { fontFamily: fonts.titleBold, fontSize: 18 },
  meetupText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  themeWorldsSection: { marginTop: 8 },
  themeWorldsContent: { paddingHorizontal: 20, gap: 10 },
  themeWorldCard: {
    width: 132,
    minHeight: 112,
    borderWidth: 1,
    padding: 12,
    justifyContent: "space-between",
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
