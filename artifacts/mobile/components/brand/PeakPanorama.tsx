import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
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
  cameraPermission: string;
  arUnavailable: string;
}

interface PeakPanoramaProps {
  peaks: PanoramaGipfel[];
  heading: number | null;
  hasGps: boolean;
  strings: PeakPanoramaStrings;
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
}: PeakPanoramaProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [arUnavailable, setArUnavailable] = useState(false);
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
          <Feather name="triangle" size={16} color={colors.accent} />
          <Text style={[styles.title, { color: colors.accent }]}>
            {strings.title}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {heading != null && (
            <Text style={[styles.heading, { color: colors.foreground }]}>
              {Math.round(heading)}°
            </Text>
          )}
          {Platform.OS !== "web" && (
            <Pressable
              onPress={toggleCamera}
              style={[
                styles.cameraButton,
                {
                  backgroundColor: cameraEnabled
                    ? colors.primary
                    : colors.glassBgStrong,
                  borderColor: cameraEnabled
                    ? colors.primary
                    : colors.glassBorder,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={cameraEnabled ? strings.cameraOff : strings.camera}
            >
              <Feather
                name={cameraEnabled ? "x" : "camera"}
                size={14}
                color={cameraEnabled ? colors.primaryForeground : colors.foreground}
              />
              <Text
                style={[
                  styles.cameraButtonText,
                  {
                    color: cameraEnabled
                      ? colors.primaryForeground
                      : colors.foreground,
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

      <View
        style={[
          styles.cameraPrompt,
          {
            backgroundColor: colors.glassBgStrong,
            borderColor: colors.glassBorder,
          },
        ]}
      >
        <Feather name="camera" size={22} color={colors.accent} />
        <Text style={[styles.promptTitle, { color: colors.foreground }]}>
          {strings.camera}
        </Text>
        <Text style={[styles.promptStatus, { color: colors.mutedForeground }]}>
          {status}
        </Text>
      </View>

      <Modal
        visible={cameraEnabled && cameraPermission?.granted === true}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setCameraEnabled(false)}
      >
        <View style={styles.fullscreenCamera}>
          {arUnavailable ? (
            <CameraView facing="back" style={styles.camera} />
          ) : (
            <PeakArNavigator
              peaks={visiblePeaks}
              onError={() => setArUnavailable(true)}
            />
          )}
          <View style={styles.imageScrim} />
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
              {heading != null && (
                <Text style={[styles.fullscreenHeading, { color: colors.photoScrimMuted }]}>
                  {Math.round(heading)}°
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => setCameraEnabled(false)}
              style={[
                styles.closeButton,
                { backgroundColor: colors.glassBgStrong, borderColor: colors.glassBorder },
              ]}
              accessibilityRole="button"
              accessibilityLabel={strings.cameraOff}
            >
              <Feather name="x" size={20} color={colors.foreground} />
            </Pressable>
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
            <Text
              style={[styles.status, { color: colors.photoScrimText }]}
              numberOfLines={2}
            >
                {arUnavailable && focusedPeak
                ? `${strings.detected}: ${focusedPeak.name}`
                : status}
            </Text>
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
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  heading: { fontFamily: fonts.monoBold, fontSize: 14 },
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
  hint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 7 },
  cameraPrompt: {
    minHeight: 94,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  promptTitle: { fontFamily: fonts.titleBold, fontSize: 14 },
  promptStatus: { fontFamily: fonts.body, fontSize: 11, textAlign: "center", paddingHorizontal: 16 },
  fullscreenCamera: { flex: 1, backgroundColor: "#000" },
  camera: { ...StyleSheet.absoluteFillObject },
  imageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.17)",
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
  fullscreenHeading: { fontFamily: fonts.monoBold, fontSize: 14, marginTop: 4 },
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
  status: { flex: 1, fontFamily: fonts.body, fontSize: 12 },
});