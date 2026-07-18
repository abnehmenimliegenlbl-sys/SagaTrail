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

// ── Einheitliche 1–6 Gefahrenskala ───────────────────────────────────────────
// Farbpalette von grün (1) bis sehr dunkelrot (6)
const DANGER_FILL: Record<number, string> = {
  1: "#4CAF50",
  2: "#CDDC39",
  3: "#FF9800",
  4: "#F44336",
  5: "#B71C1C",
  6: "#4A0000",
};
const DANGER_TEXT_COLOR: Record<number, string> = {
  1: "#2E7D32",
  2: "#6D6E00",
  3: "#E65100",
  4: "#C62828",
  5: "#7f0000",
  6: "#300000",
};
const DANGER_LABEL: Record<number, string> = {
  1: "Gefahrenstufe 1 – Gering",
  2: "Gefahrenstufe 2 – Mäßig",
  3: "Gefahrenstufe 3 – Erheblich",
  4: "Gefahrenstufe 4 – Groß",
  5: "Gefahrenstufe 5 – Sehr groß",
  6: "Gefahrenstufe 6 – Extrem",
};

// ── UV-Index → Gefahrenstufe 1–5 ─────────────────────────────────────────────
function uvToLevel(uv: number): number {
  if (uv < 3)  return 1;
  if (uv < 6)  return 2;
  if (uv < 8)  return 3;
  if (uv < 11) return 4;
  return 5;
}

// ── Gefahren-Quellen mit Emoji ────────────────────────────────────────────────
interface Hazard { level: number; icon: string; label: string }

// ── Layout-Konstanten ─────────────────────────────────────────────────────────
const PAD = { top: 18, bottom: 4, left: 0, right: 0 };
const LABEL_H  = 17;
const LABEL_INS = 4;

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  profile: ElevationPoint[];
  height?: number;
  /** Lawinengefahr 1–5 aus EAWS-Bulletin */
  dangerLevel?: number | null;
  /** Schneegrenze in Metern (default 2000) */
  snowLineM?: number;
  /** UV-Index aus Wetterdaten */
  uvIndex?: number | null;
  /** true wenn Gewittergefahr */
  isThunderstorm?: boolean;
}

// ── Komponente ────────────────────────────────────────────────────────────────
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

  const chartH  = height - PAD.top - PAD.bottom;
  const minAlt  = Math.min(...profile.map((p) => p.altM));
  const maxAlt  = Math.max(...profile.map((p) => p.altM));
  const altRange = maxAlt - minAlt || 1;
  const maxDist  = profile[profile.length - 1].distanceKm;

  const toX = (d: number) => (svgWidth > 0 ? (d / maxDist) * svgWidth : 0);
  const toY = (a: number) => PAD.top + (1 - (a - minAlt) / altRange) * chartH;

  const pts = profile.map(
    (p) => `${toX(p.distanceKm).toFixed(1)},${toY(p.altM).toFixed(1)}`
  );
  const linePath = `M${pts.join("L")}`;
  const baseY    = PAD.top + chartH;
  const areaPath =
    `M${pts[0]}L${pts.join("L")}` +
    `L${toX(maxDist).toFixed(1)},${baseY.toFixed(1)}` +
    `L${toX(0).toFixed(1)},${baseY.toFixed(1)}Z`;

  // ── Alle Gefahrenquellen sammeln & höchste Stufe bestimmen ────────────────
  const hazards: Hazard[] = [];

  if (dangerLevel && dangerLevel >= 1) {
    hazards.push({ level: dangerLevel, icon: "🏔️", label: `Lawine Stufe ${dangerLevel}` });
    // Schnee/Eis: wenn Route über Schneegrenze reicht
    if (maxAlt > snowLineM) {
      hazards.push({ level: dangerLevel, icon: "❄️", label: `Schnee/Eis ab ${snowLineM} m` });
    }
  }
  if (isThunderstorm) {
    hazards.push({ level: 4, icon: "⛈️", label: "Gewittergefahr" });
  }
  if (uvIndex != null && uvIndex >= 3) {
    hazards.push({ level: uvToLevel(uvIndex), icon: "☀️", label: `UV ${uvIndex.toFixed(0)}` });
  }

  const effectiveLevel = hazards.length > 0
    ? Math.min(6, Math.max(...hazards.map((h) => h.level)))
    : 0;

  const textColor = DANGER_TEXT_COLOR[effectiveLevel] ?? "#b84800";
  const pill  = colors.card;
  const accent = colors.accent;

  // Deduplizierte Icons (höchste Stufe zuerst, nur unique icons)
  const sortedHazards = [...hazards]
    .sort((a, b) => b.level - a.level)
    .filter((h, i, arr) => arr.findIndex((x) => x.icon === h.icon) === i);

  // Mehrstufiger Gradient: grün (unten/sicher) → höchste Gefahrenstufe (oben/Gipfel)
  // offset=0 entspricht dem oberen SVG-Rand (Gipfel), offset=1 dem unteren (Tal).
  const level = effectiveLevel > 0 ? effectiveLevel : 1;
  const gradStops: { offset: string; color: string; opacity: string }[] = [];
  if (level === 1) {
    gradStops.push({ offset: "0", color: DANGER_FILL[1], opacity: "0.40" });
    gradStops.push({ offset: "1", color: DANGER_FILL[1], opacity: "0.06" });
  } else {
    for (let l = level; l >= 1; l--) {
      const t = (level - l) / (level - 1);             // 0 am Gipfel, 1 im Tal
      const offset = t.toFixed(2);
      const opacity = (0.55 - t * 0.49).toFixed(2);   // 0.55 oben → 0.06 unten
      gradStops.push({ offset, color: DANGER_FILL[l], opacity });
    }
  }

  return (
    <View
      onLayout={(e) => setSvgWidth(e.nativeEvent.layout.width)}
      style={styles.wrap}
    >
      {svgWidth > 0 && (
        <Svg width={svgWidth} height={height}>
          <Defs>
            {/* Mehrstufiger Farbgradient: Stufe 1 (grün) im Tal → höchste Stufe am Gipfel */}
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              {gradStops.map((s) => (
                <Stop
                  key={s.offset}
                  offset={s.offset}
                  stopColor={s.color}
                  stopOpacity={s.opacity}
                />
              ))}
            </LinearGradient>
          </Defs>

          {/* ── Fläche unterhalb der Höhenlinie (farbcodiert nach Gefahrenstufe) */}
          <Path d={areaPath} fill="url(#areaGrad)" />

          {/* ── Höhenprofilkurve ──────────────────────────────────────────── */}
          <Path
            d={linePath}
            stroke={accent}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* ── Basislinie ────────────────────────────────────────────────── */}
          <Line
            x1="0"
            y1={baseY.toFixed(1)}
            x2={svgWidth.toString()}
            y2={baseY.toFixed(1)}
            stroke={colors.glassBorder}
            strokeWidth="1"
          />

          {/* ── Max-Höhe Label (oben rechts) ──────────────────────────────── */}
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
            x={(svgWidth - LABEL_INS).toFixed(1)}
            y={(PAD.top + LABEL_H - 5).toFixed(1)}
            fontSize="12"
            fill={colors.foreground}
            textAnchor="end"
          >
            {maxAlt} m
          </SvgText>

          {/* ── Min-Höhe Label (unten rechts, über Basislinie) ────────────── */}
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
            x={(svgWidth - LABEL_INS).toFixed(1)}
            y={(baseY - 4).toFixed(1)}
            fontSize="12"
            fill={colors.foreground}
            textAnchor="end"
          >
            {minAlt} m
          </SvgText>
        </Svg>
      )}

      {/* ── X-Achse ────────────────────────────────────────────────────────── */}
      <View style={styles.xLabels}>
        <Text style={[styles.xLabel, { color: colors.mutedForeground }]}>0 km</Text>
        <Text style={[styles.xLabel, { color: colors.mutedForeground }]}>
          {maxDist.toFixed(1)} km
        </Text>
      </View>

      {/* ── Gefahren-Badge (React Native, kein SVG → kein Überlappen) ──────── */}
      {effectiveLevel > 0 && (
        <View
          style={[
            styles.dangerBadge,
            {
              backgroundColor: gradStops[0].color + "22",
              borderColor: gradStops[0].color + "66",
            },
          ]}
        >
          <Text style={styles.dangerIcons}>
            {sortedHazards.map((h) => h.icon).join("  ")}
          </Text>
          <Text style={[styles.dangerLabel, { color: textColor }]}>
            {DANGER_LABEL[effectiveLevel] ?? `Stufe ${effectiveLevel}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  xLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 2,
  },
  xLabel: {
    fontSize: 11,
    fontFamily: fonts.body,
  },
  dangerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dangerIcons: {
    fontSize: 13,
  },
  dangerLabel: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
  },
});
