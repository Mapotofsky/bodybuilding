import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ExercisePicker from "./ExercisePicker";
import type { Exercise } from "@/types";

const exercise: Exercise = {
  id: "custom-ex-test", name: "自定义测试动作", category: "core",
  recording_mode: "duration", load_basis: null, count_basis: "whole_set", load_direction: null, rate_metric: "none",
  equipment: "body_weight", description: null, primary_muscle_group_ids: [], secondary_muscle_group_ids: [], is_custom: true,
};

describe("ExercisePicker", () => {
  it("provides the shared custom-action entry in inline and sheet presentations", () => {
    const props = { exercises: [exercise], onSelect: () => undefined, onCreated: () => undefined };
    expect(renderToStaticMarkup(<ExercisePicker {...props} presentation="inline" />)).toContain("新建");
    expect(renderToStaticMarkup(<ExercisePicker {...props} presentation="sheet" open />)).toContain("新建");
  });

});
