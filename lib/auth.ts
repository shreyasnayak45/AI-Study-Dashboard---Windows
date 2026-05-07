// SERVER-ONLY — imports next/headers via lib/supabase/server.
// Wrapped in React.cache so auth.getUser() is only called ONCE per server
// render pass, even when multiple server components need the current user.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return user;
});
