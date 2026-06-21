import type { TableRow } from "../types/table";

const UNIQUE_ID_COLUMNS = [
  "UID",
  "Unique ID",
  "UniqueID",
  "Unique Id",
  "Player ID",
  "ID zawodnika",
  "Unikalne ID",
];

export function getPlayerUniqueId(row: TableRow): string {
  for (const column of UNIQUE_ID_COLUMNS) {
    const value = row[column]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

export function getLegacyPlayerKey(row: TableRow): string {
  return [
    row["Nazwisko"] ?? "",
    row["Klub"] ?? "",
    row["Pozycja"] ?? "",
    row["Wiek"] ?? "",
  ].join("|");
}

export function getPlayerKey(row: TableRow): string {
  const uniqueId = getPlayerUniqueId(row);

  if (uniqueId) {
    return `uid:${uniqueId}`;
  }

  return getLegacyPlayerKey(row);
}