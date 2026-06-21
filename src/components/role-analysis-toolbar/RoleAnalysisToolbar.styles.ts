import type { CSSProperties } from "react";
import { uiColors } from "../ui";

export const roleAnalysisToolbarStyles: Record<string, CSSProperties> = {
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(150px, 190px) minmax(130px, 160px) minmax(230px, 1fr) minmax(110px, 140px) auto",
    gap: 8,
    alignItems: "end",
    padding: 9,
    border: `1px solid ${uiColors.borderStrong}`,
    borderRadius: 12,
    background:
      "linear-gradient(90deg, rgba(15, 23, 42, 0.98), rgba(16, 22, 36, 0.98))",
  },

  field: {
    minWidth: 0,
  },

  roleField: {
    minWidth: 0,
  },

  thresholdField: {
    minWidth: 0,
  },

  checkboxWrap: {
    minHeight: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingBottom: 1,
  },

  checkbox: {
    minHeight: 34,
    padding: "0 8px",
    border: `1px solid ${uiColors.borderStrong}`,
    borderRadius: 9,
    background: uiColors.panelSoft,
  },

  input: {
    width: "100%",
  },

  hiddenTitle: {
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
};