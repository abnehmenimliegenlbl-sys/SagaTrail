import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { captureRef } from "react-native-view-shot";
import { useEffect, useRef, useState } from "react";
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
import type { TerrainProfilePoint } from "@/lib/terrainCues";
import type { LocalTerrainModel } from "@/lib/terrainModel";
import { persistJournalImage } from "@/lib/journalMedia";
import type { RecognitionJournalEntry } from "@/types";
import type { PeakPanoramaStrings } from "./PeakPanorama";
import { PeakArNavigator } from "./PeakArNavigator";

interface PeakCameraOverlayProps {
  visible: boolean;
  peaks: readonly PanoramaGipfel[];
  terrainProfile?: readonly TerrainProfilePoint[] | null;
  terrainModel?: LocalTerrainModel | null;
  heading: number | null;
  observerElevationM?: number | null;
  strings: PeakPanoramaStrings;
  onClose: () => void;
  onCaptured?: (entry: RecognitionJournalEntry) => void | Promise<void>;
}

export function PeakCameraOverlay({
  visible,
  peaks,
  terrainProfile = null,
  terrainModel = null,
  heading,
  observerElevationM = null,
  strings,
  onClose,
  onCaptured,
}: PeakCameraOverlayProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [cameraPermission] = useCameraPermissions();
  const [arEnabled, setArEnabled] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [contentMounted, setContentMounted] = useState(false);
  const [selectedPeakId, setSelectedPeakId] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const cameraFrameRef = useRef<View>(null);
  const arActivationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visiblePeaks =
    heading == null
      ? []
      : peaks
          .filter((peak) => peak.relativeBearingDeg != null)
          .slice(0, 4);
  const focusedPeak = visiblePeaks.find(
    (peak) =>
      peak.relativeBearingDeg != null &&
      Math.abs(peak.relativeBearingDeg) <= 18,
  );
  const targetPeak =
    visiblePeaks.find((peak) => peak.id === selectedPeakId) ??
    focusedPeak ??
    visiblePeaks[0];
  const status =
    visiblePeaks.length > 0 ? `${strings.detected}: ${targetPeak?.name ?? ""}` : strings.noPeaks;

  useEffect(() => {
    if (!visible) {
      setContentMounted(false);
      setArEnabled(false);
      setSelectedPeakId(null);
      if (arActivationTimerRef.current) {
        clearTimeout(arActivationTimerRef.current);
        arActivationTimerRef.current = null;
      }
    }
    return () => {
      if (arActivationTimerRef.current) {
        clearTimeout(arActivationTimerRef.current);
        arActivationTimerRef.current = null;
      }
    };
  }, [visible]);

  const closeCamera = () => {
    // Unmount the native camera/AR surface before dismissing the only native
    // modal. This avoids tearing down Viro during the UIKit transition.
    setContentMounted(false);
    setArEnabled(false);
    onClose();
  };

  const toggleAr = () => {
    if (arActivationTimerRef.current) {
      clearTimeout(arActivationTimerRef.current);
      arActivationTimerRef.current = null;
    }
    if (arEnabled) {
      setArEnabled(false);
      return;
    }
    // Let CameraView release its native capture session before Viro starts
    // its own AR camera session.
    setArEnabled(false);
    arActivationTimerRef.current = setTimeout(() => {
      arActivationTimerRef.current = null;
      setArEnabled(true);
    }, 450);
  };

  const markerPosition = (relativeBearingDeg: number) => {
    const percentage = 50 + (relativeBearingDeg / 140) * 100;
    return `${Math.max(8, Math.min(92, percentage))}%` as DimensionValue;
  };

  const capturePeakRecognition = async () => {
    if (capturing || visiblePeaks.length === 0 || !onCaptured) return;
    setCapturing(true);
    try {
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
        .map((peak) => `${peak.name} — ${strings.distance(peak.distanceKm.toFixed(1))}`)
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

  if (Platform.OS === "web") return null;

  return (
    <Modal
      // PeakPanorama requests permission before opening this modal. Do not
      // gate the native modal on a second useCameraPermissions() snapshot:
      // on iOS that hook can still contain the pre-request value for the
      // first render, which makes the parent modal close while this one never
      // appears.
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onShow={() => setContentMounted(true)}
      onRequestClose={closeCamera}
      onDismiss={() => setContentMounted(false)}
    >
      <View ref={cameraFrameRef} style={styles.fullscreenCamera} collapsable={false}>
        {contentMounted && (
          arEnabled ? (
            <PeakArNavigator
              peaks={visiblePeaks}
              terrainProfile={terrainProfile}
              terrainModel={terrainModel}
              heading={heading}
              observerElevationM={observerElevationM}
              onError={() => setArEnabled(false)}
            />
          ) : (
            <CameraView ref={cameraRef} facing="back" style={styles.camera} />
          )
        )}
        <View style={styles.imageScrim} />
        <View pointerEvents="none" style={styles.scanLines}>
          <View style={styles.scanLineTop} />
          <View style={styles.scanLineMiddle} />
          <View style={styles.scanLineBottom} />
        </View>
        <View style={styles.horizon} />
        {contentMounted &&
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
                      targetPeak?.id === peak.id ? colors.primary : colors.glassBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.markerPeak,
                    {
                      backgroundColor:
                        targetPeak?.id === peak.id ? colors.primary : colors.glassBgStrong,
                      borderColor:
                        targetPeak?.id === peak.id ? colors.primary : colors.glassBorder,
                    },
                  ]}
                >
                  <Feather name="triangle" size={11} color={colors.photoScrimText} />
                </View>
                <Text style={[styles.markerName, { color: colors.photoScrimText }]} numberOfLines={1}>
                  {peak.name}
                </Text>
                <Text style={[styles.markerDistance, { color: colors.photoScrimMuted }]}>
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
          <View style={[styles.centerLine, { backgroundColor: colors.primary }]} />
        )}
        <View style={[styles.fullscreenTopBar, { paddingTop: insets.top + 12 }]}>
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
              onPress={toggleAr}
              style={[
                styles.arButton,
                {
                  backgroundColor: arEnabled ? colors.primary : colors.glassBgStrong,
                  borderColor: arEnabled ? colors.primary : colors.glassBorder,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={arEnabled ? "AR ausschalten" : "AR einschalten"}
            >
              <Feather
                name="layers"
                size={14}
                color={arEnabled ? colors.primaryForeground : colors.photoScrimText}
              />
              <Text
                style={[
                  styles.arButtonText,
                  { color: arEnabled ? colors.primaryForeground : colors.photoScrimText },
                ]}
              >
                AR
              </Text>
            </Pressable>
            <Pressable
              onPress={closeCamera}
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
        <View style={[styles.imageFooter, { paddingBottom: insets.bottom + 12 }]}>
          <Feather
            name={targetPeak ? "crosshair" : "compass"}
            size={15}
            color={colors.photoScrimText}
          />
          <Text style={[styles.status, { color: colors.photoScrimText }]} numberOfLines={2}>
            {targetPeak ? `${strings.detected}: ${targetPeak.name}` : status}
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
  );
}

const styles = StyleSheet.create({
  fullscreenCamera: { flex: 1, backgroundColor: "#000" },
  camera: { ...StyleSheet.absoluteFillObject },
  imageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.17)",
  },
  scanLines: { ...StyleSheet.absoluteFillObject, opacity: 0.25 },
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
  arButton: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 11,
  },
  arButtonText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.8 },
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