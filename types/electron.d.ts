export {};

export type DesktopUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "installing"
  | "error";

export interface DesktopUpdateState {
  status: DesktopUpdateStatus;
  message: string;
  updatedAt: string | null;
  available: boolean;
  progress?: number | null;
}

declare global {
  interface Window {
    studyflowDesktop?: {
      getAppVersion: () => Promise<string>;
      getOAuthCallbackUrl: () => Promise<string>;
      openExternalAuthUrl: (url: string) => Promise<{ ok: boolean }>;
      onAuthCallback: (
        callback: (payload: { code?: string; error?: string }) => void
      ) => () => void;
      getUpdateState: () => Promise<DesktopUpdateState>;
      checkForUpdates: () => Promise<{ ok: boolean; message: string }>;
      downloadUpdate: () => Promise<{ ok: boolean; message: string }>;
      restartAndInstallUpdate: () => Promise<{ ok: boolean; message: string }>;
      onUpdateStatus: (callback: (message: string) => void) => () => void;
    };
  }
}
