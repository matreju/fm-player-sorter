import type { TableRow } from "../types/table";

export function getCandidateTypeForPosition(
  row: TableRow,
  positionGroup: string
): string {
  if (positionGroup === "any") {
    return "-";
  }

  const position = row["Pozycja"] ?? "";

  if (!position) {
    return "⚠ Naciągany";
  }

  if (positionGroup === "Napastnik") {
    if (position.includes("N (")) return "⭐ Naturalny";
    if (position.includes("OP (Ś")) return "◆ Bliski";
    if (position.includes("OP (P") || position.includes("OP (L")) {
      return "↗ Do przestawienia";
    }

    return "⚠ Naciągany";
  }

  if (positionGroup === "Skrzydłowy") {
    if (position.includes("OP (P") || position.includes("OP (L")) {
      return "⭐ Naturalny";
    }

    if (position.includes("P (P") || position.includes("P (L")) {
      return "◆ Bliski";
    }

    if (position.includes("O/WO") || position.includes("WO")) {
      return "↗ Do przestawienia";
    }

    return "⚠ Naciągany";
  }

  if (positionGroup === "Boczny pomocnik") {
    if (position.includes("P (P") || position.includes("P (L")) {
      return "⭐ Naturalny";
    }

    if (position.includes("OP (P") || position.includes("OP (L")) {
      return "◆ Bliski";
    }

    if (position.includes("O/WO") || position.includes("WO")) {
      return "↗ Do przestawienia";
    }

    return "⚠ Naciągany";
  }

  if (positionGroup === "Boczny obrońca") {
    if (
      position.includes("O (P") ||
      position.includes("O (L") ||
      position.includes("O/WO (P") ||
      position.includes("O/WO (L") ||
      position.includes("WO (P") ||
      position.includes("WO (L")
    ) {
      return "⭐ Naturalny";
    }

    if (position.includes("O (Ś")) {
      return "◆ Bliski";
    }

    if (
      position.includes("DP") ||
      position.includes("P (P") ||
      position.includes("P (L")
    ) {
      return "↗ Do przestawienia";
    }

    return "⚠ Naciągany";
  }

  if (positionGroup === "Wahadłowy") {
    if (
      position.includes("WO (P") ||
      position.includes("WO (L") ||
      position.includes("O/WO")
    ) {
      return "⭐ Naturalny";
    }

    if (
      position.includes("O (P") ||
      position.includes("O (L") ||
      position.includes("P (P") ||
      position.includes("P (L")
    ) {
      return "◆ Bliski";
    }

    return "⚠ Naciągany";
  }

  if (positionGroup === "Środkowy obrońca") {
    if (position.includes("O (Ś")) return "⭐ Naturalny";
    if (position.includes("O (P") || position.includes("O (L")) {
      return "◆ Bliski";
    }
    if (position.includes("DP")) return "↗ Do przestawienia";

    return "⚠ Naciągany";
  }

  if (positionGroup === "Defensywny pomocnik") {
    if (position.includes("DP")) return "⭐ Naturalny";
    if (position.includes("P (Ś")) return "◆ Bliski";
    if (position.includes("O (Ś")) return "↗ Do przestawienia";

    return "⚠ Naciągany";
  }

  if (positionGroup === "Środkowy pomocnik") {
    if (position.includes("P (Ś")) return "⭐ Naturalny";
    if (position.includes("DP") || position.includes("OP (Ś")) {
      return "◆ Bliski";
    }

    return "⚠ Naciągany";
  }

  if (positionGroup === "Ofensywny pomocnik") {
    if (position.includes("OP (Ś")) return "⭐ Naturalny";
    if (position.includes("P (Ś") || position.includes("N (")) {
      return "◆ Bliski";
    }

    if (position.includes("OP (P") || position.includes("OP (L")) {
      return "↗ Do przestawienia";
    }

    return "⚠ Naciągany";
  }

  return "-";
}