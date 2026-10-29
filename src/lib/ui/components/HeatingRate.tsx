"use client";

import { useMemo, type HTMLAttributes } from "react";
import { cn } from "../lib/utils";

export interface HeatingRateDay {
  key: string;
  label?: string;
  active?: boolean;
  value?: number;
  disabled?: boolean;
}

export interface HeatingRateStat {
  label: string;
  value: string | number;
  clickable?: boolean;
}

export interface HeatingRateProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  days?: HeatingRateDay[];
  stats?: HeatingRateStat[];
  max?: number;
  showRate?: boolean;
  showWeekdayLabels?: boolean;
  selectedKey?: string;
  onDayClick?: (day: HeatingRateDay) => void;
  onStatClick?: (stat: HeatingRateStat) => void;
}

const weekdayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

function dayValue(day: HeatingRateDay): number {
  return Math.max(0, day.value ?? (day.active ? 1 : 0));
}

export function HeatingRate({
  title = "heating rate",
  days = [],
  stats = [],
  max,
  showRate = true,
  showWeekdayLabels = true,
  selectedKey,
  onDayClick,
  onStatClick,
  className,
  ...rest
}: HeatingRateProps) {
  const activeDays = useMemo(() => days.filter((day) => dayValue(day) > 0).length, [days]);
  const rate = days.length ? Math.round((activeDays / days.length) * 100) : 0;
  const maxValue = max ?? Math.max(1, ...days.map(dayValue));

  function level(day: HeatingRateDay): number {
    const value = dayValue(day);
    if (value <= 0) return 0;
    const ratio = value / maxValue;
    if (ratio >= 0.75) return 4;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.25) return 2;
    return 1;
  }

  function accessibleLabel(day: HeatingRateDay, index: number): string {
    const label = day.label ?? `Day ${index + 1}`;
    const value = dayValue(day);
    return `${label}: ${value}`;
  }

  function isClickable(day: HeatingRateDay): boolean {
    return onDayClick !== undefined && !day.disabled;
  }

  return (
    <div className={cn("heating-rate", className)} {...rest}>
      <div className="heating-rate-head">
        <p className="heating-rate-title">{title}</p>
        {showRate ? <span className="heating-rate-badge">{rate}%</span> : null}
      </div>

      <div className={cn("heating-rate-calendar", showWeekdayLabels && "with-labels")}>
        {showWeekdayLabels ? (
          <div className="heating-rate-weekdays" aria-hidden="true">
            {weekdayLabels.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
        ) : null}

        <div className="heating-rate-grid" aria-label={title}>
          {days.map((day, index) =>
            isClickable(day) ? (
              <button
                key={day.key}
                type="button"
                title={accessibleLabel(day, index)}
                aria-label={accessibleLabel(day, index)}
                aria-pressed={selectedKey === day.key}
                onClick={() => onDayClick?.(day)}
                className={cn(
                  "heating-rate-cell clickable",
                  `level-${level(day)}`,
                  selectedKey === day.key && "selected",
                )}
              />
            ) : (
              <span
                key={day.key}
                className={cn(
                  "heating-rate-cell",
                  `level-${level(day)}`,
                  selectedKey === day.key && "selected",
                )}
                aria-label={accessibleLabel(day, index)}
              />
            ),
          )}
        </div>
      </div>

      {stats.length > 0 ? (
        <div className="heating-rate-stats">
          {stats.map((stat) =>
            stat.clickable && onStatClick ? (
              <button
                key={stat.label}
                type="button"
                className="heating-rate-stat stat-clickable"
                title="点击查看"
                onClick={() => onStatClick?.(stat)}
              >
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </button>
            ) : (
              <div key={stat.label} className="heating-rate-stat">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
