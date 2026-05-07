import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfileAndSettings } from "@/lib/settings-stats";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Both calls share the getCurrentUser() cache — only one auth.getUser()
  // round-trip is made even though getProfileAndSettings also calls it internally.
  const [user, { profile }] = await Promise.all([
    getCurrentUser(),
    getProfileAndSettings(),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      <Sidebar user={user} profile={profile} />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="min-h-full bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.06),transparent)]">
          {children}
        </div>
      </main>
    </div>
  );
}
