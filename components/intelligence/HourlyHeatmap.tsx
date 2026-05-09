"use client";

import { Card } from "@/components/ui/Card";
import { fmtHours } from "@/lib/analytics-utils";
import { MIN_TIMED_SESSIONS } from "@/lib/intelligence";
import type { BestStudyHours, IntelligencePhase } from "@/types";

interface Props {
  bestHours: BestStudyHours;
  phase:     IntelligencePhase;
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

export function HourlyHeatmap({ bestHours, phase }: Props) {
  const { hours, peakHour, peakLabel, timingDataCount, hasEnoughTimingData } = bestHours;
  const hasData = hours.some((h) => h.minutes > 0);

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
          Peak Study Hours
        </p>
        {hasData && hasEnoughTimingData && peakHour !== null && (
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

      {/* ── Case 1: No timing data at all ── */}
      {!hasEnoughTimingData && timingDataCount === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm font-medium text-white/30">
            Still learning your focus windows
          </p>
          <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-white/20">
            Use the live timer when you study — it captures your real session times so
            we can reveal when you focus best.
          </p>
          {/* Ghost bar chart to show what it'll look like */}
          <div className="mt-4 flex w-full items-end gap-[2px]" style={{ height: 40 }}>
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{
                  height: `${Math.max(8, Math.sin((i / 23) * Math.PI) * 70 + 10)}%`,
                  backgroundColor: "rgba(99,102,241,0.05)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Case 2: Some timed sessions but below threshold ── */}
      {!hasEnoughTimingData && timingDataCount > 0 && (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <p className="text-sm font-medium text-white/30">
            Not enough timing data yet
          </p>
          <p className="mt-1.5 text-xs text-white/20">
            {MIN_TIMED_SESSIONS - timingDataCount} more timed session{MIN_TIMED_SESSIONS - timingDataCount !== 1 ? "s" : ""} to unlock peak-hour analysis
          </p>
          {/* Progress dots */}
          <div className="mt-3 flex items-center gap-1.5">
            {Array.from({ length: MIN_TIMED_SESSIONS }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i < timingDataCount ? "bg-brand-500/60" : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-white/20">
            {timingDataCount} / {MIN_TIMED_SESSIONS} timed sessions
          </p>
        </div>
      )}

      {/* ── Case 3: Enough timing data — show the real heatmap ── */}
      {hasEnoughTimingData && (
        <>
          <div className="relative">
            <div className="flex items-end gap-[2px]" style={{ height: 56 }}>
              {hours.map((h) => {
                const isPeak = h.hour === peakHour;
                const heightPct = Math.max(4, h.intensity * 100);
                return (
                  <div
                    key={h.hour}
                    title={`${h.label}: ${h.minutes > 0 ? fmtHours(h.minutes) : "No sessions"}`}
                    className="flex-1 rounded-t-sm transition-all duration-500"
                    style={{
                      height:           `${heightPct}%`,
                      backgroundColor:  isPeak
                        ? "#6366f1"
                        : `rgba(99, 102, 241, ${0.12 + h.intensity * 0.55})`,
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

          {/* Phase 1 accuracy caveat */}
          {phase === 1 && (
            <p className="mt-3 border-t border-white/[0.05] pt-3 text-center text-[11px] text-white/25">
              More sessions will sharpen this pattern — early data can shift.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
