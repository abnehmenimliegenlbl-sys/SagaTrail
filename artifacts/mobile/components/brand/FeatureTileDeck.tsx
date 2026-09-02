import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GLAS_3D } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface FeatureTile {
  id: string;
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  content: React.ReactNode;
}

interface Props {
  tiles: FeatureTile[];
  closeLabel?: string;
}

export function FeatureTileDeck({ tiles, closeLabel = "Schliessen" }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTile = tiles.find((tile) => tile.id === activeId);

  const selectTile = (id: string) => {
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setActiveId(id);
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
              <Text
                numberOfLines={2}
                style={[
                  styles.tileTitle,
                  { color: selected ? colors.primary : colors.foreground },
                ]}
              >
                {tile.title}
              </Text>
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
          <SafeAreaView
            style={[
              styles.modalCard,
              {
                marginTop: Math.max(18, insets.top),
                marginBottom: Math.max(12, insets.bottom),
                backgroundColor: colors.background,
                borderColor: colors.glassBorder,
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={styles.modalHeader}>
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
            <View style={styles.modalContent}>{activeTile?.content}</View>
          </SafeAreaView>
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
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
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
});