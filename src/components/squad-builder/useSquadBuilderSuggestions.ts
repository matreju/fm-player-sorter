import { useEffect, useMemo, useState } from "react";
import type {
  FormationSlot,
  PlayerMark,
  SlotCandidate,
  SquadBuilderScoreMode,
} from "../../types/squadBuilderTypes";
import type { TableRow } from "../../types/table";
import {
  buildCandidatesBySlot,
  getLineupRows,
  solveLineupFromCandidates,
} from "../../utils/squadBuilderLineupSolver";
import {
  loadLocalStorageValue,
  saveLocalStorageValue,
} from "../../utils/localStorageValue";
import {
  getSlotFamily,
  getSlotSide,
  type PositionFamily,
  type SlotSide,
} from "../../utils/squadBuilderMobility";
import type { TacticalView } from "../../utils/squadBuilderTacticalView";
import { compareCandidatesForMode } from "../../utils/squadBuilderScoreMode";

const SQUAD_BUILDER_HIDDEN_TOP_STORAGE_KEY =
  "fm-player-sorter-squad-builder-hidden-top-v4";

const SQUAD_BUILDER_LOCKED_SLOTS_STORAGE_KEY =
  "fm-player-sorter-squad-builder-locked-slots-v4";

type UseSquadBuilderSuggestionsParams = {
  rows: TableRow[];
  withBallSlots: FormationSlot[];
  withoutBallSlots: FormationSlot[];
  tacticalView: TacticalView;
  onlySelected: boolean;
  topOnlyNatural: boolean;
  scoreMode: SquadBuilderScoreMode;
  getPlayerMark?: (row: TableRow) => PlayerMark | null;
};

type CandidateWithSelectionScore = SlotCandidate & {
  selectionScore?: number;
};

type WithBallPlayerSlotProfile = {
  side: SlotSide;
  family: PositionFamily;
  slotLabel: string;
  slotPositionGroup: string;
};

function getPhaseSlotKey(view: TacticalView, slotId: string) {
  return `${view}:${slotId}`;
}

function getLineupCandidates(
  lineup: Record<string, SlotCandidate | null>
): SlotCandidate[] {
  return Object.values(lineup).filter(
    (candidate): candidate is SlotCandidate => candidate !== null
  );
}

function getCandidateSelectionScore(candidate: SlotCandidate) {
  const selectionScore = (candidate as CandidateWithSelectionScore)
    .selectionScore;

  if (typeof selectionScore === "number" && Number.isFinite(selectionScore)) {
    return selectionScore;
  }

  return candidate.finalScore;
}

function getCandidateSelectionScoreForMode(
  candidate: SlotCandidate,
  scoreMode: SquadBuilderScoreMode
) {
  if (scoreMode === "overall-ability") {
    return candidate.overallAbility ?? candidate.finalScore;
  }

  return getCandidateSelectionScore(candidate);
}

function withSelectionScore(
  candidate: SlotCandidate,
  nextSelectionScore: number
): SlotCandidate {
  return {
    ...candidate,
    selectionScore: nextSelectionScore,
  } as SlotCandidate;
}

function withScoreModeSelectionScore(
  candidate: SlotCandidate,
  scoreMode: SquadBuilderScoreMode,
  adjustment = 0
): SlotCandidate {
  return withSelectionScore(
    candidate,
    getCandidateSelectionScoreForMode(candidate, scoreMode) + adjustment
  );
}

function sortCandidatesForMode(
  candidates: SlotCandidate[],
  scoreMode: SquadBuilderScoreMode
): SlotCandidate[] {
  return [...candidates].sort((left, right) => {
    const selectionDiff =
      getCandidateSelectionScore(right) - getCandidateSelectionScore(left);

    if (selectionDiff !== 0) {
      return selectionDiff;
    }

    return compareCandidatesForMode(left, right, scoreMode);
  });
}

function areCentralFamilies(left: PositionFamily, right: PositionFamily) {
  const centralFamilies: PositionFamily[] = [
    "defensive-midfielder",
    "central-midfielder",
    "attacking-midfielder",
  ];

  return centralFamilies.includes(left) && centralFamilies.includes(right);
}

function getCentralFamilyLevel(family: PositionFamily) {
  if (family === "defensive-midfielder") {
    return 0;
  }

  if (family === "central-midfielder") {
    return 1;
  }

  if (family === "attacking-midfielder") {
    return 2;
  }

  return null;
}

function getTransitionSelectionAdjustment(
  candidate: SlotCandidate,
  targetSlot: FormationSlot,
  withBallProfileByPlayerKey: Map<string, WithBallPlayerSlotProfile>
) {
  const sourceProfile = withBallProfileByPlayerKey.get(candidate.key);

  if (!sourceProfile) {
    return 0;
  }

  const targetSide = getSlotSide(targetSlot);
  const targetFamily = getSlotFamily(targetSlot);

  let adjustment = 0;

  if (sourceProfile.side !== "center" && targetSide !== "center") {
    if (sourceProfile.side === targetSide) {
      adjustment += 60;
    } else {
      adjustment -= 170;
    }
  }

  if (sourceProfile.side !== "center" && targetSide === "center") {
    adjustment -= 18;
  }

  if (sourceProfile.side === "center" && targetSide !== "center") {
    adjustment -= 26;
  }

  if (sourceProfile.family === targetFamily) {
    adjustment += 28;
  } else if (areCentralFamilies(sourceProfile.family, targetFamily)) {
    adjustment += 6;
  }

  const sourceCentralLevel = getCentralFamilyLevel(sourceProfile.family);
  const targetCentralLevel = getCentralFamilyLevel(targetFamily);

  if (sourceCentralLevel !== null && targetCentralLevel !== null) {
    const levelDistance = Math.abs(sourceCentralLevel - targetCentralLevel);

    if (levelDistance === 0) {
      adjustment += 26;
    }

    if (levelDistance === 1) {
      adjustment += 4;
    }

    if (levelDistance === 2) {
      adjustment -= 120;
    }
  }

  if (
    sourceProfile.family === "attacking-midfielder" &&
    targetFamily === "defensive-midfielder"
  ) {
    adjustment -= 80;
  }

  if (
    sourceProfile.family === "defensive-midfielder" &&
    targetFamily === "attacking-midfielder"
  ) {
    adjustment -= 95;
  }

  if (
    (sourceProfile.family === "winger" ||
      sourceProfile.family === "wide-midfielder") &&
    (targetFamily === "winger" || targetFamily === "wide-midfielder")
  ) {
    adjustment += 18;
  }

  if (
    (sourceProfile.family === "wide-back" ||
      sourceProfile.family === "wing-back") &&
    (targetFamily === "wide-back" ||
      targetFamily === "wing-back" ||
      targetFamily === "wide-midfielder")
  ) {
    adjustment += 18;
  }

  if (
    sourceProfile.family === "center-back" &&
    targetFamily !== "center-back"
  ) {
    adjustment -= 75;
  }

  if (
    sourceProfile.family === "striker" &&
    targetFamily !== "striker" &&
    targetFamily !== "attacking-midfielder"
  ) {
    adjustment -= 90;
  }

  return adjustment;
}

function filterHiddenForSlot(
  candidates: SlotCandidate[],
  hiddenTopCandidateKeys: Record<string, string[]>,
  view: TacticalView,
  slotId: string,
  lockedCandidateKey = ""
) {
  const hiddenForSlot = new Set(
    hiddenTopCandidateKeys[getPhaseSlotKey(view, slotId)] ?? []
  );

  return candidates.filter((candidate) => {
    if (candidate.key === lockedCandidateKey) {
      return true;
    }

    return !hiddenForSlot.has(candidate.key);
  });
}

function filterOnlyNaturalIfNeeded(
  candidates: SlotCandidate[],
  topOnlyNatural: boolean
) {
  if (!topOnlyNatural) {
    return candidates;
  }

  return candidates.filter((candidate) => candidate.candidateKind === "natural");
}

export function useSquadBuilderSuggestions({
  rows,
  withBallSlots,
  withoutBallSlots,
  tacticalView,
  onlySelected,
  topOnlyNatural,
  scoreMode,
  getPlayerMark,
}: UseSquadBuilderSuggestionsParams) {
  const [hiddenTopCandidateKeys, setHiddenTopCandidateKeys] = useState<
    Record<string, string[]>
  >(() =>
    loadLocalStorageValue<Record<string, string[]>>(
      SQUAD_BUILDER_HIDDEN_TOP_STORAGE_KEY,
      {}
    )
  );

  const [lockedSlotCandidateKeys, setLockedSlotCandidateKeys] = useState<
    Record<string, string>
  >(() =>
    loadLocalStorageValue<Record<string, string>>(
      SQUAD_BUILDER_LOCKED_SLOTS_STORAGE_KEY,
      {}
    )
  );

  useEffect(() => {
    saveLocalStorageValue(
      SQUAD_BUILDER_HIDDEN_TOP_STORAGE_KEY,
      hiddenTopCandidateKeys
    );
  }, [hiddenTopCandidateKeys]);

  useEffect(() => {
    saveLocalStorageValue(
      SQUAD_BUILDER_LOCKED_SLOTS_STORAGE_KEY,
      lockedSlotCandidateKeys
    );
  }, [lockedSlotCandidateKeys]);

  const availableRows = useMemo(() => {
    return rows.filter((row) => {
      const mark = getPlayerMark?.(row) ?? null;

      if (mark === "rejected") {
        return false;
      }

      if (onlySelected && mark !== "selected") {
        return false;
      }

      return true;
    });
  }, [rows, getPlayerMark, onlySelected]);

  const withBallLockedSlotCandidateKeys = useMemo(() => {
    const result: Record<string, string> = {};

    for (const slot of withBallSlots) {
      const lockedKey =
        lockedSlotCandidateKeys[getPhaseSlotKey("with-ball", slot.id)];

      if (lockedKey) {
        result[slot.id] = lockedKey;
      }
    }

    return result;
  }, [withBallSlots, lockedSlotCandidateKeys]);

  const withoutBallLockedSlotCandidateKeys = useMemo(() => {
    const result: Record<string, string> = {};

    for (const slot of withoutBallSlots) {
      const lockedKey =
        lockedSlotCandidateKeys[getPhaseSlotKey("without-ball", slot.id)];

      if (lockedKey) {
        result[slot.id] = lockedKey;
      }
    }

    return result;
  }, [withoutBallSlots, lockedSlotCandidateKeys]);

  const candidatesBySlotWithBall = useMemo(() => {
    const baseCandidates = buildCandidatesBySlot(availableRows, withBallSlots, {
      topOnlyNatural: false,
      scoreMode,
    });

    const result: Record<string, SlotCandidate[]> = {};

    for (const slot of withBallSlots) {
      const visibleCandidates = filterHiddenForSlot(
        baseCandidates[slot.id] ?? [],
        hiddenTopCandidateKeys,
        "with-ball",
        slot.id,
        withBallLockedSlotCandidateKeys[slot.id] ?? ""
      );

      result[slot.id] = sortCandidatesForMode(
        visibleCandidates.map((candidate) =>
          withScoreModeSelectionScore(candidate, scoreMode)
        ),
        scoreMode
      );
    }

    return result;
  }, [
    availableRows,
    withBallSlots,
    hiddenTopCandidateKeys,
    withBallLockedSlotCandidateKeys,
    scoreMode,
  ]);

  const suggestedSquadWithBall = useMemo(() => {
    return solveLineupFromCandidates(
      withBallSlots,
      candidatesBySlotWithBall,
      withBallLockedSlotCandidateKeys
    );
  }, [withBallSlots, candidatesBySlotWithBall, withBallLockedSlotCandidateKeys]);

  const selectedXiRows = useMemo(() => {
    return getLineupRows(suggestedSquadWithBall);
  }, [suggestedSquadWithBall]);

  const withBallProfileByPlayerKey = useMemo(() => {
    const result = new Map<string, WithBallPlayerSlotProfile>();

    for (const slot of withBallSlots) {
      const candidate = suggestedSquadWithBall[slot.id];

      if (!candidate) {
        continue;
      }

      result.set(candidate.key, {
        side: getSlotSide(slot),
        family: getSlotFamily(slot),
        slotLabel: slot.label,
        slotPositionGroup: slot.positionGroup,
      });
    }

    return result;
  }, [withBallSlots, suggestedSquadWithBall]);

  const candidatesBySlotWithoutBallForLineup = useMemo(() => {
    const baseCandidates = buildCandidatesBySlot(
      selectedXiRows,
      withoutBallSlots,
      {
        topOnlyNatural: false,
        scoreMode,
      }
    );

    const result: Record<string, SlotCandidate[]> = {};

    for (const slot of withoutBallSlots) {
      const visibleForSlot = filterHiddenForSlot(
        baseCandidates[slot.id] ?? [],
        hiddenTopCandidateKeys,
        "without-ball",
        slot.id,
        withoutBallLockedSlotCandidateKeys[slot.id] ?? ""
      );

      result[slot.id] = sortCandidatesForMode(
        visibleForSlot.map((candidate) => {
          const transitionAdjustment = getTransitionSelectionAdjustment(
            candidate,
            slot,
            withBallProfileByPlayerKey
          );

          return withScoreModeSelectionScore(
            candidate,
            scoreMode,
            transitionAdjustment
          );
        }),
        scoreMode
      );
    }

    return result;
  }, [
    selectedXiRows,
    withoutBallSlots,
    hiddenTopCandidateKeys,
    withoutBallLockedSlotCandidateKeys,
    withBallProfileByPlayerKey,
    scoreMode,
  ]);

  const candidatesBySlotWithoutBallForTop = useMemo(() => {
    const baseCandidates = buildCandidatesBySlot(
      availableRows,
      withoutBallSlots,
      {
        topOnlyNatural: false,
        scoreMode,
      }
    );

    const result: Record<string, SlotCandidate[]> = {};

    for (const slot of withoutBallSlots) {
      const visibleCandidates = filterHiddenForSlot(
        baseCandidates[slot.id] ?? [],
        hiddenTopCandidateKeys,
        "without-ball",
        slot.id,
        withoutBallLockedSlotCandidateKeys[slot.id] ?? ""
      );

      result[slot.id] = sortCandidatesForMode(
        visibleCandidates.map((candidate) =>
          withScoreModeSelectionScore(candidate, scoreMode)
        ),
        scoreMode
      );
    }

    return result;
  }, [
    availableRows,
    withoutBallSlots,
    hiddenTopCandidateKeys,
    withoutBallLockedSlotCandidateKeys,
    scoreMode,
  ]);

  const suggestedSquadWithoutBall = useMemo(() => {
    return solveLineupFromCandidates(
      withoutBallSlots,
      candidatesBySlotWithoutBallForLineup,
      withoutBallLockedSlotCandidateKeys
    );
  }, [
    withoutBallSlots,
    candidatesBySlotWithoutBallForLineup,
    withoutBallLockedSlotCandidateKeys,
  ]);

  const candidatesBySlot =
    tacticalView === "with-ball"
      ? candidatesBySlotWithBall
      : candidatesBySlotWithoutBallForTop;

  const suggestedSquad =
    tacticalView === "with-ball"
      ? suggestedSquadWithBall
      : suggestedSquadWithoutBall;

  const activeSlots =
    tacticalView === "with-ball" ? withBallSlots : withoutBallSlots;

  const assignedSlotByPlayerKey = useMemo(() => {
    const result = new Map<string, string>();

    for (const slot of activeSlots) {
      const candidate = suggestedSquad[slot.id];

      if (candidate) {
        result.set(candidate.key, slot.label);
      }
    }

    return result;
  }, [activeSlots, suggestedSquad]);

  const hiddenTopCount = useMemo(() => {
    const hiddenLists = Object.values(hiddenTopCandidateKeys) as string[][];

    return hiddenLists.reduce((sum, hiddenKeys) => sum + hiddenKeys.length, 0);
  }, [hiddenTopCandidateKeys]);

  function toggleSlotCandidateLock(
    slotId: string,
    candidateKey: string,
    view: TacticalView = tacticalView
  ) {
    const lockKey = getPhaseSlotKey(view, slotId);

    setLockedSlotCandidateKeys((current) => {
      if (current[lockKey] === candidateKey) {
        const next = { ...current };
        delete next[lockKey];
        return next;
      }

      return {
        ...current,
        [lockKey]: candidateKey,
      };
    });
  }

  function clearLockedSlotCandidate(
    slotId: string,
    view: TacticalView = tacticalView
  ) {
    const lockKey = getPhaseSlotKey(view, slotId);

    setLockedSlotCandidateKeys((current) => {
      if (!current[lockKey]) {
        return current;
      }

      const next = { ...current };
      delete next[lockKey];
      return next;
    });
  }

  function clearLockedSlotCandidates() {
    setLockedSlotCandidateKeys({});
  }

  function hideTopCandidate(
    slotId: string,
    candidateKey: string,
    view: TacticalView = tacticalView
  ) {
    const hiddenKey = getPhaseSlotKey(view, slotId);

    setHiddenTopCandidateKeys((current) => {
      const currentForSlot = current[hiddenKey] ?? [];

      if (currentForSlot.includes(candidateKey)) {
        return current;
      }

      return {
        ...current,
        [hiddenKey]: [...currentForSlot, candidateKey],
      };
    });
  }

  function clearHiddenTopCandidates() {
    setHiddenTopCandidateKeys({});
  }

  function getVisibleTopCandidates(
    slot: FormationSlot,
    limit = 3,
    view: TacticalView = tacticalView
  ) {
    const sourceCandidates =
      view === "with-ball"
        ? candidatesBySlotWithBall[slot.id] ?? []
        : candidatesBySlotWithoutBallForTop[slot.id] ?? [];

    const sourceLineup =
      view === "with-ball" ? suggestedSquadWithBall : suggestedSquadWithoutBall;

    const usedPlayerKeys = new Set(
      getLineupCandidates(sourceLineup)
        .filter((candidate) => sourceLineup[slot.id]?.key !== candidate.key)
        .map((candidate) => candidate.key)
    );

    return filterOnlyNaturalIfNeeded(
      sourceCandidates
        .filter((candidate) => !usedPlayerKeys.has(candidate.key))
        .filter((candidate) => {
          const hiddenForSlot = new Set(
            hiddenTopCandidateKeys[getPhaseSlotKey(view, slot.id)] ?? []
          );

          return !hiddenForSlot.has(candidate.key);
        }),
      topOnlyNatural
    ).slice(0, limit);
  }

  function getLockedCandidateKey(
    slotId: string,
    view: TacticalView = tacticalView
  ) {
    return lockedSlotCandidateKeys[getPhaseSlotKey(view, slotId)] ?? "";
  }

  return {
    availableRows,

    candidatesBySlot,
    candidatesBySlotWithBall,
    candidatesBySlotWithoutBall: candidatesBySlotWithoutBallForTop,

    suggestedSquad,
    suggestedSquadWithBall,
    suggestedSquadWithoutBall,

    assignedSlotByPlayerKey,

    hiddenTopCount,
    hiddenTopCandidateKeys,
    lockedSlotCandidateKeys,

    getVisibleTopCandidates,
    getLockedCandidateKey,

    toggleSlotCandidateLock,
    clearLockedSlotCandidate,
    clearLockedSlotCandidates,

    hideTopCandidate,
    clearHiddenTopCandidates,
  };
}