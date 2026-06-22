import type { CSSProperties } from "react";

export const playerCardStyles = {

    cardView: {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 0,
} satisfies CSSProperties,

statsBar: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 8,
  padding: "10px 12px 0",
} satisfies CSSProperties,

statsBarCompact: {
  gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
  gap: 6,
  padding: "8px 8px 0",
} satisfies CSSProperties,

statCard: {
  minWidth: 0,
  minHeight: 56,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: 4,
  padding: "9px 11px",
  border: "1px solid rgba(51, 65, 85, 0.82)",
  borderRadius: 12,
  background: "rgba(15, 23, 42, 0.86)",
} satisfies CSSProperties,

statButton: {
  width: "100%",
  textAlign: "left",
  cursor: "pointer",
  transition:
    "border-color 140ms, background 140ms, transform 140ms, box-shadow 140ms",
} satisfies CSSProperties,

statButtonActive: {
  borderColor: "#38bdf8",
  boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.28) inset",
  transform: "translateY(-1px)",
} satisfies CSSProperties,

statButtonDisabled: {
  opacity: 0.45,
  cursor: "not-allowed",
} satisfies CSSProperties,

statHintActive: {
  color: "#7dd3fc",
} satisfies CSSProperties,

filteredNotice: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  margin: "10px 12px 0",
  padding: "8px 10px",
  border: "1px solid rgba(56, 189, 248, 0.32)",
  borderRadius: 10,
  background: "rgba(14, 116, 144, 0.12)",
  color: "#bfdbfe",
  fontSize: 12,
  fontWeight: 850,
} satisfies CSSProperties,

filteredNoticeCompact: {
  margin: "8px 8px 0",
  padding: "7px 8px",
  fontSize: 10,
} satisfies CSSProperties,

filteredNoticeButton: {
  height: 26,
  padding: "0 9px",
  borderRadius: 999,
  border: "1px solid rgba(56, 189, 248, 0.45)",
  background: "rgba(15, 23, 42, 0.88)",
  color: "#bae6fd",
  fontSize: 11,
  fontWeight: 900,
  cursor: "pointer",
} satisfies CSSProperties,
positionDepthPanel: {
  margin: "6px 12px 0",
  padding: 6,
  border: "1px solid rgba(51, 65, 85, 0.62)",
  borderRadius: 10,
  background: "rgba(15, 23, 42, 0.52)",
} satisfies CSSProperties,

positionDepthPanelCompact: {
  margin: "5px 8px 0",
  padding: 5,
  borderRadius: 9,
} satisfies CSSProperties,

positionDepthGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 7,
} satisfies CSSProperties,

positionDepthGridCompact: {
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 6,
} satisfies CSSProperties,

positionDepthCard: {
  minWidth: 0,
  minHeight: 62,
  display: "grid",
  gridTemplateRows: "auto auto",
  gap: 4,
  padding: "7px 8px",
  border: "1px solid rgba(51, 65, 85, 0.78)",
  borderRadius: 9,
  background: "rgba(2, 6, 23, 0.24)",
  color: "#e5edff",
  textAlign: "left",
  cursor: "pointer",
  transition:
    "border-color 140ms, background 140ms, transform 140ms, box-shadow 140ms",
} satisfies CSSProperties,

positionDepthCardCompact: {
  minHeight: 56,
  gap: 3,
  padding: "6px 7px",
  borderRadius: 8,
} satisfies CSSProperties,

positionDepthName: {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "#f8fafc",
  fontSize: 11,
  lineHeight: 1.1,
  fontWeight: 950,
} satisfies CSSProperties,

positionDepthBest: {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "#bfdbfe",
  fontSize: 9,
  lineHeight: 1,
  fontWeight: 800,
} satisfies CSSProperties,

positionDepthScoreRow: {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto 1fr",
  alignItems: "center",
  gap: 4,
  color: "#94a3b8",
  fontSize: 9,
  lineHeight: 1,
  fontWeight: 850,
} satisfies CSSProperties,

positionDepthScore: {
  color: "#86efac",
  fontSize: 12,
  lineHeight: 1,
  fontWeight: 950,
} satisfies CSSProperties,

positionDepthHeader: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 6,
} satisfies CSSProperties,

positionDepthTitle: {
  color: "#e5edff",
  fontSize: 11,
  lineHeight: 1,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
} satisfies CSSProperties,

positionDepthHint: {
  minWidth: 0,
  color: "#94a3b8",
  fontSize: 10,
  lineHeight: 1.15,
  fontWeight: 800,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} satisfies CSSProperties,



positionDepthCardActive: {
  borderColor: "#38bdf8",
  background: "rgba(14, 116, 144, 0.18)",
  boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.24) inset",
  transform: "translateY(-1px)",
} satisfies CSSProperties,

positionDepthCardEmpty: {
  opacity: 0.45,
  cursor: "not-allowed",
} satisfies CSSProperties,

positionDepthTop: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
} satisfies CSSProperties,


positionDepthCount: {
  flexShrink: 0,
  minWidth: 26,
  minHeight: 21,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  border: "1px solid rgba(96, 165, 250, 0.32)",
  background: "rgba(37, 99, 235, 0.14)",
  color: "#bfdbfe",
  fontSize: 10,
  fontWeight: 950,
} satisfies CSSProperties,


positionDepthResetButton: {
  height: 24,
  padding: "0 8px",
  borderRadius: 999,
  border: "1px solid rgba(56, 189, 248, 0.45)",
  background: "rgba(15, 23, 42, 0.88)",
  color: "#bae6fd",
  fontSize: 10,
  fontWeight: 900,
  cursor: "pointer",
} satisfies CSSProperties,
statCardCompact: {
  minHeight: 48,
  padding: "7px 9px",
  borderRadius: 10,
} satisfies CSSProperties,

statCardElite: {
  borderColor: "rgba(34, 197, 94, 0.48)",
  background: "rgba(20, 83, 45, 0.18)",
} satisfies CSSProperties,

statCardGood: {
  borderColor: "rgba(56, 189, 248, 0.42)",
  background: "rgba(14, 116, 144, 0.14)",
} satisfies CSSProperties,

statCardOkay: {
  borderColor: "rgba(245, 158, 11, 0.42)",
  background: "rgba(120, 53, 15, 0.14)",
} satisfies CSSProperties,

statCardLow: {
  borderColor: "rgba(239, 68, 68, 0.42)",
  background: "rgba(127, 29, 29, 0.14)",
} satisfies CSSProperties,

statCardSelected: {
  borderColor: "rgba(34, 197, 94, 0.48)",
  background: "rgba(22, 101, 52, 0.16)",
} satisfies CSSProperties,

statLabel: {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "#94a3b8",
  fontSize: 10,
  lineHeight: 1,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
} satisfies CSSProperties,

statValue: {
  color: "#f8fafc",
  fontSize: 21,
  lineHeight: 1,
  fontWeight: 950,
} satisfies CSSProperties,

statValueCompact: {
  fontSize: 18,
} satisfies CSSProperties,

statHint: {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "#bfdbfe",
  fontSize: 11,
  lineHeight: 1.1,
  fontWeight: 750,
} satisfies CSSProperties,
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 12,
    padding: 12,
  } satisfies CSSProperties,

  gridCompact: {
    gridTemplateColumns: "repeat(auto-fill, minmax(235px, 1fr))",
    gap: 8,
    padding: 8,
  } satisfies CSSProperties,

  card: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 13,
    border: "1px solid #263247",
    borderRadius: 14,
    background:
      "linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.94))",
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.22)",
    cursor: "pointer",
    transition:
      "border-color 140ms, background 140ms, transform 140ms, box-shadow 140ms",
  } satisfies CSSProperties,

  cardCompact: {
    gap: 7,
    padding: 10,
    borderRadius: 12,
  } satisfies CSSProperties,

  cardSelected: {
    borderColor: "#22c55e",
    background:
      "linear-gradient(145deg, rgba(20, 83, 45, 0.35), rgba(15, 23, 42, 0.98))",
  } satisfies CSSProperties,

  cardRejected: {
    borderColor: "#ef4444",
    background:
      "linear-gradient(145deg, rgba(127, 29, 29, 0.32), rgba(15, 23, 42, 0.98))",
    opacity: 0.78,
  } satisfies CSSProperties,

  analysisPill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    padding: "5px 8px",
    border: "1px solid rgba(56, 189, 248, 0.28)",
    borderRadius: 999,
    background: "rgba(14, 116, 144, 0.12)",
    color: "#bfdbfe",
    fontSize: 11,
    lineHeight: 1.15,
    fontWeight: 850,
  } satisfies CSSProperties,

  analysisPillCompact: {
    padding: "4px 7px",
    fontSize: 10,
  } satisfies CSSProperties,

  analysisPillLabel: {
    flexShrink: 0,
    color: "#7dd3fc",
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  } satisfies CSSProperties,

  analysisPillValue: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } satisfies CSSProperties,

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  } satisfies CSSProperties,

  titleBlock: {
    minWidth: 0,
  } satisfies CSSProperties,

  nameButton: {
    width: "100%",
    minWidth: 0,
    padding: 0,
    border: 0,
    background: "transparent",
    color: "#f8fafc",
    fontSize: 17,
    lineHeight: 1.15,
    fontWeight: 950,
    textAlign: "left",
    cursor: "pointer",
  } satisfies CSSProperties,

  nameButtonCompact: {
    fontSize: 14,
  } satisfies CSSProperties,

  meta: {
    marginTop: 4,
    color: "#93c5fd",
    fontSize: 12,
    lineHeight: 1.25,
    fontWeight: 750,
  } satisfies CSSProperties,

  metaCompact: {
    fontSize: 10,
  } satisfies CSSProperties,

  scoreBadge: {
    minWidth: 62,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 8px",
    border: "1px solid rgba(34, 197, 94, 0.45)",
    borderRadius: 12,
    background: "rgba(34, 197, 94, 0.12)",
  } satisfies CSSProperties,

  scoreBadgeCompact: {
    minWidth: 54,
    padding: "6px 7px",
    borderRadius: 10,
  } satisfies CSSProperties,

  scoreBadgeElite: {
    borderColor: "rgba(34, 197, 94, 0.58)",
    background: "rgba(34, 197, 94, 0.15)",
  } satisfies CSSProperties,

  scoreBadgeGood: {
    borderColor: "rgba(56, 189, 248, 0.5)",
    background: "rgba(14, 116, 144, 0.14)",
  } satisfies CSSProperties,

  scoreBadgeOkay: {
    borderColor: "rgba(245, 158, 11, 0.48)",
    background: "rgba(245, 158, 11, 0.12)",
  } satisfies CSSProperties,

  scoreBadgeLow: {
    borderColor: "rgba(239, 68, 68, 0.5)",
    background: "rgba(127, 29, 29, 0.16)",
  } satisfies CSSProperties,

  scoreLabel: {
    color: "#bbf7d0",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  } satisfies CSSProperties,

  scoreValue: {
    marginTop: 2,
    color: "#86efac",
    fontSize: 22,
    lineHeight: 1,
    fontWeight: 950,
  } satisfies CSSProperties,

  scoreValueCompact: {
    fontSize: 18,
  } satisfies CSSProperties,

  scoreValueElite: {
    color: "#86efac",
  } satisfies CSSProperties,

  scoreValueGood: {
    color: "#7dd3fc",
  } satisfies CSSProperties,

  scoreValueOkay: {
    color: "#fde68a",
  } satisfies CSSProperties,

  scoreValueLow: {
    color: "#fca5a5",
  } satisfies CSSProperties,

  body: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  } satisfies CSSProperties,

  bodyCompact: {
    gap: 5,
  } satisfies CSSProperties,

  roleName: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: 950,
    lineHeight: 1.2,
  } satisfies CSSProperties,

  roleNameCompact: {
    fontSize: 12,
  } satisfies CSSProperties,

  roleMeta: {
    color: "#bfdbfe",
    fontSize: 12,
    lineHeight: 1.25,
    fontWeight: 750,
  } satisfies CSSProperties,

  roleMetaCompact: {
    fontSize: 10,
  } satisfies CSSProperties,

  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "6px 8px",
    border: "1px solid rgba(51, 65, 85, 0.78)",
    borderRadius: 9,
    background: "rgba(2, 6, 23, 0.24)",
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 1.2,
    fontWeight: 750,
  } satisfies CSSProperties,

  rowCompact: {
    padding: "5px 7px",
    fontSize: 10,
    borderRadius: 8,
  } satisfies CSSProperties,

  rowLabel: {
    color: "#94a3b8",
    fontWeight: 850,
  } satisfies CSSProperties,

  formPositive: {
    color: "#86efac",
  } satisfies CSSProperties,

  formNeutral: {
    color: "#bfdbfe",
  } satisfies CSSProperties,

  formNegative: {
    color: "#fca5a5",
  } satisfies CSSProperties,

  moneyball: {
    minHeight: 34,
    padding: "7px 8px",
    border: "1px solid rgba(56, 189, 248, 0.24)",
    borderRadius: 9,
    background: "rgba(14, 116, 144, 0.1)",
    color: "#dbeafe",
    fontSize: 12,
    lineHeight: 1.3,
    fontWeight: 750,
  } satisfies CSSProperties,

  moneyballCompact: {
    minHeight: 26,
    padding: "5px 7px",
    fontSize: 10,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  } satisfies CSSProperties,

  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 2,
  } satisfies CSSProperties,

  actionsCompact: {
    gap: 6,
  } satisfies CSSProperties,

  actionsLeft: {
    display: "flex",
    alignItems: "center",
    gap: 7,
  } satisfies CSSProperties,

  empty: {
    padding: 24,
    border: "1px dashed #334155",
    borderRadius: 14,
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: 800,
  } satisfies CSSProperties,
};