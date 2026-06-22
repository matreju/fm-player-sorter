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

function getCandidateSelectionScore(candidate: SlotCandidate): number {
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
): number {
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

function sortCandidatesForLineup(
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

function sortCandidatesForDisplay(
  candidates: SlotCandidate[],
  scoreMode: SquadBuilderScoreMode
): SlotCandidate[] {
  return [...candidates].sort((left, right) =>
    compareCandidatesForMode(left, right, scoreMode)
  );
}

function filterHiddenForSlot(
  candidates: SlotCandidate[],
  hiddenTopCandidateKeys: Record<string, string[]>,
  view: TacticalView,
  slotId: string
): SlotCandidate[] {
  const hiddenForSlot = new Set(
    hiddenTopCandidateKeys[getPhaseSlotKey(view, slotId)] ?? []
  );

  return candidates.filter((candidate) => !hiddenForSlot.has(candidate.key));
}
function filterOnlyNaturalIfNeeded(
  candidates: SlotCandidate[],
  topOnlyNatural: boolean
): SlotCandidate[] {
  if (!topOnlyNatural) {
    return candidates;
  }

  return candidates.filter((candidate) => candidate.candidateKind === "natural");
}

function normalizeSlotLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .toUpperCase();
}

function getSlotLane(slot: FormationSlot | { slotLabel: string }): SlotSide {
  const label =
    "slotLabel" in slot ? slot.slotLabel : slot.label;

  const normalized = normalizeSlotLabel(label);

  if (normalized.startsWith("L")) {
    return "left";
  }

  if (normalized.startsWith("P")) {
    return "right";
  }

  return "center";
}

function getSlotFamilySafe(slot: FormationSlot): PositionFamily {
  if (slot.positionGroup === "Bramkarz") {
    return "goalkeeper";
  }

  return getSlotFamily(slot);
}

function getCentralFamilyLevel(family: PositionFamily): number | null {
  if (family === "defensive-midfielder") return 0;
  if (family === "central-midfielder") return 1;
  if (family === "attacking-midfielder") return 2;

  return null;
}

function areCentralFamilies(left: PositionFamily, right: PositionFamily) {
  return getCentralFamilyLevel(left) !== null && getCentralFamilyLevel(right) !== null;
}

function getTransitionSelectionAdjustment(
  candidate: SlotCandidate,
  targetSlot: FormationSlot,
  withBallProfileByPlayerKey: Map<string, WithBallPlayerSlotProfile>
): number | null {
  const sourceProfile = withBallProfileByPlayerKey.get(candidate.key);

  if (!sourceProfile) {
    return null;
  }

  const sourceFamily = sourceProfile.family;
  const targetFamily = getSlotFamilySafe(targetSlot);

  const sourceSide = sourceProfile.side;
  const targetSide = getSlotSide(targetSlot);

  const sourceLane = getSlotLane({
    slotLabel: sourceProfile.slotLabel,
  });
  const targetLane = getSlotLane(targetSlot);

  let adjustment = 0;

  if (sourceProfile.slotLabel === targetSlot.label) {
    adjustment += 500;
  }

  if (sourceFamily === "goalkeeper") {
    return targetFamily === "goalkeeper" ? 1000 : null;
  }

  if (targetFamily === "goalkeeper") {
    return null;
  }

  if (
    sourceLane !== "center" &&
    targetLane !== "center" &&
    sourceLane !== targetLane
  ) {
    return null;
  }

  if (
    sourceSide !== "center" &&
    targetSide !== "center" &&
    sourceSide !== targetSide
  ) {
    return null;
  }

  if (sourceFamily === targetFamily) {
    adjustment += 180;
  }

  if (areCentralFamilies(sourceFamily, targetFamily)) {
    const sourceLevel = getCentralFamilyLevel(sourceFamily);
    const targetLevel = getCentralFamilyLevel(targetFamily);

    if (sourceLevel === null || targetLevel === null) {
      return null;
    }

    const distance = Math.abs(sourceLevel - targetLevel);

    if (distance === 0) {
      adjustment += 170;
    } else if (distance === 1) {
      adjustment += 75;
    } else {
      return null;
    }
  }

  if (sourceFamily === "striker") {
    if (targetFamily === "striker") {
      adjustment += 250;
    } else if (targetFamily === "attacking-midfielder") {
      adjustment += 80;
    } else if (targetFamily === "winger") {
      adjustment += 35;
    } else {
      return null;
    }
  }

  if (sourceFamily === "attacking-midfielder") {
    if (targetFamily === "striker") {
      adjustment += 70;
    } else if (targetFamily === "central-midfielder") {
      adjustment += 80;
    } else if (
      targetFamily === "winger" ||
      targetFamily === "wide-midfielder"
    ) {
      adjustment += 45;
    } else if (targetFamily === "defensive-midfielder") {
      return null;
    }
  }

  if (sourceFamily === "central-midfielder") {
    if (targetFamily === "defensive-midfielder") {
      adjustment += 70;
    } else if (targetFamily === "attacking-midfielder") {
      adjustment += 65;
    } else if (
      targetFamily === "wide-midfielder" ||
      targetFamily === "winger"
    ) {
      adjustment += 28;
    } else if (targetFamily === "center-back") {
      return null;
    }
  }

  if (sourceFamily === "defensive-midfielder") {
    if (targetFamily === "central-midfielder") {
      adjustment += 80;
    } else if (targetFamily === "center-back") {
      adjustment += 55;
    } else if (
      targetFamily === "attacking-midfielder" ||
      targetFamily === "winger" ||
      targetFamily === "wide-midfielder" ||
      targetFamily === "striker"
    ) {
      return null;
    }
  }

  if (sourceFamily === "center-back") {
    if (targetFamily === "center-back") {
      adjustment += 220;
    } else if (targetFamily === "defensive-midfielder") {
      adjustment += 35;
    } else {
      return null;
    }
  }

  if (sourceFamily === "wide-back") {
    if (targetFamily === "wide-back") {
      adjustment += 230;
    } else if (targetFamily === "wing-back") {
      adjustment += 130;
    } else if (targetFamily === "wide-midfielder") {
      adjustment += 65;
    } else if (targetFamily === "center-back") {
      adjustment += 30;
    } else {
      return null;
    }
  }

  if (sourceFamily === "wing-back") {
    if (targetFamily === "wide-back") {
      adjustment += 150;
    } else if (targetFamily === "wing-back") {
      adjustment += 220;
    } else if (targetFamily === "wide-midfielder") {
      adjustment += 110;
    } else if (targetFamily === "winger") {
      adjustment += 65;
    } else if (targetFamily === "center-back") {
      adjustment += 20;
    } else {
      return null;
    }
  }

  if (sourceFamily === "wide-midfielder") {
    if (targetFamily === "wide-midfielder") {
      adjustment += 210;
    } else if (targetFamily === "winger") {
      adjustment += 130;
    } else if (targetFamily === "wing-back") {
      adjustment += 65;
    } else if (targetFamily === "wide-back") {
      adjustment += 35;
    } else if (targetFamily === "attacking-midfielder") {
      adjustment += 45;
    } else if (targetFamily === "central-midfielder") {
      adjustment += 25;
    } else {
      return null;
    }
  }

  if (sourceFamily === "winger") {
    if (targetFamily === "winger") {
      adjustment += 220;
    } else if (targetFamily === "wide-midfielder") {
      adjustment += 150;
    } else if (targetFamily === "attacking-midfielder") {
      adjustment += 65;
    } else if (targetFamily === "central-midfielder") {
      adjustment += 30;
    } else if (targetFamily === "wing-back") {
      adjustment += 25;
    } else {
      return null;
    }
  }

  if (sourceLane !== "center" && targetLane !== "center") {
    adjustment += sourceLane === targetLane ? 90 : 0;
  }

  if (sourceLane === "center" && targetLane !== "center") {
    adjustment -= 35;
  }

  if (sourceLane !== "center" && targetLane === "center") {
    adjustment -= 25;
  }

  return adjustment;
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

  useEffect(() => {
    saveLocalStorageValue(
      SQUAD_BUILDER_HIDDEN_TOP_STORAGE_KEY,
      hiddenTopCandidateKeys
    );
  }, [hiddenTopCandidateKeys]);


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
      slot.id
    );

    result[slot.id] = sortCandidatesForLineup(
      visibleCandidates.map((candidate) =>
        withScoreModeSelectionScore(candidate, scoreMode)
      ),
      scoreMode
    );
  }

  return result;
}, [availableRows, withBallSlots, hiddenTopCandidateKeys, scoreMode]);
const suggestedSquadWithBall = useMemo(() => {
  return solveLineupFromCandidates(withBallSlots, candidatesBySlotWithBall);
}, [withBallSlots, candidatesBySlotWithBall]);
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
        family: getSlotFamilySafe(slot),
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
      slot.id
    );

    const adjustedCandidates = visibleForSlot.reduce<SlotCandidate[]>(
  (acc, candidate) => {
    const transitionAdjustment = getTransitionSelectionAdjustment(
      candidate,
      slot,
      withBallProfileByPlayerKey
    );

    if (transitionAdjustment === null) {
      return acc;
    }

    acc.push(
      withScoreModeSelectionScore(
        candidate,
        scoreMode,
        transitionAdjustment
      )
    );

    return acc;
  },
  []
);

    result[slot.id] = sortCandidatesForLineup(adjustedCandidates, scoreMode);
  }

  return result;
}, [
  selectedXiRows,
  withoutBallSlots,
  hiddenTopCandidateKeys,
  withBallProfileByPlayerKey,
  scoreMode,
]);
const candidatesBySlotWithoutBallForTop = useMemo(() => {
  return candidatesBySlotWithoutBallForLineup;
}, [candidatesBySlotWithoutBallForLineup]);

const suggestedSquadWithoutBall = useMemo(() => {
  return solveLineupFromCandidates(
    withoutBallSlots,
    candidatesBySlotWithoutBallForLineup
  );
}, [withoutBallSlots, candidatesBySlotWithoutBallForLineup]);
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

  const hiddenForSlot = new Set(
    hiddenTopCandidateKeys[getPhaseSlotKey(view, slot.id)] ?? []
  );

  return sortCandidatesForDisplay(
    filterOnlyNaturalIfNeeded(
      sourceCandidates
        .filter((candidate) => !usedPlayerKeys.has(candidate.key))
        .filter((candidate) => !hiddenForSlot.has(candidate.key)),
      topOnlyNatural
    ),
    scoreMode
  ).slice(0, limit);
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

  getVisibleTopCandidates,

  hideTopCandidate,
  clearHiddenTopCandidates,
};
}