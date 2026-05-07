"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskFormData, ActionResult } from "@/types";

function revalidateTaskPaths() {
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function createTask(data: TaskFormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase.from("tasks").insert({
    user_id:     user.id,
    title:       data.title.trim(),
    description: data.description.trim() || null,
    priority:    data.priority,
    due_date:    data.due_date || null,
    completed:   false,
  });

  if (error) return { success: false, error: error.message };
  revalidateTaskPaths();
  return { success: true };
}

export async function updateTask(id: string, data: TaskFormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({
      title:       data.title.trim(),
      description: data.description.trim() || null,
      priority:    data.priority,
      due_date:    data.due_date || null,
      updated_at:  new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidateTaskPaths();
  return { success: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidateTaskPaths();
  return { success: true };
}

export async function toggleTask(id: string, completed: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("tasks")
    .update({ completed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidateTaskPaths();
  return { success: true };
}
