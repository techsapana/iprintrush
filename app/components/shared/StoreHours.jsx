'use client';

import React, { useState, useEffect } from 'react';

export function StoreHours({ 
  openingTime = '10:00 AM', 
  closingTime = '5:00 PM', 
  weekendOpeningTime = '10:00 AM', 
  weekendClosingTime = '2:00 PM',
  theme = 'dark' // 'dark' for footer, 'light' for contact page if needed, but screenshot is dark
}) {
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {
    // Generate the next 7 days starting from today
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = date.getDate();
      
      // Determine hours based on day
      let isClosed = false;
      let open = '';
      let close = '';
      
      if (dayName === 'SUN') {
        isClosed = true;
      } else if (dayName === 'SAT') {
        if (!weekendOpeningTime || weekendOpeningTime.toLowerCase() === 'closed') {
          isClosed = true;
        } else {
          open = weekendOpeningTime;
          close = weekendClosingTime;
        }
      } else {
        open = openingTime;
        close = closingTime;
      }

      // Format time (split AM/PM to make it smaller like screenshot)
      const formatTime = (timeStr) => {
        if (!timeStr) return null;
        const parts = timeStr.trim().split(' ');
        if (parts.length === 2) {
          return (
            <span>
              {parts[0]} <span className="text-[10px] uppercase ml-0.5">{parts[1]}</span>
            </span>
          );
        }
        return <span>{timeStr}</span>;
      };

      days.push({
        id: i,
        dayName,
        dateStr: `${month} ${dayNum}`,
        isClosed,
        openFormatted: formatTime(open),
        closeFormatted: formatTime(close),
        isToday: i === 0
      });
    }
    
    setSchedule(days);
  }, [openingTime, closingTime, weekendOpeningTime, weekendClosingTime]);

  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const mutedColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const highlightColor = theme === 'dark' ? 'text-[#29b6f6]' : 'text-[#29b6f6]';

  const boxBg = theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm';
  const dividerColor = theme === 'dark' ? 'border-white/10' : 'border-gray-100';

  return (
    <div className={`w-full mx-auto mt-2 mb-2 rounded-lg border ${boxBg} overflow-hidden`}>
      <div className={`px-4 py-2.5 border-b ${dividerColor} bg-[#29b6f6]/10`}>
        <h3 className={`text-lg font-semibold text-center tracking-wide ${highlightColor} m-0`}>
          Store Hours
        </h3>
      </div>
      
      <div className="p-3 sm:p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="pb-2"></th>
              <th className={`pb-2 text-[11px] font-bold uppercase tracking-wider text-center ${textColor}`}>Open</th>
              <th className={`pb-2 text-[11px] font-bold uppercase tracking-wider text-center ${textColor}`}>Close</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((day, idx) => (
              <tr key={day.id} className={idx !== schedule.length - 1 ? `border-b ${dividerColor}` : ''}>
                {/* Day & Date */}
                <td className="py-1.5 pr-1 text-right whitespace-nowrap align-middle">
                  <span className={`font-bold uppercase text-[11px] ${highlightColor} mr-1`}>{day.dayName}</span>
                  <span className={`font-medium text-[11px] ${textColor}`}>{day.dateStr}</span>
                </td>
                
                {/* Times */}
                {day.isClosed ? (
                  <td colSpan={2} className={`py-1.5 text-center text-[11px] ${mutedColor} align-middle`}>
                    Closed
                  </td>
                ) : (
                  <>
                    <td className={`py-1.5 px-0.5 text-center text-[11px] ${mutedColor} whitespace-nowrap align-middle`}>
                      {day.openFormatted}
                    </td>
                    <td className={`py-1.5 px-0.5 text-center text-[11px] ${mutedColor} whitespace-nowrap align-middle`}>
                      {day.closeFormatted}
                    </td>
                  </>
                )}
                
                {/* Badge */}
                <td className="py-1.5 pl-1 align-middle text-left w-[1%] whitespace-nowrap">
                  {day.isToday && (
                    <span className="bg-[#29b6f6] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase inline-block">
                      Today
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
