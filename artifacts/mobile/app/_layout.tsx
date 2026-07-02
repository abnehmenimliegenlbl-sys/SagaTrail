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

SystemUI.setBackgroundColorAsync(colors.dark.nachthimmel);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { hydrated, profile } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    const inOnboarding = segments[0] === "onboarding";
    if (!profile && !inOnboarding) {
      router.replace("/onboarding");
    } else if (profile && inOnboarding) {
      router.replace("/");
    }
  }, [hydrated, profile, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.dark.talschatten },
        animation: "fade",
      }}
    >
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
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AppProvider>
                <RootLayoutNav />
              </AppProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
