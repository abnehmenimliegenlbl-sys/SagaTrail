import { Feather } from "@expo/vector-icons";
import { getThemeRoutes } from "@workspace/api-client-react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { RouteCard } from "@/components/RouteCard";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { fonts } from "@/constants/typography";
import { HikingRoute } from "@/constants/routes";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useColors } from "@/hooks/useColors";
import { translateCanton } from "@/lib/i18n/cantonNames";
import { useThemeWorldStrings } from "@/lib/i18n/screens/themeWorld";
import { LanguageCode } from "@/lib/i18n/languageCode";
import {
  ROUTE_THEME_KEYS,
  routeThemeLabel,
  type RouteThemeKey,
} from "@/lib/routeThemes";

const WEB_TOP = 67;

interface ThemedRoute {
  route: HikingRoute;
  canton: string;
}

export default function ThemenweltRoute() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useApp();
  const { ready, addCustomRoute } = useCatalog();
  const strings = useThemeWorldStrings();
  const { theme: rawTheme } = useLocalSearchParams<{ theme?: string }>();
  const theme = decodeURIComponent(Array.isArray(rawTheme) ? rawTheme[0] ?? "" : rawTheme ?? "") as RouteThemeKey;
  const validTheme = ROUTE_THEME_KEYS.includes(theme);
  const themeLabel = validTheme ? routeThemeLabel(theme, language) : "";
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  const [matches, setMatches] = useState<ThemedRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(0);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!ready || !validTheme) return;
    let cancelled = false;
    setLoading(true);
    setMatches([]);
    setChecked(0);
    setTotal(0);
    setLoadError(false);

    getThemeRoutes(theme)
      .then((routes) => {
        if (cancelled) return;
        const themedRoutes = (routes as HikingRoute[]).map((route) => ({
          route,
          canton: route.canton ?? route.region,
        }));
        setTotal(themedRoutes.length);
        setChecked(themedRoutes.length);
        setMatches(themedRoutes);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, theme, validTheme]);

  const groupedMatches = useMemo(() => {
    const groups = new Map<string, ThemedRoute[]>();
    for (const match of matches) {
      const current = groups.get(match.canton) ?? [];
      current.push(match);
      groups.set(match.canton, current);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "de"));
  }, [matches]);

  if (!validTheme) {
    return (
      <Background>
        <Stack.Screen options={{ gestureEnabled: false }} />
        <View style={[styles.invalid, { paddingTop: topPad }]}>
          <ScreenHeader eyebrow={strings.eyebrow} title={strings.noRoutes} onBack />
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <Stack.Screen options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow={strings.eyebrow} title={themeLabel} onBack />
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {strings.intro(themeLabel)}
        </Text>

        {loading && (
          <View style={[styles.progressCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <Feather name="search" size={18} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.progressTitle, { color: colors.foreground }]}>
                {strings.loading}
              </Text>
              <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                {total > 0 ? strings.loadingProgress(checked, total) : strings.loading}
              </Text>
            </View>
          </View>
        )}

        {loadError && !loading && (
          <Text style={[styles.status, { color: colors.destructive }]}>
            {strings.loadError}
          </Text>
        )}

        {!loading && matches.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="tag" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{strings.noRoutes}</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
              {strings.routesFound(matches.length)}
            </Text>
            {groupedMatches.map(([canton, cantonRoutes]) => (
              <View key={canton} style={styles.cantonGroup}>
                <View style={styles.cantonHeading}>
                  <Feather name="map-pin" size={14} color={colors.accent} />
                  <Text style={[styles.cantonTitle, { color: colors.foreground }]}>
                    {translateCanton(canton, language as LanguageCode)}
                  </Text>
                  <Text style={[styles.cantonMeta, { color: colors.mutedForeground }]}>
                    {strings.startCanton}
                  </Text>
                </View>
                {cantonRoutes.map(({ route }, index) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    index={index}
                    locked={false}
                    onPress={() => {
                      addCustomRoute(route);
                      router.push(`/route/${route.id}`);
                    }}
                    kanton={canton}
                  />
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  invalid: { flex: 1, paddingHorizontal: 20 },
  intro: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 4, marginBottom: 18 },
  progressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
  },
  progressTitle: { fontFamily: fonts.bodyBold, fontSize: 14 },
  progressText: { fontFamily: fonts.body, fontSize: 12, marginTop: 3 },
  status: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  resultCount: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.5, marginTop: 8, marginBottom: 8 },
  cantonGroup: { marginTop: 14 },
  cantonHeading: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  cantonTitle: { fontFamily: fonts.titleBold, fontSize: 19 },
  cantonMeta: { fontFamily: fonts.mono, fontSize: 10, marginLeft: "auto", textTransform: "uppercase" },
  empty: { alignItems: "center", gap: 12, paddingVertical: 50 },
  emptyTitle: { fontFamily: fonts.titleBold, fontSize: 18, textAlign: "center" },
});