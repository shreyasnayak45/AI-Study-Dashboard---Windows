// Instant skeleton for the profile page.

export default function ProfileLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-8 space-y-2.5">
        <div className="h-8 w-28 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="h-4 w-52 animate-pulse rounded-full bg-white/[0.03]" />
      </div>

      {/* ── Two-column layout ─────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Identity card */}
          <div className="h-[320px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02] lg:col-span-2" />
          {/* Stats card */}
          <div className="h-[320px] animate-pulse rounded-2xl border border-white/[0.04] bg-white/[0.02] lg:col-span-3" />
        </div>
      </div>

    </div>
  );
}
