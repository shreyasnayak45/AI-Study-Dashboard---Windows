// Types shared across the weekly-report pipeline.
// Pure — no server imports.

export interface WeeklySubject {
  name:       string;
  minutes:    number;
  percentage: number;  // 0–100, share of the week's total minutes
  sessions:   number;
}

export interface WeeklyDayStats {
  date:      string;  // YYYY-MM-DD
  dayName:   string;  // "Mon" | "Tue" | …
  shortDate: string;  // "May 3"
  minutes:   number;
}

export type FocusWindow =
  | "pre-dawn"      // 00–05 UTC
  | "early-morning" // 05–08 UTC (not used yet — reserved)
  | "morning"       // 06–11 UTC
  | "afternoon"     // 12–16 UTC
  | "evening"       // 17–20 UTC
  | "night";        // 21–23 UTC

// ─── Computed from raw sessions ───────────────────────────────────────────────

export interface WeeklyStats {
  /** Inclusive start/end of the 7-day window (YYYY-MM-DD). */
  weekStart: string;
  weekEnd:   string;

  totalMinutes:         number;
  activeDays:           number;  // days with ≥1 session
  sessionCount:         number;
  avgSessionMinutes:    number;
  longestSessionMinutes: number;

  /** Previous 7 days — used for week-over-week delta. */
  prevWeekMinutes: number;
  /**
   * Percentage change vs previous week.
   * null when there was no activity in the prior window (first-week case).
   */
  weekOverWeekPct: number | null;

  /** Day with most study time this week. null if no sessions. */
  bestDay: { dayName: string; date: string; minutes: number } | null;

  /** ≤5 subjects, sorted by minutes desc. */
  subjects: WeeklySubject[];

  /** One entry per day in the week, Mon → Sun. */
  dailyBreakdown: WeeklyDayStats[];

  currentStreak: number;

  // Timing (session_start_time) — always present but only displayed when true.
  hasTimingData:     boolean;
  bestFocusWindow:   FocusWindow | null;
  timedSessionCount: number;
}

// ─── Gemini output ────────────────────────────────────────────────────────────

export interface GeminiWeeklyInsight {
  headline:            string;  // 4–7 evocative words — the "title" of their week
  narrative:           string;  // 2–3 sentences, story-driven, references numbers
  insight:             string;  // 1–2 sentences specific behavioural observation
  recommendation:      string;  // 1–2 sentences concrete action for next week
  motivationalEnding:  string;  // 1–2 warm sentences (not fake quotes)
  nextWeekTarget:      string;  // one specific, measurable goal
}

// ─── Final report ─────────────────────────────────────────────────────────────

export interface WeeklyReport {
  stats:       WeeklyStats;
  ai:          GeminiWeeklyInsight;
  userEmail:   string;
  generatedAt: string;  // ISO timestamp
}
