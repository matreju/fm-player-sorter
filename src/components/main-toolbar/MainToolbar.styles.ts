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
};
