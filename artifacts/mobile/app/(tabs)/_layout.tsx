import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useThemeModeSafe } from "@/contexts/AppContext";
import { useTabsStrings } from "@/lib/i18n/screens/tabs";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

export default function TabLayout() {
  const c = useColors();
  const themeMode = useThemeModeSafe();
  const isWeb = Platform.OS === "web";
  const t = useTabsStrings();

  const icon =
    (name: FeatherName) =>
    ({ color }: { color: string }) => <Feather name={name} size={22} color={color} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
          letterSpacing: 0.4,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isWeb ? c.nachthimmel : "transparent",
          borderTopWidth: 1,
          borderTopColor: c.glassBorder,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: c.nachthimmel },
              ]}
            />
          ) : (
            <BlurView
              intensity={30}
              tint={themeMode === "hell" ? "light" : "dark"}
              style={StyleSheet.absoluteFill}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.entdecken, tabBarIcon: icon("compass") }}
      />
      <Tabs.Screen
        name="sammlung"
        options={{ title: t.sammlung, tabBarIcon: icon("award") }}
      />
      <Tabs.Screen
        name="gruppe"
        options={{ title: t.gruppe, tabBarIcon: icon("users") }}
      />
      <Tabs.Screen
        name="einstellungen"
        options={{ title: t.einstellungen, tabBarIcon: icon("settings") }}
      />
    </Tabs>
  );
}
