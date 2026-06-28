import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID } from "@/core/models";
import { resolveTheme, THEME_DEFINITIONS, THEME_VARIABLE_KEYS } from "./themes";

describe("theme definitions", () => {
  it("resolves the default theme", () => {
    const resolved = resolveTheme(null);

    expect(resolved.theme.id).toBe(DEFAULT_THEME_ID);
    expect(resolved.isFallback).toBe(false);
  });

  it("falls back visually for unknown theme ids without changing the requested value", () => {
    const resolved = resolveTheme("future-theme");

    expect(resolved.theme.id).toBe(DEFAULT_THEME_ID);
    expect(resolved.requestedId).toBe("future-theme");
    expect(resolved.isFallback).toBe(true);
  });

  it("keeps variable coverage complete for every theme", () => {
    for (const theme of THEME_DEFINITIONS) {
      expect(Object.keys(theme.variables).sort()).toEqual([...THEME_VARIABLE_KEYS].sort());
    }
  });
});
