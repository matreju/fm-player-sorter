import type { SortConfig, SortDirection } from "../types/table";
import { parseAttributeValue } from "./attributeValue";

export function getSortableNumber(value: string): number | null {
  const parsed = parseAttributeValue(value);

  return parsed ? parsed.average : null;
}

export function compareValues(
  aValue: string,
  bValue: string,
  direction: SortDirection
): number {
  const aNumber = getSortableNumber(aValue);
  const bNumber = getSortableNumber(bValue);

  const aMissing = !aValue || aValue.trim() === "-";
  const bMissing = !bValue || bValue.trim() === "-";

  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (aNumber !== null && bNumber !== null) {
    return direction === "asc" ? aNumber - bNumber : bNumber - aNumber;
  }

  const textCompare = aValue.localeCompare(bValue, "pl", {
    sensitivity: "base",
    numeric: true,
  });

  return direction === "asc" ? textCompare : -textCompare;
}

export function getSortIcon(column: string, sortConfig: SortConfig): string {
  if (!sortConfig || sortConfig.column !== column) {
    return "↕";
  }

  return sortConfig.direction === "desc" ? "↓" : "↑";
}