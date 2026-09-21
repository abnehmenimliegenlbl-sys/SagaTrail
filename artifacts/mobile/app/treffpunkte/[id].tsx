import { Feather } from "@expo/vector-icons";
import {
  useBlockMeetupOrganizer,
  useCancelMeetup,
  useCompleteMeetup,
  useCreateMeetupShare,
  useGetMeetup,
  useJoinMeetup,
  useLeaveMeetup,
  useRemoveMeetupParticipant,
  useReportMeetup,
  useSendMeetupMessage,
  useStartMeetup,
  useUpdateMeetupAttendance,
  type MeetupParticipant,
} from "@workspace/api-client-react";
import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { ProfileAvatar } from "@/components/brand/ProfileAvatar";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useCollectionStrings } from "@/lib/i18n/screens/collection";
import { useMeetupStrings } from "@/lib/i18n/screens/meetups";
import { useApp } from "@/contexts/AppContext";
import { alert } from "@/lib/appAlert";

const WEB_TOP = 67;

export default function MeetupDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useMeetupStrings();
  const collectionT = useCollectionStrings();
  const { language, profile } = useApp();
  const flow = FLOW_COPY[language] ?? FLOW_COPY.en;
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const query = useGetMeetup(id);
  const share = useCreateMeetupShare();
  const cancelMeetupMutation = useCancelMeetup();
  const startMeetupMutation = useStartMeetup();
  const completeMeetupMutation = useCompleteMeetup();
  const sendMessageMutation = useSendMeetupMessage();
  const attendance = useUpdateMeetupAttendance();
  const report = useReportMeetup();
  const blockOrganizer = useBlockMeetupOrganizer();
  const join = useJoinMeetup();
  const leave = useLeaveMeetup();
  const remove = useRemoveMeetupParticipant();
  const meetup = query.data;
  const [cancellationReason, setCancellationReason] = useState("");
  const [messageText, setMessageText] = useState("");
  const isNotFound = query.error instanceof Error && "status" in query.error && query.error.status === 404;

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
       `DESCRIPTION:${icsEscape(meetup.note ?? t.calendarDescription)}`,
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
          dialogTitle: t.calendarDialogTitle,
        });
      } else {
        await Share.share({ message: ics });
      }
    } catch {
      alert(t.title, t.calendarExportError);
    }
  };

  const shareMeetup = async () => {
    if (!meetup) return;
    try {
      const result = await share.mutateAsync({ id: meetup.id });
      const link = Linking.createURL(result.path);
      await Share.share({
        title: meetup.routeName,
        message: `${meetup.routeName}\n${formatDate(meetup.startsAt, language)}\n${link}`,
      });
    } catch {
      alert(t.title, t.shareError);
    }
  };

  const reportMeetup = () => {
    if (!meetup) return;
    alert(t.report, t.reportPrompt, [
      {
        text: t.reportSafety,
        onPress: () => void submitReport("safety"),
      },
      {
        text: t.reportHarassment,
        onPress: () => void submitReport("harassment"),
      },
      { text: t.cancel },
    ]);
  };

  const submitReport = async (reason: "safety" | "harassment") => {
    if (!meetup) return;
    try {
      await report.mutateAsync({ id: meetup.id, data: { reason } });
      alert(t.report, t.reportSuccess);
    } catch {
      alert(t.report, t.reportFailure);
    }
  };

  const cancelMeetup = async () => {
    if (!meetup || cancellationReason.trim().length < 3) return;
    try {
      await cancelMeetupMutation.mutateAsync({
        id: meetup.id,
        data: { reason: cancellationReason.trim() },
      });
      await query.refetch();
      alert(flow.cancelTitle, flow.cancelledSuccess);
    } catch {
      alert(flow.cancelTitle, flow.cancelledFailure);
    }
  };

  const updateAttendance = async (
    status: "confirmed" | "delayed" | "arrived",
    delayMinutes?: number,
  ) => {
    if (!meetup) return;
    try {
      await attendance.mutateAsync({
        id: meetup.id,
        data: status === "delayed" ? { status, delayMinutes } : { status },
      });
      await query.refetch();
    } catch {
      alert(t.title, flow.statusFailure);
    }
  };

  const startMeetup = async () => {
    if (!meetup) return;
    try {
      await startMeetupMutation.mutateAsync({ id: meetup.id });
      await query.refetch();
      alert(flow.startTitle, flow.startSuccess);
    } catch {
      alert(flow.startTitle, flow.startFailure);
    }
  };

  const completeMeetup = async () => {
    if (!meetup) return;
    try {
      await completeMeetupMutation.mutateAsync({ id: meetup.id });
      await query.refetch();
      alert(flow.completeTitle, flow.completeSuccess);
    } catch {
      alert(flow.completeTitle, flow.completeFailure);
    }
  };

  const sendMessage = async () => {
    const trimmed = messageText.trim();
    if (!meetup || !trimmed) return;
    try {
      await sendMessageMutation.mutateAsync({
        id: meetup.id,
        data: { messageText: trimmed },
      });
      setMessageText("");
      await query.refetch();
      alert(flow.messageTitle, flow.messageSent);
    } catch {
      alert(flow.messageTitle, flow.messageFailure);
    }
  };

  const chooseDelay = () => {
    alert(flow.delayTitle, flow.delayPrompt, [
      { text: flow.minutes(10), onPress: () => void updateAttendance("delayed", 10) },
      { text: flow.minutes(20), onPress: () => void updateAttendance("delayed", 20) },
      { text: flow.minutes(30), onPress: () => void updateAttendance("delayed", 30) },
      { text: t.cancel, style: "cancel" },
    ]);
  };

  const blockMeetupOrganizer = () => {
    if (!meetup) return;
    alert(t.block, t.blockPrompt, [
      {
        text: t.blockAction,
        onPress: async () => {
          try {
            await blockOrganizer.mutateAsync({ id: meetup.id });
            router.replace("/treffpunkte");
          } catch {
            alert(t.block, t.blockFailure);
          }
        },
      },
      { text: t.cancel },
    ]);
  };

  const removeParticipant = (userId: string, name: string) => {
    if (!meetup) return;
    alert(t.removeParticipant, t.removePrompt(name), [
      {
        text: t.removeAction,
        onPress: async () => {
          try {
            await remove.mutateAsync({ id: meetup.id, userId });
            await query.refetch();
          } catch {
            alert(t.title, t.removeFailure);
          }
        },
      },
      { text: t.cancel },
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
          <Feather name={isNotFound ? "calendar" : "wifi-off"} size={28} color={colors.accent} />
          <Text style={[styles.error, { color: colors.mutedForeground }]}>
            {isNotFound ? t.unavailable : t.loadDetailError}
          </Text>
          <PrimaryButton
            label={t.backToMeetups}
            onPress={() => router.replace("/treffpunkte")}
            style={{ marginTop: 18 }}
          />
        </View>
      </Background>
    );
  }
  const ownParticipant = meetup.participants.find(
    (participant) => participant.userId && participant.userId === profile?.id,
  );
  const isScheduled = meetup.status === "scheduled";
  const isInProgress = meetup.status === "in_progress";
  const isCompleted = meetup.status === "completed";
  const isCancelled = meetup.status === "cancelled";
  const canSendMessage = meetup.isOrganizer
    ? isScheduled || isInProgress
    : meetup.joined && isInProgress;
  const canViewMessages = meetup.joined || meetup.isOrganizer;
  const startsAtMs = new Date(meetup.startsAt).getTime();
  const attendanceWindowOpen =
    Date.now() >= startsAtMs - 3 * 60 * 60_000 &&
    Date.now() <= startsAtMs + 12 * 60 * 60_000;
  const attendanceIsFinal = ownParticipant?.attendanceStatus === "arrived";

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
          <Text style={[styles.date, { color: colors.foreground }]}>{formatDate(meetup.startsAt, language)}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {meetup.canton} · {meetup.participantCount}/{meetup.maxParticipants} Plätze · {paceLabel(meetup.pace, t)}
          </Text>
        </View>

        {isCancelled ? (
          <View style={[styles.cancelledCard, { backgroundColor: colors.destructive + "14", borderColor: colors.destructive }]}>
            <Feather name="x-circle" size={20} color={colors.destructive} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.destructive }]}>{flow.cancelled}</Text>
              <Text style={[styles.cardBody, { color: colors.foreground }]}>
                {meetup.cancellationReason || flow.noCancellationReason}
              </Text>
            </View>
          </View>
        ) : null}

        {!isScheduled && !isCancelled ? (
          <View style={[styles.statusCard, { backgroundColor: colors.accent + "14", borderColor: colors.accent }]}>
            <Feather name={isCompleted ? "check-circle" : "play-circle"} size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.accent }]}>
                {isCompleted ? flow.completed : flow.inProgress}
              </Text>
              <Text style={[styles.cardBody, { color: colors.foreground }]}>
                {isCompleted ? flow.completeSuccess : flow.startSuccess}
              </Text>
            </View>
          </View>
        ) : null}

        {meetup.note ? <Text style={[styles.note, { color: colors.mutedForeground }]}>{meetup.note}</Text> : null}

        <View style={styles.actionRow}>
           <SmallAction icon="calendar" label={t.calendar} onPress={() => void exportCalendar()} colors={colors} />
           <SmallAction icon="share-2" label={t.share} onPress={() => void shareMeetup()} colors={colors} />
            {isCompleted && (meetup.joined || meetup.isOrganizer) ? (
              <SmallAction
                icon="image"
                label="Fotos"
                onPress={() => router.push(`/treffpunkt-fotos/${meetup.id}`)}
                colors={colors}
              />
            ) : null}
           <SmallAction icon="flag" label={t.report} onPress={reportMeetup} colors={colors} />
           <SmallAction icon="slash" label={t.block} onPress={blockMeetupOrganizer} colors={colors} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.participantsTitle}</Text>
        <View style={[styles.people, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          {meetup.participants.map((participant, index) => (
             <View key={`${participant.name}-${index}`} style={styles.personRow}>
              <ProfileAvatar avatarUrl={participant.avatarUrl} name={participant.name} size={36} />
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: colors.foreground }]}>
                  {participant.name}
                  {participant.age ? ` · ${t.ageLabel(participant.age)}` : ""}
                </Text>
                {participant.bio?.trim() ? (
                  <Text
                    numberOfLines={3}
                    ellipsizeMode="tail"
                    style={[styles.personBio, { color: colors.mutedForeground }]}
                  >
                    {participant.bio.trim()}
                  </Text>
                ) : null}
                {meetup.joined || meetup.isOrganizer ? (
                  <ParticipantRecognition
                    participant={participant}
                    collectionT={collectionT}
                    t={t}
                    colors={colors}
                  />
                ) : null}
              </View>
               <View style={styles.personActions}>
                 {participant.attendanceStatus ? <View style={[
                   styles.statusBadge,
                   {
                     backgroundColor:
                       participant.attendanceStatus === "arrived"
                         ? colors.accent + "20"
                         : participant.attendanceStatus === "delayed"
                           ? colors.destructive + "14"
                           : colors.glassBgStrong,
                   },
                 ]}>
                   <Text style={[
                     styles.statusBadgeText,
                     {
                       color:
                         participant.attendanceStatus === "arrived"
                           ? colors.accent
                           : participant.attendanceStatus === "delayed"
                             ? colors.destructive
                             : colors.mutedForeground,
                     },
                   ]}>
                     {participant.attendanceStatus === "arrived"
                       ? flow.arrived
                       : participant.attendanceStatus === "delayed"
                         ? flow.delayed(participant.delayMinutes ?? 0)
                         : flow.confirmed}
                   </Text>
                 </View> : null}
                 {participant.name === meetup.organizerName ? (
                   <Text style={[styles.organizer, { color: colors.mutedForeground }]}>{t.organizerBadge}</Text>
                 ) : meetup.isOrganizer && participant.userId ? (
                   <Pressable
                     accessibilityLabel={t.removeParticipant}
                     onPress={() => removeParticipant(participant.userId!, participant.name)}
                     hitSlop={8}
                   >
                     <Feather name="user-minus" size={16} color={colors.destructive} />
                   </Pressable>
                 ) : null}
               </View>
            </View>
          ))}
        </View>

        {meetup.joined && (isScheduled || isInProgress) ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{flow.myStatus}</Text>
            {attendanceWindowOpen && !attendanceIsFinal ? (
              <View style={styles.statusActions}>
                <StatusAction
                  icon="check"
                  label={flow.confirmed}
                  active={ownParticipant?.attendanceStatus === "confirmed"}
                  onPress={() => void updateAttendance("confirmed")}
                  colors={colors}
                />
                <StatusAction
                  icon="clock"
                  label={flow.delayTitle}
                  active={ownParticipant?.attendanceStatus === "delayed"}
                  onPress={chooseDelay}
                  colors={colors}
                />
                <StatusAction
                  icon="map-pin"
                  label={flow.arrived}
                  active={false}
                  onPress={() => void updateAttendance("arrived")}
                  colors={colors}
                />
              </View>
            ) : null}
            <Text style={[styles.statusHint, { color: colors.mutedForeground }]}>
              {attendanceIsFinal
                ? flow.arrivedFinal
                : attendanceWindowOpen
                  ? flow.statusHint
                  : flow.statusWindow}
            </Text>
          </>
        ) : null}

        {!meetup.isOrganizer && isScheduled ? (
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
                alert(t.title, t.participationError);
              }
            }}
            style={{ marginTop: 20 }}
          />
        ) : null}

        {meetup.isOrganizer && (isScheduled || isInProgress) ? (
          <View style={[styles.lifecycleCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {isScheduled ? flow.startTitle : flow.completeTitle}
            </Text>
            <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
              {isScheduled ? flow.startBody : flow.completeBody}
            </Text>
            <PrimaryButton
              label={isScheduled ? flow.startAction : flow.completeAction}
              variant={isScheduled ? "primary" : "secondary"}
              loading={startMeetupMutation.isPending || completeMeetupMutation.isPending}
              onPress={() => {
                alert(
                  isScheduled ? flow.startTitle : flow.completeTitle,
                  isScheduled ? flow.startBody : flow.completeBody,
                  [
                    {
                      text: isScheduled ? flow.startAction : flow.completeAction,
                      onPress: () => void (isScheduled ? startMeetup() : completeMeetup()),
                    },
                    { text: t.cancel },
                  ],
                );
              }}
            />
          </View>
        ) : null}

        {canViewMessages && (meetup.messages.length > 0 || canSendMessage) ? (
          <View style={[styles.messageCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{flow.messageTitle}</Text>
            {meetup.messages.length > 0 ? (
              <View style={styles.messageList}>
                {meetup.messages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageRow,
                      {
                        backgroundColor:
                          message.senderUserId === profile?.id ? colors.accent + "18" : colors.glassBgStrong,
                        borderColor: colors.glassBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.messageMeta, { color: colors.mutedForeground }]}>
                      {message.senderName} · {formatTime(message.createdAt, language)}
                    </Text>
                    <Text style={[styles.messageBody, { color: colors.foreground }]}>{message.messageText}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {canSendMessage ? (
              <>
                <TextInput
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder={flow.messagePlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  maxLength={500}
                  style={[styles.messageInput, { color: colors.foreground, borderColor: colors.glassBorder }]}
                />
                <PrimaryButton
                  label={flow.messageSend}
                  variant="secondary"
                  disabled={!messageText.trim()}
                  loading={sendMessageMutation.isPending}
                  onPress={() => void sendMessage()}
                />
              </>
            ) : null}
          </View>
        ) : null}

        {meetup.isOrganizer && isScheduled ? (
          <View style={[styles.cancelCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{flow.cancelTitle}</Text>
            <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{flow.cancelBody}</Text>
            <TextInput
              value={cancellationReason}
              onChangeText={setCancellationReason}
              placeholder={flow.cancelPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={300}
              style={[styles.reasonInput, { color: colors.foreground, borderColor: colors.glassBorder }]}
            />
            <PrimaryButton
              label={flow.cancelAction}
              variant="secondary"
              disabled={cancellationReason.trim().length < 3}
              loading={cancelMeetupMutation.isPending}
              onPress={() => void cancelMeetup()}
            />
          </View>
        ) : null}

        <View style={[styles.safetyCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          <Feather name="shield" size={20} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{flow.safetyTitle}</Text>
            <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{flow.safetyBody}</Text>
            <View style={styles.emergencyRow}>
              <Pressable onPress={() => void Linking.openURL("tel:1414")} style={[styles.emergencyButton, { borderColor: colors.accent }]}>
                <Text style={[styles.emergencyText, { color: colors.accent }]}>Rega 1414</Text>
              </Pressable>
              <Pressable onPress={() => void Linking.openURL("tel:112")} style={[styles.emergencyButton, { borderColor: colors.destructive }]}>
                <Text style={[styles.emergencyText, { color: colors.destructive }]}>112</Text>
              </Pressable>
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => router.push(`/route/${encodeURIComponent(meetup.routeId)}`)}
          style={[styles.routeLink, { borderColor: colors.glassBorder }]}
        >
          <Feather name="map" size={16} color={colors.accent} />
          <Text style={[styles.routeLinkText, { color: colors.accent }]}>{t.routeOpen}</Text>
        </Pressable>
        <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
          {t.privacyNotice}
        </Text>
      </ScrollView>
    </Background>
  );
}

const GROUP_HIKE_MILESTONES = [1, 3, 5, 10, 15, 20] as const;
type GroupHikeMilestone = (typeof GROUP_HIKE_MILESTONES)[number];
type MeetupParticipantWithRecognition = MeetupParticipant & {
  rankLevel?: number;
  groupAchievements?: Array<{ id: string; threshold: number; title: string }>;
};

function ParticipantRecognition({
  participant,
  collectionT,
  t,
  colors,
}: {
  participant: MeetupParticipantWithRecognition;
  collectionT: ReturnType<typeof useCollectionStrings>;
  t: ReturnType<typeof useMeetupStrings>;
  colors: ReturnType<typeof useColors>;
}) {
  const rankName =
    typeof participant.rankLevel === "number" && participant.rankLevel >= 0
      ? collectionT.ranks[participant.rankLevel]
      : undefined;
  const achievements = (participant.groupAchievements ?? []).filter((achievement) =>
    GROUP_HIKE_MILESTONES.includes(achievement.threshold as GroupHikeMilestone),
  );

  if (!rankName && achievements.length === 0) return null;

  return (
    <View style={styles.recognition}>
      {rankName ? (
        <View style={styles.rankLine}>
          <Feather name="award" size={13} color={colors.accent} />
          <Text style={[styles.rankLabel, { color: colors.accent }]}>
            {t.rankLabel}: {rankName}
          </Text>
        </View>
      ) : null}
      {achievements.length > 0 ? (
        <View style={styles.achievementList}>
          {achievements.map((achievement) => (
            <View
              key={achievement.id}
              accessible
              accessibilityRole="image"
              accessibilityLabel={t.groupAchievementAccessibility(achievement.threshold)}
              style={[
                styles.achievementBadge,
                { backgroundColor: colors.accent + "18", borderColor: colors.accent + "55" },
              ]}
            >
              <Feather name="users" size={11} color={colors.accent} />
              <Text style={[styles.achievementText, { color: colors.accent }]}>
                {t.groupAchievement(achievement.threshold)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function StatusAction({
  icon,
  label,
  active,
  onPress,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.statusAction,
        {
          borderColor: active ? colors.accent : colors.glassBorder,
          backgroundColor: active ? colors.accent + "18" : colors.glassBg,
        },
      ]}
    >
      <Feather name={icon} size={17} color={active ? colors.accent : colors.mutedForeground} />
      <Text style={[styles.statusActionText, { color: active ? colors.accent : colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

function SmallAction({
  icon,
  label,
  onPress,
  colors,
  destructive = false,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.smallAction,
        {
          borderColor: destructive ? colors.destructive : colors.glassBorder,
          backgroundColor: colors.glassBg,
        },
      ]}
    >
      <Feather name={icon} size={16} color={destructive ? colors.destructive : colors.accent} />
      <Text style={[styles.smallActionText, { color: destructive ? colors.destructive : colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatDate(value: string, language: string): string {
  const locale = language === "de" || language === "gsw" ? "de-CH" : language;
  return new Date(value).toLocaleString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value: string, language: string): string {
  const locale = language === "de" || language === "gsw" ? "de-CH" : language;
  return new Date(value).toLocaleTimeString(locale, {
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
  personRow: { alignItems: "flex-start", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.12)", flexDirection: "row", gap: 10, minHeight: 58, paddingVertical: 9 },
  personInfo: { flex: 1, minWidth: 0 },
  personName: { fontFamily: fonts.bodyBold, fontSize: 14 },
  personBio: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  recognition: { gap: 6, marginTop: 6 },
  rankLine: { alignItems: "center", flexDirection: "row", gap: 5 },
  rankLabel: { fontFamily: fonts.mono, fontSize: 10 },
  achievementList: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  achievementBadge: { alignItems: "center", borderRadius: 7, borderWidth: 1, flexDirection: "row", gap: 4, paddingHorizontal: 6, paddingVertical: 4 },
  achievementText: { fontFamily: fonts.bodyBold, fontSize: 10 },
  personActions: { alignItems: "flex-end", flexShrink: 0, gap: 6 },
  organizer: { fontFamily: fonts.mono, fontSize: 10 },
  privacy: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 14, textAlign: "center" },
  routeLink: { alignItems: "center", borderWidth: 1, borderRadius: 10, flexDirection: "row", gap: 7, justifyContent: "center", marginTop: 10, paddingVertical: 11 },
  routeLinkText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  cancelledCard: { alignItems: "flex-start", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, marginTop: 16, padding: 14 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  cardBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 3 },
  statusBadge: { borderRadius: 8, flexShrink: 0, paddingHorizontal: 7, paddingVertical: 4 },
  statusBadgeText: { fontFamily: fonts.mono, fontSize: 9 },
  statusActions: { flexDirection: "row", gap: 8 },
  statusAction: { alignItems: "center", borderRadius: 12, borderWidth: 1, flex: 1, gap: 5, minHeight: 66, justifyContent: "center", padding: 8 },
  statusActionText: { fontFamily: fonts.bodyBold, fontSize: 11, textAlign: "center" },
  statusHint: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, marginTop: 8 },
  cancelCard: { borderRadius: 15, borderWidth: 1, marginTop: 22, padding: 15 },
  reasonInput: { borderRadius: 10, borderWidth: 1, fontFamily: fonts.body, fontSize: 14, marginVertical: 12, minHeight: 70, padding: 11, textAlignVertical: "top" },
  statusCard: { alignItems: "flex-start", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, marginTop: 16, padding: 14 },
  lifecycleCard: { borderRadius: 15, borderWidth: 1, marginTop: 22, padding: 15 },
  messageCard: { borderRadius: 15, borderWidth: 1, marginTop: 22, padding: 15 },
  messageList: { gap: 8, marginTop: 12 },
  messageRow: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  messageMeta: { fontFamily: fonts.mono, fontSize: 10 },
  messageBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 19, marginTop: 3 },
  messageInput: { borderRadius: 10, borderWidth: 1, fontFamily: fonts.body, fontSize: 14, marginVertical: 12, minHeight: 70, padding: 11, textAlignVertical: "top" },
  safetyCard: { alignItems: "flex-start", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 11, marginTop: 22, padding: 15 },
  emergencyRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  emergencyButton: { borderRadius: 9, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  emergencyText: { fontFamily: fonts.bodyBold, fontSize: 12 },
});

type FlowCopy = {
  confirmed: string;
  arrived: string;
  delayed: (minutes: number) => string;
  delayTitle: string;
  delayPrompt: string;
  minutes: (minutes: number) => string;
  myStatus: string;
  statusHint: string;
  statusWindow: string;
  arrivedFinal: string;
  statusFailure: string;
  cancelTitle: string;
  cancelBody: string;
  cancelPlaceholder: string;
  cancelAction: string;
  cancelled: string;
  noCancellationReason: string;
  cancelledSuccess: string;
  cancelledFailure: string;
  safetyTitle: string;
  safetyBody: string;
  inProgress: string;
  completed: string;
  startTitle: string;
  startBody: string;
  startAction: string;
  startSuccess: string;
  startFailure: string;
  completeTitle: string;
  completeBody: string;
  completeAction: string;
  completeSuccess: string;
  completeFailure: string;
  messageTitle: string;
  messagePlaceholder: string;
  messageSend: string;
  messageSent: string;
  messageFailure: string;
};

const FLOW_COPY: Record<string, FlowCopy> = {
  de: {
    confirmed: "Dabei", arrived: "Angekommen", delayed: (m) => `${m} Min. später`,
    delayTitle: "Verspätet", delayPrompt: "Wie viel später kommst du?", minutes: (m) => `${m} Minuten`,
    myStatus: "Mein Status", statusHint: "Eine Verspätung informiert die anderen Teilnehmenden per Push.",
    statusWindow: "Der Status kann ab drei Stunden vor dem Start geändert werden.", arrivedFinal: "Du bist als angekommen markiert.",
    statusFailure: "Der Status konnte nicht aktualisiert werden.", cancelTitle: "Treffpunkt absagen",
    cancelBody: "Alle Teilnehmenden erhalten den Grund als Push-Nachricht.", cancelPlaceholder: "Grund der Absage",
    cancelAction: "Treffpunkt absagen", cancelled: "Treffpunkt abgesagt", noCancellationReason: "Kein Grund angegeben.",
    cancelledSuccess: "Die Absage ist gespeichert. Die Teilnehmenden werden informiert.", cancelledFailure: "Der Treffpunkt konnte nicht abgesagt werden.",
    safetyTitle: "Sicherheit", safetyBody: "Bei Gefahr direkt Hilfe rufen. Treffpunkte teilen keine Live-Standorte.",
    inProgress: "Wanderung läuft", completed: "Wanderung abgeschlossen",
    startTitle: "Treffpunkt starten", startBody: "Damit beginnt die gemeinsame Wanderung. Alle Teilnehmenden werden informiert.",
    startAction: "Wanderung starten", startSuccess: "Die Wanderung ist gestartet.", startFailure: "Der Treffpunkt konnte nicht gestartet werden.",
    completeTitle: "Wanderung abschliessen", completeBody: "Damit wird der Treffpunkt beendet. Weitere Nachrichten sind danach nicht mehr möglich.",
    completeAction: "Wanderung abschliessen", completeSuccess: "Die Wanderung ist abgeschlossen.", completeFailure: "Der Treffpunkt konnte nicht abgeschlossen werden.",
    messageTitle: "Nachricht an die Gruppe", messagePlaceholder: "Nachricht für die anderen Teilnehmenden …",
    messageSend: "Nachricht senden", messageSent: "Die Nachricht wurde an die Gruppe gesendet.", messageFailure: "Die Nachricht konnte nicht gesendet werden.",
  },
  gsw: {
    confirmed: "Debii", arrived: "Aacho", delayed: (m) => `${m} Min. spöter`,
    delayTitle: "Verspötet", delayPrompt: "Wie viel spöter chunsch?", minutes: (m) => `${m} Minute`,
    myStatus: "Min Status", statusHint: "Bi Verspötig werded die andere per Push informiert.",
    statusWindow: "De Status chasch ab drü Stund vor em Start ändere.", arrivedFinal: "Du bisch als aacho markiert.",
    statusFailure: "De Status het nöd chönne aktualisiert werde.", cancelTitle: "Treffpunkt absäge",
    cancelBody: "Alli Teilnehmende bechömed de Grund als Push.", cancelPlaceholder: "Grund vo de Absag",
    cancelAction: "Treffpunkt absäge", cancelled: "Treffpunkt abgseit", noCancellationReason: "Kei Grund agäh.",
    cancelledSuccess: "D Absag isch gspeicheret. D Teilnehmende werded informiert.", cancelledFailure: "De Treffpunkt het nöd chönne abgseit werde.",
    safetyTitle: "Sicherheit", safetyBody: "Bi Gfahr direkt Hilf rüefe. Treffpünkt teiled kei Live-Standört.",
    inProgress: "Wanderig lauft", completed: "Wanderig fertig",
    startTitle: "Treffpunkt starte", startBody: "Damit fangt d gemeinsame Wanderig aa. Alli Teilnehmendi werde informiert.",
    startAction: "Wanderig starte", startSuccess: "D Wanderig isch gstartet.", startFailure: "De Treffpunkt het nöd chönne gstartet werde.",
    completeTitle: "Wanderig abschlüsse", completeBody: "Damit wird de Treffpunkt beendet. Nachher sind kei Nachricht meh möglich.",
    completeAction: "Wanderig abschlüsse", completeSuccess: "D Wanderig isch fertig.", completeFailure: "De Treffpunkt het nöd chönne abgeschlosse werde.",
    messageTitle: "Nachricht a d Gruppe", messagePlaceholder: "Nachricht für d andere Teilnehmendi …",
    messageSend: "Nachricht sende", messageSent: "D Nachricht isch a d Gruppe gsendet worde.", messageFailure: "D Nachricht het nöd chönne gsendet werde.",
  },
  fr: {
    confirmed: "Confirmé", arrived: "Arrivé", delayed: (m) => `${m} min de retard`,
    delayTitle: "En retard", delayPrompt: "Quel sera votre retard ?", minutes: (m) => `${m} minutes`,
    myStatus: "Mon statut", statusHint: "Un retard avertit les autres participants par notification.",
    statusWindow: "Le statut peut être modifié dès trois heures avant le départ.", arrivedFinal: "Vous êtes marqué comme arrivé.",
    statusFailure: "Impossible de mettre à jour le statut.", cancelTitle: "Annuler le rendez-vous",
    cancelBody: "Tous les participants recevront le motif par notification.", cancelPlaceholder: "Motif de l’annulation",
    cancelAction: "Annuler le rendez-vous", cancelled: "Rendez-vous annulé", noCancellationReason: "Aucun motif indiqué.",
    cancelledSuccess: "L’annulation est enregistrée. Les participants seront informés.", cancelledFailure: "Impossible d’annuler le rendez-vous.",
    safetyTitle: "Sécurité", safetyBody: "En cas de danger, appelez directement les secours. Aucun suivi en direct n’est partagé.",
    inProgress: "Randonnée en cours", completed: "Randonnée terminée",
    startTitle: "Démarrer le rendez-vous", startBody: "La randonnée commune commence. Tous les participants seront informés.",
    startAction: "Démarrer la randonnée", startSuccess: "La randonnée a commencé.", startFailure: "Impossible de démarrer le rendez-vous.",
    completeTitle: "Terminer la randonnée", completeBody: "Le rendez-vous sera terminé et les nouveaux messages seront désactivés.",
    completeAction: "Terminer la randonnée", completeSuccess: "La randonnée est terminée.", completeFailure: "Impossible de terminer le rendez-vous.",
    messageTitle: "Message au groupe", messagePlaceholder: "Message pour les autres participants …",
    messageSend: "Envoyer le message", messageSent: "Le message a été envoyé au groupe.", messageFailure: "Impossible d’envoyer le message.",
  },
  it: {
    confirmed: "Confermato", arrived: "Arrivato", delayed: (m) => `${m} min di ritardo`,
    delayTitle: "In ritardo", delayPrompt: "Quanto ritardo avrai?", minutes: (m) => `${m} minuti`,
    myStatus: "Il mio stato", statusHint: "Un ritardo avvisa gli altri partecipanti con una notifica.",
    statusWindow: "Lo stato può essere modificato da tre ore prima della partenza.", arrivedFinal: "Sei segnato come arrivato.",
    statusFailure: "Impossibile aggiornare lo stato.", cancelTitle: "Annulla il ritrovo",
    cancelBody: "Tutti i partecipanti riceveranno il motivo tramite notifica.", cancelPlaceholder: "Motivo dell’annullamento",
    cancelAction: "Annulla ritrovo", cancelled: "Ritrovo annullato", noCancellationReason: "Nessun motivo indicato.",
    cancelledSuccess: "L’annullamento è salvato. I partecipanti saranno informati.", cancelledFailure: "Impossibile annullare il ritrovo.",
    safetyTitle: "Sicurezza", safetyBody: "In caso di pericolo chiama subito i soccorsi. Nessuna posizione live viene condivisa.",
    inProgress: "Escursione in corso", completed: "Escursione completata",
    startTitle: "Avvia ritrovo", startBody: "Inizia l’escursione comune. Tutti i partecipanti saranno informati.",
    startAction: "Avvia escursione", startSuccess: "L’escursione è iniziata.", startFailure: "Impossibile avviare il ritrovo.",
    completeTitle: "Completa escursione", completeBody: "Il ritrovo verrà concluso e non saranno più possibili nuovi messaggi.",
    completeAction: "Completa escursione", completeSuccess: "L’escursione è completata.", completeFailure: "Impossibile completare il ritrovo.",
    messageTitle: "Messaggio al gruppo", messagePlaceholder: "Messaggio per gli altri partecipanti …",
    messageSend: "Invia messaggio", messageSent: "Il messaggio è stato inviato al gruppo.", messageFailure: "Impossibile inviare il messaggio.",
  },
  en: {
    confirmed: "Confirmed", arrived: "Arrived", delayed: (m) => `${m} min late`,
    delayTitle: "Running late", delayPrompt: "How much later will you arrive?", minutes: (m) => `${m} minutes`,
    myStatus: "My status", statusHint: "Reporting a delay notifies the other participants.",
    statusWindow: "Status updates open three hours before the start.", arrivedFinal: "You are marked as arrived.",
    statusFailure: "The status could not be updated.", cancelTitle: "Cancel meetup",
    cancelBody: "All participants will receive the reason by push notification.", cancelPlaceholder: "Reason for cancellation",
    cancelAction: "Cancel meetup", cancelled: "Meetup cancelled", noCancellationReason: "No reason provided.",
    cancelledSuccess: "The cancellation is saved. Participants will be notified.", cancelledFailure: "The meetup could not be cancelled.",
    safetyTitle: "Safety", safetyBody: "Call for help immediately in an emergency. Meetups do not share live locations.",
    inProgress: "Hike in progress", completed: "Hike completed",
    startTitle: "Start meetup", startBody: "This starts the group hike. All participants will be notified.",
    startAction: "Start hike", startSuccess: "The hike has started.", startFailure: "The meetup could not be started.",
    completeTitle: "Complete hike", completeBody: "This ends the meetup. New messages will no longer be possible.",
    completeAction: "Complete hike", completeSuccess: "The hike is complete.", completeFailure: "The meetup could not be completed.",
    messageTitle: "Message the group", messagePlaceholder: "Message for the other participants …",
    messageSend: "Send message", messageSent: "The message was sent to the group.", messageFailure: "The message could not be sent.",
  },
  zh: {
    confirmed: "已确认", arrived: "已到达", delayed: (m) => `迟到 ${m} 分钟`,
    delayTitle: "将迟到", delayPrompt: "你会晚到多久？", minutes: (m) => `${m} 分钟`,
    myStatus: "我的状态", statusHint: "报告迟到会通过推送通知其他参与者。",
    statusWindow: "出发前三小时起可更新状态。", arrivedFinal: "你已标记为到达。",
    statusFailure: "无法更新状态。", cancelTitle: "取消集合", cancelBody: "所有参与者都会收到包含原因的推送通知。",
    cancelPlaceholder: "取消原因", cancelAction: "取消集合", cancelled: "集合已取消", noCancellationReason: "未提供原因。",
    cancelledSuccess: "取消已保存，参与者将收到通知。", cancelledFailure: "无法取消集合。",
    safetyTitle: "安全", safetyBody: "遇到危险请立即呼救。集合不会共享实时位置。",
    inProgress: "徒步进行中", completed: "徒步已完成",
    startTitle: "开始集合", startBody: "共同徒步现在开始。所有参与者都会收到通知。",
    startAction: "开始徒步", startSuccess: "徒步已开始。", startFailure: "无法开始集合。",
    completeTitle: "完成徒步", completeBody: "集合将结束，之后不能再发送新消息。",
    completeAction: "完成徒步", completeSuccess: "徒步已完成。", completeFailure: "无法完成集合。",
    messageTitle: "给小组发消息", messagePlaceholder: "给其他参与者的消息 …",
    messageSend: "发送消息", messageSent: "消息已发送给小组。", messageFailure: "无法发送消息。",
  },
  es: {
    confirmed: "Confirmado", arrived: "He llegado", delayed: (m) => `${m} min tarde`,
    delayTitle: "Voy tarde", delayPrompt: "¿Cuánto tardarás?", minutes: (m) => `${m} minutos`,
    myStatus: "Mi estado", statusHint: "Un retraso avisa a los demás participantes por notificación.",
    statusWindow: "El estado se puede cambiar desde tres horas antes.", arrivedFinal: "Estás marcado como llegado.",
    statusFailure: "No se ha podido actualizar el estado.", cancelTitle: "Cancelar encuentro",
    cancelBody: "Todos recibirán el motivo mediante una notificación.", cancelPlaceholder: "Motivo de la cancelación",
    cancelAction: "Cancelar encuentro", cancelled: "Encuentro cancelado", noCancellationReason: "Sin motivo indicado.",
    cancelledSuccess: "La cancelación está guardada. Se informará a los participantes.", cancelledFailure: "No se ha podido cancelar el encuentro.",
    safetyTitle: "Seguridad", safetyBody: "En caso de peligro llama directamente a emergencias. No se comparten ubicaciones en directo.",
    inProgress: "Caminata en curso", completed: "Caminata completada",
    startTitle: "Iniciar encuentro", startBody: "Así comienza la caminata conjunta. Se avisará a todos los participantes.",
    startAction: "Iniciar caminata", startSuccess: "La caminata ha comenzado.", startFailure: "No se ha podido iniciar el encuentro.",
    completeTitle: "Completar caminata", completeBody: "El encuentro terminará y ya no se podrán enviar mensajes nuevos.",
    completeAction: "Completar caminata", completeSuccess: "La caminata ha terminado.", completeFailure: "No se ha podido completar el encuentro.",
    messageTitle: "Mensaje al grupo", messagePlaceholder: "Mensaje para los demás participantes …",
    messageSend: "Enviar mensaje", messageSent: "El mensaje se ha enviado al grupo.", messageFailure: "No se ha podido enviar el mensaje.",
  },
  pt: {
    confirmed: "Confirmado", arrived: "Cheguei", delayed: (m) => `${m} min atrasado`,
    delayTitle: "Vou atrasar", delayPrompt: "Quanto tempo vai atrasar?", minutes: (m) => `${m} minutos`,
    myStatus: "O meu estado", statusHint: "Um atraso avisa os outros participantes por notificação.",
    statusWindow: "O estado pode ser alterado três horas antes da partida.", arrivedFinal: "Está marcado como chegado.",
    statusFailure: "Não foi possível atualizar o estado.", cancelTitle: "Cancelar encontro",
    cancelBody: "Todos receberão o motivo por notificação.", cancelPlaceholder: "Motivo do cancelamento",
    cancelAction: "Cancelar encontro", cancelled: "Encontro cancelado", noCancellationReason: "Nenhum motivo indicado.",
    cancelledSuccess: "O cancelamento foi guardado. Os participantes serão informados.", cancelledFailure: "Não foi possível cancelar o encontro.",
    safetyTitle: "Segurança", safetyBody: "Em caso de perigo, ligue diretamente para a emergência. Não são partilhadas localizações em direto.",
    inProgress: "Caminhada em curso", completed: "Caminhada concluída",
    startTitle: "Iniciar encontro", startBody: "A caminhada conjunta começa agora. Todos os participantes serão informados.",
    startAction: "Iniciar caminhada", startSuccess: "A caminhada começou.", startFailure: "Não foi possível iniciar o encontro.",
    completeTitle: "Concluir caminhada", completeBody: "O encontro será concluído e não serão possíveis novas mensagens.",
    completeAction: "Concluir caminhada", completeSuccess: "A caminhada foi concluída.", completeFailure: "Não foi possível concluir o encontro.",
    messageTitle: "Mensagem para o grupo", messagePlaceholder: "Mensagem para os outros participantes …",
    messageSend: "Enviar mensagem", messageSent: "A mensagem foi enviada ao grupo.", messageFailure: "Não foi possível enviar a mensagem.",
  },
  ru: {
    confirmed: "Подтверждено", arrived: "Прибыл", delayed: (m) => `Опоздание ${m} мин`,
    delayTitle: "Опаздываю", delayPrompt: "На сколько минут вы опоздаете?", minutes: (m) => `${m} минут`,
    myStatus: "Мой статус", statusHint: "При опоздании остальные участники получат уведомление.",
    statusWindow: "Статус можно менять за три часа до старта.", arrivedFinal: "Вы отмечены как прибывший.",
    statusFailure: "Не удалось обновить статус.", cancelTitle: "Отменить встречу",
    cancelBody: "Все участники получат причину в уведомлении.", cancelPlaceholder: "Причина отмены",
    cancelAction: "Отменить встречу", cancelled: "Встреча отменена", noCancellationReason: "Причина не указана.",
    cancelledSuccess: "Отмена сохранена. Участники получат уведомление.", cancelledFailure: "Не удалось отменить встречу.",
    safetyTitle: "Безопасность", safetyBody: "При опасности немедленно вызовите помощь. Геопозиция в реальном времени не передаётся.",
    inProgress: "Поход идёт", completed: "Поход завершён",
    startTitle: "Начать встречу", startBody: "Совместный поход начинается. Все участники получат уведомление.",
    startAction: "Начать поход", startSuccess: "Поход начался.", startFailure: "Не удалось начать встречу.",
    completeTitle: "Завершить поход", completeBody: "Встреча завершится, и новые сообщения больше нельзя будет отправлять.",
    completeAction: "Завершить поход", completeSuccess: "Поход завершён.", completeFailure: "Не удалось завершить встречу.",
    messageTitle: "Сообщение группе", messagePlaceholder: "Сообщение для других участников …",
    messageSend: "Отправить сообщение", messageSent: "Сообщение отправлено группе.", messageFailure: "Не удалось отправить сообщение.",
  },
};