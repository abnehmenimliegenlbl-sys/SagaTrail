import React from "react";
import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import type { MeetupStrings } from "@/lib/i18n/screens/meetups";

export type MeetupFilterState = {
  search: string;
  onlyMine: boolean;
};

export function MeetupFilters({
  value,
  onChange,
  strings,
}: {
  value: MeetupFilterState;
  onChange: (value: MeetupFilterState) => void;
  strings: MeetupStrings;
}) {
  const colors = useColors();
  const searchLabel = strings.search;
  const searchPlaceholder = strings.searchPlaceholder;
  const onlyMineLabel = strings.onlyMine;
  const hasActiveFilters = Boolean(value.search.trim() || value.onlyMine);
  const resetLabel = strings.resetFilters;

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{searchLabel}</Text>
      <View style={[styles.inputWrap, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}>
        <Feather name="search" size={15} color={colors.mutedForeground} />
        <TextInput
          value={value.search}
          onChangeText={(search) => onChange({ ...value, search })}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="search"
          style={[styles.input, { color: colors.foreground }]}
        />
        {value.search ? (
          <Pressable
            onPress={() => onChange({ ...value, search: "" })}
            accessibilityRole="button"
            accessibilityLabel={resetLabel}
            hitSlop={8}
          >
            <Feather name="x-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={() => onChange({ ...value, onlyMine: !value.onlyMine })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value.onlyMine }}
        style={styles.mineRow}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: value.onlyMine ? colors.accent : colors.glassBorder,
              backgroundColor: value.onlyMine ? colors.accent : colors.glassBg,
            },
          ]}
        >
          {value.onlyMine ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={[styles.mineText, { color: colors.foreground }]}>{onlyMineLabel}</Text>
      </Pressable>
      {hasActiveFilters ? (
        <Pressable
          onPress={() => onChange({ search: "", onlyMine: false })}
          accessibilityRole="button"
          accessibilityLabel={resetLabel}
          style={[styles.resetButton, { borderColor: colors.glassBorder }]}
        >
          <Feather name="rotate-ccw" size={13} color={colors.accent} />
          <Text style={[styles.resetText, { color: colors.accent }]}>{resetLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.4, marginBottom: 6 },
  inputWrap: { minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, minHeight: 40, fontFamily: fonts.body, fontSize: 14, paddingVertical: 0 },
  mineRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  checkmark: { color: "#fff", fontSize: 14, lineHeight: 17, fontWeight: "700" },
  mineText: { fontFamily: fonts.body, fontSize: 13 },
  resetButton: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingHorizontal: 10, paddingVertical: 7 },
  resetText: { fontFamily: fonts.bodyBold, fontSize: 11 },
});