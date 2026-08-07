'use client';

import { useEffect, useState } from 'react';
import { useSameDayEligibility } from '../../hooks/useSameDayEligibility';
import { formatDate } from '../../utils/sameDayLogic';

export function SameDayNotice({ variant = 'default' }) {
  const eligibility = useSameDayEligibility();
  
  // This state is just to trigger re-renders since eligibility.timeRemaining updates every second in the hook.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || eligibility.loading || !eligibility.timeRemaining || !eligibility.samedayEnabled) {
    return null;
  }

  if (eligibility.isEligible) {
    return (
      <div className="bg-gradient-to-r from-[#29b6f6] to-[#0288d1] p-[3px] rounded-xl shadow-lg my-6 animate-pulse-slow">
        <div className="bg-white rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 mb-1 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              SAME-DAY COMPLETION AVAILABLE!
            </h3>
            <p className="text-gray-700 font-medium text-sm md:text-base">
              Order before <strong className="text-[#0288d1] text-lg">{eligibility.deadlineString}</strong> to get it printed today.
            </p>
          </div>
          
          <div className="flex flex-col items-center bg-gray-900 rounded-lg px-6 py-3 border-2 border-gray-800 shadow-inner">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Time Remaining</span>
            <div className="text-2xl md:text-4xl font-mono font-bold text-[#29b6f6] flex items-center gap-1.5 tracking-wider drop-shadow-md">
              <span>{eligibility.timeRemaining.hours.toString().padStart(2, '0')}</span>
              <span className="animate-pulse">:</span>
              <span>{eligibility.timeRemaining.minutes.toString().padStart(2, '0')}</span>
              <span className="animate-pulse">:</span>
              <span className="text-[#81d4fa]">{eligibility.timeRemaining.seconds.toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const nextDay = formatDate(eligibility.nextAvailableDate);
  let messageContent = (
    <>
      Orders placed after {eligibility.deadlineString} are available for <strong className="text-orange-600">{nextDay}</strong>. Order now for next business day completion.
    </>
  );

  if (eligibility.samedayCustomMessage) {
    const rawMsg = eligibility.samedayCustomMessage;
    const parts = rawMsg.split(/(\[TIME\]|\[NEXT_DAY\])/g);
    messageContent = (
      <>
        {parts.map((part, i) => {
          if (part === '[TIME]') return <strong key={i} className="text-gray-900">{eligibility.deadlineString}</strong>;
          if (part === '[NEXT_DAY]') return <strong key={i} className="text-orange-600">{nextDay}</strong>;
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-[3px] rounded-xl shadow-lg my-6">
      <div className="bg-white rounded-lg p-5 flex items-start gap-4">
        <div className="p-3 bg-amber-100 rounded-full text-amber-600 shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Same-Day Deadline Passed</h3>
          <p className="text-gray-700 font-medium text-sm md:text-base">
            {messageContent}
          </p>
        </div>
      </div>
    </div>
  );
}
