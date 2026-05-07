// Pure, client-safe utilities for the task manager.
// NO server imports — safe to use in any component or context.

export type Priority = "low" | "medium" | "high";

// ─── Priority config ─────────────────────────────────────────────────────────

interface PriorityConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  ring: string;
}

const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  low: {
    label: "Low",
    bg:     "bg-emerald-500/10",
    text:   "text-emerald-400",
    border: "border-emerald-500/20",
    dot:    "bg-emerald-400",
    ring:   "ring-emerald-500/30",
  },
  medium: {
    label: "Medium",
    bg:     "bg-yellow-500/10",
    text:   "text-yellow-400",
    border: "border-yellow-500/20",
    dot:    "bg-yellow-400",
    ring:   "ring-yellow-500/30",
  },
  high: {
    label: "High",
    bg:     "bg-red-500/10",
    text:   "text-red-400",
    border: "border-red-500/20",
    dot:    "bg-red-400",
    ring:   "ring-red-500/30",
  },
};

export function getPriorityConfig(priority: Priority): PriorityConfig {
  return PRIORITY_CONFIG[priority];
}

// ─── Due-date helpers ────────────────────────────────────────────────────────

/** "YYYY-MM-DD" → midnight local Date */
function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayMidnight(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return parseDateStr(dueDate) < todayMidnight();
}

export function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return parseDateStr(dueDate).getTime() === todayMidnight().getTime();
}

export function isDueSoon(dueDate: string | null, days = 3): boolean {
  if (!dueDate) return false;
  const d = parseDateStr(dueDate);
  const limit = new Date(todayMidnight());
  limit.setDate(limit.getDate() + days);
  return d >= todayMidnight() && d <= limit;
}

/** Human-friendly label for a due date, e.g. "Today", "Tomorrow", "Overdue", "May 12" */
export function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null;
  const d = parseDateStr(dueDate);
  const today = todayMidnight();
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);

  if (diff < 0)  return diff === -1 ? "Yesterday" : `${Math.abs(diff)} days ago`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** CSS colour classes for the due-date chip based on urgency. */
export function dueDateStyle(
  dueDate: string | null,
  completed: boolean
): { bg: string; text: string } {
  if (completed || !dueDate) return { bg: "bg-white/[0.05]", text: "text-white/35" };
  if (isOverdue(dueDate))    return { bg: "bg-red-500/10",    text: "text-red-400"   };
  if (isDueToday(dueDate))   return { bg: "bg-orange-500/10", text: "text-orange-400" };
  if (isDueSoon(dueDate, 2)) return { bg: "bg-yellow-500/10", text: "text-yellow-400" };
  return { bg: "bg-white/[0.05]", text: "text-white/40" };
}

/** Today as "YYYY-MM-DD" — useful for defaulting form inputs. */
export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
