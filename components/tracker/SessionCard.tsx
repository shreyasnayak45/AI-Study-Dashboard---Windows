"use client";

import { memo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Clock, FileText, AlertTriangle } from "lucide-react";
import { SubjectBadge } from "./SubjectBadge";
import { deleteSession } from "@/app/actions/tracker";
import { formatDuration, formatStudyDate } from "@/lib/tracker-utils";
import type { StudySession } from "@/types";

interface SessionCardProps {
  session: StudySession;
  onEdit: (session: StudySession) => void;
}

export const SessionCard = memo(function SessionCard({ session, onEdit }: SessionCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState("");

  function handleDelete() {
    setDeleteError("");
    startTransition(async () => {
      const result = await deleteSession(session.id);
      if (!result.success) {
        setDeleteError(result.error ?? "Delete failed");
        setConfirmDelete(false);
      }
      // On success revalidatePath re-renders the page — card disappears automatically
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition-colors hover:border-white/[0.10] hover:bg-white/[0.05]"
    >
      {/* Top row: subject badge + actions */}
      <div className="flex items-start justify-between gap-3">
        <SubjectBadge subject={session.subject} />

        {/* Action buttons — visible on hover */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(session)}
            className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/70"
            title="Edit session"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
            title="Delete session"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Duration + date */}
      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-white">
          <Clock className="h-4 w-4 text-white/30" />
          <span className="text-sm font-semibold">{formatDuration(session.duration_minutes)}</span>
        </div>
        <span className="text-sm text-white/35">{formatStudyDate(session.studied_at)}</span>
      </div>

      {/* Notes */}
      {session.notes && (
        <div className="mt-2.5 flex items-start gap-1.5">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/25" />
          <p className="line-clamp-2 text-xs text-white/40">{session.notes}</p>
        </div>
      )}

      {/* Inline delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="flex-1 text-xs text-red-300">Delete this session?</span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                {isPending ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-md px-2 py-1 text-xs text-white/40 transition-colors hover:text-white/60"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {deleteError && (
        <p className="mt-2 text-xs text-red-400">{deleteError}</p>
      )}
    </motion.div>
  );
});
