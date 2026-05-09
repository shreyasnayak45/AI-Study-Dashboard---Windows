"use client";

/**
 * IntelligenceDashboard — client-only (loaded with ssr: false in analytics page).
 *
 * WHY ssr: false?
 * ────────────────
 * computeIntelligence calls new Date(s.studied_at).getHours() to slot sessions
 * into the 24-hour heatmap and detect late-night burnout signals. On the server
 * this returns UTC hours; in the browser it returns the user's LOCAL hours.
 * A session logged at 10 PM in UTC+5:30 would show as 4:30 PM UTC on the server
 * and 10 PM locally — the browser value is what we want for per-hour analysis.
 *
 * Loading with ssr: false guarantees all Date arithmetic runs client-side.
 * The analytics page shows a skeleton while this component hydrates.
 */

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ConsistencyRing } from "@/components/intelligence/ConsistencyRing";
import { BurnoutCard }     from "@/components/intelligence/BurnoutCard";
import { HourlyHeatmap }   from "@/components/intelligence/HourlyHeatmap";
import { computeIntelligence } from "@/lib/intelligence";
import { fmtHours } from "@/lib/analytics-utils";
import type { RawSessionForIntelligence, WeeklyReport } from "@/types";

interface Props {
  sessions: RawSessionForIntelligence[];
}

export function IntelligenceDashboard({ sessions }: Props) {
  const intel = useMemo(() => computeIntelligence(sessions), [sessions]);
  const { consistency, burnout, bestHours, personality, weeklyReport, recommendations } = intel;

  return (
    <section>
      {/* ── Section header ── */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/15">
          <Zap className="h-3.5 w-3.5 text-brand-400" />
        </div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">
          Study Intelligence
        </h2>
      </div>

      {/* ── Row 1: Consistency · Burnout · Personality ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ConsistencyRing consistency={consistency} />
        <BurnoutCard     burnout={burnout} />
        <PersonalityCard personality={personality} peakLabel={bestHours.peakLabel} />
      </div>

      {/* ── Row 2: Heatmap ── */}
      <div className="mt-4">
        <HourlyHeatmap bestHours={bestHours} />
      </div>

      {/* ── Row 3: Weekly report · Recommendations ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WeeklyReportCard report={weeklyReport} />
        <RecommendationsCard recommendations={recommendations} />
      </div>
    </section>
  );
}

// ─── Personality card ─────────────────────────────────────────────────────────

function PersonalityCard({
  personality,
  peakLabel,
}: {
  personality: { type: string; emoji: string; description: string };
  peakLabel: string;
}) {
  return (
    <Card className="flex flex-col p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Focus Personality
      </p>
      <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
        <span className="text-4xl" aria-hidden="true">{personality.emoji}</span>
        <p className="mt-3 text-base font-bold text-white">{personality.type}</p>
        <p className="mt-1.5 max-w-[200px] text-xs leading-relaxed text-white/45">
          {personality.description}
        </p>
        {peakLabel !== "—" && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
            <span className="text-xs font-medium text-brand-400">Peak: {peakLabel}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Weekly report card ───────────────────────────────────────────────────────

function WeeklyReportCard({ report }: { report: WeeklyReport }) {
  const { thisWeekMinutes, lastWeekMinutes, changePercent, trend } = report;

  const TrendIcon =
    trend === "up"   ? TrendingUp   :
    trend === "down" ? TrendingDown :
                       Minus;
  const trendColor =
    trend === "up"   ? "text-emerald-400" :
    trend === "down" ? "text-red-400"     :
                       "text-white/40";
  const trendBg =
    trend === "up"   ? "bg-emerald-500/10" :
    trend === "down" ? "bg-red-500/10"     :
                       "bg-white/[0.04]";

  const maxMins = Math.max(thisWeekMinutes, lastWeekMinutes, 1);

  return (
    <Card className="p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        This Week vs Last Week
      </p>

      {/* ── Summary row ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-bold text-white">{fmtHours(thisWeekMinutes)}</p>
          <p className="mt-0.5 text-xs text-white/35">this week</p>
        </div>
        {trend !== "flat" && trend !== "new" && (
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${trendBg}`}>
            <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
            <span className={`text-sm font-semibold ${trendColor}`}>
              {trend === "up" ? "+" : ""}{changePercent}%
            </span>
          </div>
        )}
        {trend === "new" && (
          <div className="rounded-full bg-brand-500/10 px-3 py-1.5">
            <span className="text-xs font-semibold text-brand-400">First week!</span>
          </div>
        )}
      </div>

      {/* ── Comparison bars ── */}
      <div className="mt-5 space-y-3">
        <CompareBar
          label="This week"
          minutes={thisWeekMinutes}
          maxMinutes={maxMins}
          color="bg-brand-500"
        />
        <CompareBar
          label="Last week"
          minutes={lastWeekMinutes}
          maxMinutes={maxMins}
          color="bg-white/20"
        />
      </div>
    </Card>
  );
}

function CompareBar({
  label, minutes, maxMinutes, color,
}: {
  label: string; minutes: number; maxMinutes: number; color: string;
}) {
  const pct = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs text-white/40">{label}</span>
        <span className="text-xs font-semibold text-white/70">{fmtHours(minutes)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Recommendations card ─────────────────────────────────────────────────────

function RecommendationsCard({ recommendations }: { recommendations: string[] }) {
  return (
    <Card className="p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Personalised Recommendations
      </p>
      <ul className="space-y-3">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 text-sm leading-none" aria-hidden="true">
              {rec.charAt(0)}
            </span>
            <p className="text-xs leading-relaxed text-white/60">{rec.slice(2)}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
