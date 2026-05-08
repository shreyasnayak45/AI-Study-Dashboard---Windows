"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getActiveSession, startLiveSession } from "@/lib/live-session";

const SUBJECT_SUGGESTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "History", "Literature", "Computer Science", "Economics",
];

interface LiveSessionPanelProps {
  isOpen:  boolean;
  onClose: () => void;
}

export function LiveSessionPanel({ isOpen, onClose }: LiveSessionPanelProps) {
  const [subject, setSubject] = useState("");
  const [error,   setError]   = useState("");

  function handleStart() {
    if (!subject.trim()) {
      setError("Please enter a subject");
      return;
    }
    // Guard: prevent a second concurrent session
    const existing = getActiveSession();
    if (existing) {
      setError(`Session already active: ${existing.subject}`);
      return;
    }
    startLiveSession(subject.trim());
    setSubject("");
    setError("");
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Slide-over panel */}
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/[0.08] bg-surface-800 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-white">Live Study Session</h2>
                <p className="mt-0.5 text-xs text-white/40">Track your time in real time</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col overflow-y-auto p-6">

              {/* Live badge */}
              <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-xs text-emerald-400/80">
                  Timer starts the moment you click Start Session
                </span>
              </div>

              {/* Subject input */}
              <div className="space-y-3">
                <Input
                  label="What are you studying?"
                  placeholder="e.g. Mathematics"
                  icon={<BookOpen className="h-4 w-4" />}
                  value={subject}
                  autoFocus
                  onChange={(e) => { setSubject(e.target.value); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleStart(); }}
                  error={error}
                />

                {/* Quick-pick chips */}
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECT_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSubject(s); setError(""); }}
                      className={`rounded-full border px-2.5 py-1 text-xs transition-all duration-150 ${
                        subject === s
                          ? "border-brand-500/40 bg-brand-500/10 text-brand-400"
                          : "border-white/[0.08] bg-white/[0.03] text-white/40 hover:border-white/[0.15] hover:text-white/65"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-auto pt-8">
                <Button className="w-full" size="lg" onClick={handleStart}>
                  <Play className="h-4 w-4" />
                  Start Session
                </Button>
                <p className="mt-3 text-center text-xs text-white/25">
                  A floating timer will stay visible while you study across any page
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
