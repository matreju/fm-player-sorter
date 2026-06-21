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
  scorePlayerMobilityToSlot,
  type PositionFamily,
  type SlotSide,
} from "../../utils/squadBuilderMobility";
import type { TacticalView } from "../../utils/squadBuilderTacticalView";
import { compareCandidatesForMode } from "../../utils/squadBuilderScoreMode";
import { scorePlayerForSlot } from "../../utils/squadBuilderScoring";

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
function getSlotLane(label: string): SlotSide {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .toUpperCase();

  if (normalized.startsWith("L")) {
    return "left";
  }

  if (normalized.startsWith("P")) {
    return "right";
  }

  return "center";
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

  const targetSide = getSlotSide(targetSlot);
  const targetFamily = getSlotFamily(targetSlot);
  const sourceSide = sourceProfile.side;
  const sourceFamily = sourceProfile.family;

  const sourceLane = getSlotLane(sourceProfile.slotLabel);
  const targetLane = getSlotLane(targetSlot.label);

  let adjustment = 0;

  if (sourceProfile.slotLabel === targetSlot.label) {
    adjustment += 500;
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

  if (sourceFamily === "goalkeeper") {
    return targetFamily === "goalkeeper" ? 1000 : null;
  }

  if (targetFamily === "goalkeeper") {
    return null;
  }

  if (sourceFamily === targetFamily) {
    adjustment += 180;
  }

  if (
    areCentralFamilies(sourceFamily, targetFamily)
  ) {
    const sourceCentralLevel = getCentralFamilyLevel(sourceFamily);
    const targetCentralLevel = getCentralFamilyLevel(targetFamily);

    if (sourceCentralLevel === null || targetCentralLevel === null) {
      return null;
    }

    const levelDistance = Math.abs(sourceCentralLevel - targetCentralLevel);

    if (levelDistance === 0) {
      adjustment += 170;
    } else if (levelDistance === 1) {
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
    if (sourceLane === targetLane) {
      adjustment += 90;
    }
  }

  if (sourceLane === "center" && targetLane !== "center") {
    adjustment -= 35;
  }

  if (sourceLane !== "center" && targetLane === "center") {
    adjustment -= 25;
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

function buildDirectCandidateForSlot(
  row: TableRow,
  slot: FormationSlot
): SlotCandidate | null {
  const candidate = scorePlayerForSlot(row, slot);

  if (!candidate) {
    return null;
  }

  if (slot.positionGroup === "Bramkarz") {
    return candidate;
  }

  const mobility = scorePlayerMobilityToSlot(row, slot);

  if (mobility.kind === "blocked") {
    return null;
  }

  return {
    ...candidate,
    mobilityScore: mobility.score,
    sideScore: mobility.score,
    candidateKind: mobility.kind,
    candidateKindLabel: mobility.reason,
  };
}

function buildDirectCandidatesForSlot(
  rows: TableRow[],
  slot: FormationSlot
): SlotCandidate[] {
  return rows.reduce<SlotCandidate[]>((acc, row) => {
    const candidate = buildDirectCandidateForSlot(row, slot);

    if (candidate) {
      acc.push(candidate);
    }

    return acc;
  }, []);
}
function isCentralFamily(family: PositionFamily): boolean {
  return (
    family === "defensive-midfielder" ||
    family === "central-midfielder" ||
    family === "attacking-midfielder"
  );
}

function getCentralFamilyLevelForTransition(family: PositionFamily): number | null {
  if (family === "defensive-midfielder") return 0;
  if (family === "central-midfielder") return 1;
  if (family === "attacking-midfielder") return 2;
  return null;
}

function getPhysicalTransitionScore(
  sourceSlot: FormationSlot,
  targetSlot: FormationSlot
): number {
  if (sourceSlot.id === targetSlot.id) {
    return 10000;
  }

  const sourceFamily = getSlotFamily(sourceSlot);
  const targetFamily = getSlotFamily(targetSlot);
  const sourceSide = getSlotSide(sourceSlot);
  const targetSide = getSlotSide(targetSlot);

  if (targetFamily === "goalkeeper") {
    return sourceFamily === "goalkeeper" ? 9000 : -9999;
  }

  if (targetFamily === "striker") {
    if (sourceFamily === "striker") return 9000;
    if (sourceFamily === "attacking-midfielder") return 450;
    return -9999;
  }

  if (targetSide !== "center") {
    if (sourceSide !== targetSide) {
      return -9999;
    }

    if (targetFamily === "wide-midfielder") {
      if (sourceFamily === "winger") return 900;
      if (sourceFamily === "wide-midfielder") return 850;
      if (sourceFamily === "wing-back") return 650;
      if (sourceFamily === "wide-back") return 600;
      return -9999;
    }

    if (targetFamily === "winger") {
      if (sourceFamily === "winger") return 900;
      if (sourceFamily === "wide-midfielder") return 760;
      return -9999;
    }

    if (targetFamily === "wing-back") {
      if (sourceFamily === "wide-back") return 860;
      if (sourceFamily === "wing-back") return 840;
      if (sourceFamily === "wide-midfielder") return 650;
      if (sourceFamily === "winger") return 560;
      return -9999;
    }

    if (targetFamily === "wide-back") {
      if (sourceFamily === "wide-back") return 900;
      if (sourceFamily === "wing-back") return 820;
      if (sourceFamily === "wide-midfielder") return 520;
      return -9999;
    }

    if (targetFamily === "center-back") {
      if (sourceFamily === "center-back") return 780;
      if (sourceFamily === "wide-back") return 500;
      return -9999;
    }
  }

  if (targetSide === "center") {
    if (sourceSide !== "center") {
      return -9999;
    }

    if (sourceFamily === targetFamily) {
      return 900;
    }

    if (isCentralFamily(sourceFamily) && isCentralFamily(targetFamily)) {
      const sourceLevel = getCentralFamilyLevelForTransition(sourceFamily);
      const targetLevel = getCentralFamilyLevelForTransition(targetFamily);

      if (sourceLevel === null || targetLevel === null) {
        return -9999;
      }

      const distance = Math.abs(sourceLevel - targetLevel);

      if (distance === 1) {
        return 420;
      }

      return -9999;
    }

    if (targetFamily === "center-back" && sourceFamily === "defensive-midfielder") {
      return 360;
    }

    if (targetFamily === "defensive-midfielder" && sourceFamily === "center-back") {
      return 320;
    }
  }

  return -9999;
}

function findPhysicalSourceSlotForWithoutBallSlot(
  targetSlot: FormationSlot,
  sourceSlots: FormationSlot[],
  usedSourceSlotIds: Set<string>
): FormationSlot | null {
  const candidates = sourceSlots
    .filter((sourceSlot) => !usedSourceSlotIds.has(sourceSlot.id))
    .map((sourceSlot) => ({
      sourceSlot,
      score: getPhysicalTransitionScore(sourceSlot, targetSlot),
    }))
    .filter((candidate) => candidate.score > -9999)
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.sourceSlot ?? null;
}

function buildMappedWithoutBallCandidate(
  sourceCandidate: SlotCandidate,
  targetSlot: FormationSlot
): SlotCandidate {
  const scoredCandidate = scorePlayerForSlot(sourceCandidate.row, targetSlot);

  if (scoredCandidate) {
    return {
      ...scoredCandidate,
      withBallScore: sourceCandidate.finalScore,
      withoutBallScore: scoredCandidate.finalScore,
      candidateKindLabel: `${sourceCandidate.roleResult.role.positionGroup} z fazy przy piłce → ${targetSlot.label}`,
    };
  }

  return {
    ...sourceCandidate,
    phaseScore: sourceCandidate.finalScore,
    withBallScore: sourceCandidate.finalScore,
    withoutBallScore: sourceCandidate.finalScore,
    candidateKind: "conversion",
    candidateKindLabel: `Ten sam zawodnik z fazy przy piłce → ${targetSlot.label}`,
  };
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
  const result: Record<string, SlotCandidate[]> = {};

  for (const slot of withBallSlots) {
    const directCandidates = buildDirectCandidatesForSlot(availableRows, slot);

    const visibleCandidates = filterHiddenForSlot(
      directCandidates,
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

result[slot.id] = sortCandidatesForMode(adjustedCandidates, scoreMode);
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
  return candidatesBySlotWithoutBallForLineup;
}, [candidatesBySlotWithoutBallForLineup]);

const suggestedSquadWithoutBall = useMemo(() => {
  const result: Record<string, SlotCandidate | null> = {};
  const usedSourceSlotIds = new Set<string>();

  for (const withoutBallSlot of withoutBallSlots) {
    const lockedKey =
      withoutBallLockedSlotCandidateKeys[withoutBallSlot.id] ?? "";

    if (lockedKey) {
      const lockedCandidate =
        candidatesBySlotWithoutBallForLineup[withoutBallSlot.id]?.find(
          (candidate) => candidate.key === lockedKey
        ) ?? null;

      result[withoutBallSlot.id] = lockedCandidate;
      continue;
    }

    const sourceSlot = findPhysicalSourceSlotForWithoutBallSlot(
      withoutBallSlot,
      withBallSlots,
      usedSourceSlotIds
    );

    if (!sourceSlot) {
      result[withoutBallSlot.id] = null;
      continue;
    }

    const sourceCandidate = suggestedSquadWithBall[sourceSlot.id];

    if (!sourceCandidate) {
      result[withoutBallSlot.id] = null;
      continue;
    }

    usedSourceSlotIds.add(sourceSlot.id);

    result[withoutBallSlot.id] = buildMappedWithoutBallCandidate(
      sourceCandidate,
      withoutBallSlot
    );
  }

  return result;
}, [
  withoutBallSlots,
  withBallSlots,
  suggestedSquadWithBall,
  withoutBallLockedSlotCandidateKeys,
  candidatesBySlotWithoutBallForLineup,
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
): SlotCandidate[] {
  const currentSlot =
    view === "with-ball"
      ? withBallSlots.find((candidateSlot) => candidateSlot.id === slot.id) ?? slot
      : withoutBallSlots.find((candidateSlot) => candidateSlot.id === slot.id) ?? slot;

  const rowsForTop = view === "with-ball" ? availableRows : selectedXiRows;

  const hiddenForSlot = new Set(
    hiddenTopCandidateKeys[getPhaseSlotKey(view, currentSlot.id)] ?? []
  );

  const rawCandidates = rowsForTop.reduce<SlotCandidate[]>((acc, row) => {
    const candidate = scorePlayerForSlot(row, currentSlot);

    if (!candidate) {
      return acc;
    }

    if (hiddenForSlot.has(candidate.key)) {
      return acc;
    }

    if (topOnlyNatural && candidate.candidateKind !== "natural") {
      return acc;
    }

    acc.push(candidate);
    return acc;
  }, []);

  return rawCandidates
    .sort((left, right) => compareCandidatesForMode(left, right, scoreMode))
    .slice(0, limit);
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