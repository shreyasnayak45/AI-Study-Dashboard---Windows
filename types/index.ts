import type { User } from "@supabase/supabase-js";

export type { User };

// ─── Study Tracker ────────────────────────────────────────────────────────────

export interface StudySession {
  id: string;
  user_id: string;
  subject: string;
  duration_minutes: number;
  notes: string | null;
  studied_at: string;   // ISO 8601 timestamptz
  created_at: string;
}

export interface SessionFormData {
  subject: string;
  duration_minutes: number;
  notes: string;
  studied_at: string;   // YYYY-MM-DD
}

export interface TrackerStats {
  todayMinutes: number;
  weekMinutes: number;
  streak: number;
  totalSessions: number;
  recentSessions: StudySession[];
  miniData: DailyStudyData[];  // last 7 days — reused from already-fetched sessions
}

// ─── Task Manager ─────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: "low" | "medium" | "high";
  due_date: string | null;   // DATE type → Supabase returns "YYYY-MM-DD"
  created_at: string;
  updated_at: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  due_date: string;          // "YYYY-MM-DD" or "" (empty = no due date)
}

export interface TaskStats {
  total: number;
  completed: number;
  active: number;
  overdue: number;
  dueToday: number;
  upcomingTasks: Task[];     // incomplete tasks, due soonest first, max 5
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface DailyStudyData {
  date: string;    // "YYYY-MM-DD"
  label: string;   // "May 5"
  minutes: number;
  hours: number;   // decimal e.g. 1.5
}

export interface WeeklyStudyData {
  weekStart: string;  // "YYYY-MM-DD"
  label: string;      // "May 5"
  minutes: number;
  hours: number;
}

export interface SubjectData {
  subject: string;
  minutes: number;
  hours: number;
  percentage: number;
  sessions: number;
}

export interface Insight {
  key: string;
  icon: "flame" | "target" | "trending-up" | "star" | "calendar" | "book-open";
  color: "brand" | "emerald" | "orange" | "violet" | "red";
  title: string;
  description: string;
}

export interface AnalyticsStats {
  totalMinutes: number;
  totalSessions: number;
  avgDailyMinutes: number;
  streak: number;
  longestStreak: number;
  bestDayMinutes: number;
  bestDayDate: string | null;
  activeDays: number;
  daily: DailyStudyData[];      // last 30 days
  weekly: WeeklyStudyData[];    // last 12 weeks
  subjects: SubjectData[];
  taskCompletionRate: number;   // 0–100
  tasksCompleted: number;
  tasksTotal: number;
}

// ─── Profile stats (lightweight — avoids fetching full 30-day chart data) ────

export interface ProfileStats {
  totalSessions: number;
  totalMinutes: number;
  streak: number;
  taskCompletionRate: number;
  tasksTotal: number;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  daily_goal_minutes: number;
  preferred_session_minutes: number;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type ProfileFormData = {
  display_name: string;
};

export type SettingsFormData = {
  daily_goal_minutes: number;
  preferred_session_minutes: number;
  notifications_enabled: boolean;
};

// ─── AI Insights ─────────────────────────────────────────────────────────────

export interface AIInsightDashboard {
  headline: string;       // "3-5 word summary"
  insights: string[];     // 2-3 concise bullets
}

export interface AIInsightAnalytics {
  summary: string;        // 1-sentence pattern overview
  observations: string[]; // 3-4 detailed observations
}

export interface AIInsightContent {
  dashboard: AIInsightDashboard;
  analytics:  AIInsightAnalytics;
}

export interface AIDailyInsight {
  id:           string;
  user_id:      string;
  insight_date: string;         // "YYYY-MM-DD"
  content:      AIInsightContent;
  generated_at: string;         // ISO timestamptz
}

// ─── Live session ─────────────────────────────────────────────────────────────

export interface ActiveSession {
  subject:   string;
  startedAt: number; // Unix ms — mirrors lib/live-session.ts
}

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean;
  error?: string;
}

export interface ExportResult extends ActionResult {
  csv?: string;
}
