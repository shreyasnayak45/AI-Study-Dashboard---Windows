"use client";

/**
 * Thin client-component shell whose only job is to host the `ssr: false`
 * dynamic import. next/dynamic with ssr: false is not allowed in Server
 * Components — it must live in a "use client" file.
 *
 * The actual IntelligenceDashboard is loaded lazily in the browser, which
 * ensures all new Date().getHours() calls use the user's local timezone
 * instead of the server's UTC clock.
 */

import dynamic from "next/dynamic";
import type { RawSessionForIntelligence } from "@/types";

function Skeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[192, 160, 160].map((h, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]"
            style={{ height: h }}
          />
        ))}
      </div>
      <div className="h-28 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[156, 156].map((h, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02]"
            style={{ height: h }}
          />
        ))}
      </div>
    </div>
  );
}

const IntelligenceDashboard = dynamic(
  () =>
    import("@/components/intelligence/IntelligenceDashboard").then((m) => ({
      default: m.IntelligenceDashboard,
    })),
  { ssr: false, loading: () => <Skeleton /> }
);

interface Props {
  sessions: RawSessionForIntelligence[];
}

export function IntelligenceSection({ sessions }: Props) {
  return <IntelligenceDashboard sessions={sessions} />;
}
