import { resolveTheme } from "./themes";
import { Capacitor, registerPlugin } from "@capacitor/core";

const SystemBars = registerPlugin<{ setTheme(options: { statusColor: string; navigationColor: string; statusDarkIcons: boolean; navigationDarkIcons: boolean }): Promise<void> }>("SystemBars");

export function applyThemeId(themeId: string | null | undefined): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(themeId);
  document.documentElement.dataset.theme = resolved.theme.id;
  document.getElementById("root")?.setAttribute("data-theme", resolved.theme.id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved.theme.variables.surface);
  updateSystemBars(window.location.pathname);
}

export function updateSystemBars(pathname: string): void {
  if (typeof document === "undefined") return;
  if (Capacitor.getPlatform() === "android") {
    const theme = resolveTheme(document.documentElement.dataset.theme).theme;
    const statusColor = pathname === "/" || pathname === "/profile" ? theme.variables.primary : theme.variables.surface;
    const navigationColor = theme.variables.surface;
    void SystemBars.setTheme({ statusColor, navigationColor, statusDarkIcons: hasDarkIcons(statusColor), navigationDarkIcons: hasDarkIcons(navigationColor) });
  }
}

function hasDarkIcons(color: string): boolean {
    const rgb = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16) / 255);
    const luminance = rgb.reduce((sum, value, index) => sum + (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index], 0);
    return luminance > 0.179;
}
