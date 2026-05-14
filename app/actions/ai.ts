"use server";

import { getAIInsightsEndpoint } from "@/lib/ai-backend";
import { getCachedInsight } from "@/lib/ai-insights";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, AIDailyInsight } from "@/types";

type InsightResult = ActionResult & { insight?: AIDailyInsight };
type AIInsightsApiResult = InsightResult;

/**
 * Returns today's cached insight if it exists, otherwise generates a new one.
 * Called automatically on component mount when no server-side cache was found.
 */
export async function getOrGenerateInsight(): Promise<InsightResult> {
  const cached = await getCachedInsight();
  if (cached) return { success: true, insight: cached };

  return runGeneration();
}

/**
 * Force-regenerates insights regardless of today's cache.
 * Called by the Refresh button in InsightsCard and IntelligenceDashboard.
 */
export async function refreshInsight(): Promise<InsightResult> {
  return runGeneration();
}

async function runGeneration(): Promise<InsightResult> {
  const sb = await createClient();
  const accessToken = await getValidatedAccessToken(sb);
  if (!accessToken) {
    return { success: false, error: "Session expired. Please sign in again." };
  }

  try {
    const response = await fetch(getAIInsightsEndpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const result = await response.json().catch(() => null) as AIInsightsApiResult | null;
    console.info("[ai-action] backend status:", response.status);
    console.info("[ai-action] success:", result?.success === true && Boolean(result.insight) ? "true" : "false");

    if (!response.ok || !result?.success || !result.insight) {
      return {
        success: false,
        error: result?.error || "AI analysis unavailable right now. Please try again in a moment.",
      };
    }

    return { success: true, insight: result.insight };
  } catch (error) {
    console.error("[ai-action] Secure AI insight request failed:", error);
    console.info("[ai-action] backend status: request failed");
    console.info("[ai-action] success: false");
    return {
      success: false,
      error: "AI analysis unavailable right now. Please try again in a moment.",
    };
  }
}

async function getValidatedAccessToken(sb: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const {
    data: { session },
  } = await sb.auth.getSession();

  console.info("[ai-action] token exists:", session?.access_token ? "yes" : "no");

  if (!session?.access_token) {
    return null;
  }

  const { error: userError } = await sb.auth.getUser(session.access_token);
  if (!userError) {
    return session.access_token;
  }

  if (!session.refresh_token) {
    console.info("[ai-action] token exists: no");
    return null;
  }

  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await sb.auth.refreshSession({ refresh_token: session.refresh_token });

  console.info("[ai-action] token exists:", refreshedSession?.access_token ? "yes" : "no");

  if (refreshError || !refreshedSession?.access_token) {
    return null;
  }

  const { error: refreshedUserError } = await sb.auth.getUser(refreshedSession.access_token);
  if (refreshedUserError) {
    return null;
  }

  return refreshedSession.access_token;
}
