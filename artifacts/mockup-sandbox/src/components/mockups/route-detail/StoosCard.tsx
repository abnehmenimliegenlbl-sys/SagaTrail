import React from 'react';

// ── Gefahren-Farbpalette ──────────────────────────────────────────────────────
const DANGER_FILL: Record<number, string> = {
  1: "#4CAF50", 2: "#CDDC39", 3: "#FF9800", 4: "#F44336", 5: "#B71C1C",
};
const DANGER_TEXT: Record<number, string> = {
  1: "#2E7D32", 2: "#6D6E00", 3: "#E65100", 4: "#C62828", 5: "#7f0000",
};
const DANGER_LABEL: Record<number, string> = {
  1: "Gefahrenstufe 1 – Gering", 2: "Gefahrenstufe 2 – Mäßig",
  3: "Gefahrenstufe 3 – Erheblich", 4: "Gefahrenstufe 4 – Groß",
  5: "Gefahrenstufe 5 – Sehr groß",
};

interface ElevPoint { distanceKm: number; altM: number }

// Großer Mythen Aufstieg: Stoos 1300m → Holzegg 1405m → Gipfel 1898m
const PROFILE: ElevPoint[] = [
  { distanceKm: 0,   altM: 1300 },
  { distanceKm: 0.8, altM: 1345 },
  { distanceKm: 1.5, altM: 1405 }, // Holzegg
  { distanceKm: 2.2, altM: 1510 },
  { distanceKm: 3.0, altM: 1620 },
  { distanceKm: 3.8, altM: 1710 },
  { distanceKm: 4.5, altM: 1790 }, // Kl. Mythen Sicht
  { distanceKm: 5.2, altM: 1855 },
  { distanceKm: 5.9, altM: 1898 }, // Gipfel Gr. Mythen
];

function ElevChart({ profile, uvIndex = 8 }: { profile: ElevPoint[]; uvIndex?: number }) {
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

  // UV 8 → level 3
  const level = 3;
  const gradStops = [
    { offset: '0%',   color: DANGER_FILL[3], opacity: 0.55 },
    { offset: '50%',  color: DANGER_FILL[2], opacity: 0.31 },
    { offset: '100%', color: DANGER_FILL[1], opacity: 0.06 },
  ];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <linearGradient id="eg-stoos" x1="0" y1="0" x2="0" y2="1">
            {gradStops.map(s => (
              <stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity}/>
            ))}
          </linearGradient>
        </defs>
        {[PAD.top + chartH * 0.33, PAD.top + chartH * 0.66].map(y => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#f0f0f0" strokeWidth="1"/>
        ))}
        <path d={areaPath} fill="url(#eg-stoos)"/>
        <path d={linePath} fill="none" stroke="#cc0000" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#e5e7eb" strokeWidth="1"/>
        <rect x={W-54} y={PAD.top-1} width="54" height="16" fill="white" fillOpacity="0.92" rx="3"/>
        <text x={W-3} y={PAD.top+11} fontSize="10" fill="#374151" textAnchor="end" fontWeight="600">{maxAlt} m</text>
        <rect x={W-54} y={baseY-17} width="54" height="16" fill="white" fillOpacity="0.92" rx="3"/>
        <text x={W-3} y={baseY-4} fontSize="10" fill="#374151" textAnchor="end" fontWeight="600">{minAlt} m</text>
      </svg>
      <div className="flex justify-between px-0.5 -mt-0.5">
        <span className="text-[9px] text-gray-400">0 km</span>
        <span className="text-[9px] text-gray-400">5.9 km</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold"
        style={{ backgroundColor: DANGER_FILL[3]+'22', borderColor: DANGER_FILL[3]+'66', color: DANGER_TEXT[3] }}>
        <span>☀️</span>
        <span>Gefahrenstufe 3 – UV-Index 8 (Hoch)</span>
      </div>
    </div>
  );
}

export default function StoosCard() {
  return (
    <div
      className="w-[390px] h-[844px] overflow-hidden relative flex flex-col bg-white"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }}
    >
      {/* ── HERO ── */}
      <div className="relative flex-shrink-0" style={{ height: 286 }}>
        <img
          src="/__mockup/images/stoos-hero.jpg"
          alt="Stoos – Großer Mythen"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent"/>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/60 to-transparent"/>
        <div className="absolute top-0 left-0 right-0 px-4 pt-5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#cc0000]"/>
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/80 drop-shadow">Schwyz</span>
          </div>
          <h1 className="text-[32px] font-black leading-none text-white tracking-tight drop-shadow-lg">
            Großer Mythen
          </h1>
          <p className="text-[12px] text-white/70 mt-1 font-medium drop-shadow">
            Bergwanderweg · Alpin · Eher Sommer
          </p>
        </div>
      </div>

      {/* ── KACHELN ── */}
      <div className="px-3 flex-shrink-0 -mt-6 relative z-10">

        {/* Reihe 1: 5 Stats */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { icon: '📍', label: 'DISTANZ',   val: '5.9',  unit: 'km' },
            { icon: '📈', label: 'AUFSTIEG',  val: '598',  unit: 'hm' },
            { icon: '▲',  label: 'MAX.HÖHE',  val: '1898', unit: 'm'  },
            { icon: '⏱',  label: 'ZEIT',      val: '3:30', unit: 'h'  },
            { icon: '🛡',  label: 'SAC',       val: 'T3',   unit: ''   },
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

        {/* Reihe 2: SAC-Badge + POIs + Höhenprofil */}
        <div className="grid grid-cols-5 gap-1.5 mt-1.5">
          <div className="col-span-2 bg-white rounded-xl border border-black/[0.06] shadow-sm p-2.5 flex flex-col justify-center">
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">SAC</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#cc0000] flex items-center justify-center shrink-0">
                <span className="text-white font-black text-[13px]">T3</span>
              </div>
              <span className="text-[10px] text-gray-500 leading-tight">Berg&shy;wanderweg</span>
            </div>
          </div>
          <div className="col-span-3 bg-white rounded-xl border border-black/[0.06] shadow-sm px-3 pt-2 pb-2">
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Höhenprofil</span>
            <ElevChart profile={PROFILE} uvIndex={8}/>
          </div>
        </div>

        {/* SAGE */}
        <div className="mt-1.5 bg-white rounded-xl border border-black/[0.06] shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-[46px] h-[46px] rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-[#2a1a0e] via-[#4a2e12] to-[#1a0e04] relative flex items-center justify-center">
            <span className="text-2xl">🐉</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#cc0000] block mb-1">🧚 Sage dieser Route</span>
            <h3 className="text-[13px] font-bold text-[#1a1a1a] leading-snug">
              Der Lindwurm vom Großen Mythen
            </h3>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </div>

        {/* KARTE — swisstopo WMS + SVG-Route */}
        <div className="mt-1.5 rounded-xl overflow-hidden border border-black/[0.06] shadow-sm" style={{ height: 166 }}>
          <div className="h-full relative">
            {/*
              swisstopo WMS GetMap — öffentlich, keine Auth nötig.
              BBox (EPSG:4326, WMS 1.3.0: minLat,minLon,maxLat,maxLon):
                lat 46.955–46.990 · lon 8.645–8.715
              Projektionsformel für SVG-Punkte (lineare Annäherung, reicht für 7 km):
                px_x = (lon − 8.645) / 0.070 × 364
                px_y = (46.990 − lat) / 0.035 × 166
            */}
            <img
              src="https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fjpeg&LAYERS=ch.swisstopo.pixelkarte-farbe&CRS=EPSG%3A4326&STYLES=&WIDTH=364&HEIGHT=166&BBOX=46.955%2C8.645%2C46.990%2C8.715"
              alt="swisstopo Karte Stoos–Großer Mythen"
              className="absolute inset-0 w-full h-full object-fill"
            />
            <svg viewBox="0 0 364 166" className="absolute inset-0 w-full h-full">
              {/* 1. Labels zuerst (unten in Z) */}
              <text x="122" y="56" fontSize="8" fill="white" fontWeight="800" stroke="white" strokeWidth="3" paintOrder="stroke">Stoos</text>
              <text x="122" y="56" fontSize="8" fill="#1a3a1a" fontWeight="700">Stoos</text>
              <text x="122" y="64" fontSize="6" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke">1300 m</text>
              <text x="122" y="64" fontSize="6" fill="#3a5a3a">1300 m</text>

              <text x="148" y="70" fontSize="7" fill="white" fontWeight="700" stroke="white" strokeWidth="3" paintOrder="stroke">Holzegg</text>
              <text x="148" y="70" fontSize="7" fill="#1a3a1a" fontWeight="600">Holzegg</text>

              <text x="194" y="100" fontSize="7" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="700">Kl. Mythen</text>
              <text x="194" y="100" fontSize="7" fill="#1a3a1a" fontWeight="600">Kl. Mythen</text>
              <text x="196" y="108" fontSize="6" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke">1811 m</text>
              <text x="196" y="108" fontSize="6" fill="#3a5a3a">1811 m</text>

              <text x="240" y="112" fontSize="7.5" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="800">Gr. Mythen</text>
              <text x="240" y="112" fontSize="7.5" fill="#1a1a1a" fontWeight="700">Gr. Mythen</text>
              <text x="244" y="121" fontSize="6" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke">1898 m</text>
              <text x="244" y="121" fontSize="6" fill="#3a5a3a">1898 m</text>

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

              {/* 2. Route + Marker ganz oben in Z */}
              <polyline
                points="114,67 143,72 172,77 192,88 213,98 234,110 258,116 281,120"
                fill="none" stroke="rgba(180,0,0,0.22)" strokeWidth="7"
                strokeLinejoin="round" strokeLinecap="round"
              />
              <polyline
                points="114,67 143,72 172,77 192,88 213,98 234,110 258,116 281,120"
                fill="none" stroke="#cc0000" strokeWidth="3.5"
                strokeLinejoin="round" strokeLinecap="round"
              />
              <circle cx="114" cy="67" r="7" fill="#cc0000"/>
              <circle cx="114" cy="67" r="3.5" fill="white"/>
              {([[172,77],[213,98],[234,110]] as [number,number][]).map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="#cc0000" strokeWidth="1.8"/>
              ))}
              <circle cx="281" cy="120" r="7" fill="white" stroke="#cc0000" strokeWidth="2.5"/>
              <circle cx="281" cy="120" r="3" fill="#cc0000"/>
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
