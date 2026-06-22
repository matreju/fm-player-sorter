import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";import type { TableRow } from "../types/table";
import { getBestRoleMatch } from "../utils/roleScoring";
import { getPlayerKey } from "../utils/playerIdentity";
import type { PlayerMark } from "../constants/selection";
import { isGoalkeeper } from "../utils/playerPositionType";

const PLAYER_MARKS_STORAGE_KEY = "fm-player-sorter-player-marks";
const PLAYER_SELECTION_POSITIONS_STORAGE_KEY =
  "fm-player-sorter-player-selection-positions";

function loadPlayerMarksFromStorage(): Record<string, PlayerMark> {
  try {
    const saved = localStorage.getItem(PLAYER_MARKS_STORAGE_KEY);

    if (!saved) {
      return {};
    }

    const parsed = JSON.parse(saved) as Record<string, string>;
    const result: Record<string, PlayerMark> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (value === "selected" || value === "rejected") {
        result[key] = value;
      }
    }

    return result;
  } catch {
    return {};
  }
}

function loadPlayerSelectionPositionsFromStorage(): Record<string, string> {
  try {
    const saved = localStorage.getItem(PLAYER_SELECTION_POSITIONS_STORAGE_KEY);

    if (!saved) {
      return {};
    }

    return JSON.parse(saved) as Record<string, string>;
  } catch {
    return {};
  }
}

type UsePlayerSelectionArgs = {
  analysisPositionGroup: string;
};

export function usePlayerSelection({
  analysisPositionGroup,
}: UsePlayerSelectionArgs) {
  const [playerMarks, setPlayerMarks] = useState<Record<string, PlayerMark>>(
    () => loadPlayerMarksFromStorage()
  );

  const [playerSelectionPositions, setPlayerSelectionPositions] = useState<
    Record<string, string>
  >(() => loadPlayerSelectionPositionsFromStorage());

  useEffect(() => {
    localStorage.setItem(PLAYER_MARKS_STORAGE_KEY, JSON.stringify(playerMarks));
  }, [playerMarks]);

  useEffect(() => {
    localStorage.setItem(
      PLAYER_SELECTION_POSITIONS_STORAGE_KEY,
      JSON.stringify(playerSelectionPositions)
    );
  }, [playerSelectionPositions]);

  const selectedPlayersCount = useMemo(() => {
    return Object.values(playerMarks).filter((mark) => mark === "selected")
      .length;
  }, [playerMarks]);

  const rejectedPlayersCount = useMemo(() => {
    return Object.values(playerMarks).filter((mark) => mark === "rejected")
      .length;
  }, [playerMarks]);

  const selectedPlayersWithPositionCount = useMemo(() => {
    return Object.entries(playerSelectionPositions).filter(([key, position]) => {
      return playerMarks[key] === "selected" && position.trim() !== "";
    }).length;
  }, [playerMarks, playerSelectionPositions]);

  const getPlayerMark = useCallback(
    (row: TableRow): PlayerMark | null => {
      return playerMarks[getPlayerKey(row)] ?? null;
    },
    [playerMarks]
  );

  const getSuggestedSelectionPosition = useCallback(
    (row: TableRow): string => {
      if (isGoalkeeper(row)) {
        return "Bramkarz";
      }

      if (analysisPositionGroup !== "any") {
        return analysisPositionGroup;
      }

      const bestOverallMatch = getBestRoleMatch(row);

      return bestOverallMatch?.role.positionGroup ?? "";
    },
    [analysisPositionGroup]
  );

  const getPlayerSelectionPosition = useCallback(
    (row: TableRow): string => {
      return playerSelectionPositions[getPlayerKey(row)] ?? "";
    },
    [playerSelectionPositions]
  );

  const setPlayerSelectionPosition = useCallback(
    (row: TableRow, position: string) => {
      const key = getPlayerKey(row);

      setPlayerSelectionPositions((previous) => ({
        ...previous,
        [key]: position,
      }));
    },
    []
  );

  const togglePlayerMark = useCallback(
    (row: TableRow, mark: PlayerMark) => {
      const key = getPlayerKey(row);
      const currentMark = playerMarks[key] ?? null;
      const nextMark = currentMark === mark ? null : mark;

      setPlayerMarks((previous) => {
        const next = { ...previous };

        if (nextMark === null) {
          delete next[key];
          return next;
        }

        next[key] = nextMark;
        return next;
      });

      setPlayerSelectionPositions((previous) => {
        const next = { ...previous };

        if (nextMark !== "selected") {
          delete next[key];
          return next;
        }

        if (!next[key]) {
          next[key] = getSuggestedSelectionPosition(row);
        }

        return next;
      });
    },
    [playerMarks, getSuggestedSelectionPosition]
  );

  const clearPlayerSelection = useCallback(() => {
    setPlayerMarks({});
    setPlayerSelectionPositions({});
  }, []);

  const getMarkedCellStyle = useCallback(
    (mark: PlayerMark | null): CSSProperties => {
    if (mark === "selected") {
      return {
        background: "rgba(78, 255, 119, 0.12)",
      };
    }

    if (mark === "rejected") {
      return {
        background: "rgba(255, 93, 93, 0.12)",
      };
    }

      return {};
    },
    []
  );

  return {
    playerMarks,
    playerSelectionPositions,
    selectedPlayersCount,
    rejectedPlayersCount,
    selectedPlayersWithPositionCount,
    getPlayerMark,
    getPlayerSelectionPosition,
    setPlayerSelectionPosition,
    togglePlayerMark,
    clearPlayerSelection,
    getMarkedCellStyle,
  };
}