const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studyflowDesktop", {
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  getOAuthCallbackUrl: () => ipcRenderer.invoke("auth:get-callback-url"),
  openExternalAuthUrl: (url) => ipcRenderer.invoke("auth:open-external", url),
  onAuthCallback: (callback) => {
    if (typeof callback !== "function") return () => {};

    const listener = (_event, payload) => {
      callback(payload);
    };

    ipcRenderer.on("auth:callback", listener);
    return () => ipcRenderer.removeListener("auth:callback", listener);
  },
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  onUpdateStatus: (callback) => {
    if (typeof callback !== "function") return () => {};

    const listener = (_event, message) => {
      callback(String(message));
    };

    ipcRenderer.on("updates:status", listener);
    return () => ipcRenderer.removeListener("updates:status", listener);
  },
});
