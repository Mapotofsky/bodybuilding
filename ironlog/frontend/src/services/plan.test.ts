import { describe, expect, it } from "vitest";
import { validateTemplateScheduleRule } from "./plan";

describe("cyclic template schedule rules", () => {
  const cyclicPlan = { mode: "cyclic", cycleLength: 4 };

  it("accepts integer cycle days within the plan range", () => {
    expect(validateTemplateScheduleRule(cyclicPlan, { day_in_cycle: 1 })).toEqual({ day_in_cycle: 1 });
    expect(validateTemplateScheduleRule(cyclicPlan, { day_in_cycle: 4 })).toEqual({ day_in_cycle: 4 });
  });

  it("rejects missing, fractional, and out-of-range cyclic days", () => {
    expect(() => validateTemplateScheduleRule(cyclicPlan, {})).toThrow("周期天数必须是 1 到 4 的整数");
    expect(() => validateTemplateScheduleRule(cyclicPlan, { day_in_cycle: 1.5 })).toThrow("周期天数必须是 1 到 4 的整数");
    expect(() => validateTemplateScheduleRule(cyclicPlan, { day_in_cycle: 5 })).toThrow("周期天数必须是 1 到 4 的整数");
  });

  it("allows a new template to have no schedule rule before editing", () => {
    expect(validateTemplateScheduleRule(cyclicPlan, null)).toBeNull();
  });
});
