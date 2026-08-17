'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function StoreHours({ 
  openingTime = '10:00 AM', 
  closingTime = '5:00 PM', 
  weekendOpeningTime = '10:00 AM', 
  weekendClosingTime = '2:00 PM',
  theme = 'dark' // 'dark' for footer, 'light' for contact page if needed, but screenshot is dark
}) {
  const [schedule, setSchedule] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

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
        rawOpen: open,
        rawClose: close,
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

  const boxBg = theme === 'dark' ? 'bg-transparent border-[#29b6f6]/40' : 'bg-transparent border-[#29b6f6]/40 shadow-sm';
  const dividerColor = theme === 'dark' ? 'border-[#29b6f6]/40' : 'border-[#29b6f6]/40';

  return (
    <div className={`w-full mx-auto mt-2 mb-2 rounded-lg border ${boxBg} overflow-hidden transition-all duration-300`}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full relative px-4 py-3 flex items-center justify-between ${isExpanded ? `border-b ${dividerColor}` : ''} bg-transparent hover:bg-white/5 transition-colors cursor-pointer focus:outline-none`}
      >
        <div className="flex items-center text-left pl-2">
          <h3 className={`text-lg font-semibold tracking-wide ${highlightColor} m-0`}>
            Store Hours
          </h3>
        </div>
        <div className="absolute right-4">
          {isExpanded ? (
            <ChevronUp className={`w-5 h-5 ${highlightColor}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${highlightColor}`} />
          )}
        </div>
      </button>
      
      <div className="p-3 sm:p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="pb-2"></th>
              <th className={`pb-2 text-[12px] lowercase font-medium tracking-wide text-center ${textColor}`}>open</th>
              <th className={`pb-2 text-[12px] lowercase font-medium tracking-wide text-center ${textColor}`}>close</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {(isExpanded ? schedule : schedule.slice(0, 1)).map((day, idx, arr) => (
              <tr key={day.id} className={idx !== arr.length - 1 ? `border-b ${dividerColor}` : ''}>
                {/* Day & Date */}
                <td className="py-1.5 pr-2 text-left whitespace-nowrap align-middle">
                  <span className={`font-medium capitalize text-[11px] ${highlightColor} mr-1`}>{day.dayName.toLowerCase()}</span>
                  <span className={`font-medium capitalize text-[11px] ${textColor}`}>{day.dateStr.toLowerCase()}</span>
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
                    <span className={`text-[11px] lowercase ${highlightColor}`}>
                      today
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
