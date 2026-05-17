const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function runRcedit(exePath, iconPath, packageJson) {
  const productName = packageJson.build?.productName || packageJson.name || "StudyFlow";
  const executableName = packageJson.build?.executableName || productName;
  const version = packageJson.version;

  const rceditPath = path.join(
    packageJson.__projectDir,
    "node_modules",
    "electron-winstaller",
    "vendor",
    "rcedit.exe"
  );

  if (!fs.existsSync(rceditPath)) {
    throw new Error(`rcedit.exe was not found at ${rceditPath}`);
  }

  execFileSync(rceditPath, [
    exePath,
    "--set-icon",
    iconPath,
    "--set-version-string",
    "FileDescription",
    productName,
    "--set-version-string",
    "ProductName",
    productName,
    "--set-version-string",
    "InternalName",
    executableName,
    "--set-version-string",
    "OriginalFilename",
    `${executableName}.exe`,
    "--set-file-version",
    version,
    "--set-product-version",
    version,
  ], { stdio: "inherit" });
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const projectDir = context.packager.projectDir;
  const packageJsonPath = path.join(projectDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.__projectDir = projectDir;

  const executableName = packageJson.build?.executableName || packageJson.build?.productName || "StudyFlow";
  const exePath = path.join(context.appOutDir, `${executableName}.exe`);
  const iconPath = path.join(projectDir, "build", "logo.ico");

  if (!fs.existsSync(exePath)) {
    throw new Error(`Packaged executable was not found at ${exePath}`);
  }

  if (!fs.existsSync(iconPath)) {
    throw new Error(`StudyFlow icon was not found at ${iconPath}`);
  }

  runRcedit(exePath, iconPath, packageJson);
};
