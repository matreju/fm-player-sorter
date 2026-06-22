import type { CSSProperties } from "react";

export const playerCompareStyles: Record<string, CSSProperties> = {
  wrapper: {
    marginTop: 16,
    marginBottom: 18,
    padding: 14,
    border: "1px solid #2a2f3a",
    borderRadius: 14,
    background: "#11141b",
  },

  title: {
    margin: "0 0 10px",
    fontSize: 20,
    color: "#f2f4f8",
  },

  playerSelectors: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
    alignItems: "end",
    marginBottom: 10,
  },

  playerSelectField: {
    minWidth: 0,
  },

  playerSelectLabel: {
    color: "#dbeafe",
    fontSize: 11,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
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
    height: 40,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid #334155",
    background: "#0b1220",
    color: "#f8fafc",
    fontWeight: 800,
    lineHeight: 1.2,
  },

  compareActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: -2,
    marginBottom: 10,
  },

  compareRoleDock: {
    display: "grid",
    gridTemplateColumns: "180px 180px minmax(240px, 1fr)",
    gap: 10,
    alignItems: "end",
    marginBottom: 10,
    padding: 10,
    border: "1px solid #26334a",
    borderRadius: 12,
    background: "#101827",
  },

  compareRoleDockLegend: {
    gridColumn: "1 / -1",
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#8ea2ff",
    fontSize: 12,
    fontWeight: 850,
  },

  roleToolbar: {
    display: "grid",
    gridTemplateColumns: "220px 220px minmax(260px, 1fr)",
    gap: 16,
    alignItems: "end",
    marginBottom: 16,
  },

  roleControlField: {
    minWidth: 0,
  },

  roleControlFieldWide: {
    minWidth: 0,
  },

  roleLegend: {
    display: "flex",
    gap: 18,
    alignItems: "center",
    color: "#b9bfce",
    fontSize: 12,
    paddingBottom: 8,
    gridColumn: "1 / -1",
  },

  phaseInfo: {
    color: "#8ea2ff",
    fontWeight: 800,
  },

  playerCards: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 48px minmax(0, 1fr)",
    gap: 10,
    alignItems: "stretch",
    marginBottom: 10,
  },

  playerCard: {
    minWidth: 0,
    minHeight: 170,
    padding: 11,
    border: "1px solid #2d3340",
    borderRadius: 14,
    background: "#171b24",
    textAlign: "left",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 210px",
    gap: 10,
    alignItems: "center",
  },

  playerCardInfoColumn: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 6,
  },

  playerName: {
    color: "#ffffff",
    fontSize: 18,
    lineHeight: 1.1,
    fontWeight: 950,
    textAlign: "left",
    width: "100%",
  },

  playerInfo: {
    color: "#93c5fd",
    marginTop: 0,
    fontSize: 12,
    fontWeight: 800,
    textAlign: "left",
    width: "100%",
  },

  heightInfo: {
    marginTop: 0,
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: 850,
    textAlign: "left",
    width: "100%",
  },

  footInfo: {
    marginTop: 2,
    display: "flex",
    justifyContent: "flex-start",
    gap: 6,
    flexWrap: "wrap",
    textAlign: "left",
    width: "100%",
  },

  footBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid rgba(184, 190, 202, 0.25)",
    background: "rgba(184, 190, 202, 0.05)",
    color: "#b8beca",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  compareCompactRadarShell: {
    width: 200,
    maxWidth: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
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
    color: "#f2f4f8",
    fontWeight: 900,
    fontSize: 16,
    border: "1px solid #2d3340",
    borderRadius: 12,
    background: "#171b24",
  },

  roleScorePanel: {
    display: "grid",
    gridTemplateColumns: "160px 1fr 160px",
    gap: 12,
    alignItems: "center",
    padding: 10,
    marginBottom: 12,
    border: "1px solid #2d3340",
    borderRadius: 12,
    background: "#171b24",
  },

  roleScoreCard: {
    textAlign: "center",
  },

  roleScoreName: {
    color: "#b9bfce",
    fontSize: 11,
    marginBottom: 4,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  roleScoreValue: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: 900,
  },

  roleScoreRange: {
    marginTop: 4,
    color: "#aeb6c7",
    fontSize: 10,
    fontWeight: 700,
  },

  roleScoreUncertainty: {
    marginTop: 2,
    color: "#8f98aa",
    fontSize: 10,
    fontWeight: 700,
  },

  roleScoreBarBox: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },

  roleScoreTitle: {
    color: "#f2f4f8",
    fontSize: 12,
    fontWeight: 800,
    textAlign: "center",
  },

  compareSectionTogglePanel: {
    marginBottom: 10,
    padding: 10,
    border: "1px solid #26334a",
    borderRadius: 12,
    background: "#101827",
  },

  compareSectionToggleHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  compareSectionToggleTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: 950,
  },

  compareSectionToggleText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: 750,
    lineHeight: 1.3,
  },

  compareSectionToggleButton: {
    height: 32,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid #334155",
    background: "#0b1220",
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  compareSectionToggleButtonActive: {
    borderColor: "#38bdf8",
    background: "rgba(56, 189, 248, 0.14)",
    color: "#bae6fd",
  },

  compareBody: {
    display: "grid",
    gridTemplateColumns: "minmax(340px, 420px) minmax(0, 1fr)",
    gap: 12,
    alignItems: "start",
    marginTop: 12,
  },

  compareBodySummaryOnly: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 12,
    alignItems: "start",
    marginTop: 12,
  },

  compareLeftPanel: {
    display: "grid",
    gap: 10,
    minWidth: 0,
  },

  compareMiniBox: {
    padding: 10,
    border: "1px solid #2a2f3a",
    borderRadius: 12,
    background: "#151922",
    minWidth: 0,
  },

  compareBoxTitle: {
    margin: "0 0 8px",
    fontSize: 15,
    color: "#f2f4f8",
    textAlign: "left",
  },

  sectionVsList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 8,
  },

  sectionVsCard: {
    minWidth: 0,
    padding: "8px 9px",
    border: "1px solid #252b36",
    borderRadius: 10,
    background: "#10141d",
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
    gridTemplateColumns: "minmax(0, 1fr) 48px minmax(0, 1fr)",
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
    fontWeight: 900,
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
    fontSize: 18,
    fontWeight: 950,
    lineHeight: 1,
  },

  rightValueBig: {
    color: "#9aff8f",
    fontSize: 18,
    fontWeight: 950,
    lineHeight: 1,
  },

  differenceCardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 8,
  },

  differenceBigCard: {
    position: "relative",
    minWidth: 0,
    padding: "24px 9px 9px",
    border: "1px solid #252b36",
    borderRadius: 10,
    background: "#10141d",
    overflow: "hidden",
  },

  differenceCategoryPill: {
    position: "absolute",
    top: 7,
    right: 7,
    maxWidth: "55%",
    padding: "3px 7px",
    borderRadius: 999,
    background: "#20283a",
    color: "#aeb6c7",
    fontSize: 9,
    fontWeight: 800,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  differenceAttributeName: {
    textAlign: "center",
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 1.15,
    fontWeight: 950,
    marginBottom: 8,
    minHeight: 18,
  },

  differencePlayersRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 44px minmax(0, 1fr)",
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
    marginTop: 7,
    paddingTop: 7,
    borderTop: "1px solid #252b36",
    color: "#8b95a7",
    fontSize: 10,
    textAlign: "center",
  },

  differenceSubtext: {
    marginTop: 3,
    color: "#8b95a7",
    fontSize: 10,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  sectionCompactList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 8,
  },

  sectionCompactRow: {
    display: "grid",
    gap: 5,
    padding: "8px 9px",
    border: "1px solid #252b36",
    borderRadius: 10,
    background: "#10141d",
  },

  sectionCompactHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    color: "#dbe4f0",
    fontSize: 11,
    fontWeight: 850,
  },

  verdictCompactList: {
    display: "grid",
    gap: 4,
  },

  verdictRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "6px 0",
    borderBottom: "1px solid #252b36",
    color: "#dbe4f0",
    fontSize: 12,
  },

  fullAttributesPanel: {
    padding: 10,
    border: "1px solid #2a2f3a",
    borderRadius: 12,
    background: "#151922",
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

  compareHeader: {
    display: "grid",
    gridTemplateColumns: "155px 58px minmax(180px, 1fr) 58px 58px",
    gap: 8,
    padding: "8px 8px",
    color: "#8f98aa",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    borderBottom: "1px solid #2a2f3a",
  },

  groupBox: {
    marginTop: 14,
  },

  groupTitle: {
    color: "#f2f4f8",
    fontSize: 16,
    margin: "0 0 7px",
  },

  attributeRow: {
    display: "grid",
    gridTemplateColumns: "155px 58px minmax(180px, 1fr) 58px 58px",
    alignItems: "center",
    gap: 8,
    padding: "7px 8px",
    borderBottom: "1px solid #222631",
    borderLeft: "3px solid transparent",
    borderRadius: 4,
  },

  attributeName: {
    color: "#dce2ef",
    fontSize: 13,
  },

  valueLeft: {
    color: "#6eb6ff",
    fontWeight: 900,
    textAlign: "center",
  },

  valueRight: {
    color: "#9aff8f",
    fontWeight: 900,
    textAlign: "center",
  },

  balanceTrack: {
    position: "relative",
    height: 13,
    borderRadius: 999,
    background: "#252b36",
    overflow: "hidden",
    border: "1px solid #343b4a",
  },

  balanceCenterLine: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
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
    fontWeight: 900,
    fontSize: 12,
  },

  diffRight: {
    color: "#9aff8f",
    background: "rgba(154, 255, 143, 0.14)",
    borderRadius: 999,
    padding: "3px 6px",
    textAlign: "center",
    fontWeight: 900,
    fontSize: 12,
  },

  diffNeutral: {
    color: "#9aa3b5",
    background: "rgba(160, 170, 190, 0.08)",
    borderRadius: 999,
    padding: "3px 6px",
    textAlign: "center",
    fontWeight: 800,
    fontSize: 12,
  },

  sectionSummaryRow: {
    display: "grid",
    gridTemplateColumns: "155px 58px minmax(180px, 1fr) 58px 58px",
    alignItems: "center",
    gap: 8,
    padding: "8px 8px",
    marginTop: 5,
    borderRadius: 6,
    border: "1px solid #343b4a",
    background: "#181d27",
  },

  sectionSummaryName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 900,
  },
};