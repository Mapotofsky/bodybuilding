import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { propertiesFor, validateAndroidProperties, validateVersion, versionName } from "./release-version.mjs";

const current = JSON.parse(await readFile(new URL("../release/version.json", import.meta.url), "utf8"));

describe("release version metadata", () => {
  it("generates the current internal Android version", () => {
    validateVersion(current);
    expect(versionName(current)).toBe("0.1.0-internal.1");
    expect(propertiesFor(current)).toContain("VERSION_CODE=1\nVERSION_NAME=0.1.0-internal.1");
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
});
