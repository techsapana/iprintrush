// Same-day printing logic utility
// Orders must be placed before 2:00 PM (14:00) for same-day completion

/**
 * Calculate if an order is eligible for same-day printing
 * Same-day cutoff is 2:00 PM (14:00)
 * @returns {Object} { isEligible: boolean, deadline: Date, nextAvailableDate: Date, timeUntilDeadline: number }
 */
export function calculateSameDayEligibility() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();
  
  // Create today's deadline at 2:00 PM
  const sameDayDeadline = new Date(year, month, date, 14, 0, 0, 0);
  
  // Check if we're before the deadline
  const isEligible = now < sameDayDeadline;
  
  // Calculate next available date
  let nextAvailableDate;
  if (isEligible) {
    // Same day available
    nextAvailableDate = new Date(year, month, date);
  } else {
    // Next business day (assuming next day, could be extended for weekends)
    nextAvailableDate = new Date(year, month, date + 1);
  }
  
  // Time until deadline in milliseconds
  const timeUntilDeadline = sameDayDeadline - now;
  
  return {
    isEligible,
    deadline: sameDayDeadline,
    nextAvailableDate,
    timeUntilDeadline,
    deadlineString: '2:00 PM',
    currentTime: now
  };
}

/**
 * Format a date to readable string
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format time as HH:MM AM/PM
 * @param {Date} date
 * @returns {string}
 */
export function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get hours and minutes until deadline
 * @param {number} ms - milliseconds
 * @returns {Object} { hours: number, minutes: number, display: string }
 */
export function getTimeRemaining(ms) {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return {
      hours,
      minutes,
      display: `${hours}h ${minutes}m`
    };
  }
  
  return {
    hours: 0,
    minutes,
    display: `${minutes}m`
  };
}

/**
 * Check if a given time (as string HH:MM) is before 2 PM
 * @param {string} timeString - Format: "HH:MM" or "H:MM"
 * @returns {boolean}
 */
export function isBeforeSameDayDeadline(timeString) {
  const [hours] = timeString.split(':').map(Number);
  return hours < 14;
}
