export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function makeCustomExerciseId(): string {
  return `custom-ex-${makeId()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
