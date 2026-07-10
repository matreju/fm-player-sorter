import type { TableRow } from "../types/table";
import { getPlayerUniqueId } from "./playerIdentity";
import { normalizeTextForSearch } from "./textSearch";

const IMPORT_CHANGE_REPORT_STORAGE_KEY =
  "fm-player-sorter-import-change-report-v1";

export type ImportChangeType =
  | "new"
  | "removed"
  | "club"
  | "league"
  | "position"
  | "age"
  | "attribute"
  | "rating";

export type ImportChangeSeverity = "high" | "medium" | "low";

export type ImportChangeItem = {
  id: string;
  type: ImportChangeType;
  severity: ImportChangeSeverity;
  playerKey: string;
  playerName: string;
  playerInfo: string;
  label: string;
  before: string;
  after: string;
  diff?: number;
};

export type ImportChangeReport = {
  id: string;
  createdAt: string;
  previousFileName: string;
  currentFileName: string;
  previousCount: number;
  currentCount: number;
  newCount: number;
  removedCount: number;
  changedCount: number;
  items: ImportChangeItem[];
  unreliableNameMatchesCount: number;
};

type BuildImportChangeReportArgs = {
  previousRows: TableRow[];
  currentRows: TableRow[];
  previousFileName: string;
  currentFileName: string;
};

const BASIC_INFO_COLUMNS = new Set([
  "UID",
  "Unique ID",
  "UniqueID",
  "Unique Id",
  "Player ID",
  "ID zawodnika",
  "Unikalne ID",
  "Nazwisko",
  "Name",
  "Imię",
  "Klub",
  "Club",
  "Liga",
  "League",
  "Pozycja",
  "Position",
  "Wiek",
  "Age",
  "Kraj",
  "Nationality",
  "Narodowość",
  "Wartość",
  "Value",
  "Pensja",
  "Wage",
]);

const RATING_COLUMNS = [
  "OU",
  "CA",
  "PA",
  "CR",
  "PR",
  "Reputacja",
  "Reputation",
  "Wartość",
  "Value",
];
const FM_ATTRIBUTE_COLUMNS = new Set([
  // Techniczne
  "Rzuty rożne",
  "Dośrodkowania",
  "Doś",
  "Drybling",
  "Wykańczanie akcji",
  "Wykończenie",
  "Gra z pierwszej piłki",
  "Pierwsze przyjęcie",
  "Rzuty wolne",
  "Główkowanie",
  "Główki",
  "Gra głową",
  "Strzały z dystansu",
  "Dalekie wyrzuty",
  "Krycie",
  "Podania",
  "Rzuty karne",
  "Odbiór piłki",
  "Odbiór",
  "Technika",

  // Mentalne
  "Agresja",
  "Przewidywanie",
  "Odwaga",
  "Opanowanie",
  "Koncentracja",
  "Decyzje",
  "Determinacja",
  "Fantazja",
  "Przywództwo",
  "Gra bez piłki",
  "Ustawianie się",
  "Współpraca",
  "Wizja",
  "Pracowitość",

  // Fizyczne
  "Przyspieszenie",
  "Zwinność",
  "Równowaga",
  "Skoczność",
  "Sprawność",
  "Szybkość",
  "Wytrzymałość",
  "Siła",

  // Bramkarskie
  "Chwytanie",
  "Ekscentryczność",
  "Kontrola piłki",
  "Jeden na jednego",
  "Refleks",
  "Wyjścia do piłki",
  "Skłonność do piąstkowania",
  "Komunikacja",
  "Wykopy",
  "Wyrzuty",
]);
function getColumnValue(row: TableRow, columns: string[], fallback = ""): string {
  for (const column of columns) {
    const value = row[column]?.trim();

    if (value) {
      return value;
    }
  }

  return fallback;
}

function getPlayerName(row: TableRow): string {
  return getColumnValue(row, ["Nazwisko", "Name"], "Bez nazwiska");
}

function getPlayerInfo(row: TableRow): string {
  const position = getColumnValue(row, ["Pozycja", "Position"], "-");
  const club = getColumnValue(row, ["Klub", "Club"], "-");
  const age = getColumnValue(row, ["Wiek", "Age"], "-");

  return `${position} · ${club} · ${age} lat`;
}

function normalizeNameKey(row: TableRow): string {
  return normalizeTextForSearch(getPlayerName(row)).trim();
}

function getStableImportPlayerKey(row: TableRow): string {
  const uniqueId = getPlayerUniqueId(row);

  if (uniqueId) {
    return `uid:${uniqueId}`;
  }

  return `name:${normalizeNameKey(row)}`;
}

function toNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = String(value)
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function looksLikeFmAttribute(value: string | undefined): boolean {
  const parsed = toNumber(value);

  return parsed !== null && parsed >= 1 && parsed <= 20;
}
function isFmAttributeColumn(header: string): boolean {
  return FM_ATTRIBUTE_COLUMNS.has(header);
}
function getComparableHeaders(previousRows: TableRow[], currentRows: TableRow[]) {
  const previousHeaders = new Set(previousRows.flatMap((row) => Object.keys(row)));
  const currentHeaders = new Set(currentRows.flatMap((row) => Object.keys(row)));

  return Array.from(previousHeaders).filter((header) => currentHeaders.has(header));
}

function buildRowMap(rows: TableRow[]) {
  const map = new Map<string, TableRow>();
  const nameFallbackCounts = new Map<string, number>();

  for (const row of rows) {
    const key = getStableImportPlayerKey(row);

    if (key.startsWith("name:")) {
      nameFallbackCounts.set(key, (nameFallbackCounts.get(key) ?? 0) + 1);
    }

    map.set(key, row);
  }

  const unreliableNameMatchesCount = Array.from(nameFallbackCounts.values()).filter(
    (count) => count > 1
  ).length;

  return {
    map,
    unreliableNameMatchesCount,
  };
}

function makeItem(
  type: ImportChangeType,
  severity: ImportChangeSeverity,
  playerKey: string,
  row: TableRow,
  label: string,
  before: string,
  after: string,
  diff?: number
): ImportChangeItem {
  return {
    id: `${type}:${playerKey}:${label}:${before}:${after}`,
    type,
    severity,
    playerKey,
    playerName: getPlayerName(row),
    playerInfo: getPlayerInfo(row),
    label,
    before: before || "-",
    after: after || "-",
    diff,
  };
}

function compareTextColumn(
  items: ImportChangeItem[],
  type: ImportChangeType,
  severity: ImportChangeSeverity,
  label: string,
  columns: string[],
  playerKey: string,
  previousRow: TableRow,
  currentRow: TableRow
) {
  const before = getColumnValue(previousRow, columns, "-");
  const after = getColumnValue(currentRow, columns, "-");

  if (before === after) {
    return;
  }

  items.push(
    makeItem(type, severity, playerKey, currentRow, label, before, after)
  );
}

export function buildImportChangeReport({
  previousRows,
  currentRows,
  previousFileName,
  currentFileName,
}: BuildImportChangeReportArgs): ImportChangeReport {
  const previous = buildRowMap(previousRows);
  const current = buildRowMap(currentRows);

  const items: ImportChangeItem[] = [];

  for (const [playerKey, currentRow] of current.map.entries()) {
    if (previous.map.has(playerKey)) {
      continue;
    }

    items.push(
      makeItem(
        "new",
        "high",
        playerKey,
        currentRow,
        "Nowy zawodnik w imporcie",
        "-",
        getPlayerInfo(currentRow)
      )
    );
  }

  for (const [playerKey, previousRow] of previous.map.entries()) {
    if (current.map.has(playerKey)) {
      continue;
    }

    items.push(
      makeItem(
        "removed",
        "medium",
        playerKey,
        previousRow,
        "Zniknął z importu",
        getPlayerInfo(previousRow),
        "-"
      )
    );
  }

  const comparableHeaders = getComparableHeaders(previousRows, currentRows);

  for (const [playerKey, currentRow] of current.map.entries()) {
    const previousRow = previous.map.get(playerKey);

    if (!previousRow) {
      continue;
    }

    compareTextColumn(
      items,
      "club",
      "high",
      "Zmiana klubu",
      ["Klub", "Club"],
      playerKey,
      previousRow,
      currentRow
    );

    compareTextColumn(
      items,
      "league",
      "medium",
      "Zmiana ligi",
      ["Liga", "League"],
      playerKey,
      previousRow,
      currentRow
    );

    compareTextColumn(
      items,
      "position",
      "medium",
      "Zmiana pozycji",
      ["Pozycja", "Position"],
      playerKey,
      previousRow,
      currentRow
    );

    compareTextColumn(
      items,
      "age",
      "low",
      "Zmiana wieku",
      ["Wiek", "Age"],
      playerKey,
      previousRow,
      currentRow
    );

    for (const header of comparableHeaders) {
      if (BASIC_INFO_COLUMNS.has(header)) {
        continue;
      }

      const before = previousRow[header] ?? "";
      const after = currentRow[header] ?? "";

      if (before === after) {
        continue;
      }

      const beforeNumber = toNumber(before);
      const afterNumber = toNumber(after);

      if (beforeNumber === null || afterNumber === null) {
        continue;
      }

      const diff = afterNumber - beforeNumber;
      const absoluteDiff = Math.abs(diff);

      const isRatingColumn = RATING_COLUMNS.some(
        (column) => column.toLowerCase() === header.toLowerCase()
      );

      if (isRatingColumn && absoluteDiff >= 2) {
        items.push(
          makeItem(
            "rating",
            absoluteDiff >= 5 ? "high" : "medium",
            playerKey,
            currentRow,
            header,
            before,
            after,
            diff
          )
        );

        continue;
      }

      if (
  !isRatingColumn &&
  isFmAttributeColumn(header) &&
  looksLikeFmAttribute(before) &&
  looksLikeFmAttribute(after) &&
  absoluteDiff >= 1
) {
  items.push(
    makeItem(
      "attribute",
      absoluteDiff >= 2 ? "high" : "medium",
      playerKey,
      currentRow,
      header,
      before,
      after,
      diff
    )
  );
}
    }
  }

  const sortedItems = items.sort((a, b) => {
  const typeOrder: Record<ImportChangeType, number> = {
  new: 0,
  removed: 1,
  club: 2,
  league: 3,
  position: 4,
  rating: 5,
  attribute: 6,
  age: 7,
};

  const typeDiff = typeOrder[a.type] - typeOrder[b.type];

  if (typeDiff !== 0) {
    return typeDiff;
  }

  const severityOrder: Record<ImportChangeSeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];

  if (severityDiff !== 0) {
    return severityDiff;
  }

  const diffValue = Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0);

  if (diffValue !== 0) {
    return diffValue;
  }

  return a.playerName.localeCompare(b.playerName, "pl");
});

  const changedCount = sortedItems.filter(
    (item) => item.type !== "new" && item.type !== "removed"
  ).length;

  return {
    id: `${Date.now()}`,
    createdAt: new Date().toISOString(),
    previousFileName,
    currentFileName,
    previousCount: previousRows.length,
    currentCount: currentRows.length,
    newCount: sortedItems.filter((item) => item.type === "new").length,
    removedCount: sortedItems.filter((item) => item.type === "removed").length,
    changedCount,
    items: sortedItems,
    unreliableNameMatchesCount:
      previous.unreliableNameMatchesCount + current.unreliableNameMatchesCount,
  };
}

export function saveStoredImportChangeReport(report: ImportChangeReport): void {
  localStorage.setItem(IMPORT_CHANGE_REPORT_STORAGE_KEY, JSON.stringify(report));
}

export function loadStoredImportChangeReport(): ImportChangeReport | null {
  const saved = localStorage.getItem(IMPORT_CHANGE_REPORT_STORAGE_KEY);

  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved) as ImportChangeReport;

    if (parsed && Array.isArray(parsed.items)) {
      return parsed;
    }

    return null;
  } catch {
    localStorage.removeItem(IMPORT_CHANGE_REPORT_STORAGE_KEY);
    return null;
  }
}

export function clearStoredImportChangeReport(): void {
  localStorage.removeItem(IMPORT_CHANGE_REPORT_STORAGE_KEY);
}