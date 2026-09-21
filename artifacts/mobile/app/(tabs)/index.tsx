import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import {
  getGetMyCommunitiesQueryKey,
  useGetMyCommunities,
} from "@workspace/api-client-react";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D, GLAS_3D_STARK } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { PremiumUpsellBanner } from "@/components/brand/PremiumUpsellBanner";
import { ProfileAvatar } from "@/components/brand/ProfileAvatar";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useHomeStrings } from "@/lib/i18n/screens/home";
import { useOnboardingStrings } from "@/lib/i18n/screens/onboarding";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import { hapticSelection } from "@/lib/haptics";
import { useMeetupStrings } from "@/lib/i18n/screens/meetups";
import {
  CANTONS_HOME_BANNER,
  COMMUNITIES_HOME_BANNER,
  CUSTOM_ROUTE_HOME_BANNER,
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
  const { isSignedIn } = useAuth();
  const { isElite } = useSubscription();
  const t = useHomeStrings();
  const meetupT = useMeetupStrings();
  const recommendationCopy =
    language === "de" || language === "gsw"
      ? {
          title: "Beste Route für heute",
          hint: "Zeit, Begleitung, Wetter und ÖV zusammen entscheiden lassen",
        }
      : {
          title: "Best route for today",
          hint: "Choose with time, group, weather and transport together",
        };

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;
  const onboardingStrings = useOnboardingStrings();
  const archetypeTitle = profile?.archetype
    ? onboardingStrings.archetypes[profile.archetype].title
    : "";

  const { cantons } = useCatalog();
  const { data: communities } = useGetMyCommunities({
    query: {
      queryKey: getGetMyCommunitiesQueryKey(),
      enabled: Boolean(isSignedIn),
      refetchOnMount: "always",
    },
  });
  const hasCommunities = (communities?.length ?? 0) > 0;

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <ProfileAvatar
            avatarUrl={profile?.avatarUrl}
            name={profile?.name}
            size={58}
          />
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
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={{ paddingHorizontal: 20, marginTop: 20 }}
          >
            <Pressable
              onPress={() =>
                router.push(
                  `/hike/${encodeURIComponent(activeHike.sagaId)}?routeId=${encodeURIComponent(activeHike.routeId)}&resume=1`,
                )
              }
              style={[
                styles.resumeCard,
                styles.resumeCardCompact,
                {
                  backgroundColor: colors.glassBgStrong,
                  borderColor: colors.accent,
                  borderRadius: colors.radius,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.resumeEyebrow, { color: colors.accent }]}>
                  {t.resumeTitle.toUpperCase()}
                </Text>
                <Text
                  style={[styles.resumeName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {activeHike.routeName}
                </Text>
                <View style={styles.resumeCtaRowCompact}>
                  <Feather name="play" size={14} color={colors.accent} />
                  <Text style={[styles.resumeCta, { color: colors.accent }]}>
                    {t.resumeCta}
                  </Text>
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
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={{ paddingHorizontal: 20, marginTop: 20 }}
          >
            <PremiumUpsellBanner
              title={t.premiumBannerTitle}
              body={t.premiumBannerBody}
              cta={t.premiumBannerCta}
            />
          </Animated.View>
        )}

        {pendingPackRewards > 0 && (
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={{ paddingHorizontal: 20, marginTop: 20 }}
          >
            <Pressable
              onPress={() => router.push("/referral-reward")}
              style={[
                styles.resumeCard,
                {
                  backgroundColor: colors.glassBgStrong,
                  borderColor: colors.accent,
                  borderRadius: colors.radius,
                },
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

        {hasCommunities && (
          <HomeEntryCard
            order={0}
            icon="users"
            image={COMMUNITIES_HOME_BANNER}
            title={t.communityTitle}
            hint={t.communityHint}
            onPress={() => router.push("/communities")}
          />
        )}
        <HomeEntryCard
          order={1}
          icon="compass"
          image={THEME_WORLD_HOME_BANNER}
          title={t.themeWorldsTitle}
          hint={t.themeWorldsHint}
          onPress={() => router.push("/themenwelten")}
        />
        <HomeEntryCard
          order={2}
          icon="map"
          image={CANTONS_HOME_BANNER}
          title={t.cantonsTitle}
          hint={t.allCantonsHint(cantons.length)}
          onPress={() => router.push("/kantone")}
        />
        <HomeEntryCard
          order={3}
          icon="map-pin"
          image={MEETUP_HOME_BANNER}
          title={meetupT.title}
          hint={meetupT.intro}
          onPress={() => router.push("/treffpunkte")}
        />
        <HomeEntryCard
          order={4}
          icon="sunrise"
          image={require("../../assets/images/banner-wanderroute-heute.jpg")}
          title={recommendationCopy.title}
          hint={recommendationCopy.hint}
          onPress={() => router.push("/empfehlung")}
        />
        <HomeEntryCard
          order={5}
          icon="navigation"
          image={CUSTOM_ROUTE_HOME_BANNER}
          title={t.customRouteTitle}
          hint={t.customRouteHint}
          onPress={() => router.push("/eigene-route")}
        />
      </ScrollView>
    </Background>
  );
}

function HomeEntryCard({
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
          <View
            style={[
              styles.entryIcon,
              { backgroundColor: colors.accent },
            ]}
          >
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
  resumeCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  resumeCtaRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  resumeCta: { fontFamily: fonts.bodyBold, fontSize: 14 },
  resumeClose: { padding: 2 },
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
