import {
  useEffect,
  useMemo,
  useState,
  type AriaAttributes,
  type CSSProperties,
} from "react";
import type { PlayerMark } from "../../constants/selection";
import { styles } from "../../styles";
import type { SortConfig, TableRow } from "../../types/table";
import { getCellStyle } from "../../utils/cellStyle";
import { getPlayerKey } from "../../utils/playerIdentity";
import { getSortIcon } from "../../utils/sortTable";
import { PlayerSelectionCell } from "./PlayerSelectionCell";
import { PlayerAvailabilityBadge } from "../ui";

type PlayerTableProps = {
  tableHeaders: string[];
  sortedRows: TableRow[];
  sortConfig: SortConfig;
  selectedPlayerKey: string | null;
  playerMarkColumn: string;
  getPlayerMark: (row: TableRow) => PlayerMark | null;
  getPlayerSelectionPosition: (row: TableRow) => string;
  onTogglePlayerMark: (row: TableRow, mark: PlayerMark) => void;
  onSetPlayerSelectionPosition: (row: TableRow, position: string) => void;
  onSort: (column: string) => void;
  onSelectPlayer: (playerKey: string) => void;
  getMarkedCellStyle: (mark: PlayerMark | null) => CSSProperties;
};

const PAGE_SIZE = 250;

function getColumnAriaSort(
  header: string,
  sortConfig: SortConfig
): AriaAttributes["aria-sort"] {
  if (!sortConfig || sortConfig.column !== header) {
    return "none";
  }

  return sortConfig.direction === "asc" ? "ascending" : "descending";
}

export function PlayerTable({
  tableHeaders,
  sortedRows,
  sortConfig,
  selectedPlayerKey,
  playerMarkColumn,
  getPlayerMark,
  getPlayerSelectionPosition,
  onTogglePlayerMark,
  onSetPlayerSelectionPosition,
  onSort,
  onSelectPlayer,
  getMarkedCellStyle,
}: PlayerTableProps) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setPage(0), 0);
    return () => window.clearTimeout(timeoutId);
  }, [sortedRows]);

  const visibleRows = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [safePage, sortedRows]);

  const firstVisible = sortedRows.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const lastVisible = Math.min((safePage + 1) * PAGE_SIZE, sortedRows.length);

  return (
    <section aria-labelledby="players-table-title">
      <h2 id="players-table-title" style={styles.visuallyHidden}>
        Lista piłkarzy
      </h2>

      <div style={styles.tablePagination}>
        <span>
          Wiersze <strong>{firstVisible.toLocaleString("pl-PL")}</strong>–
          <strong>{lastVisible.toLocaleString("pl-PL")}</strong> z {" "}
          <strong>{sortedRows.length.toLocaleString("pl-PL")}</strong>
        </span>

        <div style={styles.tablePaginationActions}>
          <button
            type="button"
            style={styles.tablePaginationButton}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage === 0}
          >
            Poprzednia
          </button>
          <span>
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            style={styles.tablePaginationButton}
            onClick={() =>
              setPage((current) => Math.min(pageCount - 1, current + 1))
            }
            disabled={safePage >= pageCount - 1}
          >
            Następna
          </button>
        </div>
      </div>

      <div style={styles.tableWrapper}>

      <table style={styles.table}>
        <caption style={styles.visuallyHidden}>
          Tabela piłkarzy z możliwością sortowania, oznaczania powołanych,
          odrzucania zawodników i otwierania szczegółów zawodnika.
        </caption>

        <thead>
          <tr>
            <th scope="col" style={styles.indexTh}>
              #
            </th>

            {tableHeaders.map((header) => {
              if (header === playerMarkColumn) {
                return (
                  <th key={header} scope="col" style={styles.markTh}>
                    Wybór
                  </th>
                );
              }

              return (
                <th
                  key={header}
                  scope="col"
                  aria-sort={getColumnAriaSort(header, sortConfig)}
                  style={
                    header === "Nazwisko" ? styles.nameStickyTh : styles.th
                  }
                >
                  <button
                    type="button"
                    onClick={() => onSort(header)}
                    style={styles.sortableHeaderButton}
                    title={`Sortuj po kolumnie ${header}`}
                  >
                    <span>{header}</span>
                    <span aria-hidden="true">{getSortIcon(header, sortConfig)}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {visibleRows.map((row, rowIndex) => {
            const rowPlayerKey = getPlayerKey(row);
            const absoluteRowIndex = safePage * PAGE_SIZE + rowIndex;

            return (
              <tr key={`${rowPlayerKey}-${absoluteRowIndex}`}>
                <td style={styles.indexTd}>{absoluteRowIndex + 1}</td>

                {tableHeaders.map((header) => {
                  const mark = getPlayerMark(row);

                  if (header === playerMarkColumn) {
                    return (
                      <PlayerSelectionCell
                        key={header}
                        row={row}
                        mark={mark}
                        selectionPosition={getPlayerSelectionPosition(row)}
                        onToggleMark={onTogglePlayerMark}
                        onSetSelectionPosition={onSetPlayerSelectionPosition}
                      />
                    );
                  }

                  if (header === "Nazwisko") {
                    const isSelectedPlayer = selectedPlayerKey === rowPlayerKey;
                    const markedStyle = getMarkedCellStyle(mark);

                    return (
                      <td
                        key={header}
                        style={{
                          ...styles.nameStickyTd,
                          ...markedStyle,
                          background: isSelectedPlayer
                            ? "rgba(59, 130, 246, 0.22)"
                            : markedStyle.background ??
                              styles.nameStickyTd.background,
                        }}
                      >
                        <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  }}
>
                          <button
                          type="button"
                          onClick={() => onSelectPlayer(rowPlayerKey)}
                          style={styles.playerNameButton}
                          aria-label={`Otwórz szczegóły zawodnika ${
                            row[header] || "-"
                          }`}
                        >
                          {row[header] || "-"}
                        </button>
                          <PlayerAvailabilityBadge row={row} />
</div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={header}
                      style={{
                        ...styles.td,
                        ...getCellStyle(header, row[header]),
                        ...getMarkedCellStyle(mark),
                      }}
                    >
                      {row[header]}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </section>
  );
}
