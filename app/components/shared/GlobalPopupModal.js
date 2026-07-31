'use client';

import { useState, useEffect } from 'react';

export function GlobalPopupModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/site-settings/announcement');
        if (!res.ok) return;
        const json = await res.json();
        
        if (json.popupEnabled) {
          setData(json);
          // Check if dismissed recently (within last 24 hours) - DISABLED FOR TESTING
          // const lastDismissed = localStorage.getItem('iprintrush_popup_dismissed');
          // const now = new Date().getTime();
          
          // if (!lastDismissed || now - parseInt(lastDismissed) > 24 * 60 * 60 * 1000) {
            // Add a small delay so it doesn't pop up instantly on page load
            setTimeout(() => {
              setIsOpen(true);
            }, 1000);
          // }
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

  if (!isOpen || !data) return null;

  return (
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
          className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/40 hover:bg-white/80 hover:rotate-90 text-gray-900 shadow-lg backdrop-blur-md transition-all duration-300 ease-in-out"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Left side: Image */}
        {data.popupImageUrl && (
          <div className="w-full md:w-1/2 min-h-[250px] md:min-h-[400px] bg-white/10 flex items-center justify-center overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-0 pointer-events-none" />
            <img 
              src={data.popupImageUrl} 
              alt="Promo" 
              className="w-full h-full object-cover md:object-contain object-center drop-shadow-2xl z-10 p-6 sm:p-8 transform group-hover:scale-105 transition-transform duration-700 ease-out"
            />
          </div>
        )}

        {/* Right side: Content */}
        <div className={`w-full ${data.popupImageUrl ? 'md:w-1/2' : ''} p-8 md:p-14 flex flex-col items-center justify-center text-center relative z-10`}>
          {data.popupTitle && (
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-6 tracking-tighter leading-none drop-shadow-sm uppercase">
              {data.popupTitle}
            </h2>
          )}
          
          {data.popupMessage && (
            <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 whitespace-pre-line drop-shadow-sm leading-snug">
              {data.popupMessage}
            </p>
          )}
          
          {/* Small decorative line */}
          <div className="mt-8 w-16 h-1.5 bg-gray-900 rounded-full opacity-20"></div>
        </div>
      </div>
    </div>
  );
}
