"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, Settings, LogOut, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { User as SupaUser, UserProfile } from "@/types";

interface ProfileDropdownProps {
  user:    SupaUser;
  profile: UserProfile | null;
  isOpen:  boolean;
  onClose: () => void;
}

export function ProfileDropdown({ user, profile, isOpen, onClose }: ProfileDropdownProps) {
  const router = useRouter();

  const displayName =
    profile?.display_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Student";

  async function handleSignOut() {
    onClose();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible backdrop — click anywhere outside to close */}
          <div className="fixed inset-0 z-40" onClick={onClose} />

          <motion.div
            key="profile-dropdown"
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 400 }}
            className="absolute inset-x-0 bottom-full z-50 mb-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-800 shadow-2xl"
          >
            {/* Profile header */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <UserAvatar
                avatarUrl={profile?.avatar_url}
                displayName={displayName}
                email={user.email}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-white/35">{user.email}</p>
              </div>
            </div>

            <div className="mx-3 h-px bg-white/[0.06]" />

            {/* Navigation items */}
            <nav className="p-1.5">
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <User className="h-4 w-4 shrink-0 text-white/35" />
                View Profile
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-white/20" />
              </Link>
              <Link
                href="/settings"
                onClick={onClose}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Settings className="h-4 w-4 shrink-0 text-white/35" />
                Settings
              </Link>
            </nav>

            <div className="mx-3 h-px bg-white/[0.06]" />

            {/* Sign out */}
            <div className="p-1.5">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/65 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <LogOut className="h-4 w-4 shrink-0 text-white/35" />
                Sign out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
