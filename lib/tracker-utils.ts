// Pure, client-safe utility functions for the tracker.
// NO server imports — this file is safe to import from any component.

/**
 * Format a live-session elapsed seconds value → "mm:ss" or "h:mm:ss".
 * Used by ActiveSessionBanner and LiveLogButton.
 */
export function formatElapsed(totalSeconds: number): string {
  const h  = Math.floor(totalSeconds / 3600);
  const m  = Math.floor((totalSeconds % 3600) / 60);
  const s  = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Format minutes → "2h 30m", "45m", "1h" etc. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Format an ISO timestamp → "Today", "Yesterday", or "May 7" */
export function formatStudyDate(isoString: string): string {
  const d = new Date(isoString);
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sessionDay = startOfDay(d);

  if (sessionDay.getTime() === today.getTime()) return "Today";
  if (sessionDay.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
