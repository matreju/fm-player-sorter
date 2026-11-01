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

// Back line, then wingbacks, then each midfield/attack line (right-centre-left).
// Keep this order aligned with fm_scout::POSITION_GROUPS in the native reader.
const POSITION_GROUPS = [
  ["BR"], ["O (P)"], ["O (Ś)","LIB"], ["O (L)"],
  ["WO (P)"], ["WO (L)"], ["DP"],
  ["P (P)"], ["P (Ś)"], ["P (L)"],
  ["OP (P)"], ["OP (Ś)"], ["OP (L)"], ["N (Ś)"],
];
export function getPlayerPositionSortRank(row: TableRow): number {
  const ratings=POSITION_GROUPS.map(positions=>Math.max(...positions.map(position=>{
    const value=Number(row[`Pozycja: ${position}`]);
    return Number.isFinite(value)&&value>=1&&value<=20 ? value : 0;
  })));
  if(ratings.some(value=>value>0)) {
    const highest=Math.max(...ratings);
    const threshold=Math.max(15,highest-2);
    const qualified=ratings.findIndex(value=>value>=threshold);
    return qualified>=0 ? qualified : ratings.indexOf(highest);
  }
  // Text fallback for imported files that do not contain the 1-20 ratings.
  const position = normalizePositionText(row["Pozycja"])
    .replace(/((?:\b(?:WO|OP|DP|O|P|N)\s*\/\s*)+(?:WO|OP|DP|O|P|N))\s*\(([^)]+)\)/g,
      (_match, roles: string, sides: string) => roles.split("/").map(role => `${role.trim()} (${sides})`).join(", "));
  const ranks: number[] = [];
  for (const match of position.matchAll(/\b(BR|GK|LIB|WO|WB|DP|DM|OP|AM|O|D|P|M|N|ST)\b(?:\s*\(([^)]*)\))?/g)) {
    const role=match[1], sides=match[2]??"";
    const right=/[PR]/.test(sides), centre=/[SC]/.test(sides), left=/L/.test(sides);
    if(role==="BR"||role==="GK")ranks.push(0);
    else if(role==="LIB")ranks.push(2);
    else if(role==="O"||role==="D") {if(right)ranks.push(1);if(centre)ranks.push(2);if(left)ranks.push(3);}
    else if(role==="WO"||role==="WB") {if(right)ranks.push(4);if(left)ranks.push(5);}
    else if(role==="DP"||role==="DM")ranks.push(6);
    else if(role==="P"||role==="M") {if(right)ranks.push(7);if(centre)ranks.push(8);if(left)ranks.push(9);}
    else if(role==="OP"||role==="AM") {if(right)ranks.push(10);if(centre)ranks.push(11);if(left)ranks.push(12);}
    else if(role==="N"||role==="ST")ranks.push(13);
  }
  if(position.includes("BRAMKARZ"))ranks.push(0);
  if(position.includes("STOPER"))ranks.push(2);
  if(position.includes("NAPAST"))ranks.push(13);
  return ranks.length?Math.min(...ranks):999;
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