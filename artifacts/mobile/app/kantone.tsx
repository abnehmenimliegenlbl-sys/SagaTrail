import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { CantonCard } from "@/components/CantonCard";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { Skeleton } from "@/components/brand/Skeleton";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useHomeStrings } from "@/lib/i18n/screens/home";
import { translateCanton } from "@/lib/i18n/cantonNames";
import { LanguageCode } from "@/lib/i18n/languageCode";

const WEB_TOP = 67;

export default function KantoneScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useApp();
  const t = useHomeStrings();
  const { cantons, ready } = useCatalog();
  const [cantonQuery, setCantonQuery] = React.useState("");
  const visibleCantons = React.useMemo(() => {
    const query = cantonQuery.trim().toLocaleLowerCase();
    const filtered = query
      ? cantons.filter((entry) =>
          translateCanton(entry.canton, language as LanguageCode)
            .toLocaleLowerCase()
            .includes(query),
        )
      : cantons;
    return [...filtered].sort((a, b) => a.canton.localeCompare(b.canton, "de"));
  }, [cantonQuery, cantons, language]);
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  return (
    <Background>
      <Stack.Screen options={{ gestureEnabled: true }} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t.cantonsTitle} onBack />
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.glassBg,
              borderColor: colors.glassBorder,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Feather name="search" size={17} color={colors.mutedForeground} />
          <TextInput
            value={cantonQuery}
            onChangeText={setCantonQuery}
            placeholder={t.searchCanton}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            accessibilityLabel={t.searchCanton}
            returnKeyType="search"
          />
          {cantonQuery.length > 0 && (
            <Pressable
              onPress={() => setCantonQuery("")}
              hitSlop={10}
              accessibilityLabel={t.clearSearch}
            >
              <Feather
                name="x-circle"
                size={17}
                color={colors.mutedForeground}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.list}>
          {!ready
            ? [0, 1, 2, 3, 4].map((i) => (
                <Skeleton
                  key={i}
                  height={76}
                  radius={colors.radius}
                  style={{ marginBottom: 12 }}
                />
              ))
            : visibleCantons.map((entry, index) => (
                <CantonCard
                  key={entry.canton}
                  entry={entry}
                  index={index}
                  onPress={() =>
                    router.push(`/kanton/${encodeURIComponent(entry.canton)}`)
                  }
                />
              ))}
        </View>
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 18,
    marginBottom: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingVertical: 10,
  },
  list: {
    paddingBottom: 4,
  },
});