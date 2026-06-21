import type {
  Camp,
  CampMatch,
  CampMatchAppearance,
  CampMatchType,
} from "../../types/camp";
import { MATCH_TYPES, getMatchTypeLabel } from "../../utils/campCore";
import {
  formatMatchScore,
  getAppearanceForPlayer,
  getMatchAppearancesSummary,
  getMatchResultTone,
} from "../../utils/campStats";
import { styles } from "./CampsDrawer.styles";

type CampMatchesPanelProps = {
  camp: Camp;
  activeMatch: CampMatch | null;

  matchOpponent: string;
  matchDate: string;
  matchType: CampMatchType;
  teamGoals: string;
  opponentGoals: string;

  onMatchOpponentChange: (value: string) => void;
  onMatchDateChange: (value: string) => void;
  onMatchTypeChange: (value: CampMatchType) => void;
  onTeamGoalsChange: (value: string) => void;
  onOpponentGoalsChange: (value: string) => void;

  onCreateMatch: () => void;
  onSelectMatch: (matchId: string) => void;
  onDeleteMatch: (campId: string, matchId: string) => void;
  onUpdateAppearance: (
    campId: string,
    matchId: string,
    playerKey: string,
    patch: Partial<CampMatchAppearance>
  ) => void;
};

export function CampMatchesPanel({
  camp,
  activeMatch,
  matchOpponent,
  matchDate,
  matchType,
  teamGoals,
  opponentGoals,
  onMatchOpponentChange,
  onMatchDateChange,
  onMatchTypeChange,
  onTeamGoalsChange,
  onOpponentGoalsChange,
  onCreateMatch,
  onSelectMatch,
  onDeleteMatch,
  onUpdateAppearance,
}: CampMatchesPanelProps) {
  return (
    <section style={styles.matchPanel}>
      <div style={styles.matchHeader}>
        <h3 style={styles.sectionTitle}>Mecze</h3>

        <div style={styles.matchCounter}>{camp.matches.length} zapisanych</div>
      </div>

      <div style={styles.matchFormGrid}>
        <label style={styles.field}>
          Rywal
          <input
            value={matchOpponent}
            onChange={(event) => onMatchOpponentChange(event.target.value)}
            style={styles.input}
            placeholder="np. Niemcy"
          />
        </label>

        <label style={styles.field}>
          Data
          <input
            type="date"
            value={matchDate}
            onChange={(event) => onMatchDateChange(event.target.value)}
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          Typ meczu
          <select
            value={matchType}
            onChange={(event) =>
              onMatchTypeChange(event.target.value as CampMatchType)
            }
            style={styles.input}
          >
            {MATCH_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.field}>
          Bramki naszej drużyny
          <input
            type="number"
            min="0"
            value={teamGoals}
            onChange={(event) => onTeamGoalsChange(event.target.value)}
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          Bramki rywala
          <input
            type="number"
            min="0"
            value={opponentGoals}
            onChange={(event) => onOpponentGoalsChange(event.target.value)}
            style={styles.input}
          />
        </label>

        <button type="button" onClick={onCreateMatch} style={styles.primaryButton}>
          Dodaj mecz
        </button>
      </div>

      {camp.matches.length === 0 && (
        <div style={styles.empty}>Brak zapisanych meczów.</div>
      )}

      {camp.matches.length > 0 && (
        <div style={styles.matchList}>
          {camp.matches.map((match) => {
            const resultTone = getMatchResultTone(match);
            const isActiveMatch = activeMatch?.id === match.id;

            return (
              <div
                key={match.id}
                onClick={() => onSelectMatch(match.id)}
                style={{
                  ...styles.matchCard,
                  ...(resultTone === "win" ? styles.matchCardWin : {}),
                  ...(resultTone === "draw" ? styles.matchCardDraw : {}),
                  ...(resultTone === "loss" ? styles.matchCardLoss : {}),
                  ...(isActiveMatch ? styles.matchCardActive : {}),
                }}
              >
                <div>
                  <strong style={styles.matchTitle}>
                    Nasza drużyna — {match.opponent}
                  </strong>

                  <div style={styles.matchMeta}>
                    {getMatchTypeLabel(match.type)}
                    {match.date ? ` · ${match.date}` : ""}
                  </div>
                </div>

                <strong style={styles.matchScore}>
                  {formatMatchScore(match)}
                </strong>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteMatch(camp.id, match.id);
                  }}
                  style={styles.smallDangerButton}
                >
                  Usuń mecz
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeMatch && (
        <section style={styles.appearancesPanel}>
          <div style={styles.appearancesHeader}>
            <div>
              <h3 style={styles.appearancesTitle}>
                Występy: nasza drużyna — {activeMatch.opponent}
              </h3>

              <div style={styles.appearancesMeta}>
                {getMatchTypeLabel(activeMatch.type)}
                {activeMatch.date ? ` · ${activeMatch.date}` : ""} · wynik:{" "}
                {formatMatchScore(activeMatch)}
              </div>
            </div>

            <div style={styles.appearancesSummary}>
              {(() => {
                const summary = getMatchAppearancesSummary(activeMatch);

                return (
                  <>
                    Zagrało: <strong>{summary.played}</strong> · Gole:{" "}
                    <strong>{summary.goals}</strong> · Asysty:{" "}
                    <strong>{summary.assists}</strong>
                  </>
                );
              })()}
            </div>
          </div>

          <div style={styles.appearancesTable}>
            <div
              style={{
                ...styles.appearanceRow,
                ...styles.appearanceHeadRow,
              }}
            >
              <div>Zawodnik</div>
              <div>Grał</div>
              <div>Minuty</div>
              <div>Gole</div>
              <div>Asysty</div>
              <div>Ocena</div>
            </div>

            {camp.players.map((player) => {
              const appearance = getAppearanceForPlayer(activeMatch, player.key);
              const isDisabled = !appearance.played;

              return (
                <div key={player.key} style={styles.appearanceRow}>
                  <div style={styles.appearancePlayerCell}>
                    <strong>{player.name}</strong>
                    <span>
                      {player.position} · {player.club}
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={appearance.played}
                    onChange={(event) => {
                      const played = event.target.checked;

                      onUpdateAppearance(camp.id, activeMatch.id, player.key, {
                        played,
                        minutes: played ? appearance.minutes : "",
                        goals: played ? appearance.goals : "",
                        assists: played ? appearance.assists : "",
                        rating: played ? appearance.rating : "",
                      });
                    }}
                    style={styles.appearanceCheckbox}
                  />

                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={appearance.minutes}
                    disabled={isDisabled}
                    onChange={(event) =>
                      onUpdateAppearance(camp.id, activeMatch.id, player.key, {
                        minutes: event.target.value,
                        played: true,
                      })
                    }
                    style={{
                      ...styles.appearanceInput,
                      ...(isDisabled ? styles.appearanceInputDisabled : {}),
                    }}
                  />

                  <input
                    type="number"
                    min="0"
                    value={appearance.goals}
                    disabled={isDisabled}
                    onChange={(event) =>
                      onUpdateAppearance(camp.id, activeMatch.id, player.key, {
                        goals: event.target.value,
                        played: true,
                      })
                    }
                    style={{
                      ...styles.appearanceInput,
                      ...(isDisabled ? styles.appearanceInputDisabled : {}),
                    }}
                  />

                  <input
                    type="number"
                    min="0"
                    value={appearance.assists}
                    disabled={isDisabled}
                    onChange={(event) =>
                      onUpdateAppearance(camp.id, activeMatch.id, player.key, {
                        assists: event.target.value,
                        played: true,
                      })
                    }
                    style={{
                      ...styles.appearanceInput,
                      ...(isDisabled ? styles.appearanceInputDisabled : {}),
                    }}
                  />

                  <input
                    type="text"
                    value={appearance.rating}
                    disabled={isDisabled}
                    onChange={(event) =>
                      onUpdateAppearance(camp.id, activeMatch.id, player.key, {
                        rating: event.target.value,
                        played: true,
                      })
                    }
                    placeholder="np. 7.2"
                    style={{
                      ...styles.appearanceInput,
                      ...(isDisabled ? styles.appearanceInputDisabled : {}),
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}