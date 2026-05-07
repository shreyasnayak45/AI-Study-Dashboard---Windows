"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TaskCard } from "./TaskCard";
import { TaskForm } from "./TaskForm";
import { TaskFilters, applyFilter, type FilterKey } from "./TaskFilters";
import type { Task } from "@/types";

interface TasksClientProps {
  tasks: Task[];
}

export function TasksClient({ tasks }: TasksClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [isFormOpen,   setIsFormOpen]   = useState(false);
  const [editingTask,  setEditingTask]  = useState<Task | null>(null);

  function openAdd() {
    setEditingTask(null);
    setIsFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingTask(null);
  }

  // Memoize derived values — prevents repeated O(n) passes on every render
  const filtered       = useMemo(() => applyFilter(tasks, activeFilter), [tasks, activeFilter]);
  const activeCount    = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks]);
  const completedCount = useMemo(() => tasks.filter((t) =>  t.completed).length, [tasks]);

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Task Manager</h1>
          <p className="mt-1 text-sm text-white/40">
            {tasks.length === 0
              ? "Add your first task below"
              : `${activeCount} active · ${completedCount} completed`}
          </p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add task
        </Button>
      </div>

      {/* Filter tabs */}
      {tasks.length > 0 && (
        <div className="mb-5">
          <TaskFilters tasks={tasks} active={activeFilter} onChange={setActiveFilter} />
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : filtered.length === 0 ? (
        <EmptyFilterState filter={activeFilter} onAdd={openAdd} />
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2.5">
            {filtered.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={openEdit} />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Slide-over form */}
      <TaskForm isOpen={isFormOpen} onClose={closeForm} editingTask={editingTask} />
    </>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.02] py-20 text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
        <CheckSquare className="h-7 w-7 text-emerald-400" />
      </div>
      <h3 className="text-base font-semibold text-white">No tasks yet</h3>
      <p className="mt-1 max-w-xs text-sm text-white/40">
        Add tasks with priorities and due dates to stay on top of your studies.
      </p>
      <Button onClick={onAdd} className="mt-6" size="sm">
        <Plus className="h-4 w-4" />
        Add your first task
      </Button>
    </motion.div>
  );
}

const FILTER_EMPTY: Record<FilterKey, { title: string; sub: string }> = {
  all:       { title: "No tasks",           sub: "Add a task to get started."          },
  active:    { title: "All done! 🎉",        sub: "No active tasks — great work."       },
  completed: { title: "Nothing completed",   sub: "Complete a task to see it here."     },
  overdue:   { title: "No overdue tasks",    sub: "You're all caught up!"               },
};

function EmptyFilterState({ filter, onAdd }: { filter: FilterKey; onAdd: () => void }) {
  const { title, sub } = FILTER_EMPTY[filter];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] py-16 text-center"
    >
      <p className="text-sm font-semibold text-white/60">{title}</p>
      <p className="mt-1 text-xs text-white/35">{sub}</p>
      {filter === "all" && (
        <Button onClick={onAdd} variant="ghost" className="mt-4" size="sm">
          <Plus className="h-3.5 w-3.5" />
          Add task
        </Button>
      )}
    </motion.div>
  );
}
