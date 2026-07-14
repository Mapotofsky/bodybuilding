import { describe, expect, it, vi } from "vitest";
import { androidBackFallback, handleAndroidBack } from "./AndroidBackHandler";

function actions(overlayOpen = false) {
  return {
    dismissOverlay: vi.fn(() => overlayOpen),
    goBack: vi.fn(),
    replace: vi.fn(),
    exitApp: vi.fn(),
  };
}

describe("Android 系统返回操作", () => {
  it("从动作详情返回动作库时使用 BrowserRouter 的应用内历史", () => {
    const next = actions();

    handleAndroidBack(true, { pathname: "/exercises/exercise-1", search: "?from=%2Fexercises%3Fq%3D%E5%8D%A7%E6%8E%A8" }, next);

    expect(next.goBack).toHaveBeenCalledOnce();
    expect(next.replace).not.toHaveBeenCalled();
    expect(next.exitApp).not.toHaveBeenCalled();
  });

  it("直接打开动作详情且没有历史时回到带筛选条件的动作库", () => {
    const location = { pathname: "/exercises/exercise-1", search: "?from=%2Fexercises%3Fq%3D%E5%8D%A7%E6%8E%A8" };
    const next = actions();

    handleAndroidBack(false, location, next);

    expect(next.replace).toHaveBeenCalledWith("/exercises?q=卧推");
    expect(next.exitApp).not.toHaveBeenCalled();
  });

  it("没有历史时按路由层级返回训练、计划和工具父页面", () => {
    expect(androidBackFallback({ pathname: "/workouts/workout-1/edit", search: "" })).toBe("/workouts/workout-1");
    expect(androidBackFallback({ pathname: "/plans/plan-1/templates/template-1", search: "" })).toBe("/plans/plan-1");
    expect(androidBackFallback({ pathname: "/tools/rm", search: "" })).toBe("/tools");
  });

  it("顶级页面没有历史时才退出应用", () => {
    const next = actions();

    handleAndroidBack(false, { pathname: "/exercises", search: "" }, next);

    expect(next.exitApp).toHaveBeenCalledOnce();
    expect(next.goBack).not.toHaveBeenCalled();
    expect(next.replace).not.toHaveBeenCalled();
  });

  it("确认弹窗打开时优先关闭弹窗而不是离开页面", () => {
    const next = actions(true);

    handleAndroidBack(true, { pathname: "/workouts/workout-1", search: "" }, next);

    expect(next.dismissOverlay).toHaveBeenCalledOnce();
    expect(next.goBack).not.toHaveBeenCalled();
    expect(next.exitApp).not.toHaveBeenCalled();
  });
});
