import { Children, isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import TemplateColorPicker, { TEMPLATE_PRESET_COLORS } from "./TemplateColorPicker";

describe("TemplateColorPicker", () => {
  it("offers only valid preset colors and reports the selected value", () => {
    const onChange = vi.fn();
    const buttons = findButtons(TemplateColorPicker({ value: TEMPLATE_PRESET_COLORS[1], onChange }));

    expect(TEMPLATE_PRESET_COLORS.length).toBeGreaterThan(0);
    expect(new Set(TEMPLATE_PRESET_COLORS).size).toBe(TEMPLATE_PRESET_COLORS.length);
    expect(TEMPLATE_PRESET_COLORS.every((color) => /^#[0-9a-f]{6}$/i.test(color))).toBe(true);
    expect(buttons).toHaveLength(TEMPLATE_PRESET_COLORS.length);
    buttons[0].onClick();
    expect(onChange).toHaveBeenCalledWith(TEMPLATE_PRESET_COLORS[0]);
  });
});

function findButtons(node: ReactNode): Array<{ onClick: () => void }> {
  if (!isValidElement(node)) return [];
  const props = node.props as { children?: ReactNode; onClick?: () => void };
  const current = node.type === "button" && props.onClick ? [{ onClick: props.onClick }] : [];
  return current.concat(Children.toArray(props.children).flatMap(findButtons));
}
