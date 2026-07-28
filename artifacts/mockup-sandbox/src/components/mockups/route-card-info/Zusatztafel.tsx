import React from "react";

export function Zusatztafel() {
  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-8 font-sans">
      <div className="relative w-[390px] h-[560px] rounded-[24px] overflow-hidden shadow-2xl bg-neutral-800 ring-1 ring-white/10">
        <img 
          src="/__mockup/images/route-foto.png" 
          alt="Route" 
          className="w-full h-full object-cover"
        />

        {/* Overlay gradient for better legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80" />

        {/* Bottom Left Area */}
        <div className="absolute left-0 bottom-8 inline-flex flex-col gap-[3px] items-start">
          
          {/* Main Sign (Yellow) */}
          <div className="flex items-center">
            <div className="bg-[rgba(255,204,0,0.55)] backdrop-blur-md h-[54px] flex items-center pl-1 pr-4 rounded-r-none shadow-md">
              {/* Green Square */}
              <div className="w-[46px] h-[46px] bg-[#008C3C] rounded-[2px] flex flex-col items-center justify-center text-white shrink-0 mr-3 shadow-sm">
                <div className="text-[7px] leading-[8.5px] font-bold text-center uppercase tracking-[0.03em] mb-[1px]">
                  Wanderland<br/>regional
                </div>
                <div className="text-[17px] leading-none font-black italic font-sans" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  60
                </div>
              </div>
              
              {/* Texts */}
              <div className="flex flex-col text-white justify-center py-1">
                <div className="text-[19px] font-bold leading-[1.1] mb-1 whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                  Via Rhenana
                </div>
                <div className="text-[12px] font-medium leading-[1.1] whitespace-nowrap" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                  Etappe 6 <span className="opacity-80 mx-1">|</span> Eglisau – Bad Zurzach
                </div>
              </div>
            </div>

            {/* Arrowhead */}
            <div 
              className="w-[27px] h-[54px] relative backdrop-blur-md shadow-md shrink-0"
              style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
            >
              <div className="absolute inset-0 bg-white/55"></div>
              <div className="absolute top-[21px] h-[12px] left-0 right-0 bg-[#E30613]"></div>
            </div>
          </div>

          {/* Zusatztafel (Metadata) */}
          <div className="bg-white/85 backdrop-blur-md h-[26px] w-[calc(100%-27px)] rounded-r-[4px] flex items-center justify-between px-3 text-neutral-800 text-[11px] font-bold tracking-tight shadow-md border-t border-b border-r border-white/60 ml-[1px]">
            <span className="whitespace-nowrap">T2</span>
            <span className="w-[3px] h-[3px] rounded-full bg-neutral-800/40 shrink-0"></span>
            <span className="whitespace-nowrap">8.4 km</span>
            <span className="w-[3px] h-[3px] rounded-full bg-neutral-800/40 shrink-0"></span>
            <span className="whitespace-nowrap">320 hm</span>
            <span className="w-[3px] h-[3px] rounded-full bg-neutral-800/40 shrink-0"></span>
            <span className="whitespace-nowrap">2:30 h</span>
            <span className="w-[3px] h-[3px] rounded-full bg-neutral-800/40 shrink-0"></span>
            <span className="whitespace-nowrap">eher Sommer</span>
          </div>

        </div>
      </div>
    </div>
  );
}
