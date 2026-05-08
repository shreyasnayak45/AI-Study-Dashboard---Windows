/**
 * getSiteUrl — canonical base URL for the current deployment.
 *
 * Used everywhere we need to build an absolute URL for OAuth redirects.
 * Works correctly on the server (during SSR / server actions) and in the
 * browser, in both local development and Vercel production.
 *
 * Resolution order
 * ────────────────
 * 1. NEXT_PUBLIC_SITE_URL   — set this once in your Vercel project's
 *                             Environment Variables to your production domain,
 *                             e.g. https://studyflow.vercel.app
 *                             Leave it unset for local dev; the fallbacks handle it.
 *
 * 2. window.location.origin — browser-side fallback.  When no env var is set
 *                             (local dev), the browser already knows the right
 *                             host, so we read it directly.
 *
 * 3. http://localhost:3000  — server-side fallback for local dev (SSR / build).
 *
 * Why not window.location.origin everywhere?
 * ──────────────────────────────────────────
 * Supabase validates the `redirectTo` parameter against a per-project
 * "Redirect URL" allowlist.  If the URL isn't on the list, Supabase ignores
 * it and falls back to the project's "Site URL" — which is often still
 * http://localhost:3000, causing the production OAuth redirect bug.
 *
 * Using an explicit env var forces the value to match what you add to the
 * Supabase allowlist, eliminating the mismatch entirely.
 */
export function getSiteUrl(): string {
  // ── 1. Explicit env var (server + client, preferred in production) ────────
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    // Strip trailing slash, ensure https:// prefix
    const trimmed = configured.replace(/\/$/, "");
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  }

  // ── 2. Browser fallback (client-side only) ────────────────────────────────
  // The user is already on the correct host — just read it.
  // Covers local dev (http://localhost:3000) without any extra config.
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // ── 3. Server-side local dev fallback ────────────────────────────────────
  return "http://localhost:3000";
}
