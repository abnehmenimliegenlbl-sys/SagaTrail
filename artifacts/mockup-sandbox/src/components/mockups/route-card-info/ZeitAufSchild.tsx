import React from "react";
import { Clock } from "lucide-react";

export function ZeitAufSchild() {
  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-8 font-sans">
      <div className="relative w-[390px] h-[560px] rounded-[24px] overflow-hidden shadow-2xl">
        {/* Background Image */}
        <img 
          src="/__mockup/images/route-foto.png" 
          alt="Route Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient Overlay for better readability of the sign */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        {/* Sign Container at bottom left */}
        <div className="absolute bottom-6 left-0 flex flex-col items-start drop-shadow-xl">
          
          {/* Main Yellow Sign */}
          <div className="flex h-[54px] items-stretch">
            {/* Yellow Bar */}
            <div 
              className="flex items-center pl-1 pr-3"
              style={{ backgroundColor: 'rgba(255, 204, 0, 0.55)', backdropFilter: 'blur(8px)' }}
            >
              {/* Green Square */}
              <div className="w-[46px] h-[46px] bg-[#008C3C] flex flex-col items-center justify-center shrink-0">
                <div className="text-[7px] leading-[8.5px] text-white font-bold text-center uppercase tracking-tight mt-0.5">
                  Wanderland<br />regional
                </div>
                <div 
                  className="text-[17px] leading-tight text-white mt-0.5" 
                  style={{ fontFamily: 'Arial, sans-serif', fontWeight: 900, fontStyle: 'italic' }}
                >
                  60
                </div>
              </div>

              {/* Sign Text */}
              <div className="flex flex-col justify-center text-white shrink-0 ml-3">
                <div className="text-[19px] font-bold leading-none tracking-tight mb-0.5 drop-shadow-md">
                  Via Rhenana
                </div>
                <div className="text-[12px] leading-none font-medium text-white/95 drop-shadow-md flex items-center gap-1.5 mt-0.5">
                  <span>Etappe 6</span>
                  <span className="text-[10px] opacity-75">•</span>
                  <span>Eglisau - Bad Zurzach</span>
                </div>
              </div>

              {/* Time Text (Design Hypothesis) */}
              <div className="ml-4 flex items-center h-[34px] border-l-2 border-white/40 pl-4 shrink-0 my-auto">
                <div className="text-white font-bold text-[18px] tracking-tight drop-shadow-md flex items-center gap-1.5">
                  <Clock size={16} strokeWidth={2.5} className="opacity-90" />
                  2 h 30 min
                </div>
              </div>
            </div>

            {/* Arrowhead */}
            <div 
              className="relative w-[34px] h-[54px] shrink-0"
              style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
            >
              <div 
                className="absolute inset-0"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.55)', 
                  backdropFilter: 'blur(8px)',
                }}
              />
              {/* Red Horizontal Bar (Mountain trail T3/T4 look) */}
              <div 
                className="absolute top-[18px] left-0 w-full h-[18px] bg-[#E30613]"
              />
            </div>
          </div>
          
          {/* Zusatztäfelchen (Additional Sign) */}
          <div className="ml-[56px] mt-1.5 px-3 py-1.5 bg-white shadow-md border border-black/10 flex items-center gap-2.5 text-[12px] font-bold text-neutral-800 rounded-sm">
            <span className="text-black">T2</span>
            <span className="opacity-30">•</span>
            <span>8.4 km</span>
            <span className="opacity-30">•</span>
            <span>320 hm</span>
            <span className="opacity-30">•</span>
            <span className="text-neutral-500 font-medium">eher Sommer</span>
          </div>

        </div>
      </div>
    </div>
  );
}
