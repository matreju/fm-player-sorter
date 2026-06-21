import type { CSSProperties } from "react";

export const playerCompareStyles: Record<string, CSSProperties> = {
  wrapper: {
    marginTop: 24,
    marginBottom: 24,
    padding: 20,
    border: "1px solid #2a2f3a",
    borderRadius: 12,
    background: "#11141b",
  },

  title: {
    margin: "0 0 16px",
    fontSize: 22,
    color: "#f2f4f8",
  },

playerSelectors: {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
  alignItems: "end",
  marginBottom: 16,
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

roleControlField: {
  minWidth: 0,
},

roleControlFieldWide: {
  minWidth: 0,
},
    compareActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: -8,
    marginBottom: 16,
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

  playerCards: {
    display: "grid",
    gridTemplateColumns: "1fr 70px 1fr",
    gap: 14,
    alignItems: "stretch",
    marginBottom: 18,
  },

  playerCard: {
    padding: 16,
    border: "1px solid #2d3340",
    borderRadius: 12,
    background: "#171b24",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },

  playerName: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: 900,
    textAlign: "center",
    width: "100%",
  },

  playerInfo: {
    color: "#aeb6c7",
    marginTop: 6,
    fontSize: 13,
    textAlign: "center",
    width: "100%",
  },

  heightInfo: {
    marginTop: 8,
    color: "#8ea2ff",
    fontSize: 13,
    fontWeight: 800,
    textAlign: "center",
    width: "100%",
  },

  vsBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f2f4f8",
    fontWeight: 900,
    fontSize: 18,
    border: "1px solid #2d3340",
    borderRadius: 12,
    background: "#171b24",
  },

roleToolbar: {
  display: "grid",
  gridTemplateColumns: "220px 220px minmax(260px, 1fr)",
  gap: 16,
  alignItems: "end",
  marginBottom: 16,
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

roleScorePanel: {
  display: "grid",
  gridTemplateColumns: "180px 1fr 180px",
  gap: 16,
  alignItems: "center",
  padding: 12,
  marginBottom: 14,
  border: "1px solid #2d3340",
  borderRadius: 12,
  background: "#171b24",
},

  roleScoreCard: {
    textAlign: "center",
  },

  roleScoreName: {
    color: "#b9bfce",
    fontSize: 12,
    marginBottom: 4,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  roleScoreValue: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: 900,
  },

  roleScoreBarBox: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  roleScoreTitle: {
    color: "#f2f4f8",
    fontSize: 13,
    fontWeight: 800,
    textAlign: "center",
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
    marginTop: 18,
  },

  groupTitle: {
    color: "#f2f4f8",
    fontSize: 17,
    margin: "0 0 8px",
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
    padding: "9px 8px",
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
  roleScoreRange: {
  marginTop: 5,
  color: "#aeb6c7",
  fontSize: 11,
  fontWeight: 700,
},

roleScoreUncertainty: {
  marginTop: 2,
  color: "#8f98aa",
  fontSize: 11,
  fontWeight: 700,
},
footInfo: {
  marginTop: 8,
  display: "flex",
  justifyContent: "center",
  gap: 8,
  flexWrap: "wrap",
  textAlign: "center",
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
compareBody: {
  display: "grid",
  gridTemplateColumns: "380px minmax(0, 1fr)",
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

compareBoxTitle: {
  margin: "0 0 10px",
  fontSize: 15,
  color: "#f2f4f8",
  textAlign: "left",
},

sectionCompactList: {
  display: "grid",
  gap: 8,
},

sectionCompactRow: {
  display: "grid",
  gap: 5,
},

sectionCompactHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  color: "#dbe4f0",
  fontSize: 12,
},


differenceSubtext: {
  marginTop: 3,
  color: "#8b95a7",
  fontSize: 11,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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
fullAttributesPanel: {
  padding: 12,
  border: "1px solid #2a2f3a",
  borderRadius: 10,
  background: "#151922",
  minWidth: 0,
},
sectionVsList: {
  display: "grid",
  gap: 9,
},

sectionVsCard: {
  padding: "9px 10px",
  border: "1px solid #252b36",
  borderRadius: 9,
  background: "#10141d",
},

sectionVsTop: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
  color: "#dbe4f0",
  fontSize: 12,
},

sectionVsMiddle: {
  display: "grid",
  gridTemplateColumns: "1fr 54px 1fr",
  gap: 8,
  alignItems: "center",
},
sectionVsPlayer: {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  alignItems: "center",
  textAlign: "center",
  color: "#aeb6c7",
  fontSize: 11,
  minWidth: 0,
},

sectionVsPlayerRight: {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  alignItems: "center",
  textAlign: "center",
  color: "#aeb6c7",
  fontSize: 11,
  minWidth: 0,
},

sectionVsDiff: {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  minHeight: 30,
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
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
  fontSize: 20,
  fontWeight: 950,
  lineHeight: 1,
},

rightValueBig: {
  color: "#9aff8f",
  fontSize: 20,
  fontWeight: 950,
  lineHeight: 1,
},

differenceCardsGrid: {
  display: "grid",
  gap: 10,
},

differenceBigCard: {
  position: "relative",
  padding: "28px 10px 10px",
  border: "1px solid #252b36",
  borderRadius: 10,
  background: "#10141d",
  overflow: "hidden",
},

differenceCategoryPill: {
  position: "absolute",
  top: 8,
  right: 8,
  padding: "3px 7px",
  borderRadius: 999,
  background: "#20283a",
  color: "#aeb6c7",
  fontSize: 10,
  fontWeight: 800,
},

differenceAttributeName: {
  textAlign: "center",
  color: "#ffffff",
  fontSize: 15,
  fontWeight: 950,
  marginBottom: 10,
},

differencePlayersRow: {
  display: "grid",
  gridTemplateColumns: "1fr 50px 1fr",
  gap: 8,
  alignItems: "center",
},

differencePlayerSide: {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  alignItems: "center",
  textAlign: "center",
  color: "#cbd5e1",
  fontSize: 11,
  minWidth: 0,
},

differencePlayerSideRight: {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  alignItems: "center",
  textAlign: "center",
  color: "#cbd5e1",
  fontSize: 11,
  minWidth: 0,
},

differenceDelta: {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 32,
  borderRadius: 999,
  fontSize: 13,
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
  marginTop: 8,
  paddingTop: 8,
  borderTop: "1px solid #252b36",
  color: "#8b95a7",
  fontSize: 11,
  textAlign: "center",
},
compareMiniRadar: {
  marginTop: 14,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
},
};