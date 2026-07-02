import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import colors from "@/constants/colors";

/**
 * Stilisierte Routenkarte auf Basis von react-native-svg.
 * Bewusst plattformunabhaengig (funktioniert auch in der Web-Vorschau).
 * Echte swisstopo-Karten folgen in einer spaeteren Ausbaustufe.
 *
 * `progress` (0..1) bewegt die aktuelle Position entlang des Pfades.
 */
interface RouteMapProps {
  progress?: number;
  height?: number;
}

const PATH =
  "M20,180 C60,140 90,150 120,120 C150,90 170,110 210,70 C250,30 280,60 320,40";

// Naeherungspunkte entlang des Pfades fuer die Positionsmarkierung
const POINTS = [
  { x: 20, y: 180 },
  { x: 90, y: 140 },
  { x: 140, y: 105 },
  { x: 200, y: 78 },
  { x: 260, y: 48 },
  { x: 320, y: 40 },
];

function pointAt(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  const scaled = clamped * (POINTS.length - 1);
  const i = Math.floor(scaled);
  const t = scaled - i;
  const a = POINTS[i];
  const b = POINTS[Math.min(i + 1, POINTS.length - 1)];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function RouteMap({ progress = 0, height = 220 }: RouteMapProps) {
  const pos = pointAt(progress);
  return (
    <View style={[styles.wrap, { height, borderRadius: colors.radius }]}>
      <Svg width="100%" height="100%" viewBox="0 0 340 220">
        <Defs>
          <LinearGradient id="terrain" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#22362F" />
            <Stop offset="1" stopColor="#10181A" />
          </LinearGradient>
        </Defs>
        {/* Gelaende */}
        <Path d="M0,0 H340 V220 H0 Z" fill="url(#terrain)" />
        {/* Hoehenlinien */}
        {[60, 100, 140, 180].map((y) => (
          <Path
            key={y}
            d={`M0,${y} C80,${y - 20} 160,${y + 10} 340,${y - 15}`}
            stroke={colors.dark.moosgrau}
            strokeOpacity={0.18}
            strokeWidth={1}
            fill="none"
          />
        ))}
        {/* zurueckgelegte Route */}
        <Path
          d={PATH}
          stroke={colors.dark.altgold}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="1000"
          strokeDashoffset={1000 - 1000 * Math.max(0, Math.min(1, progress))}
        />
        {/* verbleibende Route */}
        <Path
          d={PATH}
          stroke={colors.dark.gletscherweiss}
          strokeOpacity={0.25}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeDasharray="6 8"
        />
        {/* Start / Ziel */}
        <Circle cx={20} cy={180} r={5} fill={colors.dark.moosgrau} />
        <Circle cx={320} cy={40} r={6} fill={colors.dark.almrausch} />
        {/* aktuelle Position */}
        <Circle cx={pos.x} cy={pos.y} r={9} fill={colors.dark.altgold} opacity={0.25} />
        <Circle cx={pos.x} cy={pos.y} r={5} fill={colors.dark.altgold} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.dark.glassBorder,
  },
});
