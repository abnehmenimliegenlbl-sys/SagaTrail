import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

export type HikeSystemStatusKind = "connection" | "gps" | "compass" | "ar";

export interface HikeSystemStatusIssue {
  kind: HikeSystemStatusKind;
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface HikeSystemStatusBannerProps {
  issue: HikeSystemStatusIssue;
  variant?: "screen" | "camera";
}

const STATUS_ICONS: Record<HikeSystemStatusKind, "wifi-off" | "map-pin" | "compass" | "camera"> = {
  connection: "wifi-off",
  gps: "map-pin",
  compass: "compass",
  ar: "camera",
};

export function HikeSystemStatusBanner({
  issue,
  variant = "screen",
}: HikeSystemStatusBannerProps) {
  const colors = useColors();
  const cameraVariant = variant === "camera";
  const statusColor = issue.kind === "gps" || issue.kind === "ar"
    ? colors.destructive
    : colors.accent;
  const backgroundColor = cameraVariant ? colors.glassBgStrong : colors.card;
  const titleColor = cameraVariant ? colors.photoScrimText : colors.foreground;
  const detailColor = cameraVariant ? colors.photoScrimMuted : colors.mutedForeground;

  return (
    <View
      testID="hike-system-status"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor: statusColor,
        },
        cameraVariant && styles.cameraContainer,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.glassBg }]}>
        <Feather name={STATUS_ICONS[issue.kind]} size={17} color={statusColor} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: titleColor }]}>{issue.title}</Text>
        <Text style={[styles.detail, { color: detailColor }]}>{issue.detail}</Text>
        {issue.actionLabel && issue.onAction ? (
          <Pressable
            onPress={issue.onAction}
            accessibilityRole="button"
            accessibilityLabel={issue.actionLabel}
            style={styles.action}
          >
            <Text style={[styles.actionText, { color: statusColor }]}>
              {issue.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 12,
  },
  cameraContainer: {
    marginBottom: 0,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: fonts.titleBold,
    fontSize: 13,
    lineHeight: 18,
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  action: {
    alignSelf: "flex-start",
    justifyContent: "center",
    minHeight: 34,
    paddingVertical: 4,
  },
  actionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
});