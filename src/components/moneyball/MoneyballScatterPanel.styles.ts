import type { CSSProperties } from "react";

export const moneyballScatterPanelStyles: Record<string, CSSProperties> = {

      wrapper: {
    marginBottom: 8,
    padding: 8,
    border: "1px solid #2c313a",
    borderRadius: 9,
    background: "#10141d",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },

  title: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: 950,
  },

  subtitle: {
    marginTop: 2,
    color: "#94a3b8",
    fontSize: 10,
  },

controls: {
  display: "grid",
  gridTemplateColumns: "180px 220px 300px",
  gap: 8,
  alignItems: "end",
},

  controlField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    color: "#aeb6c7",
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  select: {
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

  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "7px 8px",
    marginBottom: 8,
    border: "1px solid #252b36",
    borderRadius: 8,
    background: "#151922",
    color: "#f8fafc",
    fontSize: 12,
  },

  chartDescription: {
    marginTop: 2,
    color: "#94a3b8",
    fontSize: 10,
  },

  legend: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#cbd5e1",
    fontSize: 10,
    whiteSpace: "nowrap",
  },

  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    display: "inline-block",
  },

chartBox: {
  position: "relative",
  height: 310,
  border: "1px solid #252b36",
  borderRadius: 8,
  background: "#0b1018",
  padding: 4,
  overflow: "hidden",
},
quadrantLabel: {
  position: "absolute",
  zIndex: 4,
  pointerEvents: "none",
  fontSize: 10,
  fontWeight: 900,
  lineHeight: 1.25,
  textShadow: "0 1px 2px rgba(0, 0, 0, 0.85)",
},

quadrantTopLeft: {
  top: 18,
  left: 72,
  textAlign: "left",
},

quadrantTopRight: {
  top: 18,
  right: 58,
  textAlign: "right",
},

quadrantBottomLeft: {
  bottom: 42,
  left: 72,
  textAlign: "left",
},

quadrantBottomRight: {
  bottom: 42,
  right: 58,
  textAlign: "right",
},

  tooltip: {
    padding: 8,
    border: "1px solid #334155",
    borderRadius: 8,
    background: "#0f172a",
    color: "#f8fafc",
    fontSize: 11,
    lineHeight: 1.5,
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
  },

  note: {
    marginTop: 6,
    color: "#94a3b8",
    fontSize: 10,
    lineHeight: 1.3,
  },

  empty: {
    padding: 10,
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#94a3b8",
    fontSize: 12,
  },
  highlightChips: {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 8,
},

highlightChip: {
  padding: "4px 8px",
  border: "1px solid",
  borderRadius: 999,
  background: "#0b1018",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
},
};