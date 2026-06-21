import type { CSSProperties } from "react";
    
export const moneyballProfileStyles: Record<string, CSSProperties> = {wrapper: {
  margin: "0 0 8px",
  padding: 8,
  border: "1px solid #2c313a",
  borderRadius: 9,
  background: "#151922",
},

header: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 6,
},

  title: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: 900,
  },

  subtitle: {
    marginTop: 2,
    color: "#94a3b8",
    fontSize: 10,
  },

  reliabilityBadge: {
    padding: "4px 7px",
    border: "1px solid",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

grid: {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 6,
},

sectionCard: {
  padding: 6,
  border: "1px solid #252b36",
  borderRadius: 7,
  background: "#10141d",
  minWidth: 0,
},

  sectionTitle: {
    margin: "0 0 6px",
    color: "#dbeafe",
    fontSize: 11,
    fontWeight: 900,
    textAlign: "center",
  },

  metricList: {
    display: "grid",
    gap: 3,
  },

metricRow: {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 5,
  padding: "2px 0",
  borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
},

  metricLabel: {
    color: "#aeb6c7",
    fontSize: 10,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

metricValue: {
  fontSize: 11,
  fontWeight: 900,
  whiteSpace: "nowrap",
  textAlign: "right",
},

  empty: {
    color: "#94a3b8",
    fontSize: 12,
  },
  insightList: {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 8,
},

insightChip: {
  padding: "4px 7px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 800,
  lineHeight: 1.2,
},
positionProfileBox: {
  marginBottom: 8,
  padding: 8,
  border: "1px solid",
  borderRadius: 8,
},

positionProfileHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  marginBottom: 7,
},

positionProfileTitle: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 12,
  fontWeight: 950,
},

positionProfileSubtitle: {
  marginTop: 2,
  color: "#94a3b8",
  fontSize: 10,
},

positionProfileSummary: {
  color: "#f8fafc",
  fontSize: 11,
  textAlign: "right",
  maxWidth: 360,
  lineHeight: 1.25,
},

positionProfileColumns: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
},

positionProfileColumnTitle: {
  marginBottom: 4,
  color: "#cbd5e1",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
},

positionProfilePositive: {
  padding: "3px 0",
  color: "#86efac",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1.25,
},

positionProfileWarning: {
  padding: "3px 0",
  color: "#fda4af",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1.25,
},

positionProfileEmpty: {
  color: "#94a3b8",
  fontSize: 11,
  fontStyle: "italic",
},
playerDuelBox: {
  marginBottom: 8,
  padding: 8,
  border: "1px solid #2c313a",
  borderRadius: 9,
  background: "#10141d",
},

playerDuelHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 10,
  marginBottom: 8,
},

playerDuelTitle: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 13,
  fontWeight: 950,
},

playerDuelSubtitle: {
  marginTop: 2,
  color: "#94a3b8",
  fontSize: 10,
},

playerDuelField: {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 320,
  color: "#aeb6c7",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

playerDuelSelect: {
  height: 28,
  width: "100%",
  padding: "0 8px",
  borderRadius: 7,
  border: "1px solid #313746",
  background: "#0f131b",
  color: "#f2f4f8",
  outline: "none",
  fontSize: 12,
  fontWeight: 800,
},

playerDuelEmpty: {
  padding: 10,
  border: "1px solid #252b36",
  borderRadius: 8,
  background: "#0b1018",
  color: "#94a3b8",
  fontSize: 12,
  textAlign: "center",
},
};