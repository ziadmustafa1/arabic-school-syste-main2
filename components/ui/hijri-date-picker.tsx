import * as React from "react";
import { useState, useEffect } from "react";
import moment from "moment-hijri";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatHijriDate } from "@/lib/utils/hijri-date";

export interface HijriDatePickerProps {
  onChange?: (date: Date | null) => void;
  value?: Date | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function HijriDatePicker({
  onChange,
  value,
  placeholder = "اختر تاريخ",
  className,
  disabled = false,
}: HijriDatePickerProps) {
  const [date, setDate] = useState<Date | null>(value || null);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<number>(moment().iYear());
  const [month, setMonth] = useState<number>(moment().iMonth());

  // Update internal state when value prop changes
  useEffect(() => {
    setDate(value || null);
  }, [value]);

  // Get days in the current Hijri month
  const daysInMonth = React.useMemo(() => {
    return moment().iYear(year).iMonth(month).iDaysInMonth();
  }, [year, month]);

  // Get the day of week for the first day of the month (0-6, Sunday-Saturday)
  const firstDayOfMonth = React.useMemo(() => {
    return moment().iYear(year).iMonth(month).iDate(1).day();
  }, [year, month]);

  // Get the names of Hijri months in Arabic
  const hijriMonths = [
    "محرم",
    "صفر",
    "ربيع الأول",
    "ربيع الثاني",
    "جمادى الأولى",
    "جمادى الآخرة",
    "رجب",
    "شعبان",
    "رمضان",
    "شوال",
    "ذو القعدة",
    "ذو الحجة",
  ];

  // Days of week in Arabic
  const weekDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  // Handle date selection
  const handleSelectDate = (day: number) => {
    const newDate = moment().iYear(year).iMonth(month).iDate(day).toDate();
    setDate(newDate);
    onChange?.(newDate);
    setOpen(false);
  };

  // Navigate to previous month
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  // Navigate to next month
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  // Check if a day is the currently selected date
  const isSelected = (day: number) => {
    if (!date) return false;
    const momentDate = moment(date);
    return (
      momentDate.iDate() === day &&
      momentDate.iMonth() === month &&
      momentDate.iYear() === year
    );
  };

  // Check if a day is today
  const isToday = (day: number) => {
    const today = moment();
    return (
      today.iDate() === day &&
      today.iMonth() === month &&
      today.iYear() === year
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button 
          variant="outline" 
          className={cn(
            "w-full justify-start text-right font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <Calendar className="ml-2 h-4 w-4" />
          {date ? formatHijriDate(date) || placeholder : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <div className="p-2">
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="outline"
              size="icon"
              onClick={prevMonth}
              className="h-7 w-7"
            >
              <span className="sr-only">الشهر السابق</span>
              ←
            </Button>
            <div className="text-center font-medium">
              {hijriMonths[month]} {year}هـ
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-7 w-7"
            >
              <span className="sr-only">الشهر التالي</span>
              →
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mt-2">
            {weekDays.map((day) => (
              <div key={day} className="font-medium py-1">
                {day.slice(0, 1)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 mt-1">
            {/* Empty cells for days before the first day of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} className="h-8" />
            ))}
            
            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              return (
                <Button
                  key={`day-${day}`}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    isSelected(day) && "bg-primary text-primary-foreground",
                    isToday(day) && !isSelected(day) && "border border-primary"
                  )}
                  onClick={() => handleSelectDate(day)}
                >
                  {day}
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 