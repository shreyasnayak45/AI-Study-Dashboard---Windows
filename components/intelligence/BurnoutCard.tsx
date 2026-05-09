"use client";

import { AlertTriangle, CheckCircle, AlertCircle, Hourglass } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { BurnoutRisk, BurnoutLevel, AIIntelligenceInsight, IntelligencePhase } from "@/types";

interface Props {
  burnout:     BurnoutRisk;
  phase:       IntelligencePhase;
  aiAnalysis?: AIIntelligenceInsight["burnoutAnalysis"] | null;
}

const LEVEL_CONFIG: Record<BurnoutLevel, {
  icon:      React.ComponentType<{ className?: string }>;
  iconBg:    string;
  iconColor: string;
  badgeBg:   string;
  dot:       string;
}> = {
  high: {
    icon:      AlertTriangle,
    iconBg:    "bg-red-500/10",
    iconColor: "text-red-400",
    badgeBg:   "bg-red-500/15 text-red-300 border border-red-500/20",
    dot:       "bg-red-400",
  },
  moderate: {
    icon:      AlertCircle,
    iconBg:    "bg-amber-500/10",
    iconColor: "text-amber-400",
    badgeBg:   "bg-amber-500/15 text-amber-300 border border-amber-500/20",
    dot:       "bg-amber-400",
  },
  low: {
    icon:      CheckCircle,
    iconBg:    "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    badgeBg:   "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    dot:       "bg-emerald-400",
  },
};

export function BurnoutCard({ burnout, phase, aiAnalysis }: Props) {
  // ── Phase 1: not enough data to assess burnout risk ─────────────────────
  // The AI enforces level: "unknown" here, but we render it as a special card
  // regardless — rule-based burnout signals on < 7 days of data are noisy.
  if (phase === 1 || aiAnalysis?.level === "unknown") {
    return (
      <Card className="flex flex-col p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
          Burnout Risk
        </p>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
            <Hourglass className="h-5 w-5 text-white/20" />
          </div>
          <div>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-xs font-semibold text-white/30">
              Insufficient Data
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-white/35">
          Burnout patterns require at least a week of sessions to detect reliably.
          Keep logging and this analysis will unlock automatically.
        </p>

        <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-[11px] text-white/25">
            Unlocks after 7 active study days
          </p>
        </div>
      </Card>
    );
  }

  // ── Phase 2 / 3: real burnout analysis ──────────────────────────────────
  // Prefer AI level when available; fall back to rule-based
  const level    = aiAnalysis?.level    ?? burnout.level;
  const headline = aiAnalysis?.headline ?? (level === "high" ? "High Risk" : level === "moderate" ? "Moderate" : "Low Risk");
  const insight  = aiAnalysis?.insight  ?? burnout.advice;
  const signals  = aiAnalysis?.signals?.filter(Boolean) ?? burnout.signals.map((s) => s.description);

  // "unknown" is already excluded by the Phase 1 guard above.
  // burnout.level is BurnoutLevel; aiAnalysis?.level is narrowed to non-unknown here.
  const safeLevel = (level as BurnoutLevel);
  const cfg  = LEVEL_CONFIG[safeLevel];
  const Icon = cfg.icon;

  return (
    <Card className="flex flex-col p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Burnout Risk
      </p>

      {/* ── Level header ── */}
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
          <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
        </div>
        <div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeBg}`}>
            {headline}
          </span>
        </div>
      </div>

      {/* ── AI insight paragraph ── */}
      <p className="mt-3 text-xs leading-relaxed text-white/45">{insight}</p>

      {/* ── Signals ── */}
      {signals.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {signals.map((sig, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
              <p className="text-[11px] leading-snug text-white/35">{sig}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.05] px-3 py-2">
          <p className="text-[11px] text-emerald-400/70">
            No burnout signals detected in the last 14 days.
          </p>
        </div>
      )}
    </Card>
  );
}
