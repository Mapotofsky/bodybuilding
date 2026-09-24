/** Values for datetime-local use the device's wall clock, without a zone suffix. */
export function toLocalDateTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const two = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;
}

/** Keep the exact original instant (including seconds) when the field was untouched. */
export function fromLocalDateTime(value: string, original: string | null): string | null {
  if (!value) return null;
  return original && value === toLocalDateTime(original) ? original : new Date(value).toISOString();
}

export function elapsedSeconds(start: string | null, endMs: number): number {
  if (!start) return 0;
  const startMs = Date.parse(start);
  return Number.isFinite(startMs) ? elapsedBetweenMs(startMs, endMs) : 0;
}

export function elapsedBetweenMs(startMs: number, endMs: number): number {
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}
