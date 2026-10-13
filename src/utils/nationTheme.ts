import type { CSSProperties } from "react";

type ThemePalette = {
  primary: string;
  accent: string;
  accentSoft: string;
  accentFaint: string;
  accentBorder: string;
  headerGlow: string;
  markText: string;
  flag: string;
};

export type NationTheme = {
  flag: string;
  style: CSSProperties & Record<`--team-${string}`, string>;
};

const DEFAULT_THEME: ThemePalette = {
  primary: "#b832a8",
  accent: "#e849d3",
  accentSoft: "rgba(232, 73, 211, 0.14)",
  accentFaint: "rgba(232, 73, 211, 0.055)",
  accentBorder: "rgba(232, 73, 211, 0.42)",
  headerGlow: "rgba(232, 73, 211, 0.08)",
  markText: "#f39ce8",
  flag: "⚽",
};

const COUNTRY_THEMES: Array<[string[], ThemePalette]> = [
  [["polska", "poland"], {
    primary: "#b5122d",
    accent: "#ef3340",
    accentSoft: "rgba(239, 51, 64, 0.16)",
    accentFaint: "rgba(239, 51, 64, 0.07)",
    accentBorder: "rgba(239, 51, 64, 0.5)",
    headerGlow: "rgba(239, 51, 64, 0.15)",
    markText: "#ffffff",
    flag: "🇵🇱",
  }],
  [["anglia", "england"], { ...DEFAULT_THEME, primary: "#b91c1c", accent: "#e11d48", markText: "#ffffff", flag: "🏴" }],
  [["francja", "france"], { ...DEFAULT_THEME, primary: "#123c8c", accent: "#3b82f6", markText: "#ffffff", flag: "🇫🇷" }],
  [["niemcy", "germany"], { ...DEFAULT_THEME, primary: "#b77900", accent: "#f5c542", markText: "#fff3bf", flag: "🇩🇪" }],
  [["hiszpania", "spain"], { ...DEFAULT_THEME, primary: "#aa151b", accent: "#f1bf00", markText: "#fff2a8", flag: "🇪🇸" }],
  [["włochy", "wlochy", "italy"], { ...DEFAULT_THEME, primary: "#0055a4", accent: "#2f80ed", markText: "#ffffff", flag: "🇮🇹" }],
  [["portugalia", "portugal"], { ...DEFAULT_THEME, primary: "#b8102e", accent: "#e03c4f", markText: "#ffffff", flag: "🇵🇹" }],
  [["brazylia", "brazil"], { ...DEFAULT_THEME, primary: "#167c3b", accent: "#f4c430", markText: "#fff4a8", flag: "🇧🇷" }],
  [["argentyna", "argentina"], { ...DEFAULT_THEME, primary: "#3188b9", accent: "#75bde0", markText: "#ffffff", flag: "🇦🇷" }],
  [["holandia", "netherlands"], { ...DEFAULT_THEME, primary: "#c94c0c", accent: "#ff7a1a", markText: "#ffe1c7", flag: "🇳🇱" }],
  [["belgia", "belgium"], { ...DEFAULT_THEME, primary: "#b91c1c", accent: "#f2c94c", markText: "#fff2b0", flag: "🇧🇪" }],
  [["chorwacja", "croatia"], { ...DEFAULT_THEME, primary: "#c1122f", accent: "#e63950", markText: "#ffffff", flag: "🇭🇷" }],
  [["dania", "denmark"], { ...DEFAULT_THEME, primary: "#a71930", accent: "#e31837", markText: "#ffffff", flag: "🇩🇰" }],
  [["szwecja", "sweden"], { ...DEFAULT_THEME, primary: "#17629b", accent: "#f5cf32", markText: "#fff2a0", flag: "🇸🇪" }],
  [["norwegia", "norway"], { ...DEFAULT_THEME, primary: "#ba0c2f", accent: "#e52b50", markText: "#ffffff", flag: "🇳🇴" }],
  [["ukraina", "ukraine"], { ...DEFAULT_THEME, primary: "#1769aa", accent: "#ffd43b", markText: "#fff4ad", flag: "🇺🇦" }],
  [["czechy", "czech republic", "czechia"], { ...DEFAULT_THEME, primary: "#b51f36", accent: "#e43b55", markText: "#ffffff", flag: "🇨🇿" }],
];

function normalizeNation(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl-PL")
    .trim();
}

export function getNationTheme(nation: string | null | undefined): NationTheme {
  const normalized = normalizeNation(nation);
  const palette =
    COUNTRY_THEMES.find(([names]) =>
      names.some((name) => normalizeNation(name) === normalized),
    )?.[1] ?? DEFAULT_THEME;

  return {
    flag: palette.flag,
    style: {
      "--team-primary": palette.primary,
      "--team-accent": palette.accent,
      "--team-accent-soft": palette.accentSoft,
      "--team-accent-faint": palette.accentFaint,
      "--team-accent-border": palette.accentBorder,
      "--team-header-glow": palette.headerGlow,
      "--team-mark-text": palette.markText,
    },
  };
}
