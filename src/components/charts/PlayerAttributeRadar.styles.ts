import type { CSSProperties } from "react";

export const playerAttributeRadarStyles: Record<string, CSSProperties> = {

    wrapper: {
  padding: 9,
  border: "1px solid #2c313a",
  borderRadius: 9,
  background: "#151922",
},

header: {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  marginBottom: 6,
},

title: {
  margin: 0,
  fontSize: 13,
},

subtitle: {
  color: "#9ca3af",
  fontSize: 10,
},

content: {
  display: "grid",
  gridTemplateColumns: "minmax(130px, 190px) minmax(86px, 1fr)",
  gap: 8,
  alignItems: "center",
},

chartBox: {
  width: "100%",
  maxWidth: 190,
  margin: "0 auto",
},

  svg: {
    display: "block",
  },

axisList: {
  display: "grid",
  gap: 4,
},

axisRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  padding: "4px 0",
  borderBottom: "1px solid #252b36",
  color: "#dbe4f0",
  fontSize: 11,
},
  wrapperCompact: {
  padding: 8,
  border: "none",
  background: "transparent",
},

contentCompact: {
  display: "block",
},

chartBoxCompact: {
  width: "100%",
  maxWidth: 220,
  margin: "0 auto",
},
};