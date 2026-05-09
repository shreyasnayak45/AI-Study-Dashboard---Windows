// SERVER-ONLY — uses getGeminiFlash() which reads process.env.

import { getGeminiFlash } from "@/lib/gemini";
import { fmtHours } from "@/lib/analytics-utils";
import type { WeeklyStats, GeminiWeeklyInsight } from "./types";

// ─── Timeout wrapper ──────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.error(`[weekly-report/gemini] timed out after ${ms}ms`);
      resolve(null);
    }, ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (err) => {
        clearTimeout(timer);
        console.error("[weekly-report/gemini] generateContent threw:", err);
        resolve(null);
      },
    );
  });
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

const FOCUS_WINDOW_LABELS: Record<string, string> = {
  "pre-dawn":      "Pre-dawn (12–5am UTC)",
  "early-morning": "Early morning (5–8am UTC)",
  "morning":       "Morning (8am–12pm UTC)",
  "afternoon":     "Afternoon (12–5pm UTC)",
  "evening":       "Evening (5–9pm UTC)",
  "night":         "Night (9pm–12am UTC)",
};

function buildPrompt(stats: WeeklyStats): string {
  const {
    totalMinutes, activeDays, sessionCount,
    avgSessionMinutes, longestSessionMinutes,
    weekOverWeekPct, prevWeekMinutes,
    bestDay, subjects,
    currentStreak, hasTimingData, bestFocusWindow,
    weekStart, weekEnd,
  } = stats;

  const totalH = (totalMinutes / 60).toFixed(1).replace(/\.0$/, "");
  const prevH  = prevWeekMinutes > 0
    ? `${(prevWeekMinutes / 60).toFixed(1).replace(/\.0$/, "")}h`
    : "none";

  const comparisonLine = weekOverWeekPct === null
    ? "vs_prev_week: first week recorded"
    : `vs_prev_week: ${weekOverWeekPct >= 0 ? "+" : ""}${weekOverWeekPct}% (${prevH} prev)`;

  const subjectLine = subjects.length > 0
    ? subjects.map((s) => `${s.name} (${fmtHours(s.minutes)}, ${s.percentage}%)`).join(" | ")
    : "no subjects logged";

  const bestDayLine = bestDay
    ? `best_day: ${bestDay.dayName} (${fmtHours(bestDay.minutes)})`
    : "";

  const timingLine = hasTimingData && bestFocusWindow
    ? `best_focus_window: ${FOCUS_WINDOW_LABELS[bestFocusWindow] ?? bestFocusWindow}`
    : "timing_data: insufficient (do NOT mention time-of-day patterns)";

  const streakLine = currentStreak > 0
    ? `streak: ${currentStreak} day${currentStreak !== 1 ? "s" : ""} current`
    : "streak: none currently active";

  const noTimingInstruction = !hasTimingData ? `
TIMING RULE: The user has insufficient session_start_time data.
DO NOT mention morning/afternoon/evening/night patterns.
DO NOT mention focus windows or time-of-day study habits.
All other fields are fine.` : "";

  return `Weekly study report AI. Return ONLY valid JSON — no markdown, no extra text.

Week: ${weekStart} to ${weekEnd}
total: ${totalH}h | sessions: ${sessionCount} | active_days: ${activeDays}/7
avg_session: ${fmtHours(avgSessionMinutes)} | longest: ${fmtHours(longestSessionMinutes)}
${comparisonLine}
subjects: ${subjectLine}
${bestDayLine}
${streakLine}
${timingLine}
${noTimingInstruction}
Write a premium weekly study report. Tone: intelligent, specific, personal. Style: premium coach, not a bot.
Rules: NO exclamation marks. NO fake motivational quotes. NO "amazing" or "incredible".
Reference specific numbers. Be concise. Sound human.

{"headline":"4-7 evocative words — the mood/title of this week","narrative":"2-3 sentences. Story-like. Reference actual numbers and subjects.","insight":"1-2 sentences. One specific behavioural pattern or observation from the data.","recommendation":"1-2 sentences. One concrete, actionable suggestion for next week.","motivationalEnding":"1-2 sentences. Warm but grounded. End on forward momentum.","nextWeekTarget":"One specific measurable goal, e.g. 9 hours across 5 days"}`;
}

// ─── Response parser ──────────────────────────────────────────────────────────

function parseGeminiResponse(raw: string): GeminiWeeklyInsight | null {
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  try {
    const p = JSON.parse(cleaned);

    if (
      typeof p?.headline           !== "string" ||
      typeof p?.narrative          !== "string" ||
      typeof p?.insight            !== "string" ||
      typeof p?.recommendation     !== "string" ||
      typeof p?.motivationalEnding !== "string" ||
      typeof p?.nextWeekTarget     !== "string"
    ) {
      console.error("[weekly-report/gemini] parseGeminiResponse: missing fields in:", p);
      return null;
    }

    return {
      headline:            p.headline.trim(),
      narrative:           p.narrative.trim(),
      insight:             p.insight.trim(),
      recommendation:      p.recommendation.trim(),
      motivationalEnding:  p.motivationalEnding.trim(),
      nextWeekTarget:      p.nextWeekTarget.trim(),
    };
  } catch {
    console.error("[weekly-report/gemini] JSON.parse failed. Raw:\n", raw.slice(0, 500));
    return null;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateWeeklyInsight(
  stats: WeeklyStats,
): Promise<GeminiWeeklyInsight | null> {
  let model;
  try {
    model = getGeminiFlash();
  } catch (err) {
    console.error("[weekly-report/gemini] getGeminiFlash threw:", err);
    return null;
  }

  const prompt = buildPrompt(stats);

  const resultOrNull = await withTimeout(
    (async () => {
      const r = await model.generateContent(prompt);
      const candidate = r.response.candidates?.[0];

      if (!candidate) {
        console.error("[weekly-report/gemini] no candidates in response");
        return null;
      }

      const HARMFUL = new Set(["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII"]);
      const reason  = candidate.finishReason;
      if (reason && HARMFUL.has(reason)) {
        console.error("[weekly-report/gemini] blocked by safety policy:", reason);
        return null;
      }
      if (reason && reason !== "STOP" && reason !== "MAX_TOKENS") {
        console.warn("[weekly-report/gemini] non-standard finishReason:", reason);
      }

      const text = (candidate.content?.parts ?? [])
        .filter((p) => !(p as unknown as { thought?: boolean }).thought)
        .map((p)  => ("text" in p ? (p as { text: string }).text : ""))
        .join("");

      if (!text) {
        console.error("[weekly-report/gemini] empty text after filtering thought parts");
        return null;
      }

      return parseGeminiResponse(text);
    })(),
    30_000,
  );

  return resultOrNull ?? null;
}
