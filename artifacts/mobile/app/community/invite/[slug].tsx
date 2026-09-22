import { useAuth } from "@clerk/expo";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { useCommunityInviteStrings } from "@/lib/i18n/screens/communityInvite";
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
  const t = useCommunityInviteStrings();
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
  const claimKeyRef = useRef<string | null>(null);
  const redirectKeyRef = useRef<string | null>(null);
  const [state, setState] = useState<ClaimState>("loading");
  const [communityName, setCommunityName] = useState("");

  useEffect(() => {
    if (inviteAction.kind === "wait") return;
    if (inviteAction.kind === "redirect-to-sign-in") {
      if (inviteKey && redirectKeyRef.current !== inviteKey) {
        redirectKeyRef.current = inviteKey;
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
    if (!shouldStartCommunityInviteClaim(claimKeyRef.current, normalizedInvite)) return;
    claimKeyRef.current = inviteKey;
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLAIM_TIMEOUT_MS);
    let tokenTimeoutId: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        if (!apiBaseUrl) {
          throw new Error(t.apiError);
        }
        const tokenTimeout = new Promise<never>((_, reject) => {
          tokenTimeoutId = setTimeout(
            () => reject(new Error(t.authError)),
            TOKEN_TIMEOUT_MS,
          );
        });
        const token = await Promise.race([getToken(), tokenTimeout]);
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
          throw new Error(t.claimError);
        }
        if (!cancelled) {
          setCommunityName(payload.community?.name ?? t.defaultCommunity);
          setState("success");
        }
      } catch {
        if (!cancelled) setState("error");
      } finally {
        if (tokenTimeoutId) clearTimeout(tokenTimeoutId);
        clearTimeout(timeoutId);
      }
    })();
    return () => {
      cancelled = true;
      if (tokenTimeoutId) clearTimeout(tokenTimeoutId);
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    getToken,
    inviteActionKind,
    inviteKey,
    router,
    t,
  ]);

  return (
    <Background>
      <Stack.Screen options={{ title: t.pageTitle, headerShown: false }} />
      <View style={styles.container}>
        <Text style={[styles.kicker, { color: colors.accent }]}>{t.kicker}</Text>
        {state === "loading" ? (
          <>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={[styles.title, { color: colors.foreground }]}>{t.loadingTitle}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{t.loadingBody}</Text>
          </>
        ) : state === "success" ? (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>{t.successTitle}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{t.successBody(communityName)}</Text>
            <PrimaryButton label={t.continueButton} onPress={() => router.replace("/")} />
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>{t.errorTitle}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{t.errorBody}</Text>
            <PrimaryButton label={t.appButton} onPress={() => router.replace("/")} />
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