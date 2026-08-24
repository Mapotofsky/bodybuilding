import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { propertiesFor, validateAndroidProperties, validateVersion, versionName } from "./release-version.mjs";

const current = JSON.parse(await readFile(new URL("../release/version.json", import.meta.url), "utf8"));
const generatedAndroidProperties = await readFile(new URL("../android/version.properties", import.meta.url), "utf8");

describe("release version metadata", () => {
  it("generates Android metadata from the authoritative release metadata", () => {
    validateVersion(current);
    const expectedVersionName = `${current.baseVersion}-${current.channel}.${current.buildNumber}`;
    expect(versionName(current)).toBe(expectedVersionName);
    expect(propertiesFor(current)).toContain(`VERSION_CODE=${current.android.versionCode}\nVERSION_NAME=${expectedVersionName}`);
    expect(() => validateAndroidProperties(current, generatedAndroidProperties)).not.toThrow();
  });

  it("requires a positive integer versionCode", () => {
    expect(() => validateVersion({ ...current, android: { versionCode: 0 }, issuedVersionCodes: [0] })).toThrow("positive integer");
  });

  it("rejects reused or decreased version codes through the controlled ledger", () => {
    expect(() => validateVersion({ ...current, android: { versionCode: 1 }, issuedVersionCodes: [1, 1] })).toThrow("strictly increasing");
    expect(() => validateVersion({ ...current, android: { versionCode: 1 }, issuedVersionCodes: [2, 1] })).toThrow("strictly increasing");
  });

  it("rejects generated Android metadata that no longer matches the source", () => {
    expect(() => validateAndroidProperties(current, "VERSION_CODE=1\nVERSION_NAME=1.0\n")).toThrow("out of sync");
  });

  it("accepts generated Android metadata after a Windows CRLF checkout", () => {
    expect(() => validateAndroidProperties(current, propertiesFor(current).replaceAll("\n", "\r\n"))).not.toThrow();
  });
});
