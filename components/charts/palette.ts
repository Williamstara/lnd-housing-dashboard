// Validated categorical/status/ordinal palette — see the dataviz skill's
// references/palette.md. Slot order is the CVD-safety mechanism (never
// cycle it); status colors are reserved for state (never reused as "series
// N"). Values are per-mode; pick via the chart's current theme.palette.mode.

export const CATEGORICAL = {
  light: ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7", "#e34948", "#e87ba4", "#eb6834"],
  dark: ["#3987e5", "#199e70", "#c98500", "#008300", "#9085e9", "#e66767", "#d55181", "#d95926"],
} as const;

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

// Ordinal (ordered tiers) ramp — single hue, light→dark reads as
// low→high severity. Kept within the near-surface contrast bounds the
// palette calls for on each mode (light: no lighter than step 250; dark:
// no darker than step 600).
export const ORDINAL_BLUE = {
  light: ["#86b6ef", "#5598e7", "#2a78d6", "#1c5cab"],
  dark: ["#b7d3f6", "#86b6ef", "#5598e7", "#2a78d6"],
} as const;

export const CHROME = {
  light: {
    track: "#e1e0d9",
    primaryInk: "#0b0b0b",
    secondaryInk: "#52514e",
    mutedInk: "#898781",
  },
  dark: {
    track: "#2c2c2a",
    primaryInk: "#ffffff",
    secondaryInk: "#c3c2b7",
    mutedInk: "#898781",
  },
} as const;

export type ChartMode = "light" | "dark";
