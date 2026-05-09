// SERVER-ONLY — reads Supabase and calls Gemini.

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { RawSessionForIntelligence } from "@/types";
import { computeWeeklyStats } from "./analytics";
import { generateWeeklyInsight } from "./gemini";
import type { WeeklyReport } from "./types";

/**
 * Fetches the current user's full session history, computes weekly stats,
 * calls Gemini for narrative insights, and returns a WeeklyReport ready to
 * pass to the email template.
 *
 * Returns null when:
 *   - The user is not authenticated
 *   - The user has no study sessions in the last 7 days (nothing to report)
 *   - Gemini fails (logged server-side)
 */
export async function generateWeeklyReport(): Promise<WeeklyReport | null> {
  const user = await getCurrentUser();
  if (!user) {
    console.error("[weekly-report/generator] not authenticated");
    return null;
  }

  const sb = await createClient();
  const { data, error } = await sb
    .from("study_sessions")
    .select("duration_minutes, studied_at, session_start_time, subject")
    .eq("user_id", user.id)
    .order("studied_at", { ascending: true });

  if (error) {
    console.error("[weekly-report/generator] Supabase fetch failed:", error);
    return null;
  }

  const allSessions = (data ?? []) as RawSessionForIntelligence[];
  const stats = computeWeeklyStats(allSessions);

  if (stats.totalMinutes === 0) {
    console.warn("[weekly-report/generator] no sessions in the last 7 days — nothing to report");
    return null;
  }

  console.log(
    `[weekly-report/generator] computing report for ${user.email} — ` +
    `${stats.totalMinutes}m over ${stats.activeDays} days this week`,
  );

  const ai = await generateWeeklyInsight(stats);
  if (!ai) {
    console.error("[weekly-report/generator] Gemini returned null — aborting");
    return null;
  }

  return {
    stats,
    ai,
    userEmail: user.email ?? "unknown",
    generatedAt: new Date().toISOString(),
  };
}
