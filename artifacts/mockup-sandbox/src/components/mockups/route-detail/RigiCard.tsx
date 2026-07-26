import React from 'react';

/*
  Route: Vitznau (440m) → Rigi Kaltbad (1437m) → Rigi Staffel (1604m) → Rigi Kulm (1797m)
  Echte Koordinaten via swisstopo API:
    Vitznau Schiffstation  47.0193°N  8.4901°E → wird nach Annotationscheck gesetzt
    Rigi Kaltbad           47.0453°N  8.4669°E
    Rigi Staffel           47.0536°N  8.4762°E
    Rigi Kulm              47.0557°N  8.4850°E

  swisstopo WMS BBox (EPSG:4326 WMS 1.3.0: minLat,minLon,maxLat,maxLon):
    lat 47.005–47.070 (0.065°) · lon 8.435–8.532 (0.097°)
  Formel: px_x=(lon-8.435)/0.097×364, px_y=(47.070-lat)/0.065×166
    Vitznau     → (207, 130)
    Kaltbad     → (120,  63)
    Staffel     → (155,  42)
    Kulm        → (188,  37)

  SAC: T2 · 7.7 km · 1357 hm · 4:30h
  Sage: Riginella – die Tochter des Rigi-Geistes
*/

interface ElevPt { d: number; a: number }
const PROFILE: ElevPt[] = [
  { d: 0,   a: 440  }, // Vitznau
  { d: 1.2, a: 680  },
  { d: 2.5, a: 950  },
  { d: 3.8, a: 1200 },
  { d: 5.0, a: 1437 }, // Kaltbad
  { d: 6.2, a: 1604 }, // Staffel
  { d: 7.7, a: 1797 }, // Kulm
];

function ElevChart({ profile }: { profile: ElevPt[] }) {
  const W = 220, H = 68;
  const PAD = { top: 16, bottom: 2 };
  const chartH = H - PAD.top - PAD.bottom;
  const minA = Math.min(...profile.map(p => p.a));
  const maxA = Math.max(...profile.map(p => p.a));
  const maxD = profile[profile.length - 1].d;
  const toX = (d: number) => (d / maxD) * W;
  const toY = (a: number) => PAD.top + (1 - (a - minA) / (maxA - minA)) * chartH;
  const pts = profile.map(p => `${toX(p.d).toFixed(1)},${toY(p.a).toFixed(1)}`);
  const baseY = PAD.top + chartH;
  // T2 summer → UV 7 → danger 3, orange gradient
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <linearGradient id="eg-rigi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#FF9800" stopOpacity="0.55"/>
            <stop offset="100%" stopColor="#4CAF50" stopOpacity="0.07"/>
          </linearGradient>
        </defs>
        {[PAD.top + chartH*0.33, PAD.top + chartH*0.66].map(y => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#f0f0f0" strokeWidth="1"/>
        ))}
        <path d={`M${pts[0]}L${pts.join('L')}L${toX(maxD).toFixed(1)},${baseY}L0,${baseY}Z`} fill="url(#eg-rigi)"/>
        <path d={`M${pts.join('L')}`} fill="none" stroke="#cc0000" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#e5e7eb" strokeWidth="1"/>
        {/* Kaltbad marker */}
        {[{ km: 5.0, label: 'Kaltbad' }, { km: 6.2, label: 'Staffel' }].map(({ km, label }) => (
          <g key={label}>
            <line x1={toX(km)} y1={PAD.top} x2={toX(km)} y2={baseY} stroke="#cc0000" strokeWidth="1" strokeDasharray="3,2" opacity="0.45"/>
            <text x={toX(km)+3} y={PAD.top+8} fontSize="6.5" fill="#cc0000" opacity="0.8">{label}</text>
          </g>
        ))}
        <rect x={W-54} y={PAD.top-1} width="54" height="16" fill="white" fillOpacity="0.92" rx="3"/>
        <text x={W-3} y={PAD.top+11} fontSize="10" fill="#374151" textAnchor="end" fontWeight="600">1797 m</text>
        <rect x={W-54} y={baseY-17} width="54" height="16" fill="white" fillOpacity="0.92" rx="3"/>
        <text x={W-3} y={baseY-4} fontSize="10" fill="#374151" textAnchor="end" fontWeight="600">440 m</text>
      </svg>
      <div className="flex justify-between px-0.5 -mt-0.5">
        <span className="text-[9px] text-gray-400">0 km</span>
        <span className="text-[9px] text-gray-400">7.7 km</span>
      </div>
      <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold"
        style={{ backgroundColor: '#FF980022', borderColor: '#FF980066', color: '#E65100' }}>
        <span>☀️</span>
        <span>Gefahrenstufe 3 – UV-Index 7 (Hoch)</span>
      </div>
    </div>
  );
}

// Pixel-Koordinaten verifiziert via Python-Annotation (swisstopo WMS 728×332, skaliert /2)
// BBox lat 47.005–47.070 · lon 8.435–8.532
const ROUTE_PTS = "207,130 183,112 160,92 135,73 120,63 138,52 155,42 172,39 188,37";
const WAYPOINTS: [number,number][] = [[120, 63], [155, 42]];

export default function RigiCard() {
  return (
    <div
      className="w-[390px] h-[844px] overflow-hidden relative flex flex-col bg-white"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }}
    >
      {/* ── HERO ── */}
      <div className="relative flex-shrink-0" style={{ height: 286 }}>
        <img
          src="/__mockup/images/rigi-hero.jpg"
          alt="Rigi Kulm – Blick auf den Zugersee"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent"/>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/60 to-transparent"/>
        <div className="absolute top-0 left-0 right-0 px-4 pt-5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#cc0000]"/>
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/80 drop-shadow">Schwyz · Vierwaldstättersee</span>
          </div>
          <h1 className="text-[30px] font-black leading-tight text-white tracking-tight drop-shadow-lg">
            Rigi Kulm
          </h1>
          <p className="text-[12px] text-white/70 mt-1 font-medium drop-shadow">
            Bergwanderweg · Alpenweidelandschaft · Sommer
          </p>
        </div>
      </div>

      {/* ── KACHELN ── */}
      <div className="px-3 flex-shrink-0 -mt-6 relative z-10">

        <div className="grid grid-cols-5 gap-1.5">
          {[
            { icon: '📍', label: 'DISTANZ',  val: '7.7',  unit: 'km' },
            { icon: '📈', label: 'AUFSTIEG', val: '1357', unit: 'hm' },
            { icon: '▲',  label: 'MAX.HÖHE', val: '1797', unit: 'm'  },
            { icon: '⏱',  label: 'ZEIT',     val: '4:30', unit: 'h'  },
            { icon: '🛡',  label: 'SAC',      val: 'T2',   unit: ''   },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-black/[0.06] shadow-sm p-2 flex flex-col items-center">
              <span className="text-[#cc0000] text-[13px] mb-1">{s.icon}</span>
              <div className="text-[13px] font-black text-[#1a1a1a] leading-none">
                {s.val}<span className="text-[9px] font-bold text-[#cc0000] ml-0.5">{s.unit}</span>
              </div>
              <span className="text-[7.5px] text-gray-400 font-bold tracking-wider mt-1">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-1.5 mt-1.5">
          <div className="col-span-2 bg-white rounded-xl border border-black/[0.06] shadow-sm p-2.5 flex flex-col justify-center">
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">POI</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#cc0000] flex items-center justify-center shrink-0">
                <span className="text-white font-black text-[15px]">9</span>
              </div>
              <span className="text-[10px] text-gray-500 leading-tight">Punkte auf dem Trail</span>
            </div>
          </div>
          <div className="col-span-3 bg-white rounded-xl border border-black/[0.06] shadow-sm px-3 pt-2 pb-2">
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Höhenprofil</span>
            <ElevChart profile={PROFILE}/>
          </div>
        </div>

        {/* SAGE */}
        <div className="mt-1.5 bg-white rounded-xl border border-black/[0.06] shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="w-[46px] h-[46px] rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-[#0a1a2e] via-[#0e2240] to-[#162e4a] flex items-center justify-center">
            <span className="text-2xl">🌄</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#cc0000] block mb-1">🧚 Sage dieser Route</span>
            <h3 className="text-[13px] font-bold text-[#1a1a1a] leading-snug">
              Riginella – die Tochter des Berggeists
            </h3>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </div>

        {/* KARTE */}
        <div className="mt-1.5 rounded-xl overflow-hidden border border-black/[0.06] shadow-sm" style={{ height: 166 }}>
          <div className="h-full relative">
            <img
              src="https://wms.geo.admin.ch/?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fjpeg&LAYERS=ch.swisstopo.pixelkarte-grau&CRS=EPSG%3A4326&STYLES=&WIDTH=364&HEIGHT=166&BBOX=47.005%2C8.435%2C47.070%2C8.532"
              alt="swisstopo Karte Vitznau–Rigi Kulm"
              className="absolute inset-0 w-full h-full object-fill"
            />
            <svg viewBox="0 0 364 166" className="absolute inset-0 w-full h-full">
              {/* 1. Labels unten in Z */}
              {/* Vitznau */}
              <text x="215" y="127" fontSize="7.5" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="700">Vitznau</text>
              <text x="215" y="127" fontSize="7.5" fill="#1a3a1a" fontWeight="600">Vitznau</text>
              <text x="217" y="136" fontSize="6" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke">440 m</text>
              <text x="217" y="136" fontSize="6" fill="#3a5a3a">440 m</text>
              {/* Rigi Kaltbad */}
              <text x="68" y="59" fontSize="7" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="700">Rigi Kaltbad</text>
              <text x="68" y="59" fontSize="7" fill="#1a1a1a" fontWeight="600">Rigi Kaltbad</text>
              <text x="72" y="68" fontSize="6" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke">1437 m</text>
              <text x="72" y="68" fontSize="6" fill="#3a5a3a">1437 m</text>
              {/* Rigi Staffel */}
              <text x="114" y="38" fontSize="7" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="700">Rigi Staffel</text>
              <text x="114" y="38" fontSize="7" fill="#1a1a1a" fontWeight="600">Rigi Staffel</text>
              {/* Rigi Kulm */}
              <text x="196" y="33" fontSize="8" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="800">Rigi Kulm</text>
              <text x="196" y="33" fontSize="8" fill="#1a1a1a" fontWeight="700">Rigi Kulm</text>
              <text x="198" y="42" fontSize="6" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke">1797 m</text>
              <text x="198" y="42" fontSize="6" fill="#3a5a3a">1797 m</text>
              {/* Vierwaldstättersee */}
              <text x="8" y="155" fontSize="7.5" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke" fontStyle="italic" opacity="0.9">Vierwaldstättersee</text>
              <text x="8" y="155" fontSize="7.5" fill="#3a6a9a" fontStyle="italic" opacity="0.9">Vierwaldstättersee</text>
              {/* Kompass */}
              <g transform="translate(344,148)">
                <circle r="10" fill="white" opacity="0.88" stroke="#bbb" strokeWidth="0.8"/>
                <polygon points="0,-7 -2.5,0 0,-2 2.5,0" fill="#cc0000"/>
                <polygon points="0,7 -2.5,0 0,2 2.5,0" fill="#999"/>
                <text x="0" y="-8" fontSize="5" fill="#cc0000" textAnchor="middle" fontWeight="700">N</text>
              </g>
              <text x="6" y="163" fontSize="5.5" fill="white" stroke="white" strokeWidth="2" paintOrder="stroke" opacity="0.9">© swisstopo</text>
              <text x="6" y="163" fontSize="5.5" fill="#444" opacity="0.9">© swisstopo</text>

              {/* 2. Route + Marker ganz oben in Z */}
              <polyline points={ROUTE_PTS} fill="none" stroke="rgba(180,0,0,0.22)" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round"/>
              <polyline points={ROUTE_PTS} fill="none" stroke="#cc0000" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
              {/* Start Vitznau */}
              <circle cx="207" cy="130" r="7" fill="#cc0000"/>
              <circle cx="207" cy="130" r="3.5" fill="white"/>
              {/* Zwischenpunkte */}
              {WAYPOINTS.map(([x,y],i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="#cc0000" strokeWidth="1.8"/>
              ))}
              {/* Ziel Rigi Kulm */}
              <circle cx="188" cy="37" r="7" fill="white" stroke="#cc0000" strokeWidth="2.5"/>
              <circle cx="188" cy="37" r="3" fill="#cc0000"/>
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
