import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ExercisePicker from "./ExercisePicker";
import type { Exercise } from "@/types";

const exercise: Exercise = {
  id: "custom-ex-test", name: "自定义测试动作", category: "core",
  recording_mode: "duration", load_basis: null, load_direction: null, rate_metric: "none",
  equipment: "body_weight", description: null, primary_muscle_group_ids: [], secondary_muscle_group_ids: [], is_custom: true,
};

describe("ExercisePicker", () => {
  it("provides the shared custom-action entry in inline and sheet presentations", () => {
    const props = { exercises: [exercise], onSelect: () => undefined, onCreated: () => undefined };
    expect(renderToStaticMarkup(<ExercisePicker {...props} presentation="inline" />)).toContain("新建");
    expect(renderToStaticMarkup(<ExercisePicker {...props} presentation="sheet" open />)).toContain("新建");
  });

  it("准备训练页的内联动作按钮不创建嵌套纵向滚动区", () => {
    const markup = renderToStaticMarkup(<ExercisePicker exercises={[exercise]} onSelect={() => undefined} onCreated={() => undefined} presentation="inline" />);

    expect(markup).not.toContain("overflow-y-auto");
    expect(markup).not.toContain("overscroll-contain");
  });

  it("renders the shared sheet above the bottom tab bar with a dynamic viewport height", () => {
    const markup = renderToStaticMarkup(<ExercisePicker exercises={[exercise]} onSelect={() => undefined} onCreated={() => undefined} presentation="sheet" open />);
    expect(markup).toContain("z-[80]");
    expect(markup).toContain("max-h-[88dvh]");
    expect(markup).toContain("overscroll-contain");
  });
});
