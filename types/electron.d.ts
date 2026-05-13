export {};

declare global {
  interface Window {
    studyflowDesktop?: {
      getAppVersion: () => Promise<string>;
      getOAuthCallbackUrl: () => Promise<string>;
      openExternalAuthUrl: (url: string) => Promise<{ ok: boolean }>;
      onAuthCallback: (
        callback: (payload: { code?: string; error?: string }) => void
      ) => () => void;
      checkForUpdates: () => Promise<{ ok: boolean; message: string }>;
      onUpdateStatus: (callback: (message: string) => void) => () => void;
    };
  }
}
