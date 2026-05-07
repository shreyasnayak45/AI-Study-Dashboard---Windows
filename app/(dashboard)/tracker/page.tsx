// Server Component — fetches sessions on the server before rendering.
// After any Server Action (create/update/delete), revalidatePath("/tracker")
// causes Next.js to re-run this function and push fresh data to TrackerClient.

import { getSessionsForTracker } from "@/lib/tracker-stats";
import { TrackerClient } from "@/components/tracker/TrackerClient";

export default async function TrackerPage() {
  const sessions = await getSessionsForTracker();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <TrackerClient sessions={sessions} />
    </div>
  );
}
