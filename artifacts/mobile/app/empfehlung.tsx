import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  getRouteConditions,
  getTransportStationboard,
  getWeather,
  searchPlaces,
  type GeocodePlace,
  type TrailConditionReport,
  type TransportStationboard,
  type WeatherReport,
} from "@workspace/api-client-react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { CANTONS } from "@/constants/onboarding";
import { GLAS_3D } from "@/constants/depth";
import type { HikingRoute } from "@/constants/routes";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useColors } from "@/hooks/useColors";
import { getApiBaseUrl } from "@/lib/apiConfig";
import type { LatLng } from "@/types";
import {
  rankRoutes,
  routeRecommendationFilters,
  type RecommendationCompanion,
  type RecommendationFitness,
  type RecommendationPreferences,
  type RecommendationSignals,
  type RecommendationTravel,
  type ScoredRoute,
} from "@/lib/routeRecommendation";
import {
  ROUTE_THEME_KEYS,
  routeThemeLabel,
  type RouteThemeKey,
} from "@/lib/routeThemes";
import {
  getRouteThemesFromPois,
  hasServerThemeEvidence,
  loadThemePoisForRoutes,
  routeThemeCache,
} from "@/lib/routeThemeIndex";
import { routePathWithCommunity } from "@/lib/meetupNavigation";
import { useRecommendationStrings as useLocalizedRecommendationStrings } from "@/lib/i18n/screens/empfehlung";

const WEB_TOP = 67;
const INTERESTS: RouteThemeKey[] = [
  "wasserwege",
  "burgen_ruinen_alte_wege",
  "familien_entdecker",
  "gipfel_panorama",
  "wald_wildtiere",
];

type Copy = {
  eyebrow: string;
  title: string;
  intro: string;
  locationScope: string;
  allCantons: string;
  time: string;
  fitness: string;
  companion: string;
  travel: string;
  returnConnection: string;
  nearbySearch: string;
  nearbyLocating: string;
  nearbyDenied: string;
  nearbyMode: string;
  manualMode: string;
  manualHint: string;
  placeOptional: string;
  placePlaceholder: string;
  placeSearching: string;
  placeNoResults: string;
  placeSelected: (place: string) => string;
  locationGroup: string;
  profileGroup: string;
  travelGroup: string;
  interestsGroup: string;
  interests: string;
  find: string;
  searching: string;
  noRoutes: string;
  error: string;
  bestMatch: string;
  why: string;
  themeArea: string;
  noThemeEvidence: string;
  noThemeMatch: string;
  alternatives: string;
  open: string;
  weather: string;
  conditions: string;
  transit: string;
  parking: string;
  dataUnavailable: {
    weather: string;
    conditions: string;
    transit: string;
    parking: string;
  };
  values: {
    time: Record<number, string>;
    fitness: Record<RecommendationFitness, string>;
    companion: Record<RecommendationCompanion, string>;
    travel: Record<RecommendationTravel, string>;
  };
  reason: Record<string, (route: ScoredRoute) => string>;
  caution: Record<string, string>;
};

function signalLabel(
  signals: RecommendationSignals,
  preferences: RecommendationPreferences,
  copy: Copy,
): string[] {
  const labels: string[] = [];
  if (signals.weather?.trailConditionLevel) {
    labels.push(`${copy.weather}: ${signals.weather.trailConditionLevel}`);
  } else labels.push(copy.dataUnavailable.weather);
  const latest = signals.conditions?.[0];
  if (latest) {
    labels.push(`${copy.conditions}: ${latest.condition}`);
  } else {
    labels.push(copy.dataUnavailable.conditions);
  }
  if (preferences.travel === "publicTransport") {
    if (signals.returnTransport?.station) {
      labels.push(
        `${copy.transit}: ${signals.returnTransport.departures.length}`,
      );
    } else if (signals.startTransport?.station) {
      labels.push(copy.dataUnavailable.transit);
    } else {
      labels.push(copy.dataUnavailable.transit);
    }
  }
  if (signals.parkingAvailable != null) {
    labels.push(
        `${copy.parking}: ${signals.parkingAvailable ? "✓" : "—"}`,
    );
  } else if (preferences.travel === "car") {
    labels.push(copy.dataUnavailable.parking);
  }
  return labels;
}

export default function Empfehlung() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ communityId?: string }>();
  const communityId = Array.isArray(params.communityId)
    ? params.communityId[0]
    : params.communityId;
  const { language } = useApp();
  const { loadCantonRoutes } = useCatalog();
  const copy = useLocalizedRecommendationStrings();
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  const [timeBudgetMin, setTimeBudgetMin] = useState(180);
  const [fitness, setFitness] = useState<RecommendationFitness>("moderate");
  const [companion, setCompanion] = useState<RecommendationCompanion>("solo");
  const [travel, setTravel] = useState<RecommendationTravel>("publicTransport");
  const [needsReturnConnection, setNeedsReturnConnection] = useState(true);
  const [nearbyPosition, setNearbyPosition] = useState<LatLng | null>(null);
  const [nearbySearch, setNearbySearch] = useState(true);
  const [nearbyLocating, setNearbyLocating] = useState(false);
  const [nearbyDenied, setNearbyDenied] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<GeocodePlace | null>(null);
  const [placeSuggestions, setPlaceSuggestions] = useState<GeocodePlace[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const placeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeRequestId = useRef(0);
  const [interests, setInterests] = useState<RouteThemeKey[]>(["wasserwege"]);
  const [recommendations, setRecommendations] = useState<ScoredRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searched, setSearched] = useState(false);
  const [noThemeMatch, setNoThemeMatch] = useState(false);

  const preferences = useMemo<RecommendationPreferences>(
    () => ({
      timeBudgetMin,
      fitness,
      companion,
      travel,
      needsReturnConnection:
        travel === "publicTransport" && needsReturnConnection,
      interests,
      nearby: nearbyPosition,
    }),
    [
      companion,
      fitness,
      interests,
      nearbyPosition,
      needsReturnConnection,
      timeBudgetMin,
      travel,
    ],
  );

  const locateNearby = useCallback(async (): Promise<void> => {
    setNearbyLocating(true);
    setNearbyDenied(false);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setNearbyPosition(null);
        setNearbySearch(false);
        setNearbyDenied(true);
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setNearbyPosition({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setNearbySearch(true);
    } catch {
      setNearbyPosition(null);
      setNearbySearch(false);
      setNearbyDenied(true);
    } finally {
      setNearbyLocating(false);
    }
  }, []);

  useEffect(() => {
    void locateNearby();
  }, [locateNearby]);

  useEffect(() => {
    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
    if (nearbySearch || placeQuery.trim().length < 2) {
      setPlaceSuggestions([]);
      setPlaceSearching(false);
      return;
    }
    const requestId = ++placeRequestId.current;
    setPlaceSearching(true);
    placeDebounceRef.current = setTimeout(() => {
      void searchPlaces({ q: placeQuery.trim() })
        .then((results) => {
          if (placeRequestId.current === requestId)
            setPlaceSuggestions(results);
        })
        .catch(() => {
          if (placeRequestId.current === requestId) setPlaceSuggestions([]);
        })
        .finally(() => {
          if (placeRequestId.current === requestId) setPlaceSearching(false);
        });
    }, 350);
    return () => {
      if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current);
    };
  }, [nearbySearch, placeQuery]);

  const selectManualSearch = () => {
    setNearbySearch(false);
    setNearbyPosition(null);
    setNearbyDenied(false);
  };

  const selectNearbySearch = async () => {
    setSelectedPlace(null);
    setPlaceQuery("");
    setPlaceSuggestions([]);
    await locateNearby();
  };

  const findRecommendation = async () => {
    setLoading(true);
    setError(false);
    setSearched(true);
    setNoThemeMatch(false);
    setRecommendations([]);
    try {
      const routeFilter = routeRecommendationFilters(preferences);
      const cantons = [...CANTONS];
      const routeResults: HikingRoute[] = [];
      let cursor = 0;
      const loadNextCanton = async (): Promise<void> => {
        const nextCanton = cantons[cursor++];
        if (!nextCanton) return;
        const result = await loadCantonRoutes(nextCanton, routeFilter);
        routeResults.push(...result.routes);
        await loadNextCanton();
      };
      await Promise.all(
        Array.from({ length: Math.min(4, cantons.length) }, () =>
          loadNextCanton(),
        ),
      );
      const serverThemeMatches =
        preferences.interests.length > 0
          ? routeResults.filter(
              (route) =>
                hasServerThemeEvidence(route) &&
                (route.themeKeys ?? []).some((theme) =>
                  preferences.interests.includes(theme as RouteThemeKey),
                ),
            )
          : [];
      const candidateRoutes =
        serverThemeMatches.length > 0
          ? serverThemeMatches
          : rankRoutes(routeResults, {
                ...preferences,
                interests: [],
              })
              .slice(0, 24)
              .map(({ route }) => route);
      let themePois: Awaited<ReturnType<typeof loadThemePoisForRoutes>> = [];
      try {
        const routesNeedingThemePois = candidateRoutes.filter(
          (route) =>
            !hasServerThemeEvidence(route) && !routeThemeCache.has(route.id),
        );
        if (routesNeedingThemePois.length > 0) {
          themePois = await loadThemePoisForRoutes(routesNeedingThemePois);
        }
      } catch {
        // A missing live POI response must not block the recommendation.
        // The route remains honest about having no locally available evidence.
      }
      const enrichedRoutes = candidateRoutes.map((route) => ({
        ...route,
        themeKeys: getRouteThemesFromPois(route, themePois),
      }));
      const themeMatchedRoutes =
        preferences.interests.length > 0
          ? enrichedRoutes.filter((route) =>
              (route.themeKeys ?? []).some((theme) =>
                preferences.interests.includes(theme as RouteThemeKey),
              ),
            )
          : enrichedRoutes;
      if (preferences.interests.length > 0 && themeMatchedRoutes.length === 0) {
        setNoThemeMatch(true);
        return;
      }
      const base = rankRoutes(themeMatchedRoutes, preferences).slice(0, 8);
      const signalsByRoute = new Map<string, RecommendationSignals>();
      await Promise.all(
        base.map(async ({ route }) => {
          const signals: RecommendationSignals = {};
          const [weather, conditions] = await Promise.allSettled([
            getWeather({
              lat: route.coordinates.lat,
              lng: route.coordinates.lng,
            }),
            getRouteConditions(route.id),
          ]);
          if (weather.status === "fulfilled")
            signals.weather = weather.value as WeatherReport;
          if (conditions.status === "fulfilled") {
            signals.conditions = conditions.value as TrailConditionReport[];
          }

          if (travel === "publicTransport") {
            const [startTransport, returnTransport] = await Promise.allSettled([
              getTransportStationboard({
                lat: route.coordinates.lat,
                lng: route.coordinates.lng,
              }),
              getTransportStationboard({
                lat: route.geometry?.at(-1)?.[0] ?? route.coordinates.lat,
                lng: route.geometry?.at(-1)?.[1] ?? route.coordinates.lng,
              }),
            ]);
            if (startTransport.status === "fulfilled") {
              signals.startTransport =
                startTransport.value as TransportStationboard;
            }
            if (returnTransport.status === "fulfilled") {
              signals.returnTransport =
                returnTransport.value as TransportStationboard;
            }
          } else if (travel === "car") {
            try {
              const endpoint = route.geometry?.[0] ?? [
                route.coordinates.lat,
                route.coordinates.lng,
              ];
              const response = await fetch(
                `${getApiBaseUrl() ?? ""}/api/parking?lat=${endpoint[0]}&lng=${endpoint[1]}&radius=800`,
              );
              const parking = (await response.json()) as unknown;
              signals.parkingAvailable =
                Array.isArray(parking) && parking.length > 0;
            } catch {
              signals.parkingAvailable = null;
            }
          }
          signalsByRoute.set(route.id, signals);
        }),
      );
      setRecommendations(
        rankRoutes(
          base.map(({ route }) => route),
          preferences,
          signalsByRoute,
        ),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const selected = recommendations[0];
  const reasonLines = selected
    ? selected.reasons
        .map((reason) => copy.reason[reason]?.(selected))
        .filter((value): value is string => Boolean(value))
    : [];
  const cautionLines = selected
    ? selected.cautions.map((caution) => copy.caution[caution]).filter(Boolean)
    : [];
  const selectedThemeKeys = selected
    ? (selected.route.themeKeys ?? []).filter(
        (theme): theme is RouteThemeKey =>
          ROUTE_THEME_KEYS.includes(theme as RouteThemeKey),
      )
    : [];

  const toggleInterest = (theme: RouteThemeKey) => {
    setInterests((current) =>
      current.includes(theme)
        ? current.filter((item) => item !== theme)
        : [...current, theme],
    );
  };

  return (
    <Background>
      <Stack.Screen
        options={{ gestureEnabled: false, fullScreenGestureEnabled: false }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow={copy.eyebrow} title={copy.title} onBack />
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {copy.intro}
        </Text>
        <PreferenceGroup
          icon="map-pin"
          title={copy.locationGroup}
          colors={colors}
        >
          <View style={styles.locationModeRow}>
            <Pressable
              onPress={() => void selectNearbySearch()}
              style={[
                styles.locationModeOption,
                {
                  backgroundColor: nearbySearch
                    ? colors.accent + "14"
                    : colors.glassBg,
                  borderColor: nearbySearch
                    ? colors.accent
                    : colors.glassBorder,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{
                selected: nearbySearch,
                disabled: nearbyLocating,
              }}
              disabled={nearbyLocating}
            >
              <Feather
                name={nearbyLocating ? "loader" : "navigation"}
                size={16}
                color={nearbySearch ? colors.accent : colors.mutedForeground}
              />
              <View style={styles.locationModeText}>
                <Text
                  style={[
                    styles.locationModeLabel,
                    { color: colors.foreground },
                  ]}
                >
                  {copy.nearbyMode}
                </Text>
                <Text
                  style={[
                    styles.locationModeHint,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {nearbyLocating ? copy.nearbyLocating : copy.nearbySearch}
                </Text>
              </View>
              {nearbySearch && (
                <Feather name="check-circle" size={16} color={colors.accent} />
              )}
            </Pressable>
            <Pressable
              onPress={selectManualSearch}
              style={[
                styles.locationModeOption,
                {
                  backgroundColor: !nearbySearch
                    ? colors.accent + "14"
                    : colors.glassBg,
                  borderColor: !nearbySearch
                    ? colors.accent
                    : colors.glassBorder,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: !nearbySearch }}
            >
              <Feather
                name="search"
                size={16}
                color={!nearbySearch ? colors.accent : colors.mutedForeground}
              />
              <View style={styles.locationModeText}>
                <Text
                  style={[
                    styles.locationModeLabel,
                    { color: colors.foreground },
                  ]}
                >
                  {copy.manualMode}
                </Text>
                <Text
                  style={[
                    styles.locationModeHint,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {copy.manualHint}
                </Text>
              </View>
              {!nearbySearch && (
                <Feather name="check-circle" size={16} color={colors.accent} />
              )}
            </Pressable>
          </View>
          {nearbySearch ? (
            <View
              style={[
                styles.locationStatus,
                {
                  borderColor: colors.accent + "55",
                  backgroundColor: colors.accent + "0C",
                },
              ]}
            >
              <Feather name="map-pin" size={15} color={colors.accent} />
              <Text
                style={[styles.cantonText, { color: colors.mutedForeground }]}
              >
                {nearbyPosition ? copy.locationScope : copy.nearbyLocating}
              </Text>
            </View>
          ) : (
            <View style={styles.placeSearch}>
              <Text style={[styles.placeLabel, { color: colors.foreground }]}>
                {selectedPlace
                  ? copy.placeSelected(selectedPlace.label)
                  : copy.placeOptional}
              </Text>
              <View
                style={[
                  styles.placeInputWrap,
                  {
                    borderColor: colors.glassBorder,
                    backgroundColor: colors.glassBg,
                  },
                ]}
              >
                <Feather
                  name="search"
                  size={15}
                  color={colors.mutedForeground}
                />
                <TextInput
                  value={placeQuery}
                  onChangeText={(value) => {
                    setPlaceQuery(value);
                    setSelectedPlace(null);
                  }}
                  placeholder={copy.placePlaceholder}
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.placeInput, { color: colors.foreground }]}
                  returnKeyType="search"
                  accessibilityLabel={copy.placeOptional}
                />
                {placeSearching && (
                  <ActivityIndicator size="small" color={colors.accent} />
                )}
              </View>
              {(placeSearching ||
                placeSuggestions.length > 0 ||
                (placeQuery.trim().length >= 2 && !selectedPlace)) && (
                <View
                  style={[
                    styles.placeSuggestions,
                    {
                      borderColor: colors.glassBorder,
                      backgroundColor: colors.glassBg,
                    },
                  ]}
                >
                  {placeSearching ? (
                    <Text
                      style={[
                        styles.placeSuggestionText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {copy.placeSearching}
                    </Text>
                  ) : placeSuggestions.length === 0 ? (
                    <Text
                      style={[
                        styles.placeSuggestionText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {copy.placeNoResults}
                    </Text>
                  ) : (
                    placeSuggestions.map((place, index) => (
                      <Pressable
                        key={`${place.lat}-${place.lng}-${index}`}
                        onPress={() => {
                          setSelectedPlace(place);
                          setPlaceQuery(place.label);
                          setPlaceSuggestions([]);
                          setNearbyPosition({ lat: place.lat, lng: place.lng });
                        }}
                        style={[
                          styles.placeSuggestionRow,
                          index > 0 && {
                            borderTopWidth: 1,
                            borderTopColor: colors.glassBorder,
                          },
                        ]}
                      >
                        <Feather
                          name="map-pin"
                          size={14}
                          color={colors.accent}
                        />
                        <Text
                          style={[
                            styles.placeSuggestionText,
                            { color: colors.foreground },
                          ]}
                          numberOfLines={2}
                        >
                          {place.label}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>
          )}
          {nearbyDenied && (
            <Text
              style={[styles.nearbyDenied, { color: colors.mutedForeground }]}
            >
              {copy.nearbyDenied}
            </Text>
          )}
        </PreferenceGroup>

        <PreferenceGroup
          icon="sliders"
          title={copy.profileGroup}
          colors={colors}
        >
          <PreferenceField title={copy.time} colors={colors}>
            <ChoiceRow
              values={[90, 180, 300]}
              selected={timeBudgetMin}
              label={(value) => copy.values.time[value]}
              onSelect={setTimeBudgetMin}
              colors={colors}
            />
          </PreferenceField>
          <PreferenceField title={copy.fitness} colors={colors}>
            <ChoiceRow
              values={["easy", "moderate", "strong"] as RecommendationFitness[]}
              selected={fitness}
              label={(value) => copy.values.fitness[value]}
              onSelect={setFitness}
              colors={colors}
            />
          </PreferenceField>
        </PreferenceGroup>

        <PreferenceGroup icon="users" title={copy.travelGroup} colors={colors}>
          <PreferenceField title={copy.companion} colors={colors}>
            <ChoiceRow
              values={
                ["solo", "children", "wheelchair"] as RecommendationCompanion[]
              }
              selected={companion}
              label={(value) => copy.values.companion[value]}
              onSelect={setCompanion}
              colors={colors}
            />
          </PreferenceField>
          <PreferenceField title={copy.travel} colors={colors}>
            <ChoiceRow
              values={
                ["publicTransport", "car", "flexible"] as RecommendationTravel[]
              }
              selected={travel}
              label={(value) => copy.values.travel[value]}
              onSelect={setTravel}
              colors={colors}
            />
            {travel === "publicTransport" && (
              <Pressable
                onPress={() => setNeedsReturnConnection((value) => !value)}
                style={styles.toggleRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: needsReturnConnection }}
              >
                <Feather
                  name={needsReturnConnection ? "check-square" : "square"}
                  size={18}
                  color={
                    needsReturnConnection
                      ? colors.accent
                      : colors.mutedForeground
                  }
                />
                <Text style={[styles.toggleText, { color: colors.foreground }]}>
                  {copy.returnConnection}
                </Text>
              </Pressable>
            )}
          </PreferenceField>
        </PreferenceGroup>

        <PreferenceGroup
          icon="compass"
          title={copy.interestsGroup}
          colors={colors}
        >
          <Text
            style={[styles.preferenceHint, { color: colors.mutedForeground }]}
          >
            {copy.interests}
          </Text>
          <View style={styles.chipWrap}>
            {INTERESTS.map((theme) => {
              const active = interests.includes(theme);
              return (
                <Pressable
                  key={theme}
                  onPress={() => toggleInterest(theme)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.accent : colors.glassBg,
                      borderColor: active ? colors.accent : colors.glassBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: active
                          ? colors.backgroundDeep
                          : colors.foreground,
                      },
                    ]}
                  >
                    {routeThemeLabel(theme, language)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </PreferenceGroup>

        <PrimaryButton
          label={copy.find}
          onPress={() => void findRecommendation()}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 10 }}
        />

        {loading && (
          <View
            style={[
              styles.statusCard,
              {
                borderColor: colors.glassBorder,
                backgroundColor: colors.glassBg,
              },
            ]}
          >
            <ActivityIndicator color={colors.accent} />
            <Text
              style={[styles.statusText, { color: colors.mutedForeground }]}
            >
              {copy.searching}
            </Text>
          </View>
        )}
        {error && !loading && (
          <Text style={[styles.error, { color: colors.destructive }]}>
            {copy.error}
          </Text>
        )}
        {!loading && searched && !error && !selected && (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            {noThemeMatch ? copy.noThemeMatch : copy.noRoutes}
          </Text>
        )}

        {!loading && selected && (
          <>
            <View
              style={[
                styles.resultCard,
                {
                  borderColor: colors.accent,
                  backgroundColor: colors.glassBgStrong,
                },
              ]}
            >
              <Text style={[styles.resultEyebrow, { color: colors.accent }]}>
                {copy.bestMatch.toUpperCase()}
              </Text>
              <Text style={[styles.resultTitle, { color: colors.foreground }]}>
                {selected.route.name}
              </Text>
              <Text
                style={[styles.resultMeta, { color: colors.mutedForeground }]}
              >
                {selected.route.minutes} min ·{" "}
                {selected.route.distanceTagKm.toFixed(1)} km ·{" "}
                {Math.round(selected.route.ascentM)} hm · SAC{" "}
                {selected.route.sac || "?"}
              </Text>
              <View
                style={styles.themeArea}
                accessibilityLabel={copy.themeArea}
              >
                <Text style={[styles.themeAreaTitle, { color: colors.foreground }]}>
                  {copy.themeArea}
                </Text>
                {selectedThemeKeys.length > 0 ? (
                  <View style={styles.themeWrap}>
                    {selectedThemeKeys.map((theme) => (
                      <View
                        key={theme}
                        style={[
                          styles.themeChip,
                          {
                            borderColor: colors.glassBorder,
                            backgroundColor: colors.glassBg,
                          },
                        ]}
                      >
                        <Feather name="tag" size={12} color={colors.accent} />
                        <Text
                          style={[
                            styles.themeChipText,
                            { color: colors.foreground },
                          ]}
                        >
                          {routeThemeLabel(theme, language)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.themeEmpty,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {copy.noThemeEvidence}
                  </Text>
                )}
              </View>
              <Text style={[styles.whyTitle, { color: colors.foreground }]}>
                {copy.why}
              </Text>
              {reasonLines.slice(0, 4).map((line) => (
                <View key={line} style={styles.reasonRow}>
                  <Feather name="check" size={14} color={colors.accent} />
                  <Text
                    style={[styles.reasonText, { color: colors.foreground }]}
                  >
                    {line}
                  </Text>
                </View>
              ))}
              {cautionLines.slice(0, 2).map((line) => (
                <View key={line} style={styles.reasonRow}>
                  <Feather
                    name="alert-circle"
                    size={14}
                    color={colors.destructive}
                  />
                  <Text
                    style={[
                      styles.reasonText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {line}
                  </Text>
                </View>
              ))}
              {signalLabel(selected.signals, preferences, copy).map((line) => (
                <Text
                  key={line}
                  style={[styles.signalText, { color: colors.mutedForeground }]}
                >
                  {line}
                </Text>
              ))}
              <PrimaryButton
                label={copy.open}
                onPress={() =>
                  router.push(
                    routePathWithCommunity(selected.route.id, communityId),
                  )
                }
                style={{ marginTop: 16 }}
              />
            </View>

            {recommendations.length > 1 && (
              <View style={styles.alternatives}>
                <Text style={[styles.whyTitle, { color: colors.foreground }]}>
                  {copy.alternatives}
                </Text>
                {recommendations.slice(1, 4).map((item) => (
                  <Pressable
                    key={item.route.id}
                    onPress={() =>
                      router.push(
                        routePathWithCommunity(item.route.id, communityId),
                      )
                    }
                    style={[
                      styles.alternativeRow,
                      {
                        borderColor: colors.glassBorder,
                        backgroundColor: colors.glassBg,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.alternativeTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        {item.route.name}
                      </Text>
                      <Text
                        style={[
                          styles.resultMeta,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {item.route.minutes} min ·{" "}
                        {Math.round(item.route.ascentM)} hm
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={colors.mutedForeground}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Background>
  );
}

function PreferenceGroup({
  icon,
  title,
  colors,
  children,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.preferenceGroup,
        GLAS_3D,
        {
          backgroundColor: colors.glassBg,
          borderColor: colors.glassBorder,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.preferenceGroupHeader}>
        <View
          style={[
            styles.preferenceIcon,
            {
              backgroundColor: colors.accent + "18",
              borderColor: colors.accent + "55",
            },
          ]}
        >
          <Feather name={icon} size={16} color={colors.accent} />
        </View>
        <Text
          style={[styles.preferenceGroupTitle, { color: colors.foreground }]}
        >
          {title}
        </Text>
      </View>
      <View style={styles.preferenceGroupContent}>{children}</View>
    </View>
  );
}

function PreferenceField({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.preferenceField}>
      <Text
        style={[styles.preferenceFieldTitle, { color: colors.mutedForeground }]}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function ChoiceRow<T extends string | number>({
  values,
  selected,
  label,
  onSelect,
  colors,
}: {
  values: T[];
  selected: T;
  label: (value: T) => string;
  onSelect: (value: T) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.choiceWrap}>
      {values.map((value) => {
        const active = value === selected;
        return (
          <Pressable
            key={String(value)}
            onPress={() => onSelect(value)}
            style={[
              styles.choice,
              {
                backgroundColor: active ? colors.accent : colors.glassBg,
                borderColor: active ? colors.accent : colors.glassBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.choiceText,
                { color: active ? colors.backgroundDeep : colors.foreground },
              ]}
            >
              {label(value)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 5,
    marginBottom: 12,
  },
  preferenceGroup: { borderWidth: 1, padding: 14, marginTop: 14 },
  preferenceGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  preferenceIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  preferenceGroupTitle: { fontFamily: fonts.titleBold, fontSize: 17, flex: 1 },
  preferenceGroupContent: { marginTop: 2 },
  preferenceField: { marginTop: 15 },
  preferenceFieldTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  preferenceHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 13,
    marginBottom: 9,
  },
  cantonHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
  },
  cantonText: { fontFamily: fonts.body, fontSize: 12, flex: 1 },
  locationModeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  locationModeOption: {
    flex: 1,
    minHeight: 78,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
  },
  locationModeText: { flex: 1, gap: 3 },
  locationModeLabel: { fontFamily: fonts.bodyBold, fontSize: 12 },
  locationModeHint: { fontFamily: fonts.body, fontSize: 10, lineHeight: 14 },
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
  },
  section: { marginTop: 22 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 14, marginBottom: 9 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  chipText: { fontFamily: fonts.body, fontSize: 11 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  toggleText: { fontFamily: fonts.body, fontSize: 12, flex: 1 },
  nearbyDenied: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
    marginLeft: 26,
  },
  placeSearch: { marginTop: 12 },
  placeLabel: { fontFamily: fonts.bodyBold, fontSize: 12, marginBottom: 7 },
  placeInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    minHeight: 44,
  },
  placeInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, minHeight: 40 },
  placeSuggestions: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    overflow: "hidden",
  },
  placeSuggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
  },
  placeSuggestionText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  statusText: { fontFamily: fonts.body, fontSize: 12, flex: 1 },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 24,
  },
  resultCard: { borderWidth: 1, borderRadius: 18, padding: 17, marginTop: 22 },
  resultEyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 7,
  },
  resultTitle: { fontFamily: fonts.titleBold, fontSize: 22, lineHeight: 27 },
  resultMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  themeArea: { marginTop: 17 },
  themeAreaTitle: { fontFamily: fonts.bodyBold, fontSize: 14, marginBottom: 8 },
  themeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  themeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  themeChipText: { fontFamily: fonts.body, fontSize: 11 },
  themeEmpty: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  whyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    marginTop: 17,
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  reasonText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, flex: 1 },
  signalText: { fontFamily: fonts.mono, fontSize: 10, marginTop: 5 },
  alternatives: { marginTop: 22 },
  alternativeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginTop: 8,
    gap: 8,
  },
  alternativeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 18,
  },
});
