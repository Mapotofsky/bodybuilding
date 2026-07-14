interface ScrollTarget {
  scrollTo(options: { top: number; left: number; behavior: "auto" }): void;
}

interface ScrollStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function scrollTargetsToTop(...targets: Array<ScrollTarget | null | undefined>): void {
  for (const target of targets) target?.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

export function scrollAppToTop(): void {
  const main = typeof document === "undefined" ? null : document.querySelector<HTMLElement>("main");
  const viewport = typeof window === "undefined" ? null : window;
  scrollTargetsToTop(main, viewport);
}

export function saveRouteScrollPosition(storage: ScrollStorage, key: string, route: string, top: number): void {
  storage.setItem(key, JSON.stringify({ route, top }));
}

export function restoreRouteScrollPosition(storage: ScrollStorage, key: string, route: string, target: ScrollTarget | null): boolean {
  const value = storage.getItem(key);
  if (!value || !target) return false;
  try {
    const saved = JSON.parse(value) as { route?: unknown; top?: unknown };
    if (saved.route !== route || typeof saved.top !== "number" || !Number.isFinite(saved.top) || saved.top < 0) return false;
    target.scrollTo({ top: saved.top, left: 0, behavior: "auto" });
    storage.removeItem(key);
    return true;
  } catch {
    storage.removeItem(key);
    return false;
  }
}
