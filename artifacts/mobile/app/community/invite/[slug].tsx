import { useAuth } from "@clerk/expo";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/apiConfig";
import {
  communityInviteClaimKey,
  getCommunityInviteRouteParams,
  resolveCommunityInviteAction,
  shouldStartCommunityInviteClaim,
} from "@/lib/communityInviteFlow";

type ClaimState = "loading" | "success" | "error";
const CLAIM_TIMEOUT_MS = 12_000;
const TOKEN_TIMEOUT_MS = 8_000;

export default function CommunityInviteScreen() {
  const colors = useColors();
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { code: rawCode, slug: rawSlug } = useLocalSearchParams<{
    code?: string | string[];
    slug?: string | string[];
  }>();
  const inviteAction = resolveCommunityInviteAction({
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    slug: rawSlug,
    code: rawCode,
  });
  const normalizedInvite = getCommunityInviteRouteParams({
    slug: rawSlug,
    code: rawCode,
  });
  const inviteKey = normalizedInvite ? communityInviteClaimKey(normalizedInvite) : null;
  const inviteActionKind = inviteAction.kind;
  const [claimKey, setClaimKey] = useState<string | null>(null);
  const [state, setState] = useState<ClaimState>("loading");
  const [communityName, setCommunityName] = useState("");

  useEffect(() => {
    if (inviteAction.kind === "wait") return;
    if (inviteAction.kind === "redirect-to-sign-in") {
      if (inviteKey && shouldStartCommunityInviteClaim(claimKey, inviteAction.invite)) {
        setClaimKey(inviteKey);
        router.replace({
          pathname: "/(auth)/sign-in",
          params: {
            slug: inviteAction.invite.slug,
            code: inviteAction.invite.code,
          },
        });
      }
      return;
    }
    if (inviteAction.kind === "error") {
      setState("error");
      return;
    }
    if (!normalizedInvite || !inviteKey) return;
    if (!shouldStartCommunityInviteClaim(claimKey, normalizedInvite)) return;
    setClaimKey(inviteKey);
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLAIM_TIMEOUT_MS);
    void (async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        if (!apiBaseUrl) {
          throw new Error("Die API-Adresse ist nicht konfiguriert.");
        }
        const token = await getToken();
        const response = await fetch(`${apiBaseUrl}/api/communities/invitations/claim`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ code: normalizedInvite.code.toUpperCase() }),
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          community?: { name?: string };
        };
        if (!response.ok) {
          throw new Error("Die Einladung konnte nicht angenommen werden. Bitte versuche es erneut.");
        }
        if (!cancelled) {
          setCommunityName(payload.community?.name ?? "deine Community");
          setState("success");
        }
      } catch {
        if (!cancelled) setState("error");
      } finally {
        clearTimeout(timeoutId);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    claimKey,
    getToken,
    inviteActionKind,
    inviteKey,
    router,
  ]);

  return (
    <Background>
      <Stack.Screen options={{ title: "Community-Einladung", headerShown: false }} />
      <View style={styles.container}>
        <Text style={[styles.kicker, { color: colors.accent }]}>SAGATRAIL COMMUNITY</Text>
        {state === "loading" ? (
          <>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[styles.title, { color: colors.foreground }]}>Einladung wird geöffnet</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>Dein Platz in der Community wird bestätigt.</Text>
          </>
        ) : state === "success" ? (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Du bist dabei.</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              Die Einladung zu {communityName} wurde deinem SagaTrail-Konto hinzugefügt.
            </Text>
            <PrimaryButton label="Weiter zur App" onPress={() => router.replace("/")} />
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>Einladung nicht gefunden</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>
              Der Code ist abgelaufen oder nicht korrekt. Öffne die Einladung erneut oder nutze den Code auf der Landingpage.
            </Text>
            <PrimaryButton label="Zur App" onPress={() => router.replace("/")} />
          </>
        )}
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
    gap: 16,
  },
  kicker: {
    fontFamily: "JetBrainsMono_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: "BigShouldersDisplay_700Bold",
    fontSize: 42,
    lineHeight: 45,
  },
  body: {
    fontFamily: "Karla_400Regular",
    fontSize: 17,
    lineHeight: 25,
  },
});