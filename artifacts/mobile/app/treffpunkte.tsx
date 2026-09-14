import { Feather } from "@expo/vector-icons";
import {
  useGetMeetups,
  useJoinMeetup,
  useLeaveMeetup,
  type Meetup,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { GLAS_3D } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { useMeetupStrings } from "@/lib/i18n/screens/meetups";
import type { LanguageCode } from "@/lib/i18n/languageCode";
import { translateCanton } from "@/lib/i18n/cantonNames";
import { alert } from "@/lib/appAlert";

const WEB_TOP = 67;

export default function Treffpunkte() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useMeetupStrings();
  const { language } = useApp();
  const meetups = useGetMeetups();
  const join = useJoinMeetup();
  const leave = useLeaveMeetup();

  const refresh = () => {
    void meetups.refetch();
  };

  const toggleParticipation = async (meetup: Meetup) => {
    try {
      if (meetup.joined) {
        await leave.mutateAsync({ id: meetup.id });
      } else {
        await join.mutateAsync({ id: meetup.id });
      }
      refresh();
    } catch (error) {
      const message = String(error);
      alert(
        "Treffpunkt",
        message.includes("401") || message.toLowerCase().includes("auth")
          ? t.loginRequired
          : message.includes("voll")
            ? t.full
            : t.error,
      );
    }
  };

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? WEB_TOP : insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow={t.eyebrow} title={t.title} onBack />
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {t.intro}
        </Text>

        <View style={[styles.hintCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          <Feather name="users" size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.hintTitle, { color: colors.foreground }]}>
              {t.create}
            </Text>
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              {t.noRoute}
            </Text>
          </View>
        </View>

        {meetups.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              {t.loading}
            </Text>
          </View>
        ) : meetups.isError ? (
          <View style={[styles.empty, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}>
            <Feather name="wifi-off" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.error}</Text>
            <Pressable onPress={refresh} style={styles.retry}>
              <Text style={[styles.retryText, { color: colors.accent }]}>Erneut laden</Text>
            </Pressable>
          </View>
        ) : !meetups.data?.meetups.length ? (
          <View style={[styles.empty, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}>
            <Feather name="map-pin" size={22} color={colors.accent} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.empty}</Text>
          </View>
        ) : (
          <View style={{ marginTop: 22 }}>
            {meetups.data.meetups.map((meetup) => (
              <MeetupCard
                key={meetup.id}
                meetup={meetup}
                language={language as LanguageCode}
                onRoute={() => router.push(`/route/${encodeURIComponent(meetup.routeId)}`)}
                onToggle={() => void toggleParticipation(meetup)}
                busy={join.isPending || leave.isPending}
                t={t}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Background>
  );
}

function MeetupCard({
  meetup,
  language,
  onRoute,
  onToggle,
  busy,
  t,
}: {
  meetup: Meetup;
  language: LanguageCode;
  onRoute: () => void;
  onToggle: () => void;
  busy: boolean;
  t: ReturnType<typeof useMeetupStrings>;
}) {
  const colors = useColors();
  const start = new Date(meetup.startsAt);
  const locale = language === "de" || language === "gsw" ? "de-CH" : language;
  const date = start.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  const time = start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const isFull = meetup.participantCount >= meetup.maxParticipants && !meetup.joined;

  return (
    <View style={[styles.card, GLAS_3D, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
      <Pressable onPress={onRoute} accessibilityRole="button">
        <View style={styles.cardTop}>
          <View style={[styles.dateBadge, { backgroundColor: colors.accent + "20" }]}>
            <Feather name="calendar" size={17} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.routeName, { color: colors.foreground }]} numberOfLines={2}>
              {meetup.routeName}
            </Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {date} · {time} · {translateCanton(meetup.canton, language)}
            </Text>
          </View>
          <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
        </View>
      </Pressable>

      <View style={styles.detailsRow}>
        <Detail icon="users" text={`${meetup.participantCount}/${meetup.maxParticipants}`} />
        <Detail icon="activity" text={paceLabel(meetup.pace, t)} />
        <Detail icon="user" text={meetup.organizerName} />
      </View>
      {meetup.note ? (
        <Text style={[styles.note, { color: colors.mutedForeground }]}>{meetup.note}</Text>
      ) : null}
      <Pressable
        onPress={onToggle}
        disabled={busy || isFull}
        accessibilityRole="button"
        style={[
          styles.joinButton,
          {
            backgroundColor: meetup.joined ? colors.glassBgStrong : colors.accent,
            borderColor: meetup.joined ? colors.accent : colors.accent,
            opacity: busy || isFull ? 0.55 : 1,
          },
        ]}
      >
        <Feather
          name={meetup.joined ? "check" : isFull ? "lock" : "user-plus"}
          size={16}
          color={meetup.joined ? colors.accent : meetup.joined ? colors.accent : "#fff"}
        />
        <Text style={[styles.joinText, { color: meetup.joined ? colors.accent : "#fff" }]}>
          {meetup.joined ? t.leave : isFull ? t.full : t.join}
        </Text>
      </Pressable>
    </View>
  );
}

function Detail({ icon, text }: { icon: React.ComponentProps<typeof Feather>["name"]; text: string }) {
  const colors = useColors();
  return (
    <View style={styles.detail}>
      <Feather name={icon} size={13} color={colors.mutedForeground} />
      <Text style={[styles.detailText, { color: colors.mutedForeground }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function paceLabel(pace: string, t: ReturnType<typeof useMeetupStrings>): string {
  if (pace === "sportlich") return t.paceSporty;
  if (pace === "normal") return t.paceNormal;
  return t.paceEasy;
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginTop: 12 },
  hintCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 15, padding: 14, marginTop: 20 },
  hintTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  hintText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  loading: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 30 },
  loadingText: { fontFamily: fonts.body, fontSize: 14 },
  empty: { alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 24, marginTop: 22 },
  emptyText: { textAlign: "center", fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 10 },
  retry: { marginTop: 12 },
  retryText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateBadge: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  routeName: { fontFamily: fonts.titleBold, fontSize: 18, lineHeight: 21 },
  meta: { fontFamily: fonts.mono, fontSize: 11, marginTop: 5 },
  detailsRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
  detail: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "42%" },
  detailText: { fontFamily: fonts.mono, fontSize: 11 },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 10 },
  joinButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderRadius: 10, minHeight: 42, marginTop: 14 },
  joinText: { fontFamily: fonts.bodyBold, fontSize: 14 },
});