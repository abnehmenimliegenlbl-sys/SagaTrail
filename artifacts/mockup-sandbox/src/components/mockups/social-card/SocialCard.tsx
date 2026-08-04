// Web-Port der echten ShareCard aus artifacts/mobile/components/brand/ShareCard.tsx
// Gleiche Struktur, gleiche Tile-Logik, echte Swisstopo-Karte.

import { useMemo } from "react";

// ─── Echte Annäherungsgeometrie (Route 6 Etappe 9, Vrin → Capanna Scaletta) ──
// [lat, lng] – aus OSM-Relation 14521209, grob vereinfacht
// Echte Geometrie aus DB (osm-14521209, jeden 20. Punkt)
const GEOMETRY: [number, number][] = [
  [46.6548872, 9.0985059],
  [46.6488862, 9.0903481],
  [46.6445340, 9.0846965],
  [46.6413793, 9.0773392],
  [46.6361959, 9.0641267],
  [46.6304750, 9.0553798],
  [46.6322185, 9.0504480],
  [46.6336953, 9.0405101],
  [46.6354325, 9.0305387],
  [46.6357662, 9.0188991],
  [46.6332227, 9.0140304],
  [46.6339852, 9.0037706],
  [46.6281725, 9.0002792],
  [46.6226403, 8.9999037],
  [46.6165377, 8.9883412],
  [46.6152626, 8.9726649],
  [46.6099247, 8.9558944],
];

// ─── Simulierte Daten ────────────────────────────────────────────────────────
const ROUTE_NAME = "Alpenpässe-Weg Etappe 9\nVrin – Capanna Scaletta";
const CANTON = "Graubünden";
const DISTANCE_KM = 19;
const ASCENT_M = 1550;
const MAX_ALT_M = 2755;
const SAC_SCALE = "T3";
const DURATION_MIN = 401;
const STEPS = 28400;
const VISITED_PLACES = 4;
const SAGA_TITLE = "Die Sage vom Flimser Bergsturz";

// ─── Tile-Konstanten (identisch mit ShareCard.tsx) ───────────────────────────
const TILE_SIZE = 256;
const MAX_TILES = 14;
const CARD_W = 390;
const MAP_H = 168;
const MAP_PAD = 14;

/** Swisstopo Pixelkarte Farbe – öffentlich, kein Auth */
const tileUrl = (z: number, x: number, y: number) =>
  `https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/${z}/${x}/${y}.jpeg`;

/** Web-Mercator: [lat, lng] → globale Pixelkoordinate */
function latLngToPixel(lat: number, lng: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function buildRouteMap(
  geometry: [number, number][],
  width: number,
  height: number,
  padding: number,
) {
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

// ─── Höhenprofil ─────────────────────────────────────────────────────────────
function makeElevProfile() {
  const points: { distanceKm: number; altM: number }[] = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * DISTANCE_KM;
    const t = d / DISTANCE_KM;
    let alt: number;
    if (t < 0.22)      alt = 1446 + (t / 0.22) * 200;
    else if (t < 0.65) alt = 1646 + ((t - 0.22) / 0.43) * 1109;
    else if (t < 0.75) alt = 2755 - ((t - 0.65) / 0.1) * 155;
    else               alt = 2600 - ((t - 0.75) / 0.25) * 170;
    alt += Math.sin(i * 1.3) * 18 + Math.cos(i * 2.7) * 9;
    points.push({ distanceKm: d, altM: Math.round(alt) });
  }
  return points;
}
const ELEV_PROFILE = makeElevProfile();

// ─── Farben & Tokens ─────────────────────────────────────────────────────────
const ACCENT = "#cc0000";
const DARK = "#1a1a1a";
const MUTED = "#6b7280";
const BORDER = "rgba(0,0,0,0.07)";
const TILE_SHADOW = "0 1px 3px rgba(0,0,0,0.07)";

// ─── Elevation Chart ──────────────────────────────────────────────────────────
function ElevationMiniChart({ width }: { width: number }) {
  const profile = ELEV_PROFILE;
  const H = 52, PAD_TOP = 14, PAD_BTM = 2;
  const chartH = H - PAD_TOP - PAD_BTM;
  const minAlt = Math.min(...profile.map((p) => p.altM));
  const maxAlt = Math.max(...profile.map((p) => p.altM));
  const maxDist = profile[profile.length - 1].distanceKm;
  const toX = (d: number) => (d / maxDist) * width;
  const toY = (a: number) => PAD_TOP + (1 - (a - minAlt) / Math.max(maxAlt - minAlt, 1)) * chartH;
  const pts = profile.map((p) => `${toX(p.distanceKm).toFixed(1)},${toY(p.altM).toFixed(1)}`);
  const baseY = PAD_TOP + chartH;
  return (
    <div style={{ position: "relative" }}>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`}>
        <defs>
          <linearGradient id="elev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.3} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <path d={`M0,${(PAD_TOP + baseY) / 2} L${width},${(PAD_TOP + baseY) / 2}`} stroke="#e5e7eb" strokeWidth="0.8" />
        <path d={`M${pts[0]}L${pts.join("L")}L${toX(maxDist).toFixed(1)},${baseY}L0,${baseY}Z`} fill="url(#elev-fill)" />
        <path d={`M${pts.join("L")}`} fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M0,${baseY} L${width},${baseY}`} stroke="#e5e7eb" strokeWidth="0.8" />
      </svg>
      <div style={{ position: "absolute", top: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 8, color: DARK }}>{maxAlt} m</span>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 8, color: MUTED }}>{minAlt} m</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontFamily: "sans-serif", fontSize: 8, color: MUTED }}>0 km</span>
        <span style={{ fontFamily: "sans-serif", fontSize: 8, color: MUTED }}>{maxDist.toFixed(1)} km</span>
      </div>
    </div>
  );
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────
function StatTile({ icon, value, unit, label }: { icon: React.ReactNode; value: string; unit: string; label: string }) {
  return (
    <div style={{ flex: 1, background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, paddingTop: 10, paddingBottom: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: TILE_SHADOW, minWidth: 0 }}>
      {icon}
      <div style={{ display: "flex", alignItems: "baseline", gap: 1, marginTop: 4 }}>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: DARK, lineHeight: "16px" }}>{value}</span>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 8, color: MUTED }}>{unit}</span>
      </div>
      <span style={{ fontFamily: "sans-serif", fontSize: 8, color: MUTED, textTransform: "uppercase" as const, letterSpacing: 0.4, marginTop: 2 }}>{label}</span>
    </div>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IC = 14;
const IconPin   = () => <svg width={IC} height={IC} viewBox="0 0 14 14"><path d="M7 1A4 4 0 0 0 3 5c0 3.5 4 8 4 8s4-4.5 4-8A4 4 0 0 0 7 1z" fill={ACCENT}/><circle cx="7" cy="5" r="1.5" fill="white"/></svg>;
const IconUp    = () => <svg width={IC} height={IC} viewBox="0 0 14 14"><path d="M7 1L12 7H9.5V13H4.5V7H2L7 1z" fill={ACCENT}/></svg>;
const IconPeak  = () => <svg width={IC} height={IC} viewBox="0 0 14 14"><path d="M7 1L13 13H1L7 1z" fill={ACCENT}/><path d="M5 7L7 4.5L9 7" fill="white" opacity={0.4}/></svg>;
const IconClock = () => <svg width={IC} height={IC} viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke={ACCENT} strokeWidth="1.5"/><path d="M7 4V7L9.5 8.5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>;
const IconFoot  = () => <svg width={IC} height={IC} viewBox="0 0 14 14"><path d="M3 12V8H6V4H8V8H11V12H3z" fill={ACCENT}/><circle cx="7" cy="2.5" r="1.5" fill={ACCENT}/></svg>;
const IconLandmark = () => <svg width={IC} height={IC} viewBox="0 0 14 14"><rect x="1" y="12" width="12" height="1.5" fill={ACCENT} rx="0.5"/><rect x="4" y="7" width="2" height="5" fill={ACCENT}/><rect x="8" y="7" width="2" height="5" fill={ACCENT}/><path d="M1 7L7 2L13 7H1z" fill={ACCENT}/></svg>;

// ─── SparkMountain ────────────────────────────────────────────────────────────
const SparkMountain = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 22 22">
    <path d="M11 2L20 18H2L11 2z" fill={ACCENT}/>
    <path d="M11 2L16 11H6L11 2z" fill="white" opacity={0.3}/>
  </svg>
);

// ─── Swisstopo-Karte (echte Tiles, identischer Algorithmus wie App) ────────────
function MapSection() {
  const W = CARD_W - 24;
  const route = useMemo(() => buildRouteMap(GEOMETRY, W, MAP_H, MAP_PAD), [W]);

  return (
    <div style={{ marginInline: 12, marginTop: 8, height: MAP_H, borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}`, position: "relative", background: "#e8ede2" }}>
      {route ? (
        <>
          {route.tiles.map((tile) => (
            <img
              key={tile.key}
              src={tile.uri}
              alt=""
              style={{
                position: "absolute",
                left: tile.left,
                top: tile.top,
                width: tile.size,
                height: tile.size,
                display: "block",
              }}
            />
          ))}
          <svg
            width={W}
            height={MAP_H}
            viewBox={`0 0 ${W} ${MAP_H}`}
            style={{ position: "absolute", inset: 0 }}
          >
            {/* Schatten */}
            <path d={route.d} stroke="rgba(180,0,0,0.25)" strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* Route */}
            <path d={route.d} stroke={ACCENT} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* Start */}
            <circle cx={route.start.x} cy={route.start.y} r={6} fill={ACCENT} />
            <circle cx={route.start.x} cy={route.start.y} r={3} fill="white" />
            {/* Ziel */}
            <circle cx={route.end.x} cy={route.end.y} r={6} fill="white" stroke={ACCENT} strokeWidth={2} />
            <circle cx={route.end.x} cy={route.end.y} r={2.5} fill={ACCENT} />
          </svg>
        </>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: MUTED }}>{SAC_SCALE}</span>
        </div>
      )}
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export function SocialCard() {
  const h = Math.floor(DURATION_MIN / 60);
  const m = String(DURATION_MIN % 60).padStart(2, "0");
  const innerW = CARD_W - 24;
  const colW = (innerW - 4 * 6) / 5;
  const elevW = colW * 3 + 2 * 6 - 20;

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 0 40px" }}>
      <div style={{ width: CARD_W, background: "#ffffff", boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.07)" }}>

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <div style={{ height: 240, position: "relative", overflow: "hidden" }}>
          <img src="/__mockup/images/greina.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 35%" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 55%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", background: "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.85) 70%, #ffffff 100%)" }} />
          <div style={{ position: "absolute", bottom: 32, left: 16, right: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: ACCENT }} />
              <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.85)", textTransform: "uppercase" as const }}>{CANTON}</span>
            </div>
            <div style={{ fontFamily: "Georgia,'Times New Roman',serif", fontWeight: 900, fontSize: 28, lineHeight: "32px", color: "#fff", letterSpacing: -0.5, textShadow: "0 1px 4px rgba(0,0,0,0.3)", whiteSpace: "pre-line" as const }}>
              {ROUTE_NAME}
            </div>
            <div style={{ fontFamily: "sans-serif", fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{SAC_SCALE} · Wanderweg</div>
          </div>
        </div>

        {/* ── STATS ZEILE 1 ────────────────────────────────────────── */}
        <div style={{ paddingInline: 12, marginTop: -32, position: "relative", zIndex: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <StatTile icon={<IconPin />}   value={`${DISTANCE_KM}`} unit="km" label="Distanz" />
            <StatTile icon={<IconUp />}    value={`${ASCENT_M}`}    unit="m"  label="Aufstieg" />
            <StatTile icon={<IconPeak />}  value={`${MAX_ALT_M}`}   unit="m"  label="Max. Höhe" />
            <StatTile icon={<IconClock />} value={`${h}:${m}`}      unit="h"  label="Zeit" />
            <StatTile icon={<IconFoot />}  value={`${(STEPS / 1000).toFixed(1)}`} unit="k" label="Schritte" />
          </div>

          {/* ── STATS ZEILE 2 ──────────────────────────────────────── */}
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {/* SAC */}
            <div style={{ flex: 1, background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, paddingBlock: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: TILE_SHADOW }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 11, color: "#fff", letterSpacing: 0.5 }}>{SAC_SCALE}</span>
              </div>
              <span style={{ fontFamily: "sans-serif", fontSize: 8, color: MUTED, textTransform: "uppercase" as const, letterSpacing: 0.4, marginTop: 4 }}>SAC</span>
            </div>
            {/* POIs */}
            <div style={{ flex: 1, background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, paddingBlock: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: TILE_SHADOW }}>
              <IconLandmark />
              <div style={{ display: "flex", alignItems: "baseline", gap: 1, marginTop: 4 }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: DARK }}>{VISITED_PLACES}</span>
              </div>
              <span style={{ fontFamily: "sans-serif", fontSize: 8, color: MUTED, textTransform: "uppercase" as const, letterSpacing: 0.4, marginTop: 2 }}>POIs</span>
            </div>
            {/* Höhenprofil */}
            <div style={{ width: colW * 3 + 2 * 6, background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, paddingInline: 10, paddingTop: 8, paddingBottom: 6, boxShadow: TILE_SHADOW }}>
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 8, color: MUTED, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Höhenprofil</div>
              <ElevationMiniChart width={elevW} />
            </div>
          </div>
        </div>

        {/* ── SAGE ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginInline: 12, marginTop: 8, background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, padding: 12, boxShadow: TILE_SHADOW }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, overflow: "hidden", flexShrink: 0, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#3e2a1a,#5a3820,#2a1608)" }} />
            <svg width={46} height={46} viewBox="0 0 46 46" style={{ position: "absolute", inset: 0 }}>
              <rect x="16" y="20" width="14" height="22" fill="rgba(255,255,255,0.22)"/>
              <polygon points="23,8 13,20 33,20" fill="rgba(255,255,255,0.28)"/>
              <rect x="20" y="12" width="6" height="7" fill="rgba(255,255,255,0.15)"/>
              <rect x="17" y="30" width="6" height="12" fill="rgba(0,0,0,0.28)"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 9, color: ACCENT, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 3 }}>🧚 Sage dieser Route</div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 900, fontSize: 13, color: DARK, lineHeight: "17px" }}>{SAGA_TITLE}</div>
          </div>
          <svg width={14} height={14} viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
            <path d="M5 2L10 7L5 12" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>

        {/* ── KARTE (echte Swisstopo-Tiles) ────────────────────────── */}
        <MapSection />

        {/* ── FOOTER ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginInline: 12, marginTop: 8, marginBottom: 12, background: "#fff", borderRadius: 12, border: `1px solid ${BORDER}`, paddingInline: 14, paddingBlock: 10, boxShadow: TILE_SHADOW }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SparkMountain size={22} />
            </div>
            <div>
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: DARK, letterSpacing: 2, lineHeight: "18px" }}>SAGATRAIL</div>
              <div style={{ fontFamily: "sans-serif", fontSize: 11, color: ACCENT, marginTop: 1 }}>www.sagatrail.ch</div>
            </div>
          </div>
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontFamily: "sans-serif", fontSize: 10, color: MUTED, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Wanderapp Schweiz</div>
            <div style={{ fontFamily: "sans-serif", fontSize: 10, color: MUTED, marginTop: 2 }}>Sagen auf dem Trail erleben</div>
          </div>
        </div>

      </div>
    </div>
  );
}
