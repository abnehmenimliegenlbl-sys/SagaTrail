import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";

import { GLAS_3D, GLAS_3D_STARK } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

/**
 * Einheitliches App-Modal im SagaTrail-Design (Frozen-Glass), das
 * `Alert.alert` und Ad-hoc-`Modal`-Nutzung im ganzen Code ersetzt, damit
 * sowohl App-eigene Dialoge als auch Berechtigungsabfragen konsistent
 * aussehen statt wie das native, unstylbare OS-Fenster.
 */

export interface AppModalButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface AppModalProps {
  visible: boolean;
  onRequestClose: () => void;
  icon?: React.ReactNode;
  title: string;
  message?: string;
  buttons: AppModalButton[];
  children?: React.ReactNode;
}

export function AppModal({
  visible,
  onRequestClose,
  icon,
  title,
  message,
  buttons,
  children,
}: AppModalProps) {
  const colors = useColors();

  useEffect(() => {
    if (visible && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
        <Animated.View
          entering={FadeInDown.duration(220)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.card,
            GLAS_3D_STARK,
            {
              borderRadius: colors.radius,
              borderColor: colors.glassBorder,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={styles.clip}>
            <BlurView
              intensity={40}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassBgStrong }]}
            />
            <View style={styles.content}>
              {icon && (
                <Animated.View entering={FadeIn.delay(80)} style={styles.icon}>
                  {icon}
                </Animated.View>
              )}
              <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
              {message && (
                <Text style={[styles.message, { color: colors.mutedForeground }]}>
                  {message}
                </Text>
              )}
              {children}
              <View style={styles.buttonRow}>
                {buttons.map((btn, i) => {
                  const destructive = btn.style === "destructive";
                  const cancel = btn.style === "cancel";
                  return (
                    <Pressable
                      key={i}
                      onPress={btn.onPress}
                      style={({ pressed }) => [
                        styles.button,
                        cancel ? null : GLAS_3D,
                        {
                          borderColor: destructive
                            ? colors.destructive
                            : cancel
                              ? colors.glassBorder
                              : colors.accent,
                          backgroundColor: cancel
                            ? "transparent"
                            : destructive
                              ? colors.destructive + "1F"
                              : colors.accent,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      {!cancel && !destructive && (
                        <View
                          pointerEvents="none"
                          style={[
                            StyleSheet.absoluteFill,
                            {
                              borderTopWidth: 1.5,
                              borderColor: "rgba(255,255,255,0.4)",
                              borderRadius: 12,
                            },
                          ]}
                        />
                      )}
                      <Text
                        style={[
                          styles.buttonText,
                          {
                            color: cancel
                              ? colors.mutedForeground
                              : destructive
                                ? colors.destructive
                                : colors.accentForeground,
                          },
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(6,10,11,0.62)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  card: { width: "100%", maxWidth: 400, borderWidth: 1 },
  clip: { borderRadius: 17, overflow: "hidden" },
  content: { padding: 22, alignItems: "center" },
  icon: { marginBottom: 12 },
  title: {
    fontFamily: fonts.titleBold,
    fontSize: 20,
    textAlign: "center",
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  buttonRow: { width: "100%", gap: 10, marginTop: 20 },
  button: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { fontFamily: fonts.bodyBold, fontSize: 15 },
});
