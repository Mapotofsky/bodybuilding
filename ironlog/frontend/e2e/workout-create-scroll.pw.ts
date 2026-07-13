import { expect, test, type Page } from "@playwright/test";

const portraitViewports = [
  { name: "360px", width: 360, height: 800 },
  { name: "412px", width: 412, height: 915 },
] as const;

async function swipeUpFromActionButton(page: Page) {
  const actionButton = page.getByRole("button", { name: /杠铃弯举/ });
  await expect(actionButton).toBeVisible();
  const box = await actionButton.boundingBox();
  expect(box).not.toBeNull();

  const cdp = await page.context().newCDPSession(page);
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  const touchPoint = (offsetY: number) => ({ x, y: y - offsetY, id: 1, radiusX: 1, radiusY: 1, force: 1 });

  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touchPoint(0)] });
  for (const offsetY of [60, 140, 220]) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [touchPoint(offsetY)] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

test.describe("准备训练页动作选择器触摸滚动", () => {
  test.use({ hasTouch: true, isMobile: true });

  for (const viewport of portraitViewports) {
    test(`从具体动作按钮开始上滑时，${viewport.name} 只滚动主内容区`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/workouts/new", { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "准备训练" })).toBeVisible();
      await expect(page.getByRole("button", { name: /杠铃弯举/ })).toBeVisible();

      const before = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>("[data-testid='app-main']")!;
        const tabbar = document.querySelector<HTMLElement>("[data-testid='app-tabbar']")!;
        return {
          mainScrollTop: main.scrollTop,
          mainScrollHeight: main.scrollHeight,
          mainClientHeight: main.clientHeight,
          tabbarTop: tabbar.getBoundingClientRect().top,
        };
      });
      expect(before.mainScrollHeight).toBeGreaterThan(before.mainClientHeight);

      await swipeUpFromActionButton(page);
      await page.waitForTimeout(100);

      const after = await page.evaluate(() => {
        const main = document.querySelector<HTMLElement>("[data-testid='app-main']")!;
        const tabbar = document.querySelector<HTMLElement>("[data-testid='app-tabbar']")!;
        return {
          mainScrollTop: main.scrollTop,
          windowScrollY: window.scrollY,
          tabbarTop: tabbar.getBoundingClientRect().top,
        };
      });

      expect(after.mainScrollTop).toBeGreaterThan(before.mainScrollTop);
      expect(after.windowScrollY).toBe(0);
      expect(Math.abs(after.tabbarTop - before.tabbarTop)).toBeLessThanOrEqual(1);
    });
  }
});
