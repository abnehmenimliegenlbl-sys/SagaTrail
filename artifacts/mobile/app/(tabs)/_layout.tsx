import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

import colors from "@/constants/colors";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

export default function TabLayout() {
  const c = useColors();
  const isWeb = Platform.OS === "web";

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
          backgroundColor: isWeb ? colors.dark.nachthimmel : "transparent",
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
                { backgroundColor: colors.dark.nachthimmel },
              ]}
            />
          ) : (
            <BlurView
              intensity={30}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Entdecken", tabBarIcon: icon("compass") }}
      />
      <Tabs.Screen
        name="sammlung"
        options={{ title: "Sammlung", tabBarIcon: icon("award") }}
      />
      <Tabs.Screen
        name="gruppe"
        options={{ title: "Gruppe", tabBarIcon: icon("users") }}
      />
      <Tabs.Screen
        name="einstellungen"
        options={{ title: "Einstellungen", tabBarIcon: icon("settings") }}
      />
    </Tabs>
  );
}
