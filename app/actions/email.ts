"use server";

import { getCurrentUser } from "@/lib/auth";
import { sendTestEmail, sendWeeklyReportEmail } from "@/lib/email";
import { generateWeeklyReport } from "@/lib/weekly-report/generator";
import type { ActionResult } from "@/types";

/**
 * Server action: send the infrastructure test email.
 * Authentication required — triggered user's email is included in the payload.
 */
export async function triggerTestEmail(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  return sendTestEmail(user.email ?? "unknown");
}

/**
 * Server action: generate and send a weekly study report email.
 *
 * Full pipeline:
 *   1. Fetch all sessions from Supabase
 *   2. Compute WeeklyStats (last 7 days vs previous 7 days)
 *   3. Call Gemini for narrative insights (~5s with thinking disabled)
 *   4. Build + send HTML email via Resend
 *
 * Returns a user-facing error string if any step fails.
 * The specific cause is always logged server-side.
 */
export async function triggerWeeklyReport(): Promise<ActionResult & { preview?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const report = await generateWeeklyReport();

  if (!report) {
    // generateWeeklyReport logs the specific cause server-side.
    // The most common case here is "no sessions in the last 7 days".
    return {
      success: false,
      error: "Could not generate report — make sure you have study sessions in the last 7 days.",
    };
  }

  const result = await sendWeeklyReportEmail(report);

  if (!result.success) return result;

  // Return a short preview line so the UI can show what was generated.
  const preview = `"${report.ai.headline}" · ${report.stats.activeDays} active days · ${(report.stats.totalMinutes / 60).toFixed(1)}h`;
  return { success: true, preview };
}
