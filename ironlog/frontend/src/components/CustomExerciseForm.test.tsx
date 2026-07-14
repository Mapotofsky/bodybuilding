import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CustomExerciseForm, { EMPTY_CUSTOM_EXERCISE_FORM } from "./CustomExerciseForm";

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
    expect(markup).toContain("主目标肌群");
    expect(markup).toContain("次要目标肌群");
    expect(markup).toContain("负重 + 次数");
    expect(markup).toContain("仅次数");
    expect(markup).not.toContain("自重训练");
  });
});
