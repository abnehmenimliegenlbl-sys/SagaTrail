import { Feather } from "@expo/vector-icons";
import {
  useBlockMeetupOrganizer,
  useCreateMeetupShare,
  useGetMeetup,
  useJoinMeetup,
  useLeaveMeetup,
  useRemoveMeetupParticipant,
  useReportMeetup,
} from "@workspace/api-client-react";
import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useMeetupStrings } from "@/lib/i18n/screens/meetups";
import { alert } from "@/lib/appAlert";
import { getApiBaseUrl } from "@/lib/apiConfig";

const WEB_TOP = 67;

export default function MeetupDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useMeetupStrings();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const query = useGetMeetup(id);
  const share = useCreateMeetupShare();
  const report = useReportMeetup();
  const blockOrganizer = useBlockMeetupOrganizer();
  const join = useJoinMeetup();
  const leave = useLeaveMeetup();
  const remove = useRemoveMeetupParticipant();
  const meetup = query.data;

  const exportCalendar = async () => {
    if (!meetup) return;
    const start = new Date(meetup.startsAt);
    const end = new Date(start.getTime() + 4 * 60 * 60_000);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SagaTrail//Mitwanderung//DE",
      "BEGIN:VEVENT",
      `UID:sagatrail-meetup-${meetup.id}@sagatrail`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsEscape(`SagaTrail: ${meetup.routeName}`)}`,
      `LOCATION:${icsEscape(`Offizieller Start der Route ${meetup.routeName}`)}`,
      `DESCRIPTION:${icsEscape(meetup.note ?? "Gemeinsamer Treffpunkt über SagaTrail.")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    try {
      const uri = `${FileSystem.cacheDirectory ?? ""}sagatrail-meetup-${meetup.id}.ics`;
      await FileSystem.writeAsStringAsync(uri, ics, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "text/calendar",
          UTI: "com.apple.ical.ics",
          dialogTitle: "Treffpunkt in Kalender übernehmen",
        });
      } else {
        await Share.share({ message: ics });
      }
    } catch {
      alert("Kalender", "Der Kalendertermin konnte nicht exportiert werden.");
    }
  };

  const shareMeetup = async () => {
    if (!meetup) return;
    try {
      const result = await share.mutateAsync({ id: meetup.id });
      const link = Linking.createURL(result.path);
      await Share.share({
        title: meetup.routeName,
        message: `${meetup.routeName}\n${formatDate(meetup.startsAt)}\n${link}`,
      });
    } catch {
      alert("Treffpunkt", "Der sichere Link konnte nicht erstellt werden.");
    }
  };

  const reportMeetup = () => {
    if (!meetup) return;
    alert("Treffpunkt melden", "Warum möchtest du diesen Treffpunkt melden?", [
      {
        text: "Sicherheitsbedenken",
        onPress: () => void submitReport("safety"),
      },
      {
        text: "Spam oder Belästigung",
        onPress: () => void submitReport("harassment"),
      },
      { text: "Abbrechen" },
    ]);
  };

  const submitReport = async (reason: "safety" | "harassment") => {
    if (!meetup) return;
    try {
      await report.mutateAsync({ id: meetup.id, data: { reason } });
      alert("Meldung", "Danke. Die Meldung wurde gespeichert.");
    } catch {
      alert("Meldung", "Die Meldung konnte nicht gespeichert werden.");
    }
  };

  const blockMeetupOrganizer = () => {
    if (!meetup) return;
    alert("Nutzer blockieren", "Treffpunkte dieses Organisators werden künftig ausgeblendet.", [
      {
        text: "Blockieren",
        onPress: async () => {
          try {
            await blockOrganizer.mutateAsync({ id: meetup.id });
            router.replace("/treffpunkte");
          } catch {
            alert("Blockieren", "Der Nutzer konnte nicht blockiert werden.");
          }
        },
      },
      { text: "Abbrechen" },
    ]);
  };

  const removeParticipant = (userId: string, name: string) => {
    if (!meetup) return;
    alert("Teilnehmer entfernen", `${name} aus dem Treffpunkt entfernen?`, [
      {
        text: "Entfernen",
        onPress: async () => {
          try {
            await remove.mutateAsync({ id: meetup.id, userId });
            await query.refetch();
          } catch {
            alert("Treffpunkt", "Der Teilnehmer konnte nicht entfernt werden.");
          }
        },
      },
      { text: "Abbrechen" },
    ]);
  };

  if (query.isLoading) {
    return (
      <Background>
        <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Background>
    );
  }
  if (query.isError || !meetup) {
    return (
      <Background>
        <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
          <Text style={[styles.error, { color: colors.mutedForeground }]}>Treffpunkt nicht gefunden.</Text>
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? WEB_TOP : insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 100,
        }}
      >
        <ScreenHeader eyebrow={t.eyebrow} title={meetup.routeName} onBack />
        <View style={[styles.hero, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          <View style={[styles.icon, { backgroundColor: colors.accent + "20" }]}>
            <Feather name="calendar" size={22} color={colors.accent} />
          </View>
          <Text style={[styles.date, { color: colors.foreground }]}>{formatDate(meetup.startsAt)}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {meetup.canton} · {meetup.participantCount}/{meetup.maxParticipants} Plätze · {paceLabel(meetup.pace, t)}
          </Text>
        </View>

        {meetup.note ? <Text style={[styles.note, { color: colors.mutedForeground }]}>{meetup.note}</Text> : null}

        <View style={styles.actionRow}>
          <SmallAction icon="calendar" label="Kalender" onPress={() => void exportCalendar()} colors={colors} />
          <SmallAction icon="share-2" label="Teilen" onPress={() => void shareMeetup()} colors={colors} />
          <SmallAction icon="flag" label="Melden" onPress={reportMeetup} colors={colors} />
          <SmallAction icon="slash" label="Blockieren" onPress={blockMeetupOrganizer} colors={colors} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Teilnehmende</Text>
        <View style={[styles.people, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          {meetup.participants.map((participant, index) => (
            <View key={`${participant.name}-${index}`} style={styles.personRow}>
              {avatarUri(participant.avatarUrl) ? (
                <Image source={{ uri: avatarUri(participant.avatarUrl)! }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.accent + "20" }]}>
                  <Text style={[styles.avatarText, { color: colors.accent }]}>
                    {participant.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.personName, { color: colors.foreground }]}>{participant.name}</Text>
              {participant.age ? <Text style={[styles.age, { color: colors.mutedForeground }]}>{participant.age}</Text> : null}
              {participant.name === meetup.organizerName ? (
                <Text style={[styles.organizer, { color: colors.mutedForeground }]}>Organisator</Text>
              ) : meetup.isOrganizer && participant.userId ? (
                <Pressable onPress={() => removeParticipant(participant.userId!, participant.name)} hitSlop={8}>
                  <Feather name="user-minus" size={16} color={colors.destructive} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>

        <PrimaryButton
          label={meetup.joined ? t.leave : t.join}
          variant={meetup.joined ? "secondary" : "primary"}
          loading={join.isPending || leave.isPending}
          onPress={async () => {
            try {
              if (meetup.joined) {
                await leave.mutateAsync({ id: meetup.id });
              } else {
                await join.mutateAsync({ id: meetup.id });
              }
              await query.refetch();
            } catch {
              alert("Treffpunkt", "Die Teilnahme konnte nicht geändert werden.");
            }
          }}
          style={{ marginTop: 20 }}
        />
        <Pressable
          onPress={() => router.push(`/route/${encodeURIComponent(meetup.routeId)}`)}
          style={[styles.routeLink, { borderColor: colors.glassBorder }]}
        >
          <Feather name="map" size={16} color={colors.accent} />
          <Text style={[styles.routeLinkText, { color: colors.accent }]}>{t.routeOpen}</Text>
        </Pressable>
        <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
          Der offizielle Routenstart ist der Treffpunkt. Private Adressen und Live-Standorte werden nicht geteilt.
        </Text>
      </ScrollView>
    </Background>
  );
}

function SmallAction({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.smallAction, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}>
      <Feather name={icon} size={16} color={colors.accent} />
      <Text style={[styles.smallActionText, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsEscape(value: string): string {
  return value.replace(/[\\;,]/g, (match) => `\\${match}`).replace(/\n/g, "\\n");
}

function paceLabel(pace: string, t: ReturnType<typeof useMeetupStrings>): string {
  if (pace === "sportlich") return t.paceSporty;
  if (pace === "normal") return t.paceNormal;
  return t.paceEasy;
}

function avatarUri(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.startsWith("http") ? value : `${getApiBaseUrl()}api/storage${value}`;
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  error: { fontFamily: fonts.body, fontSize: 15 },
  hero: { alignItems: "center", borderWidth: 1, borderRadius: 18, padding: 22, marginTop: 20 },
  icon: { alignItems: "center", borderRadius: 14, height: 48, justifyContent: "center", width: 48 },
  date: { fontFamily: fonts.titleBold, fontSize: 20, marginTop: 12, textAlign: "center" },
  meta: { fontFamily: fonts.mono, fontSize: 12, marginTop: 7, textAlign: "center" },
  note: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 16 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  smallAction: { alignItems: "center", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 9 },
  smallActionText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  sectionTitle: { fontFamily: fonts.titleBold, fontSize: 20, marginTop: 26, marginBottom: 10 },
  people: { borderRadius: 15, borderWidth: 1, paddingHorizontal: 14 },
  personRow: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.12)", flexDirection: "row", gap: 10, minHeight: 58 },
  avatar: { alignItems: "center", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  personName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14 },
  age: { fontFamily: fonts.mono, fontSize: 11 },
  organizer: { fontFamily: fonts.mono, fontSize: 10 },
  privacy: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 14, textAlign: "center" },
  routeLink: { alignItems: "center", borderWidth: 1, borderRadius: 10, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 10, paddingVertical: 11 },
  routeLinkText: { fontFamily: fonts.bodyBold, fontSize: 13 },
});