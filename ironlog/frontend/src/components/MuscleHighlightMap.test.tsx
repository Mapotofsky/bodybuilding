import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MuscleHighlightMap from "./MuscleHighlightMap";

describe("MuscleHighlightMap", () => {
  it("renders body muscle highlights and omits non-body ids from the SVG map", () => {
    const markup = renderToStaticMarkup(
      <MuscleHighlightMap
        primaryMuscleGroupIds={["chest", "full_body"]}
        secondaryMuscleGroupIds={["abductors", "other"]}
      />
    );

    expect(markup).toContain("目标肌群人体高亮图");
    expect(markup).toContain("胸部：主目标");
    expect(markup).toContain("外展肌：次要目标");
    expect(markup).not.toContain("全身");
    expect(markup).not.toContain("其他");
  });
});
