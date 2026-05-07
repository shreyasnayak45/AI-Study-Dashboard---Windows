"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

/** Called by AvatarUpload (client) after it uploads directly to Supabase Storage. */
export async function updateAvatarUrl(url: string): Promise<ActionResult> {
  const sb = await createClient();
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return { success: false, error: "Not authenticated" };

  const { error } = await sb.from("profiles").upsert(
    {
      user_id:    user.id,
      avatar_url: url,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");   // refresh layout so sidebar avatar updates
  revalidatePath("/profile");
  revalidatePath("/settings");
  return { success: true };
}
