import React, { forwardRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { SparkMountain } from "@/components/brand/SparkMountain";
import colorTokens from "@/constants/colors";
import { fonts } from "@/constants/typography";

const colors = colorTokens.dark;

const CARD_W = 360;
const PHOTO_H = 200;
const MAP_W = 328;
const MAP_H = 200;
const MAP_PAD = 18;
const TILE_SIZE = 256;
const MAX_TILES = 12;

const tileUrl = (z: number, x: number, y: number) =>
  `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;

interface ShareCardProps {
  sagaTitle: string;
  routeName: string;
  distanceKm: number;
  ascentM: number;
  sacScale: string;
  durationMin?: number;
  steps?: number;
  geometry?: number[][];
  photoUri?: string;
  distanceLabel: string;
  ascentLabel: string;
  timeLabel: string;
  stepsLabel: string;
}

/** Web-Mercator: [lat, lng] -> globale Pixelkoordinate bei gegebenem Zoom. */
function latLngToPixel(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Waehlt den hoechsten Zoom, bei dem die Route noch mit einer ueberschaubaren
 * Anzahl Kartenkacheln abgedeckt werden kann (Kachelbudget), und projiziert
 * Route + Kacheln in dasselbe Pixelkoordinatensystem, damit beides exakt
 * uebereinander liegt.
 */
function buildRouteMap(geometry: number[][], width: number, height: number, padding: number) {
  if (!geometry || geometry.length < 2) return null;

  let zoom = 11;
  for (let z = 11; z <= 17; z++) {
    const pts = geometry.map(([lat, lng]) => latLngToPixel(lat, lng, z));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const tilesX = Math.ceil(w / TILE_SIZE) + 2;
    const tilesY = Math.ceil(h / TILE_SIZE) + 2;
    if (tilesX * tilesY <= MAX_TILES) {
      zoom = z;
    } else {
      break;
    }
  }

  const rawPts = geometry.map(([lat, lng]) => latLngToPixel(lat, lng, zoom));
  const minX = Math.min(...rawPts.map((p) => p.x));
  const maxX = Math.max(...rawPts.map((p) => p.x));
  const minY = Math.min(...rawPts.map((p) => p.y));
  const maxY = Math.max(...rawPts.map((p) => p.y));
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

/**
 * Markierte Share-Grafik fuer den OS-Share-Sheet: Erinnerungsfoto ganz oben
 * (unbearbeitet), in der Mitte Logo, Sagentitel, Streckenname und Kennzahlen,
 * unten die tatsaechlich gegangene Route ueber einer echten Kartenkachel-
 * Mosaik. Wird unsichtbar gerendert und per react-native-view-shot als Bild
 * abfotografiert.
 */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  {
    sagaTitle,
    routeName,
    distanceKm,
    ascentM,
    sacScale,
    durationMin,
    steps,
    geometry,
    photoUri,
    distanceLabel,
    ascentLabel,
    timeLabel,
    stepsLabel,
  },
  ref,
) {
  const route = geometry ? buildRouteMap(geometry, MAP_W, MAP_H, MAP_PAD) : null;

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.inner}>
        {/* Foto ganz oben, unbearbeitet */}
        {photoUri && (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
          </View>
        )}

        {/* Mitte: Logo, Sage, Streckenname, Kennzahlen */}
        <View style={styles.mid}>
          <View style={styles.mark}>
            <SparkMountain size={56} />
          </View>
          <Text style={styles.brand}>SAGATRAIL</Text>
          <Text style={styles.saga} numberOfLines={2}>
            {sagaTitle}
          </Text>
          <Text style={styles.route} numberOfLines={1}>
            {routeName}
          </Text>
          <View style={styles.statsRow}>
            {typeof steps === "number" && steps > 0 && (
              <Stat value={`${steps}`} label={stepsLabel} />
            )}
            <Stat value={`${distanceKm} km`} label={distanceLabel} />
            <Stat value={`${ascentM} hm`} label={ascentLabel} />
            {typeof durationMin === "number" && durationMin > 0 && (
              <Stat value={`${durationMin} min`} label={timeLabel} />
            )}
          </View>
        </View>

        {/* Unten: gegangene Route ueber echter Karte */}
        <View style={styles.mapWrap}>
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
              <View style={styles.mapDim} />
              <Svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                style={StyleSheet.absoluteFill}
              >
                <Path
                  d={route.d}
                  stroke={colors.gletscherweiss}
                  strokeOpacity={0.35}
                  strokeWidth={7}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d={route.d}
                  stroke={colors.accent}
                  strokeWidth={4}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Circle cx={route.start.x} cy={route.start.y} r={5} fill={colors.moosgrau} />
                <Circle cx={route.end.x} cy={route.end.y} r={6} fill={colors.almrausch} />
              </Svg>
            </>
          ) : (
            <View style={styles.mapFallbackWrap}>
              <Text style={styles.mapFallback}>{sacScale}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: colors.backgroundDeep,
    padding: 16,
  },
  inner: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 18,
    overflow: "hidden",
  },
  photoWrap: {
    width: "100%",
    height: PHOTO_H,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  mid: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  mark: { marginBottom: 4 },
  brand: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 4,
    color: colors.accent,
    marginTop: 6,
    marginBottom: 10,
  },
  saga: {
    fontFamily: fonts.titleBlack,
    fontSize: 22,
    lineHeight: 28,
    color: colors.foreground,
    textAlign: "center",
  },
  route: {
    fontFamily: fonts.story,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 22,
    marginTop: 20,
  },
  stat: { alignItems: "center" },
  statVal: { fontFamily: fonts.monoBold, fontSize: 15, color: colors.foreground },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.mutedForeground,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mapWrap: {
    width: "100%",
    height: MAP_H,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    backgroundColor: "#10181A",
    overflow: "hidden",
  },
  mapDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16,24,26,0.18)",
  },
  mapFallbackWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mapFallback: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.mutedForeground,
  },
});
