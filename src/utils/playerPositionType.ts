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
  const position = normalizePositionText(row["Pozycja"])
    .replace(/((?:\b(?:WO|OP|DP|O|P|N)\s*\/\s*)+(?:WO|OP|DP|O|P|N))\s*\(([^)]+)\)/g,
      (_match, roles: string, sides: string) => roles.split("/").map(role => `${role.trim()} (${sides})`).join(", "));
  const ranks: number[] = [];
  for (const match of position.matchAll(/\b(BR|GK|LIB|WO|WB|DP|DM|OP|AM|O|D|P|M|N|ST)\b(?:\s*\(([^)]*)\))?/g)) {
    const role = match[1];
    const sides = match[2] ?? "";
    const right = /[PR]/.test(sides), centre = /[SC]/.test(sides), left = /L/.test(sides);
    if (role === "BR" || role === "GK") ranks.push(0);
    else if (role === "LIB") ranks.push(2);
    else if (["O", "D", "WO", "WB"].includes(role)) {
      if (right) ranks.push(1);
      if (centre) ranks.push(2);
      if (left) ranks.push(3);
    } else if (role === "DP" || role === "DM") ranks.push(4);
    else if (["P", "M", "OP", "AM"].includes(role)) {
      if (centre) ranks.push(role === "OP" || role === "AM" ? 6 : 5);
      if (right) ranks.push(7);
      if (left) ranks.push(8);
    } else if (role === "N" || role === "ST") ranks.push(9);
  }
  if (position.includes("BRAMKARZ")) ranks.push(0);
  if (position.includes("STOPER")) ranks.push(2);
  if (position.includes("NAPAST")) ranks.push(9);
  // A multi-position player belongs to the earliest applicable football group.
  return ranks.length ? Math.min(...ranks) : 999;
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