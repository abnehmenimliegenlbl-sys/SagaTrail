import { Feather } from "@expo/vector-icons";
import { useCreateMeetup } from "@workspace/api-client-react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useMeetupStrings } from "@/lib/i18n/screens/meetups";
import { useApp } from "@/contexts/AppContext";
import { alert } from "@/lib/appAlert";

const WEB_TOP = 67;

export default function NeuerTreffpunkt() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useMeetupStrings();
  const { language } = useApp();
  const params = useLocalSearchParams<{
    routeId?: string;
    routeName?: string;
    canton?: string;
  }>();
  const routeId = Array.isArray(params.routeId) ? params.routeId[0] : params.routeId;
  const routeName = Array.isArray(params.routeName) ? params.routeName[0] : params.routeName;
  const canton = Array.isArray(params.canton) ? params.canton[0] : params.canton;
  const [date, setDate] = useState(() => {
    const next = new Date(Date.now() + 86_400_000);
    return next.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("09:00");
  const [places, setPlaces] = useState("8");
  const [pace, setPace] = useState<"gemuetlich" | "normal" | "sportlich">("gemuetlich");
  const [note, setNote] = useState("");
  const create = useCreateMeetup();

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
        },
      });
      alert(t.createTitle, t.published, [
        { text: "OK", onPress: () => router.replace("/treffpunkte") },
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
          <View style={[styles.empty, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}>
            <Feather name="map" size={22} color={colors.accent} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noRoute}</Text>
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
  choiceText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  noteInput: { borderWidth: 1, borderRadius: 11, minHeight: 90, padding: 13, fontFamily: fonts.body, fontSize: 15, textAlignVertical: "top" },
  empty: { alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 24, marginTop: 24 },
  emptyText: { textAlign: "center", fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 10 },
});