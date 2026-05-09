"use client";

import { Card } from "@/components/ui/Card";
import { fmtHours } from "@/lib/analytics-utils";
import type { BestStudyHours } from "@/types";

interface Props {
  bestHours: BestStudyHours;
}

// Tick marks shown below the bar chart (every 6 hours)
const TICKS = [
  { hour: 0,  label: "12am" },
  { hour: 6,  label: "6am"  },
  { hour: 12, label: "12pm" },
  { hour: 18, label: "6pm"  },
  { hour: 23, label: "11pm" },
];

// Map an hour to a time-of-day label for the legend pill
function periodLabel(hour: number): string {
  if (hour >= 5  && hour <= 8)  return "Early morning";
  if (hour >= 9  && hour <= 11) return "Morning";
  if (hour >= 12 && hour <= 14) return "Midday";
  if (hour >= 15 && hour <= 17) return "Afternoon";
  if (hour >= 18 && hour <= 20) return "Evening";
  if (hour >= 21 && hour <= 23) return "Night";
  return "Late night";
}

export function HourlyHeatmap({ bestHours }: Props) {
  const { hours, peakHour, peakLabel } = bestHours;
  const hasData = hours.some((h) => h.minutes > 0);

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Peak Study Hours
        </p>
        {hasData && peakHour !== null && (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-400" />
            <span className="text-xs text-white/50">
              Peak: <span className="font-semibold text-brand-400">{peakLabel}</span>
              <span className="mx-1 text-white/20">·</span>
              {periodLabel(peakHour)}
            </span>
          </div>
        )}
      </div>

      {/* ── Bar chart ── */}
      <div className="relative">
        <div className="flex items-end gap-[2px]" style={{ height: 56 }}>
          {hours.map((h) => {
            const isPeak = h.hour === peakHour;
            const heightPct = Math.max(hasData ? 4 : 8, h.intensity * 100);
            return (
              <div
                key={h.hour}
                title={`${h.label}: ${h.minutes > 0 ? fmtHours(h.minutes) : "No sessions"}`}
                className="flex-1 rounded-t-sm transition-all duration-500"
                style={{
                  height:           `${heightPct}%`,
                  backgroundColor:  isPeak
                    ? "#6366f1"
                    : `rgba(99, 102, 241, ${hasData ? 0.12 + h.intensity * 0.55 : 0.07})`,
                  boxShadow:        isPeak ? "0 0 8px rgba(99,102,241,0.4)" : undefined,
                }}
              />
            );
          })}
        </div>

        {/* ── Hour labels ── */}
        <div className="relative mt-1.5" style={{ height: 16 }}>
          {TICKS.map(({ hour, label }) => (
            <span
              key={hour}
              className="absolute -translate-x-1/2 text-[10px] text-white/25"
              style={{ left: `${(hour / 23) * 100}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {!hasData && (
        <p className="mt-3 text-center text-xs text-white/30">
          Log sessions to see when you study best
        </p>
      )}
    </Card>
  );
}
