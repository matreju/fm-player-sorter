import type { TableRow } from "../types/table";

export type PlayerAvailabilityTone = "ok" | "injury" | "other";

export type PlayerAvailability = {
  info: string;
  isInjured: boolean;
  label: string;
  tone: PlayerAvailabilityTone;
};

export function getPlayerInfo(row: TableRow): string {
  return String(row["Inf"] ?? "").trim();
}

export function isPlayerInjured(row: TableRow): boolean {
  return getPlayerInfo(row)
    .split(/[,\s/]+/)
    .some((part) => part.toLowerCase() === "ktz");
}

export function getPlayerAvailability(row: TableRow): PlayerAvailability {
  const info = getPlayerInfo(row);

  if (isPlayerInjured(row)) {
    return {
      info,
      isInjured: true,
      label: "Ktz",
      tone: "injury",
    };
  }

  if (info) {
    return {
      info,
      isInjured: false,
      label: info,
      tone: "other",
    };
  }

  return {
    info: "",
    isInjured: false,
    label: "",
    tone: "ok",
  };
}