const { app, BrowserWindow, ipcMain, Menu, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const http = require("node:http");
const path = require("node:path");

let mainWindow;
let oauthCallbackServer;

const DESKTOP_OAUTH_CALLBACK_URL = "http://localhost:3333/auth/callback";

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function sendUpdateStatus(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("updates:status", message);
  }
}

function getStandaloneDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone");
  }

  return path.join(app.getAppPath(), ".next", "standalone");
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

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#09090f",
    title: "StudyFlow",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#09090f",
      symbolColor: "#f8fafc",
      height: 32,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  keepExternalUrlsOutOfApp(mainWindow, appUrl);

  await mainWindow.loadURL(appUrl);
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);

  ipcMain.handle("app:get-version", () => app.getVersion());
  ipcMain.handle("auth:get-callback-url", () => startOAuthCallbackServer());
  ipcMain.handle("auth:open-external", (_event, url) => {
    return { ok: openExternalUrl(url) };
  });
  ipcMain.handle("updates:check", async () => {
    if (!app.isPackaged) {
      const message = "Update checks are available in packaged Windows builds.";
      sendUpdateStatus(message);
      return { ok: true, message };
    }

    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        ok: true,
        message: result?.updateInfo?.version
          ? `Latest release found: ${result.updateInfo.version}`
          : "Update check complete.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Update check failed.";
      sendUpdateStatus(message);
      return { ok: false, message };
    }
  });

  autoUpdater.on("checking-for-update", () => sendUpdateStatus("Checking for updates..."));
  autoUpdater.on("update-available", (info) => {
    sendUpdateStatus(`Update available: ${info.version}. Downloading...`);
  });
  autoUpdater.on("update-not-available", () => sendUpdateStatus("You are running the latest version."));
  autoUpdater.on("download-progress", (progress) => {
    sendUpdateStatus(`Downloading update: ${Math.round(progress.percent)}%`);
  });
  autoUpdater.on("update-downloaded", () => {
    sendUpdateStatus("Update downloaded. It will install after you restart StudyFlow.");
  });
  autoUpdater.on("error", (error) => {
    sendUpdateStatus(error instanceof Error ? error.message : "Update check failed.");
  });

  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopOAuthCallbackServer();

  if (process.platform !== "darwin") {
    app.quit();
  }
});
