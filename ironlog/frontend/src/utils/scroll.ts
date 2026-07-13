interface ScrollTarget {
  scrollTo(options: { top: number; left: number; behavior: "auto" }): void;
}

export function scrollTargetsToTop(...targets: Array<ScrollTarget | null | undefined>): void {
  for (const target of targets) target?.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

export function scrollAppToTop(): void {
  const main = typeof document === "undefined" ? null : document.querySelector<HTMLElement>("main");
  const viewport = typeof window === "undefined" ? null : window;
  scrollTargetsToTop(main, viewport);
}
