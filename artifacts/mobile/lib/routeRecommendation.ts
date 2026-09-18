import type {
  TrailConditionReport,
  WeatherReport,
  TransportStationboard,
} from "@workspace/api-client-react";

import type { HikingRoute } from "@/constants/routes";
import type { LatLng } from "@/types";
import type { RouteThemeKey } from "@/lib/routeThemes";

export type RecommendationFitness = "easy" | "moderate" | "strong";
export type RecommendationCompanion = "solo" | "children" | "wheelchair";
export type RecommendationTravel = "publicTransport" | "car" | "flexible";

export interface RecommendationPreferences {
  timeBudgetMin: number;
  fitness: RecommendationFitness;
  companion: RecommendationCompanion;
  interests: RouteThemeKey[];
  travel: RecommendationTravel;
  needsReturnConnection: boolean;
  nearby?: LatLng | null;
}

export interface RecommendationSignals {
  weather?: WeatherReport | null;
  conditions?: TrailConditionReport[];
  returnTransport?: TransportStationboard | null;
  startTransport?: TransportStationboard | null;
  parkingAvailable?: boolean | null;
}

export type RecommendationReasonCode =
  | "time"
  | "fitness"
  | "companion"
  | "interest"
  | "season"
  | "weather"
  | "conditions"
  | "return"
  | "arrival"
  | "parking"
  | "nearby";

export interface ScoredRoute {
  route: HikingRoute;
  score: number;
  reasons: RecommendationReasonCode[];
  cautions: RecommendationReasonCode[];
  signals: RecommendationSignals;
}

const FITNESS_LIMITS: Record<RecommendationFitness, { ascent: number; sac: number }> = {
  easy: { ascent: 400, sac: 2 },
  moderate: { ascent: 800, sac: 3 },
  strong: { ascent: 1600, sac: 5 },
};

function sacLevel(sac: string | null | undefined): number | null {
  const match = /T\s*([1-6])/i.exec(sac ?? "");
  return match ? Number(match[1]) : null;
}

function currentSeasonIsSuitable(route: HikingRoute): boolean {
  const month = new Date().getMonth() + 1;
  if (route.season === "ganzjaehrig") return true;
  if (route.season === "eher_sommer") return month >= 4 && month <= 10;
  return month >= 6 && month <= 9;
}

function conditionLevel(signals: RecommendationSignals): string | null {
  return signals.conditions?.[0]?.condition ?? null;
}

function scoreWeather(signals: RecommendationSignals): number {
  switch (signals.weather?.trailConditionLevel) {
    case "gut":
      return 8;
    case "vorsicht":
      return -14;
    case "kritisch":
      return -45;
    default:
      return 0;
  }
}

function scoreConditions(signals: RecommendationSignals): number {
  switch (conditionLevel(signals)) {
    case "excellent":
    case "clear":
      return 7;
    case "muddy":
      return -10;
    case "snow":
    case "icy":
      return -28;
    case "blocked":
      return -60;
    case "vorsicht":
      return -12;
    case "kritisch":
      return -45;
    default:
      return 0;
  }
}

function scoreTravel(
  preferences: RecommendationPreferences,
  signals: RecommendationSignals,
): number {
  if (preferences.travel === "publicTransport") {
    const start = signals.startTransport?.station ? 7 : -8;
    const returnDepartures = signals.returnTransport?.departures.length ?? 0;
    const returnScore = preferences.needsReturnConnection
      ? returnDepartures > 0
        ? 22
        : -24
      : returnDepartures > 0
        ? 8
        : -4;
    return start + returnScore;
  }
  if (preferences.travel === "car") {
    if (signals.parkingAvailable === true) return 8;
    if (signals.parkingAvailable === false) return -7;
  }
  return 0;
}

export function scoreRoute(
  route: HikingRoute,
  preferences: RecommendationPreferences,
  signals: RecommendationSignals = {},
): ScoredRoute {
  const reasons: RecommendationReasonCode[] = [];
  const cautions: RecommendationReasonCode[] = [];
  const limits = FITNESS_LIMITS[preferences.fitness];
  let score = 50;

  const timeRatio = route.minutes / Math.max(preferences.timeBudgetMin, 1);
  if (timeRatio <= 1) {
    score += 18 - Math.abs(0.82 - timeRatio) * 15;
    reasons.push("time");
  } else {
    score -= Math.min(42, (timeRatio - 1) * 55);
    cautions.push("time");
  }

  const level = sacLevel(route.sac);
  const ascentFits = route.ascentM <= limits.ascent;
  if (ascentFits && level != null && level <= limits.sac) {
    score += 15;
    reasons.push("fitness");
  } else if (ascentFits && level == null) {
    // Ein unbekannter SAC-Grad darf nicht wie ein passender Grad zählen.
    // Die Route bleibt sichtbar, erhält aber einen kleinen Unsicherheitsabzug.
    score -= 4;
    cautions.push("fitness");
  } else {
    score -= 28;
    cautions.push("fitness");
  }

  if (preferences.companion === "children") {
    if (route.familyFriendly === true) {
      score += 22;
      reasons.push("companion");
    } else if (route.familyFriendly === false) {
      score -= 35;
      cautions.push("companion");
    }
  } else if (preferences.companion === "wheelchair") {
    if (route.wheelchairAccessible === true) {
      score += 35;
      reasons.push("companion");
    } else if (route.wheelchairAccessible === false) {
      score -= 60;
      cautions.push("companion");
    }
  }

  const themeEvidenceConfirmed =
    Array.isArray(route.themeKeys) && route.qualityStatus !== "invalid";
  const matches = themeEvidenceConfirmed
    ? preferences.interests.filter((interest) => route.themeKeys?.includes(interest))
    : [];
  if (preferences.interests.length > 0) {
    if (matches.length > 0) {
      score += Math.min(28, matches.length * 14);
      reasons.push("interest");
    } else {
      score -= 14;
      cautions.push("interest");
    }
  }

  if (currentSeasonIsSuitable(route)) {
    score += 8;
    reasons.push("season");
  } else {
    score -= 18;
    cautions.push("season");
  }

  const weatherScore = scoreWeather(signals);
  score += weatherScore;
  if (weatherScore > 0) reasons.push("weather");
  if (weatherScore < 0) cautions.push("weather");

  const conditionsScore = scoreConditions(signals);
  score += conditionsScore;
  if (conditionsScore > 0) reasons.push("conditions");
  if (conditionsScore < 0) cautions.push("conditions");

  const travelScore = scoreTravel(preferences, signals);
  score += travelScore;
  if (preferences.nearby) {
    const distanceKm = Math.hypot(
      (route.coordinates.lat - preferences.nearby.lat) * 111,
      (route.coordinates.lng - preferences.nearby.lng) *
        111 *
        Math.cos((preferences.nearby.lat * Math.PI) / 180),
    );
    if (distanceKm <= 8) {
      score += 24;
      reasons.push("nearby");
    } else {
      score -= Math.min(24, (distanceKm - 8) * 0.7);
      if (distanceKm > 25) cautions.push("nearby");
    }
  }
  if (preferences.travel === "publicTransport") {
    if ((signals.returnTransport?.departures.length ?? 0) > 0) reasons.push("return");
    if (signals.startTransport?.station) reasons.push("arrival");
    if (preferences.needsReturnConnection && !signals.returnTransport?.departures.length) {
      cautions.push("return");
    }
    if (!signals.startTransport?.station) cautions.push("arrival");
  } else if (preferences.travel === "car" && signals.parkingAvailable === true) {
    reasons.push("parking");
  }

  return {
    route,
    score: Math.round(score * 10) / 10,
    reasons: [...new Set(reasons)],
    cautions: [...new Set(cautions)],
    signals,
  };
}

export function rankRoutes(
  routes: HikingRoute[],
  preferences: RecommendationPreferences,
  signalsByRoute: ReadonlyMap<string, RecommendationSignals> = new Map(),
): ScoredRoute[] {
  return routes
    .map((route) => scoreRoute(route, preferences, signalsByRoute.get(route.id) ?? {}))
    .sort((a, b) => b.score - a.score);
}

export function routeRecommendationFilters(
  preferences: RecommendationPreferences,
): {
  distMax: number;
  ascMax: number;
  diffMax: number;
  familyFriendly?: boolean;
  wheelchairAccessible?: boolean;
  nearLat?: number;
  nearLng?: number;
} {
  const limits = FITNESS_LIMITS[preferences.fitness];
  const maxDistance = Math.max(8, Math.ceil(preferences.timeBudgetMin / 12));
  return {
    distMax: maxDistance,
    ascMax: limits.ascent,
    diffMax: limits.sac,
    ...(preferences.companion === "children" ? { familyFriendly: true } : {}),
    ...(preferences.companion === "wheelchair" ? { wheelchairAccessible: true } : {}),
    ...(preferences.nearby
      ? { nearLat: preferences.nearby.lat, nearLng: preferences.nearby.lng }
      : {}),
  };
}