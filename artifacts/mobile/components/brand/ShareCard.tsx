import React, { forwardRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Polygon, Rect, Stop } from "react-native-svg";

import { SparkMountain } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";

// ─── Typen ──────────────────────────────────────────────────────────────────
export interface ElevationPoint {
  distanceKm: number;
  altM: number;
}

interface ShareCardProps {
  sagaTitle: string;
  routeName: string;
  canton?: string;
  distanceKm: number;
  ascentM: number;
  maxAltM?: number;
  sacScale: string;
  durationMin?: number;
  steps?: number;
  geometry?: number[][];
  photoUri?: string;
  elevationProfile?: ElevationPoint[];
  visitedPlaceCount?: number;
  distanceLabel: string;
  ascentLabel: string;
  timeLabel: string;
  stepsLabel: string;
}

// ─── Karten-Konstanten ───────────────────────────────────────────────────────
const CARD_W = 390;
const MAP_H = 168;
const MAP_PAD = 14;
const TILE_SIZE = 256;
const MAX_TILES = 14;

/** swisstopo Pixelkarte Farbe (Web-Mercator, öffentlich, ohne Auth) */
const tileUrl = (z: number, x: number, y: number) =>
  `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/${z}/${x}/${y}.jpeg`;

/** Web-Mercator: [lat, lng] → globale Pixelkoordinate bei gegebenem Zoom */
function latLngToPixel(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function buildRouteMap(geometry: number[][], width: number, height: number, padding: number) {
  if (!geometry || geometry.length < 2) return null;

  const BBOX_EXPAND = 0.4;
  const MAX_ZOOM = 15;

  const expandedBounds = (z: number) => {
    const pts = geometry.map(([lat, lng]) => latLngToPixel(lat, lng, z));
    const rawMinX = Math.min(...pts.map((p) => p.x));
    const rawMaxX = Math.max(...pts.map((p) => p.x));
    const rawMinY = Math.min(...pts.map((p) => p.y));
    const rawMaxY = Math.max(...pts.map((p) => p.y));
    const rawSpanX = Math.max(rawMaxX - rawMinX, 1);
    const rawSpanY = Math.max(rawMaxY - rawMinY, 1);
    return {
      pts,
      minX: rawMinX - rawSpanX * BBOX_EXPAND,
      maxX: rawMaxX + rawSpanX * BBOX_EXPAND,
      minY: rawMinY - rawSpanY * BBOX_EXPAND,
      maxY: rawMaxY + rawSpanY * BBOX_EXPAND,
    };
  };

  let zoom = 10;
  for (let z = 10; z <= MAX_ZOOM; z++) {
    const b = expandedBounds(z);
    const tilesX = Math.ceil((b.maxX - b.minX) / TILE_SIZE) + 2;
    const tilesY = Math.ceil((b.maxY - b.minY) / TILE_SIZE) + 2;
    if (tilesX * tilesY <= MAX_TILES) zoom = z;
    else break;
  }

  const bounds = expandedBounds(zoom);
  const { pts: rawPts, minX, maxX, minY, maxY } = bounds;
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scale = Math.min(innerW / spanX, innerH / spanY, 3);
  const usedW = spanX * scale;
  const usedH = spanY * scale;
  const offsetX = padding + (innerW - usedW) / 2 - minX * scale;
  const offsetY = padding + (innerH - usedH) / 2 - minY * scale;

  const points = rawPts.map((p) => ({ x: p.x * scale + offsetX, y: p.y * scale + offsetY }));
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const tileMinX = Math.floor(minX / TILE_SIZE) - 1;
  const tileMaxX = Math.floor(maxX / TILE_SIZE) + 1;
  const tileMinY = Math.floor(minY / TILE_SIZE) - 1;
  const tileMaxY = Math.floor(maxY / TILE_SIZE) + 1;
  const tileCount = 2 ** zoom;

  const tiles: { key: string; uri: string; left: number; top: number; size: number }[] = [];
  for (let ty = tileMinY; ty <= tileMaxY; ty++) {
    if (ty < 0 || ty >= tileCount) continue;
    for (let tx = tileMinX; tx <= tileMaxX; tx++) {
      const wrappedX = ((tx % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${zoom}_${wrappedX}_${ty}`,
        uri: tileUrl(zoom, wrappedX, ty),
        left: tx * TILE_SIZE * scale + offsetX,
        top: ty * TILE_SIZE * scale + offsetY,
        size: TILE_SIZE * scale,
      });
    }
  }

  return { d, start: points[0], end: points[points.length - 1], tiles };
}

// ─── Kleine SVG-Icons ────────────────────────────────────────────────────────
const IC = 14;
function IconPin() {
  return (
    <Svg width={IC} height={IC} viewBox="0 0 14 14">
      <Path d="M7 1A4 4 0 0 0 3 5c0 3.5 4 8 4 8s4-4.5 4-8A4 4 0 0 0 7 1z" fill="#cc0000" />
      <Circle cx="7" cy="5" r="1.5" fill="white" />
    </Svg>
  );
}
function IconUp() {
  return (
    <Svg width={IC} height={IC} viewBox="0 0 14 14">
      <Path d="M7 1L12 7H9.5V13H4.5V7H2L7 1z" fill="#cc0000" />
    </Svg>
  );
}
function IconPeak() {
  return (
    <Svg width={IC} height={IC} viewBox="0 0 14 14">
      <Path d="M7 1L13 13H1L7 1z" fill="#cc0000" />
      <Path d="M5 7L7 4.5L9 7" fill="white" opacity={0.4} />
    </Svg>
  );
}
function IconClock() {
  return (
    <Svg width={IC} height={IC} viewBox="0 0 14 14">
      <Circle cx="7" cy="7" r="6" fill="none" stroke="#cc0000" strokeWidth="1.5" />
      <Path d="M7 4V7L9.5 8.5" stroke="#cc0000" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </Svg>
  );
}
function IconFoot() {
  return (
    <Svg width={IC} height={IC} viewBox="0 0 14 14">
      <Path d="M3 12V8H6V4H8V8H11V12H3z" fill="#cc0000" />
      <Circle cx="7" cy="2.5" r="1.5" fill="#cc0000" />
    </Svg>
  );
}
function IconLandmark() {
  return (
    <Svg width={IC} height={IC} viewBox="0 0 14 14">
      <Rect x="1" y="12" width="12" height="1.5" fill="#cc0000" rx="0.5" />
      <Rect x="4" y="7" width="2" height="5" fill="#cc0000" />
      <Rect x="8" y="7" width="2" height="5" fill="#cc0000" />
      <Path d="M1 7L7 2L13 7H1z" fill="#cc0000" />
    </Svg>
  );
}

// ─── Höhenprofil-Chart ───────────────────────────────────────────────────────
function ElevationMiniChart({ profile, width }: { profile: ElevationPoint[]; width: number }) {
  if (!profile || profile.length < 2) return null;

  const H = 52;
  const PAD_TOP = 14;
  const PAD_BTM = 2;
  const chartH = H - PAD_TOP - PAD_BTM;

  const minAlt = Math.min(...profile.map((p) => p.altM));
  const maxAlt = Math.max(...profile.map((p) => p.altM));
  const maxDist = profile[profile.length - 1].distanceKm;

  const toX = (d: number) => (d / maxDist) * width;
  const toY = (a: number) =>
    PAD_TOP + (1 - (a - minAlt) / Math.max(maxAlt - minAlt, 1)) * chartH;

  const pts = profile.map((p) => `${toX(p.distanceKm).toFixed(1)},${toY(p.altM).toFixed(1)}`);
  const linePath = `M${pts.join("L")}`;
  const baseY = PAD_TOP + chartH;
  const areaPath = `M${pts[0]}L${pts.join("L")}L${toX(maxDist).toFixed(1)},${baseY}L0,${baseY}Z`;

  return (
    <View>
      <Svg width={width} height={H} viewBox={`0 0 ${width} ${H}`}>
        <Defs>
          <SvgGradient id="elev-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#cc0000" stopOpacity={0.3} />
            <Stop offset="100%" stopColor="#cc0000" stopOpacity={0.04} />
          </SvgGradient>
        </Defs>
        {/* Gridlines */}
        <Path d={`M0,${(PAD_TOP + baseY) / 2} L${width},${(PAD_TOP + baseY) / 2}`}
          stroke="#e5e7eb" strokeWidth="0.8" />
        {/* Area fill */}
        <Path d={areaPath} fill="url(#elev-fill)" />
        {/* Line */}
        <Path d={linePath} fill="none" stroke="#cc0000" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Baseline */}
        <Path d={`M0,${baseY} L${width},${baseY}`} stroke="#e5e7eb" strokeWidth="0.8" />
        {/* Max label */}
        <Rect x={width - 42} y={PAD_TOP - 12} width={42} height={13} fill="white" fillOpacity={0.92} rx={2} />
        <Path
          d={`M${width - 3},${PAD_TOP - 3}`}
          stroke="none" fill="none"
        />
      </Svg>
      {/* Altitude labels drawn in RN (not SVG) for font consistency */}
      <View style={s.elevLabels} pointerEvents="none">
        <Text style={s.elevLabelMax}>{maxAlt} m</Text>
        <Text style={s.elevLabelMin}>{minAlt} m</Text>
      </View>
      {/* Distance labels */}
      <View style={s.elevDistLabels}>
        <Text style={s.elevDistLabel}>0 km</Text>
        <Text style={s.elevDistLabel}>{maxDist.toFixed(1)} km</Text>
      </View>
    </View>
  );
}

// ─── Einzelne Stat-Kachel ────────────────────────────────────────────────────
function StatTile({
  icon,
  value,
  unit,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <View style={s.statTile}>
      {icon}
      <View style={s.statValRow}>
        <Text style={s.statVal}>{value}</Text>
        <Text style={s.statUnit}>{unit}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Hauptkomponente ─────────────────────────────────────────────────────────
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(props, ref) {
  const {
    sagaTitle,
    routeName,
    canton,
    distanceKm,
    ascentM,
    maxAltM,
    sacScale,
    durationMin,
    steps,
    geometry,
    photoUri,
    elevationProfile,
    visitedPlaceCount,
    distanceLabel,
    ascentLabel,
    timeLabel,
    stepsLabel,
  } = props;

  const route = geometry ? buildRouteMap(geometry, CARD_W - 24, MAP_H, MAP_PAD) : null;

  // Elevation chart width: 3/5 der Stat-Row minus 2 gaps
  const innerW = CARD_W - 24; // 366
  const colW = (innerW - 4 * 6) / 5; // 68.4
  const elevW = colW * 3 + 2 * 6 - 20; // ~197 (inner padding subtracted)

  return (
    <View ref={ref} collapsable={false} style={s.card}>

      {/* ── HERO ── */}
      <View style={s.hero}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={["#1a2e1a", "#0d1f2d", "#101c20"]}
            style={StyleSheet.absoluteFill}
          />
        )}
        {/* Oberer Schleier */}
        <LinearGradient
          colors={["rgba(0,0,0,0.45)", "transparent"]}
          style={[StyleSheet.absoluteFill, { height: "60%" }]}
        />
        {/* Unterer Übergang zu weissem Hintergrund */}
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.85)", "#ffffff"]}
          locations={[0.4, 0.8, 1]}
          style={[StyleSheet.absoluteFill, { top: "40%" }]}
        />
        {/* Titel-Overlay */}
        <View style={s.heroTextWrap}>
          {canton ? (
            <View style={s.cantonRow}>
              <View style={s.cantonDot} />
              <Text style={s.cantonLabel}>{canton.toUpperCase()}</Text>
            </View>
          ) : null}
          <Text style={s.heroTitle} numberOfLines={2}>{routeName}</Text>
          <Text style={s.heroSub} numberOfLines={1}>
            {sacScale ? `${sacScale} · Wanderweg` : "Wanderweg"}
          </Text>
        </View>
      </View>

      {/* ── STATS ── */}
      <View style={s.statsSection}>

        {/* Zeile 1: 5 Metriken */}
        <View style={s.statsRow}>
          <StatTile icon={<IconPin />} value={`${distanceKm}`} unit="km" label={distanceLabel} />
          <StatTile icon={<IconUp />} value={`${ascentM}`} unit="m" label={ascentLabel} />
          <StatTile
            icon={<IconPeak />}
            value={maxAltM ? `${maxAltM}` : "–"}
            unit={maxAltM ? "m" : ""}
            label="MAX. HÖHE"
          />
          <StatTile
            icon={<IconClock />}
            value={durationMin ? `${Math.floor(durationMin / 60)}:${String(durationMin % 60).padStart(2, "0")}` : "–"}
            unit={durationMin ? "h" : ""}
            label={timeLabel}
          />
          <StatTile
            icon={<IconFoot />}
            value={steps && steps > 0 ? `${(steps / 1000).toFixed(1)}` : "–"}
            unit={steps && steps > 0 ? "k" : ""}
            label={stepsLabel}
          />
        </View>

        {/* Zeile 2: SAC + POIs + Höhenprofil */}
        <View style={[s.statsRow, { marginTop: 6 }]}>
          {/* SAC-Badge */}
          <View style={[s.statTile, s.sacTile]}>
            <View style={s.sacBadge}>
              <Text style={s.sacText}>{sacScale || "–"}</Text>
            </View>
            <Text style={[s.statLabel, { marginTop: 4 }]}>SAC</Text>
          </View>

          {/* POIs */}
          <View style={[s.statTile]}>
            <IconLandmark />
            <View style={s.statValRow}>
              <Text style={s.statVal}>{visitedPlaceCount ?? 0}</Text>
            </View>
            <Text style={s.statLabel}>POIS</Text>
          </View>

          {/* Höhenprofil — 3 Spalten breit */}
          <View style={[s.elevTile, { width: colW * 3 + 2 * 6 }]}>
            <Text style={s.elevHeader}>HÖHENPROFIL</Text>
            {elevationProfile && elevationProfile.length >= 2 ? (
              <ElevationMiniChart profile={elevationProfile} width={elevW} />
            ) : (
              <View style={s.elevPlaceholder}>
                <Text style={s.elevPlaceholderText}>↑ {ascentM} m</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── SAGE ── */}
      <View style={s.sagaCard}>
        {/* Thumbnail — stilisiertes Motiv */}
        <View style={s.sagaThumb}>
          <LinearGradient
            colors={["#3e2a1a", "#5a3820", "#2a1608"]}
            style={StyleSheet.absoluteFill}
          />
          <Svg width={46} height={46} viewBox="0 0 46 46" style={StyleSheet.absoluteFill}>
            <Rect x="16" y="20" width="14" height="22" fill="rgba(255,255,255,0.22)" />
            <Polygon points="23,8 13,20 33,20" fill="rgba(255,255,255,0.28)" />
            <Rect x="20" y="12" width="6" height="7" fill="rgba(255,255,255,0.15)" />
            <Rect x="17" y="30" width="6" height="12" fill="rgba(0,0,0,0.28)" />
          </Svg>
        </View>
        <View style={s.sagaText}>
          <Text style={s.sagaEyebrow}>🧚 SAGE DIESER ROUTE</Text>
          <Text style={s.sagaTitle} numberOfLines={2}>{sagaTitle}</Text>
        </View>
        <Svg width={14} height={14} viewBox="0 0 14 14" style={s.sagaChevron}>
          <Path d="M5 2L10 7L5 12" stroke="#cc0000" strokeWidth="2" strokeLinecap="round" fill="none" />
        </Svg>
      </View>

      {/* ── KARTE ── */}
      <View style={s.mapWrap}>
        {route ? (
          <>
            {route.tiles.map((tile) => (
              <Image
                key={tile.key}
                source={{ uri: tile.uri }}
                style={{
                  position: "absolute",
                  left: tile.left,
                  top: tile.top,
                  width: tile.size,
                  height: tile.size,
                }}
              />
            ))}
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${CARD_W - 24} ${MAP_H}`}
              style={StyleSheet.absoluteFill}
            >
              {/* Schatten */}
              <Path
                d={route.d}
                stroke="rgba(180,0,0,0.2)"
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Route */}
              <Path
                d={route.d}
                stroke="#cc0000"
                strokeWidth={3.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Start */}
              <Circle cx={route.start.x} cy={route.start.y} r={6} fill="#cc0000" />
              <Circle cx={route.start.x} cy={route.start.y} r={3} fill="white" />
              {/* Ziel */}
              <Circle cx={route.end.x} cy={route.end.y} r={6} fill="white" stroke="#cc0000" strokeWidth={2} />
              <Circle cx={route.end.x} cy={route.end.y} r={2.5} fill="#cc0000" />
            </Svg>
          </>
        ) : (
          <View style={s.mapFallback}>
            <Text style={s.mapFallbackText}>{sacScale}</Text>
          </View>
        )}
      </View>

      {/* ── FOOTER ── */}
      <View style={s.footer}>
        <View style={s.footerLeft}>
          <View style={s.footerIcon}>
            <SparkMountain size={22} />
          </View>
          <View>
            <Text style={s.footerBrand}>SAGATRAIL</Text>
            <Text style={s.footerUrl}>www.sagatrail.ch</Text>
          </View>
        </View>
        <View style={s.footerRight}>
          <Text style={s.footerTagline}>WANDERAPP SCHWEIZ</Text>
          <Text style={s.footerSub}>Sagen auf dem Trail erleben</Text>
        </View>
      </View>

    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────
const ACCENT = "#cc0000";
const DARK = "#1a1a1a";
const MUTED = "#6b7280";
const BORDER = "rgba(0,0,0,0.07)";
const TILE_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.07,
  shadowRadius: 3,
  elevation: 2,
};

const s = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: "#ffffff",
  },

  // Hero
  hero: {
    height: 240,
    overflow: "hidden",
  },
  heroTextWrap: {
    position: "absolute",
    bottom: 32,
    left: 16,
    right: 16,
  },
  cantonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cantonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  cantonLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 2,
    color: "rgba(255,255,255,0.85)",
  },
  heroTitle: {
    fontFamily: fonts.titleBlack,
    fontSize: 32,
    lineHeight: 36,
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },

  // Stats
  statsSection: {
    paddingHorizontal: 12,
    marginTop: -32,
    zIndex: 10,
  },
  statsRow: {
    flexDirection: "row",
    gap: 6,
  },
  statTile: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    ...TILE_SHADOW,
  },
  statValRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 1,
    marginTop: 4,
  },
  statVal: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: DARK,
    lineHeight: 16,
  },
  statUnit: {
    fontFamily: fonts.monoBold,
    fontSize: 8,
    color: MUTED,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 2,
  },

  // SAC
  sacTile: {
    flex: 1,
  },
  sacBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  sacText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    color: "#ffffff",
    letterSpacing: 0.5,
  },

  // Elevation chart tile
  elevTile: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    ...TILE_SHADOW,
  },
  elevHeader: {
    fontFamily: fonts.monoBold,
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  elevLabels: {
    position: "absolute",
    top: 0,
    right: 0,
    alignItems: "flex-end",
    gap: 2,
  },
  elevLabelMax: {
    fontFamily: fonts.monoBold,
    fontSize: 8,
    color: DARK,
  },
  elevLabelMin: {
    fontFamily: fonts.monoBold,
    fontSize: 8,
    color: MUTED,
  },
  elevDistLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  elevDistLabel: {
    fontFamily: fonts.body,
    fontSize: 8,
    color: MUTED,
  },
  elevPlaceholder: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  elevPlaceholderText: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    color: MUTED,
  },

  // Saga
  sagaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    ...TILE_SHADOW,
  },
  sagaThumb: {
    width: 46,
    height: 46,
    borderRadius: 10,
    overflow: "hidden",
    flexShrink: 0,
  },
  sagaText: {
    flex: 1,
    minWidth: 0,
  },
  sagaEyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  sagaTitle: {
    fontFamily: fonts.titleBlack,
    fontSize: 13,
    color: DARK,
    lineHeight: 17,
  },
  sagaChevron: {
    flexShrink: 0,
  },

  // Karte
  mapWrap: {
    marginHorizontal: 12,
    marginTop: 8,
    height: MAP_H,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8ede2",
  },
  mapFallbackText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: MUTED,
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...TILE_SHADOW,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  footerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBrand: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    color: DARK,
    letterSpacing: 2,
    lineHeight: 18,
  },
  footerUrl: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: ACCENT,
    marginTop: 1,
  },
  footerRight: {
    alignItems: "flex-end",
  },
  footerTagline: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  footerSub: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: MUTED,
    marginTop: 2,
  },
});
