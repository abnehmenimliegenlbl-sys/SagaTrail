import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  PanResponderInstance,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";

const THUMB = 30;
const HIT = { top: 22, bottom: 22, left: 22, right: 22 };

/**
 * Zwei-Punkt-Schieberegler (Bereichsauswahl) fuer die Routenfilter.
 *
 * Beide Zugpunkte lassen sich unabhaengig ziehen; der untere Wert kann den
 * oberen nie ueberholen. Werte rasten auf `step` ein. Plattformuebergreifend
 * ueber PanResponder umgesetzt, damit die Web-Vorschau identisch funktioniert.
 */
export function RangeSlider({
  label,
  min,
  max,
  step,
  values,
  onChange,
  formatValue,
  onDraggingChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  values: [number, number];
  onChange: (next: [number, number]) => void;
  formatValue?: (value: number) => string;
  /** Meldet Beginn/Ende des Ziehens, damit die umgebende Liste das Scrollen pausieren kann. */
  onDraggingChange?: (dragging: boolean) => void;
}) {
  const colors = useColors();
  const [trackWidth, setTrackWidth] = useState(0);

  const usable = Math.max(trackWidth - THUMB, 1);
  const span = max - min || 1;

  // Geometrie, aktuelle Werte und Callback in Refs spiegeln, damit die einmalig
  // erzeugten PanResponder stets frische Werte lesen (keine veralteten Closures).
  const geomRef = useRef({ usable, span, min, max, step });
  geomRef.current = { usable, span, min, max, step };
  const valuesRef = useRef<[number, number]>(values);
  valuesRef.current = values;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onDraggingChangeRef = useRef(onDraggingChange);
  onDraggingChangeRef.current = onDraggingChange;
  const startRef = useRef<[number, number]>(values);

  // Beim Unmount defensiv "kein Ziehen mehr" melden, damit die umgebende
  // Liste nie mit deaktiviertem Scrollen zurueckbleibt.
  useEffect(() => {
    return () => onDraggingChangeRef.current?.(false);
  }, []);

  const toX = useCallback(
    (value: number) => ((value - min) / span) * usable,
    [min, span, usable],
  );

  const respondersRef = useRef<{
    lo: PanResponderInstance;
    hi: PanResponderInstance;
  } | null>(null);
  if (!respondersRef.current) {
    const make = (thumb: 0 | 1) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Die Geste gehoert dem Zugpunkt: umgebende ScrollViews duerfen sie
        // waehrend des Ziehens NICHT uebernehmen (sonst bleibt der Regler
        // haengen, sobald der Finger leicht vertikal abrutscht).
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = [...valuesRef.current] as [number, number];
          onDraggingChangeRef.current?.(true);
        },
        onPanResponderMove: (_evt, gesture) => {
          const g = geomRef.current;
          const snap = (raw: number) => {
            const clamped = Math.min(g.max, Math.max(g.min, raw));
            return Math.round(clamped / g.step) * g.step;
          };
          const delta = (gesture.dx / g.usable) * g.span;
          const [lo, hi] = startRef.current;
          if (thumb === 0) {
            const next = Math.min(snap(lo + delta), hi - g.step);
            onChangeRef.current([Math.max(g.min, next), hi]);
          } else {
            const next = Math.max(snap(hi + delta), lo + g.step);
            onChangeRef.current([lo, Math.min(g.max, next)]);
          }
        },
        onPanResponderRelease: () => {
          onDraggingChangeRef.current?.(false);
        },
        onPanResponderTerminate: () => {
          onDraggingChangeRef.current?.(false);
        },
      });
    respondersRef.current = { lo: make(0), hi: make(1) };
  }

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  const fmt = formatValue ?? ((v: number) => String(v));
  const loX = toX(values[0]);
  const hiX = toX(values[1]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.accent }]}>
          {fmt(values[0])} – {fmt(values[1])}
        </Text>
      </View>

      <View style={styles.trackArea} onLayout={onLayout}>
        <View style={[styles.track, { backgroundColor: colors.glassBorder }]} />
        <View
          style={[
            styles.trackActive,
            {
              backgroundColor: colors.accent,
              left: loX + THUMB / 2,
              width: Math.max(hiX - loX, 0),
            },
          ]}
        />
        <View
          {...respondersRef.current.lo.panHandlers}
          hitSlop={HIT}
          style={[
            styles.thumb,
            { left: loX, borderColor: colors.accent, backgroundColor: colors.card },
          ]}
        />
        <View
          {...respondersRef.current.hi.panHandlers}
          hitSlop={HIT}
          style={[
            styles.thumb,
            styles.thumbTop,
            { left: hiX, borderColor: colors.accent, backgroundColor: colors.card },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  value: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 0.5 },
  trackArea: { height: THUMB, justifyContent: "center" },
  track: { height: 4, borderRadius: 2, marginHorizontal: THUMB / 2 },
  trackActive: { position: "absolute", height: 4, borderRadius: 2 },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 2,
  },
  thumbTop: { zIndex: 2 },
});
