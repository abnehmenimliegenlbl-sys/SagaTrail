import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/constants/typography";
import { GLAS_3D } from "@/constants/depth";
import { useColors } from "@/hooks/useColors";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

interface RouteAccordionCardProps {
  icon: FeatherName;
  title: string;
  summary?: string;
  open: boolean;
  onPress: () => void;
  collapsible?: boolean;
  children: React.ReactNode;
}

export function RouteAccordionCard({
  icon,
  title,
  summary,
  open,
  onPress,
  collapsible = true,
  children,
}: RouteAccordionCardProps) {
  const colors = useColors();
  const bodyVisible = !collapsible || open;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: open && collapsible ? colors.accent : colors.glassBorder,
          backgroundColor: colors.glassBg,
        },
      ]}
    >
      {collapsible ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          style={styles.header}
        >
          <HeaderContent
            icon={icon}
            title={title}
            summary={summary}
            open={open}
            collapsible
          />
        </Pressable>
      ) : (
        <View style={styles.header}>
          <HeaderContent icon={icon} title={title} summary={summary} open />
        </View>
      )}
      {bodyVisible ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

function HeaderContent({
  icon,
  title,
  summary,
  open,
  collapsible = false,
}: {
  icon: FeatherName;
  title: string;
  summary?: string;
  open: boolean;
  collapsible?: boolean;
}) {
  const colors = useColors();

  return (
    <>
        <View style={[styles.icon, { backgroundColor: colors.accent + "1A" }]}>
          <Feather name={icon} size={17} color={colors.accent} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {!open && summary ? (
            <Text style={[styles.summary, { color: colors.mutedForeground }]} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        {collapsible ? (
          <Feather
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color={open ? colors.accent : colors.mutedForeground}
          />
        ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 12,
    overflow: "hidden",
  },
  header: {
    minHeight: 66,
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1 },
  title: { fontFamily: fonts.bodyBold, fontSize: 15 },
  summary: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  body: { paddingHorizontal: 15, paddingBottom: 15 },
});