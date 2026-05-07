"use server";

import { getCurrentUser } from "@/lib/auth";
import { getCachedInsight, generateAndStoreInsight } from "@/lib/ai-insights";
import { getTrackerStats } from "@/lib/tracker-stats";
import { getTaskStats } from "@/lib/task-stats";
import { getProfileStats } from "@/lib/analytics-stats";
import type { ActionResult, AIDailyInsight } from "@/types";

type InsightResult = ActionResult & { insight?: AIDailyInsight };

/**
 * Returns today's cached insight if it exists, otherwise generates a new one.
 * Called automatically on component mount when no server-side cache was found.
 */
export async function getOrGenerateInsight(): Promise<InsightResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const cached = await getCachedInsight();
  if (cached) return { success: true, insight: cached };

  return runGeneration();
}

/**
 * Force-regenerates insights regardless of today's cache.
 * Called by the Refresh button.
 */
export async function refreshInsight(): Promise<InsightResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  return runGeneration();
}

// ─── Shared generation logic ─────────────────────────────────────────────────

async function runGeneration(): Promise<InsightResult> {
  // All three calls use React.cache — no redundant DB queries within this action
  const [trackerStats, taskStats, profileStats] = await Promise.all([
    getTrackerStats(),
    getTaskStats(),
    getProfileStats(),
  ]);

  const insight = await generateAndStoreInsight({ trackerStats, taskStats, profileStats });

  if (!insight) {
    return { success: false, error: "Could not generate insights. Check your GEMINI_API_KEY." };
  }

  return { success: true, insight };
}
