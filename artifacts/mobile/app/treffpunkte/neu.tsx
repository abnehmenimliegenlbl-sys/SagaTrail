import { Feather, FontAwesome5 } from "@expo/vector-icons";
import {
  getGetMyCommunitiesQueryKey,
  useCreateMeetup,
  useGetMyCommunities,
} from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { HomeEntryCard } from "@/components/HomeEntryCard";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useCatalog } from "@/contexts/CatalogContext";
import { useHomeStrings } from "@/lib/i18n/screens/home";
import { useMeetupStrings } from "@/lib/i18n/screens/meetups";
import { alert } from "@/lib/appAlert";
import {
  CANTONS_HOME_BANNER,
  CUSTOM_ROUTE_HOME_BANNER,
  THEME_WORLD_HOME_BANNER,
} from "@/lib/themeWorldVisuals";
import { withCommunityId } from "@/lib/meetupNavigation";

const WEB_TOP = 67;

export default function NeuerTreffpunkt() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useMeetupStrings();
  const homeT = useHomeStrings();
  const { cantons } = useCatalog();
  const params = useLocalSearchParams<{
    routeId?: string;
    routeName?: string;
    canton?: string;
    communityId?: string;
  }>();
  const routeId = Array.isArray(params.routeId) ? params.routeId[0] : params.routeId;
  const routeName = Array.isArray(params.routeName) ? params.routeName[0] : params.routeName;
  const canton = Array.isArray(params.canton) ? params.canton[0] : params.canton;
  const initialCommunityId = Array.isArray(params.communityId)
    ? params.communityId[0]
    : params.communityId;
  const communityPath = (path: string) =>
    withCommunityId(path, initialCommunityId);
  const [date, setDate] = useState(() => {
    const next = new Date(Date.now() + 86_400_000);
    return next.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("09:00");
  const [places, setPlaces] = useState("8");
  const [pace, setPace] = useState<"gemuetlich" | "normal" | "sportlich">("gemuetlich");
  const [note, setNote] = useState("");
  const [communityId, setCommunityId] = useState<string | null>(
    initialCommunityId ?? null,
  );
  const create = useCreateMeetup();
  const communities = useGetMyCommunities({
    query: {
      queryKey: getGetMyCommunitiesQueryKey(),
      refetchOnMount: "always",
    },
  });

  const parsedStart = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
    const parsed = new Date(`${date}T${time}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [date, time]);

  const submit = async () => {
    const maxParticipants = Number(places);
    if (!routeId || !routeName || !canton || !parsedStart || maxParticipants < 2 || maxParticipants > 30) {
      alert(t.createTitle, t.invalid);
      return;
    }
    if (communityId && !communities.data?.some((community) => community.id === communityId)) {
      alert(t.createTitle, t.communityRequired);
      return;
    }
    try {
      await create.mutateAsync({
        data: {
          routeId,
          routeName,
          canton,
          startsAt: parsedStart.toISOString(),
          maxParticipants,
          pace,
          note: note.trim() || null,
          communityId,
        },
      });
      alert(t.createTitle, t.published, [
        { text: t.ok, onPress: () => router.replace("/treffpunkte") },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : t.error;
      if (message.includes("401") || message.toLowerCase().includes("auth")) {
        alert(t.createTitle, t.loginRequired);
      } else {
        alert(t.createTitle, message);
      }
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
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow={t.eyebrow} title={t.createTitle} onBack />
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>{t.createIntro}</Text>

        {!routeId || !routeName || !canton ? (
          <View style={styles.routeChoices}>
            <Text style={[styles.chooseRouteTitle, { color: colors.foreground }]}>
              {t.noRoute}
            </Text>
            <HomeEntryCard
              order={0}
              icon="map"
              image={CANTONS_HOME_BANNER}
              title={homeT.cantonsTitle}
              hint={homeT.allCantonsHint(cantons.length)}
              onPress={() => router.push(communityPath("/kantone"))}
            />
            <HomeEntryCard
              order={1}
              icon="compass"
              image={THEME_WORLD_HOME_BANNER}
              title={homeT.themeWorldsTitle}
              hint={homeT.themeWorldsHint}
              onPress={() => router.push(communityPath("/themenwelten"))}
            />
            <HomeEntryCard
              order={2}
              icon="sunrise"
              image={require("../../assets/images/banner-wanderroute-heute.jpg")}
              title={homeT.recommendationTitle}
              hint={homeT.recommendationHint}
              onPress={() => router.push(communityPath("/empfehlung"))}
            />
            <HomeEntryCard
              order={3}
              icon="navigation"
              image={CUSTOM_ROUTE_HOME_BANNER}
              title={homeT.customRouteTitle}
              hint={homeT.customRouteHint}
              onPress={() => router.push(communityPath("/eigene-route"))}
            />
          </View>
        ) : (
          <>
            <View style={[styles.routeBox, { borderColor: colors.accent, backgroundColor: colors.glassBgStrong }]}>
              <Feather name="map-pin" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{t.route}</Text>
                <Text style={[styles.routeName, { color: colors.foreground }]}>{routeName}</Text>
              </View>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>{t.audience}</Text>
            <View style={styles.choiceRow}>
              <Pressable
                onPress={() => setCommunityId(null)}
                style={[
                  styles.choice,
                  styles.audienceChoice,
                  {
                    borderColor: communityId === null ? colors.accent : colors.glassBorder,
                    backgroundColor: communityId === null ? colors.accent + "20" : colors.glassBg,
                  },
                ]}
              >
                <View
                  style={[
                    styles.audienceIcon,
                    {
                      borderColor: communityId === null ? colors.accent : colors.glassBorder,
                      backgroundColor: communityId === null ? colors.accent + "18" : colors.glassBgStrong,
                    },
                  ]}
                >
                  <Image
                    source={require("../../assets/images/sagatrail-logo.png")}
                    style={styles.audienceLogo}
                    resizeMode="contain"
                    accessible={false}
                  />
                </View>
                <Text style={[styles.choiceText, { color: communityId === null ? colors.accent : colors.foreground }]}>
                  {t.audiencePublic}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!communities.data?.length) {
                    alert(t.createTitle, t.communityRequired);
                    return;
                  }
                  setCommunityId(communityId ?? communities.data[0].id);
                }}
                style={[
                  styles.choice,
                  styles.audienceChoice,
                  {
                    borderColor: communityId !== null ? colors.accent : colors.glassBorder,
                    backgroundColor: communityId !== null ? colors.accent + "20" : colors.glassBg,
                  },
                ]}
              >
                <View
                  style={[
                    styles.audienceIcon,
                    {
                      borderColor: communityId !== null ? colors.accent : colors.glassBorder,
                      backgroundColor: communityId !== null ? colors.accent + "18" : colors.glassBgStrong,
                    },
                  ]}
                >
                  <FontAwesome5
                    name="facebook-f"
                    size={16}
                    color={colors.facebookBlue}
                  />
                </View>
                <Text style={[styles.choiceText, { color: communityId !== null ? colors.accent : colors.foreground }]}>
                  {t.audienceCommunity}
                </Text>
              </Pressable>
            </View>
            {communityId !== null && communities.data?.length ? (
              <View style={styles.communityChoices}>
                {communities.data.map((community) => (
                  <Pressable
                    key={community.id}
                    onPress={() => setCommunityId(community.id)}
                    style={[
                      styles.communityChoice,
                      {
                        borderColor: communityId === community.id ? colors.accent : colors.glassBorder,
                        backgroundColor: communityId === community.id ? colors.accent + "20" : colors.glassBg,
                      },
                    ]}
                  >
                    <Feather name="users" size={16} color={communityId === community.id ? colors.accent : colors.mutedForeground} />
                    <Text style={[styles.communityChoiceText, { color: communityId === community.id ? colors.accent : colors.foreground }]}>
                      {community.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Field label={t.date} value={date} placeholder={t.datePlaceholder} onChange={setDate} colors={colors} />
            <Field label={t.time} value={time} placeholder={t.timePlaceholder} onChange={setTime} colors={colors} keyboardType="numbers-and-punctuation" />
            <Field label={t.participants} value={places} placeholder={t.participantsPlaceholder} onChange={setPlaces} colors={colors} keyboardType="number-pad" />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>{t.pace}</Text>
            <View style={styles.choiceRow}>
              {([
                ["gemuetlich", t.paceEasy],
                ["normal", t.paceNormal],
                ["sportlich", t.paceSporty],
              ] as const).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setPace(value)}
                  style={[
                    styles.choice,
                    {
                      borderColor: pace === value ? colors.accent : colors.glassBorder,
                      backgroundColor: pace === value ? colors.accent + "20" : colors.glassBg,
                    },
                  ]}
                >
                  <Text style={[styles.choiceText, { color: pace === value ? colors.accent : colors.foreground }]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>{t.note}</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t.notePlaceholder}
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={500}
              style={[styles.noteInput, { color: colors.foreground, borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}
            />
            <PrimaryButton label={t.publish} loading={create.isPending} onPress={() => void submit()} style={{ marginTop: 22 }} />
          </>
        )}
      </ScrollView>
    </Background>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  colors,
  keyboardType,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  colors: ReturnType<typeof useColors>;
  keyboardType?: "numbers-and-punctuation" | "number-pad";
}) {
  return (
    <>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        style={[styles.input, { color: colors.foreground, borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginTop: 12 },
  routeBox: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 22, marginBottom: 20 },
  label: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.4, marginTop: 16, marginBottom: 7 },
  routeName: { fontFamily: fonts.titleBold, fontSize: 18, lineHeight: 22, marginTop: 3 },
  input: { borderWidth: 1, borderRadius: 11, minHeight: 46, paddingHorizontal: 13, fontFamily: fonts.body, fontSize: 15 },
  choiceRow: { flexDirection: "row", gap: 8 },
  choice: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  audienceChoice: { flexDirection: "row", gap: 7, paddingHorizontal: 7 },
  audienceIcon: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  audienceLogo: { width: 22, height: 22 },
  choiceText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  communityChoices: { gap: 8, marginTop: 8 },
  communityChoice: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  communityChoiceText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  noteInput: { borderWidth: 1, borderRadius: 11, minHeight: 90, padding: 13, fontFamily: fonts.body, fontSize: 15, textAlignVertical: "top" },
  routeChoices: { marginTop: 10, marginHorizontal: -20 },
  chooseRouteTitle: {
    fontFamily: fonts.titleBold,
    fontSize: 20,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
});