import { Feather } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Polygon,
  Polyline,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import type { PanoramaGipfel } from "@/lib/panorama";
import type { TerrainProfilePoint } from "@/lib/terrainCues";
import type { LocalTerrainModel } from "@/lib/terrainModel";
import type { LatLng, RecognitionJournalEntry } from "@/types";
import { PeakTerrainGl } from "./PeakTerrainGl";

const PANORAMA_VIEW_DEGREES = 140;
const PANORAMA_TOTAL_DEGREES = 140;
const PANORAMA_MAX_DRAG_DEGREES = 180;
const PANORAMA_PROFILE_BATCH_SIZE = 8;
const PANORAMA_PROFILE_LIMIT = 40;
const CARDINAL_DIRECTIONS = [
  { label: "N", bearing: 0 },
  { label: "O", bearing: 90 },
  { label: "S", bearing: 180 },
  { label: "W", bearing: 270 },
] as const;

function signedAngleDifference(target: number, reference: number): number {
  return ((target - reference + 540) % 360) - 180;
}

function normalizeBearing(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export interface PeakPanoramaStrings {
  title: string;
  hint: string;
  needCompass: string;
  noGps: string;
  noPeaks: string;
  detected: string;
  distance: (distance: string) => string;
  camera: string;
  cameraOff: string;
  capture: string;
  cameraPermission: string;
  arUnavailable: string;
  heightUnknown: string;
  terrainModel: string;
  terrainModelDetail: (radius: string) => string;
}

interface PeakPanoramaProps {
  peaks: PanoramaGipfel[];
  terrainProfile?: readonly TerrainProfilePoint[] | null;
  terrainModel?: LocalTerrainModel | null;
  observerPosition?: LatLng | null;
  heading: number | null;
  observerElevationM?: number | null;
  hasGps: boolean;
  strings: PeakPanoramaStrings;
  onCaptured?: (entry: RecognitionJournalEntry) => void | Promise<void>;
  onCameraOpen?: () => void;
}

type PanoramaProfilePoint = { distanceKm: number; altM: number };
type PanoramaProfile = {
  peakId: string;
  profile: PanoramaProfilePoint[];
  peakDistanceKm?: number;
};
type CachedPanoramaProfile = {
  points: PanoramaProfilePoint[];
  peakDistanceKm: number | null;
};

function profileCacheKey(
  observerKey: string,
  peakId: string,
): string {
  return `${observerKey}|${peakId}`;
}

function finiteProfile(
  value: unknown,
): PanoramaProfilePoint[] | null {
  if (!Array.isArray(value)) return null;
  const profile = value
    .filter(
      (point): point is { distanceKm: unknown; altM: unknown } =>
        !!point && typeof point === "object" && "distanceKm" in point && "altM" in point,
    )
    .map((point) => ({
      distanceKm: Number(point.distanceKm),
      altM: Number(point.altM),
    }))
    .filter((point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.altM));
  return profile.length >= 2 ? profile : null;
}

type MeshPoint = { x: number; y: number };
type PanoramaMeshTriangle = {
  points: string;
  tone: "light" | "dark" | "bridge";
};
type PanoramaMeshPeak = {
  peak: PanoramaGipfel;
  profile: PanoramaProfilePoint[];
  centerX: number;
  points: MeshPoint[];
  lowerPoints: MeshPoint[];
  peakPoint: MeshPoint;
};
type PanoramaMesh = {
  peaks: PanoramaMeshPeak[];
  triangles: PanoramaMeshTriangle[];
  terrainFaces: Array<{
    points: string;
    opacity: number;
    tone: "light" | "dark";
  }>;
  terrainLines: Array<{ points: string; opacity: number }>;
  elevationRangeM: { min: number; max: number } | null;
};
type PanoramaAltitudeRange = { minM: number; maxM: number };

function pointString(points: readonly MeshPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function interpolateProfileAltitude(
  points: readonly PanoramaProfilePoint[],
  distanceKm: number,
  fallbackAltM: number,
): number {
  if (points.length === 0) return fallbackAltM;
  if (distanceKm <= points[0].distanceKm) return points[0].altM;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    if (!previous || !next || distanceKm > next.distanceKm) continue;
    const span = Math.max(0.000001, next.distanceKm - previous.distanceKm);
    const fraction = (distanceKm - previous.distanceKm) / span;
    return previous.altM + (next.altM - previous.altM) * fraction;
  }
  return points[points.length - 1]?.altM ?? fallbackAltM;
}

function buildTerrainSurface(
  terrainModel: LocalTerrainModel,
  terrainBearing: (bearing: number) => number | null,
): {
  faces: Array<{
    points: string;
    opacity: number;
    tone: "light" | "dark";
  }>;
  lines: Array<{ points: string; opacity: number }>;
  elevationRangeM: { min: number; max: number } | null;
} {
  const allSamples = terrainModel.rays.flatMap((ray) =>
    ray.samples.filter(
      (sample) => Number.isFinite(sample.distanceM) && Number.isFinite(sample.elevationM),
    ),
  );
  if (allSamples.length === 0) {
    return { faces: [], lines: [], elevationRangeM: null };
  }

  const minM = Math.min(...allSamples.map((sample) => sample.elevationM));
  const maxM = Math.max(...allSamples.map((sample) => sample.elevationM));
  const observerElevation =
    terrainModel.observerElevationM ?? allSamples[0]?.elevationM ?? minM;
  const minRelative = minM - observerElevation;
  const maxRelative = maxM - observerElevation;
  const span = Math.max(40, maxRelative - minRelative);
  const topY = 44;
  const baselineY = 274;
  const rays = terrainModel.rays
    .map((ray) => {
      const bearing = terrainBearing(ray.bearingDeg);
      const samples = ray.samples.filter(
        (sample) => Number.isFinite(sample.distanceM) && Number.isFinite(sample.elevationM),
      );
      if (bearing == null || samples.length === 0) return null;
      return {
        bearing,
        samples: samples.sort((a, b) => a.distanceM - b.distanceM),
      };
    })
    .filter((ray): ray is { bearing: number; samples: LocalTerrainModel["rays"][number]["samples"] } =>
      ray !== null,
    )
    .sort((a, b) => a.bearing - b.bearing);

  const maxAngularGap = 360 / Math.max(8, terrainModel.sectors) * 1.8;
  const ringCount = Math.max(...rays.map((ray) => ray.samples.length), 0);
  const projectSample = (
    ray: (typeof rays)[number],
    ringIndex: number,
  ): MeshPoint | null => {
    const sample = ray.samples[ringIndex];
    if (!sample) return null;
    return {
      x: 180 + (ray.bearing / PANORAMA_VIEW_DEGREES) * 360,
      y: Math.max(
        topY,
        Math.min(
          baselineY,
          baselineY -
            ((sample.elevationM - observerElevation - minRelative) / span) *
              (baselineY - topY),
        ),
      ),
    };
  };
  const faces: Array<{
    points: string;
    opacity: number;
    tone: "light" | "dark";
  }> = [];
  for (let ringIndex = 1; ringIndex < ringCount - 1; ringIndex += 1) {
    for (let rayIndex = 0; rayIndex < rays.length - 1; rayIndex += 1) {
      const leftRay = rays[rayIndex];
      const rightRay = rays[rayIndex + 1];
      if (rightRay.bearing - leftRay.bearing > maxAngularGap) continue;
      const nearLeft = projectSample(leftRay, ringIndex);
      const nearRight = projectSample(rightRay, ringIndex);
      const farLeft = projectSample(leftRay, ringIndex + 1);
      const farRight = projectSample(rightRay, ringIndex + 1);
      if (!nearLeft || !nearRight || !farLeft || !farRight) continue;
      const leftRise = nearLeft.y - farLeft.y;
      const rightRise = nearRight.y - farRight.y;
      faces.push({
        points: pointString([nearLeft, nearRight, farRight, farLeft]),
        opacity:
          0.38 +
          (ringIndex / Math.max(1, ringCount - 2)) * 0.34,
        tone: leftRise + rightRise >= 0 ? "light" : "dark",
      });
    }
  }
  const lines: Array<{ points: string; opacity: number }> = [];
  for (let ringIndex = 1; ringIndex < ringCount; ringIndex += 1) {
    const ringPoints = rays
      .map((ray) => {
        const sample = ray.samples[ringIndex];
        if (!sample) return null;
        return {
          bearing: ray.bearing,
          x: 180 + (ray.bearing / PANORAMA_VIEW_DEGREES) * 360,
          y:
            baselineY -
            ((sample.elevationM - observerElevation - minRelative) / span) *
              (baselineY - topY),
        };
      })
      .filter(
        (point): point is { bearing: number; x: number; y: number } => point !== null,
      );
    let current: { x: number; y: number }[] = [];
    for (const point of ringPoints) {
      const previous = current[current.length - 1];
      const angularGap = previous
        ? ((point.x - previous.x) / 360) * PANORAMA_VIEW_DEGREES
        : 0;
      if (previous && angularGap > maxAngularGap) {
        if (current.length >= 2) {
          lines.push({
            points: pointString(current),
            opacity: 0.18 + (ringIndex / Math.max(1, ringCount - 1)) * 0.5,
          });
        }
        current = [];
      }
      current.push({ x: point.x, y: Math.max(topY, Math.min(baselineY, point.y)) });
    }
    if (current.length >= 2) {
      lines.push({
        points: pointString(current),
        opacity: 0.18 + (ringIndex / Math.max(1, ringCount - 1)) * 0.5,
      });
    }
  }
  return { faces, lines, elevationRangeM: { min: minM, max: maxM } };
}

function buildPanoramaMesh(
  entries: readonly {
    peak: PanoramaGipfel;
    profile: PanoramaProfilePoint[];
    peakDistanceKm?: number | null;
  }[],
  displayBearing: (peak: PanoramaGipfel) => number | null,
  observerElevationM: number | null,
  fixedAltitudeRangeM: PanoramaAltitudeRange | null,
  terrainModel: LocalTerrainModel | null,
  terrainBearing: (bearing: number) => number | null,
): PanoramaMesh {
  const terrainSurface = terrainModel
    ? buildTerrainSurface(terrainModel, terrainBearing)
    : { faces: [], lines: [], elevationRangeM: null };
  const validEntries = entries
    .map((entry) => ({
      ...entry,
      profile: entry.profile.filter(
        (point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.altM),
      ),
      bearing: displayBearing(entry.peak),
    }))
    .filter(
      (entry): entry is typeof entry & { bearing: number } =>
        entry.profile.length >= 2 && entry.bearing != null,
    );
  if (validEntries.length === 0) {
    return {
      peaks: [],
      triangles: [],
      terrainFaces: terrainSurface.faces,
      terrainLines: terrainSurface.lines,
      elevationRangeM: terrainSurface.elevationRangeM,
    };
  }

  const allAltitudes = fixedAltitudeRangeM
    ? []
    : validEntries.flatMap((entry) => entry.profile.map((point) => point.altM));
  const datum = Number.isFinite(observerElevationM)
    ? (observerElevationM as number)
    : fixedAltitudeRangeM?.minM
      ?? allAltitudes[0]
      ?? 0;
  const minAltitude = fixedAltitudeRangeM
    ? fixedAltitudeRangeM.minM - datum
    : Math.min(...allAltitudes.map((altitude) => altitude - datum));
  const maxAltitude = fixedAltitudeRangeM
    ? fixedAltitudeRangeM.maxM - datum
    : Math.max(...allAltitudes.map((altitude) => altitude - datum));
  const altitudeSpan = Math.max(40, maxAltitude - minAltitude);
  const baselineY = 274;
  const topY = 44;
  const sampleCount = 16;

  const meshPeaks = validEntries
    .sort((a, b) => {
      const aBearing = (a.bearing + 360) % 360;
      const bBearing = (b.bearing + 360) % 360;
      return aBearing - bBearing;
    })
    .map(({ peak, profile, peakDistanceKm, bearing }) => {
      const points = profile
        .slice()
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .filter((point) => point.distanceKm >= 0);
      const firstDistance = points[0]?.distanceKm ?? 0;
      const lastDistance = points[points.length - 1]?.distanceKm ?? 0;
      const distanceSpan = Math.max(0.001, lastDistance - firstDistance);
      const measuredPeakDistance = Number.isFinite(peakDistanceKm)
        ? Math.max(firstDistance, Math.min(lastDistance, peakDistanceKm as number))
        : lastDistance;
      const peakFraction = (measuredPeakDistance - firstDistance) / distanceSpan;
      const centerX = 180 + (bearing / PANORAMA_VIEW_DEGREES) * 360;
      const width = Math.max(48, Math.min(104, 108 - peak.distanceKm * 2.2));
      const yForDistance = (targetDistance: number) => {
        const sampledAltitude = interpolateProfileAltitude(points, targetDistance, datum);
        const relativeAltitude = sampledAltitude - datum;
        return Math.max(
          topY,
          Math.min(
            baselineY,
            baselineY -
              ((relativeAltitude - minAltitude) / altitudeSpan) * (baselineY - topY),
          ),
        );
      };
      const sampled = Array.from({ length: sampleCount }, (_, index) => {
        const fraction = index / (sampleCount - 1);
        const targetDistance = firstDistance + fraction * distanceSpan;
        return {
          x: centerX - width / 2 + fraction * width,
          y: yForDistance(targetDistance),
        };
      });
      const depth = Math.max(4, Math.min(8, width * 0.24));
      const peakPoint = {
        x: centerX - width / 2 + peakFraction * width,
        y: yForDistance(measuredPeakDistance),
      };
      return {
        peak,
        profile,
        centerX,
        points: sampled,
        peakPoint,
        lowerPoints: sampled.map((point) => ({
          x: point.x,
          y: Math.min(286, point.y + depth),
        })),
      };
    });

  const triangles: PanoramaMeshTriangle[] = [];
  for (const meshPeak of meshPeaks) {
    for (let index = 0; index < meshPeak.points.length - 1; index += 1) {
      const a = meshPeak.points[index];
      const b = meshPeak.points[index + 1];
      const c = meshPeak.lowerPoints[index + 1];
      const d = meshPeak.lowerPoints[index];
      if (!a || !b || !c || !d) continue;
      triangles.push(
        { points: pointString([a, b, c]), tone: index % 2 === 0 ? "light" : "dark" },
        { points: pointString([a, c, d]), tone: index % 2 === 0 ? "dark" : "light" },
      );
    }
  }

  return {
    peaks: meshPeaks,
    triangles,
    terrainFaces: terrainSurface.faces,
    terrainLines: terrainSurface.lines,
    elevationRangeM: terrainSurface.elevationRangeM ?? {
      min: minAltitude + datum,
      max: maxAltitude + datum,
    },
  };
}

export function PeakPanorama({
  peaks,
  terrainProfile = null,
  terrainModel = null,
  observerPosition = null,
  heading,
  observerElevationM = null,
  hasGps,
  strings,
  onCaptured,
  onCameraOpen,
}: PeakPanoramaProps) {
  const colors = useColors();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [selectedPeakId, setSelectedPeakId] = useState<string | null>(null);
  const [panOffsetDeg, setPanOffsetDeg] = useState(0);
  const panOffsetValueRef = useRef(0);
  const profileCacheRef = useRef<Map<string, CachedPanoramaProfile>>(new Map());
  const profileRequestsRef = useRef<Set<string>>(new Set());
  const profileObserverRef = useRef<LatLng | null>(null);
  const fixedElevationRangeRef = useRef<PanoramaAltitudeRange | null>(null);
  const [profileRevision, setProfileRevision] = useState(0);
  const [profilesComplete, setProfilesComplete] = useState(false);
  const [terrainGlReady, setTerrainGlReady] = useState(false);
  const [terrainTextureMode, setTerrainTextureMode] = useState<
    "map" | "satellite"
  >("satellite");
  const [terrainLoadPercent, setTerrainLoadPercent] = useState(
    terrainModel ? 100 : 8,
  );
  const panStartOffsetRef = useRef(0);
  panOffsetValueRef.current = panOffsetDeg;
  const viewCenterBearing = normalizeBearing((heading ?? 0) + panOffsetDeg);

  useEffect(() => {
    if (terrainModel) {
      setTerrainLoadPercent(100);
      return;
    }
    if (!hasGps) {
      setTerrainLoadPercent(0);
      return;
    }
    setTerrainLoadPercent(8);
    const timer = setInterval(() => {
      setTerrainLoadPercent((current) =>
        Math.min(92, current + Math.max(1, Math.round((92 - current) * 0.12))),
      );
    }, 300);
    return () => clearInterval(timer);
  }, [terrainModel, hasGps]);

  useEffect(() => {
    // Keep an already-created GL surface visible while a refreshed terrain
    // model arrives. Reset only when there is no model to render at all.
    if (!terrainModel) setTerrainGlReady(false);
  }, [terrainModel]);

  const displayBearing = (peak: PanoramaGipfel): number | null =>
    peak.relativeBearingDeg == null
      ? null
      : signedAngleDifference(peak.relativeBearingDeg - panOffsetDeg, 0);
  const terrainBearing = (bearing: number): number | null =>
    heading == null ? null : signedAngleDifference(bearing - heading - panOffsetDeg, 0);
  const visiblePeaks =
    heading == null
      ? []
      : peaks
          .map((peak) => ({ peak, relative: displayBearing(peak) }))
          .filter(
            (entry): entry is { peak: PanoramaGipfel; relative: number } =>
              entry.relative != null &&
              Math.abs(entry.relative) <= PANORAMA_VIEW_DEGREES / 2,
          )
          .sort((a, b) => a.peak.distanceKm - b.peak.distanceKm)
          .map(({ peak }) => peak);
  const profileCandidates = useMemo(
    () =>
      peaks
        .slice()
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, PANORAMA_PROFILE_LIMIT),
    [peaks],
  );
  if (!profileObserverRef.current && observerPosition) {
    profileObserverRef.current = observerPosition;
  }
  const profileObserver = profileObserverRef.current;
  const observerKey = profileObserver
    ? `${profileObserver.lat.toFixed(4)}:${profileObserver.lng.toFixed(4)}`
    : null;
  const profileCandidateIds = profileCandidates.map((peak) => peak.id).join("|");

  useEffect(() => {
    if (!profileObserver || !observerKey || profileCandidates.length === 0) return;
    const requestObserver = profileObserver;
    const requestObserverKey = observerKey;
    let cancelled = false;
    let activeController: AbortController | null = null;
    setProfilesComplete(false);
    fixedElevationRangeRef.current = null;
    const apiBase = process.env.EXPO_PUBLIC_DOMAIN
      ? `https://${process.env.EXPO_PUBLIC_DOMAIN.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`
      : "";

    const loadAllProfiles = async () => {
      while (!cancelled) {
        const missingPeaks = profileCandidates
          .filter((peak) => {
            const key = profileCacheKey(requestObserverKey, peak.id);
            return !profileCacheRef.current.has(key) && !profileRequestsRef.current.has(key);
          })
          .slice(0, PANORAMA_PROFILE_BATCH_SIZE);
        if (missingPeaks.length === 0) {
          setProfilesComplete(true);
          break;
        }

        const requestKeys = missingPeaks.map((peak) => profileCacheKey(requestObserverKey, peak.id));
        requestKeys.forEach((key) => profileRequestsRef.current.add(key));
        activeController =
          typeof AbortController !== "undefined" ? new AbortController() : null;

        try {
          // Der erste Netzwerkaufruf passiert direkt; Schwenken kann diese
          // Schleife nicht abbrechen, weil panOffset nicht in den Dependencies
          // dieses Effekts liegt.
          const response = await fetch(`${apiBase}/api/panorama-profiles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: activeController?.signal,
            body: JSON.stringify({
              observer: { lat: requestObserver.lat, lng: requestObserver.lng },
              peaks: missingPeaks.map((peak) => ({
                id: peak.id,
                lat: peak.lat,
                lng: peak.lng,
              })),
            }),
          });
          if (!response.ok) break;
          const payload = (await response.json()) as { profiles?: PanoramaProfile[] };
          if (cancelled || !payload.profiles) break;

          let added = false;
          for (const result of payload.profiles) {
            const profile = finiteProfile(result.profile);
            if (!profile || typeof result.peakId !== "string") continue;
            const peakDistanceKm = Number(result.peakDistanceKm);
            profileCacheRef.current.set(profileCacheKey(requestObserverKey, result.peakId), {
              points: profile,
              peakDistanceKm: Number.isFinite(peakDistanceKm) ? peakDistanceKm : null,
            });
            added = true;
          }
          if (added) setProfileRevision((revision) => revision + 1);
        } catch {
          // Ein fehlgeschlagener Batch beendet nur diesen Ladevorgang;
          // vorhandene Profile bleiben im Speicher und zeichnen weiter.
          break;
        } finally {
          requestKeys.forEach((key) => profileRequestsRef.current.delete(key));
          activeController = null;
        }
      }
    };

    void loadAllProfiles();
    return () => {
      cancelled = true;
      activeController?.abort();
    };
  }, [observerKey, profileCandidateIds]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Do not claim taps immediately: controls inside the panorama (such as
        // Karte/Sat) must receive them. Claim only an actual horizontal drag.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4,
        onPanResponderGrant: () => {
          panStartOffsetRef.current = panOffsetValueRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          // Eine Fingerbewegung nach links zeigt den Ausschnitt weiter rechts.
          const next = panStartOffsetRef.current - gesture.dx * 0.28;
          setPanOffsetDeg(
            Math.max(
              -PANORAMA_MAX_DRAG_DEGREES,
              Math.min(PANORAMA_MAX_DRAG_DEGREES, next),
            ),
          );
        },
      }),
    [heading, peaks.length],
  );
  const focusedPeak = visiblePeaks.find(
    (peak) =>
      displayBearing(peak) != null && Math.abs(displayBearing(peak) ?? 180) <= 18,
  );
  const targetPeak =
    visiblePeaks.find((peak) => peak.id === selectedPeakId) ??
    focusedPeak ??
    visiblePeaks[0];
  const annotatedPeakIds = useMemo(
    () =>
      new Set([
        ...visiblePeaks.slice(0, 3).map((peak) => peak.id),
        ...(targetPeak ? [targetPeak.id] : []),
      ]),
    [profileCandidateIds, targetPeak?.id],
  );
  const profileEntries = useMemo(
    () =>
      profileCandidates.flatMap((peak) => {
        const cachedProfile = observerKey
          ? profileCacheRef.current.get(profileCacheKey(observerKey, peak.id))
          : undefined;
        return cachedProfile
          ? [{
              peak,
              profile: cachedProfile.points,
              peakDistanceKm: cachedProfile.peakDistanceKm,
            }]
          : [];
      }),
    [observerKey, profileCandidateIds, profileCandidates, profileRevision],
  );
  const loadedProfileCount = profileCandidates.filter((peak) =>
    observerKey
      ? profileCacheRef.current.has(profileCacheKey(observerKey, peak.id))
      : false,
  ).length;
  const profileLoadPercent =
    profileCandidates.length > 0
      ? Math.round((loadedProfileCount / profileCandidates.length) * 100)
      : 0;
  if (profilesComplete && !fixedElevationRangeRef.current && profileEntries.length > 0) {
    const allAltitudes = profileEntries.flatMap((entry) =>
      entry.profile.map((point) => point.altM),
    );
    const summitAltitudes = profileEntries.map((entry) => {
      if (Number.isFinite(entry.peak.elevationM)) return entry.peak.elevationM as number;
      const fallbackDistance = entry.profile[entry.profile.length - 1]?.distanceKm ?? 0;
      const peakDistance = Number.isFinite(entry.peakDistanceKm)
        ? (entry.peakDistanceKm as number)
        : fallbackDistance;
      return interpolateProfileAltitude(entry.profile, peakDistance, fallbackDistance);
    });
    const minM = Math.min(...allAltitudes);
    const maxSummitM = Math.max(...summitAltitudes);
    fixedElevationRangeRef.current = {
      minM,
      maxM: Math.max(maxSummitM, minM + 40),
    };
  }
  const fixedElevationRange = fixedElevationRangeRef.current;
  const panoramaMesh = useMemo(
    () => buildPanoramaMesh(
      profileEntries,
      displayBearing,
      observerElevationM,
      fixedElevationRange,
      terrainModel,
      terrainBearing,
    ),
    [
      profileEntries,
      panOffsetDeg,
      observerElevationM,
      fixedElevationRange,
      terrainModel,
      heading,
    ],
  );
  const compassTicks = CARDINAL_DIRECTIONS.map((direction) => {
    const relative = signedAngleDifference(direction.bearing, viewCenterBearing);
    return {
      ...direction,
      relative,
      x: 180 + (relative / PANORAMA_VIEW_DEGREES) * 360,
    };
  }).filter((direction) => Math.abs(direction.relative) <= PANORAMA_VIEW_DEGREES / 2 + 8);
  let status = strings.noPeaks;
  if (!hasGps) status = strings.noGps;
  else if (heading == null) status = strings.needCompass;
  if (cameraBlocked) status = strings.cameraPermission;

  const toggleCamera = async () => {
    if (Platform.OS === "web") return;
    const permission = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    if (permission.granted) {
      setCameraBlocked(false);
      onCameraOpen?.();
    } else {
      setCameraBlocked(true);
    }
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
      ]}
      accessibilityLabel={strings.title}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.titleIcon, { backgroundColor: colors.glassHighlight }]}>
            <Feather name="triangle" size={14} color={colors.accent} />
          </View>
          <View>
            <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
              {strings.detected}
            </Text>
            <Text style={[styles.title, { color: colors.accent }]}>{strings.title}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {heading != null && (
            <View
              style={[
                styles.headingBadge,
                { backgroundColor: colors.glassBgStrong, borderColor: colors.glassBorder },
              ]}
            >
              <Feather name="navigation" size={12} color={colors.tint} />
              <Text style={[styles.heading, { color: colors.foreground }]}>
                {Math.round(heading)}°
              </Text>
            </View>
          )}
          {Platform.OS !== "web" && (
            <Pressable
              onPress={toggleCamera}
              style={[
                 styles.cameraButton,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Gipfel-AR öffnen"
            >
               <Feather
                 name="layers"
                 size={17}
                color={colors.primaryForeground}
              />
              <Text
                style={[
                  styles.cameraButtonText,
                  {
                    color: colors.primaryForeground,
                  },
                ]}
              >
                Gipfel-AR
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        {strings.hint}
      </Text>

      <View style={styles.signalRow}>
        <View
          style={[
            styles.signalPill,
            { backgroundColor: colors.glassBgStrong, borderColor: colors.glassBorder },
          ]}
        >
          <View
            style={[
              styles.signalDot,
              { backgroundColor: visiblePeaks.length > 0 ? colors.accent : colors.mutedForeground },
            ]}
          />
          <Text style={[styles.signalText, { color: colors.foreground }]} numberOfLines={1}>
            {visiblePeaks.length > 0 ? `${visiblePeaks.length} · ${strings.detected}` : status}
          </Text>
        </View>
        {heading == null ? (
          <Feather name="compass" size={16} color={colors.mutedForeground} />
        ) : (
          <Text style={[styles.viewAngle, { color: colors.mutedForeground }]}>
            {PANORAMA_TOTAL_DEGREES}°
          </Text>
        )}
      </View>
      {hasGps && !terrainModel && (
        <View
          style={styles.profileProgress}
          accessibilityLabel="Höhenprofil wird geladen"
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: terrainLoadPercent }}
        >
          <View style={styles.profileProgressHeader}>
            <Text style={[styles.profileProgressLabel, { color: colors.mutedForeground }]}>
              HÖHENPROFIL WIRD GELADEN
            </Text>
            <Text style={[styles.profileProgressCount, { color: colors.tint }]}>
              {terrainLoadPercent}%
            </Text>
          </View>
          <View style={[styles.profileProgressTrack, { backgroundColor: colors.glassHighlight }]}>
            <View
              style={[
                styles.profileProgressFill,
                { width: `${terrainLoadPercent}%`, backgroundColor: colors.accent },
              ]}
            />
          </View>
        </View>
      )}
      {visiblePeaks.length > 0 && (
        <View style={styles.peakRail}>
          {visiblePeaks.slice(0, 3).map((peak, index) => {
            const isSelected = targetPeak?.id === peak.id;
            return (
              <Pressable
                key={peak.id}
                onPress={() => setSelectedPeakId(peak.id)}
                style={[
                  styles.peakChip,
                  {
                    backgroundColor: isSelected
                      ? colors.glassHighlight
                      : colors.glassBgStrong,
                    borderColor: isSelected ? colors.primary : colors.glassBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${peak.name}, ${strings.distance(peak.distanceKm.toFixed(1))}`}
              >
                <View
                  style={[
                    styles.peakChipIndex,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.glassHighlight,
                    },
                  ]}
                >
                  <Text style={[styles.peakChipIndexText, { color: colors.primaryForeground }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.peakChipCopy}>
                  <Text
                    style={[styles.peakChipName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {peak.name}
                  </Text>
                  <Text style={[styles.peakChipDistance, { color: colors.mutedForeground }]}>
                    {strings.distance(peak.distanceKm.toFixed(1))}
                  </Text>
                </View>
                {isSelected && <Feather name="crosshair" size={13} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      )}

      <View
        style={[
          styles.skylineCard,
          { backgroundColor: colors.glassBgStrong, borderColor: colors.glassBorder },
        ]}
        {...panResponder.panHandlers}
        accessibilityLabel={strings.title}
      >
        {terrainModel && (
          <PeakTerrainGl
            terrainModel={terrainModel}
            bearingDeg={viewCenterBearing}
            textureMode={terrainTextureMode}
            backgroundColor={colors.glassBg}
            fallbackColor={colors.primary}
            onReady={() => setTerrainGlReady(true)}
          />
        )}
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 360 350"
          preserveAspectRatio="none"
        >
          <Rect
            x="0"
            y="0"
            width="360"
            height="350"
            fill={terrainGlReady ? "transparent" : colors.glassBg}
          />
          <Line x1="0" y1="205" x2="360" y2="205" stroke={colors.glassBorder} strokeWidth="1" />
          <Line x1="0" y1="274" x2="360" y2="274" stroke={colors.glassBorder} strokeWidth="1" />
          <G opacity={0.34}>
            <Line x1="90" y1="0" x2="90" y2="350" stroke={colors.glassBorder} strokeWidth="1" />
            <Line x1="180" y1="0" x2="180" y2="350" stroke={colors.accent} strokeWidth="1" />
            <Line x1="270" y1="0" x2="270" y2="350" stroke={colors.glassBorder} strokeWidth="1" />
          </G>
           {panoramaMesh.elevationRangeM && (
             <>
                <SvgText x="7" y="42" fill={colors.mutedForeground} fontSize="7" fontWeight="700">
                  SWISSTOPO DTM · 5 KM
               </SvgText>
               <SvgText x="7" y="54" fill={colors.mutedForeground} fontSize="7">
                  {`${Math.round(panoramaMesh.elevationRangeM.max)} m ü. M.`}
               </SvgText>
                <SvgText x="7" y="272" fill={colors.mutedForeground} fontSize="7">
                  {`${Math.round(panoramaMesh.elevationRangeM.min)} m ü. M.`}
               </SvgText>
             </>
           )}
          {compassTicks.map((direction) => (
            <G key={direction.label}>
              <Line
                x1={direction.x}
                y1="12"
                x2={direction.x}
                y2="338"
                stroke={colors.tint}
                strokeOpacity={0.24}
                strokeWidth="1"
                strokeDasharray="3 4"
              />
              <SvgText
                x={direction.x}
                y="16"
                fill={colors.tint}
                fontSize="9"
                fontWeight="700"
                textAnchor="middle"
              >
                {direction.label}
              </SvgText>
            </G>
          ))}
           {!terrainGlReady && panoramaMesh.terrainFaces.map((face, index) => (
             <Polygon
               key={`terrain-face-${index}`}
               points={face.points}
               fill={face.tone === "light" ? colors.primary : colors.accent}
               fillOpacity={face.opacity}
               stroke={colors.accent}
               strokeOpacity={0.16}
               strokeWidth="0.35"
             />
           ))}
           {!terrainGlReady && panoramaMesh.terrainLines.map((line, index) => (
             <Polyline
               key={`terrain-${index}`}
               points={line.points}
               fill="none"
               stroke={colors.accent}
               strokeOpacity={line.opacity}
               strokeWidth="1.15"
             />
           ))}
           <Line
             x1="180"
              y1="12"
             x2="180"
              y2="338"
             stroke={colors.primary}
             strokeOpacity={0.72}
             strokeWidth="1"
           />
           <SvgText x="180" y="29" fill={colors.primary} fontSize="7" fontWeight="700" textAnchor="middle">
             BLICK
           </SvgText>
        </Svg>
        <View
          style={[
            styles.terrainModeSwitch,
            {
              backgroundColor: colors.glassBgStrong,
              borderColor: colors.glassBorder,
            },
          ]}
        >
          {([
            ["map", "Karte"],
            ["satellite", "Sat"],
          ] as const).map(([mode, label]) => {
            const active = terrainTextureMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setTerrainTextureMode(mode)}
                style={[
                  styles.terrainModeButton,
                  active && { backgroundColor: colors.primary },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label} als Geländeoberfläche`}
              >
                <Text
                  style={[
                    styles.terrainModeLabel,
                    {
                      color: active
                        ? colors.primaryForeground
                        : colors.foreground,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  titleIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  headingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  heading: { fontFamily: fonts.monoBold, fontSize: 12 },
  cameraButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 11,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cameraButtonText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 9 },
  signalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 11,
    marginBottom: 1,
  },
  signalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    maxWidth: "84%",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  signalDot: { width: 6, height: 6, borderRadius: 3 },
  signalText: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  viewAngle: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.8 },
  profileProgress: { marginTop: 9, gap: 5 },
  profileProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileProgressLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 8,
    letterSpacing: 1,
  },
  profileProgressCount: { fontFamily: fonts.monoBold, fontSize: 9 },
  profileProgressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  profileProgressFill: { height: "100%", borderRadius: 3 },
  skylineCard: {
    flex: 1,
    minHeight: 350,
    marginTop: 7,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  terrainModeSwitch: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 5,
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 9,
    padding: 2,
  },
  terrainModeButton: {
    minWidth: 45,
    minHeight: 28,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  terrainModeLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  peakRail: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
  },
  peakChip: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 6,
  },
  peakChipIndex: {
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  peakChipIndexText: { fontFamily: fonts.monoBold, fontSize: 9 },
  peakChipCopy: { flex: 1, minWidth: 0 },
  peakChipName: { fontFamily: fonts.bodyBold, fontSize: 10 },
  peakChipDistance: { fontFamily: fonts.mono, fontSize: 8, marginTop: 2 },
  fullscreenCamera: { flex: 1, backgroundColor: "#000" },
  camera: { ...StyleSheet.absoluteFill },
  imageScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.17)",
  },
  scanLines: {
    ...StyleSheet.absoluteFill,
    opacity: 0.25,
  },
  scanLineTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "28%",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.35)",
  },
  scanLineMiddle: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "54%",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.25)",
  },
  scanLineBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "78%",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
  },
  horizon: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "54%",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.45)",
  },
  fullscreenTopBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  fullscreenTitle: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1.5 },
  fullscreenSubline: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  fullscreenHeading: { fontFamily: fonts.monoBold, fontSize: 11 },
  fullscreenTopActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  fullscreenHeadingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  fullscreenHeadingBadgeText: { fontFamily: fonts.monoBold, fontSize: 11 },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  marker: {
    position: "absolute",
    width: 130,
    alignItems: "center",
    transform: [{ translateX: -65 }],
  },
  markerLabel: {
    maxWidth: 130,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center",
  },
  markerPeak: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  markerName: { fontFamily: fonts.titleBold, fontSize: 12 },
  markerDistance: { fontFamily: fonts.mono, fontSize: 9, marginTop: 2 },
  markerStem: { width: 1, height: 42, opacity: 0.9 },
  centerLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
    opacity: 0.9,
  },
  imageFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(0,0,0,0.38)",
    paddingTop: 10,
  },
  captureArea: { alignItems: "center", justifyContent: "center" },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  captureButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  captureButtonText: { fontFamily: fonts.mono, fontSize: 9 },
  status: { flex: 1, fontFamily: fonts.body, fontSize: 12 },
});