import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const WEB_TOP = 67;

const TIER_LABEL: Record<string, string> = {
  kinder: "Kinder",
  jugendliche: "Jugendliche",
  erwachsene: "Erwachsene",
};

const ERROR_LABEL: Record<string, string> = {
  not_found: "Kein aktiver Beitritts-Code mit dieser Nummer gefunden.",
  network: "Server nicht erreichbar. Prüfe deine Verbindung und versuche es erneut.",
  unbekannt: "Unerwarteter Fehler. Bitte versuche es erneut.",
};

export default function Gruppe() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    premium,
    groupSession,
    groupConnectionStatus,
    groupError,
    createGroupSession,
    joinGroupSession,
    leaveGroupSession,
    kickMember,
    clearGroupError,
  } = useApp();

  const [joinCode, setJoinCode] = useState("");
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  useEffect(() => {
    if (groupError === "premium_required") {
      clearGroupError();
      router.push("/paywall");
    }
  }, [groupError, clearGroupError, router]);

  const youngest = groupSession?.members.reduce((acc, m) => {
    const order = { kinder: 0, jugendliche: 1, erwachsene: 2 } as Record<string, number>;
    return order[m.ageTier] < order[acc] ? m.ageTier : acc;
  }, "erwachsene" as string);

  const buzz = () =>
    Platform.OS !== "web" && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const handleCreate = () => {
    buzz();
    if (!premium) {
      router.push("/paywall");
      return;
    }
    createGroupSession();
  };

  const statusLabel =
    groupConnectionStatus === "verbindet"
      ? "Verbinde …"
      : groupConnectionStatus === "verbunden"
        ? "Live verbunden"
        : "Getrennt";

  const statusColor =
    groupConnectionStatus === "verbunden"
      ? colors.accent
      : colors.mutedForeground;

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow="Gemeinsam wandern" title="Gruppe" />

        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Erlebt eine Sage zusammen. Die Alterstufe des jüngsten Mitglieds bestimmt
          die Erzählung, das Gerät der Leitung führt per GPS.
        </Text>

        {groupError && groupError !== "premium_required" && (
          <View
            style={[
              styles.errorBanner,
              { borderColor: colors.accent, backgroundColor: colors.glassBg },
            ]}
          >
            <Feather name="alert-triangle" size={18} color={colors.accent} />
            <Text style={[styles.errorText, { color: colors.foreground }]}>
              {ERROR_LABEL[groupError] ?? ERROR_LABEL.unbekannt}
            </Text>
          </View>
        )}

        {!groupSession ? (
          <>
            <View
              style={[
                styles.card,
                { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
              ]}
            >
              <Feather name="plus-circle" size={22} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Session erstellen
              </Text>
              <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
                Erzeuge einen Beitritts-Code, den deine Gruppe eingeben kann. Der
                Code gilt nur für diese Wanderung.
                {!premium ? " Erfordert Premium." : ""}
              </Text>
              <PrimaryButton
                label="Session erstellen"
                variant="gold"
                onPress={handleCreate}
                style={{ marginTop: 14 }}
              />
            </View>

            <SparkDivider style={{ marginVertical: 22 }} />

            <View
              style={[
                styles.card,
                { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
              ]}
            >
              <Feather name="log-in" size={22} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Session beitreten
              </Text>
              <TextInput
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                placeholder="6-stelliger Code"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="characters"
                maxLength={6}
                style={[
                  styles.codeInput,
                  {
                    color: colors.foreground,
                    borderColor: colors.glassBorder,
                    borderRadius: colors.radius,
                  },
                ]}
              />
              <PrimaryButton
                label={
                  groupConnectionStatus === "verbindet" ? "Verbinde …" : "Beitreten"
                }
                onPress={() => {
                  if (joinCode.length === 6) {
                    buzz();
                    joinGroupSession(joinCode);
                  }
                }}
                disabled={joinCode.length !== 6 || groupConnectionStatus === "verbindet"}
                style={{ marginTop: 4 }}
              />
            </View>
          </>
        ) : (
          <View style={{ marginTop: 8 }}>
            <View
              style={[
                styles.codeBox,
                { borderColor: colors.accent, backgroundColor: colors.glassBgStrong },
              ]}
            >
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusLabel}
                </Text>
              </View>
              <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>
                {groupSession.isLeader ? "DEIN BEITRITTS-CODE" : "AKTIVE SESSION"}
              </Text>
              <Text style={[styles.code, { color: colors.foreground }]}>
                {groupSession.code}
              </Text>
              <Text style={[styles.tierNote, { color: colors.accent }]}>
                Erzählstufe: {TIER_LABEL[youngest ?? "erwachsene"]} (jüngstes Mitglied)
              </Text>
            </View>

            <Text style={[styles.membersTitle, { color: colors.foreground }]}>
              Mitglieder ({groupSession.members.length})
            </Text>

            {groupSession.members.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.memberRow,
                  { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                ]}
              >
                <View
                  style={[styles.avatar, { backgroundColor: colors.card }]}
                >
                  <Text style={[styles.avatarText, { color: colors.accent }]}>
                    {m.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>
                    {m.name}
                    {m.isLeader ? "  ·  Leitung" : ""}
                  </Text>
                  <Text style={[styles.memberTier, { color: colors.mutedForeground }]}>
                    {TIER_LABEL[m.ageTier]}
                    {m.activity.type === "wandert"
                      ? `  ·  wandert: ${m.activity.sagaTitle}`
                      : "  ·  bereit"}
                  </Text>
                </View>
                {groupSession.isLeader && !m.isLeader && (
                  <Pressable onPress={() => kickMember(m.id)} hitSlop={10}>
                    <Feather name="x" size={20} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
            ))}

            <Text style={[styles.syncNote, { color: colors.mutedForeground }]}>
              Live verbunden: Beitritte, Austritte und Wander-Status der Gruppe
              werden in Echtzeit synchronisiert.
            </Text>

            <PrimaryButton
              label="Session verlassen"
              variant="ghost"
              onPress={() => {
                buzz();
                leaveGroupSession();
              }}
              style={{ marginTop: 20 }}
            />
          </View>
        )}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 16,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, flex: 1 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18 },
  cardTitle: { fontFamily: fonts.titleBold, fontSize: 20, marginTop: 10 },
  cardBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 6 },
  codeInput: {
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontFamily: fonts.monoBold,
    fontSize: 22,
    letterSpacing: 6,
    textAlign: "center",
    marginVertical: 14,
  },
  codeBox: { borderWidth: 1, borderRadius: 16, padding: 22, alignItems: "center" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1 },
  codeLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2 },
  code: {
    fontFamily: fonts.monoBold,
    fontSize: 42,
    letterSpacing: 10,
    marginTop: 6,
  },
  tierNote: { fontFamily: fonts.story, fontSize: 13, marginTop: 8 },
  membersTitle: { fontFamily: fonts.titleBold, fontSize: 20, marginTop: 26, marginBottom: 12 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.titleBold, fontSize: 18 },
  memberName: { fontFamily: fonts.bodyBold, fontSize: 15 },
  memberTier: { fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
  syncNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    fontStyle: "italic",
  },
});
