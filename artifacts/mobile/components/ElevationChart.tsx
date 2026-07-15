import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Line } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { fonts } from "@/constants/typography";

export interface ElevationPoint {
  distanceKm: number;
  altM: number;
}

interface Props {
  profile: ElevationPoint[];
  height?: number;
}

const PAD = { top: 8, bottom: 4, left: 0, right: 0 };

/**
 * Zeigt das Hoehenprofil einer Wanderroute als gefuelltes Flaechendiagramm.
 * Basiert auf react-native-svg (bereits installiert). Hoehenanegaben kommen
 * vom swisstopo-Profildienst via POST /api/elevation-profile.
 */
export function ElevationChart({ profile, height = 110 }: Props) {
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
  const areaPath =
    `M${pts[0]}L${pts.join("L")}` +
    `L${toX(maxDist).toFixed(1)},${(PAD.top + chartH).toFixed(1)}` +
    `L${toX(0).toFixed(1)},${(PAD.top + chartH).toFixed(1)}Z`;

  const accentFull = colors.accent;

  return (
    <View
      onLayout={(e) => setSvgWidth(e.nativeEvent.layout.width)}
      style={[styles.wrap, { height: height + 28 }]}
    >
      {svgWidth > 0 && (
        <Svg width={svgWidth} height={height}>
          <Defs>
            <LinearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={accentFull} stopOpacity="0.30" />
              <Stop offset="1" stopColor={accentFull} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#elevGrad)" />
          <Path
            d={linePath}
            stroke={accentFull}
            strokeWidth="1.8"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            x1="0"
            y1={(PAD.top + chartH).toFixed(1)}
            x2={svgWidth.toString()}
            y2={(PAD.top + chartH).toFixed(1)}
            stroke={colors.glassBorder}
            strokeWidth="1"
          />
        </Svg>
      )}

      <View style={styles.xLabels}>
        <Text style={[styles.xLabel, { color: colors.mutedForeground }]}>0 km</Text>
        <Text style={[styles.xLabel, { color: colors.mutedForeground }]}>
          {maxDist.toFixed(1)} km
        </Text>
      </View>

      {svgWidth > 0 && (
        <>
          <View style={[styles.yLabelTop, { right: 4 }]}>
            <Text style={[styles.yLabel, { color: colors.mutedForeground }]}>
              {maxAlt} m
            </Text>
          </View>
          <View style={[styles.yLabelBottom, { right: 4, top: PAD.top + chartH - 2 }]}>
            <Text style={[styles.yLabel, { color: colors.mutedForeground }]}>
              {minAlt} m
            </Text>
          </View>
        </>
      )}
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
    marginTop: 4,
    paddingHorizontal: 2,
  },
  xLabel: {
    fontSize: 10,
    fontFamily: fonts.body,
  },
  yLabel: {
    fontSize: 9,
    fontFamily: fonts.body,
  },
  yLabelTop: {
    position: "absolute",
    top: PAD.top,
    alignItems: "flex-end",
  },
  yLabelBottom: {
    position: "absolute",
    alignItems: "flex-end",
  },
});
