// PURE — no server imports, safe to test in isolation.
//
// Computes WeeklyStats from the full raw-session list.
// "This week"  = today (inclusive) and the 6 previous calendar days.
// "Last week"  = the 7 days before that window.
//
// TIMING POLICY: matches lib/ai-insights.ts — `session_start_time` is the
// only field used for time-of-day (UTC hour) analysis.  `studied_at` is
// reliable only for date-level comparisons.

import { computeCurrentStreak } from "@/lib/analytics-utils";
import { hasRealSessionStartTime, MIN_TIMED_SESSIONS } from "@/lib/intelligence";
import type { RawSessionForIntelligence } from "@/types";
import type {
  WeeklyStats, WeeklySubject, WeeklyDayStats, FocusWindow,
} from "./types";

// ─── Date helpers (pure, no timezone magic) ───────────────────────────────────

function localISODate(d: Date): string {
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function shortDateLabel(dateStr: string): string {
  const [y, mo, da] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, da).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeWeeklyStats(
  allSessions: RawSessionForIntelligence[],
): WeeklyStats {
  // Build the [weekStart, weekEnd] window relative to today.
  const today = new Date();
  today.setHours(23, 59, 59, 999); // include all of today

  const weekEndDate   = new Date(today);
  weekEndDate.setHours(0, 0, 0, 0);
  const weekStartDate = addDays(weekEndDate, -6);

  const prevWeekEndDate   = addDays(weekStartDate, -1);
  const prevWeekStartDate = addDays(weekStartDate, -7);

  const weekStart = localISODate(weekStartDate);
  const weekEnd   = localISODate(weekEndDate);

  // ── Partition sessions ──────────────────────────────────────────────────────
  const thisWeekSessions: RawSessionForIntelligence[] = [];
  const prevWeekSessions: RawSessionForIntelligence[] = [];

  for (const s of allSessions) {
    const date = s.studied_at.split("T")[0];
    if (date >= weekStart && date <= weekEnd) {
      thisWeekSessions.push(s);
    } else if (
      date >= localISODate(prevWeekStartDate) &&
      date <= localISODate(prevWeekEndDate)
    ) {
      prevWeekSessions.push(s);
    }
  }

  // ── Core totals ─────────────────────────────────────────────────────────────
  const totalMinutes  = thisWeekSessions.reduce((s, x) => s + x.duration_minutes, 0);
  const sessionCount  = thisWeekSessions.length;
  const prevWeekMinutes = prevWeekSessions.reduce((s, x) => s + x.duration_minutes, 0);

  const weekOverWeekPct: number | null =
    prevWeekMinutes === 0
      ? null
      : Math.round(((totalMinutes - prevWeekMinutes) / prevWeekMinutes) * 100);

  const avgSessionMinutes =
    sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0;

  const longestSessionMinutes = thisWeekSessions.reduce(
    (max, s) => Math.max(max, s.duration_minutes), 0,
  );

  // ── Daily breakdown ─────────────────────────────────────────────────────────
  const dayMap = new Map<string, number>();
  for (const s of thisWeekSessions) {
    const d = s.studied_at.split("T")[0];
    dayMap.set(d, (dayMap.get(d) ?? 0) + s.duration_minutes);
  }

  const activeDays = dayMap.size;

  const dailyBreakdown: WeeklyDayStats[] = [];
  for (let i = 0; i < 7; i++) {
    const date    = localISODate(addDays(weekStartDate, i));
    const dayIdx  = addDays(weekStartDate, i).getDay(); // 0=Sun
    dailyBreakdown.push({
      date,
      dayName:   DAY_NAMES[dayIdx],
      shortDate: shortDateLabel(date),
      minutes:   dayMap.get(date) ?? 0,
    });
  }

  // ── Best day ────────────────────────────────────────────────────────────────
  let bestDay: WeeklyStats["bestDay"] = null;
  for (const [date, minutes] of dayMap.entries()) {
    if (!bestDay || minutes > bestDay.minutes) {
      const dayIdx = new Date(date + "T12:00:00").getDay();
      bestDay = { dayName: DAY_NAMES[dayIdx], date, minutes };
    }
  }

  // ── Subjects ────────────────────────────────────────────────────────────────
  const subjectMap = new Map<string, { minutes: number; sessions: number }>();
  for (const s of thisWeekSessions) {
    const name = s.subject?.trim() || "Unlabelled";
    const entry = subjectMap.get(name) ?? { minutes: 0, sessions: 0 };
    entry.minutes  += s.duration_minutes;
    entry.sessions += 1;
    subjectMap.set(name, entry);
  }

  const subjects: WeeklySubject[] = Array.from(subjectMap.entries())
    .map(([name, { minutes, sessions }]) => ({
      name,
      minutes,
      sessions,
      percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5); // cap at 5 for email legibility

  // ── Streak (uses all sessions, not just this week's) ─────────────────────
  const allDates    = allSessions.map((s) => s.studied_at.split("T")[0]);
  const currentStreak = computeCurrentStreak(allDates);

  // ── Timing data ─────────────────────────────────────────────────────────────
  const timedSessions      = allSessions.filter(hasRealSessionStartTime);
  const timedSessionCount  = timedSessions.length;
  const hasTimingData      = timedSessionCount >= MIN_TIMED_SESSIONS;

  let bestFocusWindow: FocusWindow | null = null;

  if (hasTimingData) {
    const buckets: Record<FocusWindow, number> = {
      "pre-dawn":      0,
      "early-morning": 0,
      "morning":       0,
      "afternoon":     0,
      "evening":       0,
      "night":         0,
    };

    for (const s of timedSessions) {
      const hour = new Date(s.session_start_time!).getUTCHours();
      if      (hour < 5)  buckets["pre-dawn"]      += s.duration_minutes;
      else if (hour < 8)  buckets["early-morning"] += s.duration_minutes;
      else if (hour < 12) buckets["morning"]        += s.duration_minutes;
      else if (hour < 17) buckets["afternoon"]      += s.duration_minutes;
      else if (hour < 21) buckets["evening"]        += s.duration_minutes;
      else                buckets["night"]           += s.duration_minutes;
    }

    let maxMins = 0;
    for (const [window, mins] of Object.entries(buckets) as [FocusWindow, number][]) {
      if (mins > maxMins) { maxMins = mins; bestFocusWindow = window; }
    }
    // Only report if the dominant window has ≥20% of timed minutes
    const timedTotal = Object.values(buckets).reduce((a, b) => a + b, 0);
    if (maxMins < timedTotal * 0.2) bestFocusWindow = null;
  }

  return {
    weekStart,
    weekEnd,
    totalMinutes,
    activeDays,
    sessionCount,
    avgSessionMinutes,
    longestSessionMinutes,
    prevWeekMinutes,
    weekOverWeekPct,
    bestDay,
    subjects,
    dailyBreakdown,
    currentStreak,
    hasTimingData,
    bestFocusWindow,
    timedSessionCount,
  };
}
