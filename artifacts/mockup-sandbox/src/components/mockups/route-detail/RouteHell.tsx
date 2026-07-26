import React, { useRef, useEffect, useState } from 'react';
import { MapPin, TrendingUp, Mountain, Clock, Footprints, Landmark } from 'lucide-react';

// ── Gefahren-Farbpalette (1:1 aus ElevationChart.tsx) ──────────────────────
const DANGER_FILL: Record<number, string> = {
  1: "#4CAF50", 2: "#CDDC39", 3: "#FF9800", 4: "#F44336", 5: "#B71C1C", 6: "#4A0000",
};
const DANGER_TEXT: Record<number, string> = {
  1: "#2E7D32", 2: "#6D6E00", 3: "#E65100", 4: "#C62828", 5: "#7f0000", 6: "#300000",
};
const DANGER_LABEL: Record<number, string> = {
  1: "Gefahrenstufe 1 – Gering", 2: "Gefahrenstufe 2 – Mäßig",
  3: "Gefahrenstufe 3 – Erheblich", 4: "Gefahrenstufe 4 – Groß",
  5: "Gefahrenstufe 5 – Sehr groß", 6: "Gefahrenstufe 6 – Extrem",
};

interface ElevationPoint { distanceKm: number; altM: number }

function ElevationChartWeb({
  profile, dangerLevel, uvIndex, isThunderstorm = false, snowLineM = 2000,
}: {
  profile: ElevationPoint[]; dangerLevel?: number; uvIndex?: number;
  isThunderstorm?: boolean; snowLineM?: number;
}) {
  const W = 220, H = 68;
  const PAD = { top: 16, bottom: 2, left: 0, right: 0 };
  const chartH = H - PAD.top - PAD.bottom;

  const minAlt = Math.min(...profile.map(p => p.altM));
  const maxAlt = Math.max(...profile.map(p => p.altM));
  const maxDist = profile[profile.length - 1].distanceKm;
  const toX = (d: number) => (d / maxDist) * W;
  const toY = (a: number) => PAD.top + (1 - (a - minAlt) / (maxAlt - minAlt)) * chartH;

  const pts = profile.map(p => `${toX(p.distanceKm).toFixed(1)},${toY(p.altM).toFixed(1)}`);
  const linePath = `M${pts.join('L')}`;
  const baseY = PAD.top + chartH;
  const areaPath = `M${pts[0]}L${pts.join('L')}L${toX(maxDist).toFixed(1)},${baseY}L0,${baseY}Z`;

  // Hazards
  const hazards: { level: number; icon: string }[] = [];
  if (dangerLevel && dangerLevel >= 1) {
    hazards.push({ level: dangerLevel, icon: "🏔️" });
    if (maxAlt > snowLineM) hazards.push({ level: dangerLevel, icon: "❄️" });
  }
  if (isThunderstorm) hazards.push({ level: 4, icon: "⛈️" });
  if (uvIndex != null && uvIndex >= 3) {
    const ul = uvIndex < 3 ? 1 : uvIndex < 6 ? 2 : uvIndex < 8 ? 3 : uvIndex < 11 ? 4 : 5;
    hazards.push({ level: ul, icon: "☀️" });
  }
  const effectiveLevel = hazards.length > 0 ? Math.min(6, Math.max(...hazards.map(h => h.level))) : 0;
  const sortedIcons = [...hazards].sort((a,b) => b.level - a.level)
    .filter((h,i,arr) => arr.findIndex(x => x.icon === h.icon) === i)
    .map(h => h.icon);

  // Gradient stops
  const level = effectiveLevel > 0 ? effectiveLevel : 1;
  const gradStops = level === 1
    ? [{ offset: '0%', color: DANGER_FILL[1], opacity: 0.40 }, { offset: '100%', color: DANGER_FILL[1], opacity: 0.06 }]
    : Array.from({ length: level }, (_, i) => {
        const l = level - i;
        const t = i / (level - 1);
        return { offset: `${(t * 100).toFixed(0)}%`, color: DANGER_FILL[l], opacity: +(0.55 - t * 0.49).toFixed(2) };
      });

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <linearGradient id="elev-danger" x1="0" y1="0" x2="0" y2="1">
            {gradStops.map(s => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
            ))}
          </linearGradient>
        </defs>
        {/* Grid */}
        {[PAD.top + chartH * 0.33, PAD.top + chartH * 0.66].map(y => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#f0f0f0" strokeWidth="1"/>
        ))}
        {/* Area fill */}
        <path d={areaPath} fill="url(#elev-danger)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#cc0000" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {/* Baseline */}
        <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#e5e7eb" strokeWidth="1"/>
        {/* Max label */}
        <rect x={W - 54} y={PAD.top - 1} width="54" height="16" fill="white" fillOpacity="0.92" rx="3"/>
        <text x={W - 3} y={PAD.top + 11} fontSize="10" fill="#374151" textAnchor="end" fontWeight="600">{maxAlt} m</text>
        {/* Min label */}
        <rect x={W - 54} y={baseY - 17} width="54" height="16" fill="white" fillOpacity="0.92" rx="3"/>
        <text x={W - 3} y={baseY - 4} fontSize="10" fill="#374151" textAnchor="end" fontWeight="600">{minAlt} m</text>
      </svg>
      {/* X-labels */}
      <div className="flex justify-between px-0.5 -mt-0.5">
        <span className="text-[9px] text-gray-400">0 km</span>
        <span className="text-[9px] text-gray-400">{maxDist.toFixed(1)} km</span>
      </div>
      {/* Danger badge */}
      {effectiveLevel > 0 && (
        <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold"
          style={{
            backgroundColor: DANGER_FILL[effectiveLevel] + '22',
            borderColor: DANGER_FILL[effectiveLevel] + '66',
            color: DANGER_TEXT[effectiveLevel],
          }}>
          <span>{sortedIcons.join('  ')}</span>
          <span>{DANGER_LABEL[effectiveLevel]}</span>
        </div>
      )}
    </div>
  );
}

// Elm Höhenweg — synthetisches Profil (T2, 979m → 1842m)
const ELM_PROFILE: ElevationPoint[] = [
  { distanceKm: 0,    altM: 979  },
  { distanceKm: 1.2,  altM: 1080 },
  { distanceKm: 2.5,  altM: 1180 },
  { distanceKm: 3.8,  altM: 1290 },
  { distanceKm: 5.0,  altM: 1380 },
  { distanceKm: 6.2,  altM: 1480 },
  { distanceKm: 7.5,  altM: 1590 },
  { distanceKm: 8.8,  altM: 1680 },
  { distanceKm: 10.2, altM: 1760 },
  { distanceKm: 11.0, altM: 1842 },
  { distanceKm: 12.1, altM: 1790 },
  { distanceKm: 13.0, altM: 1720 },
  { distanceKm: 14.2, altM: 1630 },
];

/* ─────────────────────────────────────────────────────────
   SOCIAL POST CARD — 390 × 844 px, festes Format, kein Scrollen
   Grid: 5 Spalten
   Reihe 1: Distanz | Aufstieg | Max.Höhe | Zeit | Schritte
   Reihe 2: T2 (1) | POI (1) | Höhenprofil (3)
───────────────────────────────────────────────────────── */
export default function RouteHell() {
  return (
    <div
      className="w-[390px] h-[844px] overflow-hidden relative flex flex-col bg-white"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }}
    >

      {/* ══════════════════════════════════════════
          HERO — echtes Foto, unten auslaufend
      ══════════════════════════════════════════ */}
      <div className="relative flex-shrink-0" style={{ height: 310 }}>
        <img
          src="/__mockup/images/hero-hike.jpg"
          alt="Elm Höhenweg"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Oben: leichter Schleier für Lesbarkeit */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
        {/* Unten: auslaufen in weiss */}
        <div className="absolute bottom-0 left-0 right-0 h-20
          bg-gradient-to-t from-white via-white/70 to-transparent" />

        {/* Route-Titel oben auf dem Bild */}
        <div className="absolute top-0 left-0 right-0 px-4 pt-5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#cc0000]" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/80 drop-shadow">Glarus Süd</span>
          </div>
          <h1 className="text-[32px] font-black leading-none text-white tracking-tight drop-shadow-lg">
            Elm Höhenweg
          </h1>
          <p className="text-[12px] text-white/70 mt-1 font-medium drop-shadow">
            Bergwanderweg · Alpin · Eher Sommer
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          KACHEL-GRID  5 Spalten
      ══════════════════════════════════════════ */}
      <div className="px-3 flex-shrink-0" style={{ marginTop: -8 }}>

        {/* ── Reihe 1: 5 Metriken ── */}
        <div className="grid grid-cols-5 gap-1.5 mb-1.5">
          {[
            { Icon: MapPin,     value: '14.2', unit: 'km', label: 'Distanz'   },
            { Icon: TrendingUp, value: '397',  unit: 'm',  label: 'Aufstieg'  },
            { Icon: Mountain,   value: '1842', unit: 'm',  label: 'Max. Höhe' },
            { Icon: Clock,      value: '3:15', unit: 'h',  label: 'Zeit'      },
            { Icon: Footprints, value: '19.7', unit: 'k',  label: 'Schritte'  },
          ].map(({ Icon, value, unit, label }) => (
            <div key={label}
              className="bg-white rounded-xl border border-black/[0.06] shadow-sm py-2.5 flex flex-col items-center text-center">
              <Icon className="w-3.5 h-3.5 text-[#cc0000] mb-1" />
              <div className="text-[13px] font-black text-[#1a1a1a] leading-none">
                {value}
                <span className="text-[8px] text-gray-400 font-bold ml-px">{unit}</span>
              </div>
              <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5 leading-none">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Reihe 2: T2 (1) + POI (1) + Höhenprofil (3) ── */}
        <div className="grid grid-cols-5 gap-1.5">

          {/* T2 */}
          <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm py-2.5 flex flex-col items-center justify-center text-center">
            <div className="w-6 h-6 rounded-lg bg-[#cc0000] flex items-center justify-center mb-1">
              <span className="text-white font-black text-[11px]">T2</span>
            </div>
            <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wide leading-none">SAC</div>
          </div>

          {/* POI */}
          <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm py-2.5 flex flex-col items-center justify-center text-center">
            <Landmark className="w-3.5 h-3.5 text-[#cc0000] mb-1" />
            <div className="text-[13px] font-black text-[#1a1a1a] leading-none">8</div>
            <div className="text-[8px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5 leading-none">POIs</div>
          </div>

          {/* Höhenprofil — 3 Spalten breit */}
          <div className="col-span-3 bg-white rounded-xl border border-black/[0.06] shadow-sm px-3 pt-2 pb-2">
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Höhenprofil</span>
            <ElevationChartWeb
              profile={ELM_PROFILE}
              dangerLevel={3}
              uvIndex={7}
              snowLineM={2000}
            />
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════
          KARTE
      ══════════════════════════════════════════ */}
      <div className="px-3 mt-1.5 flex-shrink-0">
        <div className="rounded-xl overflow-hidden border border-black/[0.06] shadow-sm" style={{ height: 168 }}>
          <div className="h-full relative" style={{ background: '#e8ede2' }}>
            <svg viewBox="0 0 364 168" className="w-full h-full absolute inset-0">
              {/* ── Hintergrund-Flächen ── */}
              {/* Wald (grün) */}
              <path d="M0,168 L0,130 Q30,120 55,128 Q75,118 95,132 Q110,122 130,130 L140,168Z" fill="#c8d8b8" opacity="0.7"/>
              <path d="M300,168 L300,85 Q320,80 340,88 Q355,80 364,85 L364,168Z" fill="#c8d8b8" opacity="0.6"/>
              {/* See / Wasser */}
              <ellipse cx="178" cy="112" rx="14" ry="8" fill="#b8d4e8" opacity="0.85"/>
              {/* Gletscher */}
              <path d="M235,22 Q252,16 268,20 Q265,30 248,35 Q238,32 Z" fill="#e8f0f8" opacity="0.9"/>
              <path d="M240,24 Q252,19 265,22 Q262,29 249,33Z" fill="#d0e4f4" opacity="0.7"/>

              {/* ── Höhenlinien ── */}
              <path d="M5,162 Q60,152 110,138 Q165,122 215,105 Q260,88 310,70 Q338,60 364,62" fill="none" stroke="#b8c8b0" strokeWidth="0.8"/>
              <path d="M5,150 Q55,138 108,124 Q162,108 212,90 Q258,74 308,55 Q336,45 364,47" fill="none" stroke="#b0c0a8" strokeWidth="0.8"/>
              <path d="M20,140 Q70,126 118,112 Q168,95 215,76 Q260,58 305,40 Q330,30 364,32" fill="none" stroke="#b0c0a8" strokeWidth="0.8"/>
              <path d="M50,132 Q95,116 140,100 Q188,82 230,62 Q270,44 312,28 Q338,18 364,18" fill="none" stroke="#a8b8a0" strokeWidth="0.8"/>
              <path d="M90,124 Q130,108 170,90 Q210,70 248,50 Q280,34 318,20" fill="none" stroke="#a8b8a0" strokeWidth="0.7"/>
              {/* Leitkurve (dicker) */}
              <path d="M5,155 Q58,143 110,130 Q163,115 213,97 Q259,80 308,62 Q336,52 364,54" fill="none" stroke="#9aae90" strokeWidth="1.4"/>
              <path d="M30,136 Q78,120 124,106 Q172,89 218,70 Q262,52 308,34 Q334,22 360,20" fill="none" stroke="#9aae90" strokeWidth="1.4"/>

              {/* ── Nebenstrasse ── */}
              <path d="M0,148 Q20,144 35,138" fill="none" stroke="#e8dcc8" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M340,65 Q352,62 364,60" fill="none" stroke="#e8dcc8" strokeWidth="2.5" strokeLinecap="round"/>

              {/* ── Route ── */}
              <polyline points="28,140 52,124 70,108 90,116 114,126 138,104 164,72 184,80 204,90 228,62 254,38 282,44 310,52 328,58"
                fill="none" stroke="#cc0000" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
              {/* Route-Schatten für Tiefe */}
              <polyline points="28,141 52,125 70,109 90,117 114,127 138,105 164,73 184,81 204,91 228,63 254,39 282,45 310,53 328,59"
                fill="none" stroke="rgba(180,0,0,0.18)" strokeWidth="5.5" strokeLinejoin="round" strokeLinecap="round"/>
              <polyline points="28,140 52,124 70,108 90,116 114,126 138,104 164,72 184,80 204,90 228,62 254,38 282,44 310,52 328,58"
                fill="none" stroke="#cc0000" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>

              {/* ── Markers ── */}
              {/* Start */}
              <circle cx="28" cy="140" r="7" fill="#cc0000"/>
              <circle cx="28" cy="140" r="3.5" fill="white"/>
              {/* Zwischenpunkte */}
              {[[70,108],[114,126],[164,72],[204,90],[254,38],[310,52]].map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="#cc0000" strokeWidth="1.8"/>
              ))}
              {/* Ziel */}
              <circle cx="328" cy="58" r="7" fill="white" stroke="#cc0000" strokeWidth="2.5"/>
              <circle cx="328" cy="58" r="3" fill="#cc0000"/>

              {/* ── Ortsnamen ── */}
              <text x="8"   y="157" fontSize="8"   fill="#3a4e32" fontWeight="700" letterSpacing="0.2">Elm</text>
              <text x="8"   y="165" fontSize="6"   fill="#7a8e72"                               >979 m</text>
              <text x="56"  y="118" fontSize="6.5" fill="#4a5e42" fontWeight="600">Empächli</text>
              <text x="92"  y="138" fontSize="6"   fill="#7a8e72">1124 m</text>
              <text x="120" y="120" fontSize="6.5" fill="#4a5e42" fontWeight="600">Chüeboden</text>
              <text x="142" y="98"  fontSize="6.5" fill="#4a5e42" fontWeight="600">Ämpächli</text>
              <text x="162" y="86"  fontSize="6"   fill="#7a8e72">1380 m</text>
              <text x="183" y="122" fontSize="6"   fill="#7ab8d8" fontWeight="600">Ämpächlisee</text>
              <text x="208" y="100" fontSize="6.5" fill="#4a5e42" fontWeight="600">Unterboden</text>
              <text x="230" y="55"  fontSize="6.5" fill="#4a5e42" fontWeight="600">Glärnischhütte</text>
              <text x="235" y="63"  fontSize="6"   fill="#7a8e72">1630 m</text>
              <text x="252" y="28"  fontSize="6"   fill="#8a9eb8" fontWeight="600">Gletscher</text>
              <text x="310" y="48"  fontSize="8"   fill="#3a4e32" fontWeight="700">Engi</text>
              <text x="310" y="57"  fontSize="6"   fill="#7a8e72">1842 m</text>

              {/* ── Waldpiktogramm ── */}
              {[[18,120],[35,114],[50,120],[20,108],[38,104]].map(([x,y],i)=>(
                <g key={i}>
                  <polygon points={`${x},${y-8} ${x-4},${y} ${x+4},${y}`} fill="#7a9e6a" opacity="0.7"/>
                  <rect x={x-1} y={y} width="2" height="3" fill="#8a7060" opacity="0.6"/>
                </g>
              ))}
              {[[340,78],[350,72],[356,80],[344,68]].map(([x,y],i)=>(
                <g key={i}>
                  <polygon points={`${x},${y-7} ${x-3.5},${y} ${x+3.5},${y}`} fill="#7a9e6a" opacity="0.7"/>
                  <rect x={x-1} y={y} width="2" height="3" fill="#8a7060" opacity="0.6"/>
                </g>
              ))}

              {/* ── Kompass ── */}
              <g transform="translate(342,148)">
                <circle r="10" fill="white" opacity="0.85" stroke="#c0c8b8" strokeWidth="0.8"/>
                <polygon points="0,-7 -2.5,0 0,-2 2.5,0" fill="#cc0000"/>
                <polygon points="0,7 -2.5,0 0,2 2.5,0" fill="#888"/>
                <text x="0" y="-8" fontSize="5" fill="#cc0000" textAnchor="middle" fontWeight="700">N</text>
              </g>

              {/* ── Massstab ── */}
              <g transform="translate(12,152)">
                <line x1="0" y1="0" x2="28" y2="0" stroke="#667760" strokeWidth="1.5"/>
                <line x1="0" y1="-2" x2="0" y2="2" stroke="#667760" strokeWidth="1.5"/>
                <line x1="28" y1="-2" x2="28" y2="2" stroke="#667760" strokeWidth="1.5"/>
                <text x="14" y="-3" fontSize="5.5" fill="#667760" textAnchor="middle">2 km</text>
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SAGE — nur Titel
      ══════════════════════════════════════════ */}
      <div className="px-3 mt-1.5 flex-shrink-0">
        <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm px-4 py-3 flex items-center gap-3">
          {/* Saga foto */}
          <div className="w-[46px] h-[46px] rounded-lg overflow-hidden shrink-0">
            <div className="w-full h-full bg-gradient-to-br from-[#3e2a1a] via-[#5a3820] to-[#2a1608] relative">
              <svg viewBox="0 0 46 46" className="absolute inset-0 w-full h-full">
                <rect x="16" y="20" width="14" height="22" fill="rgba(255,255,255,0.22)"/>
                <polygon points="23,8 13,20 33,20" fill="rgba(255,255,255,0.28)"/>
                <rect x="20" y="12" width="6" height="7" fill="rgba(255,255,255,0.15)"/>
                <rect x="17" y="30" width="6" height="12" fill="rgba(0,0,0,0.28)"/>
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#cc0000] block mb-1">🧚 Sage dieser Route</span>
            <h3 className="text-[13px] font-bold text-[#1a1a1a] leading-snug">
              Der heilige Fridolin und der tote Bruder
            </h3>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="2.5" strokeLinecap="round" className="shrink-0"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>


      {/* ══════════════════════════════════════════
          BRANDING FOOTER
      ══════════════════════════════════════════ */}
      <div className="bg-[#cc0000] px-4 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white">
            <img src="/__mockup/images/sagatrail-icon.png" alt="SagaTrail" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-white font-black text-[14px] tracking-wider leading-none mb-0.5">SAGATRAIL</div>
            <div className="text-white/80 text-[11px]">www.sagatrail.ch</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white/70 text-[10px] uppercase tracking-widest">Wanderapp Schweiz</div>
          <div className="text-white/70 text-[10px] mt-0.5">Sagen auf dem Trail erleben</div>
        </div>
      </div>

    </div>
  );
}
