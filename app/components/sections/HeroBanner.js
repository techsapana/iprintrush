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
            className="text-base sm:text-lg md:text-xl text-gray-700 mb-6 sm:mb-8 max-w-3xl mx-auto font-medium leading-relaxed animate-fadeInUp"
            style={{ animationDelay: '0.2s' }}
          >
            Same-day printing solutions for your business. Fast turnaround, professional quality, competitive prices.
          </p>

          {/* View Portfolio Button */}
          <div className="mb-10 sm:mb-12 animate-fadeInUp" style={{ animationDelay: '0.22s' }}>
            <Link href="/portfolio">
              <button className="group relative px-6 py-3 sm:px-10 sm:py-4 bg-[#29b6f6] text-white font-bold text-base sm:text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                <span className="relative z-10 flex items-center gap-2 justify-center">
                  View Our Portfolio
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#29b6f6] to-[#1c88c0] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </Link>
          </div>

          {/* Same-day products slider */}
          <div className="mt-2 sm:mt-4 animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
            <SameDayProductSlider />
          </div>


        </div>
      </div>
    </section>
  );
}