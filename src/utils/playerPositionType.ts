import type { TableRow } from "../types/table";

export type PlayerType = "goalkeeper" | "outfield";

export type PlayerSelectOption = {
  row: TableRow;
  index: number;
  label: string;
  playerType: PlayerType;
  positionRank: number;
  name: string;
  club: string;
  position: string;
};

function normalizePositionText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .toUpperCase();
}

export function getPlayerName(row: TableRow | undefined): string {
  return row?.["Nazwisko"] || "-";
}

export function getPlayerClub(row: TableRow | undefined): string {
  return row?.["Klub"] || "-";
}

export function getPlayerPosition(row: TableRow | undefined): string {
  return row?.["Pozycja"] || "-";
}

export function isGoalkeeper(row: TableRow | undefined): boolean {
  const position = normalizePositionText(row?.["Pozycja"]);

  return (
    /^BR\b/.test(position) ||
    position.includes(" BR ") ||
    position.includes("BRAMKARZ")
  );
}

export function isOutfieldPlayer(row: TableRow | undefined): boolean {
  return Boolean(row) && !isGoalkeeper(row);
}

export function getPlayerType(row: TableRow | undefined): PlayerType {
  return isGoalkeeper(row) ? "goalkeeper" : "outfield";
}

export function getPlayerTypeLabel(row: TableRow | undefined): string {
  return isGoalkeeper(row) ? "Bramkarz" : "Zawodnik z pola";
}

export function areComparablePlayerTypes(
  left: TableRow | undefined,
  right: TableRow | undefined
): boolean {
  if (!left || !right) {
    return true;
  }

  return getPlayerType(left) === getPlayerType(right);
}

export function getPlayerPositionSortRank(row: TableRow): number {
  const position = normalizePositionText(row["Pozycja"]);

  if (isGoalkeeper(row)) return 0;

  if (/O\s*\([^)]*[SŚ]/i.test(position) || position.includes("STOPER")) {
    return 10;
  }

  if (/O\s*\([^)]*L/i.test(position)) return 20;
  if (/O\s*\([^)]*P/i.test(position)) return 21;

  if (/WO\s*\([^)]*L/i.test(position)) return 25;
  if (/WO\s*\([^)]*P/i.test(position)) return 26;

  if (/\bDP\b/i.test(position)) return 30;

  if (/P\s*\([^)]*[SŚ]/i.test(position)) return 40;

  if (/OP\s*\([^)]*[SŚ]/i.test(position)) return 50;

  if (/OP\s*\([^)]*L/i.test(position) || /P\s*\([^)]*L/i.test(position)) {
    return 60;
  }

  if (/OP\s*\([^)]*P/i.test(position) || /P\s*\([^)]*P/i.test(position)) {
    return 61;
  }

  if (/\bN\s*\(/i.test(position) || position.includes("NAPAST")) {
    return 70;
  }

  return 999;
}

export function getPlayerCompareOptionLabel(row: TableRow): string {
  return `${getPlayerName(row)} — ${getPlayerPosition(row)} — ${getPlayerClub(
    row
  )}`;
}

export function getSortedPlayerSelectOptions(
  rows: TableRow[]
): PlayerSelectOption[] {
  return rows
    .map((row, index) => ({
      row,
      index,
      label: getPlayerCompareOptionLabel(row),
      playerType: getPlayerType(row),
      positionRank: getPlayerPositionSortRank(row),
      name: getPlayerName(row),
      club: getPlayerClub(row),
      position: getPlayerPosition(row),
    }))
    .sort((left, right) => {
      if (left.positionRank !== right.positionRank) {
        return left.positionRank - right.positionRank;
      }

      const nameCompare = left.name.localeCompare(right.name, "pl");

      if (nameCompare !== 0) {
        return nameCompare;
      }

      return left.club.localeCompare(right.club, "pl");
    });
}

export function getCompatiblePlayerOptions(
  options: PlayerSelectOption[],
  referencePlayer: TableRow | undefined
): PlayerSelectOption[] {
  if (!referencePlayer) {
    return options;
  }

  const referenceType = getPlayerType(referencePlayer);

  return options.filter((option) => option.playerType === referenceType);
}