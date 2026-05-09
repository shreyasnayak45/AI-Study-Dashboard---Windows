"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SessionFormData, ActionResult } from "@/types";

/** Convert a YYYY-MM-DD date string to a full ISO timestamp at noon local time.
 *  Using noon avoids timezone-edge issues where midnight flips to the previous day.
 *  ⚠️  The resulting value is ONLY suitable for date-level comparisons (split("T")[0]).
 *      Never call .getHours() on it — it will return ~12 (or a timezone-shifted value),
 *      not the actual time the user studied. Use session_start_time for that. */
function toISOTimestamp(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

/**
 * Build a real session_start_time ISO string from the user's inputs.
 * Returns null when no start time was provided (majority of manual sessions).
 *
 * @param dateStr  YYYY-MM-DD  (the date the user studied)
 * @param timeStr  HH:MM | "" | undefined  (from the optional time input)
 */
function buildSessionStartTime(dateStr: string, timeStr?: string): string | null {
  if (!timeStr) return null;
  // Combine the date and the HH:MM time the user entered.
  // new Date("YYYY-MM-DDTHH:MM:00") parses in LOCAL time — correct for the user's timezone.
  const d = new Date(`${dateStr}T${timeStr}:00`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createSession(data: SessionFormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("study_sessions").insert({
    user_id:            user.id,
    subject:            data.subject.trim(),
    duration_minutes:   data.duration_minutes,
    notes:              data.notes.trim() || null,
    studied_at:         toISOTimestamp(data.studied_at),
    // session_start_time is only set when the user explicitly provides a time.
    // NULL for date-only manual sessions — those cannot feed time-of-day analysis.
    session_start_time: buildSessionStartTime(data.studied_at, data.session_start_time),
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/tracker");
  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}

export async function updateSession(
  id: string,
  data: SessionFormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("study_sessions")
    .update({
      subject:            data.subject.trim(),
      duration_minutes:   data.duration_minutes,
      notes:              data.notes.trim() || null,
      studied_at:         toISOTimestamp(data.studied_at),
      session_start_time: buildSessionStartTime(data.studied_at, data.session_start_time),
    })
    .eq("id", id)
    .eq("user_id", user.id); // belt-and-suspenders alongside RLS

  if (error) return { success: false, error: error.message };

  revalidatePath("/tracker");
  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}

export async function saveLiveSession(data: {
  subject:          string;
  duration_minutes: number;
  started_at:       number; // Unix ms — the real session start time from the browser
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // For live sessions, `started_at` IS the real session start time.
  // Both `studied_at` and `session_start_time` get this real timestamp.
  const startIso = new Date(data.started_at).toISOString();

  const { error } = await supabase.from("study_sessions").insert({
    user_id:            user.id,
    subject:            data.subject.trim(),
    duration_minutes:   data.duration_minutes,
    notes:              null,
    studied_at:         startIso,
    session_start_time: startIso, // always present for live sessions
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/tracker");
  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}

export async function deleteSession(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/tracker");
  revalidatePath("/");
  revalidatePath("/analytics");
  return { success: true };
}
