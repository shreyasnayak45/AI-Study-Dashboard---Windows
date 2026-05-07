"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, CalendarDays, BookOpen, Clock, Flame, CheckSquare,
  CheckCircle, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { AvatarUpload } from "./AvatarUpload";
import { updateProfile } from "@/app/actions/settings";
import { fmtHours } from "@/lib/analytics-utils";
import type { User, UserProfile, ProfileStats } from "@/types";

interface ProfileClientProps {
  user:         User;
  profile:      UserProfile | null;
  profileStats: ProfileStats;
}

type Status = { ok: boolean; text: string };

export function ProfileClient({ user, profile, profileStats }: ProfileClientProps) {
  const email = user.email ?? "";

  const joinDate = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  });

  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(profile?.avatar_url ?? null);
  const [displayName, setDisplayName] = useState(
    profile?.display_name ??
    (user.user_metadata?.full_name as string | undefined) ??
    ""
  );
  const [status,    setStatus]    = useState<Status | null>(null);
  const [isPending, startSave]    = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startSave(async () => {
      const r = await updateProfile({ display_name: displayName });
      setStatus(
        r.success
          ? { ok: true,  text: "Profile saved." }
          : { ok: false, text: r.error ?? "Save failed" }
      );
    });
  }

  const visibleName = displayName.trim() || email;

  const stats = [
    {
      label: "Total sessions",
      value: profileStats.totalSessions > 0 ? `${profileStats.totalSessions}` : "—",
      icon:  BookOpen,
      color: "text-brand-400",
      bg:    "bg-brand-500/10",
    },
    {
      label: "Study hours",
      value: profileStats.totalMinutes > 0 ? fmtHours(profileStats.totalMinutes) : "—",
      icon:  Clock,
      color: "text-violet-400",
      bg:    "bg-violet-500/10",
    },
    {
      label: "Current streak",
      value: profileStats.streak > 0 ? `${profileStats.streak}d` : "—",
      icon:  Flame,
      color: "text-orange-400",
      bg:    "bg-orange-500/10",
    },
    {
      label: "Task completion",
      value: profileStats.tasksTotal > 0 ? `${profileStats.taskCompletionRate}%` : "—",
      icon:  CheckSquare,
      color: "text-emerald-400",
      bg:    "bg-emerald-500/10",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Profile</h1>
        <p className="mt-1.5 text-sm text-white/40">Your account and study overview.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">

        {/* Identity card */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col items-center px-6 py-8 text-center">
            <AvatarUpload
              userId={user.id}
              currentUrl={avatarUrl}
              displayName={visibleName}
              email={email}
              size="xl"
              onSuccess={(url) => setAvatarUrl(url)}
            />

            <h2 className="mt-5 text-lg font-semibold text-white">{visibleName}</h2>

            <p className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
              <Mail className="h-3 w-3 shrink-0" /> {email}
            </p>

            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/25">
              <CalendarDays className="h-3 w-3 shrink-0" /> Member since {joinDate}
            </p>
          </Card>
        </div>

        {/* Stats + edit */}
        <div className="space-y-4 lg:col-span-3">

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="p-4">
                <div className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="mt-0.5 text-xs text-white/40">{label}</p>
              </Card>
            ))}
          </div>

          {/* Edit form */}
          <Card className="p-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/40">
              Edit Profile
            </p>
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Display name"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => { setDisplayName(e.target.value); setStatus(null); }}
              />

              <AnimatePresence>
                {status && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${
                      status.ok
                        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border border-red-500/20 bg-red-500/10 text-red-400"
                    }`}>
                      {status.ok
                        ? <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        : <XCircle    className="h-3.5 w-3.5 shrink-0" />}
                      {status.text}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" loading={isPending}>Save changes</Button>
            </form>
          </Card>

        </div>
      </div>
    </div>
  );
}
