import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileAndSettings } from "@/lib/settings-stats";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { profile, settings } = await getProfileAndSettings();

  return (
    <div className="p-8">
      <SettingsClient user={user} profile={profile} settings={settings} />
    </div>
  );
}
