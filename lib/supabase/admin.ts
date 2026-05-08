// SERVER-ONLY — never import from "use client" components.
//
// Service-role Supabase client: uses the service-role key instead of the
// user's auth cookie, so it has NO dependency on next/headers, cookies(), or
// any request-scoped API.  This makes it safe to call from inside
// unstable_cache callbacks (which run outside the normal request context).
//
// SECURITY: This client BYPASSES Row Level Security.
// Every query MUST include an explicit .eq("user_id", userId) filter.
// The userId must come from a trusted, already-authenticated source
// (e.g. getCurrentUser() called outside the cache boundary).

import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing env vars for Supabase admin client. " +
      "Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to " +
      ".env.local and your Vercel environment variables."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  });
}
