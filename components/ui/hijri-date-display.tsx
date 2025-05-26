import React from 'react';
import { formatHijriDate, toHijriWithDayName } from '@/lib/utils/hijri-date';

interface HijriDateDisplayProps {
  date: Date | string | null | undefined;
  showDayName?: boolean;
  format?: 'long' | 'short';
  className?: string;
}

/**
 * Component to display dates in Hijri format
 */
export function HijriDateDisplay({
  date,
  showDayName = false,
  format = 'long',
  className = '',
}: HijriDateDisplayProps) {
  // Handle invalid date
  if (!date) {
    return <span className={className}>-</span>;
  }
  
  try {
    // Convert and display in the requested format
    if (showDayName) {
      return (
        <span className={className} dir="rtl">
          {toHijriWithDayName(date)}
        </span>
      );
    }
    
    if (format === 'short') {
      return (
        <span className={className} dir="rtl" title={formatHijriDate(date)}>
          {formatHijriDate(date)}
        </span>
      );
    }
    
    return (
      <span className={className} dir="rtl">
        {formatHijriDate(date)}
      </span>
    );
  } catch (error) {
    console.error('Error formatting Hijri date:', error);
    return <span className={className}>تاريخ غير صالح</span>;
  }
} 