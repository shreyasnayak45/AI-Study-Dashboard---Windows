const { app, BrowserWindow, ipcMain, Menu, nativeImage, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

let mainWindow;
let oauthCallbackServer;
let updateReadyToInstall = false;
let isQuittingForUpdate = false;
let didRunStartupUpdateCheck = false;
let latestUpdateState = {
  status: "idle",
  message: "",
  updatedAt: null,
};

const APP_ID = "com.studyflow.desktop";
const DESKTOP_OAUTH_CALLBACK_URL = "http://localhost:3333/auth/callback";
const WINDOW_BACKGROUND_COLOR = "#0a0a0f";
const WINDOW_CONTROL_OVERLAY = {
  color: "#00000000",
  symbolColor: "#f8fafc",
  height: 32,
};

if (process.platform === "win32") {
  app.setAppUserModelId(APP_ID);
}

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function getUpdateErrorMessage(error) {
  const detail = error instanceof Error ? error.message : "";

  if (/404|not found|No published versions|latest.yml/i.test(detail)) {
    return "No published StudyFlow update is available on GitHub Releases yet.";
  }

  if (/net::|ENOTFOUND|ECONN|ETIMEDOUT|timeout|network/i.test(detail)) {
    return "I couldn't reach GitHub Releases. Check your internet connection and try again.";
  }

  return "I couldn't check for updates right now. Please try again in a minute.";
}

function compareVersions(left, right) {
  const leftParts = String(left).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = String(right).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }

  return 0;
}

function getUpdaterCacheDirName() {
  if (!app.isPackaged) {
    return "study-dashboard-updater";
  }

  try {
    const updateConfigPath = path.join(process.resourcesPath, "app-update.yml");
    const updateConfig = fs.readFileSync(updateConfigPath, "utf8");
    const match = updateConfig.match(/^updaterCacheDirName:\s*["']?([^"'\r\n]+)["']?/m);
    return match?.[1]?.trim() || "study-dashboard-updater";
  } catch (error) {
    console.warn("[updates] couldn't read updater cache name:", error);
    return "study-dashboard-updater";
  }
}

function getPendingUpdateCacheDir() {
  if (process.platform !== "win32" || !process.env.LOCALAPPDATA) {
    return undefined;
  }

  return path.join(process.env.LOCALAPPDATA, getUpdaterCacheDirName(), "pending");
}

function removePendingUpdateCache(reason) {
  const pendingDir = getPendingUpdateCacheDir();
  if (!pendingDir || !fs.existsSync(pendingDir)) return;

  try {
    fs.rmSync(pendingDir, { recursive: true, force: true });
    console.info(`[updates] cleared pending update cache ${reason}: ${pendingDir}`);
  } catch (error) {
    console.warn("[updates] couldn't clear pending update cache:", error);
  }
}

function getPendingUpdateVersion() {
  const pendingDir = getPendingUpdateCacheDir();
  if (!pendingDir) return undefined;

  try {
    const infoPath = path.join(pendingDir, "update-info.json");
    const info = JSON.parse(fs.readFileSync(infoPath, "utf8"));
    const fileName = typeof info.fileName === "string" ? info.fileName : "";
    return fileName.match(/Setup-(\d+\.\d+\.\d+)\.exe/i)?.[1];
  } catch {
    return undefined;
  }
}

function cleanPendingUpdateCacheAfterRelaunch() {
  if (!app.isPackaged) return;

  if (process.argv.includes("--updated")) {
    removePendingUpdateCache("after successful update relaunch");
    return;
  }

  const pendingVersion = getPendingUpdateVersion();
  if (pendingVersion && compareVersions(pendingVersion, app.getVersion()) <= 0) {
    removePendingUpdateCache(`after launching version ${app.getVersion()}`);
  }
}

function schedulePendingUpdateCacheCleanup() {
  cleanPendingUpdateCacheAfterRelaunch();
  setTimeout(cleanPendingUpdateCacheAfterRelaunch, 5000);
  setTimeout(cleanPendingUpdateCacheAfterRelaunch, 15000);
}

function cleanOlderPendingUpdateCache() {
  if (!app.isPackaged) return;

  const pendingVersion = getPendingUpdateVersion();
  if (pendingVersion && compareVersions(pendingVersion, app.getVersion()) < 0) {
    removePendingUpdateCache(`for older pending version ${pendingVersion}`);
  }
}

function sendUpdateStatus(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updates:status", message);
  }
}

function setUpdateState(status, message) {
  latestUpdateState = {
    status,
    message,
    updatedAt: new Date().toISOString(),
  };

  sendUpdateStatus(message);
}

function getUpdateState() {
  return {
    ...latestUpdateState,
    available: latestUpdateState.status === "available" || latestUpdateState.status === "ready",
  };
}

function canCheckForDesktopUpdates() {
  return process.platform === "win32" && app.isPackaged;
}

function scheduleStartupUpdateCheck() {
  if (!canCheckForDesktopUpdates() || didRunStartupUpdateCheck) return;

  didRunStartupUpdateCheck = true;

  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    cleanOlderPendingUpdateCache();
    autoUpdater.checkForUpdates().catch((error) => {
      latestUpdateState = {
        status: "error",
        message: getUpdateErrorMessage(error),
        updatedAt: new Date().toISOString(),
      };
      console.warn("[updates] startup check failed:", error);
    });
  }, 5000);
}

function closeWindowsForUpdate(timeoutMs = 1500) {
  const windows = BrowserWindow.getAllWindows().filter((window) => !window.isDestroyed());

  if (windows.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let remaining = windows.length;
    const finishOne = () => {
      remaining -= 1;
      if (remaining <= 0) {
        clearTimeout(fallback);
        resolve();
      }
    };

    const fallback = setTimeout(() => {
      for (const window of windows) {
        if (!window.isDestroyed()) {
          window.destroy();
        }
      }
      resolve();
    }, timeoutMs);

    for (const window of windows) {
      window.removeAllListeners("close");
      window.once("closed", finishOne);
      window.hide();
      window.close();
    }

    Promise.resolve().then(() => {
      if (windows.every((window) => window.isDestroyed())) {
        clearTimeout(fallback);
        resolve();
      }
    });
  });
}

async function restartAndInstallUpdate() {
  isQuittingForUpdate = true;

  const message = "Restarting StudyFlow to install the update...";
  setUpdateState("installing", message);
  stopOAuthCallbackServer();

  await closeWindowsForUpdate();

  // First arg `isSilent`: false → DO NOT pass /S to NSIS, so the assisted
  // installer wizard is visible (Welcome → InstFiles → Finish). With /S
  // (the previous setting) the installer ran headlessly and the updater
  // process sat in Task Manager with no UI, making the update look hung.
  // Second arg `isForceRunAfter`: keep true so --force-run is set, but for
  // visible installs the app actually relaunches via the "Launch StudyFlow"
  // checkbox on the Finish page (checked by default in MUI2).
  autoUpdater.quitAndInstall(false, true);

  setTimeout(() => {
    app.exit(0);
  }, 750);

  return { ok: true, message };
}

function getStandaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone");
  }

  return path.join(app.getAppPath(), ".next", "standalone");
}

function getAppIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "logo.ico");
  }

  return path.join(app.getAppPath(), "build", "logo.ico");
}

function getRuntimeAppIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "logo.png");
  }

  return path.join(app.getAppPath(), "public", "logo.png");
}

function getAppIcon() {
  const iconPaths = [getRuntimeAppIconPath(), getAppIconPath()];

  for (const iconPath of iconPaths) {
    const icon = nativeImage.createFromPath(iconPath);

    if (!icon.isEmpty()) {
      return icon;
    }
  }

  console.warn(`[window] StudyFlow icon could not be loaded from ${iconPaths.join(", ")}`);
  return getAppIconPath();
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("Unable to allocate a local port."));
        }
      });
    });
  });
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    function tryConnect() {
      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }

        setTimeout(tryConnect, 250);
      });
    }

    tryConnect();
  });
}

function isInternalUrl(targetUrl, appUrl) {
  try {
    return new URL(targetUrl).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}

function openExternalUrl(targetUrl) {
  try {
    const { protocol } = new URL(targetUrl);
    if (protocol === "http:" || protocol === "https:" || protocol === "mailto:") {
      void shell.openExternal(targetUrl);
      return true;
    }
  } catch {
    // Ignore malformed navigation targets.
  }

  return false;
}

function sendAuthCallback(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("auth:callback", payload);
  }
}

function stopOAuthCallbackServer() {
  if (!oauthCallbackServer) return;

  oauthCallbackServer.close();
  oauthCallbackServer = undefined;
}

function startOAuthCallbackServer() {
  stopOAuthCallbackServer();

  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const requestUrl = new URL(request.url || "/", DESKTOP_OAUTH_CALLBACK_URL);

      if (requestUrl.pathname !== "/auth/callback") {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const code = requestUrl.searchParams.get("code");
      const error = requestUrl.searchParams.get("error_description")
        || requestUrl.searchParams.get("error")
        || "";

      response.writeHead(error ? 400 : 200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>StudyFlow Authentication</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #09090f;
        color: rgba(255, 255, 255, 0.82);
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
    </style>
  </head>
  <body>${error ? "Authentication failed. You can close this tab." : "Authentication complete. Return to StudyFlow."}</body>
</html>`);

      sendAuthCallback(error ? { error } : { code });
      setTimeout(stopOAuthCallbackServer, 1000);
    });

    server.once("error", reject);
    server.listen(3333, "localhost", () => {
      oauthCallbackServer = server;
      resolve(DESKTOP_OAUTH_CALLBACK_URL);
    });
  });
}

function keepExternalUrlsOutOfApp(window, appUrl) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url, appUrl)) {
      return { action: "allow" };
    }

    openExternalUrl(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (isInternalUrl(url, appUrl)) return;

    event.preventDefault();
    openExternalUrl(url);
  });

  window.webContents.on("will-redirect", (event, url, _isInPlace, isMainFrame) => {
    if (!isMainFrame || isInternalUrl(url, appUrl)) return;

    event.preventDefault();
    openExternalUrl(url);
  });
}

async function getAppUrl() {
  if (!app.isPackaged) {
    return process.env.NEXT_DEV_SERVER_URL || "http://127.0.0.1:3000";
  }

  const port = await getFreePort();
  const appUrl = `http://127.0.0.1:${port}`;
  const standaloneDir = getStandaloneDir();

  process.env.STUDYFLOW_DESKTOP = "1";
  process.env.NODE_ENV = "production";
  process.env.PORT = String(port);
  process.env.HOSTNAME = "127.0.0.1";
  process.chdir(standaloneDir);

  require(path.join(standaloneDir, "server.js"));
  await waitForServer(appUrl);

  return appUrl;
}

async function createWindow() {
  const appUrl = await getAppUrl();
  const appIcon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: WINDOW_BACKGROUND_COLOR,
    title: "StudyFlow",
    icon: appIcon,
    titleBarStyle: "hidden",
    titleBarOverlay: WINDOW_CONTROL_OVERLAY,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.platform !== "darwin" && typeof mainWindow.setTitleBarOverlay === "function") {
    mainWindow.setTitleBarOverlay(WINDOW_CONTROL_OVERLAY);
  }

  if (process.platform === "win32" && typeof mainWindow.setIcon === "function") {
    mainWindow.setIcon(appIcon);
  }

  keepExternalUrlsOutOfApp(mainWindow, appUrl);

  await mainWindow.loadURL(appUrl);
}

app.whenReady().then(async () => {
  app.setAppUserModelId(APP_ID);
  Menu.setApplicationMenu(null);
  schedulePendingUpdateCacheCleanup();

  ipcMain.handle("app:get-version", () => app.getVersion());
  ipcMain.handle("auth:get-callback-url", () => startOAuthCallbackServer());
  ipcMain.handle("auth:open-external", (_event, url) => {
    return { ok: openExternalUrl(url) };
  });
  ipcMain.handle("updates:check", async () => {
    updateReadyToInstall = false;

    if (!canCheckForDesktopUpdates()) {
      const message = "Update checks work in the installed Windows app.";
      setUpdateState("idle", message);
      return { ok: true, message };
    }

    try {
      cleanOlderPendingUpdateCache();
      const result = await autoUpdater.checkForUpdates();
      const latestVersion = result?.updateInfo?.version;
      const currentVersion = app.getVersion();
      const message = latestVersion && latestVersion !== currentVersion
        ? `StudyFlow ${latestVersion} is available. Downloading it now...`
        : "StudyFlow is up to date.";

      setUpdateState(
        latestVersion && latestVersion !== currentVersion ? "available" : "idle",
        message
      );

      return {
        ok: true,
        message,
      };
    } catch (error) {
      const message = getUpdateErrorMessage(error);
      console.warn("[updates] check failed:", error);
      setUpdateState("error", message);
      return { ok: false, message };
    }
  });
  ipcMain.handle("updates:get-state", () => getUpdateState());
  ipcMain.handle("updates:restart-and-install", async () => {
    if (!canCheckForDesktopUpdates()) {
      return {
        ok: false,
        message: "Restart and update is available in the installed Windows app.",
      };
    }

    if (!updateReadyToInstall) {
      return {
        ok: false,
        message: "The update is not ready to install yet.",
      };
    }

    return restartAndInstallUpdate();
  });

  autoUpdater.on("checking-for-update", () => {
    updateReadyToInstall = false;
    setUpdateState("checking", "Checking for updates...");
  });
  autoUpdater.on("update-available", (info) => {
    updateReadyToInstall = false;
    setUpdateState("available", `StudyFlow ${info.version} is available. Downloading it now...`);
  });
  autoUpdater.on("update-not-available", () => {
    updateReadyToInstall = false;
    setUpdateState("idle", "StudyFlow is up to date.");
  });
  autoUpdater.on("download-progress", (progress) => {
    updateReadyToInstall = false;
    setUpdateState("available", `Downloading update... ${Math.round(progress.percent)}%`);
  });
  autoUpdater.on("update-downloaded", () => {
    updateReadyToInstall = true;
    setUpdateState("ready", "Update ready. Restart StudyFlow to finish installing it.");
  });
  autoUpdater.on("error", (error) => {
    updateReadyToInstall = false;
    console.warn("[updates] updater error:", error);
    setUpdateState("error", getUpdateErrorMessage(error));
  });

  await createWindow();
  scheduleStartupUpdateCheck();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopOAuthCallbackServer();

  if (isQuittingForUpdate) {
    return;
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (!isQuittingForUpdate) {
    return;
  }

  for (const window of BrowserWindow.getAllWindows()) {
    window.removeAllListeners("close");
    if (!window.isDestroyed()) {
      window.destroy();
    }
  }
});
