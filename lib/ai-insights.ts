// SERVER-ONLY — imports next/headers and server-side modules.
// Do NOT import from any "use client" component.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getGeminiFlash, isAIEnabled } from "@/lib/gemini";
import { computeCurrentStreak } from "@/lib/analytics-utils";
import type {
  AIDailyInsight, AIInsightContent, AIIntelligenceInsight,
  TrackerStats, TaskStats, ProfileStats, RawSessionForIntelligence,
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
  rawSessions?: RawSessionForIntelligence[];  // optional; enables intelligence pass
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
  const { trackerStats, taskStats, profileStats, rawSessions } = ctx;

  // ── Base stats ──────────────────────────────────────────────────────────────
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

  // ── Intelligence context (when session data is available) ───────────────────
  let intelligenceBlock = "";
  let intelligenceSchema = "";

  if (rawSessions && rawSessions.length > 0) {
    const facts = computeIntelligenceFacts(rawSessions);

    // Recent sessions list (last 14, newest first)
    const recent14 = [...rawSessions]
      .slice(-14)
      .reverse()
      .map((s) => {
        const d   = new Date(s.studied_at);
        const day = d.toISOString().split("T")[0];
        const mins = s.duration_minutes;
        const subj = s.subject ? `, ${s.subject}` : "";
        return `  - ${day}: ${mins} min${subj}`;
      })
      .join("\n");

    const burnoutList = [
      facts.burnoutSignals.hasLongSession   && "session >3h in last 7 days",
      facts.burnoutSignals.hasLateNight     && "session after 10 PM (UTC) in last 7 days",
      facts.burnoutSignals.hasSharpDrop     && "study time dropped >50% vs previous week after a heavy period",
      facts.burnoutSignals.hasErratic       && "highly inconsistent session lengths (coefficient of variation >0.9)",
      facts.burnoutSignals.hasOverloadedDay && "single day with >6h of study in last 7 days",
    ].filter(Boolean).join("; ") || "none detected";

    intelligenceBlock = `

RECENT SESSIONS (last 14, newest first — UTC timestamps):
${recent14}

STUDY TIMING DISTRIBUTION (UTC-based; user's local times differ by timezone offset):
  Late night 0–4am:   ${facts.buckets.lateNight} min
  Early morning 5–8am: ${facts.buckets.earlyMorning} min
  Morning 9–11am:     ${facts.buckets.morning} min
  Afternoon 12–16pm:  ${facts.buckets.afternoon} min
  Evening 17–20pm:    ${facts.buckets.evening} min
  Night 21–23pm:      ${facts.buckets.night} min

COMPUTED CONSISTENCY SCORE: ${facts.score}/100
  Frequency ${facts.breakdown.frequency}/40 | Streak ${facts.breakdown.streak}/25 | Regularity ${facts.breakdown.regularity}/20 | Recent ${facts.breakdown.recentActivity}/15
  Active days in last 30: ${facts.activeDays30}

WEEKLY COMPARISON: ${(facts.thisWeekMinutes / 60).toFixed(1)}h this week vs ${(facts.lastWeekMinutes / 60).toFixed(1)}h last week

BURNOUT SIGNALS: ${burnoutList}`;

    intelligenceSchema = `,
  "intelligence": {
    "consistencyNarrative": {
      "label": "2-3 word label capturing their consistency style, e.g. 'Steady Builder', 'Night Owl', 'Sprint Learner', 'Weekend Warrior', 'Disciplined Scholar'",
      "tagline": "one natural sentence about their specific consistency pattern, referencing their data"
    },
    "burnoutAnalysis": {
      "level": "high or moderate or low — infer from the burnout signals and overall pattern",
      "headline": "3-5 word headline, e.g. 'Healthy Sustainable Pace' or 'Signs of Overload'",
      "insight": "2-3 sentences analysing their work/rest balance, referencing specific patterns from the data",
      "signals": ["natural-language description of each detected burnout signal — empty array if none"]
    },
    "personality": {
      "type": "creative 2-4 word personality name based on their timing and style, e.g. 'The Evening Deep-Diver', 'The Weekend Warrior', 'The Methodical Mornings'",
      "emoji": "single most fitting emoji for their study personality",
      "tagline": "punchy 4-6 word phrase that captures their style",
      "insight": "2-3 sentences about their study personality and how it serves them, referencing their timing data"
    },
    "weeklyNarrative": "2-3 sentence narrative comparing this week to last with specific hours, noting what the change means for their progress",
    "recommendations": [
      {
        "emoji": "relevant single emoji",
        "title": "3-5 word actionable title",
        "detail": "1-2 sentence specific recommendation derived directly from their session data, not generic advice"
      }
    ],
    "motivationalMessage": "1-2 sentence warm, personal encouragement specific to their current situation and data — not generic"
  }`;
  }

  const prompt = `You are an AI study coach and productivity analyst for a student study tracking app.

STUDENT OVERVIEW:
- Today's study time: ${todayStr}
- This week: ${weekHours}h
- Current streak: ${trackerStats.streak} day${trackerStats.streak !== 1 ? "s" : ""}
- All-time: ${profileStats.totalSessions} sessions, ${allTimeHours}h
- Recent subjects: ${topSubjects}
- Tasks: ${taskLine} | Completion rate: ${profileStats.taskCompletionRate}%${intelligenceBlock}

Return ONLY a valid JSON object. No markdown, no explanation, no extra text outside the JSON.
{
  "dashboard": {
    "headline": "3-5 word summary of current productivity state",
    "insights": [
      "specific, data-driven insight using exact numbers from the data",
      "specific, data-driven insight using exact numbers from the data",
      "specific, data-driven insight using exact numbers from the data"
    ]
  },
  "analytics": {
    "summary": "one sentence summarising overall study patterns using specific numbers",
    "observations": [
      "specific pattern or trend observation",
      "specific subject or focus observation",
      "specific task or completion observation",
      "specific suggestion or pattern note"
    ]
  }${intelligenceSchema}
}

Tone rules:
- Warm but professional — like a supportive coach, not a robot
- Use specific numbers from the data; never be generic or vague
- Intelligence labels/personalities should feel earned and creative, not default labels
- Burnout analysis should be empathetic, not alarmist
- If limited data (<5 sessions), acknowledge patterns are still forming
- Recommendations must be derived from THEIR actual data patterns, not generic study tips
- No emojis in text/narrative/insight/headline fields — only in the dedicated emoji fields
- No exclamation marks`;

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

    // Filter out thinking parts (gemini-2.5-flash internal reasoning tokens)
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

// ─── Server-side intelligence facts (UTC-based) ───────────────────────────────
// These power the Gemini prompt. The visual heatmap uses client-side local
// timezone (in IntelligenceDashboard, ssr:false); Gemini analysis uses UTC.

function computeIntelligenceFacts(sessions: RawSessionForIntelligence[]) {
  const now    = new Date();
  const MS_7D  =  7 * 24 * 60 * 60 * 1000;
  const MS_14D = 14 * 24 * 60 * 60 * 1000;
  const MS_30D = 30 * 24 * 60 * 60 * 1000;

  const recent7  = sessions.filter((s) => new Date(s.studied_at) >= new Date(now.getTime() - MS_7D));
  const recent14 = sessions.filter((s) => new Date(s.studied_at) >= new Date(now.getTime() - MS_14D));
  const recent30 = sessions.filter((s) => new Date(s.studied_at) >= new Date(now.getTime() - MS_30D));

  // ── Score components (identical logic to client-side computeIntelligence) ──
  const activeDays30 = new Set(recent30.map((s) => s.studied_at.split("T")[0])).size;
  const frequencyScore = Math.min(40, (activeDays30 / 30) * 40);

  const allDates = sessions.map((s) => s.studied_at.split("T")[0]);
  const streak = computeCurrentStreak(allDates);
  const streakScore = Math.min(25, (streak / 14) * 25);

  const dayMap30 = new Map<string, number>();
  for (const s of recent30) {
    const k = s.studied_at.split("T")[0];
    dayMap30.set(k, (dayMap30.get(k) ?? 0) + s.duration_minutes);
  }
  const dailyMins = Array.from(dayMap30.values());
  const mean30    = dailyMins.length > 0 ? dailyMins.reduce((a, b) => a + b, 0) / dailyMins.length : 0;
  const cv30      = mean30 > 0
    ? Math.sqrt(dailyMins.reduce((s, v) => s + (v - mean30) ** 2, 0) / dailyMins.length) / mean30
    : 0;
  const regularityScore = dailyMins.length < 3 ? 10 : Math.max(0, Math.min(20, 20 * (1 - cv30)));
  const recentScore     = Math.min(15, (recent7.length / 5) * 15);
  const score           = Math.max(0, Math.min(100, Math.round(frequencyScore + streakScore + regularityScore + recentScore)));

  // ── Burnout signals ─────────────────────────────────────────────────────────
  const prev7         = recent14.filter((s) => new Date(s.studied_at) < new Date(now.getTime() - MS_7D));
  const thisWeekMins  = recent7.reduce((a, s) => a + s.duration_minutes, 0);
  const lastWeekMins  = prev7.reduce((a, s) => a + s.duration_minutes, 0);
  const durations14   = recent14.map((s) => s.duration_minutes);
  const mean14        = durations14.length > 0 ? durations14.reduce((a, b) => a + b, 0) / durations14.length : 0;
  const cv14          = mean14 > 0
    ? Math.sqrt(durations14.reduce((s, v) => s + (v - mean14) ** 2, 0) / durations14.length) / mean14
    : 0;
  const dayMap7       = new Map<string, number>();
  for (const s of recent7) {
    const k = s.studied_at.split("T")[0];
    dayMap7.set(k, (dayMap7.get(k) ?? 0) + s.duration_minutes);
  }

  const burnoutSignals = {
    hasLongSession:   recent7.some((s) => s.duration_minutes > 180),
    hasLateNight:     recent7.some((s) => new Date(s.studied_at).getUTCHours() >= 22),
    hasSharpDrop:     lastWeekMins >= 300 && thisWeekMins < lastWeekMins * 0.5,
    hasErratic:       durations14.length >= 4 && cv14 > 0.9,
    hasOverloadedDay: Array.from(dayMap7.values()).some((m) => m > 360),
  };

  // ── UTC hour buckets ─────────────────────────────────────────────────────────
  const hourTotals = new Array<number>(24).fill(0);
  for (const s of sessions) {
    hourTotals[new Date(s.studied_at).getUTCHours()] += s.duration_minutes;
  }
  const buckets = {
    lateNight:    hourTotals.slice(0,  4).reduce((a, b) => a + b, 0),
    earlyMorning: hourTotals.slice(4,  8).reduce((a, b) => a + b, 0),
    morning:      hourTotals.slice(8, 12).reduce((a, b) => a + b, 0),
    afternoon:    hourTotals.slice(12, 17).reduce((a, b) => a + b, 0),
    evening:      hourTotals.slice(17, 21).reduce((a, b) => a + b, 0),
    night:        hourTotals.slice(21, 24).reduce((a, b) => a + b, 0),
  };

  // ── Weekly comparison ────────────────────────────────────────────────────────
  const dow        = now.getDay();
  const weekStart  = new Date(now);
  weekStart.setDate(now.getDate() - dow);
  weekStart.setHours(0, 0, 0, 0);
  const lastStart  = new Date(weekStart);
  lastStart.setDate(weekStart.getDate() - 7);

  const thisWeekMinutes = sessions
    .filter((s) => new Date(s.studied_at) >= weekStart)
    .reduce((a, s) => a + s.duration_minutes, 0);
  const lastWeekMinutes = sessions
    .filter((s) => { const d = new Date(s.studied_at); return d >= lastStart && d < weekStart; })
    .reduce((a, s) => a + s.duration_minutes, 0);

  return {
    score,
    breakdown: {
      frequency:      Math.round(frequencyScore),
      streak:         Math.round(streakScore),
      regularity:     Math.round(regularityScore),
      recentActivity: Math.round(recentScore),
    },
    activeDays30,
    burnoutSignals,
    signalCount: Object.values(burnoutSignals).filter(Boolean).length,
    buckets,
    thisWeekMinutes,
    lastWeekMinutes,
  };
}

// ─── Response parsing ─────────────────────────────────────────────────────────

function parseResponse(raw: string): AIInsightContent | null {
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    const parsed = JSON.parse(cleaned);

    if (
      typeof parsed?.dashboard?.headline !== "string" ||
      !Array.isArray(parsed?.dashboard?.insights) ||
      typeof parsed?.analytics?.summary !== "string" ||
      !Array.isArray(parsed?.analytics?.observations)
    ) {
      return null;
    }

    const content: AIInsightContent = {
      dashboard: {
        headline: parsed.dashboard.headline,
        insights: (parsed.dashboard.insights as string[]).slice(0, 4),
      },
      analytics: {
        summary:      parsed.analytics.summary,
        observations: (parsed.analytics.observations as string[]).slice(0, 5),
      },
    };

    // Attach intelligence if present and valid
    if (parsed.intelligence && isValidIntelligence(parsed.intelligence)) {
      content.intelligence = sanitiseIntelligence(parsed.intelligence);
    }

    return content;
  } catch {
    return null;
  }
}

function isValidIntelligence(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const cn = o.consistencyNarrative as Record<string, unknown> | undefined;
  const ba = o.burnoutAnalysis      as Record<string, unknown> | undefined;
  const pe = o.personality          as Record<string, unknown> | undefined;
  return (
    typeof cn?.label   === "string" &&
    typeof cn?.tagline === "string" &&
    typeof ba?.level   === "string" &&
    typeof ba?.headline === "string" &&
    typeof ba?.insight  === "string" &&
    Array.isArray(ba?.signals) &&
    typeof pe?.type    === "string" &&
    typeof pe?.emoji   === "string" &&
    typeof pe?.tagline === "string" &&
    typeof pe?.insight === "string" &&
    typeof o.weeklyNarrative    === "string" &&
    Array.isArray(o.recommendations) &&
    typeof o.motivationalMessage === "string"
  );
}

function sanitiseIntelligence(raw: Record<string, unknown>): AIIntelligenceInsight {
  const cn  = raw.consistencyNarrative as Record<string, string>;
  const ba  = raw.burnoutAnalysis      as Record<string, unknown>;
  const pe  = raw.personality          as Record<string, string>;
  const recs = (raw.recommendations as Array<Record<string, string>>)
    .slice(0, 5)
    .map((r) => ({
      emoji:  String(r.emoji  ?? ""),
      title:  String(r.title  ?? ""),
      detail: String(r.detail ?? ""),
    }));

  const rawLevel = String(ba.level ?? "").toLowerCase();
  const level: AIIntelligenceInsight["burnoutAnalysis"]["level"] =
    rawLevel === "high" ? "high" : rawLevel === "moderate" ? "moderate" : "low";

  return {
    consistencyNarrative: {
      label:   String(cn.label   ?? ""),
      tagline: String(cn.tagline ?? ""),
    },
    burnoutAnalysis: {
      level,
      headline: String(ba.headline ?? ""),
      insight:  String(ba.insight  ?? ""),
      signals:  (ba.signals as string[]).map(String).slice(0, 5),
    },
    personality: {
      type:    String(pe.type    ?? ""),
      emoji:   String(pe.emoji   ?? ""),
      tagline: String(pe.tagline ?? ""),
      insight: String(pe.insight ?? ""),
    },
    weeklyNarrative:     String(raw.weeklyNarrative    ?? ""),
    recommendations:     recs,
    motivationalMessage: String(raw.motivationalMessage ?? ""),
  };
}
