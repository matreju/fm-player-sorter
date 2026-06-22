import { useMemo } from "react";
import {
  SELECTION_POSITION_OPTIONS,
  type PlayerMark,
} from "../constants/selection";
import {
  SQUAD_POSITION_TARGETS,
  type SquadDepthItem,
} from "../constants/squadDepth";
import type { TableRow } from "../types/table";
import { getPlayerKey } from "../utils/playerIdentity";

type UseSquadDepthArgs = {
  rows: TableRow[];
  playerMarks: Record<string, PlayerMark>;
  playerSelectionPositions: Record<string, string>;
};

export function useSquadDepth({
  rows,
  playerMarks,
  playerSelectionPositions,
}: UseSquadDepthArgs) {
  const selectedPlayersWithoutPositionCount = useMemo(() => {
    let count = 0;

    for (const [key, mark] of Object.entries(playerMarks)) {
      if (
        mark === "selected" &&
        (playerSelectionPositions[key] ?? "").trim() === ""
      ) {
        count += 1;
      }
    }

    return count;
  }, [playerMarks, playerSelectionPositions]);

  const squadDepthByPosition = useMemo<SquadDepthItem[]>(() => {
    const playersByPosition = new Map<string, TableRow[]>();

    for (const position of SELECTION_POSITION_OPTIONS) {
      playersByPosition.set(position, []);
    }

    for (const row of rows) {
      const key = getPlayerKey(row);

      if (playerMarks[key] !== "selected") {
        continue;
      }

      const position = playerSelectionPositions[key];

      if (!position) {
        continue;
      }

      if (!playersByPosition.has(position)) {
        playersByPosition.set(position, []);
      }

      playersByPosition.get(position)?.push(row);
    }

    return SELECTION_POSITION_OPTIONS.map((position) => {
      const players = playersByPosition.get(position) ?? [];
      const target = SQUAD_POSITION_TARGETS[position];

      let status: SquadDepthItem["status"] = "ok";

      if (players.length === 0) {
        status = "empty";
      } else if (target && players.length < target.min) {
        status = "low";
      } else if (target?.ideal && players.length > target.ideal + 1) {
        status = "high";
      }

      return {
        position,
        players,
        count: players.length,
        target,
        status,
      };
    });
  }, [rows, playerMarks, playerSelectionPositions]);

  const squadDepthWarnings = useMemo(() => {
    const warnings: string[] = [];

    for (const item of squadDepthByPosition) {
      if (!item.target || item.target.min === 0) {
        continue;
      }

      if (item.count === 0) {
        warnings.push(`Brak pozycji: ${item.position}.`);
        continue;
      }

      if (item.count < item.target.min) {
        warnings.push(
          `Mało zawodników na pozycji ${item.position}: ${item.count}/${item.target.min}.`
        );
      }
    }

    if (selectedPlayersWithoutPositionCount > 0) {
      warnings.push(
        `${selectedPlayersWithoutPositionCount} wybranych zawodników nie ma przypisanej pozycji.`
      );
    }

    return warnings;
  }, [squadDepthByPosition, selectedPlayersWithoutPositionCount]);

  return {
    selectedPlayersWithoutPositionCount,
    squadDepthByPosition,
    squadDepthWarnings,
  };
}