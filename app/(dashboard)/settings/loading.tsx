// Instant skeleton for the settings page.

export default function SettingsLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-8 space-y-2.5">
        <div className="h-8 w-28 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-4 w-60 animate-pulse rounded-full bg-white/[0.03]" />
      </div>

      {/* ── Settings sections ─────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl space-y-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="h-[180px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
          </div>
        ))}
      </div>

    </div>
  );
}
