import { describe, expect, it, vi } from "vitest";
import { restoreRouteScrollPosition, saveRouteScrollPosition, scrollTargetsToTop } from "./scroll";

describe("scroll reset", () => {
  it("resets both the app scroller and viewport when entering a selected workout exercise", () => {
    const appScroller = { scrollTo: vi.fn() };
    const viewport = { scrollTo: vi.fn() };

    scrollTargetsToTop(appScroller, viewport);

    expect(appScroller.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
    expect(viewport.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("restores a saved route position once when returning from a detail page", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    const target = { scrollTo: vi.fn() };

    saveRouteScrollPosition(storage, "exercise-scroll", "/exercises?category=legs", 736);

    expect(restoreRouteScrollPosition(storage, "exercise-scroll", "/exercises?category=legs", target)).toBe(true);
    expect(target.scrollTo).toHaveBeenCalledWith({ top: 736, left: 0, behavior: "auto" });
    expect(restoreRouteScrollPosition(storage, "exercise-scroll", "/exercises?category=legs", target)).toBe(false);
  });

  it("does not restore a position saved for another filter route", () => {
    const storage = {
      getItem: () => JSON.stringify({ route: "/exercises?category=legs", top: 736 }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const target = { scrollTo: vi.fn() };

    expect(restoreRouteScrollPosition(storage, "exercise-scroll", "/exercises?category=back", target)).toBe(false);
    expect(target.scrollTo).not.toHaveBeenCalled();
  });
});
