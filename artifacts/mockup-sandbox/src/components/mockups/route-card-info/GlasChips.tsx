import React from 'react';
import { Mountain, Ruler, TrendingUp, Clock, Sun } from 'lucide-react';

export function GlasChips() {
  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-8 font-sans">
      <div className="relative w-[390px] h-[560px] rounded-[24px] overflow-hidden shadow-2xl ring-1 ring-white/10">
        {/* Background Image */}
        <img 
          src="/__mockup/images/route-foto.png" 
          alt="Route" 
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Chips at Top Left */}
        <div className="absolute top-5 left-5 right-5 flex flex-wrap gap-2">
          <Chip icon={<Mountain size={14} strokeWidth={2.5} />} text="T2" />
          <Chip icon={<Ruler size={14} strokeWidth={2.5} />} text="8.4 km" />
          <Chip icon={<TrendingUp size={14} strokeWidth={2.5} />} text="320 hm" />
          <Chip icon={<Clock size={14} strokeWidth={2.5} />} text="2:30 h" />
          <Chip icon={<Sun size={14} strokeWidth={2.5} />} text="eher Sommer" />
        </div>

        {/* Signpost at Bottom Left */}
        <div className="absolute bottom-6 left-5 flex items-center drop-shadow-md">
          {/* Yellow Bar */}
          <div className="flex items-center bg-[rgba(255,204,0,0.55)] h-[54px] pl-1 pr-3 rounded-l-sm backdrop-blur-md">
            {/* Green Square */}
            <div className="w-[46px] h-[46px] bg-[#008C3C] flex flex-col justify-between p-[5px] rounded-[2px] shadow-sm">
              <div className="text-white font-bold leading-[1.1]" style={{ fontSize: '7px' }}>
                Wanderland<br />regional
              </div>
              <div className="text-white font-black italic leading-none text-right pb-0.5" style={{ fontFamily: 'Arial, sans-serif', fontSize: '17px' }}>
                60
              </div>
            </div>
            
            {/* Text Content */}
            <div className="ml-3 flex flex-col justify-center">
              <div className="text-white font-bold leading-tight" style={{ fontSize: '19px', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                Via Rhenana
              </div>
              <div className="text-white flex items-center gap-1.5 mt-[1px]" style={{ fontSize: '12px', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                <span className="font-semibold">Etappe 6</span>
                <span>Eglisau - Bad Zurzach</span>
              </div>
            </div>
          </div>
          
          {/* Arrow Tip */}
          <div 
            className="h-[54px] w-[24px] relative backdrop-blur-md"
            style={{
              background: 'rgba(255,255,255,0.55)',
              clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
              marginLeft: '-0.5px'
            }}
          >
            {/* Red Stripe */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[80%] h-[12px] bg-[#E30613]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(20,20,20,0.5)] backdrop-blur-md text-white text-[13px] font-medium border border-white/10 shadow-lg transition-transform hover:scale-105 cursor-default">
      <span className="opacity-80">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
