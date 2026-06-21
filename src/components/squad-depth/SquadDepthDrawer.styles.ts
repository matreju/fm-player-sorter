import type { CSSProperties } from "react";
import { uiColors } from "../ui";

export const squadDepthDrawerStyles: Record<string, CSSProperties> = {
  drawer: {
    position: "fixed",
    left: 20,
    right: 20,
    bottom: 14,
    zIndex: 80,
    border: `1px solid ${uiColors.border}`,
    borderRadius: 14,
    background:
      "linear-gradient(180deg, rgba(16, 22, 36, 0.98), rgba(11, 16, 28, 0.98))",
    boxShadow: "0 18px 50px rgba(0, 0, 0, 0.45)",
    overflow: "hidden",
  },

  drawerOpen: {
    maxHeight: "58vh",
  },

  header: {
    width: "100%",
    minHeight: 52,
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    background:
      "linear-gradient(90deg, rgba(56, 189, 248, 0.13), rgba(34, 197, 94, 0.08))",
    border: "none",
    borderBottom: `1px solid ${uiColors.border}`,
    color: uiColors.text,
    cursor: "pointer",
    fontSize: 13,
    textAlign: "left",
  },

  headerSummary: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
    lineHeight: 1.25,
  },

  headerTitle: {
    color: uiColors.text,
    fontSize: 14,
    fontWeight: 950,
  },

  headerMeta: {
    color: uiColors.textSoft,
  },

  toggleLabel: {
    flex: "0 0 auto",
    color: "#bae6fd",
    fontSize: 12,
    fontWeight: 950,
  },

  body: {
    padding: 14,
    maxHeight: "calc(58vh - 52px)",
    overflow: "auto",
  },

  warningList: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  warningItem: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(245, 158, 11, 0.14)",
    border: "1px solid rgba(245, 158, 11, 0.40)",
    color: "#fde68a",
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 12,
  },

  card: {
    padding: 12,
    border: `1px solid ${uiColors.border}`,
    borderRadius: 12,
    background: uiColors.panelSoft,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
    marginBottom: 8,
    borderBottom: `1px solid ${uiColors.border}`,
  },

  positionName: {
    color: uiColors.text,
    fontSize: 13,
    fontWeight: 950,
  },

  countBadge: {
    padding: "4px 8px",
    borderRadius: 999,
    border: `1px solid ${uiColors.borderStrong}`,
    background: uiColors.panelStrong,
    color: uiColors.textSoft,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  players: {
    display: "grid",
    gap: 7,
  },

  player: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "7px 8px",
    border: `1px solid ${uiColors.border}`,
    borderRadius: 9,
    background: "#0b1220",
    color: uiColors.text,
    fontSize: 13,
  },

  playerMeta: {
    color: uiColors.muted,
    fontSize: 11,
    lineHeight: 1.3,
  },

  emptyPlayer: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "8px 9px",
    border: "1px dashed rgba(245, 158, 11, 0.45)",
    borderRadius: 9,
    background: "rgba(245, 158, 11, 0.08)",
    color: "#fde68a",
    fontSize: 13,
  },
};