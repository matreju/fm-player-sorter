import type { CSSProperties } from "react";

const colors = {
  page: "#070b12",
  pageSoft: "#0b1020",

  panel: "#101624",
  panelStrong: "#151d2e",
  panelSoft: "#0f172a",
  table: "#0d1320",
  tableRow: "#101827",
  tableHeader: "#172033",

  border: "#263247",
  borderSoft: "#1f2a3d",
  borderStrong: "#334155",

  text: "#eef4ff",
  textSoft: "#c7d2e4",
  muted: "#9aa7bb",
  mutedDark: "#64748b",

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

const radii = {
  sm: 7,
  md: 10,
  lg: 14,
  xl: 18,
};

const shadows = {
  panel: "0 18px 50px rgba(0, 0, 0, 0.28)",
  modal: "0 24px 80px rgba(0, 0, 0, 0.72)",
};

export const styles: Record<string, CSSProperties> = {
page: {
  minHeight: "100vh",
  padding: "12px 12px 72px",
  background:
    "radial-gradient(circle at top left, rgba(56, 189, 248, 0.10), transparent 36rem), radial-gradient(circle at top right, rgba(34, 197, 94, 0.07), transparent 30rem), #070b12",
  color: colors.text,
  fontSize: 12,
},

appShell: {
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: 12,
  alignItems: "start",
},

rightColumn: {
  display: "grid",
  minWidth: 0,
  gap: 12,
  alignContent: "start",
},

leftSidebar: {
  position: "sticky",
  top: 12,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  background:
    "linear-gradient(180deg, rgba(16, 22, 36, 0.98), rgba(12, 18, 30, 0.98))",
  boxShadow: shadows.panel,
  padding: 10,
  overflow: "visible",
},
sidebarTitle: {
  margin: "0 0 10px",
  padding: "8px 10px",
  borderRadius: radii.md,
  border: `1px solid ${colors.borderSoft}`,
  background:
    "linear-gradient(90deg, rgba(56, 189, 248, 0.13), rgba(34, 197, 94, 0.08))",
  color: colors.text,
  fontSize: 18,
  fontWeight: 950,
  letterSpacing: "-0.03em",
  lineHeight: 1,
  textAlign: "center",
},

mainWorkspace: {
  minWidth: 0,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  background:
    "linear-gradient(180deg, rgba(16, 22, 36, 0.98), rgba(11, 16, 28, 0.98))",
  boxShadow: shadows.panel,
  padding: 10,
},

workspaceTop: {
  marginBottom: 6,
},

tableArea: {
  marginTop: 6,
},

tablePagination: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "8px 10px",
  border: `1px solid ${colors.border}`,
  borderBottom: "none",
  borderRadius: `${radii.lg}px ${radii.lg}px 0 0`,
  background: colors.panelSoft,
  color: colors.textSoft,
},

tablePaginationActions: {
  display: "flex",
  alignItems: "center",
  gap: 8,
},

tablePaginationButton: {
  minHeight: 28,
  padding: "4px 9px",
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: radii.sm,
  background: colors.panelStrong,
  color: colors.text,
  font: "inherit",
  fontWeight: 800,
  cursor: "pointer",
},
  header: {
    marginBottom: 20,
  },
  title: {
    marginTop: 0,
    marginBottom: 8,
  },
toolbar: {
  padding: 0,
  border: "none",
  background: "transparent",
},

toolbarGrid: {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 7,
  alignItems: "stretch",
},

filterField: {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
},

filterLabel: {
  color: "#8f98aa",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: 0.4,
},

filePickerRow: {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  width: "100%",
  height: 28,
  overflow: "hidden",
},

fileButton: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 28,
  width: 112,
  padding: "0 8px",
  borderRadius: 7,
  border: "1px solid #394866",
  background: "#20283a",
  color: "#f2f5fb",
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontSize: 12,
},

fileName: {
  color: "#b9bfce",
  fontSize: 11,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
},

toolbarActions: {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 6,
  alignItems: "stretch",
},
stats: {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 0,
  color: colors.textSoft,
},
sortInfo: {
  margin: 0,
  color: colors.accent,
  fontSize: 12,
},
error: {
  margin: 0,
  padding: "8px 10px",
  border: `1px solid ${colors.danger}`,
  borderRadius: radii.md,
  background: colors.dangerSoft,
  color: "#fecaca",
  fontWeight: 800,
},
tableWrapper: {
  maxHeight: "calc(100vh - 192px)",
  overflow: "auto",
  border: `1px solid ${colors.border}`,
  borderRadius: `0 0 ${radii.lg}px ${radii.lg}px`,
  background: colors.table,
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
},
table: {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: 12,
  background: colors.table,
},


markButtonSelected: {
  background: colors.successSoft,
  borderColor: colors.success,
  color: "#86efac",
},

markButtonRejected: {
  background: colors.dangerSoft,
  borderColor: colors.danger,
  color: "#fca5a5",
},

emptyDetailText: {
  color: "#8b95a7",
  fontSize: 13,
  padding: "8px 0",
},



compareBoxTitle: {
  margin: "0 0 10px",
  fontSize: 15,
  color: "#f2f4f8",
  textAlign: "left",
},


verdictCompactList: {
  display: "grid",
  gap: 4,
},

verdictRow: {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "7px 0",
  borderBottom: "1px solid #252b36",
  color: "#dbe4f0",
  fontSize: 12,
},

compareBody: {
  display: "grid",
  gridTemplateColumns: "360px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
  marginTop: 16,
},

compareLeftPanel: {
  display: "grid",
  gap: 12,
  minWidth: 0,
},

compareMiniBox: {
  padding: 12,
  border: "1px solid #2a2f3a",
  borderRadius: 10,
  background: "#151922",
  minWidth: 0,
},

fullAttributesPanel: {
  padding: 12,
  border: "1px solid #2a2f3a",
  borderRadius: 10,
  background: "#151922",
  minWidth: 0,
},

fullAttributesHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
},

fullAttributesLegend: {
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#aeb6c7",
  fontSize: 12,
  flexWrap: "wrap",
},

leftLegendDot: {
  width: 9,
  height: 9,
  borderRadius: 999,
  background: "#6eb6ff",
  display: "inline-block",
},

rightLegendDot: {
  width: 9,
  height: 9,
  borderRadius: 999,
  background: "#9aff8f",
  display: "inline-block",
},

fullAttributesScroll: {
  maxHeight: 560,
  overflow: "auto",
  paddingRight: 4,
},
groupBox: {
  marginTop: 0,
  marginBottom: 14,
},
groupTitle: {
  color: "#f2f4f8",
  fontSize: 14,
  margin: "0 0 6px",
},
attributeRow: {
  display: "grid",
  gridTemplateColumns: "135px 42px minmax(150px, 1fr) 42px 48px",
  alignItems: "center",
  gap: 7,
  padding: "6px 7px",
  borderBottom: "1px solid #222631",
  borderLeft: "3px solid transparent",
  borderRadius: 4,
},

attributeName: {
  color: "#dce2ef",
  fontSize: 12,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
},
sectionSummaryRow: {
  display: "grid",
  gridTemplateColumns: "135px 42px minmax(150px, 1fr) 42px 48px",
  alignItems: "center",
  gap: 7,
  padding: "7px",
  marginTop: 5,
  borderRadius: 6,
  border: "1px solid #343b4a",
  background: "#181d27",
},
toolbarCheckbox: {
  display: "flex",
  alignItems: "center",
  gap: 6,
  color: "#d8dee9",
  fontSize: 12,
  whiteSpace: "normal",
  lineHeight: 1.2,
},

toolbarCounter: {
  color: "#cbd5e1",
  fontSize: 12,
  whiteSpace: "normal",
  lineHeight: 1.25,
  padding: "6px 8px",
  border: "1px solid #334155",
  borderRadius: 7,
  background: "#0f131b",
},playerModalOverlay: {
  position: "fixed",
  inset: 0,
  zIndex: 300,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 10,
  background: "rgba(3, 7, 18, 0.78)",
  backdropFilter: "blur(5px)",
},

playerModal: {
  width: "min(1320px, calc(100vw - 20px))",
  maxHeight: "calc(100vh - 20px)",
  overflow: "auto",
  padding: 10,
  border: "1px solid #343b4a",
  borderRadius: 12,
  background: "#11141b",
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.72)",
  fontSize: 12,
},

playerModalHero: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "8px 11px",
  marginBottom: 8,
  border: "1px solid #2f3747",
  borderRadius: 10,
  background:
    "linear-gradient(90deg, rgba(37, 44, 63, 0.95), rgba(20, 24, 35, 0.95))",
},

playerModalName: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 19,
  fontWeight: 900,
  letterSpacing: "-0.02em",
},

playerModalMeta: {
  marginTop: 3,
  color: "#b7c1d3",
  fontSize: 11,
  fontWeight: 600,
},

modalCloseButton: {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid #3b4252",
  background: "#1a1f2b",
  color: "#f8fafc",
  fontSize: 20,
  lineHeight: "24px",
  cursor: "pointer",
  fontWeight: 800,
},

playerModalControls: {
  display: "grid",
  gridTemplateColumns: "170px 170px minmax(300px, 1fr)",
  gap: 7,
  alignItems: "end",
  marginBottom: 7,
},

playerModalControlField: {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  color: "#aeb6c7",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

playerModalSelect: {
  height: 28,
  padding: "0 8px",
  borderRadius: 7,
  border: "1px solid #313746",
  background: "#0f131b",
  color: "#f2f4f8",
  outline: "none",
  fontSize: 12,
  fontWeight: 700,
},

playerModalRoleSelect: {
  height: 28,
  padding: "0 8px",
  borderRadius: 7,
  border: "1px solid #313746",
  background: "#0f131b",
  color: "#f2f4f8",
  outline: "none",
  fontSize: 12,
  fontWeight: 700,
  width: "100%",
},

playerModalContextLine: {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  marginBottom: 8,
  padding: "7px 9px",
  border: "1px solid #293142",
  borderRadius: 8,
  background: "#0f131b",
  color: "#aeb6c7",
  fontSize: 12,
},

playerSummaryGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
  marginBottom: 8,
},

statCard: {
  padding: "7px 9px",
  border: "1px solid #2c313a",
  borderRadius: 8,
  background: "#151922",
  minHeight: 44,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: 4,
  textAlign: "center",
},

statLabel: {
  color: "#9fb0c8",
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
},

playerModalAnalysisGrid: {
  display: "grid",
  gridTemplateColumns:
    "minmax(280px, 0.9fr) minmax(280px, 1fr) minmax(280px, 1fr) minmax(220px, 0.75fr)",
  gap: 10,
  alignItems: "start",
  marginTop: 8,
},

playerDetailBox: {
  padding: 9,
  border: "1px solid #2c313a",
  borderRadius: 9,
  background: "#151922",
  minWidth: 0,
},

playerDetailTitle: {
  margin: "0 0 7px",
  color: "#f8fafc",
  fontSize: 13,
  fontWeight: 900,
  textAlign: "center",
},

playerRoleContext: {
  color: "#9fb0c8",
  fontSize: 10,
  marginBottom: 7,
  textAlign: "center",
  lineHeight: 1.25,
},

playerAttributeRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  padding: "5px 0",
  borderBottom: "1px solid #252b36",
  color: "#dbe4f0",
  fontSize: 12,
  fontWeight: 700,
},

playerRankRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  padding: "5px 0",
  borderBottom: "1px solid #252b36",
  color: "#dbe4f0",
  fontSize: 12,
  fontWeight: 700,
},

th: {
  position: "sticky",
  top: 0,
  zIndex: 3,
  padding: "6px 8px",
  borderBottom: `1px solid ${colors.borderStrong}`,
  borderRight: `1px solid ${colors.borderSoft}`,
  background: colors.tableHeader,
  color: colors.text,
  textAlign: "left",
  whiteSpace: "nowrap",
  cursor: "pointer",
  userSelect: "none",
  fontSize: 12,
  lineHeight: 1.15,
},

td: {
  padding: "5px 8px",
  borderBottom: `1px solid ${colors.borderSoft}`,
  borderRight: `1px solid ${colors.borderSoft}`,
  color: colors.textSoft,
  whiteSpace: "nowrap",
  fontSize: 12,
  lineHeight: 1.15,
  background: colors.table,
},

indexTh: {
  position: "sticky",
  left: 0,
  top: 0,
  zIndex: 5,
  width: 38,
  minWidth: 38,
  borderBottom: `1px solid ${colors.borderStrong}`,
  borderRight: `1px solid ${colors.borderStrong}`,
  background: colors.tableHeader,
  color: colors.text,
  textAlign: "center",
  whiteSpace: "nowrap",
  padding: "6px 6px",
  fontSize: 12,
},

indexTd: {
  position: "sticky",
  left: 0,
  zIndex: 3,
  width: 38,
  minWidth: 38,
  borderBottom: `1px solid ${colors.borderSoft}`,
  borderRight: `1px solid ${colors.borderStrong}`,
  background: colors.tableRow,
  color: colors.textSoft,
  whiteSpace: "nowrap",
  padding: "5px 6px",
  fontSize: 12,
  textAlign: "center",
},
markTh: {
  width: 116,
  minWidth: 116,
  maxWidth: 116,
  textAlign: "center",
  background: colors.tableHeader,
  color: colors.text,
  borderBottom: `1px solid ${colors.borderStrong}`,
  borderRight: `1px solid ${colors.borderStrong}`,
  padding: "6px 6px",
  fontSize: 12,
},

markTd: {
  width: 116,
  minWidth: 116,
  maxWidth: 116,
  borderBottom: `1px solid ${colors.borderSoft}`,
  borderRight: `1px solid ${colors.borderStrong}`,
  textAlign: "center",
  background: colors.tableRow,
  padding: "5px 5px",
  fontSize: 12,
},

markButtons: {
  display: "flex",
  justifyContent: "center",
  gap: 4,
  marginBottom: 2,
},

markButton: {
  width: 22,
  height: 22,
  borderRadius: 6,
  border: `1px solid ${colors.borderStrong}`,
  background: colors.panelStrong,
  color: colors.muted,
  fontWeight: 950,
  cursor: "pointer",
  fontSize: 12,
  lineHeight: "16px",
  padding: 0,
},

selectionPositionSelect: {
  width: "100%",
  height: 23,
  borderRadius: 6,
  border: `1px solid ${colors.borderStrong}`,
  background: colors.panelSoft,
  color: colors.text,
  fontSize: 11,
  padding: "0 4px",
  outline: "none",
},

nameStickyTh: {
  position: "sticky",
  left: 38,
  top: 0,
  zIndex: 5,
  minWidth: 180,
  padding: "6px 8px",
  fontSize: 12,
  borderBottom: `1px solid ${colors.borderStrong}`,
  borderRight: `1px solid ${colors.borderStrong}`,
  background: colors.tableHeader,
  color: colors.text,
  textAlign: "left",
  whiteSpace: "nowrap",
  cursor: "pointer",
  userSelect: "none",
},

nameStickyTd: {
  position: "sticky",
  left: 38,
  zIndex: 3,
  minWidth: 180,
  padding: "5px 8px",
  fontSize: 12,
  borderBottom: `1px solid ${colors.borderSoft}`,
  borderRight: `1px solid ${colors.borderStrong}`,
  background: colors.tableRow,
  color: colors.text,
  fontWeight: 800,
  whiteSpace: "nowrap",
},

playerNameButton: {
  background: "transparent",
  border: "none",
  color: colors.text,
  fontWeight: 850,
  cursor: "pointer",
  fontSize: 12,
  padding: 0,
  textAlign: "left",
},
visuallyHidden: {
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

sortableHeaderButton: {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  padding: 0,
  margin: 0,
  border: "none",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  fontWeight: 900,
  textAlign: "left",
  cursor: "pointer",
},
appStatusPanel: {
  display: "flex",
  flexDirection: "column",
  gap: 7,
  padding: 9,
  border: `1px solid ${colors.borderSoft}`,
  borderRadius: radii.md,
  background: colors.panelSoft,
},

emptyDataState: {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  marginTop: 4,
  padding: 12,
  border: `1px dashed ${colors.borderStrong}`,
  borderRadius: radii.md,
  background: colors.panel,
  color: colors.textSoft,
  lineHeight: 1.45,
},
};
