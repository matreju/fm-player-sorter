import type { CSSProperties } from "react";
import type { SquadDepthStatus } from "../../constants/squadDepth";

export const SQUAD_DEPTH_DRAWER_OPEN_STORAGE_KEY =
  "fm-player-sorter-squad-depth-open-v1";

export function getSquadDepthStatusLabel(status: SquadDepthStatus) {
  if (status === "empty") {
    return "Brak";
  }

  if (status === "low") {
    return "Mało";
  }

  if (status === "high") {
    return "Nadmiar";
  }

  return "OK";
}

export function getSquadDepthStatusStyle(
  status: SquadDepthStatus
): CSSProperties {
  if (status === "empty") {
    return {
      borderColor: "#ef4444",
      background: "rgba(239, 68, 68, 0.16)",
      color: "#fecaca",
    };
  }

  if (status === "low") {
    return {
      borderColor: "#f59e0b",
      background: "rgba(245, 158, 11, 0.16)",
      color: "#fde68a",
    };
  }

  if (status === "high") {
    return {
      borderColor: "#38bdf8",
      background: "rgba(56, 189, 248, 0.14)",
      color: "#bae6fd",
    };
  }

  return {
    borderColor: "#22c55e",
    background: "rgba(34, 197, 94, 0.16)",
    color: "#bbf7d0",
  };
}