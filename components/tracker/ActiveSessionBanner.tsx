"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Square } from "lucide-react";
import { SubjectBadge } from "./SubjectBadge";
import { getActiveSession, clearLiveSession, LIVE_SESSION_EVENT } from "@/lib/live-session";
import { saveLiveSession } from "@/app/actions/tracker";
import type { ActiveSession } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(totalSeconds: number): string {
  const h  = Math.floor(totalSeconds / 3600);
  const m  = Math.floor((totalSeconds % 3600) / 60);
  const s  = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActiveSessionBanner() {
  const router = useRouter();

  const [session,    setSession]    = useState<ActiveSession | null>(null);
  const [elapsed,    setElapsed]    = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [saveError,  setSaveError]  = useState("");
  const [isPending,  startTransition] = useTransition();

  // Sync from localStorage whenever a session starts/stops (same or other tab)
  const sync = useCallback(() => {
    setSession(getActiveSession());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(LIVE_SESSION_EVENT, sync);
    window.addEventListener("storage", sync);         // cross-tab sync
    return () => {
      window.removeEventListener(LIVE_SESSION_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  // Tick — recomputes from startedAt every second for drift-free accuracy
  useEffect(() => {
    if (!session) return;
    const tick = () => setElapsed(Math.floor((Date.now() - session.startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  // Reset confirm state whenever the session identity changes
  useEffect(() => {
    setConfirming(false);
    setSaveError("");
  }, [session]);

  function handleStop() {
    if (!session) return;
    setSaveError("");
    startTransition(async () => {
      const durationMinutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60_000));
      const result = await saveLiveSession({
        subject:          session.subject,
        duration_minutes: durationMinutes,
        started_at:       session.startedAt,
      });
      if (result.success) {
        clearLiveSession();           // fires LIVE_SESSION_EVENT → sync() → session = null
        setConfirming(false);
        router.refresh();             // re-fetches the current Server Component so stats update instantly
      } else {
        setSaveError(result.error ?? "Failed to save session");
      }
    });
  }

  function handleDiscard() {
    clearLiveSession();
    setConfirming(false);
  }

  return (
    <AnimatePresence>
      {session && (
        <motion.div
          key="banner"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", damping: 26, stiffness: 350 }}
          // Mobile: full-width bottom bar; desktop: compact card bottom-right
          className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-4 sm:left-auto sm:right-4 sm:w-[22rem]"
        >
          <div className="overflow-hidden border-t border-white/[0.10] bg-surface-800/95 shadow-2xl backdrop-blur-xl sm:rounded-2xl sm:border sm:border-white/[0.10]">
            <AnimatePresence mode="wait">

              {/* ── Active timer state ─────────────────────────── */}
              {!confirming && (
                <motion.div
                  key="timer"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="px-4 py-3.5 sm:px-5 sm:py-4"
                >
                  {/* Row 1: live dot + subject */}
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">
                      Live
                    </span>
                    <div className="ml-1">
                      <SubjectBadge subject={session.subject} />
                    </div>
                  </div>

                  {/* Row 2: timer + stop button */}
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <p className="font-mono text-3xl font-semibold tabular-nums tracking-tight text-white">
                      {formatElapsed(elapsed)}
                    </p>
                    <button
                      onClick={() => setConfirming(true)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_16px_rgba(59,130,246,0.3)] transition-all hover:bg-brand-600 hover:shadow-[0_0_22px_rgba(59,130,246,0.4)] disabled:opacity-50"
                    >
                      <Square className="h-3 w-3 fill-current" />
                      Stop
                    </button>
                  </div>

                  {saveError && (
                    <p className="mt-2 text-xs text-red-400">{saveError}</p>
                  )}
                </motion.div>
              )}

              {/* ── Confirm-stop state ─────────────────────────── */}
              {confirming && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="px-4 py-4 sm:px-5"
                >
                  <p className="text-sm font-semibold text-white">Stop this session?</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    <span className="tabular-nums">{formatElapsed(elapsed)}</span>
                    {" "}will be saved for{" "}
                    <span className="text-white/65">{session.subject}</span>
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setConfirming(false)}
                      disabled={isPending}
                      className="flex-1 rounded-xl border border-white/[0.08] py-2 text-xs font-medium text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white/75 disabled:opacity-40"
                    >
                      Keep going
                    </button>
                    <button
                      onClick={handleStop}
                      disabled={isPending}
                      className="flex-1 rounded-xl bg-brand-500 py-2 text-xs font-semibold text-white shadow-[0_0_12px_rgba(59,130,246,0.25)] transition-all hover:bg-brand-600 disabled:opacity-50"
                    >
                      {isPending ? "Saving…" : "Save & stop"}
                    </button>
                  </div>

                  <button
                    onClick={handleDiscard}
                    disabled={isPending}
                    className="mt-2.5 w-full py-1 text-xs text-white/25 transition-colors hover:text-red-400/70 disabled:opacity-40"
                  >
                    Discard without saving
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
