import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SetFieldEditor, { validateSetFieldDraft } from "./SetFieldEditor";
import { joinMinutesSeconds, splitSeconds } from "./ui/MinutesSecondsInput";

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
  it("renders farmer-walk fields in registry order with accessible labels", () => {
    const markup = renderToStaticMarkup(
      <SetFieldEditor
        recording={farmerRecording}
        weightUnit="kg"
        value={{ weight: "32", reps: "", distanceM: "40", durationSec: "28" }}
        onChange={() => undefined}
      />
    );

    expect(markup.indexOf("每手重量 (kg)")).toBeLessThan(markup.indexOf("距离 (m)"));
    expect(markup.indexOf("距离 (m)")).toBeLessThan(markup.indexOf("用时"));
    expect(markup).toContain('aria-label="每手重量 (kg)"');
    expect(markup).toContain('aria-label="距离 (m)"');
    expect(markup).toContain('aria-label="用时（分）"');
    expect(markup).toContain('aria-label="用时（秒）"');
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
    expect(markup).toContain('aria-label="每侧用时（分）"');
    expect(markup).toContain('aria-label="每侧用时（秒）"');
    expect(markup).not.toContain("左侧");
    expect(markup).not.toContain("右侧");
  });

  it("accepts blank and zero as distinct valid resistance drafts", () => {
    expect(validateSetFieldDraft(resistanceRecording, { weight: "", reps: "", distanceM: "1000", durationSec: "600", contextValue: "" })).toBeNull();
    expect(validateSetFieldDraft(resistanceRecording, { weight: "", reps: "", distanceM: "1000", durationSec: "600", contextValue: "0" })).toBeNull();
  });

  it("keeps duration values in seconds while presenting minutes and seconds", () => {
    expect(splitSeconds("125")).toEqual({ minutes: "2", seconds: "5" });
    expect(joinMinutesSeconds("2", "5")).toBe("125");
    expect(joinMinutesSeconds("", "")).toBe("");
    expect(joinMinutesSeconds("0", "0")).toBe("0");
    expect(joinMinutesSeconds("1", "60")).toBeNull();
    expect(joinMinutesSeconds("1440", "1")).toBeNull();
  });
});
