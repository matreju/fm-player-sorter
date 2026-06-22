import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type CSSProperties,
} from "react";
import type { PlayerMark } from "../constants/selection";
import type { TableRow } from "../types/table";
import { isGoalkeeper } from "../utils/playerPositionType";
import { getPlayerKey } from "../utils/playerIdentity";
import { getBestRoleMatch } from "../utils/roleScoring";

const PLAYER_MARKS_STORAGE_KEY = "fm-player-sorter-player-marks";
const PLAYER_SELECTION_POSITIONS_STORAGE_KEY =
  "fm-player-sorter-player-selection-positions";

type PlayerSelectionState = {
  playerMarks: Record<string, PlayerMark>;
  playerSelectionPositions: Record<string, string>;
};

type PlayerSelectionAction =
  | {
      type: "toggle-mark";
      key: string;
      mark: PlayerMark;
      suggestedPosition: string;
    }
  | {
      type: "set-position";
      key: string;
      position: string;
    }
  | {
      type: "clear";
    };

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

function createInitialPlayerSelectionState(): PlayerSelectionState {
  return {
    playerMarks: loadPlayerMarksFromStorage(),
    playerSelectionPositions: loadPlayerSelectionPositionsFromStorage(),
  };
}

function playerSelectionReducer(
  state: PlayerSelectionState,
  action: PlayerSelectionAction
): PlayerSelectionState {
  if (action.type === "clear") {
    return {
      playerMarks: {},
      playerSelectionPositions: {},
    };
  }

  if (action.type === "set-position") {
    const nextPositions = { ...state.playerSelectionPositions };

    if (action.position.trim() === "") {
      delete nextPositions[action.key];
    } else {
      nextPositions[action.key] = action.position;
    }

    return {
      ...state,
      playerSelectionPositions: nextPositions,
    };
  }

  const currentMark = state.playerMarks[action.key] ?? null;
  const nextMark = currentMark === action.mark ? null : action.mark;

  const nextMarks = { ...state.playerMarks };
  const nextPositions = { ...state.playerSelectionPositions };

  if (nextMark === null) {
    delete nextMarks[action.key];
    delete nextPositions[action.key];

    return {
      playerMarks: nextMarks,
      playerSelectionPositions: nextPositions,
    };
  }

  nextMarks[action.key] = nextMark;

  if (nextMark !== "selected") {
    delete nextPositions[action.key];
  } else if (!nextPositions[action.key]) {
    nextPositions[action.key] = action.suggestedPosition;
  }

  return {
    playerMarks: nextMarks,
    playerSelectionPositions: nextPositions,
  };
}

type UsePlayerSelectionArgs = {
  analysisPositionGroup: string;
};

export function usePlayerSelection({
  analysisPositionGroup,
}: UsePlayerSelectionArgs) {
  const [selectionState, dispatchSelection] = useReducer(
    playerSelectionReducer,
    null,
    createInitialPlayerSelectionState
  );

  const { playerMarks, playerSelectionPositions } = selectionState;

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
      dispatchSelection({
        type: "set-position",
        key: getPlayerKey(row),
        position,
      });
    },
    []
  );

  const togglePlayerMark = useCallback(
    (row: TableRow, mark: PlayerMark) => {
      dispatchSelection({
        type: "toggle-mark",
        key: getPlayerKey(row),
        mark,
        suggestedPosition: getSuggestedSelectionPosition(row),
      });
    },
    [getSuggestedSelectionPosition]
  );

  const clearPlayerSelection = useCallback(() => {
    dispatchSelection({
      type: "clear",
    });
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