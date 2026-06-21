import type { CSSProperties } from "react";
import {
  formatAverageRating,
  formatCallUpPositionCounts,
  type CareerPlayerSummary,
} from "../../utils/campStats";
import { styles } from "./CampsDrawer.styles";

export type CampaignPlayerFilter =
  | "all"
  | "played"
  | "without-minutes"
  | "min-180"
  | "scored"
  | "assisted";

export type CampaignPlayerSort =
  | "minutes"
  | "matches"
  | "callUps"
  | "goals"
  | "assists"
  | "rating"
  | "name";

export type SortDirection = "asc" | "desc";

type CampaignPlayersPanelProps = {
  campaignPlayerSearch: string;
  campaignPlayerFilter: CampaignPlayerFilter;
  campaignPlayerSort: CampaignPlayerSort;
  campaignPlayerSortDirection: SortDirection;
  activeCampaignPlayersCount: number;
  filteredCampaignPlayers: CareerPlayerSummary[];
  onCampaignPlayerSearchChange: (value: string) => void;
  onCampaignPlayerFilterChange: (value: CampaignPlayerFilter) => void;
  onCampaignPlayerSortSelect: (value: CampaignPlayerSort) => void;
  onToggleCampaignPlayerSort: (value: CampaignPlayerSort) => void;
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


export function CampaignPlayersPanel({
  campaignPlayerSearch,
  campaignPlayerFilter,
  campaignPlayerSort,
  campaignPlayerSortDirection,
  activeCampaignPlayersCount,
  filteredCampaignPlayers,
  onCampaignPlayerSearchChange,
  onCampaignPlayerFilterChange,
  onCampaignPlayerSortSelect,
  onToggleCampaignPlayerSort,
}: CampaignPlayersPanelProps) {
  function getSortIndicator(sort: CampaignPlayerSort) {
    if (campaignPlayerSort !== sort) return "";

    return campaignPlayerSortDirection === "asc" ? " ↑" : " ↓";
  }

  function renderSortHeader(label: string, sort: CampaignPlayerSort) {
    return (
      <button
        type="button"
        onClick={() => onToggleCampaignPlayerSort(sort)}
        style={styles.sortHeaderButton}
      >
        {label}
        {getSortIndicator(sort)}
      </button>
    );
  }

  return (
    <section style={styles.campaignSection}>
      <h3 style={styles.sectionTitle}>Zawodnicy w kampanii</h3>

      <div style={styles.campaignPlayersToolbar}>
        <input
          value={campaignPlayerSearch}
          onChange={(event) =>
            onCampaignPlayerSearchChange(event.target.value)
          }
          placeholder="Szukaj zawodnika, klubu, pozycji..."
          style={styles.input}
        />

        <select
          value={campaignPlayerFilter}
          onChange={(event) =>
            onCampaignPlayerFilterChange(
              event.target.value as CampaignPlayerFilter
            )
          }
          style={styles.input}
        >
          <option value="all">Wszyscy</option>
          <option value="played">Tylko z minutami</option>
          <option value="without-minutes">Bez minut</option>
          <option value="min-180">Minimum 180 minut</option>
          <option value="scored">Z golem</option>
          <option value="assisted">Z asystą</option>
        </select>

        <select
          value={campaignPlayerSort}
          onChange={(event) =>
            onCampaignPlayerSortSelect(
              event.target.value as CampaignPlayerSort
            )
          }
          style={styles.input}
        >
          <option value="minutes">Sortuj: minuty</option>
          <option value="matches">Sortuj: mecze</option>
          <option value="callUps">Sortuj: powołania</option>
          <option value="goals">Sortuj: gole</option>
          <option value="assists">Sortuj: asysty</option>
          <option value="rating">Sortuj: średnia ocena</option>
          <option value="name">Sortuj: nazwisko</option>
        </select>

        <div style={styles.campaignPlayersCounter}>
          Pokazano: <strong>{filteredCampaignPlayers.length}</strong> /{" "}
          {activeCampaignPlayersCount}
        </div>
      </div>

      <div style={styles.campaignTable}>
        <div
          style={{
            ...styles.campaignPlayerRow,
            ...styles.campaignTableHead,
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

        {filteredCampaignPlayers.length === 0 && (
          <div style={styles.empty}>
            Brak zawodników pasujących do filtrów.
          </div>
        )}

        {filteredCampaignPlayers.map((summary) => (
          <div key={summary.player.key} style={styles.campaignPlayerRow}>
            <div style={styles.campaignTableNameCell}>
              <strong>{summary.player.name}</strong>

<div style={styles.campaignTableNameCell}>
  <strong>{summary.player.name}</strong>

  <span style={styles.callUpPositionLine}>
    Powołany jako: {formatCallUpPositionCounts(summary.callUpPositionCounts)}
  </span>

  <span>
    FM: {summary.player.position} · {summary.player.club}
  </span>
</div>

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
          </div>
        ))}
      </div>
    </section>
  );
}