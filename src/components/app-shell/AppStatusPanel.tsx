import { styles } from "../../styles";
import type { SortConfig } from "../../types/table";

type AppStatusPanelProps = {
  fileName: string;
  shownPlayersCount: number;
  totalPlayersCount: number;
  visibleColumnsCount: number;
  totalColumnsCount: number;
  sortConfig: SortConfig;
  error: string;
};

export function AppStatusPanel({
  fileName,
  shownPlayersCount,
  totalPlayersCount,
  visibleColumnsCount,
  totalColumnsCount,
  sortConfig,
  error,
}: AppStatusPanelProps) {
  const hasRows = totalPlayersCount > 0;

  return (
    <section style={styles.appStatusPanel} aria-labelledby="app-status-title">
      <h2 id="app-status-title" style={styles.visuallyHidden}>
        Status danych
      </h2>

      <div style={styles.stats} aria-live="polite">
        <span>
          Plik: <strong>{fileName || "brak"}</strong>
        </span>

        <span>
          Pokazani piłkarze: <strong>{shownPlayersCount}</strong> /{" "}
          {totalPlayersCount}
        </span>

        <span>
          Kolumny widoczne: <strong>{visibleColumnsCount}</strong> /{" "}
          {totalColumnsCount}
        </span>
      </div>

      {sortConfig && (
        <p style={styles.sortInfo}>
          Sortowanie: <strong>{sortConfig.column}</strong>{" "}
          {sortConfig.direction === "desc"
            ? "od największego do najmniejszego"
            : "od najmniejszego do największego"}
        </p>
      )}

      {error && (
        <p style={styles.error} role="alert">
          {error}
        </p>
      )}

      {!hasRows && !error && (
        <div style={styles.emptyDataState} role="status">
          <strong>Brak wczytanych piłkarzy.</strong>
          <span>
            Wczytaj plik HTML albo CSV z FM-a, żeby rozpocząć analizę.
          </span>
        </div>
      )}
    </section>
  );
}