'use client';

import { useState, useEffect } from 'react';

export function GlobalPopupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);
  const [isTabHidden, setIsTabHidden] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/site-settings/announcement');
        if (!res.ok) return;
        const json = await res.json();
        
        if (json.popupEnabled) {
          setData(json);
          // Check if dismissed recently (within last 24 hours)
          const lastDismissed = localStorage.getItem('iprintrush_popup_dismissed');
          const now = new Date().getTime();
          
          if (!lastDismissed || now - parseInt(lastDismissed) > 24 * 60 * 60 * 1000) {
            // Add a small delay so it doesn't pop up instantly on page load
            setTimeout(() => {
              setIsOpen(true);
            }, 1000);
          }
        }
      } catch (err) {
        console.error('Failed to load popup settings', err);
      }
    };

    fetchSettings();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('iprintrush_popup_dismissed', new Date().getTime().toString());
  };

  if (!data) return null;

  return (
    <>
      {/* The Popup Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 perspective-1000">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-500" 
            onClick={handleClose}
          />
          
          <div 
            className="relative w-full max-w-4xl rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border-4 border-white/20 animate-fadeInUp ring-1 ring-black/5"
            style={{ backgroundColor: data.popupColor || '#FFC520' }}
          >
            
            {/* Subtle decorative background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

            {/* Close button */}
            <button 
              onClick={handleClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-gray-900 transition-colors duration-200"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Left side: Image */}
            {data.popupImageUrl && (
              <div className="w-full md:w-1/2 min-h-[250px] md:min-h-[400px] relative overflow-hidden bg-black/5">
                <img 
                  src={data.popupImageUrl} 
                  alt="Promo" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            )}

            {/* Right side: Content */}
            <div className={`w-full ${data.popupImageUrl ? 'md:w-1/2' : ''} p-8 md:p-12 flex flex-col items-center justify-center text-center relative z-10`}>
              {data.popupTitle && (
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5 tracking-tight leading-tight">
                  {data.popupTitle}
                </h2>
              )}
              
              {data.popupMessage && (
                <p className="text-base md:text-lg text-gray-800 font-medium whitespace-pre-line leading-relaxed max-w-md">
                  {data.popupMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Side Navbar / Floating Tab to Re-open */}
      {!isOpen && data.popupEnabled && !isTabHidden && (
        <div 
          className="fixed top-1/2 left-0 z-[90] -translate-y-1/2 flex flex-col items-center justify-center shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] rounded-r-2xl border border-l-0 border-white/40 transition-all duration-300 group backdrop-blur-sm overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${data.popupColor || '#FFC520'}, ${data.popupColor ? data.popupColor + 'CC' : '#FFA000'})`
          }}
        >
          {/* Subtle shine effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />

          {/* Dismiss Tab Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsTabHidden(true);
            }}
            className="w-full py-2 flex justify-center hover:bg-black/10 transition-colors"
            title="Hide this tab"
          >
            <svg className="w-3 h-3 md:w-4 md:h-4 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Re-open Modal Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center justify-center gap-2 md:gap-4 px-2 md:px-3 py-3 md:py-6 text-gray-900 font-black hover:pr-4 md:hover:pr-5 transition-all"
          >
            <div className="bg-white/20 p-1.5 md:p-2 rounded-full shadow-inner group-hover:scale-110 transition-transform duration-300">
              <span className="text-lg md:text-2xl drop-shadow-md">🎁</span>
            </div>
            
            <span className="[writing-mode:vertical-lr] rotate-180 tracking-[0.2em] md:tracking-[0.3em] uppercase text-xs md:text-sm drop-shadow-sm">
              Offers
            </span>
          </button>
        </div>
      )}
    </>
  );
}
