// Design tokens — generated from design/design-tokens.json (the visual
// authority). Values are verbatim; do NOT invent colors here. If a value
// changes, change design-tokens.json first, then mirror it.

export const color = {
  navy: "#16243D",
  navy2: "#24385C",
  slate: "#3C4C66",
  muted: "#6B7A93",
  ice: "#D9E6F7",
  ice2: "#EEF4FC",
  gold: "#E8A33D",
  goldDeep: "#C77F1A",
  red: "#C0504D",
  green: "#4E8A5A",
  gridline: "#E4E9F2",
} as const;

export type GlassStop = "full" | "reduced" | "opaque";

// Glass = navigation-layer material ONLY (chrome, rail, sheets, banners).
// Numbers live on solid surfaces.
export const glass: Record<
  GlassStop,
  { backdropFilter: string; background: string; border: string }
> = {
  full: {
    backdropFilter: "blur(22px) saturate(160%)",
    background: "rgba(22,36,61,0.55)",
    border: "1px solid rgba(255,255,255,0.14)",
  },
  reduced: {
    backdropFilter: "blur(10px) saturate(130%)",
    background: "rgba(22,36,61,0.82)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  opaque: {
    backdropFilter: "none",
    background: "rgba(22,36,61,0.98)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
};

export type Theme = "light" | "dark";

// Content-surface tokens per theme (chrome glass is theme-independent).
export const themes: Record<Theme, Record<string, string>> = {
  light: {
    surface: "#ffffff",
    "surface-alt": "#EEF4FC",
    border: "#D9E6F7",
    ink: "#16243D",
    "ink-2": "#3C4C66",
    muted: "#6B7A93",
    faint: "#9AA9C0",
    hairline: "#F0F4FA",
    row: "#ffffff",
    "row-alt": "#FBFDFF",
    th: "#EEF4FC",
    track: "#EEF4FC",
    "panel-border": "transparent",
    "pass-ink": "#3B6E47",
    "warn-ink": "#8A5A12",
    "page-bg": "radial-gradient(1100px 560px at 82% -8%, #dbe8f8, #EEF4FC 62%)",
  },
  dark: {
    surface: "#182A47",
    "surface-alt": "#1E3152",
    border: "rgba(255,255,255,.10)",
    ink: "#EAF1FB",
    "ink-2": "#C3D2E8",
    muted: "#93A6C4",
    faint: "#708AAE",
    hairline: "rgba(255,255,255,.07)",
    row: "#182A47",
    "row-alt": "#1D3053",
    th: "#21365A",
    track: "#263C5F",
    "panel-border": "rgba(232,163,61,.28)",
    "pass-ink": "#8FD3A0",
    "warn-ink": "#E8B765",
    "page-bg": "radial-gradient(1100px 560px at 82% -8%, #1b2d4c, #0d1830 62%)",
  },
};

// navy-2 is invisible on dark content surfaces — data-viz navy uses these.
export const chartNavyOnDark = {
  bar: "#3A5F94",
  barAlt: "#5A72A4",
  tierBalanced: "#6E8CBE",
} as const;

export const radius = {
  capsule: 99,
  card: 12,
  sheet: 16,
  paper: 6,
  field: 9,
  pill: 99,
} as const;

export const elevation = {
  card: "0 1px 2px rgba(22,36,61,.05)",
  chromeBar: "0 6px 24px rgba(11,18,32,.20)",
  rail: "0 8px 30px rgba(11,18,32,.18)",
  cluster: "0 16px 44px rgba(11,18,32,.30)",
  sheet: "-20px 0 70px rgba(11,18,32,.45)",
  modal: "0 30px 90px rgba(11,18,32,.5)",
} as const;

export const font = {
  latin: "'Inter', sans-serif",
  ja: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
  stack: "'Inter', 'Noto Sans JP', sans-serif",
  serifProposal: "'Noto Serif', 'Noto Serif JP', serif",
  mono: "'JetBrains Mono', monospace",
} as const;

export const focusRing = { color: color.gold, width: 2, offset: 2 } as const;

export const motion = {
  easing: "cubic-bezier(.2,.7,.2,1)",
  durationMs: 300,
} as const;

/** Apply a theme's tokens as CSS custom properties on the page root. */
export function themeVars(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(themes[theme])) vars[`--${k}`] = v;
  return vars;
}
