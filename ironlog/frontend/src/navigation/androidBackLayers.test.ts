import { describe, expect, it, vi } from "vitest";
import { dismissTopAndroidBackLayer, registerAndroidBackDismiss } from "./androidBackLayers";

describe("Android 返回浮层优先级", () => {
  it("先关闭最后打开的浮层，再关闭下一层", () => {
    const first = vi.fn();
    const second = vi.fn();
    const removeFirst = registerAndroidBackDismiss(first);
    const removeSecond = registerAndroidBackDismiss(second);

    expect(dismissTopAndroidBackLayer()).toBe(true);
    expect(second).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();

    removeSecond();
    expect(dismissTopAndroidBackLayer()).toBe(true);
    expect(first).toHaveBeenCalledOnce();
    removeFirst();
    expect(dismissTopAndroidBackLayer()).toBe(false);
  });
});
