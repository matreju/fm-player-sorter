import {
  useEffect,
  useRef,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { styles } from "../../styles";
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

function getFmAttributeNumberStyle(value: number): CSSProperties {
  if (value >= 16) {
    return {
      color: "#63ff6b",
      fontWeight: 900,
    };
  }

  if (value >= 11) {
    return {
      color: "#ffd84a",
      fontWeight: 900,
    };
  }

  if (value >= 6) {
    return {
      color: "#d8e2f0",
      fontWeight: 900,
    };
  }

  return {
    color: "#8b95a7",
    fontWeight: 900,
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
return (
  <div style={styles.playerModalOverlay} onMouseDown={onClose}>
<section
  ref={modalRef}
  style={styles.playerModal}
  role="dialog"
  aria-modal="true"
  aria-labelledby="player-details-title"
  tabIndex={-1}
  onMouseDown={(event) => event.stopPropagation()}
>
      <div style={styles.playerModalHero}>
        <div style={styles.playerModalIdentity}>
          <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  }}
>
          <h2 id="player-details-title" style={styles.playerModalName}>
  {player["Nazwisko"] ?? "-"}
</h2>  <PlayerAvailabilityBadge row={player} size="md" />
</div>

          <div style={styles.playerModalMeta}>
            {player["Pozycja"] || "-"} · {player["Wiek"] || "-"} lat ·{" "}
            {player["Klub"] || "-"} · {player["Liga"] || "-"}
          </div>
        </div>

<AppButton
  type="button"
  variant="neutral"
  size="icon"
  onClick={onClose}
  style={styles.modalCloseButton}
  aria-label="Zamknij szczegóły zawodnika"
  title="Zamknij"
>
  ×
</AppButton>
      </div>

      <div style={styles.playerModalControls}>
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
  fieldStyle={styles.playerModalControlField}
  selectStyle={styles.playerModalSelect}
/>

<AppSelectField
  label="Faza"
  value={analysisPhase}
  options={PLAYER_DETAILS_PHASE_OPTIONS}
  onChange={(value) => {
    setAnalysisPhase(value as RolePhaseFilter);
    setAnalysisRoleId("any");
  }}
  fieldStyle={styles.playerModalControlField}
  selectStyle={styles.playerModalSelect}
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
  fieldStyle={styles.playerModalControlField}
  selectStyle={styles.playerModalRoleSelect}
/>
      </div>

      <div style={styles.playerModalContextLine}>
        <span>
          Analiza:{" "}
          <strong>
            {analysisPositionGroup === "any"
              ? "dowolna pozycja"
              : analysisPositionGroup}
          </strong>
        </span>

        <span>
          Naturalność: <strong>{player[CANDIDATE_TYPE_COLUMN] ?? "-"}</strong>
        </span>

        <span>
          Decyzja:{" "}
          <strong>
            {formatDecision(player, getPlayerMark, getPlayerSelectionPosition)}
          </strong>
        </span>
      </div>

      <div style={styles.playerSummaryGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Dopasowanie</div>
          <strong>{player[ROLE_SCORE_COLUMN] ?? "-"}</strong>
        </div>

<div style={styles.statCard}>
  <div style={styles.statLabel}>Forma klubu</div>
  <strong>{player[CLUB_FORM_COLUMN] ?? "-"}</strong>
</div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Najlepsza rola</div>
          <strong>{player[ROLE_BEST_ROLE_COLUMN] ?? "-"}</strong>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Faza roli</div>
          <strong>{player[ROLE_PHASE_COLUMN] ?? "-"}</strong>
        </div>
      </div>

            <div style={styles.playerModalAnalysisGrid}>
        <PlayerAttributeRadar player={player} showAxisList={false} />

        <div style={styles.playerDetailBox}>
          <h3 style={styles.playerDetailTitle}>Najbardziej pomagają</h3>

          {roleMatch && (
            <div style={styles.playerRoleContext}>
              {roleMatch.role.positionGroup} — {roleMatch.role.name} ·{" "}
              {getRolePhaseLabel(roleMatch.role.phase)} ·{" "}
              {formatRoleScore(roleMatch.score)}
            </div>
          )}

          {roleInsights.strengths.length === 0 && (
            <div style={styles.emptyDetailText}>Brak danych.</div>
          )}

          {roleInsights.strengths.map((item) => (
            <div key={item.attribute} style={styles.playerAttributeRow}>
              <span>{item.attribute}</span>

              <strong style={getFmAttributeNumberStyle(item.value)}>
                {item.valueText}
              </strong>
            </div>
          ))}
        </div>

        <div style={styles.playerDetailBox}>
          <h3 style={styles.playerDetailTitle}>Najniższe wymagane</h3>

          {roleMatch && (
            <div style={styles.playerRoleContext}>
              Minimum pod tę samą analizowaną rolę
            </div>
          )}

          {roleInsights.weaknesses.length === 0 && (
            <div style={styles.emptyDetailText}>Brak danych.</div>
          )}

          {roleInsights.weaknesses.map((item) => (
            <div key={item.attribute} style={styles.playerAttributeRow}>
              <span>{item.attribute}</span>

              <strong style={getFmAttributeNumberStyle(item.value)}>
                {item.valueText}
              </strong>
            </div>
          ))}
        </div>

        <div style={styles.playerDetailBox}>
          <h3 style={styles.playerDetailTitle}>Top 5 pozycji</h3>

          {topPositions.map((result, index) => (
            <div key={result.positionGroup} style={styles.playerRankRow}>
              <span>
                {index + 1}. {result.positionGroup}
              </span>

              <strong>{formatPositionScore(result.score)}</strong>
            </div>
          ))}
        </div>
        
      </div>
<MoneyballProfile
  player={player}
  rows={rows}
  analysisPositionGroup={analysisPositionGroup}
/>
    </section>
  </div>
  
);
}