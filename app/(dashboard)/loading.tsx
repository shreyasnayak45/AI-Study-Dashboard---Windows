// Instant skeleton for the main dashboard page.
// Next.js shows this immediately on navigation while the server
// fetches tracker stats, task stats, and the AI insight cache.

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* ── Welcome header ────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-2.5">
          <div className="h-8 w-52 animate-pulse rounded-xl bg-white/[0.06]" />
          <div className="h-4 w-72 animate-pulse rounded-full bg-white/[0.03]" />
        </div>
        <div className="h-10 w-24 animate-pulse rounded-xl bg-white/[0.06]" />
      </div>

      {/* ── Stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-[104px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]"
          />
        ))}
      </div>

      {/* ── AI Insights card ──────────────────────────────────────── */}
      <div className="mt-6 h-[116px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]" />

      {/* ── Two-column lower section ──────────────────────────────── */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="mb-3 h-4 w-28 animate-pulse rounded-full bg-white/[0.04]" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
          ))}
        </div>
        <div className="space-y-2">
          <div className="mb-3 h-4 w-32 animate-pulse rounded-full bg-white/[0.04]" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
          ))}
        </div>
      </div>

      {/* ── Mini weekly chart ─────────────────────────────────────── */}
      <div className="mt-6">
        <div className="mb-3 h-4 w-28 animate-pulse rounded-full bg-white/[0.04]" />
        <div className="h-[100px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
      </div>

    </div>
  );
}
