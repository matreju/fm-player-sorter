import type { CSSProperties } from "react";

export const mainToolbarStyles: Record<string, CSSProperties> = {
  toolbar: {
    display: "grid",
    gap: 8,
    padding: "9px 12px 8px",
    borderBottom: "1px solid #26293d",
    background: "#131625",
  },

  toolbarGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(260px, 1.5fr) minmax(72px, 0.3fr) minmax(72px, 0.3fr) minmax(130px, 0.55fr) auto",
    gap: 8,
    alignItems: "end",
  },

  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },

  filterLabel: {
    color: "#85899f",
    fontSize: 9,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },

  fieldInput: {
    width: "100%",
    minHeight: 34,
    borderRadius: 6,
    borderColor: "#34384f",
    background: "#0f1120",
  },

  toolbarActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
    justifyContent: "flex-end",
  },

  toolbarBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minWidth: 0,
  },

  toolbarOptions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
  },

  toolbarCheckbox: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#aaaec2",
    fontSize: 10,
    lineHeight: 1.2,
  },

  toolbarMeta: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  toolbarCounter: {
    color: "#85899f",
    fontSize: 10,
    whiteSpace: "nowrap",
  },

  analysisGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(150px, 190px) minmax(130px, 160px) minmax(230px, 1fr) minmax(110px, 140px) auto",
    gap: 8,
    alignItems: "end",
    paddingTop: 8,
    borderTop: "1px solid #2b3047",
  },

  analysisCheckboxWrap: {
    minHeight: 34,
    display: "flex",
    alignItems: "center",
  },

  analysisCheckbox: {
    minHeight: 34,
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "0 9px",
    border: "1px solid #34384f",
    borderRadius: 6,
    background: "#111728",
    color: "#c6c9d9",
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
};
