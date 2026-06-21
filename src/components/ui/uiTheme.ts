import type { CSSProperties } from "react";

export const uiColors = {
  panel: "#101624",
  panelSoft: "#0f172a",
  panelStrong: "#151d2e",

  border: "#263247",
  borderStrong: "#334155",

  text: "#eef4ff",
  textSoft: "#c7d2e4",
  muted: "#9aa7bb",

  accent: "#38bdf8",
  accentSoft: "rgba(56, 189, 248, 0.14)",
  accentStrong: "#0ea5e9",

  success: "#22c55e",
  successSoft: "rgba(34, 197, 94, 0.16)",

  danger: "#ef4444",
  dangerSoft: "rgba(239, 68, 68, 0.16)",

  warning: "#f59e0b",
  warningSoft: "rgba(245, 158, 11, 0.16)",
};

export const uiTransitions =
  "background 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease, opacity 140ms ease, transform 140ms ease";

export const uiFieldLabelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  color: "#9fb8df",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

export const uiInputBaseStyle: CSSProperties = {
  height: 34,
  padding: "0 10px",
  borderRadius: 9,
  border: `1px solid ${uiColors.borderStrong}`,
  background: "#0b1220",
  color: uiColors.text,
  fontWeight: 850,
  outline: "none",
  transition: uiTransitions,
};

export const uiDisabledStyle: CSSProperties = {
  opacity: 0.48,
  cursor: "not-allowed",
};