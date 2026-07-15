import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CustomExerciseForm, { EMPTY_CUSTOM_EXERCISE_FORM, isValidFormValue } from "./CustomExerciseForm";

describe("CustomExerciseForm", () => {
  it("renders the shared custom exercise fields for quick create and full edit", () => {
    const markup = renderToStaticMarkup(
      <CustomExerciseForm
        value={EMPTY_CUSTOM_EXERCISE_FORM}
        onChange={() => undefined}
        onSubmit={() => undefined}
        submitLabel="保存"
      />
    );

    expect(markup).toContain("动作名称");
    expect(markup).toContain("动作要领");
    expect(markup).toContain("器械");
    expect(markup).toContain("主目标肌群");
    expect(markup).toContain("次要目标肌群");
    expect(markup).toContain("负重 + 次数");
    expect(markup).toContain("仅次数");
    expect(markup).toContain("负重 + 时间");
    expect(markup).toContain("负重 + 距离 / 时间");
    expect(markup).toContain("重量口径");
    expect(markup).toContain("成绩方向");
    expect(markup).not.toContain("自重训练");
  });

  it("explains how per-hand input contributes to combined results", () => {
    const markup = renderToStaticMarkup(
      <CustomExerciseForm
        value={{ ...EMPTY_CUSTOM_EXERCISE_FORM, name: "哑铃卧推", load_basis: "per_hand" }}
        onChange={() => undefined}
        onSubmit={() => undefined}
        submitLabel="保存"
      />
    );

    expect(markup).toContain("每手重量表示双手或双侧使用相同重量");
    expect(markup).toContain("计算时乘 2");
  });

  it("rejects illegal recording combinations before submit", () => {
    expect(isValidFormValue({ ...EMPTY_CUSTOM_EXERCISE_FORM, name: "俯卧撑", recording_mode: "reps", load_basis: null, load_direction: null })).toBe(true);
    expect(isValidFormValue({ ...EMPTY_CUSTOM_EXERCISE_FORM, name: "俯卧撑", recording_mode: "reps", load_basis: "total", load_direction: null })).toBe(false);
    expect(isValidFormValue({ ...EMPTY_CUSTOM_EXERCISE_FORM, name: "跑步", recording_mode: "distance_duration", load_basis: null, load_direction: null, rate_metric: "load_distance_per_time" })).toBe(false);
  });
});
