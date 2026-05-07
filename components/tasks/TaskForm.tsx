"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Type, AlignLeft, Calendar, Flag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PriorityBadge } from "./PriorityBadge";
import { createTask, updateTask } from "@/app/actions/tasks";
import { getPriorityConfig, todayDateString, type Priority } from "@/lib/task-utils";
import { cn } from "@/lib/utils";
import type { Task, TaskFormData } from "@/types";

const PRIORITIES: Priority[] = ["low", "medium", "high"];

const EMPTY_FORM: TaskFormData = {
  title:       "",
  description: "",
  priority:    "medium",
  due_date:    "",
};

interface TaskFormProps {
  isOpen:         boolean;
  onClose:        () => void;
  editingTask:    Task | null;
}

export function TaskForm({ isOpen, onClose, editingTask }: TaskFormProps) {
  const [form, setForm]             = useState<TaskFormData>(EMPTY_FORM);
  const [errors, setErrors]         = useState<Partial<Record<keyof TaskFormData, string>>>({});
  const [serverError, setServerError] = useState("");
  const [isPending, startTransition]  = useTransition();

  useEffect(() => {
    if (editingTask) {
      setForm({
        title:       editingTask.title,
        description: editingTask.description ?? "",
        priority:    editingTask.priority,
        due_date:    editingTask.due_date ?? "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setServerError("");
  }, [editingTask, isOpen]);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.title.trim()) next.title = "Title is required";
    else if (form.title.trim().length > 120) next.title = "Max 120 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setServerError("");

    startTransition(async () => {
      const result = editingTask
        ? await updateTask(editingTask.id, form)
        : await createTask(form);

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
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

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
                  {editingTask ? "Edit task" : "New task"}
                </h2>
                <p className="mt-0.5 text-xs text-white/40">
                  {editingTask ? "Update the details below" : "Add something to get done"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="space-y-6 p-6">

                {/* Title */}
                <Input
                  label="Task title"
                  placeholder="What needs to be done?"
                  icon={<Type className="h-4 w-4" />}
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value });
                    if (errors.title) setErrors({ ...errors, title: "" });
                  }}
                  error={errors.title}
                />

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-white/60">
                    <AlignLeft className="mr-1.5 inline h-3.5 w-3.5" />
                    Description
                    <span className="ml-1 text-white/30">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Any extra details or notes…"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-2.5">
                  <label className="block text-sm font-medium text-white/60">
                    <Flag className="mr-1.5 inline h-3.5 w-3.5" />
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {PRIORITIES.map((p) => {
                      const cfg      = getPriorityConfig(p);
                      const selected = form.priority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm({ ...form, priority: p })}
                          className={cn(
                            "flex-1 rounded-xl border py-2 text-xs font-medium transition-all duration-150",
                            selected
                              ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-1 ${cfg.ring}`
                              : "border-white/[0.08] bg-white/[0.03] text-white/40 hover:border-white/[0.15] hover:text-white/65"
                          )}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Due date */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-white/60">
                    <Calendar className="mr-1.5 inline h-3.5 w-3.5" />
                    Due date
                    <span className="ml-1 text-white/30">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={form.due_date}
                    min={todayDateString()}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 [color-scheme:dark]"
                  />
                  {form.due_date && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, due_date: "" })}
                      className="text-xs text-white/30 hover:text-white/55"
                    >
                      Clear date
                    </button>
                  )}
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

                {/* Preview badge (live feedback) */}
                {form.title.trim() && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">Preview</p>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={form.priority} />
                      <span className="text-sm text-white/80">{form.title.trim()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-auto flex items-center gap-3 border-t border-white/[0.06] px-6 py-4">
                <Button type="button" variant="ghost" className="flex-1" onClick={onClose} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" loading={isPending} className="flex-1">
                  {editingTask ? "Save changes" : "Add task"}
                </Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
