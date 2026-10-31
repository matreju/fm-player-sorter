import { formatPlayerFinance, FINANCE_NOTE } from "../../utils/playerFinance";
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
  columnStorageKey?: string;
  pageSize?: number;
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
const COLUMN_STORAGE_KEY = "fm-player-sorter.table-columns.v5";
const WIDTH_STORAGE_KEY = "fm-player-sorter.table-widths.v3";
const REQUIRED_COLUMNS = new Set<string>(["Wybór", "Nazwisko"]);

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
  "Ocena selekcyjna",
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
  "OU",
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

const RESULT_COLUMNS = new Set([
  "Występy",
  "Z ławki",
  "Minuty",
  "Śr. ocena",
  "Gracz meczu",
  "Gole",
  "Asysty",
  "Żółte kartki",
  "Czerwone kartki",
]);

const ATTACK_COLUMNS = new Set([
  "xG",
  "npxG",
  "Strzały",
  "Celne strzały",
  "Strzały spoza pola karnego",
  "Gole spoza pola karnego",
  "Strzały z rzutów wolnych",
  "Rzuty karne (próby)",
  "Wykorzystane rzuty karne",
  "Spalone",
]);

const CREATION_COLUMNS = new Set([
  "xA",
  "Podania (próby)",
  "Celne podania",
  "Podania progresywne",
  "Kluczowe podania",
  "Kluczowe podania z gry",
  "Stworzone klarowne sytuacje",
  "Dośrodkowania (próby)",
  "Celne dośrodkowania",
  "Dośrodkowania z gry",
  "Celne dośrodkowania z gry",
  "Dryblingi",
]);

const DEFENCE_COLUMNS = new Set([
  "Pojedynki główkowe",
  "Wygrane główki",
  "Kluczowe główki",
  "Próby odbiorów",
  "Udane odbiory",
  "Kluczowe odbiory",
  "Przechwyty",
  "Odzyskane piłki",
  "Stracone piłki",
  "Próby pressingu",
  "Udany pressing",
  "Bloki",
  "Zablokowane strzały",
  "Wybicia",
  "Faule",
  "Faule na zawodniku",
  "Błędy prowadzące do gola",
]);

const PHYSICAL_STATS_COLUMNS = new Set([
  "Dystans (km)",
  "Sprinty o wysokiej intensywności",
]);

const GOALKEEPER_STATS_COLUMNS = new Set([
  "Czyste konta",
  "Stracone gole",
  "Złapane strzały",
  "Sparowane strzały",
  "Strzały przeniesione",
  "Celne strzały przeciwko",
  "xG uniknięte",
]);

function isPer90OrPercentageColumn(header: string): boolean {
  return (
    header.includes("/90") ||
    header.endsWith(" (%)") ||
    header === "xG/strzał"
  );
}

function getColumnGroups(headers: string[]): ColumnGroup[] {
  const groups: ColumnGroup[] = [
    { id: "general", label: "Ogólne", columns: [] },
    { id: "calculated", label: "Analiza aplikacji", columns: [] },
    { id: "results", label: "Wyniki i występy", columns: [] },
    { id: "attack", label: "Atak", columns: [] },
    { id: "creation", label: "Kreacja i podania", columns: [] },
    { id: "defence", label: "Obrona", columns: [] },
    { id: "physical-stats", label: "Dane fizyczne", columns: [] },
    { id: "goalkeeper-stats", label: "Bramkarz", columns: [] },
    { id: "moneyball", label: "Moneyball / na 90", columns: [] },
    { id: "positions", label: "Pozycje", columns: [] },
    { id: "attributes", label: "Atrybuty", columns: [] },
    { id: "hidden", label: "Ukryte", columns: [] },
    { id: "personality", label: "Osobowość", columns: [] },
    { id: "other", label: "Pozostałe", columns: [] },
  ];

  for (const header of headers) {
    if (GENERAL_COLUMNS.has(header)) groups[0].columns.push(header);
    else if (CALCULATED_COLUMNS.has(header)) groups[1].columns.push(header);
    else if (RESULT_COLUMNS.has(header)) groups[2].columns.push(header);
    else if (ATTACK_COLUMNS.has(header)) groups[3].columns.push(header);
    else if (CREATION_COLUMNS.has(header)) groups[4].columns.push(header);
    else if (DEFENCE_COLUMNS.has(header)) groups[5].columns.push(header);
    else if (PHYSICAL_STATS_COLUMNS.has(header)) groups[6].columns.push(header);
    else if (GOALKEEPER_STATS_COLUMNS.has(header)) groups[7].columns.push(header);
    else if (isPer90OrPercentageColumn(header)) groups[8].columns.push(header);
    else if (header.startsWith("Pozycja:")) groups[9].columns.push(header);
    else if (ATTRIBUTE_COLUMNS.has(header)) groups[10].columns.push(header);
    else if (HIDDEN_COLUMNS.has(header)) groups[11].columns.push(header);
    else if (PERSONALITY_COLUMNS.has(header)) groups[12].columns.push(header);
    else if (header !== "UID" && !header.includes("noga (wartość)")) {
      groups[13].columns.push(header);
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

function columnLabel(header: string): string {
  const labels: Record<string,string> = {Nazwisko:"Imię i nazwisko",PA:"Potencjał","Numer w składzie":"Numer",Pensja:"Płaca (€/rok)",Wartość:"Wartość (€)","Cena wywoławcza":"Cena wywoławcza (€)"};
  return labels[header] ?? header;
}
function displayCell(header:string, value:string|undefined):string {
  if (!value?.trim()) return "—";
  if (["Wartość","Cena wywoławcza","Pensja"].includes(header) && Number.isFinite(Number(value))) {
    return formatPlayerFinance(header, value);
  }
  return value;
}

function getDefaultColumnWidth(header: string): number {
  if (header === "Nazwisko") return 190;
  if (["Wartość","Cena wywoławcza","Pensja"].includes(header)) return 140;
  if (header === "Pozycja" || header === "Klub" || header === "Liga") return 150;
  if (header === "Wybór") return 82;
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
  columnStorageKey = COLUMN_STORAGE_KEY,
  pageSize = PAGE_SIZE,
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
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    const stored = readStoredStringArray(columnStorageKey);
    return stored.length > 0 ? stored : [...tableHeaders];
  });
  const [columnWidths, setColumnWidths] =
    useState<Record<string, number>>(readStoredWidths);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const allowedHeaders = useMemo(
    () => new Set(availableHeaders),
    [availableHeaders],
  );
  const effectiveHeaders = useMemo(() => {
    const required = tableHeaders.filter(
      (header) => REQUIRED_COLUMNS.has(header) && allowedHeaders.has(header),
    );
    const selected = selectedColumns.filter(
      (header) => allowedHeaders.has(header) && !REQUIRED_COLUMNS.has(header),
    );
    return Array.from(new Set([...required, ...selected]));
  }, [allowedHeaders, selectedColumns, tableHeaders]);

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

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setPage(0), 0);
    return () => window.clearTimeout(timeoutId);
  }, [sortedRows]);

  useEffect(() => {
    localStorage.setItem(columnStorageKey, JSON.stringify(effectiveHeaders));
  }, [effectiveHeaders, columnStorageKey]);

  useEffect(() => {
    localStorage.setItem(WIDTH_STORAGE_KEY, JSON.stringify(columnWidths));
  }, [columnWidths]);

  const visibleRows = useMemo(() => {
    const start = safePage * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [safePage, sortedRows, pageSize]);

  const firstVisible = sortedRows.length === 0 ? 0 : safePage * pageSize + 1;
  const lastVisible = Math.min((safePage + 1) * pageSize, sortedRows.length);
  const tableWidth = effectiveHeaders.reduce(
    (total, header) =>
      total + (columnWidths[header] ?? getDefaultColumnWidth(header)),
    0,
  );
  const markColumnWidth =
    columnWidths[playerMarkColumn] ?? getDefaultColumnWidth(playerMarkColumn);

  function updateColumns(nextColumns: string[]) {
    const required = tableHeaders.filter(
      (header) => REQUIRED_COLUMNS.has(header) && allowedHeaders.has(header),
    );
    const optional = Array.from(new Set(nextColumns)).filter(
      (header) => allowedHeaders.has(header) && !REQUIRED_COLUMNS.has(header),
    );
    setSelectedColumns([...required, ...optional]);
  }

  function toggleColumn(header: string) {
    if (REQUIRED_COLUMNS.has(header)) return;
    if (selectedColumnSet.has(header)) {
      updateColumns(effectiveHeaders.filter((column) => column !== header));
      return;
    }
    updateColumns([...effectiveHeaders, header]);
  }

  function resetColumns() {
    updateColumns([...tableHeaders]);
  }

  function selectAllColumns() {
    updateColumns(availableHeaders);
  }

  function selectMoneyballColumns() {
    const statisticColumns = availableHeaders.filter(
      (header) =>
        RESULT_COLUMNS.has(header) ||
        ATTACK_COLUMNS.has(header) ||
        CREATION_COLUMNS.has(header) ||
        DEFENCE_COLUMNS.has(header) ||
        PHYSICAL_STATS_COLUMNS.has(header) ||
        GOALKEEPER_STATS_COLUMNS.has(header) ||
        isPer90OrPercentageColumn(header),
    );
    updateColumns([
      "Wybór",
      "Nazwisko",
      "Wiek",
      "Pozycja",
      "Klub",
      "Liga",
      ...statisticColumns,
    ]);
  }

  function moveColumn(header: string, direction: -1 | 1) {
    if (REQUIRED_COLUMNS.has(header)) return;
    const index = effectiveHeaders.indexOf(header);
    const target = index + direction;
    if (
      index < 2 ||
      target < 2 ||
      target >= effectiveHeaders.length
    ) {
      return;
    }
    const next = [...effectiveHeaders];
    [next[index], next[target]] = [next[target], next[index]];
    updateColumns(next);
  }

  function dropColumn(target: string) {
    if (
      !draggedColumn ||
      draggedColumn === target ||
      REQUIRED_COLUMNS.has(draggedColumn) ||
      REQUIRED_COLUMNS.has(target)
    ) {
      return;
    }
    const next = effectiveHeaders.filter((column) => column !== draggedColumn);
    const targetIndex = next.indexOf(target);
    next.splice(Math.max(2, targetIndex), 0, draggedColumn);
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
                Imię i nazwisko pozostaje przypięte. Każdą inną daną możesz
                dodać, ukryć albo ustawić w wybranej kolejności.
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
            <div>
              <button type="button" onClick={resetColumns}>Podstawowe</button>
              <button type="button" onClick={selectMoneyballColumns}>Moneyball</button>
              <button type="button" onClick={selectAllColumns}>Wszystkie</button>
            </div>
          </div>

          <div className="player-column-manager__selected">
            {effectiveHeaders.map((header) => (
              <span
                key={header}
                draggable={!REQUIRED_COLUMNS.has(header)}
                onDragStart={() => setDraggedColumn(header)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => dropColumn(header)}
              >
                {!REQUIRED_COLUMNS.has(header) && (
                  <button
                    type="button"
                    onClick={() => moveColumn(header, -1)}
                    aria-label={`Przesuń ${header} w lewo`}
                  >
                    ‹
                  </button>
                )}
                {header}
                {!REQUIRED_COLUMNS.has(header) && (
                  <button
                    type="button"
                    onClick={() => moveColumn(header, 1)}
                    aria-label={`Przesuń ${header} w prawo`}
                  >
                    ›
                  </button>
                )}
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
                      disabled={REQUIRED_COLUMNS.has(header)}
                      onChange={() => toggleColumn(header)}
                    />
                    <span>{columnLabel(header)}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </section>
      )}

      <div className="player-table-scroll" style={styles.tableWrapper}>
        <table
          style={{
            ...styles.table,
            width: tableWidth,
            minWidth: "100%",
            tableLayout: "fixed",
          }}
        >
          <caption style={styles.visuallyHidden}>
            Pełna tabela zawodników prowadzonego zespołu.
          </caption>

          <thead>
            <tr>
              {effectiveHeaders.map((header) => {
                const width =
                  columnWidths[header] ?? getDefaultColumnWidth(header);
                if (header === playerMarkColumn) {
                  return (
                    <th
                      key={header}
                      scope="col"
                      className="player-table-selection-column player-table-selection-column--header"
                      style={{
                        ...styles.markTh,
                        width,
                        minWidth: width,
                        maxWidth: width,
                      }}
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
                    className={
                      header === "Nazwisko"
                        ? "player-table-name-column player-table-name-column--header"
                        : undefined
                    }
                    aria-sort={getColumnAriaSort(header, sortConfig)}
                    style={{
                      ...(header === "Nazwisko"
                        ? { ...styles.nameStickyTh, left: markColumnWidth }
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
                      <span>{columnLabel(header)}</span>
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
              const absoluteRowIndex = safePage * pageSize + rowIndex;
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
                          width={width}
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
                          className="player-table-name-column"
                          style={{
                            ...styles.nameStickyTd,
                            left: markColumnWidth,
                            ...markedStyle,
                            width,
                            background: isSelectedPlayer
                              ? "var(--team-accent-soft, rgba(232, 73, 211, 0.16))"
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
                        title={["Pensja","Wartość","Cena wywoławcza"].includes(header) ? FINANCE_NOTE : row[header] || undefined}
                      >
                        {displayCell(header,row[header])}
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
