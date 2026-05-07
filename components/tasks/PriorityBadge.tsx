import { cn } from "@/lib/utils";
import { getPriorityConfig, type Priority } from "@/lib/task-utils";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const p = getPriorityConfig(priority);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", p.bg, p.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />
      {p.label}
    </span>
  );
}
