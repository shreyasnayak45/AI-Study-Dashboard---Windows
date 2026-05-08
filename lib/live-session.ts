// Client-only localStorage helpers for the live session timer.
// getActiveSession() returns null on the server (safe to call anywhere).

export interface ActiveSession {
  subject:   string;
  startedAt: number; // Unix ms — Date.now() at the moment the timer started
}

const STORAGE_KEY = "studyflow_live_session";

// Dispatched on the same window when a session starts or stops,
// so sibling components (banner, tracker header) can sync instantly.
export const LIVE_SESSION_EVENT = "studyflow:live-session-change" as const;

export function getActiveSession(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "subject"   in parsed && typeof (parsed as ActiveSession).subject   === "string" &&
      "startedAt" in parsed && typeof (parsed as ActiveSession).startedAt === "number"
    ) {
      return parsed as ActiveSession;
    }
    return null;
  } catch {
    return null;
  }
}

export function startLiveSession(subject: string): ActiveSession {
  const session: ActiveSession = { subject, startedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(LIVE_SESSION_EVENT));
  return session;
}

export function clearLiveSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(LIVE_SESSION_EVENT));
}
