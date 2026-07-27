import {
  useEffect,
  useMemo,
  useState,
  type AriaAttributes,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { PlayerMark } from "../../constants/selection";
import { styles } from "../../styles";
import type { SortConfig, TableRow } from "../../types/table";
import { getCellStyle } from "../../utils/cellStyle";
import { getPlayerKey } from "../../utils/playerIdentity";
import { getSortIcon } from "../../utils/sortTable";
import { normalizeTextForSearch } from "../../utils/textSearch";
import { PlayerAvailabilityBadge } from "../ui";
import { PlayerSelectionCell } from "./PlayerSelectionCell";
import "./PlayerTable.css";

type PlayerTableProps = {
  tableHeaders: string[];
  availableHeaders: string[];
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

type ColumnGroup = {
  id: string;
  label: string;
  columns: string[];
};

const PAGE_SIZE = 100;
const COLUMN_STORAGE_KEY = "fm-player-sorter.table-columns.v3";
const WIDTH_STORAGE_KEY = "fm-player-sorter.table-widths.v2";
const LOCKED_COLUMNS = new Set(["Nazwisko"]);

const ATTRIBUTE_COLUMNS = new Set([
  "Dośrodkowania",
  "Drybling",
  "Wykańczanie akcji",
  "Gra głową",
  "Strzały z dystansu",
  "Krycie",
  "Gra bez piłki",
  "Podania",
  "Rzuty karne",
  "Odbiór piłki",
  "Przegląd sytuacji",
  "Chwytanie",
  "Zasięg wyskoku",
  "Gra na przedpolu",
  "Komunikacja",
  "Wykopy",
  "Wyrzuty",
  "Przewidywanie",
  "Decyzje",
  "Jeden na jednego",
  "Ustawianie się",
  "Refleks",
  "Przyjęcie piłki",
  "Technika",
  "Błyskotliwość",
  "Rzuty rożne",
  "Współpraca",
  "Pracowitość",
  "Długie wrzuty",
  "Ekscentryczność",
  "Wychodzenie poza pole karne",
  "Piąstkowanie",
  "Przyspieszenie",
  "Rzuty wolne",
  "Siła",
  "Wytrzymałość",
  "Szybkość",
  "Skoczność",
  "Przywództwo",
  "Równowaga",
  "Waleczność",
  "Agresja",
  "Zwinność",
  "Sprawność",
  "Determinacja",
  "Opanowanie",
  "Koncentracja",
]);

const HIDDEN_COLUMNS = new Set([
  "Brudna gra",
  "Regularność",
  "Ważne mecze",
  "Podatność na kontuzje",
  "Wszechstronność",
]);

const PERSONALITY_COLUMNS = new Set([
  "Adaptacja",
  "Ambicja",
  "Lojalność",
  "Radzenie sobie z presją",
  "Profesjonalizm",
  "Fair play",
  "Temperament",
  "Kontrowersyjność",
]);

const CALCULATED_COLUMNS = new Set([
  "Wybór",
  "Dopasowanie",
  "Forma klubu",
  "Moneyball",
  "Typ kandydata",
  "Zakres oceny roli",
  "Pewność oceny roli",
  "Najlepsza rola",
  "Faza roli",
  "Strona roli",
  "Dopasowanie strony",
  "Profil strony",
  "Najlepsza pozycja",
  "Najlepsza rola ogólnie",
  "Ocena ogólna",
]);

const GENERAL_COLUMNS = new Set([
  "Nazwisko",
  "Imię",
  "Nazwisko rodowe",
  "Płeć",
  "Data urodzenia",
  "Wiek",
  "Narodowość",
  "Klub",
  "Klub macierzysty",
  "Liga",
  "Zespół",
  "Pozycja",
  "CA",
  "PA",
  "Reputacja w ojczyźnie",
  "Reputacja",
  "Reputacja na świecie",
  "Reputacja klubu",
  "Kondycja",
  "Morale",
  "Wzrost",
  "Lewa noga",
  "Prawa noga",
  "Wartość",
  "Cena wywoławcza",
  "Pensja",
  "Koniec kontraktu",
  "Numer w składzie",
  "Na liście transferowej",
  "Nie na sprzedaż",
  "Do zwolnienia",
]);

function getColumnGroups(headers: string[]): ColumnGroup[] {
  const groups: ColumnGroup[] = [
    { id: "general", label: "Ogólne", columns: [] },
    { id: "calculated", label: "Analiza aplikacji", columns: [] },
    { id: "moneyball", label: "Moneyball / statystyki", columns: [] },
    { id: "positions", label: "Pozycje", columns: [] },
    { id: "attributes", label: "Atrybuty", columns: [] },
    { id: "hidden", label: "Ukryte", columns: [] },
    { id: "personality", label: "Osobowość", columns: [] },
    { id: "other", label: "Pozostałe", columns: [] },
  ];

  for (const header of headers) {
    if (GENERAL_COLUMNS.has(header)) groups[0].columns.push(header);
    else if (CALCULATED_COLUMNS.has(header)) groups[1].columns.push(header);
    else if (header.startsWith("Pozycja:")) groups[3].columns.push(header);
    else if (ATTRIBUTE_COLUMNS.has(header)) groups[4].columns.push(header);
    else if (HIDDEN_COLUMNS.has(header)) groups[5].columns.push(header);
    else if (PERSONALITY_COLUMNS.has(header)) groups[6].columns.push(header);
    else if (header !== "UID" && !header.includes("noga (wartość)")) {
      groups[2].columns.push(header);
    }
  }

  return groups.filter((group) => group.columns.length > 0);
}

function readStoredStringArray(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function readStoredWidths(): Record<string, number> {
  try {
    const value = JSON.parse(localStorage.getItem(WIDTH_STORAGE_KEY) ?? "{}");
    return value && typeof value === "object"
      ? (value as Record<string, number>)
      : {};
  } catch {
    return {};
  }
}

function getDefaultColumnWidth(header: string): number {
  if (header === "Nazwisko") return 190;
  if (header === "Pozycja" || header === "Klub" || header === "Liga") return 150;
  if (header === "Wybór") return 170;
  if (header.length >= 22) return 160;
  if (header.length >= 14) return 130;
  return 94;
}

function getColumnAriaSort(
  header: string,
  sortConfig: SortConfig,
): AriaAttributes["aria-sort"] {
  if (!sortConfig || sortConfig.column !== header) return "none";
  return sortConfig.direction === "asc" ? "ascending" : "descending";
}

export function PlayerTable({
  tableHeaders,
  availableHeaders,
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
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState("");
  const [customColumns, setCustomColumns] = useState<string[]>(() =>
    readStoredStringArray(COLUMN_STORAGE_KEY),
  );
  const [columnWidths, setColumnWidths] =
    useState<Record<string, number>>(readStoredWidths);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const allowedHeaders = useMemo(
    () => new Set(availableHeaders),
    [availableHeaders],
  );
  const effectiveHeaders = useMemo(() => {
    const saved = customColumns.filter((header) => allowedHeaders.has(header));
    const required = tableHeaders.filter(
      (header) => LOCKED_COLUMNS.has(header) && !saved.includes(header),
    );
    return saved.length > 0 ? [...required, ...saved] : tableHeaders;
  }, [allowedHeaders, customColumns, tableHeaders]);

  const columnGroups = useMemo(
    () => getColumnGroups(availableHeaders),
    [availableHeaders],
  );
  const selectedColumnSet = useMemo(
    () => new Set(effectiveHeaders),
    [effectiveHeaders],
  );
  const normalizedColumnSearch = normalizeTextForSearch(columnSearch);
  const visibleColumnGroups = useMemo(
    () =>
      columnGroups
        .map((group) => ({
          ...group,
          columns: group.columns.filter(
            (column) =>
              !normalizedColumnSearch ||
              normalizeTextForSearch(column).includes(normalizedColumnSearch),
          ),
        }))
        .filter((group) => group.columns.length > 0),
    [columnGroups, normalizedColumnSearch],
  );

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setPage(0), 0);
    return () => window.clearTimeout(timeoutId);
  }, [sortedRows]);

  useEffect(() => {
    if (customColumns.length > 0) {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(customColumns));
    }
  }, [customColumns]);

  useEffect(() => {
    localStorage.setItem(WIDTH_STORAGE_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  const visibleRows = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [safePage, sortedRows]);

  const firstVisible = sortedRows.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const lastVisible = Math.min((safePage + 1) * PAGE_SIZE, sortedRows.length);
  const tableWidth =
    48 +
    effectiveHeaders.reduce(
      (total, header) =>
        total + (columnWidths[header] ?? getDefaultColumnWidth(header)),
      0,
    );

  function updateColumns(nextColumns: string[]) {
    const unique = Array.from(new Set(nextColumns)).filter((header) =>
      allowedHeaders.has(header),
    );
    const withRequired = availableHeaders.filter(
      (header) => LOCKED_COLUMNS.has(header) && !unique.includes(header),
    );
    setCustomColumns([...withRequired, ...unique]);
  }

  function toggleColumn(header: string) {
    if (LOCKED_COLUMNS.has(header)) return;
    if (selectedColumnSet.has(header)) {
      updateColumns(effectiveHeaders.filter((column) => column !== header));
      return;
    }
    updateColumns([...effectiveHeaders, header]);
  }

  function resetColumns() {
    setCustomColumns([]);
    localStorage.removeItem(COLUMN_STORAGE_KEY);
  }

  function moveColumn(header: string, direction: -1 | 1) {
    const index = effectiveHeaders.indexOf(header);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= effectiveHeaders.length) return;
    const next = [...effectiveHeaders];
    [next[index], next[target]] = [next[target], next[index]];
    updateColumns(next);
  }

  function dropColumn(target: string) {
    if (!draggedColumn || draggedColumn === target) return;
    const next = effectiveHeaders.filter((column) => column !== draggedColumn);
    const targetIndex = next.indexOf(target);
    next.splice(Math.max(0, targetIndex), 0, draggedColumn);
    updateColumns(next);
    setDraggedColumn(null);
  }

  function startColumnResize(
    event: ReactPointerEvent<HTMLSpanElement>,
    header: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth =
      columnWidths[header] ?? getDefaultColumnWidth(header);

    const move = (pointerEvent: PointerEvent) => {
      const width = Math.max(70, Math.min(420, startWidth + pointerEvent.clientX - startX));
      setColumnWidths((current) => ({ ...current, [header]: width }));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  return (
    <section className="player-table-shell" aria-labelledby="players-table-title">
      <h2 id="players-table-title" style={styles.visuallyHidden}>
        Lista piłkarzy
      </h2>

      <div className="player-table-toolbar">
        <span>
          <strong>{firstVisible.toLocaleString("pl-PL")}</strong>–
          <strong>{lastVisible.toLocaleString("pl-PL")}</strong> z{" "}
          <strong>{sortedRows.length.toLocaleString("pl-PL")}</strong>
        </span>

        <div className="player-table-toolbar__actions">
          <button
            type="button"
            onClick={() => setColumnManagerOpen((current) => !current)}
            aria-expanded={columnManagerOpen}
          >
            Kolumny ({effectiveHeaders.length})
          </button>
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={safePage === 0}
            aria-label="Poprzednia strona"
          >
            ‹
          </button>
          <span>
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.min(pageCount - 1, current + 1))
            }
            disabled={safePage >= pageCount - 1}
            aria-label="Następna strona"
          >
            ›
          </button>
        </div>
      </div>

      {columnManagerOpen && (
        <section className="player-column-manager" aria-label="Ustawienia kolumn">
          <header>
            <div>
              <strong>Kolumny tabeli</strong>
              <span>
                Zaznacz pola, zmień kolejność i dopasuj szerokość bezpośrednio
                w nagłówku.
              </span>
            </div>
            <button type="button" onClick={() => setColumnManagerOpen(false)}>
              ×
            </button>
          </header>

          <div className="player-column-manager__controls">
            <input
              type="search"
              value={columnSearch}
              onChange={(event) => setColumnSearch(event.target.value)}
              placeholder="Szukaj kolumny…"
            />
            <button type="button" onClick={resetColumns}>
              Układ domyślny
            </button>
          </div>

          <div className="player-column-manager__selected">
            {effectiveHeaders.map((header) => (
              <span
                key={header}
                draggable={!LOCKED_COLUMNS.has(header)}
                onDragStart={() => setDraggedColumn(header)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropColumn(header)}
              >
                <button
                  type="button"
                  onClick={() => moveColumn(header, -1)}
                  aria-label={`Przesuń ${header} w lewo`}
                >
                  ‹
                </button>
                {header}
                <button
                  type="button"
                  onClick={() => moveColumn(header, 1)}
                  aria-label={`Przesuń ${header} w prawo`}
                >
                  ›
                </button>
              </span>
            ))}
          </div>

          <div className="player-column-manager__groups">
            {visibleColumnGroups.map((group) => (
              <fieldset key={group.id}>
                <legend>{group.label}</legend>
                {group.columns.map((header) => (
                  <label key={header}>
                    <input
                      type="checkbox"
                      checked={selectedColumnSet.has(header)}
                      disabled={LOCKED_COLUMNS.has(header)}
                      onChange={() => toggleColumn(header)}
                    />
                    <span>{header}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </section>
      )}

      <div style={styles.tableWrapper}>
        <table
          style={{
            ...styles.table,
            width: Math.max(tableWidth, 980),
            tableLayout: "fixed",
          }}
        >
          <caption style={styles.visuallyHidden}>
            Interaktywna tabela kandydatów do prowadzonej reprezentacji.
          </caption>

          <thead>
            <tr>
              <th scope="col" style={{ ...styles.indexTh, width: 48 }}>
                #
              </th>

              {effectiveHeaders.map((header) => {
                const width =
                  columnWidths[header] ?? getDefaultColumnWidth(header);
                if (header === playerMarkColumn) {
                  return (
                    <th
                      key={header}
                      scope="col"
                      style={{ ...styles.markTh, width }}
                    >
                      Wybór
                      <span
                        className="player-table-resizer"
                        onPointerDown={(event) =>
                          startColumnResize(event, header)
                        }
                      />
                    </th>
                  );
                }

                return (
                  <th
                    key={header}
                    scope="col"
                    aria-sort={getColumnAriaSort(header, sortConfig)}
                    style={{
                      ...(header === "Nazwisko"
                        ? styles.nameStickyTh
                        : styles.th),
                      width,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(header)}
                      style={styles.sortableHeaderButton}
                      title={`Sortuj po kolumnie ${header}`}
                    >
                      <span>{header}</span>
                      <span aria-hidden="true">
                        {getSortIcon(header, sortConfig)}
                      </span>
                    </button>
                    <span
                      className="player-table-resizer"
                      onPointerDown={(event) =>
                        startColumnResize(event, header)
                      }
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row, rowIndex) => {
              const rowPlayerKey = getPlayerKey(row);
              const absoluteRowIndex = safePage * PAGE_SIZE + rowIndex;
              const isSelectedPlayer = selectedPlayerKey === rowPlayerKey;

              return (
                <tr
                  key={`${rowPlayerKey}-${absoluteRowIndex}`}
                  data-selected={isSelectedPlayer || undefined}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("button, input, select, label")) return;
                    onSelectPlayer(rowPlayerKey);
                  }}
                >
                  <td style={styles.indexTd}>{absoluteRowIndex + 1}</td>

                  {effectiveHeaders.map((header) => {
                    const mark = getPlayerMark(row);
                    const width =
                      columnWidths[header] ?? getDefaultColumnWidth(header);

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
                      const markedStyle = getMarkedCellStyle(mark);
                      return (
                        <td
                          key={header}
                          style={{
                            ...styles.nameStickyTd,
                            ...markedStyle,
                            width,
                            background: isSelectedPlayer
                              ? "rgba(232, 73, 211, 0.16)"
                              : markedStyle.background ??
                                styles.nameStickyTd.background,
                          }}
                        >
                          <div className="player-table-name">
                            <button
                              type="button"
                              onClick={() => onSelectPlayer(rowPlayerKey)}
                              style={styles.playerNameButton}
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
                          width,
                        }}
                        title={row[header] || undefined}
                      >
                        {row[header] || "–"}
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
