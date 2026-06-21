import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { SquadDepthItem } from "../../constants/squadDepth";
import {
  loadLocalStorageValue,
  saveLocalStorageValue,
} from "../../utils/localStorageValue";
import { getPlayerKey } from "../../utils/playerIdentity";
import {
  getSquadDepthStatusLabel,
  getSquadDepthStatusStyle,
  SQUAD_DEPTH_DRAWER_OPEN_STORAGE_KEY,
} from "./SquadDepthDrawer.helpers";
import { squadDepthDrawerStyles as styles } from "./SquadDepthDrawer.styles";

type SquadDepthDrawerProps = {
  selectedPlayersCount: number;
  selectedPlayersWithPositionCount: number;
  selectedPlayersWithoutPositionCount: number;
  rejectedPlayersCount: number;
  squadDepthOpen: boolean;
  setSquadDepthOpen: Dispatch<SetStateAction<boolean>>;
  squadDepthWarnings: string[];
  squadDepthByPosition: SquadDepthItem[];
};

export function SquadDepthDrawer({
  selectedPlayersCount,
  selectedPlayersWithPositionCount,
  selectedPlayersWithoutPositionCount,
  rejectedPlayersCount,
  squadDepthOpen,
  setSquadDepthOpen,
  squadDepthWarnings,
  squadDepthByPosition,
}: SquadDepthDrawerProps) {
  useEffect(() => {
    setSquadDepthOpen(
      loadLocalStorageValue<boolean>(SQUAD_DEPTH_DRAWER_OPEN_STORAGE_KEY, false)
    );
  }, [setSquadDepthOpen]);

  useEffect(() => {
    saveLocalStorageValue(SQUAD_DEPTH_DRAWER_OPEN_STORAGE_KEY, squadDepthOpen);
  }, [squadDepthOpen]);

  if (selectedPlayersCount <= 0) {
    return null;
  }

  return (
    <section
      style={{
        ...styles.drawer,
        ...(squadDepthOpen ? styles.drawerOpen : {}),
      }}
      aria-labelledby="squad-depth-title"
    >
      <button
        type="button"
        onClick={() => setSquadDepthOpen((current) => !current)}
        style={styles.header}
        aria-expanded={squadDepthOpen}
        aria-controls="squad-depth-drawer-body"
      >
        <span style={styles.headerSummary}>
          <strong id="squad-depth-title" style={styles.headerTitle}>
            Głębia kadry
          </strong>

          <span style={styles.headerMeta}>
            Wybrani: <strong>{selectedPlayersCount}</strong>
          </span>

          <span style={styles.headerMeta}>
            Z pozycją: <strong>{selectedPlayersWithPositionCount}</strong>
          </span>

          <span style={styles.headerMeta}>
            Bez pozycji: <strong>{selectedPlayersWithoutPositionCount}</strong>
          </span>

          <span style={styles.headerMeta}>
            Odrzuceni: <strong>{rejectedPlayersCount}</strong>
          </span>
        </span>

        <span style={styles.toggleLabel}>
          {squadDepthOpen ? "Zwiń ▲" : "Rozwiń ▼"}
        </span>
      </button>

      {squadDepthOpen && (
        <div
          id="squad-depth-drawer-body"
          role="region"
          aria-label="Szczegóły głębi kadry"
          style={styles.body}
        >
          {squadDepthWarnings.length > 0 && (
            <div style={styles.warningList} aria-live="polite">
              {squadDepthWarnings.map((warning) => (
                <div key={warning} style={styles.warningItem}>
                  ⚠ {warning}
                </div>
              ))}
            </div>
          )}

          <div style={styles.grid}>
            {squadDepthByPosition.map((item) => {
              const shouldShowEmptyPosition =
                item.count === 0 && item.target?.min;

              if (item.count === 0 && !shouldShowEmptyPosition) {
                return null;
              }

              const statusLabel = getSquadDepthStatusLabel(item.status);

              return (
                <article
                  key={item.position}
                  style={styles.card}
                  aria-label={`${item.position}: ${item.count} zawodników, status ${statusLabel}`}
                >
                  <div style={styles.cardHeader}>
                    <strong style={styles.positionName}>{item.position}</strong>

                    <span
                      style={{
                        ...styles.countBadge,
                        ...getSquadDepthStatusStyle(item.status),
                      }}
                    >
                      {statusLabel} · {item.count}
                      {item.target?.ideal ? ` / ${item.target.ideal}` : ""}
                    </span>
                  </div>

                  <div style={styles.players}>
                    {item.players.length === 0 && (
                      <div style={styles.emptyPlayer}>
                        <span>Brak zawodników</span>
                        <small style={styles.playerMeta}>
                          Ta pozycja wymaga uzupełnienia.
                        </small>
                      </div>
                    )}

                    {item.players.map((player) => (
                      <div key={getPlayerKey(player)} style={styles.player}>
                        <span>{player["Nazwisko"] ?? "-"}</span>

                        <small style={styles.playerMeta}>
                          {player["Klub"] ?? "-"}
                          {player["Wiek"] ? ` · ${player["Wiek"]} lat` : ""}
                        </small>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}