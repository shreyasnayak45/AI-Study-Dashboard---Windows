"use client";

import { memo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Calendar, AlignLeft, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "./PriorityBadge";
import { toggleTask, deleteTask } from "@/app/actions/tasks";
import { formatDueDate, dueDateStyle, isOverdue } from "@/lib/task-utils";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export const TaskCard = memo(function TaskCard({ task, onEdit }: TaskCardProps) {
  // Optimistic completed state — flips instantly on click, reverts on failure
  const [isCompleted, setIsCompleted] = useState(task.completed);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [togglePending, startToggle]   = useTransition();
  const [deletePending, startDelete]   = useTransition();
  const [deleteError,   setDeleteError] = useState("");

  function handleToggle() {
    const next = !isCompleted;
    setIsCompleted(next); // optimistic
    startToggle(async () => {
      const result = await toggleTask(task.id, next);
      if (!result.success) setIsCompleted(isCompleted); // revert
    });
  }

  function handleDelete() {
    setDeleteError("");
    startDelete(async () => {
      const result = await deleteTask(task.id);
      if (!result.success) {
        setDeleteError(result.error ?? "Delete failed");
        setConfirmDelete(false);
      }
    });
  }

  const dueLabelStr  = formatDueDate(task.due_date);
  const dueStyle     = dueDateStyle(task.due_date, isCompleted);
  const pastDue      = !isCompleted && isOverdue(task.due_date);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group rounded-2xl border p-5 transition-colors",
        isCompleted
          ? "border-white/[0.04] bg-white/[0.015]"
          : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.10] hover:bg-white/[0.05]"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={togglePending}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200",
            isCompleted
              ? "border-brand-500 bg-brand-500"
              : "border-white/20 hover:border-brand-400/60"
          )}
          aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
        >
          {isCompleted && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="h-3 w-3 text-white"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </motion.svg>
          )}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn(
              "text-sm font-medium leading-snug transition-colors",
              isCompleted ? "text-white/30 line-through" : "text-white"
            )}>
              {task.title}
            </p>

            {/* Hover actions */}
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => onEdit(task)}
                className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/70"
                title="Edit task"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                title="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Description */}
          {task.description && !isCompleted && (
            <p className="mt-1 flex items-start gap-1 text-xs text-white/35">
              <AlignLeft className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{task.description}</span>
            </p>
          )}

          {/* Meta row: priority + due date */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {!isCompleted && <PriorityBadge priority={task.priority} />}

            {dueLabelStr && (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                dueStyle.bg, dueStyle.text
              )}>
                <Calendar className="h-3 w-3" />
                {pastDue ? `Overdue · ${dueLabelStr}` : dueLabelStr}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Inline delete confirm */}
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
              <span className="flex-1 text-xs text-red-300">Delete this task?</span>
              <button
                onClick={handleDelete}
                disabled={deletePending}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                {deletePending ? "Deleting…" : "Yes, delete"}
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

      {deleteError && <p className="mt-2 text-xs text-red-400">{deleteError}</p>}
    </motion.div>
  );
});
