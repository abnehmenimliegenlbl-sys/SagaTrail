import React from 'react';
import { MapPin, TrendingUp, Mountain, Clock, Footprints, Landmark } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   SOCIAL POST CARD — festes Format, kein Scrollen
   390 × 844 px  (wie ein Instagram-Portrait-Post auf dem Phone)
───────────────────────────────────────────────────────── */
export default function RouteHell() {
  return (
    <div
      className="w-[390px] h-[844px] overflow-hidden relative flex flex-col"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif', background: '#ffffff' }}
    >

      {/* ══════════════════════════════════════════
          HERO — Route-Foto mit Gradient-Overlay
      ══════════════════════════════════════════ */}
      <div className="relative flex-shrink-0" style={{ height: 248 }}>
        {/* Berglandschaft als Platzhalter */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#7a9a78] via-[#5a7a58] to-[#2e4e2c]" />
        {/* Topographic texture */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg,#fff 0,#fff 1px,transparent 0,transparent 8px)', backgroundSize: '14px 14px' }} />
        {/* darker gradient bottom so text is readable */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Route name overlaid on hero */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#cc0000]" />
                <span className="text-[11px] font-bold tracking-widest uppercase text-white/60">Glarus Süd</span>
              </div>
              <h1 className="text-[30px] font-black leading-none text-white tracking-tight">Elm Höhenweg</h1>
            </div>
            {/* SAC Badge */}
            <div className="flex flex-col items-center bg-[#cc0000] rounded-xl px-3 py-2 mb-1">
              <span className="text-white font-black text-[18px] leading-none">T2</span>
              <span className="text-white/80 text-[9px] font-bold uppercase tracking-wide mt-0.5">SAC</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-white/70 text-[12px] font-medium">Bergwanderweg · Alpin · Eher Sommer</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          STATS STRIP — 5 Werte in einer Zeile
      ══════════════════════════════════════════ */}
      <div className="bg-[#cc0000] px-4 py-3 flex items-center justify-between flex-shrink-0">
        {[
          { Icon: MapPin,      value: '14.2',   unit: 'km',  label: 'Distanz'   },
          { Icon: TrendingUp,  value: '397',    unit: 'm',   label: 'Aufstieg'  },
          { Icon: Mountain,    value: '1842',   unit: 'm',   label: 'Max. Höhe' },
          { Icon: Clock,       value: '3:15',   unit: 'h',   label: 'Zeit'      },
          { Icon: Footprints,  value: '~19.7',  unit: 'k',   label: 'Schritte'  },
        ].map(({ Icon, value, unit, label }, i, arr) => (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center text-center">
              <Icon className="w-3.5 h-3.5 text-white/70 mb-1" />
              <span className="text-white font-bold text-[14px] leading-none">
                {value}<span className="text-[9px] text-white/70 ml-0.5">{unit}</span>
              </span>
              <span className="text-white/60 text-[9px] uppercase tracking-wider mt-0.5">{label}</span>
            </div>
            {i < arr.length - 1 && <div className="w-px h-8 bg-white/20" />}
          </React.Fragment>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          CONTENT AREA — Höhenprofil + Karte + Sage
      ══════════════════════════════════════════ */}
      <div className="flex-1 bg-[#f5f5f5] px-3 pt-3 pb-0 flex flex-col gap-2.5 overflow-hidden">

        {/* Höhenprofil + POI-Zähler nebeneinander */}
        <div className="flex gap-2.5">
          {/* Elevation chart */}
          <div className="flex-1 bg-white rounded-xl border border-black/[0.05] shadow-sm px-3 pt-2.5 pb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Höhenprofil</span>
            <svg viewBox="0 0 200 60" className="w-full h-auto">
              <defs>
                <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#cc0000" stopOpacity="0.20"/>
                  <stop offset="100%" stopColor="#cc0000" stopOpacity="0"/>
                </linearGradient>
              </defs>
              {[15, 30, 45].map(y => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#f0f0f0" strokeWidth="1"/>)}
              <polyline points="0,54 16,48 35,38 56,24 78,18 100,8 122,16 144,32 166,44 200,50 200,60 0,60"
                fill="url(#eg)"/>
              <polyline points="0,54 16,48 35,38 56,24 78,18 100,8 122,16 144,32 166,44 200,50"
                fill="none" stroke="#cc0000" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
              <text x="2"   y="59" fontSize="7" fill="#ccc">1200m</text>
              <text x="2"   y="9"  fontSize="7" fill="#ccc">1900m</text>
              <text x="172" y="59" fontSize="7" fill="#ccc">14km</text>
            </svg>
          </div>

          {/* POI box */}
          <div className="w-[80px] bg-white rounded-xl border border-black/[0.05] shadow-sm flex flex-col items-center justify-center">
            <Landmark className="w-5 h-5 text-[#cc0000] mb-1" />
            <span className="text-[26px] font-black text-[#1a1a1a] leading-none">8</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">POIs</span>
          </div>
        </div>

        {/* Routenverlauf (mini Karte) */}
        <div className="bg-white rounded-xl border border-black/[0.05] shadow-sm overflow-hidden flex-shrink-0" style={{ height: 100 }}>
          <div className="h-full relative">
            <div className="absolute inset-0 bg-[#eef0eb]"
              style={{ backgroundImage: 'radial-gradient(#c5ccc0 1px,transparent 1px)', backgroundSize: '9px 9px' }}/>
            <svg viewBox="0 0 360 100" className="w-full h-full absolute inset-0">
              <polyline points="30,82 72,60 115,72 165,34 205,46 255,16 325,28"
                fill="none" stroke="#cc0000" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
              <circle cx="30"  cy="82" r="5" fill="#cc0000"/>
              <circle cx="325" cy="28" r="5" fill="white" stroke="#cc0000" strokeWidth="2.5"/>
              {/* distance markers */}
              <text x="24" y="96" fontSize="8" fill="#999">Start</text>
              <text x="300" y="22" fontSize="8" fill="#999">Ziel</text>
            </svg>
          </div>
        </div>

        {/* ─── SAGE ─── */}
        <div className="bg-white rounded-xl border border-black/[0.05] shadow-sm p-3.5 flex gap-3 flex-shrink-0">
          {/* Saga photo */}
          <div className="w-[58px] h-[58px] rounded-lg overflow-hidden shrink-0">
            <div className="w-full h-full bg-gradient-to-br from-[#3e2a1a] via-[#5a3820] to-[#2a1608] relative">
              <svg viewBox="0 0 58 58" className="absolute inset-0 w-full h-full">
                <rect x="20" y="25" width="18" height="26" fill="rgba(255,255,255,0.22)"/>
                <polygon points="29,9 17,25 41,25" fill="rgba(255,255,255,0.28)"/>
                <rect x="25" y="13" width="8" height="10" fill="rgba(255,255,255,0.15)"/>
                <rect x="22" y="36" width="7" height="15" fill="rgba(0,0,0,0.3)"/>
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#cc0000] block mb-1">🧚 Sage dieser Route</span>
            <h3 className="text-[13px] font-bold text-[#1a1a1a] leading-tight mb-1">
              Der heilige Fridolin und der tote Bruder
            </h3>
            <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
              Als Fridolin in der Wildnis betete, erschien ihm sein toter Bruder Ursus und bat ihn, sein Erbe zurückzufordern...
            </p>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════
          BRANDING FOOTER
      ══════════════════════════════════════════ */}
      <div className="bg-[#1a1a1a] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white">
            <img src="/__mockup/images/sagatrail-icon.png" alt="SagaTrail" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-white font-black text-[14px] tracking-wider leading-none mb-0.5">SAGATRAIL</div>
            <div className="text-gray-400 text-[11px]">www.sagatrail.ch</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-gray-500 text-[10px] uppercase tracking-widest">Wanderapp Schweiz</div>
          <div className="text-gray-600 text-[10px] mt-0.5">Sagen auf dem Trail erleben</div>
        </div>
      </div>

    </div>
  );
}
