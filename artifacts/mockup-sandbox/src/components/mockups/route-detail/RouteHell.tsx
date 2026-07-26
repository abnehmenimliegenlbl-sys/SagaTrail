import React from 'react';
import { MapPin, TrendingUp, Mountain, Clock, Footprints, Map, Sun, MountainSnow, Landmark } from 'lucide-react';

export default function RouteHell() {
  return (
    <div className="w-[390px] mx-auto min-h-[100dvh] bg-[#f4f4f4] font-sans text-[#1a1a1a] pb-0 overflow-y-auto relative">

      {/* ─── 1. Hero Photo ─── */}
      <div className="h-[220px] w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#6b7e6a] via-[#5a7058] to-[#3d5c3b]" />
        {/* terrain texture overlay */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '8px 8px' }} />
        {/* back button */}
        <div className="absolute top-6 left-5 w-9 h-9 bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </div>
        {/* photo credit */}
        <span className="absolute bottom-3 right-4 text-[10px] text-white/60">© Elm, Kanton Glarus</span>
      </div>

      {/* ─── 2. Title Card ─── */}
      <div className="px-4 -mt-10 relative z-10 mb-3">
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-5 border border-black/[0.04]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#cc0000] shrink-0" />
                <span className="text-[11px] font-bold tracking-widest uppercase text-gray-400">Glarus Süd</span>
              </div>
              <h1 className="text-[22px] font-extrabold leading-tight mb-3 text-[#1a1a1a]">Elm Höhenweg</h1>
              <div className="inline-flex items-center gap-2 bg-[#cc0000] text-white px-3 py-1.5 rounded-lg">
                <span className="font-bold text-sm">T2</span>
                <span className="text-white/40 text-xs">|</span>
                <span className="text-[13px] font-medium">Bergwanderweg</span>
              </div>
            </div>
            {/* Small route photo thumbnail */}
            <div className="w-[76px] h-[76px] rounded-xl overflow-hidden shrink-0 shadow-md border-2 border-white">
              <div className="w-full h-full bg-gradient-to-br from-[#a8c5a0] via-[#7da876] to-[#4e7a47] relative flex items-end justify-center pb-1">
                {/* simple mountain silhouette */}
                <svg viewBox="0 0 76 40" className="absolute bottom-0 w-full" preserveAspectRatio="none">
                  <polygon points="0,40 20,10 38,28 55,5 76,40" fill="rgba(255,255,255,0.15)" />
                  <polygon points="0,40 20,14 38,32 55,9 76,40" fill="rgba(0,0,0,0.18)" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. Stats Grid (6 Werte) ─── */}
      <div className="px-4 mb-3">
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[
            { Icon: MapPin,     value: '14.2',  unit: 'km',         label: 'Distanz'   },
            { Icon: TrendingUp, value: '397',   unit: 'm',          label: 'Aufstieg'  },
            { Icon: Clock,      value: '3h 15', unit: '',           label: 'Zeit'      },
          ].map(({ Icon, value, unit, label }) => (
            <div key={label} className="bg-white rounded-xl p-3 flex flex-col items-center text-center border border-black/[0.04] shadow-sm">
              <Icon className="w-4 h-4 text-[#cc0000] mb-1.5" />
              <span className="text-[17px] font-bold text-[#1a1a1a] leading-none">
                {value}<span className="text-[11px] font-semibold text-gray-400 ml-0.5">{unit}</span>
              </span>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-1">{label}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { Icon: Mountain,  value: '1842',  unit: 'm',  label: 'Max. Höhe'  },
            { Icon: Footprints,value: "19'700", unit: '',  label: 'Schritte'   },
            { Icon: Landmark,  value: '8',     unit: '',   label: 'POIs'       },
          ].map(({ Icon, value, unit, label }) => (
            <div key={label} className="bg-white rounded-xl p-3 flex flex-col items-center text-center border border-black/[0.04] shadow-sm">
              <Icon className="w-4 h-4 text-[#cc0000] mb-1.5" />
              <span className="text-[17px] font-bold text-[#1a1a1a] leading-none">
                {value}<span className="text-[11px] font-semibold text-gray-400 ml-0.5">{unit}</span>
              </span>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-1">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 4. Elevation Profile ─── */}
      <div className="px-4 mb-3">
        <div className="bg-white rounded-xl border border-black/[0.04] shadow-sm p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-3">Höhenprofil</span>
          <svg viewBox="0 0 320 90" className="w-full h-auto">
            <defs>
              <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#cc0000" stopOpacity="0.18"/>
                <stop offset="100%" stopColor="#cc0000" stopOpacity="0.0"/>
              </linearGradient>
            </defs>
            {/* grid lines */}
            {[22, 44, 66].map(y => (
              <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#f0f0f0" strokeWidth="1"/>
            ))}
            <polyline points="0,80 20,72 50,58 85,38 120,32 160,16 195,28 230,50 265,66 320,74 320,90 0,90"
              fill="url(#eg)" />
            <polyline points="0,80 20,72 50,58 85,38 120,32 160,16 195,28 230,50 265,66 320,74"
              fill="none" stroke="#cc0000" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
            <text x="2"   y="88" fontSize="8" fill="#bbb">1200m</text>
            <text x="2"   y="14" fontSize="8" fill="#bbb">1900m</text>
            <text x="280" y="88" fontSize="8" fill="#bbb">14.2km</text>
          </svg>
        </div>
      </div>

      {/* ─── 5. Routenverlauf ─── */}
      <div className="px-4 mb-3">
        <div className="bg-white rounded-xl border border-black/[0.04] shadow-sm overflow-hidden">
          <div className="h-[130px] relative">
            <div className="absolute inset-0 bg-[#eef0eb]"
              style={{ backgroundImage: 'radial-gradient(#c8cfc3 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
            <svg viewBox="0 0 360 130" className="w-full h-full absolute inset-0">
              <polyline points="40,110 80,82 120,95 170,48 205,60 250,22 310,38"
                fill="none" stroke="#cc0000" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
              <circle cx="40"  cy="110" r="5" fill="#cc0000"/>
              <circle cx="310" cy="38"  r="5" fill="white" stroke="#cc0000" strokeWidth="2.5"/>
            </svg>
            <div className="absolute bottom-2.5 right-3 bg-white/95 px-2.5 py-1 rounded-lg shadow-sm border border-black/5 flex items-center gap-1.5">
              <Map className="w-3 h-3 text-[#1a1a1a]"/>
              <span className="text-[10px] font-bold text-[#1a1a1a]">Karte öffnen</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. Sage ─── */}
      <div className="px-4 mb-3">
        <div className="bg-white rounded-xl border border-black/[0.04] shadow-sm p-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-3">🧚 Sage dieser Route</span>
          <div className="flex gap-3">
            {/* Saga photo */}
            <div className="w-[72px] h-[72px] rounded-xl overflow-hidden shrink-0 border border-gray-100">
              <div className="w-full h-full bg-gradient-to-br from-[#4a3728] via-[#6b4c38] to-[#3a2519] flex items-center justify-center relative">
                {/* church silhouette */}
                <svg viewBox="0 0 72 72" className="w-full h-full absolute inset-0 opacity-70">
                  <rect x="28" y="30" width="16" height="30" fill="rgba(255,255,255,0.25)"/>
                  <polygon points="36,12 24,30 48,30" fill="rgba(255,255,255,0.3)"/>
                  <rect x="33" y="18" width="6" height="10" fill="rgba(255,255,255,0.2)"/>
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-bold text-[#1a1a1a] leading-snug mb-1.5">
                Der heilige Fridolin und der tote Bruder
              </h3>
              <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-3">
                Als der heilige Fridolin in der Wildnis betete, erschien ihm sein toter Bruder Ursus und bat ihn, sein Erbe zurückzufordern...
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex gap-1.5">
              <span className="bg-[#f8f9fa] text-[11px] text-gray-500 font-medium px-2.5 py-1 rounded-full border border-gray-200 flex items-center gap-1">
                <Sun className="w-3 h-3"/> Eher Sommer
              </span>
              <span className="bg-[#f8f9fa] text-[11px] text-gray-500 font-medium px-2.5 py-1 rounded-full border border-gray-200 flex items-center gap-1">
                <MountainSnow className="w-3 h-3"/> Alpin
              </span>
            </div>
            <span className="text-[12px] font-bold text-[#cc0000] flex items-center gap-1">
              Zur Sage
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
            </span>
          </div>
        </div>
      </div>

      {/* ─── 7. Branding Footer (für Posts/Shares) ─── */}
      <div className="mt-1 bg-[#1a1a1a] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* SagaTrail diamond icon */}
          <div className="w-9 h-9 flex items-center justify-center">
            <svg viewBox="0 0 36 36" width="36" height="36">
              <polygon points="18,2 34,18 18,34 2,18" fill="#cc0000"/>
              {/* mountain inside */}
              <polygon points="18,10 10,24 26,24" fill="white" opacity="0.9"/>
              <polygon points="18,10 14,17 22,17" fill="#cc0000"/>
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-[13px] tracking-wide leading-none mb-0.5">SAGATRAIL</div>
            <div className="text-gray-400 text-[11px]">www.sagatrail.ch</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-[10px] uppercase tracking-widest mb-0.5">Wanderapp</div>
          <div className="text-gray-500 text-[10px]">Schweizer Sagen entdecken</div>
        </div>
      </div>

    </div>
  );
}
