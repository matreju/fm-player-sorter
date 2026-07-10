import { useEffect, useMemo, useRef, useState } from "react";
import type {
  FormationSlot,
  PlayerMark,
  SlotCandidate,
  SlotCandidateRankingBreakdown,
  SquadBuilderScoreMode,
} from "../../types/squadBuilderTypes";
import type { TableRow } from "../../types/table";
import {
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
import {
  compareCandidatesForMode,
  getCandidateScoreForMode,
} from "../../utils/squadBuilderScoreMode";
import {
  getCampaignPositionCallUpsForSlot,
  type CampaignCallUpsByPlayerKey,
} from "../../utils/squadBuilderCampaignCallups";
import { getPlayerKey } from "../../utils/playerIdentity";
import {
  createSquadBuilderScoringContext,
  scorePlayerForSlot,
  type SquadBuilderScoringContext,
} from "../../utils/squadBuilderScoring";

const SQUAD_BUILDER_HIDDEN_TOP_STORAGE_KEY =
  "fm-player-sorter-squad-builder-hidden-top-v4";

const GLOBAL_HIDDEN_TOP_KEY = "__global__";

type UseSquadBuilderSuggestionsParams = {
  rows: TableRow[];
  playerMarks?: Record<string, PlayerMark>;
  selectedPositionByPlayerKey?: Record<string, string>;
  campaignCallUpsByPlayerKey?: CampaignCallUpsByPlayerKey;
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
  rankingBreakdown?: SlotCandidateRankingBreakdown;
};

type WithBallPlayerSlotProfile = {
  side: SlotSide;
  family: PositionFamily;
  slotLabel: string;
  slotPositionGroup: string;
};
function buildCandidatesBySlotWithScoringContext(
  rows: TableRow[],
  slots: FormationSlot[],
  scoringContext: SquadBuilderScoringContext
): Record<string, SlotCandidate[]> {
  const result: Record<string, SlotCandidate[]> = {};

  for (const slot of slots) {
    const slotCandidates: SlotCandidate[] = [];

    for (const row of rows) {
      const candidate = scorePlayerForSlot(row, slot, scoringContext);

      if (candidate) {
        slotCandidates.push(candidate);
      }
    }

    result[slot.id] = slotCandidates;
  }

  return result;
}
function buildSelectionFilterSignature(
  playerMarks: Record<string, PlayerMark>,
  onlySelected: boolean
): string {
  const rejectedKeys: string[] = [];
  const selectedKeys: string[] = [];

  for (const [playerKey, mark] of Object.entries(playerMarks)) {
    if (mark === "rejected") {
      rejectedKeys.push(playerKey);
      continue;
    }

    if (onlySelected && mark === "selected") {
      selectedKeys.push(playerKey);
    }
  }

  rejectedKeys.sort();
  selectedKeys.sort();

  return `${onlySelected ? selectedKeys.join("|") : ""}::${rejectedKeys.join(
    "|"
  )}`;
}

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

function withSelectionScore(
  candidate: SlotCandidate,
  nextSelectionScore: number,
  rankingBreakdown?: SlotCandidateRankingBreakdown
): SlotCandidate {
  return {
    ...candidate,
    selectionScore: nextSelectionScore,
    rankingBreakdown,
  } as SlotCandidate;
}

function getCandidateKindPriority(candidate: SlotCandidate): number {
  if (candidate.candidateKind === "natural") return 3;
  if (candidate.candidateKind === "close") return 2;
  return 1;
}
function normalizeCallUpPosition(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .toLowerCase()
    .trim();
}

function getCloseCallUpPositions(positionGroup: string): string[] {
  const normalized = normalizeCallUpPosition(positionGroup);

  const closePositions: Record<string, string[]> = {
    "bramkarz": [],
    "srodkowy obronca": ["defensywny pomocnik", "boczny obronca"],
    "boczny obronca": ["wahadlowy", "srodkowy obronca"],
    "wahadlowy": ["boczny obronca", "boczny pomocnik"],
    "defensywny pomocnik": ["srodkowy pomocnik", "srodkowy obronca"],
    "srodkowy pomocnik": ["defensywny pomocnik", "ofensywny pomocnik"],
    "ofensywny pomocnik": ["srodkowy pomocnik", "skrzydlowy", "napastnik"],
    "boczny pomocnik": ["skrzydlowy", "wahadlowy", "boczny obronca"],
    "skrzydlowy": ["boczny pomocnik", "ofensywny pomocnik", "napastnik"],
    "napastnik": ["ofensywny pomocnik", "skrzydlowy"],
  };

  return closePositions[normalized] ?? [];
}

function getCallUpPositionAdjustment(): number {
  return 0;
}
function getBestNaturalScore(candidates: SlotCandidate[]): number | null {
  let best: number | null = null;

  for (const candidate of candidates) {
    if (candidate.candidateKind !== "natural") {
      continue;
    }

    if (best === null || candidate.finalScore > best) {
      best = candidate.finalScore;
    }
  }

  return best;
}

function getNaturalSelectionAdjustment(
  _candidate: SlotCandidate,
  _slotCandidates: SlotCandidate[]
): number {
  // Naturalność nie daje już punktów rankingowych.
  // Ma być tylko informacją wizualną: Naturalny / Bliski / Awaryjnie.
  return 0;
}
function roundRankingPart(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildRankingBreakdown(
  candidate: SlotCandidate,
  scoreMode: SquadBuilderScoreMode,
  slotCandidates: SlotCandidate[],
  slot: FormationSlot,
  onlySelected: boolean,
  selectedPositionByPlayerKey: Record<string, string>,
  tacticalTransitionAdjustment = 0
): SlotCandidateRankingBreakdown {
  const baseScore = getCandidateScoreForMode(candidate, scoreMode);

  const naturalSelectionAdjustment = getNaturalSelectionAdjustment(
    candidate,
    slotCandidates
  );

const callUpPositionAdjustment = 0;

  const selectionScore =
    baseScore +
    naturalSelectionAdjustment +
    callUpPositionAdjustment +
    tacticalTransitionAdjustment;

  return {
    baseScore: roundRankingPart(baseScore),
    naturalSelectionAdjustment: roundRankingPart(naturalSelectionAdjustment),
    callUpPositionAdjustment: roundRankingPart(callUpPositionAdjustment),
    tacticalTransitionAdjustment: roundRankingPart(tacticalTransitionAdjustment),
    selectionScore: roundRankingPart(selectionScore),
  };
}
function getCandidateSelectionScoreForMode(
  candidate: SlotCandidate,
  scoreMode: SquadBuilderScoreMode,
  slotCandidates: SlotCandidate[],
  slot: FormationSlot,
  onlySelected: boolean,
  selectedPositionByPlayerKey: Record<string, string>
): number {
  return buildRankingBreakdown(
    candidate,
    scoreMode,
    slotCandidates,
    slot,
    onlySelected,
    selectedPositionByPlayerKey
  ).selectionScore;
}

function withScoreModeSelectionScore(
  candidate: SlotCandidate,
  scoreMode: SquadBuilderScoreMode,
  slotCandidates: SlotCandidate[],
  slot: FormationSlot,
  onlySelected: boolean,
  selectedPositionByPlayerKey: Record<string, string>,
  adjustment = 0
): SlotCandidate {
  const rankingBreakdown = buildRankingBreakdown(
    candidate,
    scoreMode,
    slotCandidates,
    slot,
    onlySelected,
    selectedPositionByPlayerKey,
    adjustment
  );

  return withSelectionScore(
    candidate,
    rankingBreakdown.selectionScore,
    rankingBreakdown
  );
}
function withCampaignCallUps(
  candidate: SlotCandidate,
  slot: FormationSlot,
  campaignCallUpsByPlayerKey: CampaignCallUpsByPlayerKey
): SlotCandidate {
  const summary = campaignCallUpsByPlayerKey[candidate.key];

  return {
    ...candidate,
    campaignCallUps: summary?.total ?? 0,
    campaignPositionCallUps: getCampaignPositionCallUpsForSlot(
      summary,
      slot.positionGroup
    ),
    campaignMatches: summary?.matches ?? 0,
    campaignMinutes: summary?.minutes ?? 0,
    campaignAvgRating: summary?.avgRating ?? null,
  };
}

function sortCandidatesForLineup(
  candidates: SlotCandidate[],
  scoreMode: SquadBuilderScoreMode
): SlotCandidate[] {
  return [...candidates].sort((left, right) => {
    const selectionDiff =
      getCandidateSelectionScore(right) - getCandidateSelectionScore(left);

    if (Math.abs(selectionDiff) >= 0.001) {
      return selectionDiff;
    }

    const modeDiff = compareCandidatesForMode(left, right, scoreMode);

    if (modeDiff !== 0) {
      return modeDiff;
    }

    const kindDiff =
      getCandidateKindPriority(right) - getCandidateKindPriority(left);

    if (kindDiff !== 0) {
      return kindDiff;
    }

    const finalScoreDiff = right.finalScore - left.finalScore;

    if (Math.abs(finalScoreDiff) >= 0.001) {
      return finalScoreDiff;
    }

    const nameDiff = left.name.localeCompare(right.name, "pl");

    if (nameDiff !== 0) {
      return nameDiff;
    }

    return left.key.localeCompare(right.key, "pl");
  });
}
function solveLineupPreservingPrevious(
  slots: FormationSlot[],
  candidatesBySlot: Record<string, SlotCandidate[]>,
  previousLineup: Record<string, SlotCandidate | null>,
  shouldPreservePrevious: boolean
): Record<string, SlotCandidate | null> {
  if (!shouldPreservePrevious) {
    return solveLineupFromCandidates(slots, candidatesBySlot);
  }

  const lineup: Record<string, SlotCandidate | null> = {};
  const usedPlayerKeys = new Set<string>();

  for (const slot of slots) {
    lineup[slot.id] = null;
  }

  for (const slot of slots) {
    const previousCandidate = previousLineup[slot.id];

    if (!previousCandidate) {
      continue;
    }

    const currentCandidate = (candidatesBySlot[slot.id] ?? []).find(
      (candidate) => candidate.key === previousCandidate.key
    );

    if (!currentCandidate) {
      continue;
    }

    if (usedPlayerKeys.has(currentCandidate.key)) {
      continue;
    }

    lineup[slot.id] = currentCandidate;
    usedPlayerKeys.add(currentCandidate.key);
  }

  const emptySlots = slots.filter((slot) => lineup[slot.id] === null);

  const remainingCandidatesBySlot: Record<string, SlotCandidate[]> = {};

  for (const slot of emptySlots) {
    remainingCandidatesBySlot[slot.id] = (candidatesBySlot[slot.id] ?? []).filter(
      (candidate) => !usedPlayerKeys.has(candidate.key)
    );
  }

  const filledLineup = solveLineupFromCandidates(
    emptySlots,
    remainingCandidatesBySlot
  );

  for (const slot of emptySlots) {
    const candidate = filledLineup[slot.id] ?? null;

    lineup[slot.id] = candidate;

    if (candidate) {
      usedPlayerKeys.add(candidate.key);
    }
  }

  return lineup;
}
function buildHiddenCandidatesSignature(
  hiddenTopCandidateKeys: Record<string, string[]>
): string {
  return JSON.stringify(
    Object.entries(hiddenTopCandidateKeys)
      .map(([key, values]) => [key, [...values].sort()])
      .sort(([leftKey], [rightKey]) =>
        String(leftKey).localeCompare(String(rightKey), "pl")
      )
  );
}
function buildForcedCandidatesSignature(
  forcedSlotCandidateKeys: Record<string, string>
): string {
  return JSON.stringify(
    Object.entries(forcedSlotCandidateKeys).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey, "pl")
    )
  );
}
function buildLineupSettingsSignature(
  slots: FormationSlot[],
  scoreMode: SquadBuilderScoreMode,
  topOnlyNatural: boolean
): string {
  return JSON.stringify({
    scoreMode,
    topOnlyNatural,
    slots: slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      positionGroup: slot.positionGroup,
      roleId: slot.roleId,
      excludedRoleId: slot.excludedRoleId,
      footRequirement: slot.footRequirement,
      phase: slot.phase,
    })),
  });
}
function sortCandidatesForDisplay(
  candidates: SlotCandidate[],
  scoreMode: SquadBuilderScoreMode
): SlotCandidate[] {
  return sortCandidatesForLineup(candidates, scoreMode);
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

  const hiddenGlobally = new Set(
    hiddenTopCandidateKeys[GLOBAL_HIDDEN_TOP_KEY] ?? []
  );

  return candidates.filter(
    (candidate) =>
      !hiddenForSlot.has(candidate.key) && !hiddenGlobally.has(candidate.key)
  );
}

function filterOnlyNaturalIfNeeded(
  candidates: SlotCandidate[],
  topOnlyNatural: boolean
): SlotCandidate[] {
  if (!topOnlyNatural) {
    return candidates;
  }

  const bestNaturalScore = getBestNaturalScore(candidates);

  return candidates.filter((candidate) => {
    if (candidate.candidateKind === "natural") {
      return true;
    }

    // Bliski profil zostaje, jeśli naprawdę wygląda sensownie.
    if (candidate.candidateKind === "close") {
      if (candidate.finalScore >= 72) {
        return true;
      }

      if (bestNaturalScore !== null && candidate.finalScore >= bestNaturalScore - 3) {
        return true;
      }

      return false;
    }

    // Konwersja nie jest automatycznie wywalana.
    // Jeśli ktoś ma bardzo wysoki wynik jako napastnik/skrzydłowy/itd.,
    // to ma prawo pojawić się w TOP i w solverze.
    if (candidate.finalScore >= 80) {
      return true;
    }

    if (bestNaturalScore !== null && candidate.finalScore >= bestNaturalScore + 4) {
      return true;
    }

    return false;
  });
}
function applyForcedSlotCandidates(
  slots: FormationSlot[],
  candidatesBySlot: Record<string, SlotCandidate[]>,
  forcedSlotCandidateKeys: Record<string, string>
): Record<string, SlotCandidate[]> {
  const result: Record<string, SlotCandidate[]> = {};
  const forcedPlayerKeys = new Set(Object.values(forcedSlotCandidateKeys));

  for (const slot of slots) {
    const forcedKey = forcedSlotCandidateKeys[slot.id];
    const candidates = candidatesBySlot[slot.id] ?? [];

    if (!forcedKey) {
      result[slot.id] = candidates.filter(
        (candidate) => !forcedPlayerKeys.has(candidate.key)
      );
      continue;
    }

    const forcedCandidate = candidates.find(
      (candidate) => candidate.key === forcedKey
    );

    const rest = candidates.filter((candidate) => {
      if (candidate.key === forcedKey) {
        return false;
      }

      return !forcedPlayerKeys.has(candidate.key);
    });

    result[slot.id] = forcedCandidate
      ? [
          {
            ...forcedCandidate,
            selectionScore: 9999,
          } as SlotCandidate,
          ...rest,
        ]
      : rest;
  }

  return result;
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
  const label = "slotLabel" in slot ? slot.slotLabel : slot.label;
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
  return (
    getCentralFamilyLevel(left) !== null &&
    getCentralFamilyLevel(right) !== null
  );
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

function getTransitionTieBreakerAdjustment(adjustment: number): number {
  return Math.max(-0.2, Math.min(0.2, adjustment * 0.00025));
}

export function useSquadBuilderSuggestions({
  rows,
  playerMarks = {},
  selectedPositionByPlayerKey = {},
  campaignCallUpsByPlayerKey = {},
  withBallSlots,
  withoutBallSlots,
  tacticalView,
  onlySelected,
  topOnlyNatural,
  scoreMode,
}: UseSquadBuilderSuggestionsParams) {
  const previousSuggestedSquadWithBallRef = useRef<
  Record<string, SlotCandidate | null>
>({});

const previousSuggestedSquadWithoutBallRef = useRef<
  Record<string, SlotCandidate | null>
>({});
const previousWithBallSettingsSignatureRef = useRef("");
const previousWithoutBallSettingsSignatureRef = useRef("");
const previousHiddenCandidatesSignatureRef = useRef("");
const previousForcedCandidatesSignatureRef = useRef("");

  const [hiddenTopCandidateKeys, setHiddenTopCandidateKeys] = useState<
    Record<string, string[]>
  >(() =>
    loadLocalStorageValue<Record<string, string[]>>(
      SQUAD_BUILDER_HIDDEN_TOP_STORAGE_KEY,
      {}
    )
  );
const [forcedSlotCandidateKeys, setForcedSlotCandidateKeys] = useState<
  Record<string, string>
>({});
  useEffect(() => {
    saveLocalStorageValue(
      SQUAD_BUILDER_HIDDEN_TOP_STORAGE_KEY,
      hiddenTopCandidateKeys
    );
  }, [hiddenTopCandidateKeys]);

  const selectionFilterSignature = useMemo(
    () => buildSelectionFilterSignature(playerMarks, onlySelected),
    [playerMarks, onlySelected]
  );

  const availableRows = useMemo(() => {
    const [selectedPart, rejectedPart] = selectionFilterSignature.split("::");

    const selectedKeys = new Set(
      selectedPart ? selectedPart.split("|").filter(Boolean) : []
    );

    const rejectedKeys = new Set(
      rejectedPart ? rejectedPart.split("|").filter(Boolean) : []
    );

    return rows.filter((row) => {
      const playerKey = getPlayerKey(row);

      if (rejectedKeys.has(playerKey)) {
        return false;
      }

      if (onlySelected && !selectedKeys.has(playerKey)) {
        return false;
      }

      return true;
    });
  }, [rows, onlySelected, selectionFilterSignature]);
const scoringContextRows = useMemo(() => {
  const rejectedKeys = new Set(
    Object.entries(playerMarks)
      .filter(([, mark]) => mark === "rejected")
      .map(([playerKey]) => playerKey)
  );

  return rows.filter((row) => {
    const playerKey = getPlayerKey(row);

    return !rejectedKeys.has(playerKey);
  });
}, [rows, playerMarks]);

const scoringContext = useMemo(() => {
  return createSquadBuilderScoringContext(scoringContextRows);
}, [scoringContextRows]);
  const candidatesBySlotWithBall = useMemo(() => {
   const baseCandidates = buildCandidatesBySlotWithScoringContext(
  availableRows,
  withBallSlots,
  scoringContext
);

    const result: Record<string, SlotCandidate[]> = {};

    for (const slot of withBallSlots) {
      const visibleCandidates = filterOnlyNaturalIfNeeded(
        filterHiddenForSlot(
          (baseCandidates[slot.id] ?? []).map((candidate) =>
            withCampaignCallUps(candidate, slot, campaignCallUpsByPlayerKey)
          ),
          hiddenTopCandidateKeys,
          "with-ball",
          slot.id
        ),
        topOnlyNatural
      );

      const candidatesWithSelectionScore = visibleCandidates.map((candidate) =>
  withScoreModeSelectionScore(
    candidate,
    scoreMode,
    visibleCandidates,
    slot,
    onlySelected,
    selectedPositionByPlayerKey
  )
);

      result[slot.id] = sortCandidatesForLineup(
        candidatesWithSelectionScore,
        scoreMode
      );
    }

    return result;
  }, [
  availableRows,
  withBallSlots,
  scoringContext,
  hiddenTopCandidateKeys,
  scoreMode,
  campaignCallUpsByPlayerKey,
  topOnlyNatural,
  ]);

  const withBallSettingsSignature = useMemo(() => {
  return buildLineupSettingsSignature(
    withBallSlots,
    scoreMode,
    topOnlyNatural
  );
}, [withBallSlots, scoreMode, topOnlyNatural]);

const hiddenCandidatesSignature = useMemo(() => {
  return buildHiddenCandidatesSignature(hiddenTopCandidateKeys);
}, [hiddenTopCandidateKeys]);
const forcedCandidatesSignature = useMemo(() => {
  return buildForcedCandidatesSignature(forcedSlotCandidateKeys);
}, [forcedSlotCandidateKeys]);
const candidatesBySlotWithBallForLineup = useMemo(() => {
  return applyForcedSlotCandidates(
    withBallSlots,
    candidatesBySlotWithBall,
    forcedSlotCandidateKeys
  );
}, [withBallSlots, candidatesBySlotWithBall, forcedSlotCandidateKeys]);
const suggestedSquadWithBall = useMemo(() => {
  const settingsChanged =
    previousWithBallSettingsSignatureRef.current !== "" &&
    previousWithBallSettingsSignatureRef.current !== withBallSettingsSignature;

  const hiddenChanged =
    previousHiddenCandidatesSignatureRef.current !== "" &&
    previousHiddenCandidatesSignatureRef.current !== hiddenCandidatesSignature;

  const forcedChanged =
    previousForcedCandidatesSignatureRef.current !== "" &&
    previousForcedCandidatesSignatureRef.current !== forcedCandidatesSignature;

  const shouldPreservePrevious =
    onlySelected && !settingsChanged && !hiddenChanged && !forcedChanged;

  return solveLineupPreservingPrevious(
    withBallSlots,
    candidatesBySlotWithBallForLineup,
    previousSuggestedSquadWithBallRef.current,
    shouldPreservePrevious
  );
}, [
  withBallSlots,
  candidatesBySlotWithBallForLineup,
  onlySelected,
  withBallSettingsSignature,
  hiddenCandidatesSignature,
  forcedCandidatesSignature,
]);

useEffect(() => {
  previousSuggestedSquadWithBallRef.current = suggestedSquadWithBall;
  previousWithBallSettingsSignatureRef.current = withBallSettingsSignature;
  previousHiddenCandidatesSignatureRef.current = hiddenCandidatesSignature;
  previousForcedCandidatesSignatureRef.current = forcedCandidatesSignature;
}, [
  suggestedSquadWithBall,
  withBallSettingsSignature,
  hiddenCandidatesSignature,
  forcedCandidatesSignature,
]);
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
    const baseCandidates = buildCandidatesBySlotWithScoringContext(
  selectedXiRows,
  withoutBallSlots,
  scoringContext
);

    const result: Record<string, SlotCandidate[]> = {};

    for (const slot of withoutBallSlots) {
      const visibleForSlot = filterOnlyNaturalIfNeeded(
        filterHiddenForSlot(
          (baseCandidates[slot.id] ?? []).map((candidate) =>
            withCampaignCallUps(candidate, slot, campaignCallUpsByPlayerKey)
          ),
          hiddenTopCandidateKeys,
          "without-ball",
          slot.id
        ),
        topOnlyNatural
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
  visibleForSlot,
  slot,
  onlySelected,
  selectedPositionByPlayerKey,
  getTransitionTieBreakerAdjustment(transitionAdjustment)
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
  scoringContext,
  hiddenTopCandidateKeys,
  withBallProfileByPlayerKey,
  scoreMode,
  campaignCallUpsByPlayerKey,
  topOnlyNatural,
  ]);

  const candidatesBySlotWithoutBallForTop = useMemo(() => {
    return candidatesBySlotWithoutBallForLineup;
  }, [candidatesBySlotWithoutBallForLineup]);

  const withoutBallSettingsSignature = useMemo(() => {
  return buildLineupSettingsSignature(
    withoutBallSlots,
    scoreMode,
    topOnlyNatural
  );
}, [withoutBallSlots, scoreMode, topOnlyNatural]);
const candidatesBySlotWithoutBallForLineupForced = useMemo(() => {
  return applyForcedSlotCandidates(
    withoutBallSlots,
    candidatesBySlotWithoutBallForLineup,
    forcedSlotCandidateKeys
  );
}, [
  withoutBallSlots,
  candidatesBySlotWithoutBallForLineup,
  forcedSlotCandidateKeys,
]);
const suggestedSquadWithoutBall = useMemo(() => {
  const settingsChanged =
    previousWithoutBallSettingsSignatureRef.current !== "" &&
    previousWithoutBallSettingsSignatureRef.current !==
      withoutBallSettingsSignature;

  const hiddenChanged =
    previousHiddenCandidatesSignatureRef.current !== "" &&
    previousHiddenCandidatesSignatureRef.current !== hiddenCandidatesSignature;

  const forcedChanged =
    previousForcedCandidatesSignatureRef.current !== "" &&
    previousForcedCandidatesSignatureRef.current !== forcedCandidatesSignature;

  const shouldPreservePrevious =
    onlySelected && !settingsChanged && !hiddenChanged && !forcedChanged;

  return solveLineupPreservingPrevious(
    withoutBallSlots,
    candidatesBySlotWithoutBallForLineupForced,
    previousSuggestedSquadWithoutBallRef.current,
    shouldPreservePrevious
  );
}, [
  withoutBallSlots,
  candidatesBySlotWithoutBallForLineupForced,
  onlySelected,
  withoutBallSettingsSignature,
  hiddenCandidatesSignature,
  forcedCandidatesSignature,
]);

useEffect(() => {
  previousSuggestedSquadWithoutBallRef.current = suggestedSquadWithoutBall;
  previousWithoutBallSettingsSignatureRef.current = withoutBallSettingsSignature;
  previousForcedCandidatesSignatureRef.current = forcedCandidatesSignature;
}, [
  suggestedSquadWithoutBall,
  withoutBallSettingsSignature,
  forcedCandidatesSignature,
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
    setForcedSlotCandidateKeys((current) => {
  if (current[slotId] !== candidateKey) {
    return current;
  }

  const next = { ...current };
  delete next[slotId];

  return next;
});
  }

  function hideTopCandidateEverywhere(candidateKey: string) {
    setHiddenTopCandidateKeys((current) => {
      const currentGlobalHidden = current[GLOBAL_HIDDEN_TOP_KEY] ?? [];

      if (currentGlobalHidden.includes(candidateKey)) {
        return current;
      }

      return {
        ...current,
        [GLOBAL_HIDDEN_TOP_KEY]: [...currentGlobalHidden, candidateKey],
      };
    });
    setForcedSlotCandidateKeys((current) => {
  const next: Record<string, string> = {};

  for (const [slotId, currentCandidateKey] of Object.entries(current)) {
    if (currentCandidateKey !== candidateKey) {
      next[slotId] = currentCandidateKey;
    }
  }

  return next;
});
  }

  function clearHiddenTopCandidates() {
  setHiddenTopCandidateKeys({});
  setForcedSlotCandidateKeys({});
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

  const activeSlotsForView =
    view === "with-ball" ? withBallSlots : withoutBallSlots;

  const assignedCandidate = sourceLineup[slot.id] ?? null;

  const hiddenForSlot = new Set(
    hiddenTopCandidateKeys[getPhaseSlotKey(view, slot.id)] ?? []
  );

  const hiddenGlobally = new Set(
    hiddenTopCandidateKeys[GLOBAL_HIDDEN_TOP_KEY] ?? []
  );

  const usedSlotLabelByPlayerKey = new Map<string, string>();
const usedSlotIdByPlayerKey = new Map<string, string>();
  for (const activeSlot of activeSlotsForView) {
    const candidate = sourceLineup[activeSlot.id];

    if (!candidate) {
      continue;
    }

    usedSlotLabelByPlayerKey.set(candidate.key, activeSlot.label);
    usedSlotIdByPlayerKey.set(candidate.key, activeSlot.id);
  }

  const visibleCandidates = filterOnlyNaturalIfNeeded(
    sourceCandidates
      .filter((candidate) => !hiddenForSlot.has(candidate.key))
      .filter((candidate) => !hiddenGlobally.has(candidate.key)),
    topOnlyNatural
  );

  const sortedCandidates = sortCandidatesForDisplay(
    visibleCandidates,
    scoreMode
  );

  const potentialRankByPlayerKey = new Map<string, number>();

  sortedCandidates.forEach((candidate, index) => {
    if (!potentialRankByPlayerKey.has(candidate.key)) {
      potentialRankByPlayerKey.set(candidate.key, index + 1);
    }
  });

  function decorateCandidate(candidate: SlotCandidate): SlotCandidate {
    const usedSlotLabel = usedSlotLabelByPlayerKey.get(candidate.key);
    const isUsedInOtherSlot =
      usedSlotLabel !== undefined && usedSlotLabel !== slot.label;

return {
  ...candidate,
  isUsedInOtherSlot,
  usedInOtherSlotId: isUsedInOtherSlot
    ? usedSlotIdByPlayerKey.get(candidate.key)
    : undefined,
  usedInOtherSlotLabel: isUsedInOtherSlot ? usedSlotLabel : undefined,
  potentialRankInSlot: potentialRankByPlayerKey.get(candidate.key),
} as SlotCandidate;
  }

  const topCandidates = sortedCandidates.slice(0, limit).map(decorateCandidate);

  if (!assignedCandidate) {
    return topCandidates;
  }

  const assignedIsVisible =
    !hiddenForSlot.has(assignedCandidate.key) &&
    !hiddenGlobally.has(assignedCandidate.key) &&
    (!topOnlyNatural || assignedCandidate.candidateKind === "natural");

  if (!assignedIsVisible) {
    return topCandidates;
  }

  const assignedIsAlreadyInTop = topCandidates.some(
    (candidate) => candidate.key === assignedCandidate.key
  );

  if (assignedIsAlreadyInTop) {
    return topCandidates;
  }

  // Jeśli aktualnie ustawiony zawodnik nie mieści się w TOP 3,
  // pokazujemy go jako dodatkową informację na końcu.
  // Ale jeśli jest #1/#2/#3, zostaje normalnie w TOP 3.
  return [
    ...topCandidates,
    {
      ...assignedCandidate,
      potentialRankInSlot: potentialRankByPlayerKey.get(assignedCandidate.key),
    } as SlotCandidate,
  ].slice(0, limit + 1);
}
function forceCandidateOnSlot(slotId: string, candidateKey: string) {
  setForcedSlotCandidateKeys((current) => {
    const next: Record<string, string> = {};

    for (const [currentSlotId, currentCandidateKey] of Object.entries(current)) {
      if (currentSlotId === slotId) {
        continue;
      }

      if (currentCandidateKey === candidateKey) {
        continue;
      }

      next[currentSlotId] = currentCandidateKey;
    }

    next[slotId] = candidateKey;

    return next;
  });
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
  hideTopCandidateEverywhere,
  clearHiddenTopCandidates,
  forceCandidateOnSlot,
};
}