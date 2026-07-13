import { describe, expect, it, vi } from "vitest";
import { scrollTargetsToTop } from "./scroll";

describe("scroll reset", () => {
  it("resets both the app scroller and viewport when entering a selected workout exercise", () => {
    const appScroller = { scrollTo: vi.fn() };
    const viewport = { scrollTo: vi.fn() };

    scrollTargetsToTop(appScroller, viewport);

    expect(appScroller.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
    expect(viewport.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });
});
