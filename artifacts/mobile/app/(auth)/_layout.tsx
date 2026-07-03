import { Stack } from "expo-router";
import React from "react";

import colors from "@/constants/colors";

/**
 * Eigene Stack-Gruppe fuer Anmeldung/Registrierung — vom Root-Layout
 * per Redirect erzwungen, solange kein Clerk-Benutzer angemeldet ist.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.dark.nachthimmel },
        animation: "fade",
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
