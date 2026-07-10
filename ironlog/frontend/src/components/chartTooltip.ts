import type { CSSProperties } from "react";

export const CHART_TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  boxShadow: "0 8px 20px rgb(0 0 0 / 0.16)",
  color: "var(--color-text)",
  fontSize: 12,
  padding: "10px 12px",
};

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "var(--color-text)",
  fontWeight: 600,
  marginBottom: 4,
};

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: "var(--color-primary)",
  padding: 0,
};
