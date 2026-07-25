import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SetFieldEditor, { validateSetFieldDraft } from "./SetFieldEditor";

const farmerRecording = {
  recording_mode: "weight_distance_duration",
  load_basis: "per_hand",
  count_basis: "whole_set",
  load_direction: "higher_better",
  rate_metric: "load_distance_per_time",
} as const;

const perSideRecording = {
  recording_mode: "weight_distance_duration",
  load_basis: "total",
  count_basis: "per_side",
  load_direction: "higher_better",
  rate_metric: "load_distance_per_time",
} as const;

const resistanceRecording = {
  recording_mode: "distance_duration",
  load_basis: null,
  count_basis: "whole_set",
  load_direction: null,
  rate_metric: "none",
  context_kind: "resistance_level",
} as const;

describe("SetFieldEditor", () => {
  it("renders farmer-walk fields in registry order with an adaptive third row", () => {
    const markup = renderToStaticMarkup(
      <SetFieldEditor
        recording={farmerRecording}
        weightUnit="kg"
        value={{ weight: "32", reps: "", distanceM: "40", durationSec: "28" }}
        onChange={() => undefined}
      />
    );

    expect(markup.indexOf("每手重量 (kg)")).toBeLessThan(markup.indexOf("距离 (m)"));
    expect(markup.indexOf("距离 (m)")).toBeLessThan(markup.indexOf("用时 (秒)"));
    expect(markup).toContain("col-span-2");
    expect(markup).toContain('aria-label="每手重量 (kg)"');
    expect(markup).toContain('aria-label="距离 (m)"');
    expect(markup).toContain('aria-label="用时 (秒)"');
    expect(markup).not.toContain('type="number"');
  });

  it("validates non-empty draft values immediately while allowing a blank placeholder", () => {
    expect(validateSetFieldDraft(farmerRecording, { weight: "", reps: "", distanceM: "", durationSec: "" })).toBeNull();
    expect(validateSetFieldDraft(farmerRecording, { weight: "-1", reps: "", distanceM: "40", durationSec: "" })).toContain("重量");
    expect(validateSetFieldDraft(farmerRecording, { weight: "32", reps: "", distanceM: "abc", durationSec: "" })).toContain("距离");
  });

  it("labels unilateral distance and duration inputs as per-side values without adding side rows", () => {
    const markup = renderToStaticMarkup(
      <SetFieldEditor
        recording={perSideRecording}
        weightUnit="kg"
        value={{ weight: "32", reps: "", distanceM: "40", durationSec: "28" }}
        onChange={() => undefined}
      />
    );

    expect(markup).toContain('aria-label="每侧距离 (m)"');
    expect(markup).toContain('aria-label="每侧用时 (秒)"');
    expect(markup).not.toContain("左侧");
    expect(markup).not.toContain("右侧");
  });

  it("reuses one clearable numeric input for optional resistance without a parallel status selector", () => {
    const markup = renderToStaticMarkup(
      <SetFieldEditor
        recording={resistanceRecording}
        weightUnit="kg"
        value={{ weight: "", reps: "", distanceM: "1000", durationSec: "600", contextValue: "" }}
        onChange={() => undefined}
      />
    );

    expect(markup).toContain('aria-label="阻力档位（可选）"');
    expect(markup).not.toContain("<select");
    expect(markup).not.toContain("已记录数值");
    expect(markup).not.toContain("未记录");
    expect(validateSetFieldDraft(resistanceRecording, { weight: "", reps: "", distanceM: "1000", durationSec: "600", contextValue: "" })).toBeNull();
    expect(validateSetFieldDraft(resistanceRecording, { weight: "", reps: "", distanceM: "1000", durationSec: "600", contextValue: "0" })).toBeNull();
  });
});
