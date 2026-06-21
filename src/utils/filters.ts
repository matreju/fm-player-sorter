import type { TableRow } from "../types/table";

export type FootFilter =
  | "any"
  | "left-decent"
  | "right-decent"
  | "left-strong"
  | "right-strong"
  | "left-very-strong"
  | "right-very-strong"
  | "left-dominant"
  | "right-dominant"
  | "both-decent"
  | "both-strong";

const FOOT_STRENGTH_AVERAGE: Record<string, number> = {
  "Bardzo słaba": 2,
  "Słaba": 6.5,
  "Przyzwoita": 10,
  "Względnie mocna": 13,
  "Wysoka": 16,
  "Bardzo mocna": 19,
};

export function getFootStrength(value: string): number {
  return FOOT_STRENGTH_AVERAGE[value.trim()] ?? 0;
}

export function matchesFootFilter(row: TableRow, filter: FootFilter): boolean {
  if (filter === "any") {
    return true;
  }

  const left = getFootStrength(row["Lewa noga"] ?? "");
  const right = getFootStrength(row["Prawa noga"] ?? "");

  if (filter === "left-decent") {
    return left >= 9;
  }

  if (filter === "right-decent") {
    return right >= 9;
  }

  if (filter === "left-strong") {
    return left >= 12;
  }

  if (filter === "right-strong") {
    return right >= 12;
  }

  if (filter === "left-very-strong") {
    return left >= 15;
  }

  if (filter === "right-very-strong") {
    return right >= 15;
  }

  if (filter === "left-dominant") {
    return left > right;
  }

  if (filter === "right-dominant") {
    return right > left;
  }

  if (filter === "both-decent") {
    return left >= 9 && right >= 9;
  }

  if (filter === "both-strong") {
    return left >= 12 && right >= 12;
  }

  return true;
}