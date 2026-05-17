"use client";

import { useDashboardData } from "@/components/dashboard/DashboardDataContext";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default function SettingsPage() {
  const { user, profile, settings } = useDashboardData();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <SettingsClient user={user} profile={profile} settings={settings} />
    </div>
  );
}
