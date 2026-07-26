import React from 'react';

/*
  Route: Vitznau (440m) → Rigi Kaltbad (1437m) → Rigi Staffel (1604m) → Rigi Kulm (1797m)
  Karte: CartoDB Positron Tiles z=12, x=[2144,2145], y=[1440,1441] – flat 2D, kein Reliefschatten
  Tile crop: 512×512 Canvas positioniert bei top=-175, left=0 → zeigt exakt den Routenbereich

  Route-Pixel im 364×155 Display (nach Crop y=175):
    Vitznau  (8.4901, 47.0193) → (153, 162)
    Kaltbad  (8.4669, 47.0453) → (86,  52)
    Staffel  (8.4762, 47.0536) → (113, 17)
    Kulm     (8.4850, 47.0557) → (138,  8)
*/

// ── Höhenprofil ──────────────────────────────────────────────────────────────
interface ElevPt { d: number; a: number }
const PROFILE: ElevPt[] = [
  { d: 0,   a: 440  },
  { d: 1.2, a: 680  },
  { d: 2.5, a: 950  },
  { d: 3.8, a: 1200 },
  { d: 5.0, a: 1437 },
  { d: 6.2, a: 1604 },
  { d: 7.7, a: 1797 },
];

function ElevChart({ profile }: { profile: ElevPt[] }) {
  const W = 330, H = 52;
  const PAD = { top: 14, bottom: 2 };
  const chartH = H - PAD.top - PAD.bottom;
  const minA = Math.min(...profile.map(p => p.a));
  const maxA = Math.max(...profile.map(p => p.a));
  const maxD = profile[profile.length - 1].d;
  const toX = (d: number) => (d / maxD) * W;
  const toY = (a: number) => PAD.top + (1 - (a - minA) / (maxA - minA)) * chartH;
  const pts = profile.map(p => `${toX(p.d).toFixed(1)},${toY(p.a).toFixed(1)}`);
  const baseY = PAD.top + chartH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="eg-rigi2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FF9800" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#4CAF50" stopOpacity="0.05"/>
        </linearGradient>
      </defs>
      {[PAD.top + chartH*0.33, PAD.top + chartH*0.66].map(y => (
        <line key={y} x1="0" y1={y} x2={W} y2={y} stroke="#f0f0f0" strokeWidth="1"/>
      ))}
      <path d={`M${pts[0]}L${pts.join('L')}L${toX(maxD).toFixed(1)},${baseY}L0,${baseY}Z`} fill="url(#eg-rigi2)"/>
      <path d={`M${pts.join('L')}`} fill="none" stroke="#cc0000" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="0" y1={baseY} x2={W} y2={baseY} stroke="#e5e7eb" strokeWidth="1"/>
      {[{ km: 5.0, label: 'Kaltbad' }, { km: 6.2, label: 'Staffel' }].map(({ km, label }) => (
        <g key={label}>
          <line x1={toX(km)} y1={PAD.top} x2={toX(km)} y2={baseY} stroke="#cc0000" strokeWidth="1" strokeDasharray="3,2" opacity="0.4"/>
          <text x={toX(km)+2} y={PAD.top+7} fontSize="6" fill="#cc0000" opacity="0.8">{label}</text>
        </g>
      ))}
      <text x={W-3} y={PAD.top+8} fontSize="9" fill="#374151" textAnchor="end" fontWeight="600">1797 m</text>
      <text x={W-3} y={baseY-2} fontSize="9" fill="#374151" textAnchor="end" fontWeight="600">440 m</text>
    </svg>
  );
}

// ── CartoDB Tile Map ──────────────────────────────────────────────────────────
// Tiles z=12: x=[2144,2145], y=[1440,1441] → 512×512px canvas
// Lat/lon coverage: lon 8.4375–8.6133°, lat 46.978–47.099°
// Crop at top=−175, left=0 → viewport shows lat≈47.005–47.071, lon≈8.437–8.533
// Route px in 512×512 space:
//   Vitznau (8.4901,47.0193) → x=153, y=337
//   Kaltbad (8.4669,47.0453) → x=86,  y=227
//   Staffel (8.4762,47.0536) → x=113, y=192
//   Kulm    (8.4850,47.0557) → x=138, y=183
// After crop (−175): Vitznau→(153,162), Kaltbad→(86,52), Staffel→(113,17), Kulm→(138,8)

const CARTO = "https://a.basemaps.cartocdn.com/light_all";
const MAP_TILES = [
  { x: 2144, y: 1440, top:   0, left:   0 },
  { x: 2145, y: 1440, top:   0, left: 256 },
  { x: 2144, y: 1441, top: 256, left:   0 },
  { x: 2145, y: 1441, top: 256, left: 256 },
];

const ROUTE_PTS_MAP = "153,162 86,52 113,17 138,8";
const WAYPOINTS_MAP: [number,number][] = [[86, 52], [113, 17]];

function FlatMap() {
  return (
    <div className="relative rounded-xl overflow-hidden border border-black/[0.06] shadow-sm" style={{ height: 155 }}>
      {/* Tile canvas */}
      <div className="absolute" style={{ top: -175, left: 0, width: 512, height: 512 }}>
        {MAP_TILES.map(t => (
          <img
            key={`${t.x}-${t.y}`}
            src={`${CARTO}/12/${t.x}/${t.y}.png`}
            width={256}
            height={256}
            style={{ position: 'absolute', top: t.top, left: t.left, imageRendering: 'crisp-edges' }}
            alt=""
          />
        ))}
      </div>
      {/* Route overlay */}
      <svg className="absolute inset-0" viewBox="0 0 364 155" style={{ width: 364, height: 155 }}>
        {/* Labels first */}
        <text x="101" y="167" fontSize="7" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="700">Vitznau</text>
        <text x="101" y="167" fontSize="7" fill="#1a3a1a" fontWeight="600">Vitznau</text>
        <text x="30"  y="49"  fontSize="7" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="700">Rigi Kaltbad</text>
        <text x="30"  y="49"  fontSize="7" fill="#1a1a1a" fontWeight="600">Rigi Kaltbad</text>
        <text x="120" y="14"  fontSize="7" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="700">Rigi Staffel</text>
        <text x="120" y="14"  fontSize="7" fill="#1a1a1a" fontWeight="600">Rigi Staffel</text>
        <text x="150" y="7"   fontSize="8" fill="white" stroke="white" strokeWidth="3" paintOrder="stroke" fontWeight="800">Rigi Kulm</text>
        <text x="150" y="7"   fontSize="8" fill="#1a1a1a" fontWeight="700">Rigi Kulm</text>
        <text x="6" y="149" fontSize="6.5" fill="white" stroke="white" strokeWidth="2.5" paintOrder="stroke" fontStyle="italic" opacity="0.85">Vierwaldstättersee</text>
        <text x="6" y="149" fontSize="6.5" fill="#3a6a9a" fontStyle="italic" opacity="0.85">Vierwaldstättersee</text>
        {/* Compass */}
        <g transform="translate(344,138)">
          <circle r="10" fill="white" opacity="0.88" stroke="#bbb" strokeWidth="0.8"/>
          <polygon points="0,-7 -2.5,0 0,-2 2.5,0" fill="#cc0000"/>
          <polygon points="0,7 -2.5,0 0,2 2.5,0" fill="#999"/>
          <text x="0" y="-8" fontSize="5" fill="#cc0000" textAnchor="middle" fontWeight="700">N</text>
        </g>
        <text x="6" y="153" fontSize="5.5" fill="#777" opacity="0.8">© OpenStreetMap · © CARTO</text>
        {/* Route on top */}
        <polyline points={ROUTE_PTS_MAP} fill="none" stroke="rgba(180,0,0,0.22)" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round"/>
        <polyline points={ROUTE_PTS_MAP} fill="none" stroke="#cc0000" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
        {/* Start */}
        <circle cx="153" cy="162" r="7" fill="#cc0000"/>
        <circle cx="153" cy="162" r="3.5" fill="white"/>
        {/* Zwischenpunkte */}
        {WAYPOINTS_MAP.map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="3.5" fill="white" stroke="#cc0000" strokeWidth="2"/>
        ))}
        {/* Ziel */}
        <circle cx="138" cy="8" r="7" fill="white" stroke="#cc0000" strokeWidth="2.5"/>
        <circle cx="138" cy="8" r="3" fill="#cc0000"/>
      </svg>
    </div>
  );
}

// ── Stat Tile ─────────────────────────────────────────────────────────────────
function StatTile({ icon, label, val, unit }: { icon:string; label:string; val:string; unit:string }) {
  return (
    <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm p-2 flex flex-col items-center">
      <span className="text-[#cc0000] text-[12px] mb-0.5">{icon}</span>
      <div className="text-[12px] font-black text-[#1a1a1a] leading-none">
        {val}<span className="text-[8.5px] font-bold text-[#cc0000] ml-0.5">{unit}</span>
      </div>
      <span className="text-[7px] text-gray-400 font-bold tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

// ── Main Card ─────────────────────────────────────────────────────────────────
export default function RigiCard() {
  return (
    <div
      className="w-[390px] h-[844px] overflow-hidden relative flex flex-col bg-white"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }}
    >
      {/* HERO */}
      <div className="relative flex-shrink-0" style={{ height: 270 }}>
        <img
          src="/__mockup/images/rigi-hero.jpg"
          alt="Rigi Kulm – Blick auf den Zugersee"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: 'center 40%' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent"/>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/60 to-transparent"/>
        <div className="absolute top-0 left-0 right-0 px-4 pt-5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#cc0000]"/>
            <span className="text-[11px] font-bold tracking-widest uppercase text-white/80 drop-shadow">Schwyz · Vierwaldstättersee</span>
          </div>
          <h1 className="text-[28px] font-black leading-tight text-white tracking-tight drop-shadow-lg">Rigi Kulm</h1>
          <p className="text-[11px] text-white/70 mt-0.5 font-medium drop-shadow">Bergwanderweg · Alpenweidelandschaft · Sommer</p>
        </div>
      </div>

      {/* STATS 4+4 */}
      <div className="px-3 flex-shrink-0 -mt-5 relative z-10 space-y-1.5">

        <div className="grid grid-cols-4 gap-1.5">
          <StatTile icon="📍" label="DISTANZ"  val="7.7"  unit="km"/>
          <StatTile icon="📈" label="AUFSTIEG" val="1357" unit="hm"/>
          <StatTile icon="▲"  label="MAX.HÖHE" val="1797" unit="m"/>
          <StatTile icon="⏱"  label="ZEIT"     val="4:30" unit="h"/>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <StatTile icon="⬇"  label="MIN.HÖHE" val="440"  unit="m"/>
          <StatTile icon="🛡"  label="SAC"      val="T2"   unit=""/>
          <StatTile icon="📌" label="POI"      val="9"    unit=""/>
          <StatTile icon="🍴" label="EINKEHR"  val="3"    unit=""/>
        </div>

        {/* HÖHENPROFIL */}
        <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Höhenprofil</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold"
              style={{ backgroundColor: '#FF980018', color: '#E65100' }}>
              <span>☀️</span><span>Gefahrenstufe 3 · UV 7</span>
            </div>
          </div>
          <ElevChart profile={PROFILE}/>
          <div className="flex justify-between px-0.5 -mt-0.5">
            <span className="text-[8px] text-gray-400">0 km</span>
            <span className="text-[8px] text-gray-400">7.7 km</span>
          </div>
        </div>

        {/* SAGE */}
        <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm px-4 py-2.5 flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-[#0a1a2e] via-[#0e2240] to-[#162e4a] flex items-center justify-center">
            <span className="text-2xl">🌄</span>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#cc0000] block mb-0.5">🧚 Sage dieser Route</span>
            <h3 className="text-[13px] font-bold text-[#1a1a1a] leading-snug">Riginella – die Tochter des Berggeists</h3>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cc0000" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </div>

        {/* KARTE */}
        <FlatMap/>

        {/* FOOTER */}
        <div className="bg-white rounded-xl border border-black/[0.06] shadow-sm px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-black/[0.06]">
              <img src="/__mockup/images/sagatrail-icon.png" alt="SagaTrail" className="w-full h-full object-cover"/>
            </div>
            <div>
              <div className="text-[#1a1a1a] font-black text-[13px] tracking-wider leading-none mb-0.5">SAGATRAIL</div>
              <div className="text-[#cc0000] text-[10px] font-medium">www.sagatrail.ch</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-400 text-[9.5px] uppercase tracking-widest">Wanderapp Schweiz</div>
            <div className="text-gray-400 text-[9.5px] mt-0.5">Sagen auf dem Trail erleben</div>
          </div>
        </div>

      </div>
    </div>
  );
}
