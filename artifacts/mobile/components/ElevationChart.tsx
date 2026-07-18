import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { fonts } from "@/constants/typography";

export interface ElevationPoint {
  distanceKm: number;
  altM: number;
}

const DANGER_COLORS: Record<number, string> = {
  1: "#78C800",
  2: "#FFD000",
  3: "#FF8000",
  4: "#FF0000",
  5: "#333333",
};

const DANGER_LABEL_COLORS: Record<number, string> = {
  1: "#4a8800",
  2: "#b08800",
  3: "#c05000",
  4: "#cc0000",
  5: "#222222",
};

interface Props {
  profile: ElevationPoint[];
  height?: number;
  dangerLevel?: number | null;
  snowLineM?: number;
}

const PAD = { top: 18, bottom: 4, left: 0, right: 0 };
const LABEL_H = 17;
const LABEL_INSET = 4;

export function ElevationChart({
  profile,
  height = 130,
  dangerLevel,
  snowLineM = 2000,
}: Props) {
  const colors = useColors();
  const [svgWidth, setSvgWidth] = useState(0);

  if (profile.length < 2) return null;

  const chartH = height - PAD.top - PAD.bottom;
  const minAlt = Math.min(...profile.map((p) => p.altM));
  const maxAlt = Math.max(...profile.map((p) => p.altM));
  const altRange = maxAlt - minAlt || 1;
  const maxDist = profile[profile.length - 1].distanceKm;

  const toX = (d: number) => (svgWidth > 0 ? (d / maxDist) * svgWidth : 0);
  const toY = (a: number) => PAD.top + (1 - (a - minAlt) / altRange) * chartH;

  const pts = profile.map(
    (p) => `${toX(p.distanceKm).toFixed(1)},${toY(p.altM).toFixed(1)}`
  );
  const linePath = `M${pts.join("L")}`;
  const baseY = PAD.top + chartH;
  const areaPath =
    `M${pts[0]}L${pts.join("L")}` +
    `L${toX(maxDist).toFixed(1)},${baseY.toFixed(1)}` +
    `L${toX(0).toFixed(1)},${baseY.toFixed(1)}Z`;

  const accent = colors.accent;

  // Danger zone: only shown if route reaches above snow line
  const dColor = dangerLevel ? (DANGER_COLORS[dangerLevel] ?? "#FF8000") : null;
  const dLabelColor = dangerLevel ? (DANGER_LABEL_COLORS[dangerLevel] ?? "#c05000") : null;
  const showDanger = !!(dColor && maxAlt > snowLineM && snowLineM > minAlt);
  const snowY = showDanger ? toY(snowLineM) : null;

  // Semi-transparent card background for label pills
  const pill = colors.card;

  return (
    <View
      onLayout={(e) => setSvgWidth(e.nativeEvent.layout.width)}
      style={[styles.wrap, { height: height + 24 }]}
    >
      {svgWidth > 0 && (
        <Svg width={svgWidth} height={height}>
          <Defs>
            <LinearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accent} stopOpacity="0.28" />
              <Stop offset="1" stopColor={accent} stopOpacity="0.02" />
            </LinearGradient>
            {showDanger && (
              <LinearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={dColor!} stopOpacity="0.22" />
                <Stop offset="1" stopColor={dColor!} stopOpacity="0.06" />
              </LinearGradient>
            )}
          </Defs>

          {/* ── Gefahren-Band (oberhalb Schneegrenze) ─────────────── */}
          {showDanger && snowY !== null && (
            <Rect
              x="0"
              y={PAD.top.toFixed(1)}
              width={svgWidth}
              height={(snowY - PAD.top).toFixed(1)}
              fill="url(#dangerGrad)"
            />
          )}

          {/* ── Fläche unter dem Profil ────────────────────────── */}
          <Path d={areaPath} fill="url(#elevGrad)" />

          {/* ── Profilkurve ──────────────────────────────────────── */}
          <Path
            d={linePath}
            stroke={accent}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ── Schneegrenz-Linie ─────────────────────────────────── */}
          {showDanger && snowY !== null && (
            <Line
              x1="0"
              y1={snowY.toFixed(1)}
              x2={svgWidth.toString()}
              y2={snowY.toFixed(1)}
              stroke={dColor!}
              strokeWidth="1"
              strokeDasharray="5,3"
              strokeOpacity="0.65"
            />
          )}

          {/* ── Basislinie ────────────────────────────────────────── */}
          <Line
            x1="0"
            y1={baseY.toFixed(1)}
            x2={svgWidth.toString()}
            y2={baseY.toFixed(1)}
            stroke={colors.glassBorder}
            strokeWidth="1"
          />

          {/* ── Max-Höhe Label (oben rechts) ─────────────────────── */}
          <Rect
            x={(svgWidth - 56).toFixed(1)}
            y={(PAD.top - 1).toFixed(1)}
            width="56"
            height={LABEL_H}
            fill={pill}
            fillOpacity="0.92"
            rx="4"
          />
          <SvgText
            x={(svgWidth - LABEL_INSET).toFixed(1)}
            y={(PAD.top + LABEL_H - 5).toFixed(1)}
            fontSize="12"
            fill={colors.foreground}
            textAnchor="end"
          >
            {maxAlt} m
          </SvgText>

          {/* ── Min-Höhe Label (unten rechts, oberhalb Basislinie) ── */}
          <Rect
            x={(svgWidth - 56).toFixed(1)}
            y={(baseY - LABEL_H - 1).toFixed(1)}
            width="56"
            height={LABEL_H}
            fill={pill}
            fillOpacity="0.92"
            rx="4"
          />
          <SvgText
            x={(svgWidth - LABEL_INSET).toFixed(1)}
            y={(baseY - 4).toFixed(1)}
            fontSize="12"
            fill={colors.foreground}
            textAnchor="end"
          >
            {minAlt} m
          </SvgText>

          {/* ── Schneegrenz-Label (rechts neben Linie) ────────────── */}
          {showDanger && snowY !== null && (
            <>
              <Rect
                x={(svgWidth - 80).toFixed(1)}
                y={(snowY - LABEL_H - 2).toFixed(1)}
                width="80"
                height={LABEL_H}
                fill={pill}
                fillOpacity="0.90"
                rx="4"
              />
              <SvgText
                x={(svgWidth - LABEL_INSET).toFixed(1)}
                y={(snowY - 6).toFixed(1)}
                fontSize="10"
                fill={dLabelColor!}
                textAnchor="end"
              >
                {snowLineM} m · Stufe {dangerLevel}
              </SvgText>
            </>
          )}
        </Svg>
      )}

      {/* ── X-Achse ────────────────────────────────────────────────── */}
      <View style={styles.xLabels}>
        <Text style={[styles.xLabel, { color: colors.mutedForeground }]}>0 km</Text>
        <Text style={[styles.xLabel, { color: colors.mutedForeground }]}>
          {maxDist.toFixed(1)} km
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    width: "100%",
  },
  xLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    paddingHorizontal: 2,
  },
  xLabel: {
    fontSize: 11,
    fontFamily: fonts.body,
  },
});
