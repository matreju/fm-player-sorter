import type { CSSProperties } from "react";

export const playerCompareStyles: Record<string, CSSProperties> = {
  wrapper: {
    display: "grid",
    gap: 10,
    padding: 0,
    color: "#e5edf8",
  },

  compareHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: "10px 12px",
    border: "1px solid #29364d",
    borderRadius: 14,
    background:
      "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.94))",
  },

  title: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 950,
    color: "#f8fafc",
    letterSpacing: "-0.03em",
  },

  headerSubtitle: {
    marginTop: 4,
    color: "#aebbd0",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 750,
  },

  playerSelectors: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: 8,
    alignItems: "end",
  },

  playerSelectField: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  playerSelectLabel: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    color: "#b9bfce",
  },

  select: {
    width: "100%",
    minWidth: 0,
    height: 32,
    padding: "0 10px",
    borderRadius: 10,
    border: "1px solid #334155",
    background: "#0b1120",
    color: "#f8fafc",
    fontWeight: 850,
    fontSize: 12,
    lineHeight: 1.2,
    outline: "none",
  },

  compareActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 0,
  },

  compareRoleDock: {
    display: "grid",
    gridTemplateColumns: "170px 160px minmax(220px, 1fr)",
    gap: 8,
    alignItems: "end",
    padding: 10,
    border: "1px solid #26334a",
    borderRadius: 13,
    background: "#101827",
  },

  compareRoleDockLegend: {
    gridColumn: "1 / -1",
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: 850,
  },

  roleControlField: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  roleControlFieldWide: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  phaseInfo: {
    color: "#bfdbfe",
    fontWeight: 850,
  },

  playerCards: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 44px minmax(0, 1fr)",
    gap: 8,
    alignItems: "stretch",
  },

  playerCard: {
    minWidth: 0,
    minHeight: 142,
    padding: 10,
    border: "1px solid #29364d",
    borderRadius: 14,
    background:
      "linear-gradient(135deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.96))",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 170px",
    gap: 8,
    alignItems: "center",
  },

  playerCardInfoColumn: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 5,
  },

  playerName: {
    color: "#ffffff",
    fontSize: 17,
    lineHeight: 1.1,
    fontWeight: 950,
    textAlign: "left",
    width: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  playerInfo: {
    color: "#93c5fd",
    marginTop: 0,
    fontSize: 11,
    fontWeight: 800,
    textAlign: "left",
    width: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  heightInfo: {
    marginTop: 0,
    color: "#bfdbfe",
    fontSize: 11,
    fontWeight: 850,
    textAlign: "left",
    width: "100%",
  },

  footInfo: {
    marginTop: 2,
    display: "flex",
    justifyContent: "flex-start",
    gap: 5,
    flexWrap: "wrap",
    textAlign: "left",
    width: "100%",
  },

  footBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3px 7px",
    borderRadius: 999,
    border: "1px solid rgba(184, 190, 202, 0.25)",
    background: "rgba(184, 190, 202, 0.05)",
    color: "#b8beca",
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  roleScorePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid rgba(56, 189, 248, 0.38)",
    background: "rgba(14, 116, 144, 0.16)",
    color: "#dbeafe",
    fontSize: 11,
    fontWeight: 900,
  },

  roleScoreMeta: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: 750,
  },

  roleScoreRange: {
    marginTop: 2,
    color: "#aeb6c7",
    fontSize: 10,
    fontWeight: 700,
  },

  roleScoreUncertainty: {
    marginTop: 1,
    color: "#8f98aa",
    fontSize: 10,
    fontWeight: 700,
  },

  compareCompactRadarShell: {
    width: 166,
    maxWidth: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    border: "1px solid rgba(51, 65, 85, 0.72)",
    borderRadius: 12,
    background: "rgba(2, 6, 23, 0.22)",
  },

  compareMiniRadar: {
    marginTop: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 0,
  },

  vsBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f8fafc",
    fontWeight: 950,
    fontSize: 14,
    border: "1px solid #29364d",
    borderRadius: 12,
    background:
      "linear-gradient(135deg, rgba(14, 116, 144, 0.26), rgba(15, 23, 42, 0.96))",
  },

  quickCompareGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
  },

  quickCompareCard: {
    minWidth: 0,
    padding: 10,
    border: "1px solid #29364d",
    borderRadius: 13,
    background: "#111827",
  },

  quickCompareLabel: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  quickCompareWinner: {
    marginTop: 5,
    color: "#f8fafc",
    fontSize: 13,
    lineHeight: 1.15,
    fontWeight: 950,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  quickCompareValues: {
    marginTop: 5,
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: "#aebbd0",
    fontSize: 11,
    fontWeight: 800,
  },

  quickCompareBar: {
    marginTop: 7,
  },

  compareSectionTogglePanel: {
    border: "1px solid #29364d",
    borderRadius: 14,
    background: "#111827",
    overflow: "hidden",
  },

  compareSectionToggleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderBottom: "1px solid #253149",
    background:
      "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(17, 24, 39, 0.96))",
  },

  compareSectionToggleTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: 950,
  },

  compareSectionToggleText: {
    marginTop: 3,
    color: "#aebbd0",
    fontSize: 11,
    lineHeight: 1.3,
    fontWeight: 750,
  },

  compareSectionToggleButton: {
    flexShrink: 0,
    minHeight: 30,
    padding: "0 11px",
    borderRadius: 10,
    border: "1px solid rgba(56, 189, 248, 0.42)",
    background: "rgba(14, 116, 144, 0.18)",
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  compareSectionToggleButtonActive: {
    borderColor: "rgba(148, 163, 184, 0.45)",
    background: "rgba(30, 41, 59, 0.8)",
    color: "#cbd5e1",
  },

  compareBody: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 0.95fr) minmax(420px, 1.05fr)",
    gap: 10,
    alignItems: "start",
  },

  compareBodySummaryOnly: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
    alignItems: "start",
  },

  compareLeftPanel: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    minWidth: 0,
  },

  compareMiniBox: {
    padding: 10,
    border: "1px solid #29364d",
    borderRadius: 13,
    background: "#111827",
    minWidth: 0,
  },

  compareBoxTitle: {
    margin: "0 0 8px",
    fontSize: 14,
    fontWeight: 950,
    color: "#f8fafc",
    textAlign: "left",
  },

  sectionVsList: {
    display: "grid",
    gap: 7,
  },

  sectionVsCard: {
    padding: "8px 9px",
    border: "1px solid #253149",
    borderRadius: 10,
    background: "#0f172a",
  },

  sectionVsTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 7,
    color: "#dbe4f0",
    fontSize: 11,
    fontWeight: 850,
  },

  sectionVsMiddle: {
    display: "grid",
    gridTemplateColumns: "1fr 48px 1fr",
    gap: 7,
    alignItems: "center",
  },

  sectionVsPlayer: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    alignItems: "center",
    textAlign: "center",
    color: "#aeb6c7",
    fontSize: 10,
    minWidth: 0,
  },

  sectionVsPlayerRight: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    alignItems: "center",
    textAlign: "center",
    color: "#aeb6c7",
    fontSize: 10,
    minWidth: 0,
  },

  sectionVsDiff: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 26,
    borderRadius: 999,
    fontWeight: 950,
    fontSize: 11,
  },

  sectionVsDiffLeft: {
    color: "#6eb6ff",
    background: "rgba(110, 182, 255, 0.14)",
    border: "1px solid rgba(110, 182, 255, 0.28)",
  },

  sectionVsDiffRight: {
    color: "#9aff8f",
    background: "rgba(154, 255, 143, 0.14)",
    border: "1px solid rgba(154, 255, 143, 0.28)",
  },

  sectionVsDiffNeutral: {
    color: "#9aa3b5",
    background: "rgba(160, 170, 190, 0.08)",
    border: "1px solid rgba(160, 170, 190, 0.18)",
  },

  leftValueBig: {
    color: "#6eb6ff",
    fontSize: 17,
    fontWeight: 950,
    lineHeight: 1,
  },

  rightValueBig: {
    color: "#9aff8f",
    fontSize: 17,
    fontWeight: 950,
    lineHeight: 1,
  },

  differenceCardsGrid: {
    display: "grid",
    gap: 7,
  },

  differenceBigCard: {
    position: "relative",
    padding: "24px 9px 9px",
    border: "1px solid #253149",
    borderRadius: 10,
    background: "#0f172a",
    overflow: "hidden",
  },

  differenceCategoryPill: {
    position: "absolute",
    top: 7,
    right: 7,
    padding: "2px 6px",
    borderRadius: 999,
    background: "#20283a",
    color: "#aeb6c7",
    fontSize: 9,
    fontWeight: 850,
  },

  differenceAttributeName: {
    textAlign: "center",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 950,
    marginBottom: 8,
  },

  differencePlayersRow: {
    display: "grid",
    gridTemplateColumns: "1fr 44px 1fr",
    gap: 7,
    alignItems: "center",
  },

  differencePlayerSide: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    alignItems: "center",
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: 10,
    minWidth: 0,
  },

  differencePlayerSideRight: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    alignItems: "center",
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: 10,
    minWidth: 0,
  },

  differenceDelta: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
  },

  differenceDeltaLeft: {
    color: "#6eb6ff",
    background: "rgba(110, 182, 255, 0.14)",
    border: "1px solid rgba(110, 182, 255, 0.3)",
  },

  differenceDeltaRight: {
    color: "#9aff8f",
    background: "rgba(154, 255, 143, 0.14)",
    border: "1px solid rgba(154, 255, 143, 0.3)",
  },

  differenceWinnerText: {
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px solid #253149",
    color: "#8b95a7",
    fontSize: 10,
    textAlign: "center",
  },

  verdictCompactList: {
    display: "grid",
    gap: 3,
  },

  verdictRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "6px 0",
    borderBottom: "1px solid #253149",
    color: "#dbe4f0",
    fontSize: 11,
    fontWeight: 800,
  },

  fullAttributesPanel: {
    padding: 10,
    border: "1px solid #29364d",
    borderRadius: 13,
    background: "#111827",
    minWidth: 0,
  },

  fullAttributesHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },

  fullAttributesLegend: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#aeb6c7",
    fontSize: 11,
    flexWrap: "wrap",
  },

  leftLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#6eb6ff",
    display: "inline-block",
  },

  rightLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#9aff8f",
    display: "inline-block",
  },

  fullAttributesScroll: {
    display: "grid",
    gap: 10,
    maxHeight: 620,
    overflow: "auto",
    paddingRight: 4,
  },

  groupBox: {
    minWidth: 0,
    border: "1px solid #253149",
    borderRadius: 12,
    background: "#0f172a",
    overflow: "hidden",
  },

  groupTitle: {
    margin: 0,
    padding: "8px 10px",
    borderBottom: "1px solid #253149",
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: 950,
    background: "rgba(15, 23, 42, 0.72)",
  },

  attributeRow: {
    display: "grid",
    gridTemplateColumns: "minmax(140px, 1fr) 42px minmax(120px, 1fr) 42px 58px",
    alignItems: "center",
    gap: 7,
    padding: "6px 8px",
    borderBottom: "1px solid #253149",
    color: "#dbe4f0",
    fontSize: 11,
    fontWeight: 800,
  },

  attributeName: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  valueLeft: {
    color: "#6eb6ff",
    textAlign: "center",
    fontWeight: 950,
  },

  valueRight: {
    color: "#9aff8f",
    textAlign: "center",
    fontWeight: 950,
  },

  balanceTrack: {
    position: "relative",
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    background: "#253149",
  },

  balanceCenterLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 2,
    background: "#eef2ff",
    opacity: 0.75,
    transform: "translateX(-1px)",
    zIndex: 2,
  },

  balanceFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    opacity: 0.9,
  },

  diffLeft: {
    color: "#6eb6ff",
    background: "rgba(110, 182, 255, 0.14)",
    borderRadius: 999,
    padding: "3px 6px",
    textAlign: "center",
    fontWeight: 950,
    fontSize: 10,
  },

  diffRight: {
    color: "#9aff8f",
    background: "rgba(154, 255, 143, 0.14)",
    borderRadius: 999,
    padding: "3px 6px",
    textAlign: "center",
    fontWeight: 950,
    fontSize: 10,
  },

  diffNeutral: {
    color: "#9aa3b5",
    background: "rgba(160, 170, 190, 0.08)",
    borderRadius: 999,
    padding: "3px 6px",
    textAlign: "center",
    fontWeight: 850,
    fontSize: 10,
  },

  sectionSummaryRow: {
    display: "grid",
    gridTemplateColumns: "minmax(140px, 1fr) 42px minmax(120px, 1fr) 42px 58px",
    alignItems: "center",
    gap: 7,
    padding: "7px 8px",
    borderTop: "1px solid #334155",
    background: "rgba(30, 41, 59, 0.5)",
  },

  sectionSummaryName: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 950,
  },
};