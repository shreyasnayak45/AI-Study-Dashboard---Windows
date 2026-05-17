"use client";

import { useEffect, useState } from "react";
import type { DesktopUpdateState, DesktopUpdateStatus } from "@/types/electron";

interface DesktopUpdateBadge {
  visible: boolean;
  label: "Update available" | "Update ready";
  message: string;
  status: DesktopUpdateStatus | "unknown";
}

const HIDDEN_BADGE: DesktopUpdateBadge = {
  visible: false,
  label: "Update available",
  message: "",
  status: "idle",
};

function statusFromMessage(message: string): DesktopUpdateBadge["status"] {
  if (/^Update ready\./i.test(message)) return "ready";
  if (/available|Downloading update/i.test(message)) return "available";
  if (/Checking for updates/i.test(message)) return "checking";
  if (/Restarting StudyFlow/i.test(message)) return "installing";
  if (/error|fail|couldn'?t|not ready|No published/i.test(message)) return "error";
  if (/up to date|installed Windows app/i.test(message)) return "idle";

  return "unknown";
}

function badgeFromStatus(status: DesktopUpdateBadge["status"], message: string): DesktopUpdateBadge {
  if (status === "ready") {
    return {
      visible: true,
      label: "Update ready",
      message,
      status,
    };
  }

  if (status === "available") {
    return {
      visible: true,
      label: "Update available",
      message,
      status,
    };
  }

  return {
    ...HIDDEN_BADGE,
    message,
    status,
  };
}

function badgeFromUpdateState(state: DesktopUpdateState): DesktopUpdateBadge {
  return badgeFromStatus(state.status, state.message);
}

export function useDesktopUpdateBadge() {
  const [badge, setBadge] = useState<DesktopUpdateBadge>(HIDDEN_BADGE);

  useEffect(() => {
    const desktop = window.studyflowDesktop;
    if (!desktop) return;

    let cancelled = false;

    desktop
      .getUpdateState()
      .then((state) => {
        if (!cancelled) {
          setBadge(badgeFromUpdateState(state));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBadge(HIDDEN_BADGE);
        }
      });

    const unsubscribe = desktop.onUpdateStatus((message) => {
      setBadge(badgeFromStatus(statusFromMessage(message), message));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return badge;
}
