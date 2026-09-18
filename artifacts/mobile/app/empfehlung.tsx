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
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const COPY_DE: Copy = {
  eyebrow: "Deine nächste Wanderung",
  title: "Was passt heute?",
  intro: "Sag uns kurz, wie dein Tag aussieht. SagaTrail wählt eine konkrete Route und zeigt dir offen, warum sie passt.",
  locationScope: "Suche aktuelle Routen in deiner Nähe per GPS",
  allCantons: "Standort nicht verfügbar – zeige Routen aus allen Kantonen",
  time: "Wie viel Zeit hast du?",
  fitness: "Wie viel möchtest du heute leisten?",
  companion: "Wer ist dabei?",
  travel: "Wie möchtest du anreisen?",
  returnConnection: "ÖV-Rückweg soll heute gut funktionieren",
  nearbySearch: "Nach meiner GPS-Position suchen",
  nearbyLocating: "Standort wird ermittelt …",
  nearbyDenied: "Standort nicht verfügbar – erlaube den Zugriff für die Suche in deiner Nähe.",
  placeOptional: "Oder einen Ort eingeben (optional)",
  placePlaceholder: "Ort, Gemeinde oder Region",
  placeSearching: "Orte werden gesucht …",
  placeNoResults: "Kein passender Ort gefunden",
  placeSelected: (place) => `Suche nahe ${place}`,
  locationGroup: "Suchort",
  profileGroup: "Wegprofil",
  travelGroup: "Begleitung & Anreise",
  interestsGroup: "Interessen",
  interests: "Was möchtest du unterwegs sehen?",
  find: "Beste Route für heute finden",
  searching: "Route, Wetter, Bedingungen und Anreise werden verglichen …",
  noRoutes: "Keine Route passt gleichzeitig zu Zeit, Begleitung und Belastung. Versuche ein grösseres Zeitbudget.",
  error: "Die Empfehlung konnte gerade nicht geladen werden. Prüfe die Verbindung und versuche es erneut.",
  bestMatch: "Das ist heute deine beste Wahl",
  why: "Warum diese Route?",
  alternatives: "Weitere passende Optionen",
  open: "Route ansehen",
  weather: "Wetter",
  conditions: "Wegbedingungen",
  transit: "ÖV-Rückweg",
  parking: "Parkplatz",
    dataUnavailable: {
      weather: "Wetter: keine Live-Daten",
      conditions: "Wegbedingungen: keine aktuelle Meldung",
      transit: "ÖV: keine Live-Daten für diesen Punkt",
      parking: "Parkplatz: keine Live-Daten",
    },
  values: {
    time: { 90: "1½ Stunden", 180: "3 Stunden", 300: "5 Stunden" },
    fitness: { easy: "Locker", moderate: "Mittel", strong: "Anspruchsvoll" },
    companion: { solo: "Allein / Erwachsene", children: "Mit Kindern", wheelchair: "Mit Rollstuhl" },
    travel: { publicTransport: "ÖV", car: "Auto", flexible: "Offen" },
  },
  reason: {
    time: (r) => `passt in dein Zeitbudget von ${Math.round(r.route.minutes / 60 * 10) / 10} h`,
    fitness: () => "passt zu deiner gewünschten Belastung",
    companion: () => "passt zu deiner Begleitung",
    interest: () => "trifft mindestens eines deiner Themen",
    nearby: () => "liegt in deiner Nähe",
    season: () => "ist für die aktuelle Saison eingeordnet",
    weather: () => "das aktuelle Wetter spricht dafür",
    conditions: () => "die aktuellen Wegbedingungen sprechen dafür",
    return: () => "am Ziel gibt es passende ÖV-Abfahrten",
    arrival: () => "der Start ist mit ÖV erreichbar",
    parking: () => "am Start wurde ein Parkplatz gefunden",
  },
  caution: {
    time: "liegt über deinem Zeitbudget",
    fitness: "ist für deine gewünschte Belastung anspruchsvoller",
    companion: "die Eignung für deine Begleitung ist nicht ideal",
    interest: "deine ausgewählten Themen sind dort nicht belegt",
    season: "ist saisonal weniger passend",
    weather: "das aktuelle Wetter verlangt Vorsicht",
    conditions: "es gibt aktuelle Hinweise zu den Wegbedingungen",
    return: "ÖV-Rückweg ist nicht zuverlässig belegt",
    nearby: "liegt weiter von deinem Standort entfernt",
  },
};

const COPY_EN: Copy = {
  ...COPY_DE,
  eyebrow: "Your next hike",
  title: "What fits today?",
  intro: "Tell us how your day looks. SagaTrail chooses one concrete route and explains why it fits.",
  locationScope: "Find current routes near you using GPS",
  allCantons: "Location unavailable – showing routes from all cantons",
  time: "How much time do you have?",
  fitness: "How much effort do you want today?",
  companion: "Who is joining?",
  travel: "How do you want to travel?",
  returnConnection: "A reliable public-transport return matters today",
  nearbySearch: "Search near my GPS position",
  nearbyLocating: "Getting your location …",
  nearbyDenied: "Location unavailable – allow access to search near you.",
  placeOptional: "Or enter a place (optional)",
  placePlaceholder: "Town, municipality or region",
  placeSearching: "Searching places …",
  placeNoResults: "No matching place found",
  placeSelected: (place) => `Searching near ${place}`,
  locationGroup: "Search area",
  profileGroup: "Trail profile",
  travelGroup: "Company & travel",
  interestsGroup: "Interests",
  interests: "What would you like to see?",
  find: "Find my best route today",
  searching: "Comparing routes, weather, conditions and transport …",
  noRoutes: "No route fits the time, group and effort together. Try a larger time budget.",
  error: "The recommendation could not be loaded. Check your connection and try again.",
  bestMatch: "Your best choice today",
  why: "Why this route?",
  alternatives: "Other good options",
  open: "View route",
  weather: "Weather",
  conditions: "Trail conditions",
  transit: "Return transport",
  parking: "Parking",
    dataUnavailable: {
      weather: "Weather: no live data",
      conditions: "Trail conditions: no current report",
      transit: "Public transport: no live data for this point",
      parking: "Parking: no live data",
    },
  values: {
    ...COPY_DE.values,
    time: { 90: "1½ hours", 180: "3 hours", 300: "5 hours" },
    fitness: { easy: "Easy", moderate: "Moderate", strong: "Demanding" },
    companion: { solo: "Solo / adults", children: "With children", wheelchair: "With wheelchair" },
    travel: { publicTransport: "Public transport", car: "Car", flexible: "Open" },
  },
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
      labels.push(`${copy.transit}: ${signals.returnTransport.departures.length}`);
    } else if (signals.startTransport?.station) {
      labels.push(copy.dataUnavailable.transit);
    } else {
      labels.push(copy.dataUnavailable.transit);
    }
  }
  if (signals.parkingAvailable != null) {
    labels.push(`${copy.parking}: ${signals.parkingAvailable ? "ja" : "nicht belegt"}`);
  } else if (preferences.travel === "car") {
    labels.push(copy.dataUnavailable.parking);
  }
  return labels;
}

export default function Empfehlung() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useApp();
  const { loadCantonRoutes } = useCatalog();
  const copy = language === "de" || language === "gsw" ? COPY_DE : COPY_EN;
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

  const preferences = useMemo<RecommendationPreferences>(
    () => ({
      timeBudgetMin,
      fitness,
      companion,
      travel,
      needsReturnConnection: travel === "publicTransport" && needsReturnConnection,
      interests,
      nearby: nearbyPosition,
    }),
    [companion, fitness, interests, nearbyPosition, needsReturnConnection, timeBudgetMin, travel],
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
      setNearbyPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
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
          if (placeRequestId.current === requestId) setPlaceSuggestions(results);
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

  const toggleNearbySearch = async () => {
    if (nearbySearch) {
      setNearbySearch(false);
      setNearbyPosition(null);
      setNearbyDenied(false);
      return;
    }
    await locateNearby();
  };

  const findRecommendation = async () => {
    setLoading(true);
    setError(false);
    setSearched(true);
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
        Array.from({ length: Math.min(4, cantons.length) }, () => loadNextCanton()),
      );
      const base = rankRoutes(routeResults, preferences).slice(0, 8);
      const signalsByRoute = new Map<string, RecommendationSignals>();
      await Promise.all(
        base.map(async ({ route }) => {
          const signals: RecommendationSignals = {};
          const [weather, conditions] = await Promise.allSettled([
            getWeather({ lat: route.coordinates.lat, lng: route.coordinates.lng }),
            getRouteConditions(route.id),
          ]);
          if (weather.status === "fulfilled") signals.weather = weather.value as WeatherReport;
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
              signals.startTransport = startTransport.value as TransportStationboard;
            }
            if (returnTransport.status === "fulfilled") {
              signals.returnTransport = returnTransport.value as TransportStationboard;
            }
          } else if (travel === "car") {
            try {
              const endpoint = route.geometry?.[0] ?? [route.coordinates.lat, route.coordinates.lng];
              const response = await fetch(
                `${getApiBaseUrl() ?? ""}/api/parking?lat=${endpoint[0]}&lng=${endpoint[1]}&radius=800`,
              );
              const parking = await response.json() as unknown;
              signals.parkingAvailable = Array.isArray(parking) && parking.length > 0;
            } catch {
              signals.parkingAvailable = null;
            }
          }
          signalsByRoute.set(route.id, signals);
        }),
      );
      setRecommendations(rankRoutes(base.map(({ route }) => route), preferences, signalsByRoute));
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

  const toggleInterest = (theme: RouteThemeKey) => {
    setInterests((current) =>
      current.includes(theme) ? current.filter((item) => item !== theme) : [...current, theme],
    );
  };

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
        <ScreenHeader eyebrow={copy.eyebrow} title={copy.title} onBack />
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>{copy.intro}</Text>
        <PreferenceGroup icon="map-pin" title={copy.locationGroup} colors={colors}>
          <View style={[styles.cantonHint, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}>
            <Feather name="map-pin" size={15} color={colors.accent} />
            <Text style={[styles.cantonText, { color: colors.mutedForeground }]}>
              {nearbySearch && nearbyPosition
                ? copy.locationScope
                : selectedPlace
                  ? copy.placeSelected(selectedPlace.label)
                  : copy.allCantons}
            </Text>
          </View>
          {!nearbySearch && (
            <View style={styles.placeSearch}>
              <Text style={[styles.placeLabel, { color: colors.foreground }]}>{copy.placeOptional}</Text>
              <View
                style={[
                  styles.placeInputWrap,
                  { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                ]}
              >
                <Feather name="search" size={15} color={colors.mutedForeground} />
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
                {placeSearching && <ActivityIndicator size="small" color={colors.accent} />}
              </View>
              {(placeSearching || placeSuggestions.length > 0 ||
                (placeQuery.trim().length >= 2 && !selectedPlace)) && (
                <View style={[styles.placeSuggestions, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}>
                  {placeSearching ? (
                    <Text style={[styles.placeSuggestionText, { color: colors.mutedForeground }]}>
                      {copy.placeSearching}
                    </Text>
                  ) : placeSuggestions.length === 0 ? (
                    <Text style={[styles.placeSuggestionText, { color: colors.mutedForeground }]}>
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
                          index > 0 && { borderTopWidth: 1, borderTopColor: colors.glassBorder },
                        ]}
                      >
                        <Feather name="map-pin" size={14} color={colors.accent} />
                        <Text style={[styles.placeSuggestionText, { color: colors.foreground }]} numberOfLines={2}>
                          {place.label}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>
          )}
          <Pressable
            onPress={() => void toggleNearbySearch()}
            style={styles.toggleRow}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: nearbySearch }}
            disabled={nearbyLocating}
          >
            <Feather
              name={nearbyLocating ? "loader" : nearbySearch ? "check-square" : "square"}
              size={18}
              color={nearbySearch ? colors.accent : colors.mutedForeground}
            />
            <Text style={[styles.toggleText, { color: colors.foreground }]}>
              {nearbyLocating ? copy.nearbyLocating : copy.nearbySearch}
            </Text>
          </Pressable>
          {nearbyDenied && (
            <Text style={[styles.nearbyDenied, { color: colors.mutedForeground }]}>
              {copy.nearbyDenied}
            </Text>
          )}
        </PreferenceGroup>

        <PreferenceGroup icon="sliders" title={copy.profileGroup} colors={colors}>
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
              values={["solo", "children", "wheelchair"] as RecommendationCompanion[]}
              selected={companion}
              label={(value) => copy.values.companion[value]}
              onSelect={setCompanion}
              colors={colors}
            />
          </PreferenceField>
          <PreferenceField title={copy.travel} colors={colors}>
            <ChoiceRow
              values={["publicTransport", "car", "flexible"] as RecommendationTravel[]}
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
                  color={needsReturnConnection ? colors.accent : colors.mutedForeground}
                />
                <Text style={[styles.toggleText, { color: colors.foreground }]}>{copy.returnConnection}</Text>
              </Pressable>
            )}
          </PreferenceField>
        </PreferenceGroup>

        <PreferenceGroup icon="compass" title={copy.interestsGroup} colors={colors}>
          <Text style={[styles.preferenceHint, { color: colors.mutedForeground }]}>{copy.interests}</Text>
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
                  <Text style={[styles.chipText, { color: active ? colors.backgroundDeep : colors.foreground }]}>
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
          <View style={[styles.statusCard, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}>
            <ActivityIndicator color={colors.accent} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{copy.searching}</Text>
          </View>
        )}
        {error && !loading && <Text style={[styles.error, { color: colors.destructive }]}>{copy.error}</Text>}
        {!loading && searched && !error && !selected && (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>{copy.noRoutes}</Text>
        )}

        {!loading && selected && (
          <>
            <View style={[styles.resultCard, { borderColor: colors.accent, backgroundColor: colors.glassBgStrong }]}>
              <Text style={[styles.resultEyebrow, { color: colors.accent }]}>{copy.bestMatch.toUpperCase()}</Text>
              <Text style={[styles.resultTitle, { color: colors.foreground }]}>{selected.route.name}</Text>
              <Text style={[styles.resultMeta, { color: colors.mutedForeground }]}>
                {selected.route.minutes} min · {selected.route.distanceTagKm.toFixed(1)} km · {Math.round(selected.route.ascentM)} hm · SAC {selected.route.sac || "?"}
              </Text>
              <Text style={[styles.whyTitle, { color: colors.foreground }]}>{copy.why}</Text>
              {reasonLines.slice(0, 4).map((line) => (
                <View key={line} style={styles.reasonRow}>
                  <Feather name="check" size={14} color={colors.accent} />
                  <Text style={[styles.reasonText, { color: colors.foreground }]}>{line}</Text>
                </View>
              ))}
              {cautionLines.slice(0, 2).map((line) => (
                <View key={line} style={styles.reasonRow}>
                  <Feather name="alert-circle" size={14} color={colors.destructive} />
                  <Text style={[styles.reasonText, { color: colors.mutedForeground }]}>{line}</Text>
                </View>
              ))}
              {signalLabel(selected.signals, preferences, copy).map((line) => (
                <Text key={line} style={[styles.signalText, { color: colors.mutedForeground }]}>{line}</Text>
              ))}
              <PrimaryButton
                label={copy.open}
                onPress={() => router.push(`/route/${selected.route.id}`)}
                style={{ marginTop: 16 }}
              />
            </View>

            {recommendations.length > 1 && (
              <View style={styles.alternatives}>
                <Text style={[styles.whyTitle, { color: colors.foreground }]}>{copy.alternatives}</Text>
                {recommendations.slice(1, 4).map((item) => (
                  <Pressable
                    key={item.route.id}
                    onPress={() => router.push(`/route/${item.route.id}`)}
                    style={[styles.alternativeRow, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alternativeTitle, { color: colors.foreground }]}>{item.route.name}</Text>
                      <Text style={[styles.resultMeta, { color: colors.mutedForeground }]}>
                        {item.route.minutes} min · {Math.round(item.route.ascentM)} hm
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
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

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
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
            <Text style={[styles.choiceText, { color: active ? colors.backgroundDeep : colors.foreground }]}>
              {label(value)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, marginTop: 5, marginBottom: 14 },
  cantonHint: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 11 },
  cantonText: { fontFamily: fonts.body, fontSize: 12, flex: 1 },
  section: { marginTop: 22 },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 14, marginBottom: 9 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  choiceText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 },
  chipText: { fontFamily: fonts.body, fontSize: 11 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  toggleText: { fontFamily: fonts.body, fontSize: 12, flex: 1 },
  nearbyDenied: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, marginTop: 7, marginLeft: 26 },
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
  placeSuggestions: { borderWidth: 1, borderRadius: 12, marginTop: 6, overflow: "hidden" },
  placeSuggestionRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 11 },
  placeSuggestionText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, flex: 1 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 16 },
  statusText: { fontFamily: fonts.body, fontSize: 12, flex: 1 },
  error: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 16 },
  empty: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 24 },
  resultCard: { borderWidth: 1, borderRadius: 18, padding: 17, marginTop: 22 },
  resultEyebrow: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, marginBottom: 7 },
  resultTitle: { fontFamily: fonts.titleBold, fontSize: 22, lineHeight: 27 },
  resultMeta: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 17, marginTop: 6 },
  whyTitle: { fontFamily: fonts.bodyBold, fontSize: 14, marginTop: 17, marginBottom: 8 },
  reasonRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  reasonText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, flex: 1 },
  signalText: { fontFamily: fonts.mono, fontSize: 10, marginTop: 5 },
  alternatives: { marginTop: 22 },
  alternativeRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 8, gap: 8 },
  alternativeTitle: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18 },
});