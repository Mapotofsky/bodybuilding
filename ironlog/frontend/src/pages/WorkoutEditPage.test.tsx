import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkoutEditSetFieldBlock } from "./WorkoutEditPage";

describe("WorkoutEdit mobile set layout", () => {
  it("gives farmer-walk fields the full row below set controls", () => {
    const markup = renderToStaticMarkup(
      <WorkoutEditSetFieldBlock
        recording={{ recording_mode: "weight_distance_duration", load_basis: "per_hand", load_direction: "higher_better", rate_metric: "load_distance_per_time" }}
        setNumber={1}
        isWarmup={false}
        value={{ weight: "32", reps: "", distanceM: "40", durationSec: "28" }}
        weightUnit="kg"
        onChange={() => undefined}
        onRemove={() => undefined}
      />
    );

    expect(markup).toContain("data-mobile-set-toolbar");
    expect(markup).toContain("data-mobile-set-fields");
    expect(markup).toContain("w-full min-w-0");
    expect(markup).not.toContain("grid-cols-[40px_minmax(0,1fr)_36px]");
  });
});
