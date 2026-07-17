import { describe, expect, it } from "vitest";
import { Children, isValidElement, type ChangeEvent, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CustomExerciseForm, { EMPTY_CUSTOM_EXERCISE_FORM, isValidFormValue, type CustomExerciseFormValue } from "./CustomExerciseForm";

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
    expect(markup).toContain('aria-label="计数口径"');
    expect(markup).toContain("整组填写");
    expect(markup).toContain("每侧填写");
    expect(markup).not.toContain("自重训练");
    expect(EMPTY_CUSTOM_EXERCISE_FORM.count_basis).toBe("whole_set");
  });

  it("explains per-side entry without presenting left/right split controls", () => {
    const markup = renderToStaticMarkup(
      <CustomExerciseForm
        value={{ ...EMPTY_CUSTOM_EXERCISE_FORM, name: "单臂哑铃划船", count_basis: "per_side" }}
        onChange={() => undefined}
        onSubmit={() => undefined}
        submitLabel="保存"
      />
    );

    expect(markup).toContain("填写每侧的数据；完成左右两侧后，这一组会按两侧合计统计。");
    expect(markup).not.toContain("左侧次数");
    expect(markup).not.toContain("右侧次数");
    expect(markup).not.toContain("双臂同时");
    expect(markup).not.toContain("左右交替");
  });

  it("emits count_basis in the controlled value passed to the submit owner", () => {
    const changes: CustomExerciseFormValue[] = [];
    const element = CustomExerciseForm({
      value: { ...EMPTY_CUSTOM_EXERCISE_FORM, name: "单臂哑铃划船" },
      onChange: (next) => changes.push(next),
      onSubmit: () => undefined,
      submitLabel: "保存",
    });
    const countInput = findInputByAriaLabel(element, "计数口径");

    expect(countInput).not.toBeNull();
    countInput?.onChange({ target: { value: "per_side" } } as ChangeEvent<HTMLSelectElement>);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      name: "单臂哑铃划船",
      count_basis: "per_side",
    });
    expect(isValidFormValue(changes[0])).toBe(true);
  });

  it("rejects illegal recording combinations before submit", () => {
    expect(isValidFormValue({ ...EMPTY_CUSTOM_EXERCISE_FORM, name: "俯卧撑", recording_mode: "reps", load_basis: null, load_direction: null })).toBe(true);
    expect(isValidFormValue({ ...EMPTY_CUSTOM_EXERCISE_FORM, name: "俯卧撑", recording_mode: "reps", load_basis: "total", load_direction: null })).toBe(false);
    expect(isValidFormValue({ ...EMPTY_CUSTOM_EXERCISE_FORM, name: "跑步", recording_mode: "distance_duration", load_basis: null, load_direction: null, rate_metric: "load_distance_per_time" })).toBe(false);
  });
});

function findInputByAriaLabel(node: ReactNode, label: string): {
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
} | null {
  if (!isValidElement(node)) return null;
  const props = node.props as {
    children?: ReactNode;
    "aria-label"?: string;
    onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  };
  if (props["aria-label"] === label && props.onChange) return { onChange: props.onChange };
  for (const child of Children.toArray(props.children)) {
    const found = findInputByAriaLabel(child, label);
    if (found) return found;
  }
  return null;
}
