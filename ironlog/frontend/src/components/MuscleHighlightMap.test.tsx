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
    expect(markup).toContain("viewBox=\"0 0 535 462\"");
    expect(markup).toContain("胸部：主目标");
    expect(markup).toContain("外展肌：次要目标");
    expect(markup).not.toContain("全身");
    expect(markup).not.toContain("其他");
  });

  it("keeps front abductor paths on the outer thigh and softens idle thigh overlays", () => {
    const markup = renderToStaticMarkup(
      <MuscleHighlightMap
        primaryMuscleGroupIds={["chest"]}
        secondaryMuscleGroupIds={[]}
      />
    );

    expect(markup).toContain("M 73.40,194.80 C 77.90,205.70");
    expect(regionMarkup(markup, "内收肌：未命中")).toContain("opacity=\"0.24\"");
    expect(regionMarkup(markup, "外展肌：未命中")).toContain("opacity=\"0.24\"");
  });
});

function regionMarkup(markup: string, title: string): string {
  const start = markup.indexOf(`<title>${title}</title>`);
  expect(start).toBeGreaterThanOrEqual(0);
  const nextTitle = markup.indexOf("<title>", start + title.length + 15);
  return nextTitle === -1 ? markup.slice(start) : markup.slice(start, nextTitle);
}
