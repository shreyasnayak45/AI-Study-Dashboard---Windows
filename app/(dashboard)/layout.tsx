import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProfileAndSettings } from "@/lib/settings-stats";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ActiveSessionBanner } from "@/components/tracker/ActiveSessionBanner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Both calls share the getCurrentUser() cache, so only one auth.getUser() round-trip is made.
  const [user, { profile, settings }] = await Promise.all([
    getCurrentUser(),
    getProfileAndSettings(),
  ]);

  if (!user) redirect("/login");

  return (
    <DashboardDataProvider value={{ user, profile, settings }}>
      <div className="flex h-screen overflow-hidden bg-surface-900">
        <div className="app-drag-region fixed left-0 right-[138px] top-0 z-[60] hidden h-8 lg:block" aria-hidden="true" />
        <Sidebar user={user} profile={profile} />
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-1">
          <div className="min-h-full bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.06),transparent)]">
            {children}
          </div>
        </main>
        <ActiveSessionBanner />
      </div>
    </DashboardDataProvider>
  );
}
