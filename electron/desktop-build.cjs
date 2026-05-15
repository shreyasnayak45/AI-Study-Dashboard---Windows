const { spawnSync } = require("node:child_process");
const path = require("node:path");

const DEFAULT_AI_BACKEND_URL = "https://ai-study-dashboard-orcin.vercel.app";

const env = {
  ...process.env,
  NEXT_PUBLIC_AI_BACKEND_URL:
    process.env.NEXT_PUBLIC_AI_BACKEND_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || DEFAULT_AI_BACKEND_URL,
};

if (!env.NEXT_PUBLIC_SITE_URL) {
  env.NEXT_PUBLIC_SITE_URL = env.NEXT_PUBLIC_AI_BACKEND_URL;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: path.resolve(__dirname, ".."),
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npm", ["run", "build"]);
run("node", ["electron/prepare-next.cjs"]);
run("npx", ["electron-builder", "--win", ...process.argv.slice(2)]);
