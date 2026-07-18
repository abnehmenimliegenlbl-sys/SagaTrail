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

// ── Gefahrenstufen-Farbpaletten ──────────────────────────────────────────────

const DANGER_COLORS: Record<number, string> = {
  1: "#78C800",
  2: "#FFD000",
  3: "#FF8000",
  4: "#FF0000",
  5: "#333333",
};
const DANGER_LABEL_COLORS: Record<number, string> = {
  1: "#3e7000",
  2: "#9a6c00",
  3: "#b84800",
  4: "#cc0000",
  5: "#111111",
};

// UV-Index → Hintergrundfarbe (WHO-Palette)
function uvColor(uv: number): string {
  if (uv < 3) return "#78C800";   // niedrig – grün
  if (uv < 6) return "#FFD000";   // moderat – gelb
  if (uv < 8) return "#FF8000";   // hoch – orange
  if (uv < 11) return "#FF0000";  // sehr hoch – rot
  return "#9400D3";                // extrem – violett
}
function uvLabel(uv: number): string {
  if (uv < 3) return "UV niedrig";
  if (uv < 6) return "UV moderat";
  if (uv < 8) return "UV hoch";
  if (uv < 11) return "UV sehr hoch";
  return "UV extrem";
}
function uvLabelColor(uv: number): string {
  if (uv < 3) return "#3e7000";
  if (uv < 6) return "#9a6c00";
  if (uv < 8) return "#b84800";
  if (uv < 11) return "#aa0000";
  return "#6a00aa";
}

// ── Konstanten ───────────────────────────────────────────────────────────────

const UV_BASE_M = 1500;      // ab hier gilt erhöhter UV-Index (Faustregel Alpen)
const PAD = { top: 18, bottom: 4, left: 0, right: 0 };
const LABEL_H = 17;
const LABEL_INSET = 4;

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  profile: ElevationPoint[];
  height?: number;
  /** Lawinengefahr 1–5, null = kein Bulletin */
  dangerLevel?: number | null;
  /** Schneegrenze in Metern (default 2000) */
  snowLineM?: number;
  /** UV-Index aus Wetterdaten (Talstation) */
  uvIndex?: number | null;
  /** Gewittergefahr aus WMO-Code */
  isThunderstorm?: boolean;
}

// ── Komponente ───────────────────────────────────────────────────────────────

export function ElevationChart({
  profile,
  height = 140,
  dangerLevel,
  snowLineM = 2000,
  uvIndex,
  isThunderstorm = false,
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
  const pill = colors.card;

  // ── Lavinen-Band ──────────────────────────────────────────────────────────
  const dColor = dangerLevel ? (DANGER_COLORS[dangerLevel] ?? "#FF8000") : null;
  const dLabelColor = dangerLevel ? (DANGER_LABEL_COLORS[dangerLevel] ?? "#b84800") : null;
  const showDanger = !!(dColor && maxAlt > snowLineM && snowLineM > minAlt);
  const snowY = showDanger ? toY(snowLineM) : null;

  // ── UV-Band ───────────────────────────────────────────────────────────────
  // Zeige UV-Warnung ab UV_BASE_M wenn UV ≥ 3 und Route reicht bis dort
  const showUv = !!(uvIndex != null && uvIndex >= 3 && maxAlt > UV_BASE_M);
  const uvBaseAlt = Math.max(UV_BASE_M, minAlt); // Startpunkt des Bandes
  const uvY = showUv ? toY(uvBaseAlt) : null;
  // UV-Band endet oben an der Schneegrenze (wenn Lawinenband aktiv), sonst oben
  const uvTopY = showUv
    ? showDanger && snowY !== null
      ? snowY  // UV-Band bis zur Schneegrenze, darüber Lawinen-Band
      : PAD.top
    : null;
  const uvBandH =
    uvY !== null && uvTopY !== null ? uvY - uvTopY : null;

  const uvc = uvIndex != null ? uvColor(uvIndex) : null;
  const uvlc = uvIndex != null ? uvLabelColor(uvIndex) : null;

  // ── Gewitter-Streifen ─────────────────────────────────────────────────────
  const THUNDER_H = 14;

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

            {showUv && (
              <LinearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={uvc!} stopOpacity="0.18" />
                <Stop offset="1" stopColor={uvc!} stopOpacity="0.04" />
              </LinearGradient>
            )}
          </Defs>

          {/* ── Gewitter-Streifen (ganz oben) ──────────────────────────── */}
          {isThunderstorm && (
            <Rect
              x="0"
              y={PAD.top.toFixed(1)}
              width={svgWidth}
              height={THUNDER_H}
              fill="#FF4400"
              fillOpacity="0.18"
            />
          )}

          {/* ── UV-Band ─────────────────────────────────────────────────── */}
          {showUv && uvTopY !== null && uvBandH !== null && uvBandH > 2 && (
            <Rect
              x="0"
              y={uvTopY.toFixed(1)}
              width={svgWidth}
              height={uvBandH.toFixed(1)}
              fill="url(#uvGrad)"
            />
          )}

          {/* ── Lavinen-Band (oberhalb Schneegrenze) ───────────────────── */}
          {showDanger && snowY !== null && (
            <Rect
              x="0"
              y={PAD.top.toFixed(1)}
              width={svgWidth}
              height={(snowY - PAD.top).toFixed(1)}
              fill="url(#dangerGrad)"
            />
          )}

          {/* ── Fläche unter dem Profil ────────────────────────────────── */}
          <Path d={areaPath} fill="url(#elevGrad)" />

          {/* ── Profilkurve ─────────────────────────────────────────────── */}
          <Path
            d={linePath}
            stroke={accent}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ── UV-Basislinie ────────────────────────────────────────────── */}
          {showUv && uvY !== null && (
            <Line
              x1="0"
              y1={uvY.toFixed(1)}
              x2={svgWidth.toString()}
              y2={uvY.toFixed(1)}
              stroke={uvc!}
              strokeWidth="1"
              strokeDasharray="4,3"
              strokeOpacity="0.55"
            />
          )}

          {/* ── Schneegrenz-Linie ────────────────────────────────────────── */}
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

          {/* ── Basislinie ───────────────────────────────────────────────── */}
          <Line
            x1="0"
            y1={baseY.toFixed(1)}
            x2={svgWidth.toString()}
            y2={baseY.toFixed(1)}
            stroke={colors.glassBorder}
            strokeWidth="1"
          />

          {/* ── Max-Höhe Label (oben rechts) ─────────────────────────────── */}
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

          {/* ── Min-Höhe Label (unten rechts, über Basislinie) ───────────── */}
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

          {/* ── UV-Label ────────────────────────────────────────────────── */}
          {showUv && uvY !== null && uvIndex != null && (
            <>
              <Rect
                x={(svgWidth - 100).toFixed(1)}
                y={(uvY - LABEL_H - 2).toFixed(1)}
                width="100"
                height={LABEL_H}
                fill={pill}
                fillOpacity="0.90"
                rx="4"
              />
              <SvgText
                x={(svgWidth - LABEL_INSET).toFixed(1)}
                y={(uvY - 6).toFixed(1)}
                fontSize="10"
                fill={uvlc!}
                textAnchor="end"
              >
                {uvBaseAlt} m · {uvLabel(uvIndex)} {uvIndex.toFixed(0)}
              </SvgText>
            </>
          )}

          {/* ── Schneegrenz-Label ────────────────────────────────────────── */}
          {showDanger && snowY !== null && (
            <>
              <Rect
                x={(svgWidth - 90).toFixed(1)}
                y={(snowY - LABEL_H - 2).toFixed(1)}
                width="90"
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

          {/* ── Gewitter-Label (oben links) ──────────────────────────────── */}
          {isThunderstorm && (
            <>
              <Rect
                x="4"
                y={(PAD.top + 1).toFixed(1)}
                width="100"
                height={LABEL_H - 2}
                fill={pill}
                fillOpacity="0.88"
                rx="4"
              />
              <SvgText
                x="8"
                y={(PAD.top + LABEL_H - 7).toFixed(1)}
                fontSize="10"
                fill="#cc3300"
                textAnchor="start"
              >
                ⚡ Gewittergefahr
              </SvgText>
            </>
          )}
        </Svg>
      )}

      {/* ── X-Achse ─────────────────────────────────────────────────────────── */}
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
