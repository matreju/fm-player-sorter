import type { CSSProperties } from "react";
import { getCampTypeLabel, getMatchTypeLabel } from "../../utils/campCore";
import {
  formatAverageRating,
  formatCallUpPositionCounts,
  type CareerPlayerDetails,
  type CareerPlayerSummary,
} from "../../utils/campStats";
import {
  type CampaignPlayerSort,
  type SortDirection,
} from "./CampaignPlayersPanel";
import { styles } from "./CampsDrawer.styles";

type CareerHistoryModalProps = {
  careerSearch: string;
  careerPlayerSummariesCount: number;
  filteredCareerPlayerSummaries: CareerPlayerSummary[];
  selectedCareerSummary: CareerPlayerSummary | null;
  selectedCareerDetails: CareerPlayerDetails | null;
  careerPlayerSort: CampaignPlayerSort;
  careerPlayerSortDirection: SortDirection;
  onCareerSearchChange: (value: string) => void;
  onSelectCareerPlayer: (playerKey: string) => void;
  onToggleCareerPlayerSort: (value: CampaignPlayerSort) => void;
  onClose: () => void;
};

function parseRatingValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(String(value).replace(",", "."));

  return Number.isNaN(parsed) ? null : parsed;
}

function getRatingStyle(value: string | number | null | undefined): CSSProperties {
  const rating = parseRatingValue(value);

  if (rating === null) return {};

  if (rating >= 9) {
    return {
      color: "#bbf7d0",
      background: "rgba(34, 197, 94, 0.34)",
      border: "1px solid rgba(34, 197, 94, 0.75)",
      borderRadius: 999,
      padding: "2px 8px",
      fontWeight: 950,
      display: "inline-flex",
      justifyContent: "center",
    };
  }

  if (rating >= 8) {
    return {
      color: "#86efac",
      background: "rgba(34, 197, 94, 0.24)",
      border: "1px solid rgba(34, 197, 94, 0.55)",
      borderRadius: 999,
      padding: "2px 8px",
      fontWeight: 950,
      display: "inline-flex",
      justifyContent: "center",
    };
  }

  if (rating >= 7) {
    return {
      color: "#dcfce7",
      background: "rgba(34, 197, 94, 0.14)",
      border: "1px solid rgba(34, 197, 94, 0.36)",
      borderRadius: 999,
      padding: "2px 8px",
      fontWeight: 950,
      display: "inline-flex",
      justifyContent: "center",
    };
  }

  return {};
}

function getScoreStyleByTone(
  tone: "win" | "draw" | "loss" | "none"
): CSSProperties {
  if (tone === "win") {
    return {
      color: "#86efac",
      background: "rgba(34, 197, 94, 0.18)",
      border: "1px solid rgba(34, 197, 94, 0.55)",
      borderRadius: 999,
      padding: "2px 8px",
      fontWeight: 950,
    };
  }

  if (tone === "draw") {
    return {
      color: "#fde68a",
      background: "rgba(234, 179, 8, 0.18)",
      border: "1px solid rgba(234, 179, 8, 0.55)",
      borderRadius: 999,
      padding: "2px 8px",
      fontWeight: 950,
    };
  }

  if (tone === "loss") {
    return {
      color: "#fecaca",
      background: "rgba(239, 68, 68, 0.18)",
      border: "1px solid rgba(239, 68, 68, 0.55)",
      borderRadius: 999,
      padding: "2px 8px",
      fontWeight: 950,
    };
  }

  return {};
}

function getCallUpPositionLabel(summary: CareerPlayerSummary): string {
  return summary.player.callUpPosition || summary.player.position || "-";
}

export function CareerHistoryModal({
  careerSearch,
  careerPlayerSummariesCount,
  filteredCareerPlayerSummaries,
  selectedCareerSummary,
  selectedCareerDetails,
  careerPlayerSort,
  careerPlayerSortDirection,
  onCareerSearchChange,
  onSelectCareerPlayer,
  onToggleCareerPlayerSort,
  onClose,
}: CareerHistoryModalProps) {
  function getSortIndicator(sort: CampaignPlayerSort) {
    if (careerPlayerSort !== sort) return "";

    return careerPlayerSortDirection === "asc" ? " ↑" : " ↓";
  }

  function renderSortHeader(label: string, sort: CampaignPlayerSort) {
    return (
      <button
        type="button"
        onClick={() => onToggleCareerPlayerSort(sort)}
        style={styles.sortHeaderButton}
      >
        {label}
        {getSortIndicator(sort)}
      </button>
    );
  }

  return (
    <div style={styles.historyOverlay}>
      <section style={styles.historyModal}>
        <div style={styles.historyHeader}>
          <div>
            <h2 style={styles.historyTitle}>Historia zawodników</h2>

            <div style={styles.historySubtitle}>
              Łączne powołania, występy i liczby ze wszystkich zapisanych zgrupowań.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={styles.historyCloseButton}
          >
            ✕
          </button>
        </div>

        <div style={styles.historyToolbar}>
          <input
            value={careerSearch}
            onChange={(event) => onCareerSearchChange(event.target.value)}
            placeholder="Szukaj zawodnika, klubu, pozycji..."
            style={styles.historySearchInput}
          />

          <div style={styles.historyCounter}>
            Zawodnicy: <strong>{filteredCareerPlayerSummaries.length}</strong> /{" "}
            {careerPlayerSummariesCount}
          </div>
        </div>

        <div style={styles.historyContent}>
          <div style={styles.historyTable}>
            <div
              style={{
                ...styles.historyRow,
                ...styles.historyHeadRow,
              }}
            >
              {renderSortHeader("Zawodnik", "name")}
              {renderSortHeader("Powołania", "callUps")}
              {renderSortHeader("Mecze", "matches")}
              {renderSortHeader("Minuty", "minutes")}
              {renderSortHeader("Gole", "goals")}
              {renderSortHeader("Asysty", "assists")}
              {renderSortHeader("Śr. ocena", "rating")}
            </div>

            {filteredCareerPlayerSummaries.length === 0 && (
              <div style={styles.historyEmpty}>
                Brak zawodników pasujących do wyszukiwania.
              </div>
            )}

            {filteredCareerPlayerSummaries.map((summary) => {
              const isActive =
                selectedCareerSummary?.player.key === summary.player.key;

              return (
                <button
                  key={summary.player.key}
                  type="button"
                  onClick={() => onSelectCareerPlayer(summary.player.key)}
                  style={{
                    ...styles.historyRow,
                    ...styles.historyButtonRow,
                    ...(isActive ? styles.historyButtonRowActive : {}),
                  }}
                >
<div style={styles.historyPlayerCell}>
  <strong>{summary.player.name}</strong>

  <span style={styles.callUpPositionLine}>
    Powołany jako: {formatCallUpPositionCounts(summary.callUpPositionCounts)}
  </span>

  <span>
    FM: {summary.player.position} · {summary.player.club}
  </span>
</div>

                  <strong>{summary.callUps}</strong>
                  <strong>{summary.matches}</strong>
                  <strong>{summary.minutes}</strong>
                  <strong>{summary.goals}</strong>
                  <strong>{summary.assists}</strong>
                  <strong style={getRatingStyle(summary.avgRating)}>
                    {formatAverageRating(summary.avgRating)}
                  </strong>
                </button>
              );
            })}
          </div>

          <aside style={styles.careerDetailsPanel}>
            {!selectedCareerSummary || !selectedCareerDetails ? (
              <div style={styles.historyEmpty}>Wybierz zawodnika z tabeli.</div>
            ) : (
              <>
                <div style={styles.careerDetailsHeader}>
                  <h3 style={styles.careerDetailsTitle}>
                    {selectedCareerSummary.player.name}
                  </h3>

                  <div style={styles.careerDetailsMeta}>
                    FM: {selectedCareerSummary.player.position} ·{" "}
                    {selectedCareerSummary.player.club}
                  </div>
                </div>

                <div style={styles.careerStatsGrid}>
                  <div style={styles.careerStatCard}>
                    <span>Powołania</span>
                    <strong>{selectedCareerSummary.callUps}</strong>
                  </div>

                  <div style={styles.careerStatCard}>
                    <span>Mecze</span>
                    <strong>{selectedCareerSummary.matches}</strong>
                  </div>

                  <div style={styles.careerStatCard}>
                    <span>Minuty</span>
                    <strong>{selectedCareerSummary.minutes}</strong>
                  </div>

                  <div style={styles.careerStatCard}>
                    <span>Gole</span>
                    <strong>{selectedCareerSummary.goals}</strong>
                  </div>

                  <div style={styles.careerStatCard}>
                    <span>Asysty</span>
                    <strong>{selectedCareerSummary.assists}</strong>
                  </div>

                  <div style={styles.careerStatCard}>
                    <span>Śr. ocena</span>
                    <strong style={getRatingStyle(selectedCareerSummary.avgRating)}>
                      {formatAverageRating(selectedCareerSummary.avgRating)}
                    </strong>
                  </div>
                </div>

                <section style={styles.careerSection}>
                  <h4 style={styles.careerSectionTitle}>Zgrupowania</h4>

                  {selectedCareerDetails.camps.length === 0 && (
                    <div style={styles.historyEmpty}>Brak zgrupowań.</div>
                  )}

                  <div style={styles.careerCampList}>
                    {selectedCareerDetails.camps.map((camp) => (
                      <div key={camp.campId} style={styles.careerCampCard}>
                        <strong>{camp.campName}</strong>
                        <span>
                          {getCampTypeLabel(camp.campType)}
                          {camp.dateFrom ? ` · od ${camp.dateFrom}` : ""}
                          {camp.dateTo ? ` · do ${camp.dateTo}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={styles.careerSection}>
                  <h4 style={styles.careerSectionTitle}>Mecze</h4>

                  {selectedCareerDetails.matches.length === 0 && (
                    <div style={styles.historyEmpty}>
                      Zawodnik był powoływany, ale nie ma zapisanych występów.
                    </div>
                  )}

                  <div style={styles.careerMatchList}>
                    {selectedCareerDetails.matches.map((match) => (
                      <div
                        key={`${match.campId}-${match.matchId}`}
                        style={{
                          ...styles.careerMatchCard,
                          ...(match.resultTone === "win"
                            ? styles.careerMatchCardWin
                            : {}),
                          ...(match.resultTone === "draw"
                            ? styles.careerMatchCardDraw
                            : {}),
                          ...(match.resultTone === "loss"
                            ? styles.careerMatchCardLoss
                            : {}),
                        }}
                      >
                        <div style={styles.careerMatchMain}>
                          <strong>vs {match.opponent}</strong>
                          <span>
                            {getMatchTypeLabel(match.matchType)}
                            {match.date ? ` · ${match.date}` : ""} ·{" "}
                            {match.campName}
                          </span>
                        </div>

                        <div style={styles.careerMatchNumbers}>
                          <strong style={getScoreStyleByTone(match.resultTone)}>
                            {match.score}
                          </strong>
                          <span>{match.minutes} min</span>
                          <span>G: {match.goals}</span>
                          <span>A: {match.assists}</span>
                          <span style={getRatingStyle(match.rating)}>
                            Oc: {match.rating || "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}