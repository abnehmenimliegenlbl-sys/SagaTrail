import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { AppModal } from "./AppModal";
import { useColors } from "@/hooks/useColors";
import { alert } from "@/lib/appAlert";
import { fonts } from "@/constants/typography";
import { GLAS_3D } from "@/constants/depth";
import type { LatLng } from "@/types";
import { getApiBaseUrl } from "@/lib/apiConfig";

export interface SafetyCheckinProps {
  routeName: string;
  emergencyContact: { name: string; phone: string } | null;
  livePosition: LatLng | null;
  hasFreshGps: boolean;
  getAuthToken: () => Promise<string | null>;
  labels: {
    button: string;
    title: string;
    explanation: string;
    chooseDuration: string;
    minutes: string;
    start: string;
    cancel: string;
    confirm: string;
    active: string;
    overdue: string;
    share: string;
    noGps: string;
    noContact: string;
    shareUnavailable: string;
    safeMessage: string;
    externalShare?: string;
    externalShareActive?: string;
    linkCopied?: string;
    shareFailed?: string;
  };
}

type Duration = 30 | 60 | 120;

export function SafetyCheckin({
  routeName,
  emergencyContact,
  livePosition,
  hasFreshGps,
  getAuthToken,
  labels,
}: SafetyCheckinProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<Duration>(60);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const lastLocationSentAt = React.useRef(0);
  const storageKey = `sagatrail:safety-checkin:${routeName}`;

  useEffect(() => {
    void AsyncStorage.getItem(storageKey).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { expiresAt?: number; token?: string; path?: string };
        if (Number.isFinite(parsed.expiresAt) && (parsed.expiresAt ?? 0) > Date.now()) {
          setExpiresAt(parsed.expiresAt!);
          if (parsed.token) setShareToken(parsed.token);
          if (parsed.path) setSharePath(parsed.path);
        }
      } catch {
        // Alte lokale Timer-Versionen enthielten nur die Ablaufzeit.
        const value = Number(raw);
        if (Number.isFinite(value) && value > Date.now()) setExpiresAt(value);
      }
    }).catch(() => {}).finally(() => setStorageHydrated(true));
  }, [storageKey]);

  useEffect(() => {
    if (!storageHydrated) return;
    if (expiresAt == null) {
      void AsyncStorage.removeItem(storageKey).catch(() => {});
    } else {
      void AsyncStorage.setItem(storageKey, JSON.stringify({
        expiresAt,
        ...(shareToken ? { token: shareToken } : {}),
        ...(sharePath ? { path: sharePath } : {}),
      })).catch(() => {});
    }
  }, [expiresAt, shareToken, sharePath, storageHydrated, storageKey]);

  useEffect(() => {
    if (expiresAt == null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  // Nur der echte, frische Vordergrund-Fix wird an den Server gesendet. Die
  // Drosselung ist zusätzlich zum Server-Limit wichtig, damit ein GPS-Watch
  // keinen unnötigen Datenverkehr erzeugt.
  useEffect(() => {
    if (!shareToken || !hasFreshGps || !livePosition) return;
    if (Date.now() - lastLocationSentAt.current < 10_000) return;
    lastLocationSentAt.current = Date.now();
    const base = getApiBaseUrl() ?? "";
    void getAuthToken().then((authToken) => {
      if (!authToken) return;
      void fetch(`${base}/api/safety-shares/${encodeURIComponent(shareToken)}/location`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          lat: livePosition.lat,
          lng: livePosition.lng,
        }),
      }).catch(() => {});
    });
  }, [shareToken, livePosition?.lat, livePosition?.lng, hasFreshGps, getAuthToken]);

  const remaining = expiresAt == null ? 0 : Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const overdue = expiresAt != null && now >= expiresAt;
  const displayTime = useMemo(() => {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [remaining]);

  const shareLocation = async () => {
    // Deliberately require both a recent fix and a configured contact. Never
    // substitute the route's nominal coordinates for a user's position.
    if (!hasFreshGps || !livePosition) {
      alert(labels.title, labels.noGps);
      return;
    }
    if (!emergencyContact?.phone?.trim()) {
      alert(labels.title, labels.noContact);
      return;
    }
    const coords = `${livePosition.lat.toFixed(5)}, ${livePosition.lng.toFixed(5)}`;
    const message = `${labels.safeMessage}\n${routeName}\n${coords}`;
    const smsUrl = `sms:${emergencyContact.phone.replace(/\s+/g, "")}&body=${encodeURIComponent(message)}`;
    try {
      if (Platform.OS !== "web" && (await Linking.canOpenURL(smsUrl))) {
        await Linking.openURL(smsUrl);
        return;
      }
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: routeName, text: message });
        return;
      }
      await Share.share({ title: routeName, message });
    } catch {
      alert(labels.title, labels.shareUnavailable);
    }
  };

  const close = () => setOpen(false);
  const cancelTimer = () => {
    if (shareToken) {
      const base = getApiBaseUrl() ?? "";
      void getAuthToken().then((authToken) => {
        if (!authToken) return;
        void fetch(`${base}/api/safety-shares/${encodeURIComponent(shareToken)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        }).catch(() => {});
      });
    }
    setShareToken(null);
    setSharePath(null);
    setExpiresAt(null);
    setOpen(false);
  };

  const startShare = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      const authToken = await getAuthToken();
      if (!authToken) throw new Error("auth");
      const base = getApiBaseUrl() ?? "";
      const response = await fetch(`${base}/api/safety-shares`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ routeName, durationMinutes: duration }),
      });
      if (!response.ok) throw new Error("create");
      const data = await response.json() as { token: string; path: string; expiresAt: string };
      const link = `${base}${data.path}`;
      setShareToken(data.token);
      setSharePath(link);
      setExpiresAt(Date.parse(data.expiresAt));
      setOpen(true);
      await Share.share({
        title: labels.externalShare ?? "SagaTrail Sicherheitslink",
        message: `${labels.externalShare ?? "SagaTrail Sicherheitslink"}\n${link}`,
        url: link,
      }).catch(() => {});
    } catch {
      // Der lokale Check-in bleibt als Sicherheitsnetz verfügbar, auch wenn
      // Authentifizierung oder Netz gerade nicht funktionieren. Er wird
      // sichtbar als lokal markiert und erzeugt keinen falschen Live-Status.
      setShareToken(null);
      setSharePath(null);
      setExpiresAt(Date.now() + duration * 60_000);
      setOpen(true);
      alert(labels.title, labels.shareFailed ?? "Der Sicherheitslink konnte nicht gestartet werden.");
    } finally {
      setShareBusy(false);
    }
  };

  const shareExternalLink = async () => {
    if (!sharePath) return;
    try {
      await Share.share({
        title: labels.externalShare ?? "SagaTrail Sicherheitslink",
        message: `${labels.externalShare ?? "SagaTrail Sicherheitslink"}\n${sharePath}`,
        url: sharePath,
      });
    } catch {
      alert(labels.title, labels.shareUnavailable);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={labels.button}
        style={[styles.trigger, { borderColor: colors.glassBorder }]}
      >
        <Feather name="clock" size={18} color={colors.foreground} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.triggerText, { color: colors.foreground }]}>
            {expiresAt == null ? labels.button : overdue ? labels.overdue : labels.active}
          </Text>
          {expiresAt != null ? (
            <Text style={[styles.triggerSubtext, { color: overdue ? colors.destructive : colors.mutedForeground }]}>
              {displayTime}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <AppModal
        visible={open}
        onRequestClose={close}
        title={expiresAt == null ? labels.title : overdue ? labels.overdue : labels.active}
        message={expiresAt == null ? labels.explanation : `${labels.active}: ${displayTime}`}
        icon={<Feather name={overdue ? "alert-triangle" : "clock"} size={28} color={overdue ? colors.destructive : colors.accent} />}
        buttons={
          expiresAt == null
            ? [
                { text: labels.cancel, style: "cancel", onPress: close },
                { text: labels.start, onPress: () => void startShare() },
              ]
            : [
                { text: labels.cancel, style: "cancel", onPress: cancelTimer },
                { text: labels.confirm, onPress: cancelTimer },
              ]
        }
      >
        {expiresAt == null ? (
          <>
            <Text style={[styles.choose, { color: colors.mutedForeground }]}>{labels.chooseDuration}</Text>
            <View style={styles.choices}>
              {([30, 60, 120] as Duration[]).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setDuration(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: duration === value }}
                  style={[
                    styles.choice,
                    { borderColor: duration === value ? colors.accent : colors.glassBorder,
                      backgroundColor: duration === value ? colors.accent + "22" : "transparent" },
                  ]}
                >
                  <Text style={[styles.choiceText, { color: colors.foreground }]}>{value} {labels.minutes}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View accessible accessibilityLiveRegion="polite" style={[styles.timer, overdue && { borderColor: colors.destructive }]}>
            <Text style={[styles.timerText, { color: overdue ? colors.destructive : colors.accent }]}>{displayTime}</Text>
            {overdue && <Text style={[styles.overdueText, { color: colors.destructive }]}>{labels.overdue}</Text>}
            {!shareToken ? (
              <Text style={[styles.localOnlyText, { color: colors.mutedForeground }]}>
                Nur lokaler Timer — kein Live-Monitoring
              </Text>
            ) : null}
            {sharePath ? (
              <View style={[styles.linkBox, { borderColor: colors.glassBorder }]}>
                <Text style={[styles.linkLabel, { color: colors.mutedForeground }]}>
                  {labels.externalShareActive ?? "Live-Link aktiv"}
                </Text>
                <Text selectable numberOfLines={2} style={[styles.linkText, { color: colors.foreground }]}>
                  {sharePath}
                </Text>
                <Pressable onPress={shareExternalLink} accessibilityRole="button" style={[styles.share, { borderColor: colors.glassBorder }]}>
                  <Feather name="share-2" size={17} color={colors.foreground} />
                  <Text style={[styles.shareText, { color: colors.foreground }]}>{labels.externalShare ?? "Live-Link teilen"}</Text>
                </Pressable>
              </View>
            ) : null}
            <Pressable onPress={shareLocation} accessibilityRole="button" style={[styles.share, { borderColor: colors.glassBorder }]}>
              <Feather name="share-2" size={17} color={colors.foreground} />
              <Text style={[styles.shareText, { color: colors.foreground }]}>{labels.share}</Text>
            </Pressable>
          </View>
        )}
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { ...GLAS_3D, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 12 },
  triggerText: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  triggerSubtext: { fontFamily: fonts.mono, fontSize: 11, marginTop: 3 },
  choose: { fontFamily: fonts.body, fontSize: 14, marginTop: 18, marginBottom: 10, textAlign: "center" },
  choices: { flexDirection: "row", gap: 8, width: "100%" },
  choice: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  choiceText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  timer: { width: "100%", alignItems: "center", borderWidth: 1, borderColor: "transparent", borderRadius: 12, padding: 10 },
  timerText: { fontFamily: fonts.monoBold, fontSize: 42 },
  overdueText: { fontFamily: fonts.bodyBold, fontSize: 14, marginBottom: 8 },
  localOnlyText: { fontFamily: fonts.body, fontSize: 12, textAlign: "center", marginBottom: 4 },
  share: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 },
  shareText: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  linkBox: { width: "100%", borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 12 },
  linkLabel: { fontFamily: fonts.bodyBold, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  linkText: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, marginTop: 5 },
});