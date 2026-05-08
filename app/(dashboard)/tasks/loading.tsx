// Instant skeleton for the tasks page.

export default function TasksLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="space-y-2.5">
          <div className="h-8 w-44 animate-pulse rounded-xl bg-white/[0.06]" />
          <div className="h-4 w-36 animate-pulse rounded-full bg-white/[0.03]" />
        </div>
        <div className="h-10 w-24 animate-pulse rounded-xl bg-white/[0.06]" />
      </div>

      {/* ── Filter tab row ────────────────────────────────────────── */}
      <div className="mb-5 flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-16 animate-pulse rounded-full bg-white/[0.04]" />
        ))}
      </div>

      {/* ── Task list ─────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]"
          />
        ))}
      </div>

    </div>
  );
}
