"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { deleteAccount } from "@/app/actions/settings";

interface Props {
  isOpen:  boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ isOpen, onClose }: Props) {
  const router              = useRouter();
  const [text, setText]     = useState("");
  const [error, setError]   = useState("");
  const [isPending, startT] = useTransition();

  function handleClose() {
    if (isPending) return;
    setText("");
    setError("");
    onClose();
  }

  function handleDelete() {
    if (text !== "DELETE") {
      setError('Type "DELETE" to confirm');
      return;
    }
    setError("");
    startT(async () => {
      const result = await deleteAccount();
      if (result.success) {
        router.push("/login");
      } else {
        setError(result.error ?? "Something went wrong");
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
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-red-500/20 bg-[#0d0d14] p-5 shadow-2xl sm:p-6"
          >
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <button
                onClick={handleClose}
                className="rounded-xl p-1.5 text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h2 className="text-base font-semibold text-white">Delete account</h2>
            <p className="mt-1.5 text-sm text-white/50">
              This will permanently delete all your study sessions, tasks, and profile data.
              This action <strong className="text-white/80">cannot be undone</strong>.
            </p>

            <ul className="mt-4 space-y-1.5 text-xs text-white/40">
              {["All study sessions", "All tasks and notes", "Your profile and settings"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-red-400/60" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-5">
              <label className="mb-1.5 block text-xs font-medium text-white/50">
                Type <span className="font-semibold text-red-400">DELETE</span> to confirm
              </label>
              <input
                value={text}
                onChange={(e) => { setText(e.target.value); setError(""); }}
                placeholder="DELETE"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
              {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
            </div>

            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending || text !== "DELETE"}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500/15 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete account
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
