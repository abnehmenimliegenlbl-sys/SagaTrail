import { Feather } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import {
  getGetMeetupsQueryKey,
  getGetMyCommunitiesQueryKey,
  useGetMeetups,
  useGetMyCommunities,
  useLeaveCommunity,
  useJoinMeetup,
  useLeaveMeetup,
} from "@workspace/api-client-react";
import * as ExpoImage from "expo-image";
import * as Location from "expo-location";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { GLAS_3D } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useCommunityScreenStrings } from "@/lib/i18n/screens/communities";
import { useMeetupStrings } from "@/lib/i18n/screens/meetups";
import { alert } from "@/lib/appAlert";
import { haversineKm } from "@/lib/geo";
import { MeetupSortControl } from "@/components/MeetupSortControl";
import { sortMeetups, type MeetupPosition, type MeetupSortMode } from "@/lib/meetupSorting";

const WEB_TOP = 67;

export default function CommunityDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const t = useCommunityScreenStrings();
  const meetupT = useMeetupStrings();
  const params = useLocalSearchParams<{ id?: string }>();
  const communityId = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [sortMode, setSortMode] = useState<MeetupSortMode>("date");
  const communities = useGetMyCommunities({
    query: {
      queryKey: getGetMyCommunitiesQueryKey(),
      enabled: Boolean(isSignedIn),
      refetchOnMount: "always",
    },
  });
  const leaveCommunity = useLeaveCommunity();

  useEffect(() => {
    let cancelled = false;

    const loadCurrentPosition = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== "granted") return;
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
      } catch {
        // Ohne frischen GPS-Fix wird keine Entfernung angezeigt.
      }
    };

    void loadCurrentPosition();
    return () => {
      cancelled = true;
    };
  }, [communityId]);

  const community = communities.data?.find((item) => item.id === communityId);
  const meetups = useGetMeetups(
    { communityId },
    {
      query: {
        queryKey: getGetMeetupsQueryKey({ communityId }),
        enabled: Boolean(isSignedIn && community),
      },
    },
  );
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  if (communities.isLoading) {
    return (
      <Background>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Background>
    );
  }

  if (communities.isError || !community) {
    return (
      <Background>
        <View style={[styles.center, { paddingTop: insets.top }]}>
          <ScreenHeader title={t.title} onBack />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            {t.error}
          </Text>
        </View>
      </Background>
    );
  }

  const plannedHikes = meetups.data?.meetups.length ?? 0;
  const sortedMeetups = sortMeetups(
    meetups.data?.meetups ?? [],
    sortMode,
    currentPosition,
  );

  const leave = async () => {
    try {
      await leaveCommunity.mutateAsync({ id: community.id });
      await communities.refetch();
      router.replace("/communities");
    } catch (error) {
      const message = error instanceof Error ? error.message : t.error;
      alert(t.leaveCommunity, message);
    }
  };

  const confirmLeave = () => {
    alert(t.leaveCommunity, t.leaveCommunityConfirm(community.name), [
      { text: t.cancel, style: "cancel" },
      {
        text: t.leaveCommunity,
        style: "destructive",
        onPress: () => void leave(),
      },
    ]);
  };

  const shareCommunity = async () => {
    try {
      await Share.share({
        title: community.name,
        message: t.shareInviteMessage(
          community.name,
          community.deepLink,
          community.inviteCode,
        ),
      });
    } catch {
      alert(t.title, t.error);
    }
  };

  const openFacebookGroup = async () => {
    if (!community.facebookGroupUrl) return;
    try {
      await Linking.openURL(community.facebookGroupUrl);
    } catch {
      alert(t.title, t.error);
    }
  };

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
        <ScreenHeader eyebrow={t.eyebrow} title={community.name} onBack />
        <View
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
            <ExpoImage.Image
              source={{ uri: community.coverImageUrl }}
              style={styles.cover}
              contentFit="cover"
              transition={180}
            />
          ) : (
            <View style={[styles.coverFallback, { backgroundColor: colors.accent + "1F" }]}>
              <Feather name="users" size={30} color={colors.accent} />
            </View>
          )}
          <View style={styles.communityCopy}>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {community.description}
            </Text>
            <View style={styles.statsRow}>
              <Feather name="calendar" size={17} color={colors.accent} />
              <Text style={[styles.statsText, { color: colors.foreground }]}>
                {t.futureHikes(plannedHikes)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <ActionButton
            icon="share-2"
            label={t.shareCommunity}
            colors={colors}
            onPress={() => void shareCommunity()}
          />
          {community.facebookGroupUrl ? (
            <ActionButton
              icon="facebook"
              label={t.openFacebookGroup}
              colors={colors}
              onPress={() => void openFacebookGroup()}
            />
          ) : null}
          <ActionButton
            icon="plus-circle"
            label={t.planCommunityHike}
            colors={colors}
            onPress={() =>
              router.push(
                `/treffpunkte/neu?communityId=${encodeURIComponent(community.id)}`,
              )
            }
          />
          <ActionButton
            icon="log-out"
            label={t.leaveCommunity}
            colors={colors}
            disabled={leaveCommunity.isPending}
            destructive
            onPress={confirmLeave}
          />
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.glassBg,
              borderColor: colors.glassBorder,
            },
          ]}
        >
          <View style={styles.infoItem}>
            <Feather name="users" size={17} color={colors.accent} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>
              {t.members(community.memberCount)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Feather name="user" size={17} color={colors.accent} />
            <Text style={[styles.infoText, { color: colors.foreground }]}>
              {t.administrator}: {community.administratorName}
            </Text>
          </View>
        </View>

        {community.announcement ? (
          <View
            style={[
              styles.announcementCard,
              {
                backgroundColor: colors.accent + "12",
                borderColor: colors.accent + "66",
              },
            ]}
          >
            <View style={styles.announcementHeader}>
              <Feather name="bell" size={17} color={colors.accent} />
              <Text style={[styles.announcementTitle, { color: colors.accent }]}>
                {t.announcement}
              </Text>
            </View>
            <Text style={[styles.announcementText, { color: colors.foreground }]}>
              {community.announcement}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.inviteCard,
            {
              backgroundColor: colors.glassBg,
              borderColor: colors.glassBorder,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.inviteLabel, { color: colors.mutedForeground }]}>
              {t.inviteCode}
            </Text>
            <Text style={[styles.inviteCode, { color: colors.foreground }]}>
              {community.inviteCode}
            </Text>
          </View>
          <Pressable
            onPress={() => void shareCommunity()}
            accessibilityRole="button"
            accessibilityLabel={t.shareCommunity}
            style={[styles.smallAction, { borderColor: colors.accent }]}
          >
            <Feather name="share-2" size={15} color={colors.accent} />
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {meetupT.plannedHikes}
          </Text>
          <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
            {plannedHikes}
          </Text>
        </View>

        {meetups.isLoading ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {meetupT.loading}
            </Text>
          </View>
        ) : meetups.isError ? (
          <View style={[styles.statusCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <Feather name="alert-circle" size={20} color={colors.accent} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {meetupT.error}
            </Text>
          </View>
        ) : !meetups.data?.meetups.length ? (
          <View style={[styles.statusCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <Feather name="calendar" size={20} color={colors.accent} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {meetupT.empty}
            </Text>
          </View>
        ) : (
          <>
            <MeetupSortControl
              mode={sortMode}
              onChange={setSortMode}
              distanceAvailable={Boolean(currentPosition)}
              strings={meetupT}
            />
            {sortedMeetups.map((meetup) => (
              <CommunityMeetupCard
                key={meetup.id}
                meetup={meetup}
                colors={colors}
                meetupStrings={meetupT}
                currentPosition={currentPosition}
                onOpen={() => router.push(`/treffpunkte/${meetup.id}`)}
                onRefresh={() => void meetups.refetch()}
              />
            ))}
          </>
        )}
      </ScrollView>
    </Background>
  );
}

function ActionButton({
  icon,
  label,
  colors,
  onPress,
  disabled = false,
  destructive = false,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.actionButton,
        {
          backgroundColor: colors.glassBg,
          borderColor: destructive ? colors.destructive : colors.glassBorder,
          opacity: disabled ? 0.55 : 1,
        },
      ]}
    >
      <Feather
        name={icon}
        size={17}
        color={destructive ? colors.destructive : colors.accent}
      />
      <Text
        style={[
          styles.actionText,
          { color: destructive ? colors.destructive : colors.foreground },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CommunityMeetupCard({
  meetup,
  colors,
  meetupStrings,
  currentPosition,
  onOpen,
  onRefresh,
}: {
  meetup: {
    id: string;
    routeName: string;
    startsAt: string;
    participantCount: number;
    maxParticipants: number;
    joined: boolean;
    routeDistanceKm: number | null;
    routeDifficulty: string | null;
    routeStartLat: number | null;
    routeStartLng: number | null;
  };
  colors: ReturnType<typeof useColors>;
  meetupStrings: ReturnType<typeof useMeetupStrings>;
  currentPosition: { lat: number; lng: number } | null;
  onOpen: () => void;
  onRefresh: () => void;
}) {
  const join = useJoinMeetup();
  const leave = useLeaveMeetup();
  const start = new Date(meetup.startsAt);
  const isFull = meetup.participantCount >= meetup.maxParticipants && !meetup.joined;
  const isBusy = join.isPending || leave.isPending;
  const distanceToMeetingPoint =
    currentPosition &&
    meetup.routeStartLat != null &&
    meetup.routeStartLng != null
      ? haversineKm(currentPosition, {
          lat: meetup.routeStartLat,
          lng: meetup.routeStartLng,
        })
      : null;

  const changeParticipation = async () => {
    if (isFull || isBusy) return;
    try {
      if (meetup.joined) {
        await leave.mutateAsync({ id: meetup.id });
      } else {
        await join.mutateAsync({ id: meetup.id });
      }
      onRefresh();
    } catch {
      // The meetup detail screen exposes the full error state.
    }
  };

  return (
    <View style={[styles.meetupCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
      <Pressable onPress={onOpen} style={styles.meetupContent}>
        <Text style={[styles.routeName, { color: colors.foreground }]} numberOfLines={2}>
          {meetup.routeName}
        </Text>
        <Text style={[styles.meetupMeta, { color: colors.mutedForeground }]}>
          {start.toLocaleDateString()} · {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
        <Text style={[styles.meetupMeta, { color: colors.mutedForeground }]}>
          {meetup.participantCount}/{meetup.maxParticipants} {meetupStrings.participants.toLowerCase()}
        </Text>
        <View style={styles.meetupMetaRow}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.meetupMeta, { color: colors.mutedForeground }]}>
            {distanceToMeetingPoint != null
              ? meetupStrings.meetingDistance(distanceToMeetingPoint)
              : meetupStrings.locationUnavailable}
          </Text>
        </View>
        <View style={styles.meetupMetaRow}>
          <Feather name="trending-up" size={12} color={colors.mutedForeground} />
          <Text style={[styles.meetupMeta, { color: colors.mutedForeground }]}>
            {meetup.routeDistanceKm != null && meetup.routeDifficulty
              ? meetupStrings.routeMeta(meetup.routeDifficulty, meetup.routeDistanceKm)
              : meetupStrings.routeMetaUnavailable}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => void changeParticipation()}
        disabled={isBusy || isFull}
        accessibilityRole="button"
        style={[
          styles.joinButton,
          {
            borderColor: colors.accent,
            backgroundColor: meetup.joined ? colors.glassBgStrong : colors.accent,
            opacity: isBusy || isFull ? 0.55 : 1,
          },
        ]}
      >
        <Text style={[styles.joinText, { color: meetup.joined ? colors.accent : colors.background }]}>
          {meetup.joined ? meetupStrings.leave : isFull ? meetupStrings.full : meetupStrings.join}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  errorText: { fontFamily: fonts.body, fontSize: 14, marginTop: 20, textAlign: "center" },
  communityCard: { ...GLAS_3D, borderWidth: 1, marginTop: 18, overflow: "hidden" },
  cover: { width: "100%", height: 170 },
  coverFallback: { height: 170, alignItems: "center", justifyContent: "center" },
  communityCopy: { padding: 16 },
  description: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  statsText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  actionButton: {
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  actionText: { fontFamily: fonts.bodyBold, fontSize: 11, textAlign: "center" },
  infoCard: { ...GLAS_3D, gap: 10, borderWidth: 1, borderRadius: 16, marginTop: 12, padding: 14 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 9 },
  infoText: { flex: 1, fontFamily: fonts.body, fontSize: 14 },
  announcementCard: { borderWidth: 1, borderRadius: 16, marginTop: 12, padding: 14 },
  announcementHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  announcementTitle: { fontFamily: fonts.bodyBold, fontSize: 14 },
  announcementText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 8 },
  inviteCard: { flexDirection: "row", alignItems: "center", ...GLAS_3D, borderWidth: 1, borderRadius: 16, marginTop: 12, padding: 14 },
  inviteLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.6 },
  inviteCode: { fontFamily: fonts.mono, fontSize: 20, letterSpacing: 2, marginTop: 5 },
  smallAction: { width: 40, height: 40, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.titleBold, fontSize: 20 },
  sectionCount: { fontFamily: fonts.mono, fontSize: 13 },
  status: { alignItems: "center", gap: 10, paddingVertical: 32 },
  statusCard: { ...GLAS_3D, alignItems: "center", gap: 10, borderWidth: 1, padding: 20 },
  statusText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: "center" },
  meetupCard: { ...GLAS_3D, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, marginBottom: 10, padding: 14 },
  meetupContent: { flex: 1 },
  routeName: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  meetupMeta: { fontFamily: fonts.mono, fontSize: 10, marginTop: 5 },
  meetupMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  joinButton: { borderWidth: 1, borderRadius: 9, minHeight: 36, paddingHorizontal: 11, alignItems: "center", justifyContent: "center" },
  joinText: { fontFamily: fonts.bodyBold, fontSize: 11 },
});