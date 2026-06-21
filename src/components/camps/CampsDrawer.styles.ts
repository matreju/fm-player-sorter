import type { CSSProperties } from "react";

const campColors = {
  page: "#070b12",
  panel: "#101624",
  panelSoft: "#0f172a",
  panelStrong: "#151d2e",
  card: "#0b1220",

  border: "#263247",
  borderSoft: "#1f2a3d",
  borderStrong: "#334155",

  text: "#eef4ff",
  textSoft: "#c7d2e4",
  muted: "#94a3b8",

  accent: "#38bdf8",
  accentSoft: "rgba(56, 189, 248, 0.14)",
  accentStrong: "#0ea5e9",

  success: "#22c55e",
  successSoft: "rgba(34, 197, 94, 0.16)",

  danger: "#ef4444",
  dangerSoft: "rgba(239, 68, 68, 0.16)",

  warning: "#f59e0b",
  warningSoft: "rgba(245, 158, 11, 0.16)",

  purple: "#a78bfa",
  purpleSoft: "rgba(167, 139, 250, 0.15)",
};

const campRadii = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
};

const campShadows = {
  drawer: "0 28px 90px rgba(0, 0, 0, 0.68)",
  panel: "0 18px 50px rgba(0, 0, 0, 0.24)",
  active: "0 0 0 3px rgba(56, 189, 248, 0.10)",
};

export const styles: Record<string, CSSProperties> = {

tab: {
  position: "fixed",
  right: 0,
  top: "calc(50% + 92px)",
  transform: "translateY(-50%)",
  writingMode: "vertical-rl",
  textOrientation: "mixed",
  padding: "14px 9px",
  border: `1px solid ${campColors.accentStrong}`,
  borderRight: "none",
  borderRadius: "14px 0 0 14px",
  background:
    "linear-gradient(180deg, rgba(56, 189, 248, 0.95), rgba(14, 165, 233, 0.95))",
  color: "#04111f",
  fontWeight: 950,
  fontSize: 13,
  letterSpacing: 1,
  cursor: "pointer",
  zIndex: 1190,
  boxShadow: "0 14px 36px rgba(14, 165, 233, 0.28)",
},
backdrop: {
  position: "fixed",
  inset: 0,
  background: "rgba(2, 6, 23, 0.72)",
  backdropFilter: "blur(5px)",
  zIndex: 1300,
},

drawer: {
  position: "fixed",
  top: 10,
  left: 10,
  right: 10,
  bottom: 10,
  zIndex: 1301,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: `1px solid ${campColors.borderStrong}`,
  borderRadius: campRadii.xl,
  background:
    "linear-gradient(180deg, rgba(16, 22, 36, 0.99), rgba(7, 11, 18, 0.99))",
  color: campColors.text,
  boxShadow: campShadows.drawer,
},

header: {
  flexShrink: 0,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  borderBottom: `1px solid ${campColors.border}`,
  background:
    "linear-gradient(90deg, rgba(56, 189, 248, 0.13), rgba(34, 197, 94, 0.08), rgba(16, 22, 36, 0.98))",
},

title: {
  margin: 0,
  color: campColors.text,
  fontSize: 21,
  fontWeight: 950,
  letterSpacing: "-0.03em",
},
subtitle: {
  marginTop: 4,
  color: campColors.textSoft,
  fontSize: 12,
  fontWeight: 750,
},
closeButton: {
  width: 38,
  height: 38,
  borderRadius: campRadii.md,
  border: `1px solid ${campColors.borderStrong}`,
  background: campColors.panelStrong,
  color: campColors.text,
  cursor: "pointer",
  fontSize: 18,
  fontWeight: 950,
},
body: {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  padding: 14,
},
createPanel: {
  padding: 12,
  border: `1px solid ${campColors.border}`,
  borderRadius: campRadii.lg,
  background:
    "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(11, 18, 32, 0.98))",
  marginBottom: 12,
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
},
sectionTitle: {
  margin: "0 0 10px",
  fontSize: 15,
  fontWeight: 950,
  color: campColors.text,
  letterSpacing: "-0.02em",
},

  formGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr 1fr",
    gap: 10,
  },
field: {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  color: "#9fb8df",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},
input: {
  height: 34,
  padding: "0 10px",
  borderRadius: campRadii.sm,
  border: `1px solid ${campColors.borderStrong}`,
  background: campColors.card,
  color: campColors.text,
  outline: "none",
  fontSize: 13,
  fontWeight: 850,
},

  createBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },

  snapshotInfo: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: 800,
  },
primaryButton: {
  height: 34,
  padding: "0 13px",
  borderRadius: campRadii.sm,
  border: `1px solid ${campColors.success}`,
  background: campColors.successSoft,
  color: "#bbf7d0",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 950,
},
mainGrid: {
  display: "grid",
  gridTemplateColumns: "330px minmax(0, 1fr)",
  gap: 12,
  minHeight: 0,
},
campsList: {
  padding: 12,
  border: `1px solid ${campColors.border}`,
  borderRadius: campRadii.lg,
  background: campColors.panel,
  minHeight: 500,
  boxShadow: campShadows.panel,
},

campButton: {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 5,
  padding: 11,
  marginBottom: 8,
  borderRadius: campRadii.md,
  border: `1px solid ${campColors.borderSoft}`,
  background: campColors.card,
  color: campColors.textSoft,
  cursor: "pointer",
  textAlign: "left",
  fontSize: 13,
  transition:
    "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease",
},

campButtonActive: {
  borderColor: campColors.accent,
  boxShadow: `inset 4px 0 0 ${campColors.accent}, ${campShadows.active}`,
  background:
    "linear-gradient(90deg, rgba(56, 189, 248, 0.16), rgba(15, 23, 42, 0.98))",
  color: campColors.text,
},
detailsPanel: {
  padding: 12,
  border: `1px solid ${campColors.border}`,
  borderRadius: campRadii.lg,
  background: campColors.panel,
  minHeight: 500,
  boxShadow: campShadows.panel,
},

  detailsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
detailsTitle: {
  margin: 0,
  color: campColors.text,
  fontSize: 21,
  fontWeight: 950,
  letterSpacing: "-0.03em",
},
detailsMeta: {
  marginTop: 4,
  color: campColors.textSoft,
  fontSize: 12,
  fontWeight: 750,
},
dangerButton: {
  height: 34,
  padding: "0 12px",
  borderRadius: campRadii.sm,
  border: `1px solid ${campColors.danger}`,
  background: campColors.dangerSoft,
  color: "#fecaca",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 950,
},
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 140px)",
    gap: 10,
    marginBottom: 14,
  },
statCard: {
  padding: 11,
  border: `1px solid ${campColors.borderSoft}`,
  borderRadius: campRadii.md,
  background: campColors.card,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  textAlign: "center",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
},
  playersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
  },
playerCard: {
  minWidth: 0,
  padding: 10,
  border: `1px solid ${campColors.borderSoft}`,
  borderRadius: campRadii.md,
  background: campColors.card,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  color: campColors.textSoft,
  fontSize: 12,
  textAlign: "center",
},
empty: {
  padding: 16,
  border: `1px dashed ${campColors.borderStrong}`,
  borderRadius: campRadii.md,
  background: "rgba(15, 23, 42, 0.55)",
  color: campColors.muted,
  fontSize: 13,
  textAlign: "center",
  lineHeight: 1.45,
},
matchPanel: {
  padding: 12,
  border: `1px solid ${campColors.border}`,
  borderRadius: campRadii.lg,
  background: campColors.panelSoft,
  marginBottom: 14,
},
matchHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
},
matchCounter: {
  padding: "5px 9px",
  borderRadius: 999,
  border: `1px solid ${campColors.borderStrong}`,
  background: campColors.card,
  color: campColors.textSoft,
  fontSize: 12,
  fontWeight: 900,
},
matchFormGrid: {
  display: "grid",
  gridTemplateColumns: "1.4fr 150px 160px 150px 150px auto",
  gap: 8,
  alignItems: "end",
  marginBottom: 12,
},

matchList: {
  display: "grid",
  gap: 8,
},
matchCard: {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 90px auto",
  alignItems: "center",
  gap: 10,
  padding: "10px 11px",
  border: `1px solid ${campColors.borderSoft}`,
  borderRadius: campRadii.md,
  background: campColors.card,
  transition:
    "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
},
matchCardWin: {
  background: "rgba(34, 197, 94, 0.10)",
  border: "1px solid rgba(34, 197, 94, 0.35)",
  boxShadow: "inset 4px 0 0 rgba(34, 197, 94, 0.85)",
},

matchCardDraw: {
  background: "rgba(234, 179, 8, 0.10)",
  border: "1px solid rgba(234, 179, 8, 0.35)",
  boxShadow: "inset 4px 0 0 rgba(234, 179, 8, 0.85)",
},

matchCardLoss: {
  background: "rgba(239, 68, 68, 0.10)",
  border: "1px solid rgba(239, 68, 68, 0.35)",
  boxShadow: "inset 4px 0 0 rgba(239, 68, 68, 0.85)",
},
matchTitle: {
  color: campColors.text,
  fontSize: 14,
  fontWeight: 950,
},
matchMeta: {
  marginTop: 3,
  color: campColors.muted,
  fontSize: 12,
  fontWeight: 750,
},
matchScore: {
  color: "#bbf7d0",
  fontSize: 17,
  fontWeight: 950,
  textAlign: "center",
},
smallDangerButton: {
  height: 28,
  padding: "0 10px",
  borderRadius: campRadii.sm,
  border: `1px solid ${campColors.danger}`,
  background: campColors.dangerSoft,
  color: "#fecaca",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 950,
},
matchCardActive: {
  outline: `2px solid ${campColors.accent}`,
  outlineOffset: 2,
  boxShadow: campShadows.active,
},
appearancesPanel: {
  marginTop: 12,
  padding: 12,
  border: `1px solid ${campColors.border}`,
  borderRadius: campRadii.lg,
  background:
    "linear-gradient(180deg, rgba(16, 22, 36, 0.98), rgba(11, 18, 32, 0.98))",
},
appearancesHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
},
appearancesTitle: {
  margin: 0,
  color: campColors.text,
  fontSize: 16,
  fontWeight: 950,
},
appearancesMeta: {
  marginTop: 3,
  color: campColors.muted,
  fontSize: 12,
  fontWeight: 750,
},
appearancesSummary: {
  padding: "7px 10px",
  border: `1px solid ${campColors.borderStrong}`,
  borderRadius: 999,
  background: campColors.card,
  color: campColors.textSoft,
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
},
appearancesTable: {
  display: "grid",
  gap: 4,
},
appearanceRow: {
  display: "grid",
  gridTemplateColumns: "minmax(300px, 1fr) 70px 100px 90px 90px 100px",
  alignItems: "center",
  gap: 8,
  padding: "7px 8px",
  border: `1px solid ${campColors.borderSoft}`,
  borderRadius: campRadii.sm,
  background: campColors.card,
},
appearanceHeadRow: {
  background: campColors.panelStrong,
  color: "#9fb8df",
  fontSize: 10,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},
appearancePlayerCell: {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  minWidth: 0,
  color: "#f8fafc",
  fontSize: 13,
},

appearanceCheckboxCell: {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: 30,
},
appearanceCheckbox: {
  width: 18,
  height: 18,
  cursor: "pointer",
  accentColor: "#22c55e",
},
appearanceInput: {
  width: "100%",
  height: 30,
  padding: "0 8px",
  borderRadius: campRadii.sm,
  border: `1px solid ${campColors.borderStrong}`,
  background: campColors.page,
  color: campColors.text,
  outline: "none",
  fontSize: 12,
  fontWeight: 850,
  textAlign: "center",
  boxSizing: "border-box",
},

appearanceInputDisabled: {
  opacity: 0.45,
  cursor: "not-allowed",
},
campSummaryPanel: {
  padding: 12,
  border: "1px solid #2c313a",
  borderRadius: 12,
  background: "#0f172a",
  marginBottom: 14,
},

campSummaryTopGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 8,
  marginBottom: 12,
},

summaryMiniCard: {
  padding: "9px 10px",
  border: "1px solid #2c313a",
  borderRadius: 10,
  background: "#10141d",
  display: "flex",
  flexDirection: "column",
  gap: 5,
  textAlign: "center",
},

campSummaryColumns: {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
},

summaryBox: {
  padding: 10,
  border: "1px solid #2c313a",
  borderRadius: 10,
  background: "#10141d",
  minWidth: 0,
},

sortHeaderButton: {
  width: "100%",
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
  fontWeight: 950,
  textTransform: "inherit",
  letterSpacing: "inherit",
  textAlign: "center",
  padding: 0,
},

callUpPositionLine: {
  color: "#93c5fd",
  fontSize: 11,
  fontWeight: 900,
},

careerMatchMain: {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 0,
},

careerMatchCardWin: {
  background: "rgba(34, 197, 94, 0.10)",
  borderColor: "rgba(34, 197, 94, 0.35)",
  boxShadow: "inset 4px 0 0 rgba(34, 197, 94, 0.85)",
},

careerMatchCardDraw: {
  background: "rgba(234, 179, 8, 0.10)",
  borderColor: "rgba(234, 179, 8, 0.35)",
  boxShadow: "inset 4px 0 0 rgba(234, 179, 8, 0.85)",
},

careerMatchCardLoss: {
  background: "rgba(239, 68, 68, 0.10)",
  borderColor: "rgba(239, 68, 68, 0.35)",
  boxShadow: "inset 4px 0 0 rgba(239, 68, 68, 0.85)",
},
summaryBoxTitle: {
  margin: "0 0 8px",
  color: "#f8fafc",
  fontSize: 13,
  fontWeight: 950,
  textAlign: "center",
},

summaryRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  padding: "6px 0",
  borderBottom: "1px solid rgba(148, 163, 184, 0.15)",
  color: "#dbe4f0",
  fontSize: 12,
  fontWeight: 800,
},

summaryEmpty: {
  padding: "8px 0",
  color: "#94a3b8",
  fontSize: 12,
  fontStyle: "italic",
  textAlign: "center",
},

noAppearanceBox: {
  marginTop: 10,
  padding: 10,
  border: "1px solid #2c313a",
  borderRadius: 10,
  background: "#10141d",
  color: "#cbd5e1",
  fontSize: 12,
  fontWeight: 800,
},

noAppearanceList: {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginTop: 8,
},

noAppearanceChip: {
  padding: "5px 8px",
  borderRadius: 999,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#cbd5e1",
  fontSize: 11,
  fontWeight: 900,
},
campActionRow: {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginBottom: 10,
},

historyOverlay: {
  position: "fixed",
  inset: 0,
  zIndex: 1500,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 14,
  background: "rgba(3, 7, 18, 0.78)",
  backdropFilter: "blur(5px)",
},

historyModal: {
  width: "min(1180px, calc(100vw - 28px))",
  maxHeight: "calc(100vh - 28px)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: "1px solid #334155",
  borderRadius: 14,
  background: "#0f172a",
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.72)",
},

historyHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "12px 14px",
  borderBottom: "1px solid #263041",
  background:
    "linear-gradient(90deg, rgba(37, 44, 63, 0.95), rgba(15, 23, 42, 0.95))",
},

historyTitle: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 20,
  fontWeight: 950,
},

historySubtitle: {
  marginTop: 3,
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
},

historyCloseButton: {
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid #475569",
  background: "#10203a",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 18,
  fontWeight: 900,
},

historyToolbar: {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) auto",
  alignItems: "center",
  gap: 10,
  padding: 12,
  borderBottom: "1px solid #263041",
},

historySearchInput: {
  width: "100%",
  height: 34,
  padding: "0 10px",
  borderRadius: 9,
  border: "1px solid #313746",
  background: "#0f131b",
  color: "#f2f4f8",
  outline: "none",
  fontSize: 13,
  fontWeight: 800,
},

historyCounter: {
  padding: "8px 11px",
  border: "1px solid #334155",
  borderRadius: 999,
  background: "#10141d",
  color: "#cbd5e1",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
},


historyRow: {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) 90px 80px 90px 70px 70px 90px",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  border: "1px solid #263041",
  borderRadius: 9,
  background: "#10141d",
  color: "#dbe4f0",
  fontSize: 12,
  textAlign: "center",
},

historyHeadRow: {
  position: "sticky",
  top: 0,
  zIndex: 2,
  background: "#151922",
  color: "#9fb4d9",
  fontSize: 10,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

historyPlayerCell: {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  minWidth: 0,
  textAlign: "left",
},

historyEmpty: {
  padding: 18,
  border: "1px solid #263041",
  borderRadius: 10,
  background: "#10141d",
  color: "#94a3b8",
  fontSize: 13,
  fontStyle: "italic",
  textAlign: "center",
},
historyContent: {
  flex: 1,
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "minmax(560px, 1fr) 420px",
  gap: 10,
  overflow: "hidden",
  padding: 12,
},

historyTable: {
  minHeight: 0,
  overflow: "auto",
  display: "grid",
  alignContent: "start",
  gap: 5,
},

historyButtonRow: {
  width: "100%",
  cursor: "pointer",
  textAlign: "center",
},

historyButtonRowActive: {
  borderColor: "#38bdf8",
  background: "#122033",
  boxShadow: "inset 4px 0 0 #38bdf8",
},

careerDetailsPanel: {
  minHeight: 0,
  overflow: "auto",
  padding: 12,
  border: "1px solid #263041",
  borderRadius: 12,
  background: "#10141d",
},

careerDetailsHeader: {
  marginBottom: 10,
  paddingBottom: 10,
  borderBottom: "1px solid #263041",
  textAlign: "center",
},

careerDetailsTitle: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 20,
  fontWeight: 950,
},

careerDetailsMeta: {
  marginTop: 4,
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 800,
},

careerStatsGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
  marginBottom: 12,
},

careerStatCard: {
  padding: 9,
  border: "1px solid #263041",
  borderRadius: 10,
  background: "#0f172a",
  display: "flex",
  flexDirection: "column",
  gap: 5,
  textAlign: "center",
  color: "#cbd5e1",
  fontSize: 11,
  fontWeight: 900,
},

careerSection: {
  marginTop: 12,
},

careerSectionTitle: {
  margin: "0 0 8px",
  color: "#f8fafc",
  fontSize: 14,
  fontWeight: 950,
},

careerCampList: {
  display: "grid",
  gap: 7,
},

careerCampCard: {
  padding: 9,
  border: "1px solid #263041",
  borderRadius: 10,
  background: "#0f172a",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  color: "#dbe4f0",
  fontSize: 12,
},

careerMatchList: {
  display: "grid",
  gap: 7,
},

careerMatchCard: {
  padding: 9,
  border: "1px solid #263041",
  borderRadius: 10,
  background: "#0f172a",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 7,
  color: "#dbe4f0",
  fontSize: 12,
},

careerMatchNumbers: {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  color: "#cbd5e1",
  fontSize: 11,
  fontWeight: 900,
},
secondaryButton: {
  height: 30,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid #475569",
  background: "#1f2937",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 900,
},

campaignAssignRow: {
  maxWidth: 420,
  marginBottom: 14,
},

campaignModal: {
  width: "min(1280px, calc(100vw - 28px))",
  maxHeight: "calc(100vh - 28px)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: "1px solid #334155",
  borderRadius: 14,
  background: "#0f172a",
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.72)",
},

campaignCreatePanel: {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1.6fr) 160px 150px 150px auto",
  gap: 10,
  alignItems: "end",
  padding: 12,
  borderBottom: "1px solid #263041",
  background: "#10141d",
},

campaignContent: {
  flex: 1,
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: 12,
  padding: 12,
  overflow: "hidden",
},

campaignListPanel: {
  minHeight: 0,
  overflow: "auto",
  padding: 12,
  border: "1px solid #263041",
  borderRadius: 12,
  background: "#10141d",
},

campaignButton: {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 4,
  padding: 10,
  marginBottom: 8,
  borderRadius: 10,
  border: "1px solid #2c313a",
  background: "#0f172a",
  color: "#dbe4f0",
  cursor: "pointer",
  textAlign: "left",
  fontSize: 13,
},

campaignButtonActive: {
  borderColor: "#a78bfa",
  boxShadow: "inset 3px 0 0 #a78bfa",
  background: "#17152b",
},

campaignDetailsPanel: {
  minHeight: 0,
  overflow: "auto",
  padding: 12,
  border: "1px solid #263041",
  borderRadius: 12,
  background: "#10141d",
},

campaignDetailsHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
},

campaignStatsGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 8,
  marginBottom: 14,
},

campaignSection: {
  marginTop: 12,
},

campaignTable: {
  display: "grid",
  gap: 5,
},

campaignTableRow: {
  display: "grid",
  gridTemplateColumns:
    "minmax(240px, 1fr) 70px 100px 70px 80px 80px minmax(150px, 1fr)",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  border: "1px solid #263041",
  borderRadius: 9,
  background: "#0f172a",
  color: "#dbe4f0",
  fontSize: 12,
  textAlign: "center",
},

campaignPlayerRow: {
  display: "grid",
  gridTemplateColumns:
    "minmax(260px, 1fr) 90px 80px 90px 70px 70px 90px",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  border: "1px solid #263041",
  borderRadius: 9,
  background: "#0f172a",
  color: "#dbe4f0",
  fontSize: 12,
  textAlign: "center",
},

campaignTableHead: {
  position: "sticky",
  top: 0,
  zIndex: 2,
  background: "#151922",
  color: "#9fb4d9",
  fontSize: 10,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

campaignTableNameCell: {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  minWidth: 0,
  textAlign: "left",
},
campaignPlayersToolbar: {
  display: "grid",
  gridTemplateColumns: "minmax(260px, 1fr) 180px 190px auto",
  gap: 8,
  alignItems: "center",
  marginBottom: 10,
},

campaignPlayersCounter: {
  padding: "8px 11px",
  border: "1px solid #334155",
  borderRadius: 999,
  background: "#10141d",
  color: "#cbd5e1",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
},
removePlayerButton: {
  marginTop: 6,
  height: 26,
  padding: "0 8px",
  borderRadius: 7,
  border: "1px solid rgba(239, 68, 68, 0.65)",
  background: "rgba(239, 68, 68, 0.10)",
  color: "#fecaca",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 900,
},
campaignComparePanel: {
  padding: 12,
  border: "1px solid #263041",
  borderRadius: 12,
  background: "#0f172a",
  marginBottom: 14,
},

campaignCompareHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
},

campaignCompareSubtitle: {
  marginTop: -4,
  marginBottom: 8,
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
},

campaignCompareSelectors: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 10,
},

campaignCompareTable: {
  display: "grid",
  gap: 5,
},

campaignCompareRow: {
  display: "grid",
  gridTemplateColumns: "minmax(230px, 1fr) minmax(220px, 1fr) minmax(220px, 1fr)",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  border: "1px solid #263041",
  borderRadius: 9,
  background: "#10141d",
  color: "#dbe4f0",
  fontSize: 12,
  textAlign: "center",
},
};