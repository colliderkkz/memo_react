"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  className?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DatePicker({ value, onChange, className }: DatePickerProps) {
  // 与原版一致：today 只在挂载时取一次
  const [today] = useState(() => new Date());
  const [view, setView] = useState(() => ({
    year: (value ?? today).getFullYear(),
    month: (value ?? today).getMonth(),
  }));

  useEffect(() => {
    if (value) {
      setView({ year: value.getFullYear(), month: value.getMonth() });
    }
  }, [value]);

  function prevMonth() {
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 }));
  }

  function nextMonth() {
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 }));
  }

  const cells = useMemo(() => {
    const firstWeekday = new Date(view.year, view.month, 1).getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const arr: (number | null)[] = [
      ...Array<null>(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [view]);

  function isToday(day: number) {
    return (
      day === today.getDate() && view.month === today.getMonth() && view.year === today.getFullYear()
    );
  }

  function isSelected(day: number) {
    return (
      value != null &&
      day === value.getDate() &&
      view.month === value.getMonth() &&
      view.year === value.getFullYear()
    );
  }

  const navBtn = cn(
    "flex items-center justify-center w-7 h-7 rounded-md",
    "text-muted-foreground hover:text-foreground hover:bg-muted",
    "transition-colors duration-100 cursor-pointer",
  );

  return (
    <div className={cn("select-none font-sans", className)}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className={navBtn} aria-label="Previous month">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-medium text-foreground">
          {MONTHS[view.month]}
          {view.year}
        </span>
        <button type="button" onClick={nextMonth} className={navBtn} aria-label="Next month">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => (
          <span
            key={d}
            className="flex items-center justify-center text-[0.625rem] font-medium text-muted-foreground h-7"
          >
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) =>
          day === null ? (
            <span key={i} className="h-8" />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => onChange?.(new Date(view.year, view.month, day))}
              className={cn(
                "flex items-center justify-center w-8 h-8 mx-auto rounded-full text-xs",
                "transition-colors duration-100 cursor-pointer",
                isSelected(day) && "bg-accent text-accent-foreground font-semibold",
                !isSelected(day) && isToday(day) && "text-accent font-semibold ring-1 ring-accent/40",
                !isSelected(day) && !isToday(day) && "text-foreground hover:bg-muted",
              )}
            >
              {day}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
