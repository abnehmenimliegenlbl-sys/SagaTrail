import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { captureRef } from "react-native-view-shot";
import { useMemo, useRef, useState } from "react";
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { DimensionValue } from "react-native";
import Svg, { Circle, G, Line, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@clerk/expo";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import type { PanoramaGipfel } from "@/lib/panorama";
import type { TerrainProfilePoint } from "@/lib/terrainCues";
import { useObjectRecognitionStrings } from "@/lib/i18n/objectRecognition";
import { persistJournalImage } from "@/lib/journalMedia";
import { useApp } from "@/contexts/AppContext";
import type { RecognitionJournalEntry } from "@/types";
import { ObjectRecognition, type ObjectRecognitionProps } from "./ObjectRecognition";
import { PeakArNavigator } from "./PeakArNavigator";

const PANORAMA_VIEW_DEGREES = 140;
const TERRAIN_PREVIEW_WIDTH = 360;
const TERRAIN_PREVIEW_HEIGHT = 190;

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
}

interface PeakPanoramaProps {
  peaks: PanoramaGipfel[];
  terrainProfile?: readonly TerrainProfilePoint[] | null;
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
  /** Authenticated visual recognition entry shown directly in the panorama card. */
  recognition?: Omit<ObjectRecognitionProps, "onAnalyzed" | "nearbyContext" | "recognitionContext" | "journalKind">;
}

function Terrain3DPreview({ profile }: { profile: readonly TerrainProfilePoint[] }) {
  const colors = useColors();
  const samples = useMemo(() => {
    const valid = profile
      .filter((point) => Number.isFinite(point.distanceKm) && Number.isFinite(point.altM))
      .sort((a, b) => a.distanceKm - b.distanceKm);
    if (valid.length <= 24) return valid;
    const step = (valid.length - 1) / 23;
    return Array.from({ length: 24 }, (_, index) => valid[Math.round(index * step)]);
  }, [profile]);

  if (samples.length < 2) return null;

  const minElevation = Math.min(...samples.map((point) => point.altM));
  const maxElevation = Math.max(...samples.map((point) => point.altM));
  const elevationRange = Math.max(1, maxElevation - minElevation);
  const startDistance = samples[0].distanceKm;
  const endDistance = samples[samples.length - 1].distanceKm;
  const distanceRange = Math.max(0.01, endDistance - startDistance);
  const front = samples.map((point) => ({
    x: 16 + ((point.distanceKm - startDistance) / distanceRange) * 328,
    y: 147 - ((point.altM - minElevation) / elevationRange) * 92,
  }));
  const back = front.map((point) => ({ x: point.x + 28, y: point.y + 23 }));
  const terrainSurface = [
    ...front.map((point) => `${point.x},${point.y}`),
    ...back.slice().reverse().map((point) => `${point.x},${point.y}`),
  ].join(" ");

  return (
    <View
      style={[
        styles.terrain3dCard,
        { backgroundColor: colors.glassBgStrong, borderColor: colors.glassBorder },
      ]}
    >
      <View style={styles.terrain3dHeader}>
        <View style={styles.terrain3dTitleRow}>
          <Feather name="layers" size={14} color={colors.accent} />
          <Text style={[styles.terrain3dTitle, { color: colors.foreground }]}>3D TERRAIN</Text>
        </View>
        <Text style={[styles.terrain3dMeta, { color: colors.mutedForeground }]}>
          SwissTopo · {Math.round(minElevation)}–{Math.round(maxElevation)} m
        </Text>
      </View>
      <Svg
        width="100%"
        height={TERRAIN_PREVIEW_HEIGHT}
        viewBox={`0 0 ${TERRAIN_PREVIEW_WIDTH} ${TERRAIN_PREVIEW_HEIGHT}`}
        accessibilityLabel="3D-Terrain-Höhenprofil"
      >
        <Rect
          x="0"
          y="0"
          width={TERRAIN_PREVIEW_WIDTH}
          height={TERRAIN_PREVIEW_HEIGHT}
          fill={colors.glassBg}
        />
        <G opacity={0.28}>
          {[55, 101, 147].map((y) => (
            <Line
              key={y}
              x1="0"
              y1={y}
              x2={TERRAIN_PREVIEW_WIDTH}
              y2={y}
              stroke={colors.glassBorder}
              strokeWidth="1"
            />
          ))}
        </G>
        <Polygon points={terrainSurface} fill={colors.glassHighlight} opacity={0.72} />
        {front.slice(0, -1).map((point, index) => {
          const next = front[index + 1];
          const nextBack = back[index + 1];
          const backPoint = back[index];
          return (
            <Polygon
              key={`terrain-segment-${index}`}
              points={`${point.x},${point.y} ${next.x},${next.y} ${nextBack.x},${nextBack.y} ${backPoint.x},${backPoint.y}`}
              fill={index % 2 === 0 ? colors.primary : colors.accent}
              opacity={0.14}
            />
          );
        })}
        <Line
          x1={front[0].x}
          y1={front[0].y}
          x2={front[front.length - 1].x}
          y2={front[front.length - 1].y}
          stroke={colors.primary}
          strokeWidth="2"
        />
        {front.map((point, index) => (
          <Line
            key={`terrain-depth-${index}`}
            x1={point.x}
            y1={point.y}
            x2={back[index].x}
            y2={back[index].y}
            stroke={colors.accent}
            strokeOpacity={0.42}
            strokeWidth="1"
          />
        ))}
        <Line
          x1={back[0].x}
          y1={back[0].y}
          x2={back[back.length - 1].x}
          y2={back[back.length - 1].y}
          stroke={colors.accent}
          strokeOpacity={0.62}
          strokeWidth="1"
        />
        <SvgText x="16" y="178" fill={colors.mutedForeground} fontSize="8">
          ROUTE
        </SvgText>
        <SvgText x="344" y="178" fill={colors.mutedForeground} fontSize="8" textAnchor="end">
          {endDistance.toFixed(1)} km
        </SvgText>
      </Svg>
    </View>
  );
}

export function PeakPanorama({
  peaks,
  terrainProfile = null,
  heading,
  observerElevationM = null,
  hasGps,
  dataStatus = null,
  strings,
  onCaptured,
  recognition,
}: PeakPanoramaProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { premium, language } = useApp();
  const { getToken } = useAuth();
  const objectRecognitionStrings = useObjectRecognitionStrings();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [arUnavailable, setArUnavailable] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [selectedPeakId, setSelectedPeakId] = useState<string | null>(null);
  const [panOffsetDeg, setPanOffsetDeg] = useState(0);
  const panStartOffsetRef = useRef(0);
  const cameraRef = useRef<CameraView>(null);
  const cameraFrameRef = useRef<View>(null);
  const visiblePeaks =
    heading == null
      ? []
      : peaks
          .filter(
            (peak) =>
              peak.relativeBearingDeg != null &&
              Math.abs(peak.relativeBearingDeg - panOffsetDeg) <= PANORAMA_VIEW_DEGREES / 2,
          )
          .slice(0, 4);
  const panoramaHasHeight = visiblePeaks.some((peak) => peak.elevationAngleDeg != null);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => visiblePeaks.length > 0,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 4,
        onPanResponderGrant: () => {
          panStartOffsetRef.current = panOffsetDeg;
        },
        onPanResponderMove: (_, gesture) => {
          // Eine Fingerbewegung nach links zeigt den Ausschnitt weiter rechts.
          const next = panStartOffsetRef.current - gesture.dx * 0.28;
          setPanOffsetDeg(Math.max(-70, Math.min(70, next)));
        },
      }),
    [panOffsetDeg, visiblePeaks.length],
  );
  const focusedPeak = visiblePeaks.find(
    (peak) =>
      peak.relativeBearingDeg != null &&
      Math.abs(peak.relativeBearingDeg) <= 18,
  );
  const targetPeak =
    visiblePeaks.find((peak) => peak.id === selectedPeakId) ??
    focusedPeak ??
    visiblePeaks[0];
  const markerPosition = (relativeBearingDeg: number): DimensionValue => {
    const percentage =
      50 + ((relativeBearingDeg - panOffsetDeg) / PANORAMA_VIEW_DEGREES) * 100;
    return `${Math.max(8, Math.min(92, percentage))}%`;
  };
  const skylinePeaks = visiblePeaks.slice(0, 6);
  const skylineX = (peak: PanoramaGipfel) =>
    180 + (((peak.relativeBearingDeg ?? 0) - panOffsetDeg) / PANORAMA_VIEW_DEGREES) * 360;
  const skylineY = (peak: PanoramaGipfel) => {
    const angle = peak.elevationAngleDeg ?? 0;
    return Math.max(43, Math.min(149, 129 - angle * 5.2));
  };
  const peakRecognition = recognition ?? {
    premium,
    strings: objectRecognitionStrings,
    getToken,
    language,
    heading,
  };

  let status = strings.noPeaks;
  if (!hasGps) status = strings.noGps;
  else if (heading == null) status = strings.needCompass;
  if (cameraBlocked) status = strings.cameraPermission;
  else if (arUnavailable) status = strings.arUnavailable;

  const toggleCamera = async () => {
    if (cameraEnabled) {
      setCameraEnabled(false);
      return;
    }
    if (Platform.OS === "web") return;
    const permission = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    if (permission.granted) {
      setCameraBlocked(false);
      setArUnavailable(false);
      setCameraEnabled(true);
    } else {
      setCameraBlocked(true);
    }
  };

  const capturePeakRecognition = async () => {
    if (recognition || capturing || visiblePeaks.length === 0 || !onCaptured) return;
    setCapturing(true);
    try {
      // Das gesamte AR-/Kamera-Bild mit den eingeblendeten Hinweisen
      // festhalten. Falls die native AR-Oberflaeche keinen View-Snapshot
      // erlaubt, liefert die Fallback-Kamera ihr Rohbild.
      let snapshotUri: string | null = null;
      try {
        if (cameraFrameRef.current) {
          snapshotUri = await captureRef(cameraFrameRef, {
            format: "jpg",
            quality: 0.82,
            result: "tmpfile",
          });
        }
      } catch {
        snapshotUri = null;
      }
      if (!snapshotUri && cameraRef.current) {
        const picture = await cameraRef.current.takePictureAsync({
          quality: 0.82,
          skipProcessing: true,
        });
        snapshotUri = picture?.uri ?? null;
      }
      if (!snapshotUri) return;

      const persistentUri = await persistJournalImage(snapshotUri, "peak");
      const peakText = visiblePeaks
        .map(
          (peak) =>
            `${peak.name} — ${strings.distance(peak.distanceKm.toFixed(1))}`,
        )
        .join("\n");
      await onCaptured({
        id: `recognition-peak-${Date.now()}`,
        kind: "peak",
        photoUri: persistentUri,
        title: targetPeak?.name ?? strings.title,
        text: peakText,
        capturedAt: Date.now(),
      });
    } finally {
      setCapturing(false);
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
              accessibilityLabel={cameraEnabled ? strings.cameraOff : strings.camera}
            >
              <Feather
                name={cameraEnabled ? "x" : "camera"}
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
                {cameraEnabled ? strings.cameraOff : strings.camera}
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
            {PANORAMA_VIEW_DEGREES}°
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

      {terrainProfile && terrainProfile.length >= 2 && (
        <Terrain3DPreview profile={terrainProfile} />
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
          {skylinePeaks
            .slice()
            .sort((a, b) => skylineX(a) - skylineX(b))
            .map((peak, index) => {
              const x = skylineX(peak);
              const y = skylineY(peak);
              const width = Math.max(24, Math.min(62, 50 - peak.distanceKm * 1.2));
              const fill = index % 2 === 0 ? colors.glassHighlight : colors.glassBgStrong;
              return (
                <G key={peak.id}>
                  <Polygon
                    points={`${x - width},166 ${x},${y} ${x + width},166`}
                    fill={fill}
                    stroke={colors.accent}
                    strokeOpacity={0.5}
                    strokeWidth="1"
                  />
                  <Line x1={x} y1={y} x2={x} y2="166" stroke={colors.accent} strokeOpacity={0.45} />
                  <Circle cx={x} cy={y} r="3.5" fill={colors.primary} />
                  {x > -18 && x < 378 && (
                    <SvgText
                      x={x}
                      y={Math.max(30, y - 10)}
                      fill={colors.foreground}
                      fontSize="9"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {peak.name.length > 16 ? `${peak.name.slice(0, 15)}…` : peak.name}
                    </SvgText>
                  )}
                </G>
              );
            })}
          <SvgText x="180" y="191" fill={colors.mutedForeground} fontSize="8" textAnchor="middle">
            {panoramaHasHeight && targetPeak?.elevationAngleDeg != null
              ? strings.elevationAngle(`${targetPeak.elevationAngleDeg.toFixed(1)}°`)
              : strings.heightUnknown}
          </SvgText>
          <SvgText x="180" y="207" fill={colors.mutedForeground} fontSize="8" textAnchor="middle">
            {strings.dragPanorama}
          </SvgText>
        </Svg>
      </View>

      <View
        style={[
          styles.cameraPrompt,
          {
            backgroundColor: colors.glassBgStrong,
            borderColor: colors.glassBorder,
          },
        ]}
      >
        <View style={styles.previewSky}>
          <View style={[styles.mountainFar, { borderBottomColor: colors.glassHighlight }]} />
          <View style={[styles.mountainNear, { borderBottomColor: colors.accent }]} />
          <View style={[styles.previewSun, { backgroundColor: colors.tint }]} />
          <View style={[styles.previewCrosshair, { borderColor: colors.glassHighlight }]}>
            <View style={[styles.previewCrosshairDot, { backgroundColor: colors.accent }]} />
          </View>
        </View>
        <View style={styles.promptCopy}>
          <View style={styles.promptTitleRow}>
            <Feather name="camera" size={16} color={colors.accent} />
            <Text style={[styles.promptTitle, { color: colors.foreground }]}>
              {strings.camera}
            </Text>
          </View>
          <Text style={[styles.promptStatus, { color: colors.mutedForeground }]} numberOfLines={2}>
            {status}
          </Text>
        </View>
      </View>

      <Modal
        visible={cameraEnabled && cameraPermission?.granted === true}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setCameraEnabled(false)}
      >
        <View ref={cameraFrameRef} style={styles.fullscreenCamera} collapsable={false}>
          {arUnavailable ? (
            <CameraView ref={cameraRef} facing="back" style={styles.camera} />
          ) : (
            <PeakArNavigator
              peaks={visiblePeaks}
              terrainProfile={terrainProfile}
              onError={() => setArUnavailable(true)}
            />
          )}
          <View style={styles.imageScrim} />
          <View pointerEvents="none" style={styles.scanLines}>
            <View style={styles.scanLineTop} />
            <View style={styles.scanLineMiddle} />
            <View style={styles.scanLineBottom} />
          </View>
          <View style={styles.horizon} />
          {arUnavailable &&
            visiblePeaks.map((peak, index) => (
              <Pressable
                key={peak.id}
                style={[
                  styles.marker,
                  {
                    left: markerPosition(peak.relativeBearingDeg ?? 0),
                    top: insets.top + 82 + (index % 3) * 42,
                  },
                ]}
                onPress={() => setSelectedPeakId(peak.id)}
                accessibilityRole="button"
                  accessibilityLabel={`${peak.name}, ${strings.distance(peak.distanceKm.toFixed(1))}${peak.elevationM != null ? `, ${Math.round(peak.elevationM)} m ü. M.` : ""}`}
              >
                <View
                  style={[
                    styles.markerLabel,
                    {
                      backgroundColor: colors.glassBgStrong,
                      borderColor:
                        targetPeak?.id === peak.id
                          ? colors.primary
                          : colors.glassBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.markerPeak,
                      {
                        backgroundColor:
                          targetPeak?.id === peak.id
                            ? colors.primary
                            : colors.glassBgStrong,
                        borderColor:
                          targetPeak?.id === peak.id
                            ? colors.primary
                            : colors.glassBorder,
                      },
                    ]}
                  >
                    <Feather name="triangle" size={11} color={colors.photoScrimText} />
                  </View>
                  <Text
                    style={[styles.markerName, { color: colors.photoScrimText }]}
                    numberOfLines={1}
                  >
                    {peak.name}
                  </Text>
                  <Text
                    style={[styles.markerDistance, { color: colors.photoScrimMuted }]}
                  >
                    {strings.distance(peak.distanceKm.toFixed(1))}
                    {peak.elevationM != null ? ` · ${Math.round(peak.elevationM)} m` : ""}
                  </Text>
                </View>
                <View
                  style={[
                    styles.markerStem,
                    {
                      backgroundColor:
                        focusedPeak?.id === peak.id
                          ? colors.primary
                          : colors.photoScrimText,
                    },
                  ]}
                />
              </Pressable>
            ))}
          {heading != null && (
            <View
              style={[styles.centerLine, { backgroundColor: colors.primary }]}
            />
          )}
          <View
            style={[
              styles.fullscreenTopBar,
              { paddingTop: insets.top + 12 },
            ]}
          >
            <View>
              <Text style={[styles.fullscreenTitle, { color: colors.photoScrimText }]}>
                {strings.title}
              </Text>
              <View style={styles.fullscreenSubline}>
                <View style={[styles.liveDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.fullscreenHeading, { color: colors.photoScrimMuted }]}>
                  {heading != null ? `${Math.round(heading)}°` : status}
                </Text>
              </View>
            </View>
            <View style={styles.fullscreenTopActions}>
              {heading != null && (
                <View
                  style={[
                    styles.fullscreenHeadingBadge,
                    {
                      backgroundColor: colors.glassBgStrong,
                      borderColor: colors.glassBorder,
                    },
                  ]}
                >
                  <Feather name="navigation" size={12} color={colors.tint} />
                  <Text style={[styles.fullscreenHeadingBadgeText, { color: colors.photoScrimText }]}>
                    {Math.round(heading)}°
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => setCameraEnabled(false)}
                style={[
                  styles.closeButton,
                  { backgroundColor: colors.glassBgStrong, borderColor: colors.glassBorder },
                ]}
                accessibilityRole="button"
                accessibilityLabel={strings.cameraOff}
              >
                <Feather name="x" size={20} color={colors.photoScrimText} />
              </Pressable>
            </View>
          </View>
          <View
            style={[
              styles.imageFooter,
              { paddingBottom: insets.bottom + 12 },
            ]}
          >
            <Feather
              name={targetPeak ? "crosshair" : "compass"}
              size={15}
              color={colors.photoScrimText}
            />
            <Text style={[styles.status, { color: colors.photoScrimText }]} numberOfLines={2}>
              {targetPeak
                ? `${strings.detected}: ${targetPeak.name}`
                : status}
            </Text>
            <View style={styles.captureArea}>
              <Pressable
                onPress={() => void capturePeakRecognition()}
                disabled={Boolean(recognition) || capturing || visiblePeaks.length === 0}
                style={[
                  styles.captureButton,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                    opacity: recognition || capturing || visiblePeaks.length === 0 ? 0.45 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={strings.capture}
              >
                <View style={[styles.captureButtonInner, { borderColor: colors.primaryForeground }]} />
                <Text style={[styles.captureButtonText, { color: colors.primaryForeground }]}>
                  {capturing ? "…" : strings.capture}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {Platform.OS !== "web" && peakRecognition ? (
        <ObjectRecognition
          {...peakRecognition}
          journalKind="peak"
          recognitionContext={[
            "Mountain peak recognition only.",
            "Return at most three cautious candidates.",
            "Use only peaks plausibly visible from the current position and heading; do not use distant POIs as proof.",
            peaks.length > 0
              ? `Nearby mapped peak hints (not proof): ${peaks
                  .slice(0, 3)
                  .map((peak) => `${peak.name} (${peak.distanceKm.toFixed(1)} km)`)
                  .join(", ")}`
              : "",
          ].join(" ")}
          onAnalyzed={onCaptured}
        />
      ) : null}
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
  terrain3dCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  terrain3dHeader: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    gap: 8,
  },
  terrain3dTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  terrain3dTitle: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.2 },
  terrain3dMeta: { fontFamily: fonts.mono, fontSize: 8, flexShrink: 1, textAlign: "right" },
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
  cameraPrompt: {
    minHeight: 116,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden",
  },
  previewSky: {
    width: 112,
    minHeight: 116,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-end",
  },
  previewSun: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    top: 17,
    right: 18,
    opacity: 0.8,
  },
  mountainFar: {
    position: "absolute",
    bottom: -20,
    left: -14,
    width: 92,
    height: 92,
    borderLeftWidth: 46,
    borderRightWidth: 46,
    borderBottomWidth: 92,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    opacity: 0.24,
    transform: [{ rotate: "-7deg" }],
  },
  mountainNear: {
    position: "absolute",
    bottom: -29,
    right: -18,
    width: 108,
    height: 108,
    borderLeftWidth: 54,
    borderRightWidth: 54,
    borderBottomWidth: 108,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    opacity: 0.18,
    transform: [{ rotate: "8deg" }],
  },
  previewCrosshair: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    left: 35,
    top: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCrosshairDot: { width: 5, height: 5, borderRadius: 3 },
  promptCopy: { flex: 1, justifyContent: "center", paddingHorizontal: 14, gap: 5 },
  promptTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  promptTitle: { fontFamily: fonts.titleBold, fontSize: 15 },
  promptStatus: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, paddingRight: 4 },
  fullscreenCamera: { flex: 1, backgroundColor: "#000" },
  camera: { ...StyleSheet.absoluteFillObject },
  imageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.17)",
  },
  scanLines: {
    ...StyleSheet.absoluteFillObject,
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