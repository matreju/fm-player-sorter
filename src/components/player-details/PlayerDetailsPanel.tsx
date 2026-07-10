import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { PlayerAvailabilityBadge } from "../ui";
import type { TableRow } from "../../types/table";
import {
  getRolePhaseLabel,
  type RoleDefinition,
} from "../../constants/roles";
import type { PlayerMark } from "../../constants/selection";
import { PlayerAttributeRadar } from "../charts";
import {
  formatRoleScore,
  type RolePhaseFilter,
  type RoleScoreResult,
} from "../../utils/roleScoring";
import {
  formatPositionScore,
  type PositionFitResult,
} from "../../utils/positionScoring";
import { MoneyballProfile } from "../moneyball";
import { AppButton, AppSelectField } from "../ui";
import { buildPlayerNationalReport } from "../../utils/playerNationalReport";

const ROLE_SCORE_COLUMN = "Dopasowanie";
const CLUB_FORM_COLUMN = "Forma klubu";
const CANDIDATE_TYPE_COLUMN = "Typ kandydata";
const ROLE_BEST_ROLE_COLUMN = "Najlepsza rola";
const ROLE_PHASE_COLUMN = "Faza roli";

const PLAYER_DETAILS_PHASE_OPTIONS: { value: RolePhaseFilter; label: string }[] =
  [
    { value: "any", label: "Dowolna" },
    { value: "with-ball", label: "Przy piłce" },
    { value: "without-ball", label: "Bez piłki" },
  ];

type PlayerRoleAttributeInsight = {
  attribute: string;
  value: number;
  valueText: string;
};

type PlayerRoleInsights = {
  strengths: PlayerRoleAttributeInsight[];
  weaknesses: PlayerRoleAttributeInsight[];
};

type PlayerDetailsPanelProps = {
  player: TableRow;
  rows: TableRow[];
  roleMatch: RoleScoreResult | null;
  roleInsights: PlayerRoleInsights;
  topPositions: PositionFitResult[];

  rolePositionOptions: string[];
  availableAnalysisRoles: RoleDefinition[];

  analysisPositionGroup: string;
  setAnalysisPositionGroup: Dispatch<SetStateAction<string>>;

  analysisPhase: RolePhaseFilter;
  setAnalysisPhase: Dispatch<SetStateAction<RolePhaseFilter>>;

  analysisRoleId: string;
  setAnalysisRoleId: Dispatch<SetStateAction<string>>;

  getPlayerMark: (row: TableRow) => PlayerMark | null;
  getPlayerSelectionPosition: (row: TableRow) => string;
  onClose: () => void;
};

const detailStyles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    background: "rgba(3, 7, 18, 0.78)",
    backdropFilter: "blur(6px)",
  },

modal: {
  width: "min(1360px, calc(100vw - 28px))",
  maxHeight: "calc(100vh - 28px)",
  overflow: "auto",
  border: "1px solid #334155",
  borderRadius: 18,
  background: "#0f172a",
  boxShadow: "0 30px 90px rgba(0, 0, 0, 0.72)",
  color: "#e5edf8",
},

hero: {
  position: "sticky",
  top: 0,
  zIndex: 5,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "center",
  padding: "10px 14px",
  borderBottom: "1px solid #26334a",
  background:
    "linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98))",
  backdropFilter: "blur(10px)",
},
  identityRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

name: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 22,
  lineHeight: 1.05,
  fontWeight: 950,
  letterSpacing: "-0.035em",
},

meta: {
  marginTop: 4,
  color: "#bfdbfe",
  fontSize: 12,
  fontWeight: 800,
},

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    fontSize: 22,
  },
body: {
  padding: 10,
},

topGrid: {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 430px)",
  gap: 10,
  alignItems: "start",
  marginBottom: 10,
},
heroCard: {
  padding: 12,
  border: "1px solid #2f3b52",
  borderRadius: 14,
  background:
    "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.94))",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
},

  sectionEyebrow: {
    color: "#93c5fd",
    fontSize: 11,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

sectionTitle: {
  margin: "3px 0 0",
  color: "#f8fafc",
  fontSize: 18,
  lineHeight: 1.15,
  fontWeight: 950,
},

sectionText: {
  marginTop: 5,
  color: "#aebbd0",
  fontSize: 12,
  lineHeight: 1.3,
  fontWeight: 750,
},

analysisControlsCard: {
  padding: 10,
  border: "1px solid #2f3b52",
  borderRadius: 14,
  background: "#111827",
},

controlsGrid: {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 7,
  marginTop: 7,
},

  controlField: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    color: "#aeb6c7",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

select: {
  height: 30,
  padding: "0 9px",
  borderRadius: 9,
  border: "1px solid #334155",
  background: "#0b1120",
  color: "#f8fafc",
  outline: "none",
  fontSize: 12,
  fontWeight: 850,
},

summaryGrid: {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
  marginBottom: 10,
},

statCard: {
  minHeight: 56,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: 4,
  padding: "8px 10px",
  border: "1px solid #29364d",
  borderRadius: 12,
  background: "#111827",
  textAlign: "center",
},

  statCardAccent: {
    borderColor: "rgba(56, 189, 248, 0.48)",
    background:
      "linear-gradient(135deg, rgba(14, 116, 144, 0.25), rgba(15, 23, 42, 0.95))",
  },

  statLabel: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
statValue: {
  color: "#f8fafc",
  fontSize: 15,
  lineHeight: 1.1,
  fontWeight: 950,
},
contextLine: {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "center",
  marginBottom: 10,
  padding: "7px 9px",
  border: "1px solid #29364d",
  borderRadius: 12,
  background: "#0b1120",
  color: "#aebbd0",
  fontSize: 12,
  fontWeight: 750,
},
pill: {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 8px",
  border: "1px solid #334155",
  borderRadius: 999,
  background: "#111827",
  color: "#dbeafe",
  fontSize: 11,
  fontWeight: 900,
},
decisionPanel: {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: 10,
  marginBottom: 10,
},

decisionSummary: {
  gridColumn: "1 / -1",
  padding: "9px 11px",
  border: "1px solid rgba(56, 189, 248, 0.36)",
  borderRadius: 12,
  background:
    "linear-gradient(135deg, rgba(14, 116, 144, 0.18), rgba(15, 23, 42, 0.96))",
  color: "#dbeafe",
  fontSize: 12,
  lineHeight: 1.25,
  fontWeight: 850,
},
reasonBox: {
  minWidth: 0,
  maxHeight: 150,
  overflow: "auto",
  padding: 10,
  border: "1px solid #29364d",
  borderRadius: 12,
  background: "#111827",
},

  positiveBox: {
    borderColor: "rgba(34, 197, 94, 0.38)",
    background: "rgba(20, 83, 45, 0.16)",
  },

  riskBox: {
    borderColor: "rgba(248, 113, 113, 0.34)",
    background: "rgba(127, 29, 29, 0.14)",
  },
reasonTitle: {
  margin: "0 0 7px",
  color: "#f8fafc",
  fontSize: 14,
  fontWeight: 950,
},
reasonList: {
  display: "grid",
  gap: 5,
  margin: 0,
  padding: 0,
  listStyle: "none",
},
reasonItem: {
  display: "grid",
  gap: 3,
  color: "#dbeafe",
  fontSize: 12,
  lineHeight: 1.25,
  fontWeight: 760,
},
reasonItemTitle: {
  color: "#f8fafc",
  fontWeight: 950,
},
reasonItemMeta: {
  color: "#93c5fd",
  fontSize: 11,
  fontWeight: 850,
},
analysisGrid: {
  display: "grid",
  gridTemplateColumns:
    "240px minmax(260px, 1fr) minmax(260px, 1fr) minmax(210px, 0.65fr)",
  gap: 10,
  alignItems: "start",
  marginBottom: 10,
},
detailBox: {
  minWidth: 0,
  padding: 10,
  border: "1px solid #29364d",
  borderRadius: 12,
  background: "#111827",
},
radarBox: {
  minWidth: 0,
  minHeight: 250,
  padding: 10,
  border: "1px solid #29364d",
  borderRadius: 12,
  background: "#111827",
  display: "flex",
  flexDirection: "column",
},
detailTitle: {
  margin: "0 0 7px",
  color: "#f8fafc",
  fontSize: 14,
  fontWeight: 950,
  textAlign: "center",
},

  roleContext: {
    color: "#93c5fd",
    fontSize: 12,
    marginBottom: 9,
    textAlign: "center",
    lineHeight: 1.3,
    fontWeight: 750,
  },
attributeRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  padding: "5px 0",
  borderBottom: "1px solid #253149",
  color: "#dbe4f0",
  fontSize: 12,
  fontWeight: 850,
},
attributeNameWrap: {
  display: "grid",
  gap: 2,
  minWidth: 0,
},
attributeRank: {
  color: "#93c5fd",
  fontSize: 10,
  fontWeight: 850,
},
rankRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  padding: "5px 0",
  borderBottom: "1px solid #253149",
  color: "#dbe4f0",
  fontSize: 12,
  fontWeight: 850,
},
  emptyText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: 750,
    textAlign: "center",
    padding: "12px 0",
  },

  moneyballShell: {
    border: "1px solid #29364d",
    borderRadius: 16,
    background: "#111827",
    overflow: "hidden",
  },

  moneyballHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "13px 15px",
    borderBottom: "1px solid #253149",
    background:
      "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(17, 24, 39, 0.96))",
  },

  moneyballTitle: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: 950,
  },

  moneyballSubtitle: {
    marginTop: 3,
    color: "#aebbd0",
    fontSize: 12,
    fontWeight: 750,
  },

  moneyballBody: {
    padding: 10,
  },
};

function getFmAttributeNumberStyle(value: number): CSSProperties {
  if (value >= 16) {
    return {
      color: "#63ff6b",
      fontWeight: 950,
    };
  }

  if (value >= 11) {
    return {
      color: "#ffd84a",
      fontWeight: 950,
    };
  }

  if (value >= 6) {
    return {
      color: "#d8e2f0",
      fontWeight: 950,
    };
  }

  return {
    color: "#8b95a7",
    fontWeight: 950,
  };
}

function formatDecision(
  player: TableRow,
  getPlayerMark: (row: TableRow) => PlayerMark | null,
  getPlayerSelectionPosition: (row: TableRow) => string
): string {
  const mark = getPlayerMark(player);

  if (mark === "selected") {
    return `Wybrany — ${getPlayerSelectionPosition(player) || "bez pozycji"}`;
  }

  if (mark === "rejected") {
    return "Odrzucony";
  }

  return "Brak decyzji";
}

function getScoreNumber(value: string | undefined): number | null {
  const parsed = Number(String(value ?? "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function getScoreStyle(score: number | null): CSSProperties {
  if (score === null) {
    return {};
  }

  if (score >= 80) {
    return { color: "#86efac" };
  }

  if (score >= 70) {
    return { color: "#7dd3fc" };
  }

  if (score >= 60) {
    return { color: "#fde68a" };
  }

  return { color: "#fca5a5" };
}

export function PlayerDetailsPanel({
  player,
  rows,
  roleMatch,
  roleInsights,
  topPositions,

  rolePositionOptions,
  availableAnalysisRoles,

  analysisPositionGroup,
  setAnalysisPositionGroup,

  analysisPhase,
  setAnalysisPhase,

  analysisRoleId,
  setAnalysisRoleId,

  getPlayerMark,
  getPlayerSelectionPosition,
  onClose,
}: PlayerDetailsPanelProps) {
  const modalRef = useRef<HTMLElement | null>(null);
  const [showMoneyball, setShowMoneyball] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    window.setTimeout(() => {
      modalRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const decisionLabel = formatDecision(
    player,
    getPlayerMark,
    getPlayerSelectionPosition
  );

  const nationalReport = buildPlayerNationalReport({
    player,
    rows,
    roleMatch,
    roleInsights,
  });

  const score = getScoreNumber(player[ROLE_SCORE_COLUMN]);

  function renderAttributeRank(attribute: string) {
    const rank = nationalReport.attributeRanks[attribute];

    if (!rank) {
      return null;
    }

    return <span style={detailStyles.attributeRank}>{rank.label}</span>;
  }

  return (
    <div style={detailStyles.overlay} onMouseDown={onClose}>
      <section
        ref={modalRef}
        style={detailStyles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-details-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header style={detailStyles.hero}>
          <div>
            <div style={detailStyles.identityRow}>
              <h2 id="player-details-title" style={detailStyles.name}>
                {player["Nazwisko"] || "-"}
              </h2>

              <PlayerAvailabilityBadge row={player} size="md" />
            </div>

            <div style={detailStyles.meta}>
              {player["Pozycja"] || "-"} · {player["Wiek"] || "-"} lat ·{" "}
              {player["Klub"] || "-"} · {player["Liga"] || "-"}
            </div>
          </div>

          <AppButton
            type="button"
            variant="neutral"
            size="icon"
            onClick={onClose}
            style={detailStyles.closeButton}
            aria-label="Zamknij szczegóły zawodnika"
            title="Zamknij"
          >
            ×
          </AppButton>
        </header>

        <div style={detailStyles.body}>
          <div style={detailStyles.topGrid}>
            <section style={detailStyles.heroCard}>
              <div style={detailStyles.sectionEyebrow}>Raport zawodnika</div>

              <h3 style={detailStyles.sectionTitle}>
                {nationalReport.summary}
              </h3>

              <div style={detailStyles.sectionText}>
                Raport pokazuje statystyki meczowe/Moneyball na tle aktualnie
                wczytanej listy. Skróty z importu są rozwijane do pełnych nazw,
                a niejednoznaczne kolumny są pomijane.
              </div>
            </section>

            <section style={detailStyles.analysisControlsCard}>
              <div style={detailStyles.sectionEyebrow}>Ustawienia analizy</div>

              <div style={detailStyles.controlsGrid}>
                <AppSelectField
                  label="Pozycja analizy"
                  value={analysisPositionGroup}
                  options={[
                    { value: "any", label: "Wszyscy" },
                    ...rolePositionOptions.map((positionGroup) => ({
                      value: positionGroup,
                      label: positionGroup,
                    })),
                  ]}
                  onChange={(value) => {
                    setAnalysisPositionGroup(value);
                    setAnalysisRoleId("any");
                  }}
                  fieldStyle={detailStyles.controlField}
                  selectStyle={detailStyles.select}
                />

                <AppSelectField
                  label="Faza"
                  value={analysisPhase}
                  options={PLAYER_DETAILS_PHASE_OPTIONS}
                  onChange={(value) => {
                    setAnalysisPhase(value as RolePhaseFilter);
                    setAnalysisRoleId("any");
                  }}
                  fieldStyle={detailStyles.controlField}
                  selectStyle={detailStyles.select}
                />

                <AppSelectField
                  label="Rola"
                  value={analysisRoleId}
                  options={[
                    { value: "any", label: "Dowolna rola" },
                    ...availableAnalysisRoles.map((role) => ({
                      value: role.id,
                      label: `${getRolePhaseLabel(role.phase)} — ${role.name}`,
                    })),
                  ]}
                  onChange={setAnalysisRoleId}
                  fieldStyle={detailStyles.controlField}
                  selectStyle={detailStyles.select}
                />
              </div>
            </section>
          </div>

          <div style={detailStyles.contextLine}>
            <span style={detailStyles.pill}>
              Analiza:{" "}
              <strong>
                {analysisPositionGroup === "any"
                  ? "dowolna pozycja"
                  : analysisPositionGroup}
              </strong>
            </span>

            <span style={detailStyles.pill}>
              Naturalność:{" "}
              <strong>{player[CANDIDATE_TYPE_COLUMN] || "-"}</strong>
            </span>

            <span style={detailStyles.pill}>
              Decyzja: <strong>{decisionLabel}</strong>
            </span>

            <span style={detailStyles.pill}>
              Raport: <strong>statystyki na tle listy</strong>
            </span>
          </div>

          <div style={detailStyles.summaryGrid}>
            <div
              style={{
                ...detailStyles.statCard,
                ...detailStyles.statCardAccent,
              }}
            >
              <div style={detailStyles.statLabel}>Dopasowanie</div>
              <strong
                style={{
                  ...detailStyles.statValue,
                  ...getScoreStyle(score),
                }}
              >
                {player[ROLE_SCORE_COLUMN] || "-"}
              </strong>
            </div>

            <div style={detailStyles.statCard}>
              <div style={detailStyles.statLabel}>Forma klubu</div>
              <strong style={detailStyles.statValue}>
                {player[CLUB_FORM_COLUMN] || "-"}
              </strong>
            </div>

            <div style={detailStyles.statCard}>
              <div style={detailStyles.statLabel}>Najlepsza rola</div>
              <strong style={detailStyles.statValue}>
                {player[ROLE_BEST_ROLE_COLUMN] || "-"}
              </strong>
            </div>

            <div style={detailStyles.statCard}>
              <div style={detailStyles.statLabel}>Faza roli</div>
              <strong style={detailStyles.statValue}>
                {player[ROLE_PHASE_COLUMN] || "-"}
              </strong>
            </div>
          </div>

          <section style={detailStyles.decisionPanel}>
            <div style={detailStyles.decisionSummary}>
              Raport statystyczny: <strong>{nationalReport.mainLine}</strong>
            </div>

            <div
              style={{
                ...detailStyles.reasonBox,
                ...detailStyles.positiveBox,
              }}
            >
              <h3 style={detailStyles.reasonTitle}>Plusy</h3>

              <ul style={detailStyles.reasonList}>
                {nationalReport.pros.map((item) => (
                  <li key={`${item.title}-${item.meta}`} style={detailStyles.reasonItem}>
                    <span style={detailStyles.reasonItemTitle}>
                      + {item.title}
                      {item.value ? ` — ${item.value}` : ""}
                    </span>
                    <span style={detailStyles.reasonItemMeta}>{item.meta}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              style={{
                ...detailStyles.reasonBox,
                ...detailStyles.riskBox,
              }}
            >
              <h3 style={detailStyles.reasonTitle}>Ryzyka</h3>

              <ul style={detailStyles.reasonList}>
                {nationalReport.risks.map((item) => (
                  <li key={`${item.title}-${item.meta}`} style={detailStyles.reasonItem}>
                    <span style={detailStyles.reasonItemTitle}>
                      – {item.title}
                      {item.value ? ` — ${item.value}` : ""}
                    </span>
                    <span style={detailStyles.reasonItemMeta}>{item.meta}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section style={detailStyles.analysisGrid}>
            <div style={detailStyles.radarBox}>
              <h3 style={detailStyles.detailTitle}>Profil atrybutów</h3>

              <PlayerAttributeRadar
                player={player}
                showHeader={false}
                showAxisList={false}
                compact
              />
            </div>

            <div style={detailStyles.detailBox}>
              <h3 style={detailStyles.detailTitle}>Najbardziej pomagają</h3>

              {roleMatch && (
                <div style={detailStyles.roleContext}>
                  {roleMatch.role.positionGroup} — {roleMatch.role.name} ·{" "}
                  {getRolePhaseLabel(roleMatch.role.phase)} ·{" "}
                  {formatRoleScore(roleMatch.score)}
                </div>
              )}

              {roleInsights.strengths.length === 0 && (
                <div style={detailStyles.emptyText}>Brak danych.</div>
              )}

{roleInsights.strengths.slice(0, 6).map((item) => (
                  <div key={item.attribute} style={detailStyles.attributeRow}>
                  <span style={detailStyles.attributeNameWrap}>
                    <span>{item.attribute}</span>
                    {renderAttributeRank(item.attribute)}
                  </span>

                  <strong style={getFmAttributeNumberStyle(item.value)}>
                    {item.valueText}
                  </strong>
                </div>
              ))}
            </div>

            <div style={detailStyles.detailBox}>
              <h3 style={detailStyles.detailTitle}>Najniższe wymagane</h3>

              {roleMatch && (
                <div style={detailStyles.roleContext}>
                  Minimum pod tę samą analizowaną rolę
                </div>
              )}

              {roleInsights.weaknesses.length === 0 && (
                <div style={detailStyles.emptyText}>Brak danych.</div>
              )}

              {roleInsights.weaknesses.slice(0, 6).map((item) => (
                <div key={item.attribute} style={detailStyles.attributeRow}>
                  <span style={detailStyles.attributeNameWrap}>
                    <span>{item.attribute}</span>
                    {renderAttributeRank(item.attribute)}
                  </span>

                  <strong style={getFmAttributeNumberStyle(item.value)}>
                    {item.valueText}
                  </strong>
                </div>
              ))}
            </div>

            <div style={detailStyles.detailBox}>
              <h3 style={detailStyles.detailTitle}>Top 5 pozycji</h3>

              {topPositions.length === 0 && (
                <div style={detailStyles.emptyText}>Brak danych.</div>
              )}

              {topPositions.slice(0, 5).map((result, index) => (
                <div key={result.positionGroup} style={detailStyles.rankRow}>
                  <span>
                    {index + 1}. {result.positionGroup}
                  </span>

                  <strong>{formatPositionScore(result.score)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section style={detailStyles.moneyballShell}>
            <div style={detailStyles.moneyballHeader}>
              <div>
                <h3 style={detailStyles.moneyballTitle}>Moneyball</h3>

                <div style={detailStyles.moneyballSubtitle}>
                  Mapa, H2H i statystyki są zwinięte, żeby szczegóły zawodnika
                  nie ładowały ciężkiego wykresu od razu.
                </div>
              </div>

              <AppButton
                type="button"
                variant={showMoneyball ? "neutral" : "primary"}
                size="compact"
                onClick={() => setShowMoneyball((current) => !current)}
              >
                {showMoneyball ? "Ukryj Moneyball" : "Pokaż Moneyball"}
              </AppButton>
            </div>

            {showMoneyball && (
              <div style={detailStyles.moneyballBody}>
                <MoneyballProfile
                  player={player}
                  rows={rows}
                  analysisPositionGroup={analysisPositionGroup}
                />
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}