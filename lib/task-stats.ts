// SERVER-ONLY — imports next/headers via lib/supabase/server.
// Do NOT import from any "use client" component.
//
// Wrapped in React.cache: deduplicates Supabase calls within a single
// server render pass (dashboard + profile page both need task counts).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isOverdue, isDueToday } from "@/lib/task-utils";
import type { Task, TaskStats } from "@/types";

/** Fetch all tasks for the logged-in user, ordered by: incomplete first, then due_date asc, then created_at desc. */
export const getTasksForManager = cache(async (): Promise<Task[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("completed",  { ascending: true  })
    .order("due_date",   { ascending: true,  nullsFirst: false })
    .order("created_at", { ascending: false });

  return error || !data ? [] : (data as Task[]);
});

/** Fetch aggregated stats + upcoming tasks for the dashboard. */
export const getTaskStats = cache(async (): Promise<TaskStats> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, description, completed, priority, due_date, created_at, updated_at, user_id")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const tasks: Task[] = error || !data ? [] : (data as Task[]);

  const completed = tasks.filter((t) => t.completed).length;
  const active    = tasks.filter((t) => !t.completed);
  const overdue   = active.filter((t) => isOverdue(t.due_date)).length;
  const dueToday  = active.filter((t) => isDueToday(t.due_date)).length;

  const upcomingTasks = active
    .filter((t) => t.due_date !== null)
    .slice(0, 5);

  return {
    total:    tasks.length,
    completed,
    active:   active.length,
    overdue,
    dueToday,
    upcomingTasks,
  };
});
