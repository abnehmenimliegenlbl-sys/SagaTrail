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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import colors from "@/constants/colors";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { CatalogProvider } from "@/contexts/CatalogContext";
import { DownloadProvider } from "@/contexts/DownloadContext";
import { configureApiClient } from "@/lib/apiConfig";
import "@/lib/backgroundLocation";
import { alert, AppAlertProvider } from "@/lib/appAlert";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const CRASH_KEY = "__sagatrail_last_crash__";

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

SystemUI.setBackgroundColorAsync(colors.dark.nachthimmel);

try {
  initializeRevenueCat();
} catch (err) {
  console.warn("RevenueCat konnte nicht initialisiert werden:", err);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as string;
const CLERK_PROXY_URL = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function AuthTokenBridge({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  setAuthTokenGetter(() => getToken());
  return <>{children}</>;
}

function RootLayoutNav() {
  const { hydrated, profile } = useApp();
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated || !isLoaded) return;
    const inAuth = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!isSignedIn) {
      if (!inAuth) router.replace("/(auth)/sign-in");
      return;
    }
    if (!profile) {
      if (!inOnboarding) router.replace("/onboarding");
      return;
    }
    if (inAuth || inOnboarding) {
      router.replace("/");
    }
  }, [hydrated, isLoaded, isSignedIn, profile, segments, router]);

  if (!isLoaded) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.dark.talschatten },
        animation: "fade",
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="saga/[id]" />
      <Stack.Screen name="route/[id]" />
      <Stack.Screen name="hike/[id]" options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="summary" />
      <Stack.Screen
        name="paywall"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="legal/[doc]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BigShouldersDisplay_500Medium,
    BigShouldersDisplay_700Bold,
    BigShouldersDisplay_900Black,
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        proxyUrl={CLERK_PROXY_URL}
        tokenCache={tokenCache}
      >
        <ClerkLoaded>
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
                                <RootLayoutNav />
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
        </ClerkLoaded>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
