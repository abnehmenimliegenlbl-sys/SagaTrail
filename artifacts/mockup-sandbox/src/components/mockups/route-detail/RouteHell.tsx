import React from 'react';
import { MapPin, TrendingUp, Mountain, Clock, Footprints, ChevronRight, Sun, MountainSnow, Map } from 'lucide-react';

export default function RouteHell() {
  return (
    <div className="w-[390px] mx-auto min-h-[100dvh] bg-[#ffffff] font-sans text-[#1a1a1a] pb-10 overflow-y-auto shadow-2xl relative ring-1 ring-black/5">
      {/* 1. Header Image */}
      <div className="h-[200px] w-full bg-gradient-to-b from-[#8f9a91] to-[#616a62] relative">
         {/* Back button placeholder */}
         <div className="absolute top-6 left-5 w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
         </div>
      </div>

      <div className="px-5 -mt-8 relative z-10">
        {/* 2. Title Section */}
        <div className="bg-[#ffffff] rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 mb-8 border border-black/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#cc0000]"></span>
            <span className="text-xs font-bold tracking-widest uppercase text-gray-400">Glarus Süd</span>
          </div>
          <h1 className="text-[26px] font-extrabold leading-tight mb-4 text-[#1a1a1a]">Elm Höhenweg</h1>
          
          <div className="inline-flex items-center gap-2 bg-[#cc0000] text-white px-3 py-1.5 rounded-lg">
            <span className="font-bold text-sm tracking-wide">T2</span>
            <span className="text-white/50 text-xs">|</span>
            <span className="text-[13px] font-medium">Bergwanderweg</span>
          </div>
        </div>

        {/* 3. Stats Grid */}
        <div className="mb-10">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-[#f8f9fa] p-4 rounded-xl flex flex-col items-center text-center border border-black/[0.03]">
              <MapPin className="w-5 h-5 text-[#cc0000] mb-2" />
              <span className="text-[18px] font-bold text-[#1a1a1a]">14.2</span>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">km</span>
            </div>
            <div className="bg-[#f8f9fa] p-4 rounded-xl flex flex-col items-center text-center border border-black/[0.03]">
              <TrendingUp className="w-5 h-5 text-[#cc0000] mb-2" />
              <span className="text-[18px] font-bold text-[#1a1a1a]">397</span>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">m Aufstieg</span>
            </div>
            <div className="bg-[#f8f9fa] p-4 rounded-xl flex flex-col items-center text-center border border-black/[0.03]">
              <Clock className="w-5 h-5 text-[#cc0000] mb-2" />
              <span className="text-[18px] font-bold text-[#1a1a1a]">3h 15</span>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">Zeit</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f8f9fa] p-4 rounded-xl flex flex-col items-center text-center border border-black/[0.03]">
              <Mountain className="w-5 h-5 text-[#cc0000] mb-2" />
              <span className="text-[18px] font-bold text-[#1a1a1a]">1842</span>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">m max. Höhe</span>
            </div>
            <div className="bg-[#f8f9fa] p-4 rounded-xl flex flex-col items-center text-center border border-black/[0.03]">
              <Footprints className="w-5 h-5 text-[#cc0000] mb-2" />
              <span className="text-[18px] font-bold text-[#1a1a1a]">19'700</span>
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">Schritte</span>
            </div>
          </div>
        </div>

        {/* 4. Elevation Profile */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Höhenprofil</h2>
          </div>
          <div className="bg-[#ffffff] p-5 rounded-xl border border-gray-100 shadow-sm relative">
            {/* Grid lines */}
            <div className="absolute inset-0 p-5 pointer-events-none flex flex-col justify-between">
              <div className="border-b border-gray-100 w-full h-0"></div>
              <div className="border-b border-gray-100 w-full h-0"></div>
              <div className="border-b border-gray-100 w-full h-0"></div>
              <div className="border-b border-gray-100 w-full h-0"></div>
            </div>
            
            <svg viewBox="0 0 300 120" className="w-full h-auto overflow-visible relative z-10">
              <defs>
                <linearGradient id="elev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#cc0000" stopOpacity="0.15"/>
                  <stop offset="100%" stopColor="#cc0000" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              <polyline 
                points="0,120 0,90 30,75 70,45 120,40 160,20 190,35 230,65 270,85 300,95 300,120" 
                fill="url(#elev-grad)" 
              />
              <polyline 
                points="0,90 30,75 70,45 120,40 160,20 190,35 230,65 270,85 300,95" 
                fill="none" 
                stroke="#cc0000" 
                strokeWidth="2.5" 
                strokeLinejoin="round" 
                strokeLinecap="round" 
              />
              
              {/* Axes Labels */}
              <text x="0" y="118" fontSize="9" fill="#9ca3af" fontWeight="500">1200m</text>
              <text x="0" y="10" fontSize="9" fill="#9ca3af" fontWeight="500">1900m</text>
              <text x="270" y="118" fontSize="9" fill="#9ca3af" fontWeight="500">14.2km</text>
            </svg>
          </div>
        </div>

        {/* 5. Map Preview */}
        <div className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Routenverlauf</h2>
          <div className="h-[160px] bg-[#f8f9fa] rounded-xl relative overflow-hidden flex items-center justify-center border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
             {/* Map pattern background */}
             <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#d1d5db 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
             
             {/* Route line */}
             <svg viewBox="0 0 300 160" className="w-full h-full absolute inset-0">
               <polyline points="40,130 80,100 110,115 160,60 190,75 240,30 270,45" fill="none" stroke="#cc0000" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="8 6"/>
               
               {/* Start/End markers */}
               <circle cx="40" cy="130" r="5" fill="white" stroke="#cc0000" strokeWidth="2.5" />
               <circle cx="270" cy="45" r="5" fill="white" stroke="#cc0000" strokeWidth="2.5" />
             </svg>

             {/* Open Map CTA */}
             <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-black/5 flex items-center gap-1.5">
               <Map className="w-3.5 h-3.5 text-[#1a1a1a]" />
               <span className="text-[11px] font-bold text-[#1a1a1a]">Karte öffnen</span>
             </div>
          </div>
        </div>

        {/* 6. Badges */}
        <div className="mb-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Eigenschaften</h2>
          <div className="flex flex-wrap gap-2.5">
            <div className="bg-[#f8f9fa] border border-gray-200 px-3.5 py-2 rounded-full flex items-center gap-2">
              <Sun className="w-4 h-4 text-gray-500" />
              <span className="text-[13px] font-medium text-[#1a1a1a]">Eher Sommer</span>
            </div>
            <div className="bg-[#f8f9fa] border border-gray-200 px-3.5 py-2 rounded-full flex items-center gap-2">
              <MountainSnow className="w-4 h-4 text-gray-500" />
              <span className="text-[13px] font-medium text-[#1a1a1a]">Alpin</span>
            </div>
          </div>
        </div>

        {/* 7. Saga Teaser */}
        <div className="mt-6 mb-4">
          <button className="w-full text-left bg-gradient-to-br from-[#fafafa] to-[#f5f5f5] border border-gray-200 rounded-xl p-5 hover:border-[#cc0000]/30 transition-colors group relative overflow-hidden">
            {/* Subtle red glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#cc0000]/0 via-[#cc0000]/5 to-[#cc0000]/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-start justify-between relative z-10">
              <div className="pr-4">
                <span className="text-[#cc0000] text-[11px] font-bold uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
                  <span className="text-sm">🧚</span> Zur Sage
                </span>
                <h3 className="text-[15px] font-semibold text-[#1a1a1a] leading-snug">Der heilige Fridolin und der tote Bruder</h3>
              </div>
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shrink-0 shadow-[0_2px_10px_rgb(0,0,0,0.06)] border border-gray-100 group-hover:scale-105 transition-transform">
                <ChevronRight className="w-4.5 h-4.5 text-[#cc0000]" />
              </div>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
