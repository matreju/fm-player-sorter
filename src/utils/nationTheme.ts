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

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function createPalette(
  primary: string,
  accent: string,
  flag: string,
  markText = "#ffffff",
): ThemePalette {
  return {
    primary,
    accent,
    accentSoft: hexToRgba(accent, 0.16),
    accentFaint: hexToRgba(accent, 0.07),
    accentBorder: hexToRgba(accent, 0.5),
    headerGlow: hexToRgba(accent, 0.14),
    markText,
    flag,
  };
}

const DEFAULT_THEME = createPalette("#b832a8", "#e849d3", "⚽", "#f39ce8");

const COUNTRY_THEMES: Array<[string[], ThemePalette]> = [
  [["polska", "poland"], createPalette("#b5122d", "#ef3340", "🇵🇱")],
  [["anglia", "england"], createPalette("#b91c1c", "#e11d48", "🏴")],
  [["francja", "france"], createPalette("#123c8c", "#3b82f6", "🇫🇷")],
  [["niemcy", "germany"], createPalette("#b77900", "#f5c542", "🇩🇪", "#fff3bf")],
  [["hiszpania", "spain"], createPalette("#aa151b", "#f1bf00", "🇪🇸", "#fff2a8")],
  [["włochy", "wlochy", "italy"], createPalette("#0055a4", "#2f80ed", "🇮🇹")],
  [["portugalia", "portugal"], createPalette("#b8102e", "#e03c4f", "🇵🇹")],
  [["brazylia", "brazil"], createPalette("#167c3b", "#f4c430", "🇧🇷", "#fff4a8")],
  [["argentyna", "argentina"], createPalette("#3188b9", "#75bde0", "🇦🇷")],
  [["holandia", "netherlands"], createPalette("#c94c0c", "#ff7a1a", "🇳🇱", "#ffe1c7")],
  [["belgia", "belgium"], createPalette("#b91c1c", "#f2c94c", "🇧🇪", "#fff2b0")],
  [["chorwacja", "croatia"], createPalette("#c1122f", "#e63950", "🇭🇷")],
  [["dania", "denmark"], createPalette("#a71930", "#e31837", "🇩🇰")],
  [["szwecja", "sweden"], createPalette("#17629b", "#f5cf32", "🇸🇪", "#fff2a0")],
  [["norwegia", "norway"], createPalette("#ba0c2f", "#e52b50", "🇳🇴")],
  [["ukraina", "ukraine"], createPalette("#1769aa", "#ffd43b", "🇺🇦", "#fff4ad")],
  [["czechy", "czech republic", "czechia"], createPalette("#b51f36", "#e43b55", "🇨🇿")],
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
