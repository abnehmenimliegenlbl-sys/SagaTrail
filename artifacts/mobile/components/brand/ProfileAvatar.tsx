import { Image as ExpoImage } from "expo-image";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { useSharedStrings } from "@/lib/i18n/screens/shared";

export function profileAvatarUri(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const base = getApiBaseUrl();
  if (!base) return null;
  return `${base}/api/storage${value.startsWith("/") ? value : `/${value}`}`;
}

export function ProfileAvatar({
  avatarUrl,
  name,
  size = 52,
}: {
  avatarUrl?: string | null;
  name?: string | null;
  size?: number;
}) {
  const colors = useColors();
  const t = useSharedStrings();
  const [imageFailed, setImageFailed] = useState(false);
  const uri = profileAvatarUri(avatarUrl);
  const initial = name?.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    setImageFailed(false);
  }, [uri]);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name ? `${t.avatarOf} ${name}` : t.avatar}
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.accent + "20",
          borderColor: colors.glassBorder,
        },
      ]}
    >
      {uri && !imageFailed ? (
        <ExpoImage
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={[styles.initial, { color: colors.accent, fontSize: Math.max(16, size * 0.36) }]}>
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  initial: {
    fontFamily: fonts.titleBold,
  },
});