"use client";

import { Card } from "@/components/ui/Card";
import type { ConsistencyScore, IntelligencePhase } from "@/types";

interface Props {
  consistency: ConsistencyScore;
  phase:       IntelligencePhase;
  aiLabel?:    string;   // Gemini-generated label (overrides rule-based in Phase 2+)
  aiTagline?:  string;   // Gemini-generated one-line description
}

const RADIUS       = 52;
const CX           = 64;
const CY           = 64;
const STROKE_WIDTH = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const BREAKDOWN_LABELS = [
  { key: "frequency"      as const, label: "Frequency",   max: 40, color: "bg-brand-500"   },
  { key: "streak"         as const, label: "Streak",      max: 25, color: "bg-violet-500"  },
  { key: "regularity"     as const, label: "Regularity",  max: 20, color: "bg-emerald-500" },
  { key: "recentActivity" as const, label: "Recent",      max: 15, color: "bg-amber-500"   },
];

export function ConsistencyRing({ consistency, phase, aiLabel, aiTagline }: Props) {
  const { score, label, color, ringColor, breakdown } = consistency;

  // ── Phase 1: not enough data to show a meaningful score ─────────────────
  if (phase === 1) {
    const placeholderOffset = CIRCUMFERENCE * (1 - 0.15); // 15% arc — "gathering data"
    return (
      <Card className="flex flex-col p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
          Consistency Score
        </p>

        <div className="flex items-center gap-5">
          {/* Dim placeholder ring */}
          <div className="relative shrink-0">
            <svg width={128} height={128} viewBox="0 0 128 128" aria-label="Gathering data">
              <circle
                cx={CX} cy={CY} r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={STROKE_WIDTH}
              />
              <circle
                cx={CX} cy={CY} r={RADIUS}
                fill="none"
                stroke="#374151"
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={placeholderOffset}
                transform={`rotate(-90 ${CX} ${CY})`}
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white/30 leading-none">?</span>
              <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/25">
                Learning...
              </span>
            </div>
          </div>

          {/* Dimmed breakdown bars */}
          <div className="min-w-0 flex-1 space-y-2.5 opacity-30">
            {BREAKDOWN_LABELS.map(({ key, label: lbl, max, color: barColor }) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-white/40">{lbl}</span>
                  <span className="text-[11px] font-semibold text-white/50">
                    ?<span className="text-white/25">/{max}</span>
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className={`h-full rounded-full ${barColor} w-[20%]`}
                    style={{ opacity: 0.4 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 border-t border-white/[0.05] pt-3 text-xs leading-relaxed text-white/30">
          Log sessions on 7+ different days to unlock your consistency score.
        </p>
      </Card>
    );
  }

  // ── Phase 2 / 3: real score ──────────────────────────────────────────────
  // Phase 2 shows "~{score}" to signal emerging confidence; Phase 3 shows exact score
  const displayLabel  = aiLabel || label;
  const displayScore  = phase === 2 ? `~${score}` : `${score}`;
  const dashOffset    = CIRCUMFERENCE * (1 - score / 100);

  return (
    <Card className="flex flex-col p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
        Consistency Score
      </p>

      {/* ── Ring ── */}
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width={128} height={128} viewBox="0 0 128 128" aria-label={`Consistency score: ${score}`}>
            {/* Track */}
            <circle
              cx={CX} cy={CY} r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={STROKE_WIDTH}
            />
            {/* Progress arc — slightly desaturated in Phase 2 */}
            <circle
              cx={CX} cy={CY} r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${CX} ${CY})`}
              style={{
                transition: "stroke-dashoffset 0.8s ease",
                opacity: phase === 2 ? 0.7 : 1,
              }}
            />
          </svg>
          {/* Centre text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-bold text-white leading-none ${phase === 2 ? "text-xl" : "text-2xl"}`}>
              {displayScore}
            </span>
            <span className={`mt-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}>
              {displayLabel}
            </span>
          </div>
        </div>

        {/* ── Breakdown bars ── */}
        <div className="min-w-0 flex-1 space-y-2.5">
          {BREAKDOWN_LABELS.map(({ key, label: lbl, max, color: barColor }) => {
            const val = breakdown[key];
            const pct = max > 0 ? (val / max) * 100 : 0;
            return (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-white/40">{lbl}</span>
                  <span className="text-[11px] font-semibold text-white/70">
                    {val}<span className="text-white/25">/{max}</span>
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-700`}
                    style={{ width: `${pct}%`, opacity: phase === 2 ? 0.5 : 0.7 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Phase 2 emerging note ── */}
      {phase === 2 && !aiTagline && (
        <p className="mt-3 border-t border-white/[0.05] pt-3 text-xs leading-relaxed text-white/30">
          Patterns are emerging — keep logging to sharpen accuracy.
        </p>
      )}

      {/* ── AI tagline (Phase 2 with AI, or Phase 3) ── */}
      {aiTagline && (
        <p className="mt-3 border-t border-white/[0.05] pt-3 text-xs leading-relaxed text-white/40">
          {aiTagline}
        </p>
      )}
    </Card>
  );
}
