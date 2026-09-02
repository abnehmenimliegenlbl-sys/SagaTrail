import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { captureRef } from "react-native-view-shot";
import { useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { DimensionValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import type { PanoramaGipfel } from "@/lib/panorama";
import { persistJournalImage } from "@/lib/journalMedia";
import type { RecognitionJournalEntry } from "@/types";
import { PeakArNavigator } from "./PeakArNavigator";

const PANORAMA_VIEW_DEGREES = 140;

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
}

interface PeakPanoramaProps {
  peaks: PanoramaGipfel[];
  heading: number | null;
  hasGps: boolean;
  strings: PeakPanoramaStrings;
  onCaptured?: (entry: RecognitionJournalEntry) => void | Promise<void>;
}

function markerLeft(relativeBearingDeg: number): DimensionValue {
  const percentage = 50 + (relativeBearingDeg / PANORAMA_VIEW_DEGREES) * 100;
  return `${Math.max(8, Math.min(92, percentage))}%`;
}

export function PeakPanorama({
  peaks,
  heading,
  hasGps,
  strings,
  onCaptured,
}: PeakPanoramaProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [arUnavailable, setArUnavailable] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const cameraFrameRef = useRef<View>(null);
  const visiblePeaks =
    heading == null
      ? []
      : peaks
          .filter(
            (peak) =>
              peak.relativeBearingDeg != null &&
              Math.abs(peak.relativeBearingDeg) <= PANORAMA_VIEW_DEGREES / 2,
          )
          .slice(0, 4);
  const focusedPeak = visiblePeaks.find(
    (peak) =>
      peak.relativeBearingDeg != null &&
      Math.abs(peak.relativeBearingDeg) <= 18,
  );

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
    if (capturing || visiblePeaks.length === 0 || !onCaptured) return;
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
        title: focusedPeak?.name ?? strings.title,
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
              <View
                key={peak.id}
                style={[
                  styles.marker,
                  {
                    left: markerLeft(peak.relativeBearingDeg ?? 0),
                    top: insets.top + 82 + (index % 3) * 42,
                  },
                ]}
              >
                <View
                  style={[
                    styles.markerLabel,
                    {
                      backgroundColor: colors.glassBgStrong,
                      borderColor:
                        focusedPeak?.id === peak.id
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
                          focusedPeak?.id === peak.id
                            ? colors.primary
                            : colors.glassBgStrong,
                        borderColor:
                          focusedPeak?.id === peak.id
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
              </View>
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
              name={focusedPeak ? "crosshair" : "compass"}
              size={15}
              color={colors.photoScrimText}
            />
            <Text style={[styles.status, { color: colors.photoScrimText }]} numberOfLines={2}>
              {arUnavailable && focusedPeak
                ? `${strings.detected}: ${focusedPeak.name}`
                : status}
            </Text>
            <View style={styles.captureArea}>
              <Pressable
                onPress={() => void capturePeakRecognition()}
                disabled={capturing || visiblePeaks.length === 0}
                style={[
                  styles.captureButton,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                    opacity: capturing || visiblePeaks.length === 0 ? 0.45 : 1,
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