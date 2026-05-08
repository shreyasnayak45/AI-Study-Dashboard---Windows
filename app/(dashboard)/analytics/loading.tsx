// Instant skeleton for the analytics page.
// Analytics is the heaviest page (3 charts + AI analysis + stats),
// so the loading skeleton is especially important here.

export default function AnalyticsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-8 space-y-2.5">
        <div className="h-8 w-36 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-4 w-60 animate-pulse rounded-full bg-white/[0.03]" />
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

      {/* ── Charts row 1: area + donut ─────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-[280px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02] lg:col-span-2" />
        <div className="h-[280px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
      </div>

      {/* ── Charts row 2: bar + performance ───────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-[280px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
        <div className="h-[280px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
      </div>

    </div>
  );
}
