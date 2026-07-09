import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { AppModal } from "./AppModal";

/**
 * "Priming"-Dialog vor einer nativen OS-Berechtigungsabfrage: erklaert im
 * App-Design, WOFUER die Berechtigung gebraucht wird, bevor der eigentliche
 * (nicht stylbare) System-Dialog erscheint. Erhoeht Grant-Raten und
 * vermeidet, dass Nutzer:innen ueberraschend vom OS gefragt werden.
 */

interface PermissionModalProps {
  visible: boolean;
  onRequestClose: () => void;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  allowLabel: string;
  skipLabel: string;
  onAllow: () => void;
  onSkip: () => void;
}

export function PermissionModal({
  visible,
  onRequestClose,
  icon,
  title,
  message,
  allowLabel,
  skipLabel,
  onAllow,
  onSkip,
}: PermissionModalProps) {
  const colors = useColors();
  return (
    <AppModal
      visible={visible}
      onRequestClose={onRequestClose}
      title={title}
      message={message}
      icon={
        <View
          style={[
            styles.iconWrap,
            { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
          ]}
        >
          <Feather name={icon} size={26} color={colors.accent} />
        </View>
      }
      buttons={[
        { text: allowLabel, onPress: onAllow },
        { text: skipLabel, style: "cancel", onPress: onSkip },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
