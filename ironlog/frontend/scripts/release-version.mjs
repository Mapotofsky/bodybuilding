import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const versionPath = path.join(rootDir, "release", "version.json");
const packagePath = path.join(rootDir, "package.json");
const androidPropertiesPath = path.join(rootDir, "android", "version.properties");

export function versionName(version) {
  return `${version.baseVersion}-${version.channel}.${version.buildNumber}`;
}

export function validateVersion(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version.baseVersion)) {
    throw new Error("baseVersion must be a stable semantic version such as 1.0.0.");
  }
  if (!/^[a-z][a-z0-9-]*$/.test(version.channel) || !Number.isSafeInteger(version.buildNumber) || version.buildNumber < 1) {
    throw new Error("channel and buildNumber must form a valid release identifier.");
  }
  const code = version.android?.versionCode;
  if (!Number.isSafeInteger(code) || code < 1) {
    throw new Error("android.versionCode must be a positive integer.");
  }
  const issued = version.issuedVersionCodes;
  if (!Array.isArray(issued) || issued.length === 0 || issued.some((value) => !Number.isSafeInteger(value) || value < 1)) {
    throw new Error("issuedVersionCodes must be a non-empty list of positive integers.");
  }
  if (issued.some((value, index) => index > 0 && value <= issued[index - 1])) {
    throw new Error("issuedVersionCodes must be strictly increasing; Android versionCode cannot be reused or decreased.");
  }
  if (issued.at(-1) !== code) {
    throw new Error("android.versionCode must be the latest issuedVersionCodes entry.");
  }
}

export function propertiesFor(version) {
  return [
    "# Generated from release/version.json by npm run release:sync. Do not edit manually.",
    `VERSION_CODE=${version.android.versionCode}`,
    `VERSION_NAME=${versionName(version)}`,
    "",
  ].join("\n");
}

export function validateAndroidProperties(version, properties) {
  const normalizedProperties = properties.replace(/\r\n?/g, "\n");
  if (normalizedProperties !== propertiesFor(version)) {
    throw new Error("android/version.properties is out of sync. Run npm run release:sync.");
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function checkReleaseVersion({ allowMissingAndroidProperties = false } = {}) {
  const [version, packageJson] = await Promise.all([readJson(versionPath), readJson(packagePath)]);
  validateVersion(version);
  if (packageJson.version !== version.baseVersion) {
    throw new Error(`package.json version (${packageJson.version}) must match release baseVersion (${version.baseVersion}).`);
  }
  let properties;
  try {
    properties = await readFile(androidPropertiesPath, "utf8");
  } catch (error) {
    if (allowMissingAndroidProperties && error.code === "ENOENT") return version;
    throw error;
  }
  validateAndroidProperties(version, properties);
  return version;
}

export async function syncReleaseVersion() {
  const [version, packageJson] = await Promise.all([readJson(versionPath), readJson(packagePath)]);
  validateVersion(version);
  if (packageJson.version !== version.baseVersion) {
    throw new Error(`package.json version (${packageJson.version}) must match release baseVersion (${version.baseVersion}).`);
  }
  await writeFile(androidPropertiesPath, propertiesFor(version), "utf8");
  return version;
}

async function main() {
  const command = process.argv[2];
  if (command === "check") {
    const version = await checkReleaseVersion();
    console.log(`Release metadata is valid: ${versionName(version)} (versionCode ${version.android.versionCode})`);
    return;
  }
  if (command === "sync") {
    const version = await syncReleaseVersion();
    console.log(`Synchronized Android version metadata: ${versionName(version)} (versionCode ${version.android.versionCode})`);
    return;
  }
  throw new Error("Usage: node scripts/release-version.mjs <check|sync>");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
