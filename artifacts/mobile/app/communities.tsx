import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import {
  getGetMyCommunitiesQueryKey,
  useGetMeetups,
  useGetMyCommunities,
} from "@workspace/api-client-react";
import { Image as ExpoImage } from "expo-image";
import { Stack } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { GLAS_3D } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useCommunityScreenStrings } from "@/lib/i18n/screens/communities";

const WEB_TOP = 67;

export default function CommunitiesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const t = useCommunityScreenStrings();
  const {
    data: communities,
    isLoading,
    isError,
    refetch,
  } = useGetMyCommunities({
    query: {
      queryKey: getGetMyCommunitiesQueryKey(),
      enabled: Boolean(isSignedIn),
      refetchOnMount: "always",
    },
  });
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  return (
    <Background>
      <Stack.Screen options={{ gestureEnabled: true }} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow={t.eyebrow} title={t.title} onBack />
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {t.intro}
        </Text>

        {isLoading && (
          <View style={styles.status}>
            <ActivityIndicator color={colors.accent} />
            <Text
              style={[styles.statusText, { color: colors.mutedForeground }]}
            >
              {t.loading}
            </Text>
          </View>
        )}

        {isError && !isLoading && (
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: colors.glassBg,
                borderColor: colors.glassBorder,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="alert-circle" size={20} color={colors.accent} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>
              {t.error}
            </Text>
            <Pressable
              onPress={() => void refetch()}
              accessibilityRole="button"
              accessibilityLabel={t.retry}
              style={[styles.retryButton, { borderColor: colors.glassBorder }]}
            >
              <Text style={[styles.retryText, { color: colors.accent }]}>
                {t.retry}
              </Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !isError && communities?.length === 0 && (
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: colors.glassBg,
                borderColor: colors.glassBorder,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="users" size={22} color={colors.accent} />
            <Text
              style={[styles.statusText, { color: colors.mutedForeground }]}
            >
              {t.empty}
            </Text>
          </View>
        )}

        {communities?.map((community, index) => (
          <CommunityCard
            key={community.id}
            community={community}
            index={index}
          />
        ))}
      </ScrollView>
    </Background>
  );
}

function CommunityCard({
  community,
  index,
}: {
  community: {
    id: string;
    name: string;
    description: string;
    coverImageUrl?: string | null;
  };
  index: number;
}) {
  const colors = useColors();
  const router = useRouter();
  const t = useCommunityScreenStrings();
  const meetups = useGetMeetups({ communityId: community.id });
  const plannedHikes = meetups.data?.meetups.length ?? 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 70)}>
      <Pressable
        onPress={() => router.push(`/community/${community.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${community.name}. ${t.futureHikes(plannedHikes)}. ${t.openCommunity}`}
        style={[
          styles.communityCard,
          {
            backgroundColor: colors.glassBg,
            borderColor: colors.glassBorder,
            borderRadius: colors.radius,
          },
        ]}
      >
        {community.coverImageUrl ? (
          <ExpoImage
            source={{ uri: community.coverImageUrl }}
            style={styles.cover}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View
            style={[
              styles.coverFallback,
              { backgroundColor: colors.accent + "1F" },
            ]}
          >
            <Feather name="users" size={28} color={colors.accent} />
          </View>
        )}
        <View style={styles.communityCopy}>
          <Text
            style={[styles.communityName, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {community.name}
          </Text>
          <Text
            style={[
              styles.communityDescription,
              { color: colors.mutedForeground },
            ]}
            numberOfLines={4}
          >
            {community.description}
          </Text>

          <View style={styles.communityMeetupsHeader}>
            <Feather name="calendar" size={16} color={colors.accent} />
            <Text style={[styles.communityMeetupsTitle, { color: colors.foreground }]}>
              {meetups.isLoading ? "…" : t.futureHikes(plannedHikes)}
            </Text>
          </View>
          <View style={styles.communityOpenHint}>
            <Text style={[styles.communityOpenHintText, { color: colors.accent }]}>
              {t.openCommunity}
            </Text>
            <Feather name="arrow-up-right" size={16} color={colors.accent} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 20,
  },
  status: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 36,
  },
  statusCard: {
    ...GLAS_3D,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    padding: 20,
  },
  statusText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  retryText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  communityCard: {
    ...GLAS_3D,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    height: 150,
  },
  coverFallback: {
    alignItems: "center",
    justifyContent: "center",
    height: 150,
  },
  communityCopy: {
    padding: 16,
  },
  communityName: {
    fontFamily: fonts.titleBold,
    fontSize: 22,
    lineHeight: 27,
  },
  communityDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },
  communityMeetupsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 18,
  },
  communityMeetupsTitle: {
    fontFamily: fonts.titleBold,
    fontSize: 16,
  },
  communityOpenHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  communityOpenHintText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
});