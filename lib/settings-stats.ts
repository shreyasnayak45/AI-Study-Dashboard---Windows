// SERVER-ONLY — do NOT import from any "use client" component.
//
// Two-layer caching strategy:
//   1. unstable_cache  — persists results across requests, per user, for 60 s.
//      Uses the service-role admin client (no cookies/headers) so it is safe
//      inside the cache boundary.  Tag: "profile-settings" — busted on updates.
//   2. React.cache     — deduplicates within a single render pass
//      (layout.tsx and settings/page.tsx both call this — one DB trip).
//
// Auth boundary: getCurrentUser() runs in the outer React.cache function;
// only the serialisable userId string enters the unstable_cache callback.

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { UserProfile, UserSettings } from "@/types";

// ─── Layer 1: persisted cross-request cache keyed by userId ───────────────────
// Uses getSupabaseAdmin() — no cookies(), safe inside unstable_cache.

const _fetchProfileAndSettings = unstable_cache(
  async (userId: string): Promise<{ profile: UserProfile | null; settings: UserSettings | null }> => {
    const sb = getSupabaseAdmin();
    const [{ data: profile }, { data: settings }] = await Promise.all([
      sb.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      sb.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    return {
      profile:  profile  as UserProfile  | null,
      settings: settings as UserSettings | null,
    };
  },
  ["profile-settings"],
  { revalidate: 60, tags: ["profile-settings"] }
);

// ─── Layer 2: React.cache for same-render deduplication ───────────────────────

export const getProfileAndSettings = cache(async (): Promise<{
  profile: UserProfile | null;
  settings: UserSettings | null;
}> => {
  const user = await getCurrentUser();
  if (!user) return { profile: null, settings: null };
  return _fetchProfileAndSettings(user.id);
});
