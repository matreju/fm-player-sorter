import type { AriaAttributes, CSSProperties } from "react";
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
  return (
    <section style={styles.tableWrapper} aria-labelledby="players-table-title">
      <h2 id="players-table-title" style={styles.visuallyHidden}>
        Lista piłkarzy
      </h2>

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
          {sortedRows.map((row, rowIndex) => {
            const rowPlayerKey = getPlayerKey(row);

            return (
              <tr key={`${rowPlayerKey}-${rowIndex}`}>
                <td style={styles.indexTd}>{rowIndex + 1}</td>

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
    </section>
  );
}