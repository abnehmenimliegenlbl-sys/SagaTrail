import React from 'react';

export function Zeitleiste() {
  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-8 font-sans">
      <div className="relative w-[390px] h-[560px] rounded-[24px] overflow-hidden shadow-2xl">
        {/* Background Image */}
        <img 
          src="/__mockup/images/route-foto.png" 
          alt="Route Background" 
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end">
          
          {/* Wegweiser */}
          <div className="mb-4 ml-4 flex items-center drop-shadow-md relative">
            
            {/* Main Yellow Bar */}
            <div 
              className="flex items-center h-[54px] rounded-l-sm pl-1 pr-3 backdrop-blur-sm relative z-10"
              style={{ backgroundColor: 'rgba(255,204,0,0.55)' }}
            >
              {/* Green Square */}
              <div 
                className="w-[46px] h-[46px] flex flex-col items-center justify-center rounded-sm shrink-0"
                style={{ backgroundColor: '#008C3C' }}
              >
                <div className="text-white font-bold leading-tight text-center" style={{ fontSize: '7px' }}>
                  Wanderland<br />regional
                </div>
                <div className="text-white leading-none mt-0.5" style={{ fontFamily: 'Arial, sans-serif', fontSize: '17px', fontWeight: 900, fontStyle: 'italic' }}>
                  60
                </div>
              </div>
              
              {/* Text Content */}
              <div className="ml-3 flex flex-col justify-center h-full">
                <div className="text-white font-bold leading-none tracking-wide drop-shadow-sm" style={{ fontSize: '19px' }}>
                  Via Rhenana
                </div>
                <div className="text-white flex items-center gap-1.5 mt-1 opacity-95 leading-none drop-shadow-sm" style={{ fontSize: '12px' }}>
                  <span className="font-bold">Etappe 6</span>
                  <span>Eglisau - Bad Zurzach</span>
                </div>
              </div>
            </div>

            {/* Arrowhead */}
            <div 
              className="relative h-[54px] w-[27px] flex items-center backdrop-blur-sm -ml-[1px] z-0"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.55)',
                clipPath: 'polygon(0 0, 100% 50%, 0 100%)'
              }}
            >
              {/* Red bar in the middle */}
              <div className="w-full h-[10px]" style={{ backgroundColor: '#E30613' }}></div>
            </div>
            
          </div>
          
          {/* Zeitleiste (Bottom Bar) */}
          <div 
            className="w-full h-[30px] flex items-center justify-center backdrop-blur-md"
            style={{ backgroundColor: 'rgba(255,204,0,0.55)' }}
          >
            <div className="text-white font-bold text-[13px] tracking-wide drop-shadow-md">
              T2 &middot; 8.4 km &middot; 320 hm &middot; 2:30 h &middot; eher Sommer
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
