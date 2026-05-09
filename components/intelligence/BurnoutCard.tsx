"use client";

import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { BurnoutRisk, BurnoutLevel } from "@/types";

interface Props {
  burnout: BurnoutRisk;
}

const LEVEL_CONFIG: Record<BurnoutLevel, {
  icon:      React.ComponentType<{ className?: string }>;
  badge:     string;
  iconColor: string;
  badgeBg:   string;
  dot:       string;
}> = {
  high: {
    icon:      AlertTriangle,
    badge:     "High Risk",
    iconColor: "text-red-400",
    badgeBg:   "bg-red-500/15 text-red-300 border border-red-500/20",
    dot:       "bg-red-400",
  },
  moderate: {
    icon:      AlertCircle,
    badge:     "Moderate",
    iconColor: "text-amber-400",
    badgeBg:   "bg-amber-500/15 text-amber-300 border border-amber-500/20",
    dot:       "bg-amber-400",
  },
  low: {
    icon:      CheckCircle,
    badge:     "Low Risk",
    iconColor: "text-emerald-400",
    badgeBg:   "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
    dot:       "bg-emerald-400",
  },
};

export function BurnoutCard({ burnout }: Props) {
  const { level, signals, advice } = burnout;
  const cfg = LEVEL_CONFIG[level];
  const Icon = cfg.icon;

  return (
    <Card className="flex flex-col p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Burnout Risk
      </p>

      {/* ── Level badge ── */}
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          level === "high"     ? "bg-red-500/10"     :
          level === "moderate" ? "bg-amber-500/10"   :
                                 "bg-emerald-500/10"
        }`}>
          <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
        </div>
        <div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeBg}`}>
            {cfg.badge}
          </span>
          <p className="mt-1 text-xs text-white/40 leading-snug">{advice}</p>
        </div>
      </div>

      {/* ── Signals ── */}
      {signals.length > 0 ? (
        <div className="mt-4 space-y-2">
          {signals.map((sig) => (
            <div key={sig.label} className="flex items-start gap-2">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
              <div>
                <p className="text-xs font-semibold text-white/70">{sig.label}</p>
                <p className="text-[11px] text-white/35 leading-snug">{sig.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.05] px-3 py-2.5">
          <p className="text-xs text-emerald-400/80">
            No burnout signals detected in the last 14 days. Keep it up!
          </p>
        </div>
      )}
    </Card>
  );
}
