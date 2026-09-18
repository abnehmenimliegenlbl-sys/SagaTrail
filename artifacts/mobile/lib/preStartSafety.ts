import type {
  AvalancheBulletin,
  TrailConditionReport,
  WeatherReport,
} from "@workspace/api-client-react";

export type SafetyDecision = "start" | "caution" | "postpone" | "blocked";

export type SafetyReasonCode =
  | "thunderstorm"
  | "critical-weather"
  | "caution-weather"
  | "avalanche-high"
  | "avalanche-moderate"
  | "community-blocked"
  | "community-difficult"
  | "official-closure"
  | "closure-warning"
  | "clear";

export type SafetyReasonSource = "weather" | "eaws" | "community" | "official" | "none";
export type SafetyReasonTone = "danger" | "warn" | "neutral";

export interface SafetyClosure {
  id: string;
  title: string;
  details?: string | null;
  affectsFrom?: string | null;
  affectsUntil?: string | null;
  url?: string | null;
  canton?: string | null;
  typ?: "sperrung" | "wegschaden" | "warnung" | string;
  source?: "admin" | "rss" | string;
}

export interface PreStartSafetyInput {
  nowMs?: number;
  weather: WeatherReport | null;
  weatherLoading: boolean;
  weatherError: boolean;
  avalanche: AvalancheBulletin | null;
  avalancheLoading: boolean;
  trailConditions: TrailConditionReport[] | undefined;
  conditionsLoading: boolean;
  sperrungen: SafetyClosure[];
  sperrungenLoading: boolean;
}

export interface SafetyReason {
  code: SafetyReasonCode;
  source: SafetyReasonSource;
  tone: SafetyReasonTone;
}

export interface PreStartSafetyAnalysis {
  decision: SafetyDecision;
  reasons: SafetyReason[];
  dataMissing: boolean;
  activeClosures: SafetyClosure[];
  recentReports: TrailConditionReport[];
}

function isRecent(iso: string | Date | null | undefined, nowMs: number, days = 7): boolean {
  if (!iso) return false;
  const age = nowMs - new Date(iso).getTime();
  return Number.isFinite(age) && age >= -60_000 && age <= days * 24 * 60 * 60 * 1000;
}

function activeNow(closure: SafetyClosure, nowMs: number): boolean {
  const from = closure.affectsFrom ? new Date(closure.affectsFrom).getTime() : -Infinity;
  const until = closure.affectsUntil ? new Date(closure.affectsUntil).getTime() : Infinity;
  return Number.isFinite(from) || Number.isFinite(until)
    ? nowMs >= from && nowMs <= until
    : true;
}

export function evaluatePreStartSafety(input: PreStartSafetyInput): PreStartSafetyAnalysis {
  const nowMs = input.nowMs ?? Date.now();
  const recentReports = (input.trailConditions ?? []).filter((report) =>
    isRecent(report.reportedAt, nowMs),
  );
  const blockedReport = recentReports.some((report) => report.condition === "blocked");
  const difficultReport = recentReports.some((report) =>
    ["snow", "icy", "muddy"].includes(report.condition),
  );

  // RSS entries are national and have no route geometry. They must not turn
  // a notice for another region into a route-specific warning.
  const activeClosures = input.sperrungen.filter(
    (closure) => activeNow(closure, nowMs) && closure.source !== "rss",
  );
  const officialClosureHint = activeClosures.some((closure) => closure.typ === "sperrung");
  const closureWarning = activeClosures.some((closure) => closure.typ !== "sperrung");
  const avalancheLevel = input.avalanche?.available
    ? (input.avalanche.dangerLevel ?? 0)
    : 0;
  const storm = input.weather?.isThunderstorm === true;
  const criticalWeather = input.weather?.trailConditionLevel === "kritisch";
  const cautionWeather = input.weather?.trailConditionLevel === "vorsicht";
  const weatherMissing =
    !input.weatherLoading && (input.weatherError || !input.weather);
  const avalancheMissing = input.avalanche?.reason === "api-error";
  const dataMissing =
    input.weatherLoading ||
    input.avalancheLoading ||
    weatherMissing ||
    avalancheMissing ||
    input.sperrungenLoading ||
    input.conditionsLoading;

  let decision: SafetyDecision = "start";
  // These signals are strong enough to postpone, but none is an official
  // route closure. A hard "blocked" state needs authoritative route geometry.
  if (storm || avalancheLevel >= 4 || blockedReport) {
    decision = "postpone";
  } else if (
    avalancheLevel >= 3 ||
    criticalWeather ||
    difficultReport ||
    cautionWeather ||
    closureWarning ||
    officialClosureHint ||
    dataMissing
  ) {
    decision = "caution";
  }

  const reasons: SafetyReason[] = [];
  if (storm) {
    reasons.push({ code: "thunderstorm", source: "weather", tone: "danger" });
  } else if (criticalWeather || cautionWeather) {
    reasons.push({
      code: criticalWeather ? "critical-weather" : "caution-weather",
      source: "weather",
      tone: criticalWeather ? "warn" : "neutral",
    });
  }
  if (avalancheLevel >= 4) {
    reasons.push({ code: "avalanche-high", source: "eaws", tone: "danger" });
  } else if (avalancheLevel >= 3) {
    reasons.push({ code: "avalanche-moderate", source: "eaws", tone: "warn" });
  }
  if (blockedReport) {
    reasons.push({ code: "community-blocked", source: "community", tone: "danger" });
  } else if (difficultReport) {
    reasons.push({ code: "community-difficult", source: "community", tone: "warn" });
  }
  if (officialClosureHint) {
    reasons.push({ code: "official-closure", source: "official", tone: "warn" });
  } else if (closureWarning) {
    reasons.push({ code: "closure-warning", source: "official", tone: "warn" });
  }
  if (!reasons.length) {
    reasons.push({ code: "clear", source: "none", tone: "neutral" });
  }

  return {
    decision,
    reasons: reasons.slice(0, 3),
    dataMissing,
    activeClosures,
    recentReports,
  };
}