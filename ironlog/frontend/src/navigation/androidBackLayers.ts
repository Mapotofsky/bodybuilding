import { useLayoutEffect, useRef } from "react";

const dismissers: Array<() => void> = [];

export function registerAndroidBackDismiss(dismiss: () => void): () => void {
  dismissers.push(dismiss);
  return () => {
    const index = dismissers.lastIndexOf(dismiss);
    if (index >= 0) dismissers.splice(index, 1);
  };
}

export function dismissTopAndroidBackLayer(): boolean {
  const dismiss = dismissers.pop();
  if (!dismiss) return false;
  dismiss();
  return true;
}

export function useAndroidBackDismiss(active: boolean, dismiss: () => void): void {
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useLayoutEffect(() => {
    if (!active) return;
    return registerAndroidBackDismiss(() => dismissRef.current());
  }, [active]);
}
