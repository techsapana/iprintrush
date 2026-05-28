'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SameDayNotice } from '../shared/SameDayNotice';
import { HeroBackgroundSlider } from './HeroBackgroundSlider';
import { SameDayProductSlider } from './SameDayProductSlider';
import { useSameDayEligibility } from '../../hooks/useSameDayEligibility';
import { formatDate } from '../../utils/sameDayLogic';

export function HeroBanner() {
  const eligibility = useSameDayEligibility();
  const [nextDay, setNextDay] = useState('');

  useEffect(() => {
    if (!eligibility.loading && eligibility.nextAvailableDate) {
      setNextDay(formatDate(eligibility.nextAvailableDate));
    }
  }, [eligibility.loading, eligibility.nextAvailableDate]);

  return (
    <section className="relative">
      {/* ── HERO SLIDER AREA ── */}
      <div className="relative w-full">
        {/* Slider container - matches image size */}
        <div className="w-full h-[320px] sm:h-[420px] md:h-[520px] lg:h-[600px] overflow-hidden relative">
          <HeroBackgroundSlider />
        </div>

        {/* Subtle overlay so content reads clearly over image */}
        <div className="absolute inset-0 bg-black/35 pointer-events-none" />

        {/* Buttons at bottom of hero banner */}
        <div className="absolute bottom-0 left-0 right-0 pb-8 sm:pb-12">
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-2 sm:gap-4 justify-center animate-fadeInUp">
                <Link href="/products">
                  <button className="group relative px-5 py-2.5 sm:px-8 sm:py-4 bg-[#29b6f6] text-white font-bold text-sm sm:text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
                    <span className="relative z-10">Shop Now</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#29b6f6] to-[#1c88c0] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>
                </Link>
                <Link href="/about">
                  <button className="px-5 py-2.5 sm:px-8 sm:py-4 bg-white text-[#29b6f6] font-bold text-sm sm:text-lg rounded-full border-2 border-white/40 hover:bg-white/90 hover:border-white/60 transition-all duration-300 hover:scale-105 shadow-md">
                    Learn More
                  </button>
                </Link>
                <Link href="/portfolio">
                  <button className="px-5 py-2.5 sm:px-8 sm:py-4 bg-transparent text-white font-bold text-sm sm:text-lg rounded-full border-2 border-white/70 hover:bg-white/10 transition-all duration-300 hover:scale-105 shadow-md">
                    View Portfolio
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── WHITE CONTENT AREA ── */}
      <div className="bg-white pb-16 md:pb-20">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Feature badges */}
          <div
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 animate-fadeInUp"
          >
            {['Same Day Delivery', 'Professional Quality', 'Best Prices'].map((label) => (
              <div
                key={label}
                className="flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 sm:px-5 sm:py-3 rounded-full border border-white/20 shadow-lg"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#29b6f6] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-800 font-medium text-xs sm:text-base whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight animate-fadeInUp">
            Need It Today?
          </h1>
          
          {/* Same-Day deadline notice */}
          {!eligibility.loading && !eligibility.isEligible && nextDay && (
            <div className="animate-fadeInUp px-2 mb-6 sm:mb-8" style={{ animationDelay: '0.1s' }}>
              <div className="inline-block backdrop-blur-sm text-gray-800 px-4 py-3 sm:px-6 sm:py-4 rounded-lg border border-amber-400/50 shadow-lg max-w-xs sm:max-w-2xl bg-amber-500/10">
                <div className="flex items-center gap-2 justify-center mb-1 sm:mb-2">
                  <span className="font-bold text-sm sm:text-lg">⚠ Same-Day Deadline Passed</span>
                </div>
                <div className="text-xs sm:text-base opacity-95">
                  Orders after 2:00 PM are available for {nextDay}. Order now for next business day completion.
                </div>
              </div>
            </div>
          )}



          <p
            className="text-base sm:text-lg md:text-xl text-gray-700 mb-8 sm:mb-10 max-w-3xl mx-auto font-medium leading-relaxed animate-fadeInUp"
            style={{ animationDelay: '0.2s' }}
          >
            Same-day printing solutions for your business. Fast turnaround, professional quality, competitive prices.
          </p>

          {/* Same-day products slider */}
          <div className="mt-2 sm:mt-4 animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
            <SameDayProductSlider />
          </div>


        </div>
      </div>
    </section>
  );
}