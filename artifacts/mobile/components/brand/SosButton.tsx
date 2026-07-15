import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppModal } from "@/components/brand/AppModal";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useSosStrings } from "@/lib/i18n/screens/sos";

interface SosButtonProps {
  /** Koordinaten des Routenstarts als Fallback (wenn GPS nicht verfügbar) */
  lat?: number;
  lng?: number;
  style?: object;
}

interface CallNumber {
  label: string;
  number: string;
  color: string;
  description: string;
}

export function SosButton({ lat, lng, style }: SosButtonProps) {
  const colors = useColors();
  const t = useSosStrings();
  const [visible, setVisible] = useState(false);

  function open() {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setVisible(true);
  }

  function call(number: string) {
    setVisible(false);
    setTimeout(() => {
      Linking.openURL(`tel:${number}`).catch(() => {});
    }, 300);
  }

  const coordText =
    lat != null && lng != null
      ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      : null;

  const numbers: CallNumber[] = [
    { label: t.rega,    number: "1414", color: "#D50000", description: t.regaDesc    },
    { label: t.sanity,  number: "144",  color: "#D50000", description: t.sanityDesc  },
    { label: t.police,  number: "117",  color: "#1565C0", description: t.policeDesc  },
    { label: t.eu,      number: "112",  color: "#FF6F00", description: t.euDesc      },
  ];

  return (
    <>
      <Pressable
        onPress={open}
        style={[styles.button, style]}
        accessibilityRole="button"
        accessibilityLabel={t.sos}
      >
        <Feather name="alert-triangle" size={14} color="#fff" />
        <Text style={styles.label}>{t.sos}</Text>
      </Pressable>

      <AppModal
        visible={visible}
        onRequestClose={() => setVisible(false)}
        title={t.title}
        message={coordText ? `${t.yourPosition}: ${coordText}` : t.positionUnknown}
        buttons={[{ text: t.close, style: "cancel", onPress: () => setVisible(false) }]}
      >
        <View style={styles.grid}>
          {numbers.map((n) => (
            <Pressable
              key={n.number}
              onPress={() => call(n.number)}
              style={({ pressed }) => [
                styles.callBtn,
                { borderColor: n.color, opacity: pressed ? 0.82 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${n.label} ${n.number}`}
            >
              <Text style={[styles.callNumber, { color: n.color }]}>{n.number}</Text>
              <Text style={[styles.callLabel, { color: colors.foreground }]}>{n.label}</Text>
              <Text style={[styles.callDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                {n.description}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t.hint}</Text>
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#C62828",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "#fff",
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    width: "100%",
  },
  callBtn: {
    flex: 1,
    minWidth: "44%",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 3,
  },
  callNumber: {
    fontFamily: fonts.titleBold,
    fontSize: 22,
  },
  callLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  callDesc: {
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 14,
    fontStyle: "italic",
  },
});
