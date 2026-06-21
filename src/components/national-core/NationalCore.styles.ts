import type { CSSProperties } from "react";

export const nationalCoreStyles: Record<string, CSSProperties> = {
  floatingButton: {
    position: "fixed",
    right: 0,
    top: "calc(50% + 188px)",
    zIndex: 45,
    writingMode: "vertical-rl",
    textOrientation: "mixed",
    border: "1px solid rgba(56, 189, 248, 0.75)",
    borderRight: "none",
    borderRadius: "14px 0 0 14px",
    background: "linear-gradient(180deg, #0ea5e9, #0369a1)",
    color: "#ecfeff",
    fontWeight: 950,
    letterSpacing: 1.5,
    padding: "13px 10px",
    cursor: "pointer",
    boxShadow: "0 18px 42px rgba(0,0,0,0.45)",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 80,
    background: "rgba(2, 6, 23, 0.72)",
    backdropFilter: "blur(8px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  drawer: {
    width: "min(1500px, calc(100vw - 96px))",
    height: "min(900px, calc(100vh - 64px))",
    background:
      "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98))",
    border: "1px solid rgba(148, 163, 184, 0.25)",
    borderRadius: 24,
    boxShadow: "0 28px 90px rgba(0,0,0,0.55)",
    color: "#e5e7eb",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  header: {
    padding: "18px 24px 12px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
  },

  title: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 27,
    fontWeight: 950,
  },

  subtitle: {
    marginTop: 3,
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 750,
  },

  closeButton: {
    border: "1px solid rgba(147, 197, 253, 0.45)",
    background: "rgba(15, 23, 42, 0.9)",
    color: "#dbeafe",
    borderRadius: 14,
    width: 42,
    height: 42,
    cursor: "pointer",
    fontSize: 24,
    fontWeight: 900,
  },

  body: {
    padding: 16,
    overflow: "auto",
    display: "grid",
    gap: 14,
  },

  tilesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(170px, 1fr))",
    gap: 12,
  },

  navTile: {
    border: "1px solid rgba(148, 163, 184, 0.20)",
    borderRadius: 16,
    background: "rgba(15, 23, 42, 0.88)",
    color: "#e5e7eb",
    padding: 14,
    textAlign: "left",
    cursor: "pointer",
    minHeight: 98,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  navTileActive: {
    borderColor: "rgba(56, 189, 248, 0.85)",
    background:
      "linear-gradient(135deg, rgba(14, 116, 144, 0.52), rgba(15, 23, 42, 0.94))",
    boxShadow: "0 0 0 2px rgba(56, 189, 248, 0.22)",
  },

  navTileTitle: {
    fontSize: 18,
    fontWeight: 950,
    color: "#f8fafc",
  },

  navTileText: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 1.3,
    fontWeight: 750,
  },

  navTileMetric: {
    marginTop: 8,
    display: "inline-flex",
    width: "fit-content",
    borderRadius: 999,
    padding: "3px 9px",
    border: "1px solid rgba(96, 165, 250, 0.35)",
    background: "rgba(37, 99, 235, 0.18)",
    color: "#bfdbfe",
    fontSize: 11,
    fontWeight: 950,
  },

  panel: {
    border: "1px solid rgba(148, 163, 184, 0.20)",
    background: "rgba(15, 23, 42, 0.82)",
    borderRadius: 20,
    padding: 16,
    minHeight: 340,
  },

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },

  panelTitle: {
    margin: 0,
    fontSize: 24,
    color: "#f8fafc",
    fontWeight: 950,
  },

  panelHint: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 750,
  },

  toolbar: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },

  input: {
    minWidth: 260,
    border: "1px solid rgba(148, 163, 184, 0.25)",
    background: "rgba(2, 6, 23, 0.45)",
    color: "#f8fafc",
    borderRadius: 12,
    padding: "9px 12px",
    fontWeight: 800,
  },

  positionFilters: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },

  positionFilterButton: {
    border: "1px solid rgba(148, 163, 184, 0.22)",
    background: "rgba(15, 23, 42, 0.78)",
    color: "#bfdbfe",
    borderRadius: 999,
    padding: "7px 11px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
  },

  positionFilterButtonActive: {
    borderColor: "rgba(56, 189, 248, 0.8)",
    background: "rgba(14, 165, 233, 0.22)",
    color: "#e0f2fe",
    boxShadow: "0 0 0 2px rgba(56, 189, 248, 0.16)",
  },

  list: {
    display: "grid",
    gap: 8,
  },

  playerCard: {
    border: "1px solid rgba(96, 165, 250, 0.18)",
    background: "rgba(15, 23, 42, 0.92)",
    borderRadius: 14,
    padding: "10px 12px",
    display: "grid",
    gridTemplateColumns:
      "42px minmax(270px, 1.25fr) repeat(6, minmax(70px, 0.36fr))",
    gap: 9,
    alignItems: "center",
  },

  playerRank: {
    width: 34,
    height: 34,
    borderRadius: 999,
    background: "rgba(59, 130, 246, 0.18)",
    border: "1px solid rgba(96, 165, 250, 0.26)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#bfdbfe",
    fontWeight: 950,
    fontSize: 13,
  },

  playerMain: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
  },

  playerName: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: 950,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  playerMeta: {
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: 750,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  playerSubMeta: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

statBox: {
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "rgba(2, 6, 23, 0.34)",
  borderRadius: 11,
  padding: "6px 7px",
  textAlign: "center",
  minHeight: 50,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
},

statLabel: {
  display: "block",
  color: "#93c5fd",
  fontSize: 8,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: 0.35,
  lineHeight: 1.05,
  whiteSpace: "normal",
},
statValue: {
  display: "block",
  marginTop: 4,
  color: "#f8fafc",
  fontSize: 14,
  fontWeight: 950,
  whiteSpace: "nowrap",
},

  badge: {
    display: "inline-flex",
    width: "fit-content",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 10,
    fontWeight: 950,
    border: "1px solid rgba(96, 165, 250, 0.35)",
    background: "rgba(59, 130, 246, 0.16)",
    color: "#bfdbfe",
  },

  captainBadge: {
    display: "inline-flex",
    width: "fit-content",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 10,
    fontWeight: 950,
    border: "1px solid rgba(234, 179, 8, 0.45)",
    background: "rgba(234, 179, 8, 0.16)",
    color: "#fde68a",
  },

  regularBadge: {
    borderColor: "rgba(34, 197, 94, 0.42)",
    background: "rgba(34, 197, 94, 0.15)",
    color: "#bbf7d0",
  },

  rotationBadge: {
    borderColor: "rgba(234, 179, 8, 0.42)",
    background: "rgba(234, 179, 8, 0.13)",
    color: "#fde68a",
  },

  empty: {
    border: "1px dashed rgba(148, 163, 184, 0.35)",
    borderRadius: 16,
    padding: 22,
    color: "#94a3b8",
    fontWeight: 800,
  },
};