import { DEFAULT_THEME_ID } from "@/core/models";

export const THEME_VARIABLE_KEYS = [
  "bg",
  "surface",
  "surface2",
  "text",
  "textSecondary",
  "border",
  "primary",
  "primaryHover",
  "primarySoft",
  "focus",
  "success",
  "warning",
  "danger",
  "disabledBg",
  "disabledText",
  "chart1",
  "chart2",
  "chart3",
] as const;

export type ThemeVariableKey = typeof THEME_VARIABLE_KEYS[number];

export interface ThemeDefinition {
  id: string;
  name: string;
  variables: Record<ThemeVariableKey, string>;
}

export const THEME_DEFINITIONS: ThemeDefinition[] = [
  {
    id: DEFAULT_THEME_ID,
    name: "翠绿石板",
    variables: {
      bg: "#F1F5F9",
      surface: "#FFFFFF",
      surface2: "#F8FAFC",
      text: "#0F172A",
      textSecondary: "#64748B",
      border: "#E2E8F0",
      primary: "#10B981",
      primaryHover: "#059669",
      primarySoft: "#D1FAE5",
      focus: "#A7F3D0",
      success: "#10B981",
      warning: "#F59E0B",
      danger: "#EF4444",
      disabledBg: "#E2E8F0",
      disabledText: "#94A3B8",
      chart1: "#10B981",
      chart2: "#14B8A6",
      chart3: "#F59E0B",
    },
  },
  {
    id: "forest-parchment",
    name: "森林羊皮纸",
    variables: {
      bg: "#F6F5EE",
      surface: "#FFFEF8",
      surface2: "#EFEFE4",
      text: "#1F2D25",
      textSecondary: "#66736A",
      border: "#D8DDD3",
      primary: "#2F6B4F",
      primaryHover: "#24543E",
      primarySoft: "#DCEBDD",
      focus: "#A7C7AE",
      success: "#2F6B4F",
      warning: "#B7791F",
      danger: "#B84A4A",
      disabledBg: "#E5E2D8",
      disabledText: "#8D968D",
      chart1: "#2F6B4F",
      chart2: "#7A9F58",
      chart3: "#B7791F",
    },
  },
  {
    id: "sunset-coral",
    name: "夕照珊瑚",
    variables: {
      bg: "#FFF7F3",
      surface: "#FFFFFF",
      surface2: "#FFF0E9",
      text: "#34201A",
      textSecondary: "#7A625A",
      border: "#F0D7CD",
      primary: "#D95D39",
      primaryHover: "#B94728",
      primarySoft: "#FCE1D7",
      focus: "#F5B8A3",
      success: "#2E8B6B",
      warning: "#B7791F",
      danger: "#C43D3D",
      disabledBg: "#F3DED6",
      disabledText: "#A58D84",
      chart1: "#D95D39",
      chart2: "#2E8B6B",
      chart3: "#B7791F",
    },
  },
  {
    id: "violet-ink",
    name: "紫墨纸",
    variables: {
      bg: "#F8F6FC",
      surface: "#FFFFFF",
      surface2: "#F1EDF8",
      text: "#241B31",
      textSecondary: "#756B82",
      border: "#E3DCEC",
      primary: "#6D4AA2",
      primaryHover: "#553783",
      primarySoft: "#E8DDF7",
      focus: "#C9B5EA",
      success: "#2E8B6B",
      warning: "#A86D16",
      danger: "#B33D57",
      disabledBg: "#E7E1EE",
      disabledText: "#988EA5",
      chart1: "#6D4AA2",
      chart2: "#2E8B6B",
      chart3: "#A86D16",
    },
  },
  {
    id: "graphite-lime",
    name: "石墨青柠",
    variables: {
      bg: "#161A1B",
      surface: "#202627",
      surface2: "#2B3233",
      text: "#F2F5EF",
      textSecondary: "#B7C0B8",
      border: "#394142",
      primary: "#A3D94C",
      primaryHover: "#C1F06A",
      primarySoft: "#354521",
      focus: "#D8FF8B",
      success: "#77C66E",
      warning: "#E0B34B",
      danger: "#F07171",
      disabledBg: "#323839",
      disabledText: "#7B857E",
      chart1: "#A3D94C",
      chart2: "#77C66E",
      chart3: "#E0B34B",
    },
  },
];

export function resolveTheme(themeId: string | null | undefined): { theme: ThemeDefinition; requestedId: string; isFallback: boolean } {
  const requestedId = themeId || DEFAULT_THEME_ID;
  const theme = THEME_DEFINITIONS.find((item) => item.id === requestedId) || THEME_DEFINITIONS[0];
  return {
    theme,
    requestedId,
    isFallback: theme.id !== requestedId,
  };
}

export function themeLabel(themeId: string): string {
  const resolved = resolveTheme(themeId);
  return resolved.isFallback ? `不支持的主题 (${themeId})` : resolved.theme.name;
}
