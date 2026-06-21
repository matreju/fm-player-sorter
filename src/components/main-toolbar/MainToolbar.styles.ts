import type { CSSProperties } from "react";
import { uiColors } from "../ui";

export const mainToolbarStyles: Record<string, CSSProperties> = {
  toolbar: {
    padding: 0,
    border: "none",
    background: "transparent",
  },

  toolbarGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
    alignItems: "stretch",
  },

  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    minWidth: 0,
  },

  filterLabel: {
    color: "#9fb8df",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  filePickerRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
    width: "100%",
    minHeight: 34,
    overflow: "hidden",
  },

  fileInput: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    border: 0,
  },

  fileButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    minWidth: 118,
    padding: "0 11px",
    borderRadius: 9,
    border: `1px solid ${uiColors.accentStrong}`,
    background: uiColors.accentSoft,
    color: "#bae6fd",
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: 12,
    lineHeight: 1,
    transition:
      "background 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease",
  },

  fileName: {
    color: uiColors.textSoft,
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  },

  toolbarActions: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 7,
    alignItems: "stretch",
    paddingTop: 2,
  },

  toolbarCheckbox: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: uiColors.textSoft,
    fontSize: 12,
    whiteSpace: "normal",
    lineHeight: 1.25,
  },

  toolbarCounter: {
    color: uiColors.textSoft,
    fontSize: 12,
    whiteSpace: "normal",
    lineHeight: 1.3,
    padding: "7px 9px",
    border: `1px solid ${uiColors.borderStrong}`,
    borderRadius: 9,
    background: uiColors.panelSoft,
  },

  helperText: {
    marginTop: 4,
    color: uiColors.muted,
    fontSize: 11,
    lineHeight: 1.35,
  },

  fieldInput: {
    width: "100%",
  },

  ageGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 7,
  },
};