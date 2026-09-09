import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useState } from "react";
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
import { CloseButton } from "@/components/brand/CloseButton";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface FeatureTile {
  id: string;
  title: string;
  subtitle?: string;
  highlightSubtitle?: boolean;
  icon: React.ComponentProps<typeof Feather>["name"];
  content: React.ReactNode;
  preview?: React.ReactNode;
  modalSize?: "large";
  action?: boolean;
}

interface Props {
  tiles: FeatureTile[];
  tileOrder?: readonly string[];
  columns?: 3 | 4;
  closeLabel?: string;
  onTileOpen?: (tileId: string) => void;
  closeSignal?: number;
}

export function FeatureTileDeck({
  tiles,
  tileOrder,
  columns = 3,
  closeLabel = "Schliessen",
  onTileOpen,
  closeSignal = 0,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTile = tiles.find((tile) => tile.id === activeId);
  const orderedTiles = tileOrder
    ? [
        ...tileOrder
          .map((id) => tiles.find((tile) => tile.id === id))
          .filter((tile): tile is FeatureTile => tile != null),
        ...tiles.filter((tile) => !tileOrder.includes(tile.id)),
      ]
    : tiles;

  useEffect(() => {
    if (closeSignal > 0) setActiveId(null);
  }, [closeSignal]);

  const selectTile = (id: string) => {
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    const tile = tiles.find((candidate) => candidate.id === id);
    if (!tile?.action) setActiveId(id);
    onTileOpen?.(id);
  };

  const closeModal = () => setActiveId(null);

  return (
    <View style={styles.deck}>
      <View style={styles.tileRow}>
        {orderedTiles.map((tile) => {
          const selected = tile.id === activeId;
          return (
            <Pressable
              key={tile.id}
              accessibilityRole="button"
              accessibilityState={{ expanded: selected }}
              accessibilityLabel={[tile.title, tile.subtitle].filter(Boolean).join(", ")}
              onPress={() => selectTile(tile.id)}
              style={({ pressed }) => [
                styles.tile,
                columns === 4 && styles.tileFour,
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
                {tile.subtitle ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.tileSubtitle,
                      {
                        color: tile.highlightSubtitle
                          ? colors.destructive
                          : selected
                            ? colors.primary
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {tile.subtitle}
                  </Text>
                ) : null}
                {tile.preview}
              </View>
              {tile.action ? (
                <Feather
                  name="chevron-right"
                  size={14}
                  color={colors.mutedForeground}
                />
              ) : (
                <Feather
                  name={selected ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={selected ? colors.primary : colors.mutedForeground}
                />
              )}
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
              <CloseButton accessibilityLabel={closeLabel} onPress={closeModal} />
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
  tileRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    gap: 8,
  },
  tile: {
    width: "31.5%",
    height: 72,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
  },
  tileFour: { width: "23%" },
  tileText: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    minHeight: 34,
    flex: 1,
  },
  tileTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.7,
    lineHeight: 13,
    textAlign: "center",
    textTransform: "uppercase",
  },
  tileSubtitle: {
    marginTop: 2,
    fontFamily: fonts.monoBold,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "rgba(6,10,11,0.72)",
  },
  modalBackdrop: { ...StyleSheet.absoluteFill },
  modalCard: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  modalCardLarge: {
    flex: 1,
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
  modalContent: { width: "100%", paddingHorizontal: 6, paddingBottom: 4 },
  modalContentLarge: { flex: 1 },
});