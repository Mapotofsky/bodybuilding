import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import TemplateColorPicker from "./TemplateColorPicker";

describe("TemplateColorPicker", () => {
  it("removes the meaningless no-color option when adding or editing a template", () => {
    const markup = renderToStaticMarkup(<TemplateColorPicker value="#10B981" onChange={() => undefined} />);
    expect(markup).not.toContain(">无<");
    expect(markup).toContain("aria-label=\"模板颜色\"");
  });
});
