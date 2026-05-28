'use client';

import { useState, useEffect } from 'react';
import { calculateSameDayEligibility, getTimeRemaining } from '../utils/sameDayLogic.js';

/**
 * Hook to track same-day printing eligibility
 * Updates every minute to reflect real-time cutoff status
 * @returns {Object} Eligibility info with real-time updates
 */
export function useSameDayEligibility() {
  const [eligibility, setEligibility] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    // Calculate immediately on mount
    const update = () => {
      const calc = calculateSameDayEligibility();
      setEligibility(calc);
      setTimeRemaining(getTimeRemaining(calc.timeUntilDeadline));
    };

    update();

    // Update every 60 seconds to track deadline approach
    const interval = setInterval(update, 60000);

    return () => clearInterval(interval);
  }, []);

  // During SSR, return null - component should handle this
  if (!eligibility) {
    return {
      isEligible: true,
      deadline: new Date(),
      nextAvailableDate: new Date(),
      timeUntilDeadline: 0,
      timeRemaining: null,
      loading: true
    };
  }

  return {
    ...eligibility,
    timeRemaining,
    loading: false
  };
}
