"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Clock, StickyNote, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createSession, updateSession } from "@/app/actions/tracker";
import type { StudySession, SessionFormData } from "@/types";

// Quick-pick duration presets in minutes
const DURATION_PRESETS = [
  { label: "15m",   value: 15  },
  { label: "30m",   value: 30  },
  { label: "45m",   value: 45  },
  { label: "1h",    value: 60  },
  { label: "1.5h",  value: 90  },
  { label: "2h",    value: 120 },
  { label: "3h",    value: 180 },
];

// Common subjects for quick selection
const SUBJECT_SUGGESTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology",
  "History", "Literature", "Computer Science", "Economics",
];

interface SessionFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingSession: StudySession | null;
}

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EMPTY_FORM: SessionFormData = {
  subject: "",
  duration_minutes: 60,
  notes: "",
  studied_at: todayDateString(),
};

export function SessionForm({ isOpen, onClose, editingSession }: SessionFormProps) {
  const [form, setForm] = useState<SessionFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof SessionFormData, string>>>({});
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Sync form when switching between add/edit
  useEffect(() => {
    if (editingSession) {
      // Convert stored ISO timestamp back to YYYY-MM-DD for the date input
      const d = new Date(editingSession.studied_at);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      setForm({
        subject: editingSession.subject,
        duration_minutes: editingSession.duration_minutes,
        notes: editingSession.notes ?? "",
        studied_at: dateStr,
      });
    } else {
      setForm({ ...EMPTY_FORM, studied_at: todayDateString() });
    }
    setErrors({});
    setServerError("");
  }, [editingSession, isOpen]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.subject.trim()) next.subject = "Subject is required";
    if (form.duration_minutes < 1 || form.duration_minutes > 720)
      next.duration_minutes = "Duration must be 1–720 minutes";
    if (!form.studied_at) next.studied_at = "Date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setServerError("");

    startTransition(async () => {
      const result = editingSession
        ? await updateSession(editingSession.id, form)
        : await createSession(form);

      if (result.success) {
        onClose();
      } else {
        setServerError(result.error ?? "Something went wrong");
      }
    });
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
                <h2 className="text-base font-semibold text-white">
                  {editingSession ? "Edit session" : "Log study session"}
                </h2>
                <p className="mt-0.5 text-xs text-white/40">
                  {editingSession ? "Update the details below" : "Record what you studied today"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="space-y-6 p-6">

                {/* Subject */}
                <div className="space-y-3">
                  <Input
                    label="Subject"
                    placeholder="e.g. Mathematics"
                    icon={<BookOpen className="h-4 w-4" />}
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    error={errors.subject}
                  />
                  {/* Quick-pick chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {SUBJECT_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, subject: s })}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-all duration-150 ${
                          form.subject === s
                            ? "border-brand-500/40 bg-brand-500/10 text-brand-400"
                            : "border-white/[0.08] bg-white/[0.03] text-white/40 hover:border-white/[0.15] hover:text-white/65"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white/60">
                    <Clock className="mr-1.5 inline h-3.5 w-3.5" />
                    Duration
                  </label>

                  {/* Preset buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {DURATION_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setForm({ ...form, duration_minutes: p.value })}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                          form.duration_minutes === p.value
                            ? "border-brand-500/40 bg-brand-500/10 text-brand-400"
                            : "border-white/[0.08] bg-white/[0.03] text-white/40 hover:border-white/[0.15] hover:text-white/65"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom minutes input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={form.duration_minutes}
                      onChange={(e) =>
                        setForm({ ...form, duration_minutes: Number(e.target.value) || 1 })
                      }
                      className="w-24 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                    <span className="text-sm text-white/40">minutes</span>
                  </div>
                  {errors.duration_minutes && (
                    <p className="text-xs text-red-400">{errors.duration_minutes}</p>
                  )}
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-white/60">
                    <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
                    Date studied
                  </label>
                  <input
                    type="date"
                    value={form.studied_at}
                    max={todayDateString()}
                    onChange={(e) => setForm({ ...form, studied_at: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 [color-scheme:dark]"
                  />
                  {errors.studied_at && (
                    <p className="text-xs text-red-400">{errors.studied_at}</p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-white/60">
                    <StickyNote className="mr-1.5 inline h-3.5 w-3.5" />
                    Notes
                    <span className="ml-1 text-white/30">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="What did you cover? Any key takeaways?"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>

                {/* Server error */}
                <AnimatePresence>
                  {serverError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        {serverError}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer actions — sticky at bottom */}
              <div className="mt-auto flex items-center gap-3 border-t border-white/[0.06] px-6 py-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isPending}
                  className="flex-1"
                >
                  {editingSession ? "Save changes" : "Log session"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
