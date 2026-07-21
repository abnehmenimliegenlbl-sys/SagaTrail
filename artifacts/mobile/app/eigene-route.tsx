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
  Dimensions,
  Modal,
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
import { SwisstopoMap } from "@/components/brand/SwisstopoMap";
import { HikingRoute } from "@/constants/routes";
import { fonts } from "@/constants/typography";
import { useCatalog } from "@/contexts/CatalogContext";
import { useColors } from "@/hooks/useColors";
import { useCustomRouteStrings } from "@/lib/i18n/screens/customRoute";

const WEB_TOP = 67;
const DEBOUNCE_MS = 350;
const MIN_QUERY_LEN = 3;

function reverseGpxTrack(gpx: string): string {
  // Trkpt-Tags in umgekehrter Reihenfolge zurückgeben.
  const trkptRe = /<trkpt[\s\S]*?<\/trkpt>/g;
  const matches = gpx.match(trkptRe);
  if (!matches || matches.length === 0) return gpx;
  let result = gpx;
  const combined = matches.join("");
  const reversedCombined = [...matches].reverse().join("");
  result = result.replace(combined, reversedCombined);
  return result;
}

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
  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | null>(null);
  const [pickerPending, setPickerPending] = useState<{ lat: number; lng: number } | null>(null);
  const [pickerCenter, setPickerCenter] = useState<{ lat: number; lng: number }>({ lat: 46.9479, lng: 7.4446 });
  const [pickerMapHeight, setPickerMapHeight] = useState(0);
  const [reversing, setReversing] = useState(false);
  const [pendingGpx, setPendingGpx] = useState<{ gpx: string; name?: string; reversed: boolean } | null>(null);

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
      // Nicht sofort importieren — Benutzer soll zuerst "Strecke umdrehen" wählen können.
      setPendingGpx({ gpx, name, reversed: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      alert(t.title, t.errorGeneric(message || t.gpxReadErrorLabel));
    } finally {
      setImporting(false);
    }
  }, [t]);

  const onConfirmGpxImport = useCallback(async () => {
    if (!pendingGpx) return;
    setImporting(true);
    try {
      const gpxToSend = pendingGpx.reversed
        ? reverseGpxTrack(pendingGpx.gpx)
        : pendingGpx.gpx;
      const route = (await importGpxRoute({ gpx: gpxToSend, name: pendingGpx.name })) as HikingRoute;
      addCustomRoute(route);
      setPendingGpx(null);
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
  }, [pendingGpx, addCustomRoute, router, t]);

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

  const openPicker = useCallback(
    (target: "start" | "end") => {
      const center =
        target === "start"
          ? { lat: start?.lat ?? end?.lat ?? 46.9479, lng: start?.lng ?? end?.lng ?? 7.4446 }
          : { lat: end?.lat ?? start?.lat ?? 46.9479, lng: end?.lng ?? start?.lng ?? 7.4446 };
      setPickerCenter(center);
      setPickerPending(null);
      setPickerTarget(target);
    },
    [start, end]
  );

  const onPickerConfirm = useCallback(async () => {
    if (!pickerPending || !pickerTarget) return;
    setReversing(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${pickerPending.lat}&lon=${pickerPending.lng}&format=json&accept-language=de&zoom=16`,
        { headers: { "User-Agent": "SagaTrail/1.0" } }
      );
      const data: { display_name?: string } = await res.json();
      const label = data?.display_name ?? `${pickerPending.lat.toFixed(5)}, ${pickerPending.lng.toFixed(5)}`;
      const point = { label, ...pickerPending };
      if (pickerTarget === "start") setStart(point);
      else setEnd(point);
    } catch {
      const label = `${pickerPending.lat.toFixed(5)}, ${pickerPending.lng.toFixed(5)}`;
      const point = { label, ...pickerPending };
      if (pickerTarget === "start") setStart(point);
      else setEnd(point);
    } finally {
      setReversing(false);
      setPickerTarget(null);
      setPickerPending(null);
    }
  }, [pickerPending, pickerTarget]);

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
          onClear={() => setStart(null)}
          extra={
            <View style={styles.locationButtons}>
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
              <Pressable onPress={() => openPicker("start")} style={styles.locationRow} hitSlop={8}>
                <Feather name="map" size={14} color={colors.accent} />
                <Text style={[styles.locationLabel, { color: colors.accent }]}>
                  {t.pickOnMapLabel}
                </Text>
              </Pressable>
            </View>
          }
        />

        {/* ── Tausch-Button ── */}
        <Pressable
          onPress={() => {
            const tmp = start;
            setStart(end);
            setEnd(tmp);
          }}
          disabled={!start && !end}
          hitSlop={8}
          style={[styles.swapButton, { opacity: start || end ? 1 : 0.3 }]}
        >
          <Feather name="repeat" size={18} color={colors.accent} />
        </Pressable>

        <PlaceField
          label={t.endLabel}
          placeholder={t.endPlaceholder}
          value={end}
          onSelect={setEnd}
          onClear={() => setEnd(null)}
          extra={
            <Pressable onPress={() => openPicker("end")} style={styles.locationRow} hitSlop={8}>
              <Feather name="map" size={14} color={colors.accent} />
              <Text style={[styles.locationLabel, { color: colors.accent }]}>
                {t.pickOnMapLabel}
              </Text>
            </Pressable>
          }
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

        {pendingGpx ? (
          /* ── Bestätigungskarte nach GPX-Auswahl ── */
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              styles.gpxPendingCard,
              GLAS_3D,
              { borderColor: colors.accent, backgroundColor: colors.glassBgStrong },
            ]}
          >
            <View style={styles.gpxPendingHeader}>
              <Feather name="check-circle" size={16} color={colors.accent} />
              <Text style={[styles.gpxPendingTitle, { color: colors.foreground }]}>
                {pendingGpx.name ?? t.gpxReadyLabel}
              </Text>
            </View>

            {/* Strecke umdrehen */}
            <Pressable
              onPress={() => setPendingGpx((p) => p ? { ...p, reversed: !p.reversed } : p)}
              style={[styles.gpxReverseRow, { borderTopColor: colors.glassBorder }]}
              hitSlop={8}
            >
              <Feather
                name="repeat"
                size={16}
                color={pendingGpx.reversed ? colors.foreground : colors.accent}
              />
              <Text style={[
                styles.gpxReverseLabel,
                { color: pendingGpx.reversed ? colors.foreground : colors.accent },
              ]}>
                {pendingGpx.reversed ? t.gpxReversedLabel : t.gpxReverseLabel}
              </Text>
              {pendingGpx.reversed && (
                <Feather name="check" size={14} color={colors.foreground} style={{ marginLeft: "auto" }} />
              )}
            </Pressable>

            {/* Buttons */}
            <View style={styles.gpxPendingActions}>
              <Pressable
                onPress={() => setPendingGpx(null)}
                style={[styles.gpxCancelBtn, { borderColor: colors.glassBorder }]}
                hitSlop={8}
              >
                <Text style={[styles.gpxCancelLabel, { color: colors.mutedForeground }]}>
                  {t.gpxCancelLabel}
                </Text>
              </Pressable>
              <PrimaryButton
                label={importing ? t.gpxImportingLabel : t.gpxConfirmLabel}
                onPress={onConfirmGpxImport}
                disabled={importing}
                loading={importing}
                style={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        ) : (
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
        )}
      </ScrollView>

      {/* ── Karten-Picker-Modal ─────────────────────────────────────── */}
      <Modal
        visible={pickerTarget !== null}
        onRequestClose={() => setPickerTarget(null)}
        animationType="slide"
        statusBarTranslucent
      >
        <Background>
          <View style={{ flex: 1, paddingTop: topPad }}>
            {/* Header */}
            <View style={[styles.pickerHeader, { paddingHorizontal: 20 }]}>
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
                {t.pickerTitle}
              </Text>
              <Pressable onPress={() => setPickerTarget(null)} hitSlop={12}>
                <Feather name="x" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <Text style={[styles.pickerHint, { color: colors.mutedForeground, paddingHorizontal: 20 }]}>
              {t.pickerHint}
            </Text>
            {/* Karte */}
            <View
              style={styles.pickerMapWrap}
              onLayout={(e) => setPickerMapHeight(e.nativeEvent.layout.height)}
            >
              {pickerMapHeight > 0 && (
                <SwisstopoMap
                  center={pickerCenter}
                  height={pickerMapHeight}
                  pickerMode
                  onMapClick={(lat, lng) => setPickerPending({ lat, lng })}
                />
              )}
            </View>
            {/* Bestätigungs-Button */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
              <PrimaryButton
                label={reversing ? "…" : t.pickerConfirm}
                onPress={onPickerConfirm}
                disabled={!pickerPending || reversing}
                loading={reversing}
              />
            </View>
          </View>
        </Background>
      </Modal>
    </Background>
  );
}

function PlaceField({
  label,
  placeholder,
  value,
  onSelect,
  onClear,
  extra,
}: {
  label: string;
  placeholder: string;
  value: Point | null;
  onSelect: (point: Point) => void;
  onClear?: () => void;
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
      <View style={styles.fieldHeader}>
        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
        {value && onClear && (
          <Pressable
            onPress={() => {
              onClear();
              setQuery("");
              setSuggestions([]);
            }}
            hitSlop={8}
            style={styles.clearBtn}
          >
            <Feather name="x-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>
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
  fieldHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  fieldLabel: { fontFamily: fonts.titleBold, fontSize: 14 },
  clearBtn: { padding: 2 },
  swapButton: {
    alignSelf: "center",
    marginVertical: -8,
    padding: 10,
    zIndex: 1,
  },
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
  gpxPendingCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  gpxPendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  gpxPendingTitle: {
    fontFamily: fonts.titleBold,
    fontSize: 14,
    flexShrink: 1,
  },
  gpxReverseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  gpxReverseLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    flex: 1,
  },
  gpxPendingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  gpxCancelBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  gpxCancelLabel: {
    fontFamily: fonts.titleBold,
    fontSize: 14,
  },
  suggestions: { marginTop: 8, padding: 0 },
  suggestionRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  suggestionText: { fontFamily: fonts.body, fontSize: 13, flexShrink: 1 },
  locationButtons: { gap: 2 },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pickerTitle: { fontFamily: fonts.titleBold, fontSize: 18 },
  pickerHint: { fontFamily: fonts.body, fontSize: 13, marginBottom: 12 },
  pickerMapWrap: { flex: 1, marginHorizontal: 16, marginBottom: 16, borderRadius: 12, overflow: "hidden" },
});
