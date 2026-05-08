// Instant skeleton for the tracker page.

export default function TrackerLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-2.5">
          <div className="h-8 w-44 animate-pulse rounded-xl bg-white/[0.06]" />
          <div className="h-4 w-64 animate-pulse rounded-full bg-white/[0.03]" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="h-10 w-24 animate-pulse rounded-xl bg-white/[0.06]" />
          <div className="h-10 w-28 animate-pulse rounded-xl bg-white/[0.06]" />
        </div>
      </div>

      {/* ── Session grid ──────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-[116px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]"
          />
        ))}
      </div>

    </div>
  );
}
