import { resolveTheme } from "./themes";

export function applyThemeId(themeId: string | null | undefined): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(themeId);
  document.documentElement.dataset.theme = resolved.theme.id;
  document.getElementById("root")?.setAttribute("data-theme", resolved.theme.id);
}
