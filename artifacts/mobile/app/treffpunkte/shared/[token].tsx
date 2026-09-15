import { Feather } from "@expo/vector-icons";
import { useGetSharedMeetup } from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useMeetupStrings } from "@/lib/i18n/screens/meetups";
import { useApp } from "@/contexts/AppContext";

export default function SharedMeetup() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useMeetupStrings();
  const { language } = useApp();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token ?? "";
  const query = useGetSharedMeetup(token);
  const meetup = query.data;

  return (
    <Background>
      <ScrollView contentContainerStyle={{ paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, paddingHorizontal: 20, paddingBottom: insets.bottom + 80 }}>
        <ScreenHeader eyebrow={t.eyebrow} title={t.sharedTitle} onBack />
        {query.isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
        ) : !meetup ? (
          <View style={[styles.empty, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <Feather name="link-2" size={24} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.sharedExpired}</Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <Feather name="users" size={25} color={colors.accent} />
            <Text style={[styles.title, { color: colors.foreground }]}>{meetup.routeName}</Text>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>{new Date(meetup.startsAt).toLocaleString(language === "de" || language === "gsw" ? "de-CH" : language)}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {meetup.canton} · {meetup.participantCount}/{meetup.maxParticipants} Plätze
            </Text>
            <Pressable onPress={() => router.push("/treffpunkte")} style={[styles.button, { backgroundColor: colors.accent }]}>
              <Text style={styles.buttonText}>{t.openMeetups}</Text>
            </Pressable>
            <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
              {t.sharedPrivacy}
            </Text>
          </View>
        )}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", borderRadius: 16, borderWidth: 1, marginTop: 24, padding: 24 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 10, textAlign: "center" },
  card: { alignItems: "center", borderRadius: 18, borderWidth: 1, marginTop: 24, padding: 24 },
  title: { fontFamily: fonts.titleBold, fontSize: 23, marginTop: 14, textAlign: "center" },
  date: { fontFamily: fonts.body, fontSize: 15, marginTop: 10, textAlign: "center" },
  meta: { fontFamily: fonts.mono, fontSize: 12, marginTop: 7 },
  button: { borderRadius: 11, marginTop: 22, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 14 },
  privacy: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 18, textAlign: "center" },
});