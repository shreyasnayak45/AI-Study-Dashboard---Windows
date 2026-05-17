"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DesktopUpdateState, DesktopUpdateStatus } from "@/types/electron";

type DesktopUpdateViewStatus = DesktopUpdateStatus | "unknown";

interface DesktopUpdateSnapshot {
  status: DesktopUpdateViewStatus;
  message: string;
  progress: number | null;
}

export interface DesktopUpdateView {
  isDesktop: boolean;
  visible: boolean;
  label: "Update available" | "Downloading update..." | "Update ready" | "Restarting..." | "Update failed";
  message: string;
  status: DesktopUpdateViewStatus;
  progress: number | null;
  isBusy: boolean;
  canDownload: boolean;
  canRestart: boolean;
  hasError: boolean;
  checkForUpdates: () => Promise<{ ok: boolean; message: string }>;
  downloadUpdate: () => Promise<{ ok: boolean; message: string }>;
  restartAndInstallUpdate: () => Promise<{ ok: boolean; message: string }>;
}

const INITIAL_SNAPSHOT: DesktopUpdateSnapshot = {
  status: "idle",
  message: "",
  progress: null,
};

const NOOP_RESULT = { ok: false, message: "Desktop updates are not available here." };

function progressFromMessage(message: string) {
  const match = message.match(/(\d+)%/);
  if (!match) return null;

  return Math.min(100, Math.max(0, Number.parseInt(match[1], 10)));
}

function statusFromMessage(message: string): DesktopUpdateViewStatus {
  if (/^Update ready\./i.test(message)) return "ready";
  if (/Downloading (?:update|it)/i.test(message)) return "downloading";
  if (/available/i.test(message)) return "available";
  if (/Checking for updates/i.test(message)) return "checking";
  if (/Restarting StudyFlow/i.test(message)) return "installing";
  if (/error|fail|couldn'?t|not ready|No published/i.test(message)) return "error";
  if (/up to date|installed Windows app/i.test(message)) return "idle";

  return "unknown";
}

function snapshotFromMessage(message: string): DesktopUpdateSnapshot {
  return {
    status: statusFromMessage(message),
    message,
    progress: progressFromMessage(message),
  };
}

function snapshotFromUpdateState(state: DesktopUpdateState): DesktopUpdateSnapshot {
  return {
    status: state.status,
    message: state.message,
    progress: state.progress ?? progressFromMessage(state.message),
  };
}

function labelForStatus(status: DesktopUpdateViewStatus): DesktopUpdateView["label"] {
  if (status === "ready") return "Update ready";
  if (status === "downloading") return "Downloading update...";
  if (status === "installing") return "Restarting...";
  if (status === "error") return "Update failed";

  return "Update available";
}

export function useDesktopUpdateStatus(): DesktopUpdateView {
  const [isDesktop, setIsDesktop] = useState(false);
  const [snapshot, setSnapshot] = useState<DesktopUpdateSnapshot>(INITIAL_SNAPSHOT);

  useEffect(() => {
    const desktop = window.studyflowDesktop;
    setIsDesktop(Boolean(desktop));
    if (!desktop) return undefined;

    let cancelled = false;

    desktop
      .getUpdateState()
      .then((state) => {
        if (!cancelled) {
          setSnapshot(snapshotFromUpdateState(state));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshot(INITIAL_SNAPSHOT);
        }
      });

    const unsubscribe = desktop.onUpdateStatus((message) => {
      setSnapshot(snapshotFromMessage(message));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const setActionFallback = useCallback((message: string) => {
    setSnapshot(snapshotFromMessage(message));
  }, []);

  const checkForUpdates = useCallback(async () => {
    const desktop = window.studyflowDesktop;
    if (!desktop) return NOOP_RESULT;

    setSnapshot({ status: "checking", message: "Checking for updates...", progress: null });

    try {
      const result = await desktop.checkForUpdates();
      setSnapshot(snapshotFromMessage(result.message));
      return result;
    } catch {
      const message = "I couldn't check for updates right now.";
      setActionFallback(message);
      return { ok: false, message };
    }
  }, [setActionFallback]);

  const downloadUpdate = useCallback(async () => {
    const desktop = window.studyflowDesktop;
    if (!desktop) return NOOP_RESULT;

    setSnapshot({ status: "downloading", message: "Downloading update...", progress: null });

    try {
      const result = await desktop.downloadUpdate();
      setSnapshot(snapshotFromMessage(result.message));
      return result;
    } catch {
      const message = "I couldn't start the update download.";
      setActionFallback(message);
      return { ok: false, message };
    }
  }, [setActionFallback]);

  const restartAndInstallUpdate = useCallback(async () => {
    const desktop = window.studyflowDesktop;
    if (!desktop) return NOOP_RESULT;

    setSnapshot({
      status: "installing",
      message: "Restarting StudyFlow to install the update...",
      progress: null,
    });

    try {
      const result = await desktop.restartAndInstallUpdate();
      setSnapshot(snapshotFromMessage(result.message));
      return result;
    } catch {
      const message = "I couldn't start the update installer.";
      setActionFallback(message);
      return { ok: false, message };
    }
  }, [setActionFallback]);

  return useMemo(() => {
    const visibleStatuses: DesktopUpdateViewStatus[] = [
      "available",
      "downloading",
      "ready",
      "installing",
      "error",
    ];
    const visible = isDesktop && visibleStatuses.includes(snapshot.status);
    const isBusy = snapshot.status === "checking"
      || snapshot.status === "downloading"
      || snapshot.status === "installing";

    return {
      isDesktop,
      visible,
      label: labelForStatus(snapshot.status),
      message: snapshot.message,
      status: snapshot.status,
      progress: snapshot.progress,
      isBusy,
      canDownload: isDesktop && (snapshot.status === "available" || snapshot.status === "error"),
      canRestart: isDesktop && snapshot.status === "ready",
      hasError: snapshot.status === "error",
      checkForUpdates,
      downloadUpdate,
      restartAndInstallUpdate,
    };
  }, [checkForUpdates, downloadUpdate, isDesktop, restartAndInstallUpdate, snapshot]);
}

export function useDesktopUpdateBadge() {
  return useDesktopUpdateStatus();
}
