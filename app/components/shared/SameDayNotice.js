'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSameDayEligibility } from '../../hooks/useSameDayEligibility';
import { formatDate, formatTime, getTimeRemaining } from '../../utils/sameDayLogic';

export function SameDayNotice({ variant = 'default' }) {
  const eligibility = useSameDayEligibility();
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (eligibility.loading) return;

    setTimeLeft(getTimeRemaining(eligibility.timeUntilDeadline));

    // Update every minute
    const interval = setInterval(() => {
      setTimeLeft(getTimeRemaining(eligibility.timeUntilDeadline));
    }, 60000);

    return () => clearInterval(interval);
  }, [eligibility.loading, eligibility.timeUntilDeadline]);

  if (eligibility.loading || !timeLeft) {
    return null;
  }

  if (eligibility.isEligible) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <AlertTitle className="text-green-800">
          ✓ Same-Day Printing Available
        </AlertTitle>
        <AlertDescription className="text-green-700">
          Order before 2:00 PM for same-day completion. You have {timeLeft.display} left!
        </AlertDescription>
      </Alert>
    );
  }

  const nextDay = formatDate(eligibility.nextAvailableDate);
  return (
    <Alert className="bg-amber-50 border-amber-200">
      <AlertTitle className="text-amber-800">
        ⚠ Same-Day Deadline Passed
      </AlertTitle>
      <AlertDescription className="text-amber-700">
        Orders after 2:00 PM are available for {nextDay}. Order now for next business day completion.
      </AlertDescription>
    </Alert>
  );
}
