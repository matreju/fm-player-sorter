import type { CSSProperties } from "react";

export const moneyballCompareStyles: Record<string, CSSProperties> = {

      wrapper: {
    marginTop: 12,
    padding: 10,
    border: "1px solid #2c313a",
    borderRadius: 10,
    background: "#151922",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },

  title: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: 950,
  },

  subtitle: {
    marginTop: 2,
    color: "#94a3b8",
    fontSize: 11,
  },

  reliabilityRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 6,
  },

  reliabilityBadge: {
    padding: "4px 7px",
    border: "1px solid",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  summaryRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 9,
  },

  summaryBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "6px 8px",
    border: "1px solid #252b36",
    borderRadius: 8,
    background: "#10141d",
    color: "#dbe4f0",
    fontSize: 11,
  },

groupsGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 7,
},

  groupCard: {
    padding: 7,
    border: "1px solid #252b36",
    borderRadius: 8,
    background: "#10141d",
    minWidth: 0,
  },

  groupTitle: {
    margin: "0 0 6px",
    color: "#dbeafe",
    fontSize: 12,
    fontWeight: 900,
    textAlign: "center",
  },

  metricRows: {
    display: "grid",
    gap: 2,
  },

metricRow: {
  display: "grid",
  gridTemplateColumns: "minmax(78px, 1fr) 48px 18px 48px",
    alignItems: "center",
    gap: 4,
    padding: "3px 0",
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
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  metricVs: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: 900,
    textAlign: "center",
  },
};