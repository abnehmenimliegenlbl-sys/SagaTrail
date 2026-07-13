import { Feather } from "@expo/vector-icons";
import { getCustomRoute, importGpxRoute, searchPlaces } from "@workspace/api-client-react";
import type { GeocodePlace } from "@workspace/api-client-react";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { alert } from "@/lib/appAlert";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { Glass } from "@/components/brand/Glass";
import { GLAS_3D } from "@/constants/depth";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { HikingRoute } from "@/constants/routes";
import { fonts } from "@/constants/typography";
import { useCatalog } from "@/contexts/CatalogContext";
import { useColors } from "@/hooks/useColors";
import { useCustomRouteStrings } from "@/lib/i18n/screens/customRoute";

const WEB_TOP = 67;
const DEBOUNCE_MS = 350;
const MIN_QUERY_LEN = 3;

interface Point {
  label: string;
  lat: number;
  lng: number;
}

export default function EigeneRoute() {
  const t = useCustomRouteStrings();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addCustomRoute } = useCatalog();

  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [importing, setImporting] = useState(false);

  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  const onSubmit = useCallback(async () => {
    if (!start || !end) {
      alert(t.errorMissingPoints);
      return;
    }
    setSubmitting(true);
    try {
      const route = (await getCustomRoute({
        startLat: start.lat,
        startLng: start.lng,
        endLat: end.lat,
        endLng: end.lng,
        startLabel: start.label,
        endLabel: end.label,
      })) as HikingRoute;
      addCustomRoute(route);
      router.push(`/route/${route.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t.errorGeneric("");
      alert(t.title, t.errorGeneric(message));
    } finally {
      setSubmitting(false);
    }
  }, [start, end, addCustomRoute, router, t]);

  const onImportGpx = useCallback(async () => {
    setImporting(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        // GPX hat je nach App unterschiedliche MIME-Typen; auf iOS greift
        // sonst oft "application/octet-stream" — darum bewusst breit.
        type: ["application/gpx+xml", "application/octet-stream", "text/xml", "application/xml", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];

      let gpx: string;
      try {
        gpx =
          Platform.OS === "web"
            ? await (await fetch(asset.uri)).text()
            : await FileSystem.readAsStringAsync(asset.uri);
      } catch {
        alert(t.title, t.gpxReadErrorLabel);
        return;
      }

      const name = asset.name?.replace(/\.gpx$/i, "").trim() || undefined;
      const route = (await importGpxRoute({ gpx, name })) as HikingRoute;
      addCustomRoute(route);
      router.push(`/route/${route.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const lower = message.toLowerCase();
      if (
        lower.includes("gpx") ||
        lower.includes("waypoint") ||
        lower.includes("track") ||
        lower.includes("xml") ||
        lower.includes("parse") ||
        lower.includes("invalid")
      ) {
        alert(t.title, t.gpxFormatErrorLabel);
      } else {
        alert(t.title, t.errorGeneric(message || t.gpxReadErrorLabel));
      }
    } finally {
      setImporting(false);
    }
  }, [addCustomRoute, router, t]);

  const useLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert(t.locationDeniedLabel);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setStart({
        label: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    } catch {
      alert(t.locationDeniedLabel);
    } finally {
      setLocating(false);
    }
  }, [t]);

  useEffect(() => {
    useLocation();
    // Nur beim ersten Betreten des Screens automatisch versuchen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingHorizontal: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader eyebrow={t.eyebrow} title={t.title} onBack />
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>{t.intro}</Text>

        <PlaceField
          label={t.startLabel}
          placeholder={t.startPlaceholder}
          value={start}
          onSelect={setStart}
          extra={
            <Pressable onPress={useLocation} style={styles.locationRow} hitSlop={8}>
              {locating ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Feather name="crosshair" size={14} color={colors.accent} />
              )}
              <Text style={[styles.locationLabel, { color: colors.accent }]}>
                {locating ? t.locatingLabel : t.useCurrentLocation}
              </Text>
            </Pressable>
          }
        />

        <PlaceField
          label={t.endLabel}
          placeholder={t.endPlaceholder}
          value={end}
          onSelect={setEnd}
        />

        <PrimaryButton
          label={submitting ? t.calculatingLabel : t.submit}
          onPress={onSubmit}
          disabled={!start || !end}
          loading={submitting}
          style={{ marginTop: 28 }}
        />

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>
            {t.gpxDividerLabel}
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.glassBorder }]} />
        </View>

        <Pressable
          onPress={onImportGpx}
          disabled={importing}
          accessibilityRole="button"
          accessibilityLabel={t.gpxImportLabel}
          style={[
            styles.gpxButton,
            GLAS_3D,
            {
              borderColor: colors.accent,
              backgroundColor: colors.glassBgStrong,
              opacity: importing ? 0.6 : 1,
            },
          ]}
        >
          {importing ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Feather name="upload" size={16} color={colors.accent} />
          )}
          <Text style={[styles.gpxButtonLabel, { color: colors.accent }]}>
            {importing ? t.gpxImportingLabel : t.gpxImportLabel}
          </Text>
        </Pressable>
      </ScrollView>
    </Background>
  );
}

function PlaceField({
  label,
  placeholder,
  value,
  onSelect,
  extra,
}: {
  label: string;
  placeholder: string;
  value: Point | null;
  onSelect: (point: Point) => void;
  extra?: React.ReactNode;
}) {
  const t = useCustomRouteStrings();
  const colors = useColors();
  const [query, setQuery] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<GeocodePlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    setQuery(value?.label ?? "");
  }, [value?.label]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!focused || query.trim().length < MIN_QUERY_LEN || query === value?.label) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = ++requestId.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchPlaces({ q: query.trim() });
        if (requestId.current === id) setSuggestions(results);
      } catch {
        if (requestId.current === id) setSuggestions([]);
      } finally {
        if (requestId.current === id) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, focused, value?.label]);

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <Glass style={styles.inputWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
        />
      </Glass>
      {extra}
      {focused && (searching || suggestions.length > 0 || (query.trim().length >= MIN_QUERY_LEN && query !== value?.label)) && (
        <Glass style={styles.suggestions}>
          {searching ? (
            <View style={styles.suggestionRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.suggestionText, { color: colors.mutedForeground }]}>
                {t.searchingLabel}
              </Text>
            </View>
          ) : suggestions.length === 0 ? (
            <Text style={[styles.suggestionText, { color: colors.mutedForeground }]}>
              {t.noResultsLabel}
            </Text>
          ) : (
            suggestions.map((s, i) => (
              <Pressable
                key={`${s.lat}-${s.lng}-${i}`}
                onPress={() => {
                  onSelect({ label: s.label, lat: s.lat, lng: s.lng });
                  setSuggestions([]);
                  setFocused(false);
                }}
                style={[
                  styles.suggestionRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.glassBorder },
                ]}
              >
                <Feather name="map-pin" size={14} color={colors.accent} />
                <Text
                  style={[styles.suggestionText, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))
          )}
        </Glass>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 16, marginBottom: 24 },
  field: { marginBottom: 20 },
  fieldLabel: { fontFamily: fonts.titleBold, fontSize: 14, marginBottom: 8 },
  inputWrap: { paddingVertical: 4 },
  input: { fontFamily: fonts.body, fontSize: 15, minHeight: 40 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, paddingVertical: 4 },
  locationLabel: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.5 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24, marginBottom: 16 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1 },
  gpxButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  gpxButtonLabel: { fontFamily: fonts.titleBold, fontSize: 14 },
  suggestions: { marginTop: 8, padding: 0 },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  suggestionText: { fontFamily: fonts.body, fontSize: 13, flexShrink: 1 },
});
