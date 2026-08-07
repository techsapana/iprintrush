'use client';

import { useState, useEffect } from 'react';
import { calculateSameDayEligibility, getTimeRemaining } from '../utils/sameDayLogic.js';

export function useSameDayEligibility() {
  const [eligibility, setEligibility] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // Fetch settings on mount
    let active = true;
    let currentSettings = {
      samedayEnabled: true,
      samedayDeadlineTime: '14:00',
      samedayCustomMessage: ''
    };

    fetch('/api/site-settings/announcement')
      .then(res => res.json())
      .then(data => {
        if (active && data) {
          currentSettings = {
            samedayEnabled: data.samedayEnabled !== false,
            samedayDeadlineTime: data.samedayDeadlineTime || '14:00',
            samedayCustomMessage: data.samedayCustomMessage || ''
          };
          setSettings(currentSettings);
        }
      })
      .catch(console.error);

    const update = () => {
      const calc = calculateSameDayEligibility(currentSettings.samedayDeadlineTime);
      setEligibility(calc);
      setTimeRemaining(getTimeRemaining(calc.timeUntilDeadline));
    };

    update();
    const interval = setInterval(update, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (!eligibility || !settings) {
    return {
      isEligible: true,
      deadline: new Date(),
      nextAvailableDate: new Date(),
      timeUntilDeadline: 0,
      timeRemaining: null,
      loading: true,
      samedayEnabled: true,
      samedayCustomMessage: ''
    };
  }

  return {
    ...eligibility,
    timeRemaining,
    loading: false,
    samedayEnabled: settings.samedayEnabled,
    samedayCustomMessage: settings.samedayCustomMessage
  };
}
