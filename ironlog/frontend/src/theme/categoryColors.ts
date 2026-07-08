export const CATEGORY_COLOR_KEYS = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "cardio",
  "compound",
  "stretch",
  "other",
] as const;

export type CategoryColorKey = typeof CATEGORY_COLOR_KEYS[number];

const CATEGORY_TO_COLOR: Record<string, CategoryColorKey> = {
  chest: "chest",
  back: "back",
  legs: "legs",
  shoulders: "shoulders",
  arms: "arms",
  core: "core",
  cardio: "cardio",
  compound: "compound",
  stretch: "stretch",
};

export function categoryColorKey(category: string | null | undefined): CategoryColorKey {
  return CATEGORY_TO_COLOR[category || ""] || "other";
}

export function categoryStyle(category: string | null | undefined): CSSProperties {
  return categoryKeyStyle(categoryColorKey(category));
}

export function categoryKeyStyle(key: CategoryColorKey): CSSProperties {
  return {
    backgroundColor: `var(--category-${key}-bg)`,
    borderColor: `var(--category-${key}-border)`,
    color: `var(--category-${key}-text)`,
  };
}
import type { CSSProperties } from "react";
