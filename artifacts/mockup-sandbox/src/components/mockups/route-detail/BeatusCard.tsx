import React from 'react';

const DANGER_FILL: Record<number, string> = {
  1: "#4CAF50", 2: "#CDDC39", 3: "#FF9800", 4: "#F44336", 5: "#B71C1C",
};
const DANGER_TEXT: Record<number, string> = {
  1: "#2E7D32", 2: "#6D6E00", 3: "#E65100", 4: "#C62828", 5: "#7f0000",
};

interface ElevPoint { distanceKm: number; altM: number }

// Beatenbucht (565m) → Beatushöhlen (620m) → Beatenberg (1140m)
const PROFILE: ElevPoint[] = [
  { distanceKm: 0,   altM: 565 },
  { distanceKm: 0.6, altM: 590 },
  { distanceKm: 1.1, altM: 620 }, // Beatushöhlen
  { distanceKm: 1.8, altM: 700 },
  { distanceKm: 2.8, altM: 820 },
  { distanceKm: 3.8, altM: 940 },
  { distanceKm: 5.0, altM: 1060 },
  { distanceKm: 6.2, altM: 1140 }, // Beatenberg
];

// UV 5 → level 2 (Mäßig)
function ElevChart({ profile }: { profile: ElevPoint[] }) {
  const W = 220, H = 68;
  const PAD = { top: 16, bottom: 2 };
  const chartH = H - PAD.top - PAD.bottom;
  const minAlt = Math.min(...profile.map(p => p.altM));
  const maxAlt = Math.max(...profile.map(p => p.altM));
  const maxDist = profile[profile.length - 1].distanceKm;
  const toX = (d: number) => (d / maxDist) * W;
  const toY = (a: number) => PAD.top + (1 - (a - minAlt) / (maxAlt - minAlt)) * chartH;
  const pts = profile.map(p => `${toX(p.distanceKm).toFixed(1)},${toY(p.altM).toFixed(1)}`);
  const baseY = PAD.top + chartH;
  const areaPath = `M${pts[0]}L${pts.join('L')}L${toX(maxDist).toFixed(1)},${baseY}L0,${baseY}Z`;
  const linePath = `M${pts.join('L')}`;

  // Level 2: CDDC39 (top) → 4CAF50 (bottom)
  const gradStops = [
    { offset: '0%',   color: DANGER_FILL[2], opacity: 0.50 },
    { offset: '100%', color: DANGER_FILL[1], opacity: 0.06 },
  ];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <linearGradient id="eg-beatus" x1="0" y1="0" x2="0" y2="1">
            {gradStops.map(s => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity}/>
            ))}
          </linearGradient>
        </defs>
        {[PAD.top + chartH * 0.33, PAD.top + chartH * 0.66].map(y => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#f0f0f0" strokeWidth="1"/>
        ))}
        <path d={areaPath} fill="url(#eg-beatus)"/>
        <path d={linePath} fill="none" stroke="#cc0000" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#e5e7eb" strokeWidth="1"/>
        {/* Beatushöhlen marker */}
        <line x1={toX(1.1).toFixed(1)} y1={PAD.top} x2={toX(1.1).toFixed(1)} y2={baseY}
          stroke="#cc0000" strokeWidth="1" strokeDasharray="3,2" opacity="0.5"/>
        <text x={toX(1.1)+3} y={PAD.top+8} fontSize="7" fill="#cc0000" opacity="0.8">Höhlen</text>
        <rect x={W-54} y={PAD.top-1} width="54" height="16" fill="white" fillOpacity="0.92" rx="3"/>
        <text x={W-3} y={PAD.top+11} fontSize="10" fill="#374151" textAnchor="end" fontWeight="600">{maxAlt} m</text>
        <rect x={W-54} y={baseY-17} width="54" height="16" fill="white" fillOpacity="0.92" rx="3"/>
        <text x={W-3} y={baseY-4} fontSize="10" fill="#374151" textAnchor="end" fontWeight="600">{minAlt} m</text>
      </svg>
      <div className="flex justify-between px-0.5 -mt-0.5">
        <span className="text-[9px] text-gray-400">0 km</span>
        <span className="text-[9px] text-gray-400">6.2 km</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold"
        style={{ backgroundColor: DANGER_FILL[2]+'22', borderColor: DANGER_FILL[2]+'66', color: DANGER_TEXT[2] }}>
        <span>☀️</span>
        <span>Gefahrenstufe 2 – UV-Index 5 (Moderat)</span>
      </div>
    </div>
  );
}

/*
  swisstopo WMS BBox (EPSG:4326, WMS 1.3.0: minLat,minLon,maxLat,maxLon):
    lat 46.678–46.712 (range 0.034°) · lon 7.712–7.762 (range 0.050°)
  Projektionsformel:
    px_x = (lon − 7.712) / 0.050 × 364
    px_y = (46.712 − lat) / 0.034 × 166

  Stützpunkte:
    Beatenbucht   (46.6895, 7.7230) → (80, 110)
    Beatushöhlen  (46.6915, 7.7290) → (124, 100)
    Zwisch. 1     (46.694,  7.735)  → (168,  87)
    Zwisch. 2     (46.697,  7.742)  → (219,  73)
    Beatenberg    (46.7005, 7.7445) → (237,  56)
*/
const ROUTE_PTS = "80,110 110,104 124,100 148,93 168,87 195,79 219,73 237,56";
const WAYPOINTS: [number, number][] = [[124, 100], [168, 87], [219, 73]];

export default function BeatusCard() {
  return (
    <div
      className="w-[390px] h-[844px] overflow-hidden relative flex flex-col bg-white"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }}
    >
      {/* ── HERO ── */}
      <div className="relative flex-shrink-0" style={{ height: 286 }}>
        <img
          src="/__mockup/images/beatus-hero.jpg"
          alt="St. Beatus-Höhlen"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 35%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent"/>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/60 to-transparent"/>
        <div className="absolute top-0 left-0 right-0 px-4 pt-5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#cc0000]"/>
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/80 drop-shadow">Bern · Thunersee</span>
          </div>
          <h1 className="text-[30px] font-black leading-tight text-white tracking-tight drop-shadow-lg">
            St. Beatus-Höhlen
          </h1>
          <p className="text-[12px] text-white/70 mt-1 font-medium drop-shadow">
            Bergwanderweg · Wald & Fels · Ganzjährig
          </p>
        </div>
      </div>

      {/* ── KACHELN ── */}
      <div className="px-3 flex-shrink-0 -mt-6 relative z-10">

        {/* Reihe 1 */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { icon: '📍', label: 'DISTANZ',  val: '6.2',  unit: 'km' },
            { icon: '📈', label: 'AUFSTIEG', val: '575',  unit: 'hm' },
            { icon: '▲',  label: 'MAX.HÖHE', val: '1140', unit: 'm'  },
            { icon: '⏱',  label: 'ZEIT',     val: '3:30', unit: 'h'  },
            { icon: '🛡',  label: 'SAC',      val: 'T2',   unit: ''   },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-black/[0.06] shadow-sm p-2 flex flex-col items-center">
              <span className="text-[#cc0000] text-[13px] mb-1">{s.icon}</span>
              <span className="text-[13px] font-black text-[#1a1a1a] leading-none">
                {s.val}<span className="text-[9px] font-bold text-[#cc0000] ml-0.5">{s.unit}</span>
              </span>
              <span className="text-[7.5px] text-gray-400 font-bold tracking-wider mt-1">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Reihe 2 */}
        <div className="grid grid-cols-5 gap-1.5 mt-1.5">
          <div className="col-span-2 bg-white rounded-xl border border-black/[0.06] shadow-sm p-2.5 flex flex-col justify-center">
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">SAC</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#cc0000] flex items-center justify-center shrink-0">
                <span className="text-white font-black text-[13px]">T2</span>
              </div>
              <span className="text-[10px] text-gray-500 leading-tight">Berg&shy;wanderweg</span>
            </div>
          </div>
          <div className="col-span-3 bg-white rounded-xl border border-black/[0.06] shadow-sm px-3 pt-2 pb-2">
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Höhenprofil</span>
            <ElevChart profile={PROFILE}/>
          </div>
        </div>

        {/* SAGE */}
        <div className="mt-1.5 bg-white rounded-xl border border-black/[0.06] shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-[46px] h-[46px] rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-[#1a0e0e] via-[#3a1208] to-[#0e0808] flex items-center justify-center">
            <span className="text-2xl">🐉</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#cc0000] block mb-1">🧚 Sage dieser Route</span>
            <h3 className="text-[13px] font-bold text-[#1a1a1a] leading-snug">
              Der heilige Beatus und der Drache im Fels
            </h3>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </div>

        {/* KARTE — swisstopo WMS */}
        <div className="mt-1.5 rounded-xl overflow-hidden border border-black/[0.06] shadow-sm" style={{ height: 166 }}>
          <div className="h-full relative">
            <img
              src="https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fjpeg&LAYERS=ch.swisstopo.pixelkarte-farbe&CRS=EPSG%3A4326&STYLES=&WIDTH=364&HEIGHT=166&BBOX=46.678%2C7.712%2C46.712%2C7.762"
              alt="swisstopo Karte Beatushöhlen"
              className="absolute inset-0 w-full h-full object-fill"
            />
            <svg viewBox="0 0 364 166" className="absolute inset-0 w-full h-full">
              {/* 1. Labels (unten in Z) */}
              {/* Beatenbucht */}
              <text x="54" y="108" fontSize="7.5" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="700">Beatenbucht</text>
              <text x="54" y="108" fontSize="7.5" fill="#1a3a1a" fontWeight="600">Beatenbucht</text>
              <text x="56" y="117" fontSize="6" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke">565 m</text>
              <text x="56" y="117" fontSize="6" fill="#3a5a3a">565 m</text>
              {/* Beatushöhlen */}
              <text x="96" y="90" fontSize="7.5" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="800">Beatushöhlen</text>
              <text x="96" y="90" fontSize="7.5" fill="#1a1a1a" fontWeight="700">Beatushöhlen</text>
              <text x="98" y="99" fontSize="6" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke">620 m</text>
              <text x="98" y="99" fontSize="6" fill="#3a5a3a">620 m</text>
              {/* Beatenberg */}
              <text x="200" y="51" fontSize="7.5" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="800">Beatenberg</text>
              <text x="200" y="51" fontSize="7.5" fill="#1a1a1a" fontWeight="700">Beatenberg</text>
              <text x="204" y="60" fontSize="6" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke">1140 m</text>
              <text x="204" y="60" fontSize="6" fill="#3a5a3a">1140 m</text>
              {/* Thunersee */}
              <text x="15" y="152" fontSize="8" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke" fontStyle="italic" opacity="0.9">Thunersee</text>
              <text x="15" y="152" fontSize="8" fill="#3a6a9a" fontStyle="italic" opacity="0.9">Thunersee</text>
              {/* Kompass */}
              <g transform="translate(344,148)">
                <circle r="10" fill="white" opacity="0.88" stroke="#bbb" strokeWidth="0.8"/>
                <polygon points="0,-7 -2.5,0 0,-2 2.5,0" fill="#cc0000"/>
                <polygon points="0,7 -2.5,0 0,2 2.5,0" fill="#999"/>
                <text x="0" y="-8" fontSize="5" fill="#cc0000" textAnchor="middle" fontWeight="700">N</text>
              </g>
              {/* © swisstopo */}
              <text x="6" y="163" fontSize="5.5" fill="white" stroke="white" strokeWidth="2" paintOrder="stroke" opacity="0.9">© swisstopo</text>
              <text x="6" y="163" fontSize="5.5" fill="#444" opacity="0.9">© swisstopo</text>

              {/* 2. Route + Marker — ganz oben in Z */}
              <polyline points={ROUTE_PTS} fill="none" stroke="rgba(180,0,0,0.22)" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round"/>
              <polyline points={ROUTE_PTS} fill="none" stroke="#cc0000" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
              {/* Start */}
              <circle cx="80" cy="110" r="7" fill="#cc0000"/>
              <circle cx="80" cy="110" r="3.5" fill="white"/>
              {/* Zwischenpunkte */}
              {WAYPOINTS.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="#cc0000" strokeWidth="1.8"/>
              ))}
              {/* Ziel */}
              <circle cx="237" cy="56" r="7" fill="white" stroke="#cc0000" strokeWidth="2.5"/>
              <circle cx="237" cy="56" r="3" fill="#cc0000"/>
            </svg>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-1.5 bg-white rounded-xl border border-black/[0.06] shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-black/[0.06]">
              <img src="/__mockup/images/sagatrail-icon.png" alt="SagaTrail" className="w-full h-full object-cover"/>
            </div>
            <div>
              <div className="text-[#1a1a1a] font-black text-[14px] tracking-wider leading-none mb-0.5">SAGATRAIL</div>
              <div className="text-[#cc0000] text-[11px] font-medium">www.sagatrail.ch</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-[10px] uppercase tracking-widest">Wanderapp Schweiz</div>
            <div className="text-gray-400 text-[10px] mt-0.5">Sagen auf dem Trail erleben</div>
          </div>
        </div>

      </div>
    </div>
  );
}
