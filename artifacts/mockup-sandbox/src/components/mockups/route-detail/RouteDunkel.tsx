import React from 'react';
import { ArrowRight, Mountain, Navigation, Clock, Footprints, TrendingUp } from 'lucide-react';

const DATA = {
  name: "Elm Höhenweg",
  sagaName: "Der heilige Fridolin und der tote Bruder",
  distanceKm: 14.2,
  ascentM: 397,
  maxElevationM: 1842,
  minutes: 195,
  sac: "T2",
  sacLabel: "Bergwanderweg",
  terrain: "Alpin",
  season: "eher_sommer",
  steps: 19700
};

export default function RouteDunkel() {
  // SVG Elevation Profile points
  // 0 to 14.2 km width -> 0 to 350
  // 1445 to 1842 elevation -> height 0 to 100
  const chartPoints = [
    [0, 90],
    [20, 85],
    [50, 70],
    [90, 40],
    [130, 20],
    [170, 0], // Peak (1842)
    [210, 15],
    [240, 30],
    [280, 50],
    [310, 60],
    [350, 85]
  ];

  const pathD = `M ${chartPoints.map(p => p.join(',')).join(' L ')}`;
  const areaD = `${pathD} L 350,100 L 0,100 Z`;

  return (
    <div 
      className="mx-auto min-h-[100dvh] w-full max-w-[390px] overflow-y-auto relative pb-12 font-sans"
      style={{ backgroundColor: '#0d0d0d', color: '#ffffff' }}
    >
      {/* 1. Photo Hero */}
      <div className="relative h-[260px] w-full overflow-hidden">
        {/* Placeholder landscape gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-700 to-neutral-900" />
        
        {/* SVG Mountains placeholder overlay to give landscape feel */}
        <svg className="absolute bottom-0 w-full h-[180px] opacity-10" preserveAspectRatio="none" viewBox="0 0 100 100">
          <polygon fill="#ffffff" points="0,100 20,40 40,70 60,20 100,80 100,100" />
        </svg>

        {/* Top-to-bottom gradient overlay (black at bottom) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-black/50 to-transparent" />
        
        {/* Badges top right */}
        <div className="absolute top-5 right-5 flex items-center">
          <div 
            className="px-3 py-1 rounded-full text-sm font-bold shadow-lg flex items-center gap-1"
            style={{ backgroundColor: '#cc0000', color: '#ffffff' }}
          >
            {DATA.sac}
          </div>
        </div>

        {/* Title area */}
        <div className="absolute bottom-5 left-5 right-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-bold tracking-widest uppercase text-neutral-300">
              {DATA.sacLabel}
            </span>
          </div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-white drop-shadow-md">
            {DATA.name}
          </h1>
        </div>
      </div>

      <div className="px-5 space-y-6 mt-5">
        {/* 2. Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Main Stat Card - Distance */}
          <div className="col-span-2 p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: '#1a1a1a' }}>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#cc0000]" />
              <span className="text-sm font-medium text-neutral-400">Distanz</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{DATA.distanceKm}</span>
              <span className="text-sm text-neutral-400 font-medium">km</span>
            </div>
          </div>

          <StatCard icon={<TrendingUp size={14} className="text-[#cc0000]" />} label="Aufstieg" value={DATA.ascentM} unit="m" />
          <StatCard icon={<Mountain size={14} className="text-[#cc0000]" />} label="Max. Höhe" value={DATA.maxElevationM} unit="m" />
          <StatCard icon={<Clock size={14} className="text-[#cc0000]" />} label="Zeit" value={`${Math.floor(DATA.minutes / 60)}h ${DATA.minutes % 60}m`} unit="" />
          <StatCard icon={<Footprints size={14} className="text-[#cc0000]" />} label="Schritte" value={DATA.steps.toLocaleString('de-CH')} unit="" />
        </div>

        {/* 3. Elevation Profile Chart */}
        <div className="rounded-xl p-4 flex flex-col gap-4" style={{ backgroundColor: '#111111' }}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-300">Höhenprofil</h3>
            <span className="text-xs text-neutral-500 font-medium">1445m - 1842m</span>
          </div>
          <div className="h-[100px] w-full relative">
            <svg width="100%" height="100%" viewBox="0 0 350 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#cc0000" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#cc0000" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaD} fill="url(#chartFill)" />
              <path d={pathD} fill="none" stroke="#cc0000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="absolute top-0 left-0 text-[10px] text-neutral-500">{DATA.maxElevationM}m</div>
            <div className="absolute bottom-0 left-0 text-[10px] text-neutral-500">1445m</div>
          </div>
        </div>

        {/* 4. Map Preview */}
        <div className="rounded-xl overflow-hidden relative h-[160px]" style={{ backgroundColor: '#1a1a1a' }}>
          {/* Simple mock map using SVG */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }} />
          <svg width="100%" height="100%" viewBox="0 0 300 150" className="absolute inset-0">
            <path d="M 40,110 Q 80,120 120,80 T 180,60 T 250,40" fill="none" stroke="#cc0000" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 4" />
            {/* Start point */}
            <circle cx="40" cy="110" r="5" fill="#1a1a1a" stroke="#ffffff" strokeWidth="2.5" />
            {/* End point */}
            <circle cx="250" cy="40" r="5" fill="#cc0000" stroke="#ffffff" strokeWidth="2.5" />
          </svg>
          <div className="absolute bottom-3 right-3">
            <div className="bg-[#0d0d0d] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-neutral-800 shadow-lg">
              <Navigation size={12} className="text-[#cc0000]" />
              Karte öffnen
            </div>
          </div>
        </div>

        {/* 5. Badges + Season */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="px-3 py-1.5 rounded-lg border border-[#cc0000] text-sm font-medium" style={{ backgroundColor: '#1a1a1a' }}>
              {DATA.terrain}
            </div>
            <div className="px-3 py-1.5 rounded-lg border border-neutral-700 text-sm font-medium text-neutral-400" style={{ backgroundColor: '#1a1a1a' }}>
              Sommer-Route
            </div>
          </div>

          <div className="p-4 rounded-xl space-y-3" style={{ backgroundColor: '#1a1a1a' }}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-300">Saison (Mai - Okt)</span>
              <span className="text-[#cc0000] font-bold">Ideal</span>
            </div>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden flex">
              <div className="h-full bg-neutral-700 w-[20%]" />
              <div className="h-full bg-[#cc0000] w-[60%]" />
              <div className="h-full bg-neutral-700 w-[20%]" />
            </div>
          </div>
        </div>

        {/* 6. Saga Teaser */}
        <div 
          className="rounded-xl p-5 border-l-2 relative overflow-hidden group cursor-pointer transition-colors hover:bg-neutral-900" 
          style={{ backgroundColor: '#1a1a1a', borderLeftColor: '#B8935A' }}
        >
          {/* Decorative gold background element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#B8935A] opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
          
          <span className="text-[10px] font-bold tracking-widest uppercase mb-2.5 block" style={{ color: '#B8935A' }}>
            Die Sage zum Weg
          </span>
          <h4 className="text-lg font-bold mb-4 pr-8 text-neutral-100 leading-snug">
            {DATA.sagaName}
          </h4>
          <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#B8935A' }}>
            Zur Sage
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, unit }: { icon: React.ReactNode, label: string, value: string | number, unit: string }) {
  return (
    <div className="p-3.5 rounded-xl flex flex-col gap-2" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800">
          {icon}
        </div>
        <span className="text-xs font-medium text-neutral-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-[22px] font-bold">{value}</span>
        {unit && <span className="text-xs text-neutral-400 font-medium">{unit}</span>}
      </div>
    </div>
  );
}
