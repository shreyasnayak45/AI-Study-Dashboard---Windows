// PURE / CLIENT-SAFE — no server imports.
// Safe to import from "use client" components.

import type {
  DailyStudyData, WeeklyStudyData, SubjectData, AnalyticsStats, Insight,
} from "@/types";

// ─── Colors ───────────────────────────────────────────────────────────────────

export const CHART_COLORS = [
  "#6366f1", // brand indigo
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

// ─── Formatters ───────────────────────────────────────────────────────────────

export function fmtHours(minutes: number): string {
  if (minutes === 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function fmtDecimalHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

// ─── Date helpers (timezone-safe) ─────────────────────────────────────────────

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(s: string): Date {
  const [y, mo, d] = s.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

function shortDateLabel(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export function computeCurrentStreak(studyDates: string[]): number {
  if (studyDates.length === 0) return 0;

  const unique = [...new Set(studyDates)].sort();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(today);
  const yesterdayStr = localDateStr(addDays(today, -1));
  const latest = unique[unique.length - 1];

  if (latest !== todayStr && latest !== yesterdayStr) return 0;

  let streak = 0;
  let check = parseLocalDate(latest);
  check.setHours(0, 0, 0, 0);

  for (let i = unique.length - 1; i >= 0; i--) {
    if (unique[i] === localDateStr(check)) {
      streak++;
      check = addDays(check, -1);
    } else if (unique[i] < localDateStr(check)) {
      break;
    }
  }
  return streak;
}

export function computeLongestStreak(studyDates: string[]): number {
  if (studyDates.length === 0) return 0;
  const unique = [...new Set(studyDates)].sort();
  if (unique.length === 1) return 1;

  let max = 1, curr = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = parseLocalDate(unique[i - 1]);
    const expected = localDateStr(addDays(prev, 1));
    if (unique[i] === expected) {
      curr++;
      if (curr > max) max = curr;
    } else {
      curr = 1;
    }
  }
  return max;
}

// ─── Data builders ────────────────────────────────────────────────────────────

type SessionLike = { studied_at: string; duration_minutes: number };

export function buildDailyData(sessions: SessionLike[], days = 30): DailyStudyData[] {
  const map = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = addDays(today, -(days - 1));

  for (const s of sessions) {
    const d = s.studied_at.split("T")[0];
    if (parseLocalDate(d) >= cutoff) {
      map.set(d, (map.get(d) ?? 0) + s.duration_minutes);
    }
  }

  const result: DailyStudyData[] = [];
  for (let i = 0; i < days; i++) {
    const date = localDateStr(addDays(cutoff, i));
    const minutes = map.get(date) ?? 0;
    result.push({ date, label: shortDateLabel(date), minutes, hours: fmtDecimalHours(minutes) });
  }
  return result;
}

export function buildWeeklyData(sessions: SessionLike[], weeks = 12): WeeklyStudyData[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun
  const currentWeekStart = addDays(today, -dow);
  const oldestWeekStart = addDays(currentWeekStart, -(weeks - 1) * 7);

  const map = new Map<string, number>();
  for (const s of sessions) {
    const sDate = parseLocalDate(s.studied_at.split("T")[0]);
    if (sDate < oldestWeekStart) continue;
    const wDow = sDate.getDay();
    const wStart = localDateStr(addDays(sDate, -wDow));
    map.set(wStart, (map.get(wStart) ?? 0) + s.duration_minutes);
  }

  const result: WeeklyStudyData[] = [];
  for (let i = 0; i < weeks; i++) {
    const weekStart = localDateStr(addDays(oldestWeekStart, i * 7));
    const minutes = map.get(weekStart) ?? 0;
    result.push({ weekStart, label: shortDateLabel(weekStart), minutes, hours: fmtDecimalHours(minutes) });
  }
  return result;
}

export function buildSubjectData(sessions: Array<SessionLike & { subject: string }>): SubjectData[] {
  const map = new Map<string, { minutes: number; sessions: number }>();
  let total = 0;

  for (const s of sessions) {
    const entry = map.get(s.subject) ?? { minutes: 0, sessions: 0 };
    entry.minutes += s.duration_minutes;
    entry.sessions += 1;
    map.set(s.subject, entry);
    total += s.duration_minutes;
  }

  return Array.from(map.entries())
    .map(([subject, { minutes, sessions }]) => ({
      subject,
      minutes,
      hours: fmtDecimalHours(minutes),
      percentage: total > 0 ? Math.round((minutes / total) * 100) : 0,
      sessions,
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export function generateInsights(stats: AnalyticsStats): Insight[] {
  const out: Insight[] = [];

  // Streak
  if (stats.streak >= 7) {
    out.push({
      key: "streak-great",
      icon: "flame", color: "orange",
      title: `${stats.streak}-day streak! 🔥`,
      description: "Incredible consistency. You're in the zone.",
    });
  } else if (stats.streak >= 3) {
    out.push({
      key: "streak-good",
      icon: "flame", color: "orange",
      title: `${stats.streak}-day streak`,
      description: "Keep going — push to 7 days for a milestone.",
    });
  } else if (stats.streak === 0 && stats.totalSessions > 0) {
    out.push({
      key: "streak-reset",
      icon: "flame", color: "red",
      title: "Streak reset",
      description: "Study today to start a new streak.",
    });
  }

  // Top subject
  if (stats.subjects.length > 0) {
    const top = stats.subjects[0];
    out.push({
      key: "top-subject",
      icon: "book-open", color: "brand",
      title: `Top subject: ${top.subject}`,
      description: `${fmtHours(top.minutes)} logged — ${top.percentage}% of all study time.`,
    });
  }

  // Weekly trend
  if (stats.weekly.length >= 2) {
    const thisWeek = stats.weekly[stats.weekly.length - 1].minutes;
    const lastWeek = stats.weekly[stats.weekly.length - 2].minutes;
    if (thisWeek > lastWeek && lastWeek > 0) {
      const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
      out.push({
        key: "week-up",
        icon: "trending-up", color: "emerald",
        title: `${pct}% more than last week`,
        description: `${fmtHours(thisWeek)} this week vs ${fmtHours(lastWeek)} last week.`,
      });
    } else if (thisWeek > 0 && lastWeek > thisWeek) {
      out.push({
        key: "week-down",
        icon: "calendar", color: "violet",
        title: "Lighter week than last",
        description: `${fmtHours(thisWeek)} this week vs ${fmtHours(lastWeek)} last week.`,
      });
    }
  }

  // Task completion
  if (stats.tasksTotal > 0) {
    const rate = stats.taskCompletionRate;
    if (rate >= 80) {
      out.push({
        key: "tasks-great",
        icon: "star", color: "emerald",
        title: `${rate}% task completion`,
        description: "Excellent! You're knocking out your tasks.",
      });
    } else if (rate >= 40) {
      out.push({
        key: "tasks-ok",
        icon: "target", color: "brand",
        title: `${rate}% task completion`,
        description: `${stats.tasksCompleted} of ${stats.tasksTotal} tasks done. Keep chipping away.`,
      });
    }
  }

  // Best day callout
  if (stats.bestDayMinutes >= 120 && stats.bestDayDate) {
    out.push({
      key: "best-day",
      icon: "star", color: "violet",
      title: `Best day: ${fmtHours(stats.bestDayMinutes)}`,
      description: `Recorded on ${shortDateLabel(stats.bestDayDate)}. Aim to beat it!`,
    });
  }

  return out.slice(0, 4);
}
