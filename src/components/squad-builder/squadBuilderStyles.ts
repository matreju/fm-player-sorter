import type { CSSProperties } from "react";

export const squadBuilderStyles: Record<string, CSSProperties> = {
wrapper: {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 0,
  overflow: "hidden",
},

field: {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  color: "#aeb6c7",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},
select: {
  width: "100%",
  height: 34,
  padding: "0 10px",
  borderRadius: 9,
  border: "1px solid #313746",
  background: "#0f131b",
  color: "#f2f4f8",
  outline: "none",
  fontSize: 12,
  fontWeight: 850,
},

  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    height: 27,
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
compactCheckbox: {
  minHeight: 30,
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: "0 8px",
  border: "1px solid #313746",
  borderRadius: 9,
  background: "#0f172a",
  color: "#cbd5e1",
  fontSize: 11,
  fontWeight: 850,
  whiteSpace: "nowrap",
},
  scoreLine: {
    marginTop: 1,
    color: "#86efac",
    fontSize: 10,
    fontWeight: 900,
  },


  emptyText: {
    color: "#94a3b8",
    fontSize: 11,
    fontStyle: "italic",
  },



  selectedCandidateRow: {
    background: "rgba(34, 197, 94, 0.08)",
    borderRadius: 8,
    boxShadow: "inset 3px 0 0 rgba(34, 197, 94, 0.85)",
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop:25
  },


pitchSection: {
  flex: 1,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  padding: 4,
  border: "1px solid #2c313a",
  borderRadius: 10,
  background: "#10141d",
  overflow: "hidden",
},

pitchHeader: {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginBottom: 5,
  flexWrap: "wrap",
},

pitchTitle: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 15,
  fontWeight: 950,
},
pitchSubtitle: {
  marginTop: 3,
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.3,
},

pitchHeaderControls: {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 6,
  flexWrap: "wrap",
},

  pitchActiveInfo: {
    padding: "5px 8px",
    border: "1px solid #334155",
    borderRadius: 999,
    background: "#0f172a",
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
compactField: {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  color: "#aeb6c7",
  fontSize: 9,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  minWidth: 150,
},
compactSelect: {
  height: 30,
  width: "100%",
  padding: "0 10px",
  borderRadius: 9,
  border: "1px solid #313746",
  background: "#0f131b",
  color: "#f2f4f8",
  outline: "none",
  fontSize: 12,
  fontWeight: 850,
},
pitchLayout: {
  flex: 1,
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 410px)",
  gap: 6,
  alignItems: "stretch",
},
pitchBoards: {
  minWidth: 0,
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 6,
},

pitchBoard: {
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: 4,
  border: "1px solid #263041",
  borderRadius: 10,
  background: "#0b1220",
  overflow: "hidden",
},

pitchBoardActive: {
  borderColor: "#38bdf8",
  boxShadow: "0 0 0 2px rgba(56, 189, 248, 0.12)",
},

pitchBoardHeader: {
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  padding: "0 4px",
  flexShrink: 0,
},

pitchBoardTitle: {
  color: "#f8fafc",
  fontSize: 12,
  fontWeight: 950,
},

pitchBoardBadge: {
  padding: "2px 6px",
  borderRadius: 999,
  background: "rgba(56, 189, 248, 0.14)",
  color: "#bfdbfe",
  fontSize: 9,
  fontWeight: 900,
  whiteSpace: "nowrap",
},
pitch: {
  position: "relative",
  flex: 1,
  height: "100%",
  minHeight: 0,
  border: "1px solid rgba(226, 232, 240, 0.82)",
  borderRadius: 10,
  overflow: "hidden",
  background:
    "linear-gradient(180deg, #0f6b4f 0%, #0b5f48 50%, #0f6b4f 100%)",
  boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.5)",
},
  pitchHalfLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    background: "rgba(226, 232, 240, 0.85)",
  },

  pitchCenterCircle: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 58,
    height: 58,
    border: "1px solid rgba(226, 232, 240, 0.85)",
    borderRadius: 999,
    transform: "translate(-50%, -50%)",
  },

  pitchBoxTop: {
    position: "absolute",
    left: "32%",
    top: 0,
    width: "36%",
    height: 48,
    borderLeft: "1px solid rgba(226, 232, 240, 0.85)",
    borderRight: "1px solid rgba(226, 232, 240, 0.85)",
    borderBottom: "1px solid rgba(226, 232, 240, 0.85)",
  },

  pitchBoxBottom: {
    position: "absolute",
    left: "32%",
    bottom: 0,
    width: "36%",
    height: 48,
    borderLeft: "1px solid rgba(226, 232, 240, 0.85)",
    borderRight: "1px solid rgba(226, 232, 240, 0.85)",
    borderTop: "1px solid rgba(226, 232, 240, 0.85)",
  },

pitchSlot: {
  position: "absolute",
  width: 112,
  minHeight: 48,
  transform: "translate(-50%, -50%)",
  padding: "4px 6px",
  border: "1px solid rgba(226, 232, 240, 0.66)",
  borderRadius: 7,
  background: "rgba(15, 23, 42, 0.9)",
  color: "#f8fafc",
  cursor: "pointer",
  textAlign: "center",
  boxShadow: "0 6px 14px rgba(0, 0, 0, 0.26)",
},

  pitchSlotActive: {
    borderColor: "#facc15",
    boxShadow:
      "0 0 0 2px rgba(250, 204, 21, 0.28), 0 10px 24px rgba(0, 0, 0, 0.35)",
  },

  pitchSlotFilled: {
    background: "rgba(15, 23, 42, 0.94)",
  },

pitchSlotLabel: {
  display: "block",
  color: "#93c5fd",
  fontSize: 10,
  fontWeight: 950,
  lineHeight: 1.05,
},

pitchSlotName: {
  display: "block",
  marginTop: 1,
  fontSize: 10.5,
  lineHeight: 1.05,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
},
pitchSlotMeta: {
  display: "block",
  marginTop: 1,
  color: "#86efac",
  fontSize: 8.5,
  fontWeight: 900,
  lineHeight: 1.05,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
},
activeTopPanel: {
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 7,
  border: "1px solid #2c313a",
  borderRadius: 10,
  background: "#151922",
  overflow: "auto",
},
activeSlotEditor: {
  flex: "0 0 auto",
  padding: 8,
  border: "1px solid #263041",
  borderRadius: 9,
  background: "#10141d",
  marginBottom: 0,
},

activeSlotEditorGrid: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
},
activeSlotTopSection: {
  flex: "0 0 auto",
  display: "flex",
  flexDirection: "column",
  padding: 10,
  border: "1px solid #263041",
  borderRadius: 10,
  background: "#10141d",
  overflow: "visible",
},
activeTopHeader: {
  flexShrink: 0,
  textAlign: "center",
  marginBottom: 8,
},
activeTopCards: {
  flex: "0 0 auto",
  minHeight: 0,
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 7,
  alignItems: "start",
},

activeTopMiniCard: {
  minWidth:0,
  minHeight: 145,
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
  gap: 7,
  padding: "30px 12px 12px",
  border: "1px solid #263041",
  borderRadius: 10,
  background: "#111827",
  position: "relative",
  overflow: "hidden",
},
miniCandidateRank: {
  width: 26,
  height: 26,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto",
  background: "#1e293b",
  color: "#f8fafc",
  fontSize: 13,
  fontWeight: 950,
},
miniCandidateMain: {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  textAlign: "left",
},
miniCandidateName: {
  display: "block",
  color: "#f8fafc",
  fontSize: 13,
  lineHeight: 1.15,
  whiteSpace: "normal",
  overflow: "hidden",
  textOverflow: "ellipsis",
},
miniCandidateMeta: {
  marginTop: 2,
  color: "#94a3b8",
  fontSize: 10.5,
  lineHeight: 1.5,
  whiteSpace: "normal",
  overflow: "hidden",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
},
miniCandidateBottom: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 5,
},
miniCandidateScore: {
  color: "#86efac",
  fontSize: 17,
  lineHeight: 1,
},

miniCandidateButtons: {
  display: "flex",
  justifyContent: "center",
  gap: 5,
  flexWrap: "wrap",
},
activeTopTitle: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 16,
  fontWeight: 950,
  textAlign: "center",
},
activeTopRole: {
  marginTop: 3,
  marginBottom: 6,
  color: "#93c5fd",
  fontSize: 14,
  fontWeight: 850,
  textAlign: "center",
},

  squadBuilderBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.55)",
    zIndex: 1200,
  },

squadBuilderDrawer: {
  position: "fixed",
  top: 6,
  left: 6,
  right: 6,
  bottom: 6,
  background: "#08111f",
  border: "1px solid rgba(120, 170, 255, 0.18)",
  borderRadius: 12,
  boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
  zIndex: 1201,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
},

squadBuilderDrawerHeader: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "5px 8px",
  borderBottom: "1px solid rgba(120, 170, 255, 0.12)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
  flexShrink: 0,
},

  squadBuilderDrawerTitle: {
    fontSize: 16,
    fontWeight: 900,
    color: "#ffffff",
    lineHeight: 1.1,
  },

  squadBuilderDrawerSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#9fb4d9",
    lineHeight: 1.25,
  },


squadBuilderDrawerBody: {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  padding: 8,
},

squadBuilderScaledContent: {
  width: "100%",
  height: "100%",
  transform: "none",
  transformOrigin: "top left",
},
pitchSlotDragging: {
  opacity: 0.86,
  cursor: "grabbing",
  transform: "translate(-50%, -50%) scale(1.04)",
  zIndex: 10,
},formationAdvisor: {
  padding: 10,
  marginBottom: 10,
  border: "1px solid #263247",
  borderRadius: 12,
  background:
    "linear-gradient(90deg, rgba(56, 189, 248, 0.10), rgba(15, 23, 42, 0.98))",
},

formationAdvisorHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 8,
},

formationAdvisorTitle: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 15,
  fontWeight: 950,
},

formationAdvisorSubtitle: {
  marginTop: 2,
  color: "#94a3b8",
  fontSize: 11,
  lineHeight: 1.35,
},

formationAdvisorList: {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8,
},

formationAdvisorCard: {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr) auto",
  gap: 8,
  alignItems: "center",
  padding: 9,
  border: "1px solid #2f3a4e",
  borderRadius: 10,
  background: "#0f172a",
},

formationAdvisorCardActive: {
  borderColor: "#38bdf8",
  boxShadow: "0 0 0 3px rgba(56, 189, 248, 0.10)",
},

formationAdvisorRank: {
  width: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  background: "#1e293b",
  color: "#bfdbfe",
  fontSize: 12,
  fontWeight: 950,
},

formationAdvisorMain: {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 3,
},

formationAdvisorName: {
  color: "#f8fafc",
  fontSize: 13,
  lineHeight: 1.15,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
},

formationAdvisorMeta: {
  color: "#94a3b8",
  fontSize: 11,
  lineHeight: 1.25,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
},

formationAdvisorWarning: {
  color: "#fbbf24",
  fontSize: 11,
  lineHeight: 1.25,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
},

formationAdvisorSide: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
},

formationAdvisorScore: {
  color: "#86efac",
  fontSize: 18,
  fontWeight: 950,
},
injuryBadge: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  padding: "2px 6px",
  borderRadius: 999,
  border: "1px solid rgba(239, 68, 68, 0.75)",
  background: "rgba(239, 68, 68, 0.18)",
  color: "#fecaca",
  fontSize: 10,
  fontWeight: 950,
  lineHeight: 1.1,
  whiteSpace: "nowrap",
},

pitchSlotInjuryBadge: {
  position: "absolute",
  left: 3,
  top: 3,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 16,
  height: 16,
  padding: "0 4px",
  borderRadius: 999,
  border: "1px solid rgba(239, 68, 68, 0.85)",
  background: "rgba(127, 29, 29, 0.92)",
  color: "#fecaca",
  fontSize: 9,
  fontWeight: 950,
  lineHeight: 1,
  boxShadow: "0 0 0 2px rgba(15, 23, 42, 0.75)",
},

miniCandidateNameRow: {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minWidth: 0,
},
tacticalViewSwitch: {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: 3,
  border: "1px solid #313746",
  borderRadius: 999,
  background: "#0f131b",
},

tacticalViewButton: {
  height: 25,
  padding: "0 10px",
  border: "1px solid transparent",
  borderRadius: 999,
  background: "transparent",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 950,
  whiteSpace: "nowrap",
},

tacticalViewButtonActive: {
  borderColor: "#38bdf8",
  background: "rgba(56, 189, 248, 0.18)",
  color: "#e0f2fe",
},

phaseInfoBox: {
  minHeight: 26,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 8px",
  border: "1px solid #313746",
  borderRadius: 7,
  background: "#0f131b",
  color: "#93c5fd",
  fontSize: 11,
  fontWeight: 900,
  textAlign: "center",
  gap: 4
},

miniCandidateDualScores: {
  marginTop: 6,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  color: "#cbd5e1",
  fontSize: 10,
  lineHeight: 1.15,
},
pitchMetaPill: {
  height: 30,
  display: "inline-flex",
  alignItems: "center",
  padding: "0 9px",
  border: "1px solid #313746",
  borderRadius: 999,
  background: "#0f172a",
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 850,
  whiteSpace: "nowrap",
},
planModalBackdrop: {
  position: "absolute",
  inset: 0,
  zIndex: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  background: "rgba(2, 6, 23, 0.72)",
  backdropFilter: "blur(3px)",
},

planModal: {
  width: "min(980px, 96vw)",
  maxHeight: "86vh",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 12,
  border: "1px solid #334155",
  borderRadius: 14,
  background: "#0f172a",
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.55)",
  overflow: "hidden",
},

planModalHeader: {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  paddingBottom: 8,
  borderBottom: "1px solid #243044",
},

planModalTitle: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 18,
  fontWeight: 950,
},

planModalSubtitle: {
  marginTop: 3,
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.35,
},

planModalEmpty: {
  padding: 14,
  border: "1px solid #334155",
  borderRadius: 10,
  background: "#111827",
  color: "#cbd5e1",
  fontSize: 13,
  lineHeight: 1.45,
},

planList: {
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  overflow: "auto",
  paddingRight: 4,
},

planCard: {
  display: "grid",
  gridTemplateColumns: "34px minmax(0, 1fr) 96px",
  gap: 10,
  alignItems: "center",
  padding: 10,
  border: "1px solid #2f3a4e",
  borderRadius: 12,
  background: "#111827",
},

planCardRank: {
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  background: "#1e293b",
  color: "#bfdbfe",
  fontSize: 13,
  fontWeight: 950,
},

planCardMain: {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 7,
},

planCardTitle: {
  color: "#f8fafc",
  fontSize: 15,
  fontWeight: 950,
  lineHeight: 1.2,
},

planCardGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "5px 10px",
  color: "#cbd5e1",
  fontSize: 11,
  lineHeight: 1.25,
},

planWarnings: {
  display: "flex",
  flexWrap: "wrap",
  gap: 5,
},

planWarningPill: {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 7px",
  border: "1px solid rgba(251, 191, 36, 0.45)",
  borderRadius: 999,
  background: "rgba(251, 191, 36, 0.12)",
  color: "#fde68a",
  fontSize: 10,
  fontWeight: 850,
  lineHeight: 1.2,
},

planCardSide: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
},

planScore: {
  color: "#86efac",
  fontSize: 22,
  fontWeight: 950,
  lineHeight: 1,
},roleAttributesBox: {
  marginTop: 7,
  padding: "7px 8px",
  border: "1px solid rgba(51, 65, 85, 0.95)",
  borderRadius: 9,
  background: "rgba(15, 23, 42, 0.72)",
},

roleAttributesHeader: {
  marginBottom: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  color: "#93c5fd",
  fontSize: 9,
  lineHeight: 1,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

roleAttributeGroups: {
  display: "flex",
  flexDirection: "column",
  gap: 6,
},

roleAttributeGroup: {
  display: "flex",
  flexDirection: "column",
  gap: 4,
},

roleAttributeGroupHeader: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  color: "#cbd5e1",
  fontSize: 9,
  fontWeight: 900,
  lineHeight: 1,
},

roleAttributeGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 4,
},

roleAttributeChip: {
  minWidth: 0,
  minHeight: 23,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 4,
  padding: "3px 5px",
  borderRadius: 6,
  border: "1px solid rgba(51, 65, 85, 0.9)",
  background: "rgba(2, 6, 23, 0.44)",
},

roleAttributeChipCore: {
  borderColor: "rgba(250, 204, 21, 0.75)",
  background: "rgba(250, 204, 21, 0.1)",
},

roleAttributeChipKey: {
  borderColor: "rgba(96, 165, 250, 0.62)",
  background: "rgba(37, 99, 235, 0.12)",
},

roleAttributeChipImportant: {
  borderColor: "rgba(148, 163, 184, 0.48)",
  background: "rgba(15, 23, 42, 0.86)",
},

roleAttributeChipSupport: {
  borderColor: "rgba(71, 85, 105, 0.72)",
  background: "rgba(15, 23, 42, 0.55)",
},

roleAttributeName: {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "#dbeafe",
  fontSize: 9,
  fontWeight: 850,
},

roleAttributeValue: {
  flexShrink: 0,
  fontSize: 11,
  fontWeight: 950,
  lineHeight: 1,
},

roleAttributeValueHigh: {
  color: "#86efac",
},

roleAttributeValueGood: {
  color: "#fde68a",
},

roleAttributeValueOk: {
  color: "#bfdbfe",
},

roleAttributeValueLow: {
  color: "#fca5a5",
},

roleAttributeValueUnknown: {
  color: "#64748b",
},
roleAttributesOpenButton: {
  width: "100%",
  marginTop: 7,
  minHeight: 34,
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gridTemplateRows: "auto auto",
  alignItems: "center",
  gap: "2px 8px",
  padding: "7px 9px",
  borderRadius: 9,
  border: "1px solid rgba(96, 165, 250, 0.55)",
  background: "rgba(15, 23, 42, 0.82)",
  color: "#dbeafe",
  cursor: "pointer",
  textAlign: "left",
},

roleAttributesOpenButtonText: {
  minWidth: 0,
  color: "#93c5fd",
  fontSize: 10,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

roleAttributesOpenButtonCount: {
  gridRow: "1 / span 2",
  gridColumn: 2,
  minWidth: 30,
  minHeight: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  background: "rgba(37, 99, 235, 0.22)",
  color: "#86efac",
  fontSize: 14,
  fontWeight: 950,
},

roleAttributesOpenButtonHint: {
  minWidth: 0,
  color: "#94a3b8",
  fontSize: 10,
  fontWeight: 750,
},

roleAttributesModalBackdrop: {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "rgba(2, 6, 23, 0.72)",
  backdropFilter: "blur(4px)",
},

roleAttributesModal: {
  width: "min(860px, calc(100vw - 32px))",
  maxHeight: "min(760px, calc(100vh - 32px))",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  borderRadius: 16,
  border: "1px solid rgba(96, 165, 250, 0.45)",
  background: "#0f172a",
  boxShadow: "0 24px 80px rgba(0, 0, 0, 0.55)",
},

roleAttributesModalHeader: {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  padding: "18px 20px 14px",
  borderBottom: "1px solid rgba(51, 65, 85, 0.9)",
  background: "linear-gradient(135deg, rgba(14, 116, 144, 0.2), rgba(15, 23, 42, 0.95))",
},

roleAttributesModalTitle: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 22,
  lineHeight: 1.1,
  fontWeight: 950,
},

roleAttributesModalSubtitle: {
  marginTop: 5,
  color: "#bfdbfe",
  fontSize: 13,
  lineHeight: 1.25,
  fontWeight: 750,
},

roleAttributesModalClose: {
  width: 36,
  height: 36,
  flexShrink: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  border: "1px solid rgba(148, 163, 184, 0.35)",
  background: "rgba(15, 23, 42, 0.9)",
  color: "#f8fafc",
  fontSize: 24,
  lineHeight: 1,
  fontWeight: 800,
  cursor: "pointer",
},

roleAttributesModalScoreRow: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 20px",
  borderBottom: "1px solid rgba(51, 65, 85, 0.72)",
  color: "#bfdbfe",
  fontSize: 13,
  fontWeight: 900,
},

roleAttributesModalBody: {
  minHeight: 0,
  overflow: "auto",
  padding: 20,
},

roleAttributesModalIntro: {
  marginBottom: 14,
  color: "#cbd5e1",
  fontSize: 13,
  lineHeight: 1.35,
  fontWeight: 750,
},

roleAttributeModalGroups: {
  display: "flex",
  flexDirection: "column",
  gap: 16,
},

roleAttributeModalGroup: {
  display: "flex",
  flexDirection: "column",
  gap: 8,
},

roleAttributeModalGroupHeader: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  paddingBottom: 6,
  borderBottom: "1px solid rgba(51, 65, 85, 0.8)",
  color: "#dbeafe",
  fontSize: 14,
  fontWeight: 950,
},

roleAttributeModalGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
},

roleAttributeModalChip: {
  minWidth: 0,
  minHeight: 38,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(51, 65, 85, 0.9)",
  background: "rgba(2, 6, 23, 0.44)",
},

roleAttributeModalName: {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "#e2e8f0",
  fontSize: 13,
  fontWeight: 850,
},

roleAttributeModalValue: {
  flexShrink: 0,
  color: "#f8fafc",
  fontSize: 17,
  fontWeight: 950,
  lineHeight: 1,
},


candidateKindBadgeNatural: {
  border: "1px solid rgba(34, 197, 94, 0.65)",
  background: "rgba(22, 101, 52, 0.26)",
  color: "#bbf7d0",
},

candidateKindBadgeClose: {
  border: "1px solid rgba(96, 165, 250, 0.65)",
  background: "rgba(37, 99, 235, 0.22)",
  color: "#bfdbfe",
},

candidateKindBadgeConversion: {
  border: "1px solid rgba(251, 191, 36, 0.72)",
  background: "rgba(120, 53, 15, 0.28)",
  color: "#fde68a",
},

activeTopMiniCardNatural: {
  boxShadow: "inset 4px 0 0 rgba(34, 197, 94, 0.86)",
  background:
    "linear-gradient(90deg, rgba(22, 101, 52, 0.16), rgba(17, 24, 39, 1) 34%)",
},

activeTopMiniCardClose: {
  boxShadow: "inset 4px 0 0 rgba(96, 165, 250, 0.86)",
  background:
    "linear-gradient(90deg, rgba(37, 99, 235, 0.16), rgba(17, 24, 39, 1) 34%)",
},

activeTopMiniCardConversion: {
  boxShadow: "inset 4px 0 0 rgba(251, 191, 36, 0.9)",
  background:
    "linear-gradient(90deg, rgba(120, 53, 15, 0.22), rgba(17, 24, 39, 1) 34%)",
},

miniCandidateScoreNote: {
  marginTop: 2,
  color: "#94a3b8",
  fontSize: 10.5,
  fontWeight: 850,
  lineHeight: 1.15,
},
scoreBreakdownBox: {
  width: "100%",
  marginTop: 7,
  padding: "7px 8px",
  border: "1px solid rgba(51, 65, 85, 0.82)",
  borderRadius: 9,
  background: "rgba(2, 6, 23, 0.34)",
},

scoreBreakdownHeader: {
  marginBottom: 5,
  color: "#93c5fd",
  fontSize: 9.5,
  lineHeight: 1,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

scoreBreakdownRow: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  minHeight: 20,
  borderTop: "1px solid rgba(51, 65, 85, 0.42)",
  paddingTop: 4,
  marginTop: 4,
},

scoreBreakdownLabel: {
  minWidth: 0,
  color: "#cbd5e1",
  fontSize: 10.5,
  fontWeight: 800,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
},

scoreBreakdownValue: {
  flexShrink: 0,
  fontSize: 11,
  fontWeight: 950,
  lineHeight: 1,
},

scoreBreakdownValuePositive: {
  color: "#86efac",
},

scoreBreakdownValueNegative: {
  color: "#fca5a5",
},

scoreBreakdownValueNeutral: {
  color: "#bfdbfe",
},

scoreBreakdownValueTotal: {
  color: "#f8fafc",
},
activeTopMiniCardUsedElsewhere: {
  borderColor: "rgba(251, 191, 36, 0.48)",
  boxShadow:
    "inset 4px 0 0 rgba(251, 191, 36, 0.72), 0 0 0 1px rgba(251, 191, 36, 0.08)",
  background:
    "linear-gradient(90deg, rgba(63, 45, 12, 0.22), rgba(15, 23, 42, 0.98) 30%)",
  opacity: 0.86,
},

usedElsewhereBadge: {
  display: "none",
},

scoreBreakdownCompact: {
  width: "100%",
  marginTop: 7,
  padding: "7px 8px",
  border: "1px solid rgba(51, 65, 85, 0.82)",
  borderRadius: 9,
  background: "rgba(2, 6, 23, 0.28)",
},

scoreBreakdownCompactMain: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  color: "#cbd5e1",
  fontSize: 10.5,
  fontWeight: 850,
  lineHeight: 1.15,
},

scoreBreakdownCompactChips: {
  marginTop: 6,
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
},

scoreBreakdownCompactChip: {
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
  padding: "2px 6px",
  borderRadius: 999,
  border: "1px solid rgba(51, 65, 85, 0.7)",
  background: "rgba(15, 23, 42, 0.72)",
  color: "#cbd5e1",
  fontSize: 9.5,
  fontWeight: 850,
  lineHeight: 1.1,
},
potentialRankBadge: {
  display: "none",
},
usedElsewhereBadgeRow: {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  flexWrap: "wrap",
  marginTop: 2,
  marginBottom: 2,
},

usedElsewhereBadgeCompact: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 19,
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid rgba(251, 191, 36, 0.5)",
  background: "rgba(63, 45, 12, 0.34)",
  color: "#fde68a",
  fontSize: 9,
  lineHeight: 1,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

potentialRankBadgeCompact: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 19,
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.38)",
  background: "rgba(15, 23, 42, 0.72)",
  color: "#cbd5e1",
  fontSize: 9,
  lineHeight: 1,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

candidateKindBadge: {
  minHeight: 20,
  justifySelf: "center",
  alignSelf: "center",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 9.5,
  lineHeight: 1,
  fontWeight: 950,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  width: "auto",
  maxWidth: "fit-content",
},
candidateKindBadgeMuted: {
  opacity: 0.68,
  borderColor: "rgba(148, 163, 184, 0.42)",
  background: "rgba(15, 23, 42, 0.62)",
  color: "#cbd5e1",
},
};
