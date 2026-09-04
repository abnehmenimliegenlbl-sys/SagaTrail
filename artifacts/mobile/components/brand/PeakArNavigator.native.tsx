import {
  ViroARScene,
  ViroARSceneNavigator,
  isARSupportedOnDevice,
} from "@reactvision/react-viro";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";

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
    [onError],
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
      // Keep ViroKit's OpenGL tone-mapping pass disabled on iOS 26. The AR
      // camera/tracking surface is retained, while all labels are rendered
      // by the React-Native overlay outside this scene.
      hdrEnabled={false}
      // These optional renderer features are not needed for the empty scene.
      pbrEnabled={false}
      bloomEnabled={false}
      shadowsEnabled={false}
      multisamplingEnabled={false}
      worldAlignment="GravityAndHeading"
    />
  );
}