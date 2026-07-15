import { Feather } from "@expo/vector-icons";
import { hapticSelection } from "@/lib/haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

import { GLAS_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { useGruppeStrings } from "@/lib/i18n/screens/gruppe";
import { AgeTier } from "@/types";

const WEB_TOP = 67;

export default function Gruppe() {
  const colors = useColors();
  const t = useGruppeStrings();
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

  const buzz = () => hapticSelection();

  const handleCreate = () => {
    buzz();
    // Kein client-seitiges Premium-Gating hier: der `premium`-Status wird
    // erst nach dem Mount asynchron mit RevenueCat/Server abgeglichen
    // (siehe AppContext). Ein Check hier koennte kurz nach App-Start noch
    // veraltet (false) sein und faelschlich zum Paywall umleiten, obwohl
    // der Nutzer bereits Premium hat — daher fuehrte "Session erstellen"
    // erst beim 2./3. Tastendruck zum Erfolg. Der Server ist die
    // verbindliche Quelle: liefert er "premium_required", leitet der
    // bestehende Effekt oben ohnehin zur Paywall weiter.
    createGroupSession();
  };

  const statusLabel =
    groupConnectionStatus === "verbindet"
      ? t.connecting
      : groupConnectionStatus === "verbunden"
        ? t.statusLive
        : t.statusDisconnected;

  const statusColor =
    groupConnectionStatus === "verbunden"
      ? colors.accent
      : groupConnectionStatus === "getrennt" && groupSession
        ? colors.destructive
        : colors.mutedForeground;

  // Letzter Zeitpunkt, zu dem jedes Mitglied seine Aktivitaet geaendert hat —
  // clientseitig getrackt, um veraltete Synchronisation sichtbar zu machen.
  const memberActivitySnapshotRef = useRef<Record<string, string>>({});
  const memberLastSeenRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!groupSession) {
      memberActivitySnapshotRef.current = {};
      memberLastSeenRef.current = {};
      return;
    }
    const now = Date.now();
    for (const m of groupSession.members) {
      const snapshot = JSON.stringify(m.activity);
      if (memberActivitySnapshotRef.current[m.id] !== snapshot) {
        memberActivitySnapshotRef.current[m.id] = snapshot;
        memberLastSeenRef.current[m.id] = now;
      } else if (memberLastSeenRef.current[m.id] == null) {
        memberLastSeenRef.current[m.id] = now;
      }
    }
  }, [groupSession]);

  // Pruefen, ob Mitglieder laenger als 90s keine Aktivitaets-Aenderung hatten
  // (moegliches Verbindungsproblem) — nur wenn die Session aktiv ist.
  const memberOutOfSync = (memberId: string): boolean => {
    const lastSeen = memberLastSeenRef.current[memberId];
    if (!lastSeen) return false;
    return Date.now() - lastSeen > 90_000;
  };

  const errorLabel = groupError
    ? groupError === "not_found"
      ? t.errorNotFound
      : groupError === "network"
        ? t.errorNetwork
        : t.errorUnknown
    : null;

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
        <ScreenHeader eyebrow={t.eyebrow} title={t.title} />

        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {t.intro}
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
              {errorLabel}
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
                {t.createSessionTitle}
              </Text>
              <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
                {t.createSessionBody(premium)}
              </Text>
              <PrimaryButton
                label={t.createSessionButton}
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
                {t.joinSessionTitle}
              </Text>
              <TextInput
                value={joinCode}
                onChangeText={(text) => setJoinCode(text.toUpperCase())}
                placeholder={t.joinCodePlaceholder}
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
                  groupConnectionStatus === "verbindet" ? t.connecting : t.joinSessionButton
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
                {groupSession.isLeader ? t.codeLabelLeader : t.codeLabelMember}
              </Text>
              <Text style={[styles.code, { color: colors.foreground }]}>
                {groupSession.code}
              </Text>
              <Text style={[styles.tierNote, { color: colors.accent }]}>
                {t.tierNote(t.ageTiers[youngest as AgeTier] ?? t.ageTiers.erwachsene)}
              </Text>
            </View>

            <Text style={[styles.membersTitle, { color: colors.foreground }]}>
              {t.membersTitle(groupSession.members.length)}
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
                    {m.isLeader ? `  ·  ${t.leaderLabel}` : ""}
                  </Text>
                  <Text style={[styles.memberTier, { color: colors.mutedForeground }]}>
                    {t.ageTiers[m.ageTier as AgeTier]}
                    {m.activity.type === "wandert"
                      ? `  ·  ${t.activityWandering(m.activity.sagaTitle)}`
                      : `  ·  ${t.activityReady}`}
                  </Text>
                </View>
                {!groupSession.isLeader &&
                  m.isLeader &&
                  m.activity.type === "wandert" &&
                  m.activity.sagaId != null && (
                    <Pressable
                      onPress={() => {
                        // Mitwandern: dieselbe Sage/Route wie die Leitung
                        // oeffnen — Kapitel und Entscheidungen folgen dann
                        // live der Gruppenleitung.
                        const a = m.activity as {
                          sagaId?: string;
                          routeId?: string;
                        };
                        if (!a.sagaId) return;
                        const routeParam = a.routeId
                          ? `?routeId=${encodeURIComponent(a.routeId)}`
                          : "";
                        router.push(
                          `/hike/${encodeURIComponent(a.sagaId)}${routeParam}`,
                        );
                      }}
                      hitSlop={10}
                      style={[
                        styles.joinHikeBtn,
                        { borderColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[styles.joinHikeText, { color: colors.primary }]}
                      >
                        {t.joinHikeButton}
                      </Text>
                    </Pressable>
                  )}
                {memberOutOfSync(m.id) && (
                  <Feather
                    name="wifi-off"
                    size={14}
                    color={colors.mutedForeground}
                    style={{ marginRight: 6 }}
                  />
                )}
                {groupSession.isLeader && !m.isLeader && (
                  <Pressable onPress={() => kickMember(m.id)} hitSlop={10}>
                    <Feather name="x" size={20} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
            ))}

            <Text style={[styles.syncNote, { color: colors.mutedForeground }]}>
              {t.syncNote}
            </Text>

            <PrimaryButton
              label={t.leaveSessionButton}
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
  errorBanner: { ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, flex: 1 },
  card: { ...GLAS_3D, borderWidth: 1, borderRadius: 16, padding: 18 },
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
  codeBox: { ...GLAS_3D, borderWidth: 1, borderRadius: 16, padding: 22, alignItems: "center" },
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
  memberRow: { ...GLAS_3D,
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
  joinHikeBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  joinHikeText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  syncNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    fontStyle: "italic",
  },
});
