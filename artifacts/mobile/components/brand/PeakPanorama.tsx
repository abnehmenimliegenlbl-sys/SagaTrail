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
import Svg, { Circle, G, Line, Polygon, Polyline, Rect, Text as SvgText } from "react-native-svg";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import type { PanoramaGipfel } from "@/lib/panorama";
import type { TerrainProfilePoint } from "@/lib/terrainCues";
import type { LocalTerrainModel } from "@/lib/terrainModel";
import type { LatLng, RecognitionJournalEntry } from "@/types";

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
  offlineData: string;
  onlineData: string;
  heightUnknown: string;
  dragPanorama: string;
  elevationAngle: (angle: string) => string;
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
  dataStatus?: {
    source: "online" | "offline";
    version?: number;
    peakCount?: number;
  } | null;
  strings: PeakPanoramaStrings;
  onCaptured?: (entry: RecognitionJournalEntry) => void | Promise<void>;
  onCameraOpen?: () => void;
}

type PanoramaProfilePoint = { distanceKm: number; altM: number };
type PanoramaProfile = {
  peakId: string;
  profile: PanoramaProfilePoint[];
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
};
type PanoramaMesh = {
  peaks: PanoramaMeshPeak[];
  triangles: PanoramaMeshTriangle[];
  elevationRangeM: { min: number; max: number } | null;
};

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

function buildPanoramaMesh(
  entries: readonly { peak: PanoramaGipfel; profile: PanoramaProfilePoint[] }[],
  displayBearing: (peak: PanoramaGipfel) => number | null,
  observerElevationM: number | null,
): PanoramaMesh {
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
    return { peaks: [], triangles: [], elevationRangeM: null };
  }

  const allAltitudes = validEntries.flatMap((entry) => entry.profile.map((point) => point.altM));
  const datum = Number.isFinite(observerElevationM)
    ? (observerElevationM as number)
    : allAltitudes[0] ?? 0;
  const minAltitude = Math.min(...allAltitudes.map((altitude) => altitude - datum));
  const maxAltitude = Math.max(...allAltitudes.map((altitude) => altitude - datum));
  const altitudeSpan = Math.max(40, maxAltitude - minAltitude);
  const baselineY = 164;
  const topY = 44;
  const sampleCount = 16;

  const meshPeaks = validEntries
    .sort((a, b) => a.bearing - b.bearing)
    .map(({ peak, profile, bearing }) => {
      const points = profile
        .slice()
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .filter((point) => point.distanceKm >= 0);
      const firstDistance = points[0]?.distanceKm ?? 0;
      const lastDistance = points[points.length - 1]?.distanceKm ?? 0;
      const distanceSpan = Math.max(0.001, lastDistance - firstDistance);
      const centerX = 180 + (bearing / PANORAMA_VIEW_DEGREES) * 360;
      const width = Math.max(48, Math.min(104, 108 - peak.distanceKm * 2.2));
      const sampled = Array.from({ length: sampleCount }, (_, index) => {
        const fraction = index / (sampleCount - 1);
        const targetDistance = firstDistance + fraction * distanceSpan;
        const sampledAltitude = interpolateProfileAltitude(points, targetDistance, datum);
        const relativeAltitude = sampledAltitude - datum;
        const y =
          baselineY -
          ((relativeAltitude - minAltitude) / altitudeSpan) * (baselineY - topY);
        return {
          x: centerX - width / 2 + fraction * width,
          y: Math.max(topY, Math.min(baselineY, y)),
        };
      });
      const depth = Math.max(4, Math.min(8, width * 0.24));
      return {
        peak,
        profile,
        centerX,
        points: sampled,
        lowerPoints: sampled.map((point) => ({
          x: point.x,
          y: Math.min(176, point.y + depth),
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

  // Zwischen nahen Sichtlinien entsteht ein echtes, zurückhaltendes Mesh.
  // Große Winkel-Lücken bleiben offen, damit keine Landschaft erfunden wird.
  for (let index = 0; index < meshPeaks.length - 1; index += 1) {
    const left = meshPeaks[index];
    const right = meshPeaks[index + 1];
    if (!left || !right || right.centerX - left.centerX > 132) continue;
    for (let pointIndex = 0; pointIndex < sampleCount - 1; pointIndex += 1) {
      const a = left.points[pointIndex];
      const b = right.points[pointIndex];
      const c = right.points[pointIndex + 1];
      const d = left.points[pointIndex + 1];
      if (!a || !b || !c || !d) continue;
      triangles.push(
        { points: pointString([a, b, c]), tone: "bridge" },
        { points: pointString([a, c, d]), tone: "bridge" },
      );
    }
  }
  return {
    peaks: meshPeaks,
    triangles,
    elevationRangeM: { min: minAltitude, max: maxAltitude },
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
  dataStatus = null,
  strings,
  onCaptured,
  onCameraOpen,
}: PeakPanoramaProps) {
  const colors = useColors();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [selectedPeakId, setSelectedPeakId] = useState<string | null>(null);
  const [panOffsetDeg, setPanOffsetDeg] = useState(0);
  const profileCacheRef = useRef<Map<string, PanoramaProfilePoint[]>>(new Map());
  const profileRequestsRef = useRef<Set<string>>(new Set());
  const [profileRevision, setProfileRevision] = useState(0);
  const panStartOffsetRef = useRef(0);
  const viewCenterBearing = normalizeBearing((heading ?? 0) + panOffsetDeg);
  const displayBearing = (peak: PanoramaGipfel): number | null =>
    peak.relativeBearingDeg == null
      ? null
      : signedAngleDifference(peak.relativeBearingDeg - panOffsetDeg, 0);
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
  const profileCandidates = visiblePeaks.slice(0, PANORAMA_PROFILE_LIMIT);
  const observerKey = observerPosition
    ? `${observerPosition.lat.toFixed(4)}:${observerPosition.lng.toFixed(4)}`
    : null;
  const profileCandidateIds = profileCandidates.map((peak) => peak.id).join("|");

  useEffect(() => {
    if (!observerPosition || !observerKey || profileCandidates.length === 0) return;
    const requestObserver = observerPosition;
    const requestObserverKey = observerKey;

    const missingPeaks = profileCandidates
      .filter((peak) => {
        const key = profileCacheKey(requestObserverKey, peak.id);
        return !profileCacheRef.current.has(key) && !profileRequestsRef.current.has(key);
      })
      .slice(0, PANORAMA_PROFILE_BATCH_SIZE);
    if (missingPeaks.length === 0) return;

    const requestKeys = missingPeaks.map((peak) => profileCacheKey(requestObserverKey, peak.id));
    requestKeys.forEach((key) => profileRequestsRef.current.add(key));
    let cancelled = false;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const apiBase = process.env.EXPO_PUBLIC_DOMAIN
      ? `https://${process.env.EXPO_PUBLIC_DOMAIN.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`
      : "";

    void fetch(`${apiBase}/api/panorama-profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller?.signal,
      body: JSON.stringify({
        observer: { lat: requestObserver.lat, lng: requestObserver.lng },
        peaks: missingPeaks.map((peak) => ({
          id: peak.id,
          lat: peak.lat,
          lng: peak.lng,
        })),
      }),
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { profiles?: PanoramaProfile[] };
      })
      .then((payload) => {
        if (cancelled || !payload?.profiles) return;
        let added = false;
        for (const result of payload.profiles) {
          const profile = finiteProfile(result.profile);
          if (!profile || typeof result.peakId !== "string") continue;
          profileCacheRef.current.set(profileCacheKey(requestObserverKey, result.peakId), profile);
          added = true;
        }
        if (added) setProfileRevision((revision) => revision + 1);
      })
      .catch(() => {
        // Fehlende Profile sind ein zulässiger Teilzustand; der Marker bleibt sichtbar.
      })
      .finally(() => {
        requestKeys.forEach((key) => profileRequestsRef.current.delete(key));
      });

    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, [observerKey, profileCandidateIds, profileRevision]);

  const loadedProfileCount = useMemo(
    () =>
      profileCandidates.filter((peak) =>
        observerKey
          ? profileCacheRef.current.has(profileCacheKey(observerKey, peak.id))
          : false,
      ).length,
    [observerKey, profileCandidateIds, profileRevision],
  );
  const panoramaHasHeight = visiblePeaks.some((peak) => peak.elevationAngleDeg != null);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => heading != null && peaks.length > 0,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4,
        onPanResponderGrant: () => {
          panStartOffsetRef.current = panOffsetDeg;
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
    [heading, panOffsetDeg, peaks.length],
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
        const profile = observerKey
          ? profileCacheRef.current.get(profileCacheKey(observerKey, peak.id))
          : undefined;
        return profile ? [{ peak, profile }] : [];
      }),
    [observerKey, profileCandidateIds, profileRevision],
  );
  const panoramaMesh = useMemo(
    () => buildPanoramaMesh(profileEntries, displayBearing, observerElevationM),
    [profileEntries, panOffsetDeg, observerElevationM],
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
                 accessibilityLabel="AR öffnen"
            >
               <Feather
                 name="layers"
                size={14}
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
                AR
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
      <View style={styles.dataRow}>
        <View style={[styles.dataBadge, { borderColor: colors.glassBorder }]}>
          <Feather
            name={dataStatus?.source === "offline" ? "download-cloud" : "database"}
            size={11}
            color={colors.tint}
          />
          <Text style={[styles.dataText, { color: colors.mutedForeground }]}>
            {dataStatus?.source === "offline" ? strings.offlineData : strings.onlineData}
            {dataStatus?.version ? ` · v${dataStatus.version}` : ""}
          </Text>
        </View>
        <Text style={[styles.dataText, { color: colors.mutedForeground }]}>
          {dataStatus?.peakCount ?? peaks.length} {strings.detected.toLocaleLowerCase()}
        </Text>
      </View>

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
        <Svg width="100%" height={220} viewBox="0 0 360 220">
          <Rect x="0" y="0" width="360" height="220" fill={colors.glassBg} />
          <Line x1="0" y1="129" x2="360" y2="129" stroke={colors.glassBorder} strokeWidth="1" />
          <Line x1="0" y1="166" x2="360" y2="166" stroke={colors.glassBorder} strokeWidth="1" />
          <G opacity={0.34}>
            <Line x1="90" y1="0" x2="90" y2="220" stroke={colors.glassBorder} strokeWidth="1" />
            <Line x1="180" y1="0" x2="180" y2="220" stroke={colors.accent} strokeWidth="1" />
            <Line x1="270" y1="0" x2="270" y2="220" stroke={colors.glassBorder} strokeWidth="1" />
          </G>
           {panoramaMesh.elevationRangeM && (
             <>
               <SvgText x="7" y="42" fill={colors.mutedForeground} fontSize="7" fontWeight="700">
                 HÖHENPROFIL
               </SvgText>
               <SvgText x="7" y="54" fill={colors.mutedForeground} fontSize="7">
                 {`+${Math.round(panoramaMesh.elevationRangeM.max)} m`}
               </SvgText>
               <SvgText x="7" y="162" fill={colors.mutedForeground} fontSize="7">
                 {`${Math.round(panoramaMesh.elevationRangeM.min)} m`}
               </SvgText>
             </>
           )}
          {compassTicks.map((direction) => (
            <G key={direction.label}>
              <Line
                x1={direction.x}
                y1="22"
                x2={direction.x}
                y2="166"
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
           {panoramaMesh.triangles.map((triangle, index) => (
             <Polygon
               key={`mesh-${index}`}
               points={triangle.points}
               fill={
                 triangle.tone === "bridge"
                   ? colors.tint
                   : triangle.tone === "light"
                     ? colors.glassHighlight
                     : colors.accent
               }
               fillOpacity={triangle.tone === "bridge" ? 0.13 : 0.38}
                stroke="none"
             />
           ))}
           {panoramaMesh.peaks.map((meshPeak) => {
             const tip = meshPeak.points[meshPeak.points.length - 1];
             if (!tip) return null;
             const isAnnotated = annotatedPeakIds.has(meshPeak.peak.id);
             return (
               <G key={`profile-${meshPeak.peak.id}`}>
                 <Polyline
                   points={pointString(meshPeak.points)}
                   fill="none"
                   stroke={colors.accent}
                   strokeOpacity={isAnnotated ? 0.9 : 0.3}
                   strokeWidth={isAnnotated ? 1.5 : 0.65}
                 />
                 <Line
                   x1={tip.x}
                   y1={tip.y}
                   x2={meshPeak.lowerPoints[meshPeak.lowerPoints.length - 1]?.x ?? tip.x}
                   y2={meshPeak.lowerPoints[meshPeak.lowerPoints.length - 1]?.y ?? tip.y}
                   stroke={colors.accent}
                   strokeOpacity={0.65}
                   strokeWidth="1"
                 />
                 <Circle
                   cx={tip.x}
                   cy={tip.y}
                   r={isAnnotated ? 4 : 2.2}
                   fill={isAnnotated ? colors.primary : colors.accent}
                   fillOpacity={isAnnotated ? 1 : 0.72}
                 />
                 {isAnnotated && meshPeak.centerX > -18 && meshPeak.centerX < 378 && (
                   <SvgText
                     x={meshPeak.centerX}
                     y={Math.max(30, tip.y - 9)}
                     fill={colors.foreground}
                     fontSize="8"
                     fontWeight="600"
                     textAnchor="middle"
                   >
                     {meshPeak.peak.name.length > 15
                       ? `${meshPeak.peak.name.slice(0, 14)}…`
                       : meshPeak.peak.name}
                   </SvgText>
                 )}
               </G>
             );
           })}
            {panoramaMesh.peaks.slice(0, -1).map((leftPeak, index) => {
              const rightPeak = panoramaMesh.peaks[index + 1];
              const leftTip = leftPeak?.points[leftPeak.points.length - 1];
              const rightTip = rightPeak?.points[rightPeak.points.length - 1];
              if (
                !rightPeak ||
                !leftTip ||
                !rightTip ||
                rightPeak.centerX - leftPeak.centerX > 132
              ) {
                return null;
              }
              return (
                <Line
                  key={`ridge-${leftPeak.peak.id}-${rightPeak.peak.id}`}
                  x1={leftTip.x}
                  y1={leftTip.y}
                  x2={rightTip.x}
                  y2={rightTip.y}
                  stroke={colors.accent}
                  strokeOpacity={0.5}
                  strokeWidth="1"
                />
              );
            })}
           <Line
             x1="180"
             y1="23"
             x2="180"
             y2="166"
             stroke={colors.primary}
             strokeOpacity={0.72}
             strokeWidth="1"
           />
           <SvgText x="180" y="29" fill={colors.primary} fontSize="7" fontWeight="700" textAnchor="middle">
             BLICK
           </SvgText>
          <SvgText x="180" y="191" fill={colors.mutedForeground} fontSize="8" textAnchor="middle">
            {panoramaHasHeight && targetPeak?.elevationAngleDeg != null
              ? strings.elevationAngle(`${targetPeak.elevationAngleDeg.toFixed(1)}°`)
              : strings.heightUnknown}
          </SvgText>
             {profileCandidates.length > 0 && (
             <SvgText x="180" y="177" fill={colors.mutedForeground} fontSize="8" textAnchor="middle">
                {`${loadedProfileCount}/${profileCandidates.length} SwissTopo-Höhenprofile`}
             </SvgText>
           )}
          <SvgText x="180" y="207" fill={colors.mutedForeground} fontSize="8" textAnchor="middle">
            {strings.dragPanorama}
          </SvgText>
        </Svg>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
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
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cameraButtonText: { fontFamily: fonts.mono, fontSize: 9 },
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 9 },
  signalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 11,
    marginBottom: 1,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
  },
  dataBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  dataText: { fontFamily: fonts.mono, fontSize: 8 },
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
  skylineCard: {
    height: 220,
    marginTop: 11,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
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