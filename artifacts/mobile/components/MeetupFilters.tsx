import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import type { MeetupStrings } from "@/lib/i18n/screens/meetups";

export type MeetupFilterState = {
  search: string;
  difficulty: string | undefined;
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
  const searchLabel = strings.search ?? "Suche";
  const searchPlaceholder = strings.searchPlaceholder ?? "Route, Kanton oder Notiz";
  const onlyMineLabel = strings.onlyMine ?? "Nur meine Teilnahmen";
  const difficultyLabel = strings.difficulty ?? "SAC";
  const allLabel = strings.allDifficulties ?? "Alle";

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{searchLabel}</Text>
      <TextInput
        value={value.search}
        onChangeText={(search) => onChange({ ...value, search })}
        placeholder={searchPlaceholder}
        placeholderTextColor={colors.mutedForeground}
        returnKeyType="search"
        style={[
          styles.input,
          { color: colors.foreground, borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
        ]}
      />
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{difficultyLabel}</Text>
        <View style={styles.difficultyOptions}>
          {["", "T1", "T2", "T3", "T4", "T5", "T6"].map((difficulty) => {
            const selected = (value.difficulty ?? "") === difficulty;
            return (
              <Pressable
                key={difficulty || "all"}
                onPress={() => onChange({ ...value, difficulty: difficulty || undefined })}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.chip,
                  {
                    borderColor: selected ? colors.accent : colors.glassBorder,
                    backgroundColor: selected ? colors.accent + "20" : colors.glassBg,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: selected ? colors.accent : colors.foreground }]}>
                  {difficulty || allLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.4, marginBottom: 6 },
  input: { minHeight: 40, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 14 },
  row: { marginTop: 10 },
  difficultyOptions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { minWidth: 38, minHeight: 32, paddingHorizontal: 9, borderWidth: 1, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  chipText: { fontFamily: fonts.mono, fontSize: 10 },
  mineRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  checkmark: { color: "#fff", fontSize: 14, lineHeight: 17, fontWeight: "700" },
  mineText: { fontFamily: fonts.body, fontSize: 13 },
});