import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfileAndSettings } from "@/lib/settings-stats";
import { getProfileStats } from "@/lib/analytics-stats";
import { ProfileClient } from "@/components/profile/ProfileClient";

export default async function ProfilePage() {
  // getCurrentUser() is cached — no extra auth round-trip even though
  // getProfileAndSettings() also calls it internally.
  const [user, { profile }, profileStats] = await Promise.all([
    getCurrentUser(),
    getProfileAndSettings(),
    getProfileStats(),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="p-8">
      <ProfileClient
        user={user}
        profile={profile}
        profileStats={profileStats}
      />
    </div>
  );
}
