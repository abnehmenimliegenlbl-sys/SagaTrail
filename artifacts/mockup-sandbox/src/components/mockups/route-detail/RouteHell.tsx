import React from 'react';
import { MapPin, TrendingUp, Mountain, Clock, Footprints, Landmark } from 'lucide-react';

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
          <div className="col-span-3 bg-white rounded-xl border border-black/[0.06] shadow-sm px-3 pt-2 pb-1.5">
            <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Höhenprofil</span>
            <svg viewBox="0 0 180 52" className="w-full h-auto">
              <defs>
                <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#cc0000" stopOpacity="0.18"/>
                  <stop offset="100%" stopColor="#cc0000" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[13, 26, 39].map(y =>
                <line key={y} x1="0" y1={y} x2="180" y2={y} stroke="#f0f0f0" strokeWidth="1"/>
              )}
              <polyline
                points="0,46 12,40 28,32 46,20 68,14 90,6 112,12 130,24 152,34 180,40 180,52 0,52"
                fill="url(#eg)"
              />
              <polyline
                points="0,46 12,40 28,32 46,20 68,14 90,6 112,12 130,24 152,34 180,40"
                fill="none" stroke="#cc0000" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              />
              <text x="1"   y="51" fontSize="6.5" fill="#ccc">1200m</text>
              <text x="1"   y="8"  fontSize="6.5" fill="#ccc">1900m</text>
              <text x="158" y="51" fontSize="6.5" fill="#ccc">14km</text>
            </svg>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════
          KARTE
      ══════════════════════════════════════════ */}
      <div className="px-3 mt-1.5 flex-shrink-0">
        <div className="rounded-xl overflow-hidden border border-black/[0.06] shadow-sm" style={{ height: 168 }}>
          <div className="h-full relative bg-[#edf0ea]"
            style={{ backgroundImage: 'radial-gradient(#c5ccc0 1px,transparent 1px)', backgroundSize: '9px 9px' }}>
            <svg viewBox="0 0 364 168" className="w-full h-full absolute inset-0">
              <polyline points="28,140 70,108 114,126 164,72 204,90 254,38 328,58"
                fill="none" stroke="#cc0000" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
              <circle cx="28"  cy="140" r="5.5" fill="#cc0000"/>
              <circle cx="328" cy="58"  r="5.5" fill="white" stroke="#cc0000" strokeWidth="2.5"/>
              <text x="20"  y="158" fontSize="8" fill="#999" fontWeight="500">Start</text>
              <text x="308" y="52"  fontSize="8" fill="#999" fontWeight="500">Ziel</text>
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
