import { Feather } from "@expo/vector-icons";
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
import { CloseButton } from "@/components/brand/CloseButton";
import { useColors } from "@/hooks/useColors";
import { hapticMedium, hapticSelection } from "@/lib/haptics";
import type { PanoramaGipfel } from "@/lib/panorama";
import type { TerrainProfilePoint } from "@/lib/terrainCues";
import type { LocalTerrainModel } from "@/lib/terrainModel";
import type { LatLng } from "@/types";
import { persistJournalImage } from "@/lib/journalMedia";
import { makeLogger } from "@/lib/debugLog";
import type { RecognitionJournalEntry } from "@/types";
import type { PeakPanoramaStrings } from "./PeakPanorama";
import { PeakArNavigator } from "./PeakArNavigator";

const peakCameraLog = makeLogger("[PeakCamera]", "peak_camera");

interface PeakCameraOverlayProps {
  visible: boolean;
  peaks: readonly PanoramaGipfel[];
  arCandidates?: readonly PanoramaGipfel[];
  terrainProfile?: readonly TerrainProfilePoint[] | null;
  terrainModel?: LocalTerrainModel | null;
  routeGeometry?: readonly number[][] | null;
  observerPosition?: LatLng | null;
  observerAccuracyM?: number | null;
  observerFixAgeMs?: number | null;
  observerRouteDistanceM?: number | null;
  heading: number | null;
  nextTurn?: {
    direction: "left" | "right";
    distanceM: number;
    title: string;
    label: string;
  } | null;
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
  observerAccuracyM = null,
  observerFixAgeMs = null,
  observerRouteDistanceM = null,
  heading,
  nextTurn = null,
  observerElevationM = null,
  strings,
  onClose,
  onCaptured,
}: PeakCameraOverlayProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [arEnabled, setArEnabled] = useState(true);
  const [showPeaks, setShowPeaks] = useState(true);
  const [trackingState, setTrackingState] = useState<
    "initializing" | "ready" | "limited" | "unavailable"
  >("initializing");
  const [capturing, setCapturing] = useState(false);
  const [contentMounted, setContentMounted] = useState(false);
  const [selectedPeakId, setSelectedPeakId] = useState<string | null>(null);
  const [arPeaks, setArPeaks] = useState<readonly PanoramaGipfel[]>([]);
  const lockPulse = useRef(new Animated.Value(0)).current;
  const cameraFrameRef = useRef<View>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const arStateRef = useRef({
    visible,
    arEnabled,
    trackingState,
    peakCount: arPeaks.length,
    heading,
    observerAccuracyM,
    observerFixAgeMs,
    observerRouteDistanceM,
  });
  arStateRef.current = {
    visible,
    arEnabled,
    trackingState,
    peakCount: arPeaks.length,
    heading,
    observerAccuracyM,
    observerFixAgeMs,
    observerRouteDistanceM,
  };
  const handleArError = useCallback(() => {
    const state = arStateRef.current;
    peakCameraLog("AR error received; closing camera", {
      ...state,
    });
    setContentMounted(false);
    setArEnabled(false);
    setShowPeaks(false);
    setTrackingState("unavailable");
    setArPeaks([]);
    onCloseRef.current();
  }, []);

  const visiblePeaks =
    !showPeaks || heading == null
      ? []
      : peaks
          .filter((peak) => peak.relativeBearingDeg != null)
          .slice(0, 4);
  const focusedPeak = visiblePeaks.find(
    (peak) =>
      peak.relativeBearingDeg != null &&
      Math.abs(peak.relativeBearingDeg) <= 18,
  );
  const trackingOverlayReady = trackingState === "ready";
  const selectablePeaks = trackingOverlayReady
    ? showPeaks
      ? arEnabled
        ? arPeaks
        : visiblePeaks
      : []
    : [];
  const targetPeak =
    selectablePeaks.find((peak) => peak.id === selectedPeakId) ??
    (trackingOverlayReady ? focusedPeak : undefined) ??
    selectablePeaks[0];
  const status =
    trackingOverlayReady && visiblePeaks.length > 0
      ? `${strings.detected}: ${targetPeak?.name ?? ""}`
      : strings.noPeaks;
  const routeGuidanceReady =
    observerPosition != null &&
    heading != null &&
    trackingState === "ready";
  const routePauseReason =
    observerPosition == null
      ? strings.noGps
      : heading == null
        ? strings.needCompass
        : trackingState === "initializing"
          ? strings.arTrackingStarting
          : trackingState === "limited"
            ? strings.arTrackingLimited
            : strings.arUnavailable;
  const routePauseDetail =
    observerPosition == null
      ? strings.noGps
      : heading == null
        ? strings.needCompass
        : trackingState === "unavailable"
          ? strings.arUnavailable
          : strings.arTrackingPaused;
  const handleTrackingStateChange = useCallback(
    (state: "initializing" | "ready" | "limited" | "unavailable") => {
      setTrackingState(state);
      peakCameraLog("AR tracking quality changed", {
        state,
      });
    },
    [],
  );

  useEffect(() => {
    peakCameraLog("camera overlay lifecycle", {
      visible,
      contentMounted,
      arEnabled,
      showPeaks,
      trackingState,
      routeGuidanceReady,
      peakCount: peaks.length,
      arCandidateCount: arCandidates.length,
      visiblePeakCount: visiblePeaks.length,
      selectedPeakId,
      targetPeakId: targetPeak?.id ?? null,
      heading,
      nextTurn: nextTurn
        ? {
            direction: nextTurn.direction,
            distanceM: nextTurn.distanceM,
            title: nextTurn.title,
          }
        : null,
      routePointCount: routeGeometry?.length ?? 0,
      terrainProfilePointCount: terrainProfile?.length ?? 0,
      hasTerrainModel: Boolean(terrainModel),
       hasObserverPosition: observerPosition != null,
      observerAccuracyM,
      observerFixAgeMs,
      observerRouteDistanceM,
    });
  }, [
    arCandidates.length,
    arEnabled,
    contentMounted,
    heading,
    nextTurn,
    observerPosition,
    observerAccuracyM,
    observerFixAgeMs,
    observerRouteDistanceM,
    peaks.length,
    routeGuidanceReady,
    routeGeometry?.length,
    selectedPeakId,
    showPeaks,
    targetPeak?.id,
    terrainModel,
    terrainProfile?.length,
    trackingState,
    visible,
    visiblePeaks.length,
  ]);

  useEffect(() => {
    if (!visible) {
      peakCameraLog("camera overlay hidden; clearing AR state");
      setContentMounted(false);
      setArEnabled(false);
      setShowPeaks(false);
      setTrackingState("initializing");
      setArPeaks([]);
      setSelectedPeakId(null);
    } else {
      peakCameraLog("camera overlay shown; loading AR candidates", {
        candidateCount: arCandidates.length,
        peakCount: peaks.length,
        heading,
      });
      setArEnabled(true);
      setShowPeaks(true);
      setTrackingState("initializing");
    }
    // Only a real camera open/close transition resets the tracking state.
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    peakCameraLog("camera AR candidates updated", {
      candidateCount: arCandidates.length,
      trackingState: arStateRef.current.trackingState,
    });
    // Candidate updates may replace the fixed native marker slots while the
    // camera stays mounted. They must not reset the native tracking state.
    setArPeaks(arCandidates);
  }, [arCandidates, visible]);

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
    peakCameraLog("camera close requested", {
      visible,
      contentMounted,
      arEnabled,
      arPeakCount: arPeaks.length,
      selectedPeakId,
    });
    // Unmount the native camera/AR surface before dismissing the only native
    // modal. This avoids tearing down Viro during the UIKit transition.
    setContentMounted(false);
    setArEnabled(false);
    setShowPeaks(false);
    setTrackingState("unavailable");
    setArPeaks([]);
    onClose();
  };

  const handlePeakPress = (peakId: string) => {
    const peak = arPeaks.find((candidate) => candidate.id === peakId) ??
      visiblePeaks.find((candidate) => candidate.id === peakId);
    peakCameraLog("camera peak selected", {
      peakId,
      peakName: peak?.name ?? null,
      distanceKm: peak?.distanceKm ?? null,
      relativeBearingDeg: peak?.relativeBearingDeg ?? null,
      arEnabled,
    });
    hapticSelection();
    setSelectedPeakId(peakId);
  };

  const markerPosition = (relativeBearingDeg: number) => {
    const percentage = 50 + (relativeBearingDeg / 140) * 100;
    return `${Math.max(8, Math.min(92, percentage))}%` as DimensionValue;
  };

  const capturePeakRecognition = async () => {
    if (capturing || visiblePeaks.length === 0 || !onCaptured) {
      peakCameraLog("camera capture skipped", {
        capturing,
        visiblePeakCount: visiblePeaks.length,
        hasOnCaptured: Boolean(onCaptured),
      });
      return;
    }
    peakCameraLog("camera capture started", {
      visiblePeakCount: visiblePeaks.length,
      targetPeakId: targetPeak?.id ?? null,
    });
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
        peakCameraLog("camera snapshot failed");
        snapshotUri = null;
      }
      if (!snapshotUri) {
        peakCameraLog("camera capture stopped without snapshot");
        return;
      }

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
      peakCameraLog("camera capture completed", {
        targetPeakId: targetPeak?.id ?? null,
        capturedPeakCount: visiblePeaks.length,
      });
    } catch (error) {
      peakCameraLog("camera capture failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setCapturing(false);
      peakCameraLog("camera capture finished", {
        targetPeakId: targetPeak?.id ?? null,
      });
    }
  };

  const formatTurnDistance = (distanceM: number) => {
    if (distanceM >= 1000) return `${(distanceM / 1000).toFixed(1)} km`;
    return `${Math.max(0, Math.round(distanceM))} m`;
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
          peakCameraLog("native camera modal shown", {
            candidateCount: arCandidates.length,
            routePointCount: routeGeometry?.length ?? 0,
            heading,
          });
         // Keep every candidate as a stable native Viro node. Do not
         // replace/remove nodes while the AR session is running.
         setArPeaks(arCandidates);
         setArEnabled(true);
          setShowPeaks(true);
          setTrackingState("initializing");
         setContentMounted(true);
       }}
      onRequestClose={closeCamera}
       onDismiss={() => {
         peakCameraLog("native camera modal dismissed");
         setContentMounted(false);
       }}
    >
      <View ref={cameraFrameRef} style={styles.fullscreenCamera} collapsable={false}>
        {contentMounted && (
          <PeakArNavigator
            peaks={arPeaks}
             showPeaks={showPeaks}
             compassReady={heading != null}
             observerAccuracyM={observerAccuracyM}
             observerFixAgeMs={observerFixAgeMs}
             observerRouteDistanceM={observerRouteDistanceM}
            terrainProfile={terrainProfile}
            terrainModel={terrainModel}
            routeGeometry={routeGeometry}
            observerPosition={observerPosition}
            heading={heading}
            observerElevationM={observerElevationM}
            selectedPeakId={selectedPeakId}
            onPeakPress={handlePeakPress}
             onTrackingStateChange={handleTrackingStateChange}
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
          trackingOverlayReady &&
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
              onPress={() => handlePeakPress(peak.id)}
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
              onPress={() => {
                hapticSelection();
                setShowPeaks((current) => !current);
              }}
              style={[
                styles.peakToggle,
                {
                  backgroundColor: showPeaks
                    ? colors.glassBgStrong
                    : colors.destructive,
                  borderColor: showPeaks ? colors.glassBorder : colors.destructive,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={strings.detected}
              accessibilityState={{ selected: showPeaks }}
            >
              <Feather
                name="triangle"
                size={12}
                color={showPeaks ? colors.tint : colors.primaryForeground}
              />
            </Pressable>
            <CloseButton
              onPress={() => {
                hapticSelection();
                closeCamera();
              }}
              style={styles.closeButton}
              accessibilityLabel={strings.cameraOff}
            />
          </View>
        </View>
        {!routeGuidanceReady && contentMounted && (
          <View
            style={[
              styles.routePausedHint,
              {
                backgroundColor: colors.glassBgStrong,
                borderColor: colors.destructive,
              },
            ]}
          >
            <Feather name="pause-circle" size={18} color={colors.destructive} />
            <View style={styles.routePausedCopy}>
              <Text style={[styles.routePausedTitle, { color: colors.photoScrimText }]}>
                {routePauseReason}
              </Text>
              <Text style={[styles.routePausedDetail, { color: colors.photoScrimMuted }]}>
                {routePauseDetail}
              </Text>
            </View>
          </View>
        )}
        {routeGuidanceReady && nextTurn && (
          <View
            style={[
              styles.turnHint,
              {
                backgroundColor: colors.glassBgStrong,
                borderColor: colors.accent,
              },
            ]}
          >
            <Feather
              name={nextTurn.direction === "left" ? "corner-up-left" : "corner-up-right"}
              size={20}
              color={colors.accent}
            />
            <View style={styles.turnHintCopy}>
              <Text style={[styles.turnHintTitle, { color: colors.photoScrimText }]}>
                {nextTurn.title}
              </Text>
              <Text style={[styles.turnHintLabel, { color: colors.photoScrimMuted }]}>
                {nextTurn.label} · {formatTurnDistance(nextTurn.distanceM)}
              </Text>
            </View>
          </View>
        )}
        <View style={[styles.imageFooter, { paddingBottom: insets.bottom + 12 }]}>
          <Feather
            name={targetPeak ? "triangle" : "compass"}
            size={15}
            color={colors.photoScrimText}
          />
          <Text style={[styles.status, { color: colors.photoScrimText }]} numberOfLines={2}>
            {targetPeak && showPeaks ? `${strings.detected}: ${targetPeak.name}` : status}
          </Text>
          <View style={styles.captureArea}>
            <Pressable
              onPress={() => {
                hapticMedium();
                void capturePeakRecognition();
              }}
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
  turnHint: {
    position: "absolute",
    top: 112,
    left: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  turnHintCopy: { flex: 1, gap: 2 },
  turnHintTitle: {
    fontFamily: fonts.titleBold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  turnHintLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "700",
  },
  routePausedHint: {
    position: "absolute",
    top: 112,
    left: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 14,
  },
  routePausedCopy: { flex: 1, gap: 2 },
  routePausedTitle: {
    fontFamily: fonts.titleBold,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  routePausedDetail: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: "700",
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
  peakToggle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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