import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import type { MeetupStrings } from "@/lib/i18n/screens/meetups";
import type { MeetupSortMode } from "@/lib/meetupSorting";

export function MeetupSortControl({
  mode,
  onChange,
  distanceAvailable,
  strings,
}: {
  mode: MeetupSortMode;
  onChange: (mode: MeetupSortMode) => void;
  distanceAvailable: boolean;
  strings: MeetupStrings;
}) {
  const colors = useColors();

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {strings.sortBy}
      </Text>
      <View style={styles.options}>
        <SortOption
          icon="calendar"
          label={strings.sortDate}
          selected={mode === "date"}
          onPress={() => onChange("date")}
          colors={colors}
        />
        <SortOption
          icon="map-pin"
          label={strings.sortDistance}
          selected={mode === "distance"}
          disabled={!distanceAvailable}
          onPress={() => onChange("distance")}
          colors={colors}
        />
      </View>
    </View>
  );
}

function SortOption({
  icon,
  label,
  selected,
  disabled = false,
  onPress,
  colors,
}: {
  icon: "calendar" | "map-pin";
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[
        styles.option,
        {
          backgroundColor: selected ? colors.accent + "20" : colors.glassBg,
          borderColor: selected ? colors.accent : colors.glassBorder,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text style={[styles.optionText, { color: selected ? colors.accent : colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 10 },
  label: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.4, marginBottom: 6 },
  options: { flexDirection: "row", gap: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 36,
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  optionText: { fontFamily: fonts.bodyBold, fontSize: 11 },
});