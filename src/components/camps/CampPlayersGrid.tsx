import type { CSSProperties } from "react";
import type { CampPlayerSnapshot } from "../../types/camp";
import { isCampPlayerActive } from "../../utils/campCore";
import { styles } from "./CampsDrawer.styles";

type CampPlayersGridProps = {
  players: CampPlayerSnapshot[];
  onReleasePlayer: (playerKey: string) => void;
  onRestorePlayer: (playerKey: string) => void;
  onRemovePlayer: (playerKey: string) => void;
};

const sectionHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginTop: 12,
  marginBottom: 10,
};

const countersStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const counterPillStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 9px",
  border: "1px solid #334155",
  borderRadius: 999,
  background: "#0f172a",
  color: "#cbd5e1",
  fontSize: 12,
  fontWeight: 850,
};

const releasedDetailsStyle: CSSProperties = {
  marginTop: 14,
  border: "1px solid #29364d",
  borderRadius: 14,
  background: "#0f172a",
  overflow: "hidden",
};

const releasedSummaryStyle: CSSProperties = {
  padding: "10px 12px",
  cursor: "pointer",
  color: "#cbd5e1",
  fontWeight: 950,
};

const releasedBodyStyle: CSSProperties = {
  padding: 12,
  borderTop: "1px solid #29364d",
};

const statusBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "3px 7px",
  borderRadius: 999,
  border: "1px solid rgba(34, 197, 94, 0.38)",
  background: "rgba(20, 83, 45, 0.16)",
  color: "#bbf7d0",
  fontSize: 11,
  fontWeight: 900,
};

const releasedBadgeStyle: CSSProperties = {
  ...statusBadgeStyle,
  border: "1px solid rgba(251, 191, 36, 0.36)",
  background: "rgba(120, 53, 15, 0.18)",
  color: "#fde68a",
};

const playerCardReleasedStyle: CSSProperties = {
  opacity: 0.78,
  borderColor: "rgba(251, 191, 36, 0.28)",
};

const buttonRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  width: "100%",
  marginTop: 8,
};

const releaseButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 32,
  borderRadius: 10,
  border: "1px solid rgba(251, 191, 36, 0.5)",
  background: "rgba(120, 53, 15, 0.18)",
  color: "#fde68a",
  fontWeight: 900,
  cursor: "pointer",
};

const restoreButtonStyle: CSSProperties = {
  width: "100%",
  minHeight: 32,
  borderRadius: 10,
  border: "1px solid rgba(34, 197, 94, 0.5)",
  background: "rgba(20, 83, 45, 0.22)",
  color: "#bbf7d0",
  fontWeight: 900,
  cursor: "pointer",
};

function PlayerCampCard({
  player,
  released = false,
  onReleasePlayer,
  onRestorePlayer,
  onRemovePlayer,
}: {
  player: CampPlayerSnapshot;
  released?: boolean;
  onReleasePlayer: (playerKey: string) => void;
  onRestorePlayer: (playerKey: string) => void;
  onRemovePlayer: (playerKey: string) => void;
}) {
  return (
    <div
      key={player.key}
      style={{
        ...styles.playerCard,
        ...(released ? playerCardReleasedStyle : {}),
      }}
    >
      <strong>{player.name}</strong>

      <span>{player.club}</span>

      <span>
        {player.position} · {player.age} lat
      </span>

      <span style={released ? releasedBadgeStyle : statusBadgeStyle}>
        {released ? "Odesłany po redukcji" : "Aktywny"}
      </span>

      {released ? (
        <div style={buttonRowStyle}>
          <button
            type="button"
            onClick={() => onRestorePlayer(player.key)}
            style={restoreButtonStyle}
          >
            Przywróć
          </button>

          <button
            type="button"
            onClick={() => onRemovePlayer(player.key)}
            style={styles.removePlayerButton}
          >
            Usuń
          </button>
        </div>
      ) : (
        <div style={buttonRowStyle}>
          <button
            type="button"
            onClick={() => onReleasePlayer(player.key)}
            style={releaseButtonStyle}
          >
            Odeślij
          </button>

          <button
            type="button"
            onClick={() => onRemovePlayer(player.key)}
            style={styles.removePlayerButton}
          >
            Usuń
          </button>
        </div>
      )}
    </div>
  );
}

export function CampPlayersGrid({
  players,
  onReleasePlayer,
  onRestorePlayer,
  onRemovePlayer,
}: CampPlayersGridProps) {
  const activePlayers = players.filter(isCampPlayerActive);
  const releasedPlayers = players.filter((player) => !isCampPlayerActive(player));

  return (
    <>
      <div style={sectionHeaderStyle}>
        <h3 style={styles.sectionTitle}>Kadra zgrupowania</h3>

        <div style={countersStyle}>
          <span style={counterPillStyle}>Aktywni: {activePlayers.length}</span>
          <span style={counterPillStyle}>Odesłani: {releasedPlayers.length}</span>
          <span style={counterPillStyle}>Łącznie: {players.length}</span>
        </div>
      </div>

      <div style={styles.playersGrid}>
        {activePlayers.map((player) => (
          <PlayerCampCard
            key={player.key}
            player={player}
            onReleasePlayer={onReleasePlayer}
            onRestorePlayer={onRestorePlayer}
            onRemovePlayer={onRemovePlayer}
          />
        ))}
      </div>

      {releasedPlayers.length > 0 && (
        <details style={releasedDetailsStyle}>
          <summary style={releasedSummaryStyle}>
            Odesłani / poza finałową kadrą ({releasedPlayers.length})
          </summary>

          <div style={releasedBodyStyle}>
            <div style={styles.playersGrid}>
              {releasedPlayers.map((player) => (
                <PlayerCampCard
                  key={player.key}
                  player={player}
                  released
                  onReleasePlayer={onReleasePlayer}
                  onRestorePlayer={onRestorePlayer}
                  onRemovePlayer={onRemovePlayer}
                />
              ))}
            </div>
          </div>
        </details>
      )}
    </>
  );
}