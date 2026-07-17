import { expect, test, type Page } from "@playwright/test";
import { CURRENT_SCHEMA_VERSION } from "../src/core/models";

const viewports = [
  { name: "360px", width: 360, height: 800 },
  { name: "412px", width: 412, height: 915 },
  { name: "landscape", width: 800, height: 360 },
] as const;

const farmerFields = {
  weight: "每手重量 (kg)",
  distance: "距离 (m)",
  duration: "用时 (秒)",
} as const;

async function startFarmerWalk(page: Page) {
  await page.goto("/workouts/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "准备训练" })).toBeVisible();
  await page.getByPlaceholder("搜索动作...").fill("农夫行走");
  await page.getByRole("button", { name: /农夫行走/ }).click();
  await page.getByRole("button", { name: "开始 · 农夫行走" }).click();
  await expect(page.getByRole("heading", { name: "农夫行走" })).toBeVisible();
}

async function fillFarmerSet(page: Page) {
  const weight = page.getByRole("textbox", { name: farmerFields.weight });
  const distance = page.getByRole("textbox", { name: farmerFields.distance });
  const duration = page.getByRole("textbox", { name: farmerFields.duration });

  await weight.fill("32");
  await weight.fill("");
  await expect(weight).toHaveValue("");
  await weight.fill("32");
  await distance.fill("40");
  await duration.fill("28");
}

async function expectNoHorizontalOverflow(page: Page, minimumInputWidth = 20) {
  const geometry = await page.evaluate(({ labels }) => {
    const main = document.querySelector<HTMLElement>("[data-testid='app-main']")!;
    const editor = document.querySelector<HTMLElement>("[data-recording-mode='weight_distance_duration']")!;
    const inputs = labels.map((label) => document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!);
    const mainRect = main.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      mainClientWidth: main.clientWidth,
      mainScrollWidth: main.scrollWidth,
      editorClientWidth: editor.clientWidth,
      editorScrollWidth: editor.scrollWidth,
      inputRects: inputs.map((input) => {
        const rect = input.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      }),
      offenders: [...main.querySelectorAll<HTMLElement>("*")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { tag: element.tagName, className: element.className, left: rect.left, right: rect.right, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
        })
        .filter((item) => item.left < mainRect.left - 1 || item.right > mainRect.right + 1 || item.scrollWidth > item.clientWidth + 1)
        .slice(0, 8),
    };
  }, { labels: Object.values(farmerFields) });

  expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.mainScrollWidth, JSON.stringify(geometry.offenders)).toBeLessThanOrEqual(geometry.mainClientWidth + 1);
  expect(geometry.editorScrollWidth).toBeLessThanOrEqual(geometry.editorClientWidth + 1);
  for (const rect of geometry.inputRects) {
    expect(rect.left).toBeGreaterThanOrEqual(-1);
    expect(rect.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(rect.width).toBeGreaterThanOrEqual(minimumInputWidth);
  }
}

async function expectCelebrationStatsSingleLine(page: Page) {
  const geometry = await page.getByTestId("celebration-stats").evaluate((stats) => ({
    clientWidth: stats.clientWidth,
    scrollWidth: stats.scrollWidth,
    rows: [...stats.querySelectorAll<HTMLElement>("p")].map((row) => ({
      text: row.textContent,
      clientWidth: row.clientWidth,
      scrollWidth: row.scrollWidth,
      whiteSpace: getComputedStyle(row).whiteSpace,
    })),
  }));

  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
  for (const row of geometry.rows) {
    expect(row.whiteSpace, row.text || "").toBe("nowrap");
    expect(row.scrollWidth, row.text || "").toBeLessThanOrEqual(row.clientWidth + 1);
  }
}

test.describe("农夫行走记录模式", () => {
  for (const viewport of viewports) {
    test(`${viewport.name} 可清空录入三字段且无横向溢出`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await startFarmerWalk(page);
      await fillFarmerSet(page);
      await expectNoHorizontalOverflow(page);

      await page.getByRole("button", { name: "✓ 完成本组" }).click();
      await expect(page.getByRole("heading", { name: "组间休息" })).toBeVisible();
      await expect(page.getByText("每手 32 kg · 40 m · 28 s", { exact: true })).toHaveText("每手 32 kg · 40 m · 28 s");
    });
  }

  test("360px 下完成、详情与编辑均按快照往返三字段", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await startFarmerWalk(page);
    await fillFarmerSet(page);
    await page.getByRole("button", { name: "✓ 完成本组" }).click();
    await page.getByRole("button", { name: "结束" }).click();

    await expect(page.getByRole("heading", { name: "训练完成" })).toBeVisible();
    await expectCelebrationStatsSingleLine(page);
    await expect(page.getByText("2560.0 kg·m", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "保存训练记录" }).click();

    await expect(page.getByRole("heading", { name: "训练详情" })).toBeVisible();
    await expect(page.getByText("每手 32 kg · 40 m · 28 s", { exact: true })).toBeVisible();
    await expect(page.getByText("2560.0 kg·m", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("91.43 kg·m/s", { exact: false }).first()).toBeVisible();

    await page.getByRole("button", { name: "更多操作" }).click();
    await page.getByRole("button", { name: "编辑" }).click();
    await expect(page.getByRole("heading", { name: "编辑训练" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: farmerFields.weight })).toHaveValue("32");
    await expect(page.getByRole("textbox", { name: farmerFields.distance })).toHaveValue("40");
    const duration = page.getByRole("textbox", { name: farmerFields.duration });
    await expect(duration).toHaveValue("28");
    await duration.fill("");
    await expect(duration).toHaveValue("");
    await duration.fill("28");
    await expectNoHorizontalOverflow(page, 28);
    await page.getByRole("button", { name: "保存", exact: true }).click();
    await expect(page.getByRole("heading", { name: "训练详情" })).toBeVisible();
    await expect(page.getByText("每手 32 kg · 40 m · 28 s", { exact: true })).toBeVisible();
  });

  test("412px 下训练完成横幅的数值、单位和说明保持单行", async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await startFarmerWalk(page);
    await fillFarmerSet(page);
    await page.getByRole("button", { name: "✓ 完成本组" }).click();
    await page.getByRole("button", { name: "结束" }).click();

    await expect(page.getByRole("heading", { name: "训练完成" })).toBeVisible();
    await expectCelebrationStatsSingleLine(page);
    await expect(page.getByTestId("celebration-primary-metric")).toHaveText("2560.0 kg·m");
  });
});

test("动作详情跳转来源训练后恢复滚动位置", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await startFarmerWalk(page);
  await fillFarmerSet(page);
  await page.getByRole("button", { name: "✓ 完成本组" }).click();
  await page.getByRole("button", { name: "结束" }).click();
  await page.getByRole("button", { name: "保存训练记录" }).click();

  await page.goto("/exercises/ex-farmer-walk", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "农夫行走" })).toBeVisible();
  const main = page.getByTestId("app-main");
  await main.evaluate((element) => element.scrollTo({ top: 260 }));
  const scrollTopBeforeOpen = await main.evaluate((element) => element.scrollTop);
  expect(scrollTopBeforeOpen).toBeGreaterThan(0);

  const sourceRecord = page.locator("button").filter({ hasText: "真实 PR" }).first();
  await expect(sourceRecord).toBeAttached();
  await sourceRecord.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(page.getByRole("heading", { name: "训练详情" })).toBeVisible();
  await page.goBack();

  await expect(page.getByRole("heading", { name: "农夫行走" })).toBeVisible();
  await expect.poll(() => main.evaluate((element) => element.scrollTop)).toBe(scrollTopBeforeOpen);
});

test("动作详情只展示适用于当前记录配置的基础信息", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });

  await page.goto("/exercises/ex-side-plank", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "侧平板支撑" })).toBeVisible();
  await expect(page.getByText("重量口径", { exact: true })).toHaveCount(0);
  await expect(page.getByText("成绩摘要", { exact: true })).toHaveCount(0);
  await expect(page.getByText("按记录值比较", { exact: true })).toHaveCount(0);

  await page.goto("/exercises/ex-running", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "跑步" })).toBeVisible();
  await expect(page.getByText("重量口径", { exact: true })).toHaveCount(0);
  await expect(page.getByText("成绩摘要", { exact: true })).toBeVisible();
  await expect(page.getByText("计算速度", { exact: true })).toBeVisible();
  await expect(page.getByText("按记录值比较", { exact: true })).toHaveCount(0);

  await page.goto("/exercises/ex-bench-press", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "杠铃卧推" })).toBeVisible();
  await expect(page.getByText("重量口径", { exact: true })).toBeVisible();
  await expect(page.getByText("总重量", { exact: true })).toBeVisible();
  await expect(page.getByText("成绩摘要", { exact: true })).toHaveCount(0);
});

test("URL 与页内选择模板都使用同一真实动作过滤", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto("/workouts/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /农夫行走/ })).toBeVisible();
  await seedFarmerTemplate(page);

  await page.goto("/workouts/new?template_id=template-e2e-farmer", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /农夫行走/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /杠铃卧推/ })).toHaveCount(0);

  await page.goto("/workouts/new", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /E2E 计划/ }).click();
  await page.getByRole("button", { name: "农夫模板" }).click();
  await expect(page.getByText("已过滤动作", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /农夫行走/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /杠铃卧推/ })).toHaveCount(0);
});

async function seedFarmerTemplate(page: Page) {
  await page.evaluate(async (schemaVersion) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("ironlog-local", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      const transaction = db.transaction("documents", "readwrite");
      const store = transaction.objectStore("documents");
      const read = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
      const current = await read(store.get("templates.json")) as { plans?: unknown[]; templates?: unknown[] } | undefined;
      const timestamp = "2026-07-15T00:00:00.000Z";
      await read(store.put({
        plans: [{
          id: "plan-e2e-farmer",
          name: "E2E 计划",
          description: null,
          color: "#10b981",
          mode: "flexible",
          cycleLength: null,
          isActive: true,
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null,
          schemaVersion,
        }],
        templates: [{
          id: "template-e2e-farmer",
          planId: "plan-e2e-farmer",
          name: "农夫模板",
          sortOrder: 0,
          color: "#10b981",
          scheduleRule: null,
          exercises: [{ id: "template-exercise-e2e", exerciseId: "ex-farmer-walk", sortOrder: 0, note: "按计划完成" }],
          createdAt: timestamp,
          updatedAt: timestamp,
          deletedAt: null,
          schemaVersion,
        }],
      }, "templates.json"));
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      void current;
    } finally {
      db.close();
    }
  }, CURRENT_SCHEMA_VERSION);
}
