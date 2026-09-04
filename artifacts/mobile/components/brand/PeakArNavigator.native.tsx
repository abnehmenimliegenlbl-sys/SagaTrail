import {
  ViroARScene,
  ViroARSceneNavigator,
  isARSupportedOnDevice,
} from "@reactvision/react-viro";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

import type { PanoramaGipfel } from "@/lib/panorama";
import type { PeakArNavigatorProps } from "./PeakArNavigator.types";

interface PeakArSceneProps {
  onError?: () => void;
}

function PeakArScene({
  onError,
}: PeakArSceneProps) {
  return (
    <ViroARScene onError={() => onError?.()}>
      {/*
       * Deliberately empty. ViroText used ViroKit's OpenGL geometry/material
       * path, which crashes natively on iOS 26 in ViroKit 2.56.0. The
       * React-Native marker overlay in PeakCameraOverlay renders the labels
       * above this AR camera instead.
       */}
    </ViroARScene>
  );
}

export function PeakArNavigator({
  peaks,
  onError,
}: PeakArNavigatorProps) {
  const [supportState, setSupportState] = useState<
    "checking" | "supported" | "unsupported"
  >("checking");

  useEffect(() => {
    let cancelled = false;

    isARSupportedOnDevice()
      .then(({ isARSupported }) => {
        if (cancelled) return;
        if (isARSupported) {
          setSupportState("supported");
        } else {
          setSupportState("unsupported");
          onError?.();
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSupportState("unsupported");
        onError?.();
      });

    return () => {
      cancelled = true;
    };
  }, [onError]);

  const initialScene = useMemo(
    () => ({
      scene: () => (
        <PeakArScene
          onError={onError}
        />
      ),
    }),
    [peaks, onError],
  );

  // Do not create the native Viro surface until ARKit/ARCore has confirmed
  // that this device can run it. Unsupported devices otherwise fail during
  // native camera-session creation, before Viro can report onError.
  if (supportState !== "supported") return null;

  return (
    <ViroARSceneNavigator
      // Viro stores initialScene internally. Remount only when the actual
      // peak set changes (for example when the live request finishes), not on
      // every compass update.
      key={peaks.map((peak) => peak.id).join("|")}
      style={StyleSheet.absoluteFillObject}
      initialScene={initialScene}
      autofocus
      // iOS 26 rejects ViroKit's default photo-output dimensions on some
      // camera formats. Low selects a smaller supported ARKit format while
      // keeping the Viro scene and tracking enabled.
      videoQuality="Low"
      // This scene only renders text labels. Disabling HDR prevents ViroKit's
      // OpenGL tone-mapping pass, which aborts on iOS 26 while loading its
      // shader pipeline (VROToneMappingRenderPass).
      hdrEnabled={false}
      // Keep this text-only scene on Viro's simplest OpenGL material path.
      // These features are not needed for labels and add shader variants that
      // can trigger iOS 26 Metal assertions in ViroKit 2.56.
      pbrEnabled={false}
      bloomEnabled={false}
      shadowsEnabled={false}
      multisamplingEnabled={false}
      worldAlignment="GravityAndHeading"
    />
  );
}