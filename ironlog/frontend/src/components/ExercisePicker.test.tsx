import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ExercisePicker from "./ExercisePicker";
import type { Exercise } from "@/types";

const exercise: Exercise = {
  id: "custom-ex-test", name: "自定义测试动作", category: "core", type: "static_hold",
  description: null, primary_muscle_group_ids: [], secondary_muscle_group_ids: [], met_value: null, is_custom: true,
};

describe("ExercisePicker", () => {
  it("provides the shared custom-action entry in inline and sheet presentations", () => {
    const props = { exercises: [exercise], onSelect: () => undefined, onCreated: () => undefined };
    expect(renderToStaticMarkup(<ExercisePicker {...props} presentation="inline" />)).toContain("新建");
    expect(renderToStaticMarkup(<ExercisePicker {...props} presentation="sheet" open />)).toContain("新建");
  });
});
