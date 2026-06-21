import type { CampPlayerSnapshot } from "../../types/camp";
import { styles } from "./CampsDrawer.styles";

type CampPlayersGridProps = {
  players: CampPlayerSnapshot[];
  onRemovePlayer: (playerKey: string) => void;
};

export function CampPlayersGrid({
  players,
  onRemovePlayer,
}: CampPlayersGridProps) {
  return (
    <>
      <h3 style={styles.sectionTitle}>Powołani na to zgrupowanie</h3>

      <div style={styles.playersGrid}>
        {players.map((player) => (
          <div key={player.key} style={styles.playerCard}>
            <strong>{player.name}</strong>

            <span>{player.club}</span>

            <span>
              {player.position} · {player.age} lat
            </span>

            <button
              type="button"
              onClick={() => onRemovePlayer(player.key)}
              style={styles.removePlayerButton}
            >
              Usuń ze zgrupowania
            </button>
          </div>
        ))}
      </div>
    </>
  );
}