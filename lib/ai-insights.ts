// SERVER-ONLY — imports next/headers and server-side modules.
// Do NOT import from any "use client" component.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getGeminiFlash, isAIEnabled } from "@/lib/gemini";
import type {
  AIDailyInsight, AIInsightContent,
  TrackerStats, TaskStats, ProfileStats,
} from "@/types";

// ─── Cache key helpers ────────────────────────────────────────────────────────

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── DB read ──────────────────────────────────────────────────────────────────

export const getCachedInsight = cache(async (): Promise<AIDailyInsight | null> => {
  if (!isAIEnabled()) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const sb = await createClient();
  const { data } = await sb
    .from("ai_insights")
    .select("*")
    .eq("user_id", user.id)
    .eq("insight_date", todayDateStr())
    .maybeSingle();

  return data as AIDailyInsight | null;
});

// ─── Generation ───────────────────────────────────────────────────────────────

interface InsightContext {
  trackerStats: TrackerStats;
  taskStats:    TaskStats;
  profileStats: ProfileStats;
}

export async function generateAndStoreInsight(ctx: InsightContext): Promise<AIDailyInsight | null> {
  if (!isAIEnabled()) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  const content = await callGemini(ctx);
  if (!content) return null;

  const sb = await createClient();
  const { data, error } = await sb
    .from("ai_insights")
    .upsert(
      {
        user_id:      user.id,
        insight_date: todayDateStr(),
        content,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,insight_date" }
    )
    .select()
    .single();

  if (error) return null;

  return data as AIDailyInsight;
}

// ─── Prompt + parsing ─────────────────────────────────────────────────────────

async function callGemini(ctx: InsightContext): Promise<AIInsightContent | null> {
  const { trackerStats, taskStats, profileStats } = ctx;

  const subjectMap = new Map<string, number>();
  for (const s of trackerStats.recentSessions) {
    if (s.subject) subjectMap.set(s.subject, (subjectMap.get(s.subject) ?? 0) + s.duration_minutes);
  }
  const topSubjects = [...subjectMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([subj, mins]) => `${subj} (${(mins / 60).toFixed(1)}h)`)
    .join(", ") || "none logged yet";

  const todayStr     = trackerStats.todayMinutes > 0 ? `${trackerStats.todayMinutes} min` : "none yet";
  const weekHours    = (trackerStats.weekMinutes / 60).toFixed(1).replace(/\.0$/, "");
  const taskLine     = taskStats.total === 0
    ? "no tasks added"
    : `${taskStats.completed}/${taskStats.total} completed${taskStats.overdue > 0 ? `, ${taskStats.overdue} overdue` : ""}`;
  const allTimeHours = (profileStats.totalMinutes / 60).toFixed(1).replace(/\.0$/, "");

  const prompt = `You are a concise productivity analyst for a student study tracking app.

Student data snapshot:
- Today's study time: ${todayStr}
- This week: ${weekHours}h
- Current streak: ${trackerStats.streak} day${trackerStats.streak !== 1 ? "s" : ""}
- All-time: ${profileStats.totalSessions} sessions, ${allTimeHours}h
- Recent subjects: ${topSubjects}
- Tasks: ${taskLine}
- Task completion rate: ${profileStats.taskCompletionRate}%

Return ONLY a valid JSON object. No markdown, no explanation, no extra text.
{
  "dashboard": {
    "headline": "3-5 word summary of current productivity state",
    "insights": [
      "specific, data-driven insight 1",
      "specific, data-driven insight 2",
      "specific, data-driven insight 3"
    ]
  },
  "analytics": {
    "summary": "one sentence summarizing overall study patterns using specific numbers",
    "observations": [
      "specific pattern or trend observation",
      "specific subject or focus observation",
      "specific task or completion observation",
      "specific suggestion or pattern note"
    ]
  }
}

Tone rules: professional and calm, no emojis, no exclamation marks, use specific numbers from the data, if data is minimal note what more data would reveal.`;

  let model;
  try {
    model = getGeminiFlash();
  } catch {
    return null;
  }

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch {
    return null;
  }

  let text: string;
  try {
    const candidate = result.response.candidates?.[0];
    if (!candidate) return null;

    const finishReason = candidate.finishReason;
    if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") return null;

    // Skip thinking parts — gemini-2.5-flash marks them with thought:true at runtime.
    // The SDK type doesn't declare this field so we cast through unknown.
    text = (candidate.content?.parts ?? [])
      .filter((p) => !(p as unknown as { thought?: boolean }).thought)
      .map((p) => ("text" in p ? (p as { text: string }).text : ""))
      .join("");

    if (!text) return null;
  } catch {
    return null;
  }

  return parseResponse(text);
}

function parseResponse(raw: string): AIInsightContent | null {
  // Strip markdown fences anywhere in the string, then extract the outermost JSON object
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    const parsed = JSON.parse(cleaned);

    if (
      typeof parsed?.dashboard?.headline === "string" &&
      Array.isArray(parsed?.dashboard?.insights) &&
      typeof parsed?.analytics?.summary === "string" &&
      Array.isArray(parsed?.analytics?.observations)
    ) {
      return {
        dashboard: {
          headline: parsed.dashboard.headline,
          insights: (parsed.dashboard.insights as string[]).slice(0, 4),
        },
        analytics: {
          summary:      parsed.analytics.summary,
          observations: (parsed.analytics.observations as string[]).slice(0, 5),
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}
