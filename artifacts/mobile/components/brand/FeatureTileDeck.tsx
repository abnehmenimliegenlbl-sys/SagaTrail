import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GLAS_3D } from "@/constants/depth";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

export interface FeatureTile {
  id: string;
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  content: React.ReactNode;
}

interface Props {
  tiles: FeatureTile[];
  initialActiveId?: string;
}

export function FeatureTileDeck({ tiles, initialActiveId }: Props) {
  const colors = useColors();
  const [activeId, setActiveId] = useState(initialActiveId ?? tiles[0]?.id ?? null);
  const activeTile = tiles.find((tile) => tile.id === activeId);

  const selectTile = (id: string) => {
    if (id === activeId) return;
    if (Platform.OS !== "web") {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setActiveId(id);
  };

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

      {activeTile ? <View style={styles.expanded}>{activeTile.content}</View> : null}
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
  expanded: { width: "100%" },
});