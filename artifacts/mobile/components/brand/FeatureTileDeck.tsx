import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GLAS_3D, GLAS_3D_STARK } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface FeatureTile {
  id: string;
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  content: React.ReactNode;
  preview?: React.ReactNode;
  modalSize?: "large";
}

interface Props {
  tiles: FeatureTile[];
  closeLabel?: string;
  onTileOpen?: (tileId: string) => void;
}

export function FeatureTileDeck({
  tiles,
  closeLabel = "Schliessen",
  onTileOpen,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTile = tiles.find((tile) => tile.id === activeId);

  const selectTile = (id: string) => {
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setActiveId(id);
    onTileOpen?.(id);
  };

  const closeModal = () => setActiveId(null);

  return (
    <View style={styles.deck}>
      <View style={styles.tileRow}>
        {tiles.map((tile) => {
              const selected = tile.id === activeId;
          return (
            <Pressable
              key={tile.id}
              accessibilityRole="button"
              accessibilityState={{ expanded: selected }}
              accessibilityLabel={tile.title}
              onPress={() => selectTile(tile.id)}
              style={({ pressed }) => [
                styles.tile,
                GLAS_3D,
                {
                  backgroundColor: selected ? colors.primary + "18" : colors.glassBg,
                  borderColor: selected ? colors.primary : colors.glassBorder,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Feather
                name={tile.icon}
                size={19}
                color={selected ? colors.primary : colors.mutedForeground}
              />
              <View style={styles.tileText}>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.tileTitle,
                    { color: selected ? colors.primary : colors.foreground },
                  ]}
                >
                  {tile.title}
                </Text>
                {tile.preview}
              </View>
              <Feather
                name={selected ? "chevron-up" : "chevron-down"}
                size={14}
                color={selected ? colors.primary : colors.mutedForeground}
              />
            </Pressable>
          );
        })}
      </View>

      <Modal
        visible={activeTile != null}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View
            style={[
              styles.modalCard,
              activeTile?.modalSize === "large" ? styles.modalCardLarge : null,
              {
                // Transparent Modals do not consistently apply the native
                // SafeAreaView inset on every iOS version. Keep the header
                // below the status bar explicitly.
                marginTop: Math.max(18, insets.top + 12),
                marginBottom: Math.max(12, insets.bottom + 8),
                backgroundColor: "transparent",
                borderColor: colors.glassBorder,
                borderRadius: colors.radius,
              },
              GLAS_3D_STARK,
            ]}
          >
            <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.glassBgStrong },
              ]}
            />
            <View style={[styles.modalAccent, { backgroundColor: colors.primary }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.glassBorder }]}>
              <View
                style={[
                  styles.modalIcon,
                  {
                    backgroundColor: colors.primary + "18",
                    borderColor: colors.primary + "66",
                  },
                ]}
              >
                <Feather
                  name={activeTile?.icon ?? "triangle"}
                  size={19}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalEyebrow, { color: colors.primary }]}>SAGATRAIL</Text>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {activeTile?.title}
                </Text>
              </View>
              <Pressable
                onPress={closeModal}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                style={[styles.closeButton, { borderColor: colors.glassBorder }]}
              >
                <Feather name="x" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <View
              style={[
                styles.modalContent,
                activeTile?.modalSize === "large" ? styles.modalContentLarge : null,
              ]}
            >
              {activeTile?.content}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  deck: { marginTop: 14 },
  tileRow: { flexDirection: "row", gap: 8 },
  tile: {
    flex: 1,
    minHeight: 78,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
  },
  tileText: { alignItems: "center", justifyContent: "center", minWidth: 0, flex: 1 },
  tileTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.7,
    lineHeight: 13,
    textAlign: "center",
    textTransform: "uppercase",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "rgba(6,10,11,0.72)",
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalCard: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  modalCardLarge: {
    minHeight: "82%",
    maxHeight: "94%",
  },
  modalAccent: { height: 3, width: "100%" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalEyebrow: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1.4 },
  modalTitle: { fontFamily: fonts.titleBold, fontSize: 20, marginTop: 3 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: { width: "100%", paddingHorizontal: 6, paddingBottom: 4 },
  modalContentLarge: { flex: 1 },
});