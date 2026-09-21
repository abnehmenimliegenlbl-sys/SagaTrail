import {
  BigShouldersDisplay_500Medium,
  BigShouldersDisplay_700Bold,
  BigShouldersDisplay_900Black,
} from "@expo-google-fonts/big-shoulders-display";
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_600SemiBold,
} from "@expo-google-fonts/jetbrains-mono";
import {
  Karla_400Regular,
  Karla_400Regular_Italic,
  Karla_500Medium,
  Karla_700Bold,
  useFonts,
} from "@expo-google-fonts/karla";
import {
  AlbertSans_500Medium,
  AlbertSans_700Bold,
  AlbertSans_900Black,
} from "@expo-google-fonts/albert-sans";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ClerkProvider, useAuth } from "@clerk/expo";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import {
  clearKeychainOnFreshInstall,
  clerkTokenCache,
} from "@/lib/clerkAuth";

// Sofort beim Modulload ausführen (vor ClerkProvider-Initialisierung).
void clearKeychainOnFreshInstall();
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import colors from "@/constants/colors";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { usePushToken } from "@/hooks/usePushToken";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { CatalogProvider } from "@/contexts/CatalogContext";
import { DownloadProvider } from "@/contexts/DownloadContext";
import {
  RequiredPermissionsContext,
  RequiredPermissionsGateState,
} from "@/contexts/RequiredPermissionsContext";
import { configureApiClient } from "@/lib/apiConfig";
import "@/lib/backgroundLocation";
import { alert, AppAlertProvider } from "@/lib/appAlert";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";
import { hapticMedium, hapticWarning } from "@/lib/haptics";
import { makeLogger } from "@/lib/debugLog";
import { getRuntimeDiagnostics } from "@/lib/runtimeDiagnostics";
import { readRequiredPermissionSnapshot } from "@/lib/requiredPermissions";
import { isCommunityInviteSegments } from "@/lib/communityInviteFlow";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { StartupState } from "@/components/brand/StartupState";

const CRASH_KEY = "__sagatrail_last_crash__";
const appRuntimeLog = makeLogger("[APP-RUNTIME]", "app_runtime");

async function checkPreviousCrash() {
  try {
    const stored = await AsyncStorage.getItem(CRASH_KEY);
    if (stored) {
      await AsyncStorage.removeItem(CRASH_KEY);
      alert("Crash-Info (Debug)", stored.substring(0, 800));
    }
  } catch {}
}

if (typeof ErrorUtils !== "undefined") {
  const prev = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    AsyncStorage.setItem(
      CRASH_KEY,
      `[${isFatal ? "FATAL" : "non-fatal"}] ${error?.message ?? String(error)}\n\n${error?.stack ?? ""}`.substring(0, 1500)
    ).finally(() => {
      prev?.(error, isFatal);
    });
  });
}

configureApiClient();

SystemUI.setBackgroundColorAsync(colors.hell.nachthimmel);

try {
  initializeRevenueCat();
} catch (err) {
  console.warn("RevenueCat konnte nicht initialisiert werden:", err);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  (Constants.expoConfig?.extra?.clerkPublishableKey as string | undefined) ||
  "";
const CLERK_PROXY_URL = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function AuthTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  setAuthTokenGetter(() => getToken());
  return <>{children}</>;
}

function ClerkGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth();
  if (!isLoaded) {
    return Platform.OS === "web" ? (
      <StartupState
        title="Anmeldung wird geprüft"
        detail="SagaTrail stellt deine Sitzung wieder her."
      />
    ) : null;
  }
  return <>{children}</>;
}

function RootLayoutNav({ fontsReady }: { fontsReady: boolean }) {
  const { hydrated, profile } = useApp();
  const { isLoaded, isSignedIn } = useAuth();
  const updatesState = Updates.useUpdates();
  usePushToken();
  const segments = useSegments();
  const router = useRouter();
  const c = useColors();
  const [permissionGateState, setPermissionGateState] =
    useState<RequiredPermissionsGateState>("idle");
  const permissionCheckGenerationRef = useRef(0);
  const updateReloadStartedRef = useRef(false);
  const shouldCheckPermissions = hydrated && isLoaded && isSignedIn && Boolean(profile);

  useEffect(() => {
    if (!fontsReady || !isLoaded || !hydrated) return;
    void SplashScreen.hideAsync();
  }, [fontsReady, hydrated, isLoaded]);

  const refreshRequiredPermissions = useCallback(async (reason = "app-start") => {
    const generation = ++permissionCheckGenerationRef.current;
    setPermissionGateState("checking");
    const snapshot = await readRequiredPermissionSnapshot(reason);
    if (generation === permissionCheckGenerationRef.current) {
      setPermissionGateState(snapshot.allGranted ? "granted" : "missing");
    }
    return snapshot.allGranted;
  }, []);

  const permissionContextValue = useMemo(
    () => ({
      state: permissionGateState,
      refresh: refreshRequiredPermissions,
    }),
    [permissionGateState, refreshRequiredPermissions],
  );

  useEffect(() => {
    if (!shouldCheckPermissions) {
      permissionCheckGenerationRef.current += 1;
      setPermissionGateState("idle");
      return;
    }
    void refreshRequiredPermissions("app-start");
  }, [refreshRequiredPermissions, shouldCheckPermissions]);

  useEffect(() => {
    if (!shouldCheckPermissions) return;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refreshRequiredPermissions("app-foreground");
      }
    });
    return () => {
      subscription.remove();
    };
  }, [refreshRequiredPermissions, shouldCheckPermissions]);

  useEffect(() => {
    appRuntimeLog("runtime snapshot", {
      ...getRuntimeDiagnostics(),
      appState: AppState.currentState,
    });

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      appRuntimeLog("app state", {
        state: nextState,
        ...getRuntimeDiagnostics(),
      });
    });
    const updateSubscription = Updates.addUpdatesStateChangeListener(({ context }) => {
      appRuntimeLog("updates state", {
        ...getRuntimeDiagnostics(),
        isStartupProcedureRunning: context.isStartupProcedureRunning,
        isUpdateAvailable: context.isUpdateAvailable,
        isUpdatePending: context.isUpdatePending,
        isChecking: context.isChecking,
        isDownloading: context.isDownloading,
        isRestarting: context.isRestarting,
        restartCount: context.restartCount,
        sequenceNumber: context.sequenceNumber,
        downloadProgress: context.downloadProgress,
        hasCheckError: Boolean(context.checkError),
        hasDownloadError: Boolean(context.downloadError),
      });
    });

    return () => {
      appStateSubscription.remove();
      updateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (
      __DEV__ ||
      !Updates.isEnabled ||
      !updatesState.isUpdatePending ||
      updatesState.isRestarting ||
      updateReloadStartedRef.current
    ) {
      return;
    }
    updateReloadStartedRef.current = true;
    appRuntimeLog("activating downloaded update", {
      ...getRuntimeDiagnostics(),
      restartCount: updatesState.restartCount,
    });
    void Updates.reloadAsync().catch((error) => {
      updateReloadStartedRef.current = false;
      appRuntimeLog("downloaded update activation failed", {
        ...getRuntimeDiagnostics(),
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, [
    updatesState.isRestarting,
    updatesState.isUpdatePending,
    updatesState.restartCount,
  ]);

  // Globale Notification-Listener fuer Haptik-Feedback.
  // Deckt Remote-Push-Nachrichten (Wetter, Marketing) ab, die ankommen
  // waehrend die App im Vordergrund ist, sowie den Tap auf eine Notification
  // aus dem Sperrbildschirm / Notification Center.
  // Lokale Wander-Notifications (Abbiegehinweise, POIs) erhalten ihre Haptik
  // direkt beim Senden in turnNotifications.ts — dort ist der Kontext bekannt.
  useEffect(() => {
    if (Platform.OS === "web") return;
    // Foreground: Remote-Push eingetroffen → Warning-Impuls (spuerbar, aber
    // nicht erschreckend; passt zu Wetterwarnungen und allg. Hinweisen).
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      hapticWarning();
    });
    // Tap: Nutzer hat auf Notification getippt → Medium-Impuls als
    // Bestaetigung, dass die App daraufhin oeffnet / in den Vordergrund tritt.
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      hapticMedium();
      const data = response.notification.request.content.data as { type?: string; meetupId?: string } | undefined;
      if (data?.type === "meetup_photo_upload" && data.meetupId) {
        router.push(`/treffpunkt-fotos/${data.meetupId}`);
      }
    });
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !isLoaded) return;
    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";
    const inPermissions = segments[0] === "permissions";
    const inCommunityInvite = isCommunityInviteSegments(segments);

    if (!isSignedIn) {
      if (!inAuth && !inCommunityInvite) router.replace("/(auth)/sign-in");
      return;
    }
    if (inCommunityInvite) return;
    if (!profile) {
      if (!inOnboarding) router.replace("/onboarding");
      return;
    }
    if (permissionGateState === "idle" || permissionGateState === "checking") {
      return;
    }
    // Wie im ursprünglichen Ablauf bleibt die App bis zur Freigabe aller
    // erforderlichen Berechtigungen im Berechtigungsfluss. Kamera ist davon
    // ausgenommen und wird erst beim Kamera-Feature angefragt.
    if (permissionGateState === "missing") {
      if (!inPermissions) router.replace("/permissions");
      return;
    }
    if (inAuth || inOnboarding || inPermissions) {
      router.replace("/");
    }
  }, [
    hydrated,
    isLoaded,
    isSignedIn,
    profile,
    permissionGateState,
    segments,
    router,
  ]);

  if (!isLoaded) {
    return Platform.OS === "web" ? (
      <StartupState
        title="SagaTrail wird vorbereitet"
        detail="Katalog, Profil und Wanderungen werden geladen."
      />
    ) : null;
  }

  if (!hydrated) {
    return Platform.OS === "web" ? (
      <StartupState
        title="Dein Profil wird geladen"
        detail="Deine gespeicherten Wanderungen bleiben erhalten."
      />
    ) : null;
  }

  return (
    <RequiredPermissionsContext.Provider value={permissionContextValue}>
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.talschatten },
            animation: "fade",
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="permissions" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="saga/[id]" />
          <Stack.Screen name="route/[id]" />
          <Stack.Screen name="route/[id]/saga" />
          <Stack.Screen name="hike/[id]" options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="summary" />
          <Stack.Screen
            name="paywall"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen name="legal/[doc]" />
        </Stack>
        {shouldCheckPermissions && permissionGateState === "checking" && (
          <View
            style={{
              alignItems: "center",
              backgroundColor: c.card,
              borderColor: c.glassBorder,
              borderRadius: c.radius,
              borderWidth: 1,
              bottom: 22,
              justifyContent: "flex-start",
              left: 16,
              paddingHorizontal: 14,
              paddingVertical: 12,
              position: "absolute",
              right: 16,
              zIndex: 1000,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={c.accent} size="small" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: c.foreground,
                    fontFamily: fonts.bodyBold,
                    fontSize: 14,
                  }}
                >
                  Berechtigungen werden geprüft
                </Text>
                <Text
                  style={{
                    color: c.mutedForeground,
                    fontFamily: fonts.body,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  Du kannst währenddessen weiter stöbern.
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </RequiredPermissionsContext.Provider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BigShouldersDisplay_500Medium,
    BigShouldersDisplay_700Bold,
    BigShouldersDisplay_900Black,
    AlbertSans_500Medium,
    AlbertSans_700Bold,
    AlbertSans_900Black,
    Karla_400Regular,
    Karla_400Regular_Italic,
    Karla_500Medium,
    Karla_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_600SemiBold,
  });

  useEffect(() => {
    checkPreviousCrash();
  }, []);

  if (!fontsLoaded && !fontError) {
    return Platform.OS === "web" ? <StartupState /> : null;
  }

  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        proxyUrl={CLERK_PROXY_URL}
        tokenCache={clerkTokenCache}
      >
        <ClerkGuard>
          <SafeAreaProvider>
            <ErrorBoundary>
              <QueryClientProvider client={queryClient}>
                <GestureHandlerRootView>
                  <KeyboardProvider>
                    <AppAlertProvider>
                      <AuthTokenBridge>
                        <SubscriptionProvider>
                          <AppProvider>
                            <CatalogProvider>
                              <DownloadProvider>
                                <RootLayoutNav fontsReady={fontsLoaded || Boolean(fontError)} />
                              </DownloadProvider>
                            </CatalogProvider>
                          </AppProvider>
                        </SubscriptionProvider>
                      </AuthTokenBridge>
                    </AppAlertProvider>
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </QueryClientProvider>
            </ErrorBoundary>
          </SafeAreaProvider>
        </ClerkGuard>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
