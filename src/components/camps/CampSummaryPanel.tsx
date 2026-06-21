import { styles } from "./CampsDrawer.styles";
import type { CampPlayerSummary } from "../../utils/campStats";
import { formatAverageRating } from "../../utils/campStats";

type CampSummaryPanelProps = {
  matchesCount: number;
  totals: {
    checkedPlayers: number;
    averageMinutesPerCheckedPlayer: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  topMinutes: CampPlayerSummary[];
  topGoals: CampPlayerSummary[];
  topAssists: CampPlayerSummary[];
  topRatings: CampPlayerSummary[];
  playersWithoutAppearance: CampPlayerSummary[];
};

export function CampSummaryPanel({
  matchesCount,
  totals,
  topMinutes,
  topGoals,
  topAssists,
  topRatings,
  playersWithoutAppearance,
}: CampSummaryPanelProps) {
  return (
    <section style={styles.campSummaryPanel}>
      <h3 style={styles.sectionTitle}>Bilans zgrupowania</h3>

      <div style={styles.campSummaryTopGrid}>
        <div style={styles.summaryMiniCard}>
          <span>Mecze</span>
          <strong>{matchesCount}</strong>
        </div>

        <div style={styles.summaryMiniCard}>
          <span>Sprawdzeni piłkarze</span>
          <strong>{totals.checkedPlayers}</strong>
        </div>

        <div style={styles.summaryMiniCard}>
          <span>Śr. minut / sprawdzonego</span>
          <strong>{totals.averageMinutesPerCheckedPlayer}</strong>
        </div>

        <div style={styles.summaryMiniCard}>
          <span>Gole zdobyte</span>
          <strong>{totals.goalsFor}</strong>
        </div>

        <div style={styles.summaryMiniCard}>
          <span>Gole stracone</span>
          <strong>{totals.goalsAgainst}</strong>
        </div>
      </div>

      <div style={styles.campSummaryColumns}>
        <div style={styles.summaryBox}>
          <h4 style={styles.summaryBoxTitle}>Najwięcej minut</h4>

          {topMinutes.length === 0 && (
            <div style={styles.summaryEmpty}>Brak danych.</div>
          )}

          {topMinutes.map((summary, index) => (
            <div key={summary.player.key} style={styles.summaryRow}>
              <span>
                {index + 1}. {summary.player.name}
              </span>
              <strong>{summary.minutes}</strong>
            </div>
          ))}
        </div>

        <div style={styles.summaryBox}>
          <h4 style={styles.summaryBoxTitle}>Najwięcej goli</h4>

          {topGoals.length === 0 && (
            <div style={styles.summaryEmpty}>Brak goli.</div>
          )}

          {topGoals.map((summary, index) => (
            <div key={summary.player.key} style={styles.summaryRow}>
              <span>
                {index + 1}. {summary.player.name}
              </span>
              <strong>{summary.goals}</strong>
            </div>
          ))}
        </div>

        <div style={styles.summaryBox}>
          <h4 style={styles.summaryBoxTitle}>Najwięcej asyst</h4>

          {topAssists.length === 0 && (
            <div style={styles.summaryEmpty}>Brak asyst.</div>
          )}

          {topAssists.map((summary, index) => (
            <div key={summary.player.key} style={styles.summaryRow}>
              <span>
                {index + 1}. {summary.player.name}
              </span>
              <strong>{summary.assists}</strong>
            </div>
          ))}
        </div>

        <div style={styles.summaryBox}>
          <h4 style={styles.summaryBoxTitle}>Najwyższa średnia ocena</h4>

          {topRatings.length === 0 && (
            <div style={styles.summaryEmpty}>Brak ocen.</div>
          )}

          {topRatings.map((summary, index) => (
            <div key={summary.player.key} style={styles.summaryRow}>
              <span>
                {index + 1}. {summary.player.name}
              </span>
              <strong>{formatAverageRating(summary.avgRating)}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.noAppearanceBox}>
        <strong>Bez występu:</strong>

        {playersWithoutAppearance.length === 0 ? (
          <span> wszyscy zagrali co najmniej raz.</span>
        ) : (
          <div style={styles.noAppearanceList}>
            {playersWithoutAppearance.slice(0, 12).map((summary) => (
              <span key={summary.player.key} style={styles.noAppearanceChip}>
                {summary.player.name}
              </span>
            ))}

            {playersWithoutAppearance.length > 12 && (
              <span style={styles.noAppearanceChip}>
                +{playersWithoutAppearance.length - 12}
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}