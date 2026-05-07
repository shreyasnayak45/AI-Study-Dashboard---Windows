// SERVER-ONLY — imports next/headers via lib/supabase/server.
// Do NOT import this file from any "use client" component.
//
// Wrapped in React.cache: multiple server components on the same page share
// a single Supabase query instead of each firing their own.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildDailyData } from "@/lib/analytics-utils";
import type { StudySession, TrackerStats } from "@/types";

export { formatDuration, formatStudyDate } from "@/lib/tracker-utils";

/** Fetch all sessions for the logged-in user, newest first. */
export const getSessionsForTracker = cache(async (): Promise<StudySession[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .order("studied_at", { ascending: false });

  return error || !data ? [] : data;
});

/** Fetch stats + recent sessions + mini chart data for the dashboard home page. */
export const getTrackerStats = cache(async (): Promise<TrackerStats> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("id, duration_minutes, studied_at, subject, notes, created_at")
    .order("studied_at", { ascending: false })
    .limit(200);

  const sessions: StudySession[] = error || !data ? [] : (data as StudySession[]);

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const todayMinutes = sessions
    .filter((s) => new Date(s.studied_at) >= todayStart)
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  const weekMinutes = sessions
    .filter((s) => new Date(s.studied_at) >= weekStart)
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  // Derive mini chart from already-fetched sessions — no extra DB call needed.
  const miniData = buildDailyData(sessions, 7);

  return {
    todayMinutes,
    weekMinutes,
    streak: computeStreak(sessions),
    totalSessions: sessions.length,
    recentSessions: sessions.slice(0, 5),
    miniData,
  };
});

// ─── Private helpers ──────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function computeStreak(sessions: Pick<StudySession, "studied_at">[]): number {
  if (sessions.length === 0) return 0;

  const DAY_MS = 86_400_000;
  const studyDaySet = new Set<number>(
    sessions.map((s) => startOfDay(new Date(s.studied_at)).getTime())
  );

  const today = startOfDay(new Date()).getTime();
  const start = studyDaySet.has(today) ? today : today - DAY_MS;

  let streak = 0;
  let cursor = start;
  while (studyDaySet.has(cursor)) {
    streak++;
    cursor -= DAY_MS;
  }
  return streak;
}
