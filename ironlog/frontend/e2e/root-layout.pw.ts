import { expect, test } from "@playwright/test";

const portraitViewports = [
  { name: "360px", width: 360, height: 800 },
  { name: "412px", width: 412, height: 915 },
] as const;

for (const viewport of portraitViewports) {
  test(`short page fills the ${viewport.name} visible viewport without document scrolling`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tools", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "小工具" })).toBeVisible();

    const geometry = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>("[data-testid='app-shell']")!;
      const main = document.querySelector<HTMLElement>("[data-testid='app-main']")!;
      const tabbar = document.querySelector<HTMLElement>("[data-testid='app-tabbar']")!;
      const mainRect = main.getBoundingClientRect();
      const tabbarRect = tabbar.getBoundingClientRect();
      return {
        shellHeight: shell.getBoundingClientRect().height,
        mainBottom: mainRect.bottom,
        tabbarTop: tabbarRect.top,
        tabbarBottom: tabbarRect.bottom,
        mainClientHeight: main.clientHeight,
        mainScrollHeight: main.scrollHeight,
        documentScrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      };
    });

    expect(Math.abs(geometry.shellHeight - geometry.viewportHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.mainBottom - geometry.tabbarTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.tabbarBottom - geometry.viewportHeight)).toBeLessThanOrEqual(1);
    expect(geometry.mainScrollHeight).toBeLessThanOrEqual(geometry.mainClientHeight + 1);
    expect(geometry.documentScrollHeight).toBeLessThanOrEqual(geometry.viewportHeight + 1);
  });
}

for (const viewport of [...portraitViewports, { name: "landscape", width: 800, height: 360 }] as const) {
  test(`long page scrolls only in main and keeps the tab bar visible at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tools/rpe-strength", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "力量训练 RPE", level: 1 })).toBeVisible();

    const before = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>("[data-testid='app-main']")!;
      const tabbar = document.querySelector<HTMLElement>("[data-testid='app-tabbar']")!;
      return { mainClientHeight: main.clientHeight, mainScrollHeight: main.scrollHeight, tabbarTop: tabbar.getBoundingClientRect().top };
    });
    expect(before.mainScrollHeight).toBeGreaterThan(before.mainClientHeight);

    const after = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>("[data-testid='app-main']")!;
      main.scrollTop = main.scrollHeight;
      const pageRoot = main.lastElementChild as HTMLElement;
      const mainRect = main.getBoundingClientRect();
      const tabbarRect = document.querySelector<HTMLElement>("[data-testid='app-tabbar']")!.getBoundingClientRect();
      return {
        mainScrollTop: main.scrollTop,
        windowScrollY: window.scrollY,
        pageBottom: pageRoot.getBoundingClientRect().bottom,
        mainBottom: mainRect.bottom,
        tabbarTop: tabbarRect.top,
      };
    });

    expect(after.mainScrollTop).toBeGreaterThan(0);
    expect(after.windowScrollY).toBe(0);
    expect(Math.abs(after.tabbarTop - before.tabbarTop)).toBeLessThanOrEqual(1);
    expect(after.pageBottom).toBeLessThanOrEqual(after.mainBottom + 1);
    expect(Math.abs(after.mainBottom - after.tabbarTop)).toBeLessThanOrEqual(1);
  });
}
