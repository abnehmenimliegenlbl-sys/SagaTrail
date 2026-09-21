import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React, { useEffect, useImperativeHandle, useMemo, useState } from "react";
import { AppState, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { AppModal } from "./AppModal";
import { useColors } from "@/hooks/useColors";
import { alert } from "@/lib/appAlert";
import { fonts } from "@/constants/typography";
import { GLAS_3D } from "@/constants/depth";
import type { LatLng } from "@/types";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { makeLogger } from "@/lib/debugLog";

const safetyCheckinLog = makeLogger("[SAFETY-CHECKIN]", "safety_checkin");

export interface SafetyCheckinProps {
  routeId: string;
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
    externalShare: string;
    externalShareActive: string;
    linkCopied?: string;
    shareFailed: string;
    loadFailed: string;
    endFailed: string;
    startFailed: string;
    localOnly: string;
    shareWhatsApp: string;
    shareSms: string;
    whatsappUnavailable: string;
  };
  onStatusChange?: (status: {
    status: "idle" | "active" | "overdue";
    remainingSec: number;
    expiresAtEpochMs: number | null;
    liveLinkActive: boolean;
  }) => void;
  hideTrigger?: boolean;
}

export type SafetyCheckinDuration = 30 | 60 | 120;

export interface SafetyCheckinHandle {
  open: () => void;
  startFromWatch: (duration: SafetyCheckinDuration) => void;
  confirmFromWatch: () => void;
}

export const SafetyCheckin = React.forwardRef<SafetyCheckinHandle, SafetyCheckinProps>(function SafetyCheckin({
  routeId,
  routeName,
  emergencyContact,
  livePosition,
  hasFreshGps,
  getAuthToken,
  labels,
  onStatusChange,
  hideTrigger = false,
}: SafetyCheckinProps, ref) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<SafetyCheckinDuration>(60);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [hydrationRevision, setHydrationRevision] = useState(0);
  const lastLocationSentAt = React.useRef(0);
  const operationGenerationRef = React.useRef(0);
  const startBusyRef = React.useRef(false);
  const hydrationRetryCountRef = React.useRef(0);
  const storageKey = `sagatrail:safety-checkin:${routeId || routeName}`;

  async function cancelTaggedSafetyNotifications() {
    if (Platform.OS === "web") return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((item) => item.content.data?.safetyCheckinStorageKey === storageKey)
        .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
  }

  useEffect(() => {
    let cancelled = false;
    let hydrationSucceeded = false;
    const hydrationGeneration = operationGenerationRef.current;
    setStorageHydrated(false);
    void AsyncStorage.getItem(storageKey).then(async (raw) => {
      const hydrationIsStale = () =>
        cancelled || hydrationGeneration !== operationGenerationRef.current;
      if (hydrationIsStale()) return;
      if (!raw) {
        await cancelTaggedSafetyNotifications();
        if (hydrationIsStale()) return;
        safetyCheckinLog("storage hydration: no saved check-in");
        hydrationSucceeded = true;
        return;
      }
      let parsed: {
        expiresAt: number;
        token?: string;
        path?: string;
      };
      try {
        const objectValue = JSON.parse(raw) as {
          status?: string;
          expiresAt?: number;
          token?: string;
          path?: string;
        };
        if (objectValue.status === "cancelling") {
          await cancelTaggedSafetyNotifications();
          if (hydrationIsStale()) return;
          await AsyncStorage.removeItem(storageKey);
          hydrationSucceeded = true;
          safetyCheckinLog("storage hydration: interrupted cancellation completed");
          return;
        }
        if (!Number.isFinite(objectValue.expiresAt)) throw new Error("invalid");
        parsed = {
          expiresAt: objectValue.expiresAt!,
          ...(objectValue.token ? { token: objectValue.token } : {}),
          ...(objectValue.path ? { path: objectValue.path } : {}),
        };
      } catch {
        // Alte lokale Timer-Versionen enthielten nur die Ablaufzeit.
        const value = Number(raw);
        if (!Number.isFinite(value)) throw new Error("invalid saved check-in");
        parsed = { expiresAt: value };
      }

      const restoredExpiry = parsed.expiresAt;
      let restoredNotificationId: string | null = null;
      let hydrationCreatedNotificationId: string | null = null;

      if (Platform.OS !== "web") {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        if (hydrationIsStale()) return;
        const tagged = scheduled.filter(
          (item) => item.content.data?.safetyCheckinStorageKey === storageKey,
        );
        const exact = tagged.filter(
          (item) => Number(item.content.data?.safetyCheckinExpiresAt) === restoredExpiry,
        );
        restoredNotificationId = exact[0]?.identifier ?? null;
        const stale = tagged.filter((item) => item.identifier !== restoredNotificationId);
        await Promise.all(
          stale.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
        );
        if (hydrationIsStale()) return;
        if (!restoredNotificationId && restoredExpiry > Date.now()) {
          hydrationCreatedNotificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: labels.overdue,
              body: `${routeName}: ${labels.confirm}`,
              sound: "default",
              data: {
                type: "safety-checkin",
                routeId,
                safetyCheckinStorageKey: storageKey,
                safetyCheckinExpiresAt: restoredExpiry,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(restoredExpiry),
            },
          });
          restoredNotificationId = hydrationCreatedNotificationId;
        }
      }

      if (hydrationIsStale()) {
        if (hydrationCreatedNotificationId) {
          await Notifications.cancelScheduledNotificationAsync(hydrationCreatedNotificationId).catch(() => {});
        }
        return;
      }
      setExpiresAt(restoredExpiry);
      setShareToken(parsed.token ?? null);
      setSharePath(parsed.path ?? null);
      setNotificationId(restoredNotificationId);
      if (restoredExpiry <= Date.now()) setOpen(true);
      safetyCheckinLog("storage hydration: check-in restored", {
        overdue: restoredExpiry <= Date.now(),
        hasToken: Boolean(parsed.token),
        hasPath: Boolean(parsed.path),
      });
      hydrationRetryCountRef.current = 0;
      hydrationSucceeded = true;
    }).catch((error) => {
      safetyCheckinLog("storage hydration failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      hydrationRetryCountRef.current += 1;
      if (hydrationRetryCountRef.current <= 2) {
        setTimeout(() => {
          if (!cancelled) setHydrationRevision((value) => value + 1);
        }, 2_000);
      } else {
        alert(labels.title, labels.loadFailed);
      }
    }).finally(() => {
      if (
        !cancelled &&
        hydrationSucceeded &&
        hydrationGeneration === operationGenerationRef.current
      ) {
        setStorageHydrated(true);
      }
      safetyCheckinLog("storage hydration complete");
    });
    return () => {
      cancelled = true;
    };
  }, [hydrationRevision, labels.confirm, labels.overdue, routeId, routeName, storageKey]);

  useEffect(() => {
    if (storageHydrated) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      hydrationRetryCountRef.current = 0;
      setHydrationRevision((value) => value + 1);
    });
    return () => subscription.remove();
  }, [storageHydrated]);

  useEffect(() => {
    if (!storageHydrated) return;
    if (expiresAt == null) {
      void AsyncStorage.removeItem(storageKey).catch(() => {});
    } else {
      void AsyncStorage.setItem(storageKey, JSON.stringify({
        expiresAt,
        ...(shareToken ? { token: shareToken } : {}),
        ...(sharePath ? { path: sharePath } : {}),
        ...(notificationId ? { notificationId } : {}),
        notificationScheduled: Platform.OS === "web" || expiresAt <= Date.now() || Boolean(notificationId),
      })).catch(() => {});
    }
  }, [expiresAt, notificationId, shareToken, sharePath, storageHydrated, storageKey]);

  useEffect(() => {
    if (expiresAt == null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    if (expiresAt == null) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= expiresAt) setOpen(true);
    });
    return () => subscription.remove();
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
      if (!authToken) {
        safetyCheckinLog("live-link location skipped: no auth token");
        return;
      }
      safetyCheckinLog("live-link location upload started", { hasFreshGps: true });
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
      }).then((response) => {
        safetyCheckinLog("live-link location upload completed", {
          ok: response.ok,
          status: response.status,
        });
      }).catch((error) => {
        safetyCheckinLog("live-link location upload failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }).catch((error) => {
      safetyCheckinLog("live-link auth lookup failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, [shareToken, livePosition?.lat, livePosition?.lng, hasFreshGps, getAuthToken]);

  const remaining = expiresAt == null ? 0 : Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const overdue = expiresAt != null && now >= expiresAt;
  const displayTime = useMemo(() => {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [remaining]);

  useEffect(() => {
    if (!storageHydrated) return;
    onStatusChange?.({
      status: expiresAt == null ? "idle" : overdue ? "overdue" : "active",
      remainingSec: remaining,
      expiresAtEpochMs: expiresAt,
      liveLinkActive: Boolean(shareToken),
    });
    safetyCheckinLog("status published to hike screen", {
      status: expiresAt == null ? "idle" : overdue ? "overdue" : "active",
      remainingSec: remaining,
      hasLiveLink: Boolean(shareToken),
    });
  }, [expiresAt, overdue, onStatusChange, remaining, shareToken, storageHydrated]);

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

  const emergencyPhoneDigits = emergencyContact?.phone?.replace(/\D/g, "") ?? "";
  const whatsappPhone = emergencyPhoneDigits.startsWith("00")
    ? emergencyPhoneDigits.slice(2)
    : emergencyPhoneDigits.startsWith("0")
    ? `41${emergencyPhoneDigits.slice(1)}`
    : emergencyPhoneDigits;

  const openPrefilledMessage = async (channel: "sms" | "whatsapp", path = sharePath) => {
    if (!path) return;
    if (!emergencyContact?.phone?.trim() || !emergencyPhoneDigits) {
      alert(labels.title, labels.noContact);
      return;
    }
    const message = `${labels.externalShare}\n${routeName}\n${path}`;
    const url = channel === "whatsapp"
      ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`
      : `sms:${emergencyPhoneDigits}&body=${encodeURIComponent(message)}`;
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return;
      }
      alert(
        labels.title,
        channel === "whatsapp"
          ? labels.whatsappUnavailable
          : labels.shareUnavailable,
      );
    } catch {
      alert(labels.title, labels.shareUnavailable);
    }
  };

  const close = () => setOpen(false);
  const cancelTimer = async () => {
    operationGenerationRef.current += 1;
    startBusyRef.current = false;
    setShareBusy(false);
    safetyCheckinLog("check-in cancel requested", { hadLiveLink: Boolean(shareToken) });
    const tokenToDelete = shareToken;
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify({ status: "cancelling" }));
      await cancelTaggedSafetyNotifications();
    } catch (error) {
        safetyCheckinLog("scheduled notifications cancellation failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      alert(labels.title, labels.endFailed);
      return;
    }
    if (tokenToDelete) {
      const base = getApiBaseUrl() ?? "";
      void getAuthToken().then((authToken) => {
        if (!authToken) {
          safetyCheckinLog("live-link delete skipped: no auth token");
          return;
        }
        void fetch(`${base}/api/safety-shares/${encodeURIComponent(tokenToDelete)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        }).then((response) => {
          safetyCheckinLog("live-link delete completed", { ok: response.ok, status: response.status });
        }).catch((error) => {
          safetyCheckinLog("live-link delete failed", {
            message: error instanceof Error ? error.message : String(error),
          });
        });
      });
    }
    setShareToken(null);
    setSharePath(null);
    setNotificationId(null);
    setExpiresAt(null);
    setOpen(false);
    await AsyncStorage.removeItem(storageKey).catch(() => {});
  };

  const startShare = async (durationOverride?: SafetyCheckinDuration) => {
    if (!storageHydrated) {
      safetyCheckinLog("check-in start blocked: storage reconciliation pending");
      alert(labels.title, labels.loadFailed);
      return;
    }
    if (expiresAt != null) {
      safetyCheckinLog("check-in start ignored: an existing check-in is active");
      setOpen(true);
      return;
    }
    if (startBusyRef.current) {
      safetyCheckinLog("check-in start ignored: request already busy");
      return;
    }
    startBusyRef.current = true;
    const operationGeneration = ++operationGenerationRef.current;
    const selectedDuration = durationOverride ?? duration;
    safetyCheckinLog("check-in start requested", {
      source: durationOverride == null ? "phone" : "watch",
      durationMinutes: selectedDuration,
    });
    setShareBusy(true);
    let createdToken: string | null = null;
    let createdPath: string | null = null;
    let expiry = Date.now() + selectedDuration * 60_000;
    let usedLocalFallback = false;

    const deleteCreatedShare = async () => {
      if (!createdToken) return;
      const authToken = await getAuthToken().catch(() => null);
      if (!authToken) return;
      const base = getApiBaseUrl() ?? "";
      await fetch(`${base}/api/safety-shares/${encodeURIComponent(createdToken)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    };

    try {
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
          body: JSON.stringify({ routeName, durationMinutes: selectedDuration }),
        });
        if (!response.ok) {
          throw new Error(
            "Der Sicherheitslink konnte nicht erstellt werden. Bitte versuche es erneut.",
          );
        }
        const data = await response.json() as { token: string; path: string; expiresAt: string };
        const parsedExpiry = Date.parse(data.expiresAt);
        if (!Number.isFinite(parsedExpiry)) throw new Error("invalid-expiry");
        createdToken = data.token;
        createdPath = `${base}${data.path}`;
        expiry = parsedExpiry;
      } catch (serverError) {
        usedLocalFallback = true;
        safetyCheckinLog("live-link creation failed; using local check-in", {
          message: serverError instanceof Error ? serverError.message : String(serverError),
        });
      }

      if (operationGeneration !== operationGenerationRef.current) {
        await deleteCreatedShare();
        return;
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify({
        expiresAt: expiry,
        ...(createdToken ? { token: createdToken } : {}),
        ...(createdPath ? { path: createdPath } : {}),
        notificationScheduled: false,
      }));
      if (operationGeneration !== operationGenerationRef.current) {
        await deleteCreatedShare();
        return;
      }
      await cancelTaggedSafetyNotifications();

      const nextNotificationId = Platform.OS === "web"
        ? null
        : await Notifications.scheduleNotificationAsync({
            content: {
              title: labels.overdue,
              body: `${routeName}: ${labels.confirm}`,
              sound: "default",
              data: {
                type: "safety-checkin",
                routeId,
                safetyCheckinStorageKey: storageKey,
                safetyCheckinExpiresAt: expiry,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: new Date(expiry),
            },
          });

      if (operationGeneration !== operationGenerationRef.current) {
        if (nextNotificationId) {
          await Notifications.cancelScheduledNotificationAsync(nextNotificationId).catch(() => {});
        }
        await deleteCreatedShare();
        await AsyncStorage.removeItem(storageKey).catch(() => {});
        return;
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify({
        expiresAt: expiry,
        ...(createdToken ? { token: createdToken } : {}),
        ...(createdPath ? { path: createdPath } : {}),
        ...(nextNotificationId ? { notificationId: nextNotificationId } : {}),
        notificationScheduled: true,
      }));
      if (operationGeneration !== operationGenerationRef.current) {
        if (nextNotificationId) {
          await Notifications.cancelScheduledNotificationAsync(nextNotificationId).catch(() => {});
        }
        await deleteCreatedShare();
        await AsyncStorage.removeItem(storageKey).catch(() => {});
        return;
      }

      setShareToken(createdToken);
      setSharePath(createdPath);
      setNotificationId(nextNotificationId);
      setExpiresAt(expiry);
      setOpen(true);
      safetyCheckinLog("check-in started", {
        source: durationOverride == null ? "phone" : "watch",
        durationMinutes: selectedDuration,
        localOnly: usedLocalFallback,
      });

      if (usedLocalFallback) {
        alert(labels.title, labels.shareFailed);
      }
    } catch (error) {
      await deleteCreatedShare();
      await AsyncStorage.removeItem(storageKey).catch(() => {});
      safetyCheckinLog("check-in start failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      alert(labels.title, labels.startFailed);
    } finally {
      if (operationGeneration === operationGenerationRef.current) {
        startBusyRef.current = false;
        setShareBusy(false);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    startFromWatch: (watchDuration) => {
      if (![30, 60, 120].includes(watchDuration)) {
        safetyCheckinLog("watch check-in ignored: invalid duration", {
          durationMinutes: watchDuration,
        });
        return;
      }
      safetyCheckinLog("watch check-in received by component", {
        durationMinutes: watchDuration,
      });
      setDuration(watchDuration);
      void startShare(watchDuration);
    },
    confirmFromWatch: () => {
      safetyCheckinLog("watch check-in confirmation received by component");
      void cancelTimer();
    },
  }), [cancelTimer, startShare]);

  const shareExternalLink = async () => {
    await openPrefilledMessage("whatsapp");
  };

  return (
    <>
      {!hideTrigger && (
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
      )}

      <AppModal
        visible={open}
        onRequestClose={close}
        closeLabel={labels.cancel}
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
                { text: labels.cancel, style: "cancel", onPress: () => void cancelTimer() },
                { text: labels.confirm, onPress: () => void cancelTimer() },
              ]
        }
      >
        {expiresAt == null ? (
          <>
            <Text style={[styles.choose, { color: colors.mutedForeground }]}>{labels.chooseDuration}</Text>
            <View style={styles.choices}>
              {([30, 60, 120] as SafetyCheckinDuration[]).map((value) => (
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
                {labels.localOnly}
              </Text>
            ) : null}
            {sharePath ? (
              <View style={[styles.linkBox, { borderColor: colors.glassBorder }]}>
                <Text style={[styles.linkLabel, { color: colors.mutedForeground }]}>
                  {labels.externalShareActive}
                </Text>
                <Text selectable numberOfLines={2} style={[styles.linkText, { color: colors.foreground }]}>
                  {sharePath}
                </Text>
                <View style={styles.sendChoices}>
                  <Pressable onPress={shareExternalLink} accessibilityRole="button" style={[styles.share, styles.sendChoice, { borderColor: colors.glassBorder }]}>
                    <Feather name="message-circle" size={17} color={colors.foreground} />
                    <Text style={[styles.shareText, { color: colors.foreground }]}>{labels.shareWhatsApp}</Text>
                  </Pressable>
                  <Pressable onPress={() => void openPrefilledMessage("sms")} accessibilityRole="button" style={[styles.share, styles.sendChoice, { borderColor: colors.glassBorder }]}>
                    <Feather name="message-square" size={17} color={colors.foreground} />
                    <Text style={[styles.shareText, { color: colors.foreground }]}>{labels.shareSms}</Text>
                  </Pressable>
                </View>
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
});

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
  sendChoices: { width: "100%" },
  sendChoice: { width: "100%" },
  shareText: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  linkBox: { width: "100%", borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 12 },
  linkLabel: { fontFamily: fonts.bodyBold, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  linkText: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16, marginTop: 5 },
});