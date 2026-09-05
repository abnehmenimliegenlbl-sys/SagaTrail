import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
import type { LatLng } from "@/types";
import { persistJournalImage } from "@/lib/journalMedia";
import type { RecognitionJournalEntry } from "@/types";
import type { PeakPanoramaStrings } from "./PeakPanorama";
import { PeakArNavigator } from "./PeakArNavigator";

interface PeakCameraOverlayProps {
  visible: boolean;
  peaks: readonly PanoramaGipfel[];
  arCandidates?: readonly PanoramaGipfel[];
  terrainProfile?: readonly TerrainProfilePoint[] | null;
  terrainModel?: LocalTerrainModel | null;
  routeGeometry?: readonly number[][] | null;
  observerPosition?: LatLng | null;
  heading: number | null;
  observerElevationM?: number | null;
  strings: PeakPanoramaStrings;
  onClose: () => void;
  onCaptured?: (entry: RecognitionJournalEntry) => void | Promise<void>;
}

export function PeakCameraOverlay({
  visible,
  peaks,
  arCandidates = peaks,
  terrainProfile = null,
  terrainModel = null,
  routeGeometry = null,
  observerPosition = null,
  heading,
  observerElevationM = null,
  strings,
  onClose,
  onCaptured,
}: PeakCameraOverlayProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [arEnabled, setArEnabled] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [contentMounted, setContentMounted] = useState(false);
  const [selectedPeakId, setSelectedPeakId] = useState<string | null>(null);
  const [arPeaks, setArPeaks] = useState<readonly PanoramaGipfel[]>([]);
  const lockPulse = useRef(new Animated.Value(0)).current;
  const cameraFrameRef = useRef<View>(null);
  const handleArError = useCallback(() => {
    setContentMounted(false);
    setArEnabled(false);
    setArPeaks([]);
    onClose();
  }, [onClose]);

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
  const selectablePeaks = arEnabled ? arPeaks : visiblePeaks;
  const targetPeak =
    selectablePeaks.find((peak) => peak.id === selectedPeakId) ??
    focusedPeak ??
    selectablePeaks[0];
  const status =
    visiblePeaks.length > 0 ? `${strings.detected}: ${targetPeak?.name ?? ""}` : strings.noPeaks;

  useEffect(() => {
    if (!visible) {
      setContentMounted(false);
      setArEnabled(false);
      setArPeaks([]);
      setSelectedPeakId(null);
    } else {
      setArEnabled(true);
      setArPeaks(arCandidates);
      setContentMounted(false);
    }
    // arCandidates is intentionally not a dependency. The native Viro scene
    // must keep a stable peak snapshot while the camera is running; updating
    // the candidate list here would unmount/remount the camera surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!arEnabled || !targetPeak) {
      lockPulse.stopAnimation();
      lockPulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(lockPulse, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(lockPulse, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [arEnabled, lockPulse, targetPeak?.id]);

  const closeCamera = () => {
    // Unmount the native camera/AR surface before dismissing the only native
    // modal. This avoids tearing down Viro during the UIKit transition.
    setContentMounted(false);
    setArEnabled(false);
    setArPeaks([]);
    onClose();
  };

  const handlePeakPress = (peakId: string) => {
    setSelectedPeakId(peakId);
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => {});
    }
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
      // The native modal owns the complete AR surface. Camera permission is
      // requested by PeakPanorama before this modal is opened.
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
       onShow={() => {
         // Keep every candidate as a stable native Viro node. Do not
         // replace/remove nodes while the AR session is running.
         setArPeaks(arCandidates);
         setArEnabled(true);
         setContentMounted(true);
       }}
      onRequestClose={closeCamera}
      onDismiss={() => setContentMounted(false)}
    >
      <View ref={cameraFrameRef} style={styles.fullscreenCamera} collapsable={false}>
        {contentMounted && (
          <PeakArNavigator
            peaks={arPeaks}
            terrainProfile={terrainProfile}
            terrainModel={terrainModel}
            routeGeometry={routeGeometry}
            observerPosition={observerPosition}
            heading={heading}
            observerElevationM={observerElevationM}
            selectedPeakId={selectedPeakId}
            onPeakPress={handlePeakPress}
            onError={handleArError}
          />
        )}
        <View pointerEvents="none" style={styles.imageScrim} />
        <View pointerEvents="none" style={styles.scanLines}>
          <View style={styles.scanLineTop} />
          <View style={styles.scanLineMiddle} />
          <View style={styles.scanLineBottom} />
        </View>
        {arEnabled && contentMounted && targetPeak && (
          <Animated.View
            style={[
              styles.lockOnBadge,
              {
                borderColor: colors.accent,
                backgroundColor: colors.glassBgStrong,
                transform: [
                  {
                    scale: lockPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.06],
                    }),
                  },
                ],
              },
            ]}
          >
            <Feather name="triangle" size={14} color={colors.accent} />
            <View>
              <Text style={[styles.lockOnTitle, { color: colors.accent }]}>
                {targetPeak.name}
              </Text>
              <Text style={[styles.lockOnDetail, { color: colors.photoScrimMuted }]}>
                {targetPeak.distanceKm.toFixed(1)} km ·{" "}
                {targetPeak.elevationM != null
                  ? `${Math.round(targetPeak.elevationM)} m ü. M.`
                  : strings.heightUnknown}
              </Text>
            </View>
          </Animated.View>
        )}
        {contentMounted &&
          !arEnabled &&
          visiblePeaks.map((peak, index) => (
            <Pressable
              key={peak.id}
              style={[
                styles.marker,
                {
                  left: markerPosition(peak.relativeBearingDeg ?? 0),
                  top: insets.top + 88 + (index % 3) * 12,
                },
              ]}
              onPress={() => setSelectedPeakId(peak.id)}
              accessibilityRole="button"
              accessibilityLabel={`${peak.name}, ${
                peak.elevationM != null
                  ? `${Math.round(peak.elevationM)} m ü. M.`
                  : strings.heightUnknown
              }`}
            >
              <View
                style={[
                  styles.markerLabel,
                  {
                    backgroundColor: "rgba(255,255,255,0.75)",
                    borderColor: colors.destructive,
                  },
                ]}
              >
                <Text style={[styles.markerName, { color: colors.destructive }]} numberOfLines={1}>
                  {`${peak.name} · ${
                    peak.elevationM != null
                      ? `${Math.round(peak.elevationM)} m`
                      : strings.heightUnknown
                  }`}
                </Text>
              </View>
            </Pressable>
          ))}
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
            name={targetPeak ? "triangle" : "compass"}
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
  camera: { ...StyleSheet.absoluteFill },
  imageScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.17)",
  },
  scanLines: { ...StyleSheet.absoluteFill, opacity: 0.25 },
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
  lockOnBadge: {
    position: "absolute",
    top: "61%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "86%",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lockOnTitle: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  lockOnDetail: {
    marginTop: 2,
    fontFamily: fonts.mono,
    fontSize: 9,
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
    width: 25,
    alignItems: "center",
    transform: [{ translateX: -12.5 }],
  },
  markerLabel: {
    width: 25,
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 12.5,
    paddingHorizontal: 2,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  markerName: {
    fontFamily: fonts.titleBold,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
    width: 126,
    transform: [{ rotate: "-90deg" }],
  },
  terrainLegend: {
    position: "absolute",
    left: 18,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  terrainLegendTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  terrainLegendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  terrainLegendTitleText: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  terrainLegendDetail: {
    marginTop: 3,
    fontFamily: fonts.mono,
    fontSize: 9,
  },
  mapLayerSwitch: {
    flexDirection: "row",
    gap: 5,
    marginTop: 7,
  },
  mapLayerButton: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mapLayerButtonText: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 0.6,
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