const { spawn } = require("node:child_process");
const http = require("node:http");

const nextUrl = process.env.NEXT_DEV_SERVER_URL || "http://127.0.0.1:3000";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function waitForServer(url, timeoutMs = 60000) {
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

        setTimeout(tryConnect, 500);
      });
    }

    tryConnect();
  });
}

async function main() {
  const nextProcess = spawn(npmCommand, ["run", "dev", "--", "--hostname", "127.0.0.1"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  const stopNext = () => {
    if (!nextProcess.killed) nextProcess.kill();
  };

  process.on("exit", stopNext);
  process.on("SIGINT", () => {
    stopNext();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    stopNext();
    process.exit(0);
  });

  await waitForServer(nextUrl);

  const electronPath = require("electron");
  const electronProcess = spawn(electronPath, ["."], {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_DEV_SERVER_URL: nextUrl,
    },
  });

  electronProcess.on("exit", (code) => {
    stopNext();
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
