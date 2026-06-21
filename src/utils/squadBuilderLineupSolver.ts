import type { TableRow } from "../types/table";
import type {
  FormationSlot,
  SlotCandidate,
  SquadBuilderScoreMode,
} from "../types/squadBuilderTypes";
import { scorePlayerForSlot } from "./squadBuilderScoring";
import { solveSquad } from "./squadBuilderSolver";
import {
  getPlayerMobilityProfiles,
  getSlotFamily,
  getSlotSide,
  scorePlayerMobilityToSlot,
  type PlayerMobilityProfile,
  type PositionFamily,
} from "./squadBuilderMobility";
import { compareCandidatesForMode } from "./squadBuilderScoreMode";

type BuildCandidatesBySlotOptions = {
  hiddenPlayerKeys?: Set<string>;
  topOnlyNatural?: boolean;
  scoreMode?: SquadBuilderScoreMode;
};

type SolveLineupOptions = BuildCandidatesBySlotOptions & {
  lockedSlotCandidateKeys?: Record<string, string>;
};

type CandidateKind = SlotCandidate["candidateKind"];

type CandidateWithSelectionScore = SlotCandidate & {
  selectionScore?: number;
  phaseScore?: number;
  positionScore?: number;
  mobilityScore?: number;
  sideScore?: number;
};

type LogicalScoreContext = {
  centerBackSlotsCount: number;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const match = String(value).replace(",", ".").match(/-?\d+(\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);

  return Number.isFinite(parsed) ? parsed : null;
}

function getOverallAbility(row: TableRow): number | null {
  return (
    parseNumber(row["OU"]) ??
    parseNumber(row["Obecne Umiejętności"]) ??
    parseNumber(row["Obecne umiejętności"]) ??
    parseNumber(row["CA"])
  );
}

function getOverallAbilityTieBreaker(row: TableRow): number {
  const overallAbility = getOverallAbility(row);

  if (overallAbility === null) {
    return 0;
  }

  return Math.max(-4, Math.min(5, (overallAbility - 120) * 0.04));
}

function hasFamily(
  profiles: PlayerMobilityProfile[],
  family: PositionFamily
): boolean {
  return profiles.some((profile) => profile.family === family);
}

function hasAnyFamily(
  profiles: PlayerMobilityProfile[],
  families: PositionFamily[]
): boolean {
  return families.some((family) => hasFamily(profiles, family));
}

function hasCompatibleWideSide(
  profiles: PlayerMobilityProfile[],
  slot: FormationSlot
): boolean {
  const slotSide = getSlotSide(slot);

  if (slotSide === "center") {
    return true;
  }

  return profiles.some(
    (profile) => profile.side === slotSide || profile.side === "center"
  );
}

function isCriticalSlot(slot: FormationSlot) {
  const slotFamily = getSlotFamily(slot);

  return (
    slotFamily === "center-back" ||
    slotFamily === "wide-back" ||
    slotFamily === "wing-back" ||
    slotFamily === "defensive-midfielder" ||
    slotFamily === "striker"
  );
}

function getMinimumScoreForSlot(slot: FormationSlot, kind: CandidateKind) {
  const critical = isCriticalSlot(slot);

  if (kind === "natural") {
    return critical ? 42 : 35;
  }

  if (kind === "close") {
    return critical ? 56 : 48;
  }

  return critical ? 68 : 60;
}

function getVisiblePenalty(kind: CandidateKind) {
  if (kind === "natural") {
    return 0;
  }

  if (kind === "close") {
    return 3;
  }

  return 9;
}

function getSelectionKindBonus(slot: FormationSlot, kind: CandidateKind) {
  if (kind === "natural") {
    return 8;
  }

  if (kind === "close") {
    return isCriticalSlot(slot) ? -1 : 1;
  }

  return isCriticalSlot(slot) ? -20 : -12;
}

function getCandidateSelectionScore(candidate: SlotCandidate): number {
  const selectionScore = (candidate as CandidateWithSelectionScore)
    .selectionScore;

  if (typeof selectionScore === "number" && Number.isFinite(selectionScore)) {
    return selectionScore;
  }

  return candidate.finalScore;
}

function compareCandidatesForLineup(
  left: SlotCandidate,
  right: SlotCandidate,
  scoreMode: SquadBuilderScoreMode
): number {
  if (scoreMode === "overall-ability") {
    return compareCandidatesForMode(left, right, scoreMode);
  }

  const leftScore = getCandidateSelectionScore(left);
  const rightScore = getCandidateSelectionScore(right);

  if (rightScore !== leftScore) {
    return rightScore - leftScore;
  }

  if (right.finalScore !== left.finalScore) {
    return right.finalScore - left.finalScore;
  }

  return left.name.localeCompare(right.name, "pl");
}

function shouldBlockByFootballLogic(
  profiles: PlayerMobilityProfile[],
  slot: FormationSlot,
  context: LogicalScoreContext
): boolean {
  const slotFamily = getSlotFamily(slot);
  const slotSide = getSlotSide(slot);

  if (
    (slotFamily === "wide-back" ||
      slotFamily === "wing-back" ||
      slotFamily === "wide-midfielder" ||
      slotFamily === "winger") &&
    !hasCompatibleWideSide(profiles, slot)
  ) {
    return true;
  }

  if (slotFamily === "center-back") {
    if (hasFamily(profiles, "center-back")) {
      return false;
    }

    if (hasFamily(profiles, "defensive-midfielder")) {
      return false;
    }

    if (
      context.centerBackSlotsCount >= 3 &&
      slotSide !== "center" &&
      hasAnyFamily(profiles, ["wide-back", "wing-back"])
    ) {
      return false;
    }

    return true;
  }

  if (slotFamily === "wide-back") {
    return !hasAnyFamily(profiles, [
      "wide-back",
      "wing-back",
      "wide-midfielder",
    ]);
  }

  if (slotFamily === "wing-back") {
    return !hasAnyFamily(profiles, [
      "wide-back",
      "wing-back",
      "wide-midfielder",
      "winger",
    ]);
  }

  if (slotFamily === "defensive-midfielder") {
    return !hasAnyFamily(profiles, [
      "defensive-midfielder",
      "central-midfielder",
      "center-back",
    ]);
  }

  if (slotFamily === "central-midfielder") {
    return !hasAnyFamily(profiles, [
      "defensive-midfielder",
      "central-midfielder",
      "attacking-midfielder",
    ]);
  }

  if (slotFamily === "attacking-midfielder") {
    return !hasAnyFamily(profiles, [
      "attacking-midfielder",
      "central-midfielder",
      "striker",
      "winger",
      "wide-midfielder",
    ]);
  }

  if (slotFamily === "wide-midfielder") {
    return !hasAnyFamily(profiles, [
      "wide-midfielder",
      "winger",
      "wing-back",
      "wide-back",
      "attacking-midfielder",
    ]);
  }

  if (slotFamily === "winger") {
    return !hasAnyFamily(profiles, [
      "winger",
      "wide-midfielder",
      "wing-back",
      "wide-back",
      "attacking-midfielder",
    ]);
  }

  if (slotFamily === "striker") {
    return !hasAnyFamily(profiles, [
      "striker",
      "attacking-midfielder",
      "winger",
    ]);
  }

  return false;
}

export function scorePlayerForLogicalSquadSlot(
  row: TableRow,
  slot: FormationSlot,
  context: LogicalScoreContext
): SlotCandidate | null {
  const slotIsGoalkeeper = slot.positionGroup === "Bramkarz";
  const overallAbility = getOverallAbility(row);

  if (slotIsGoalkeeper) {
    const candidate = scorePlayerForSlot(row, slot);

    if (!candidate) {
      return null;
    }

    return {
      ...candidate,
      overallAbility: candidate.overallAbility ?? overallAbility,
    } as SlotCandidate;
  }

  const profiles = getPlayerMobilityProfiles(row);
  const mobility = scorePlayerMobilityToSlot(row, slot);

  if (mobility.kind === "blocked") {
    return null;
  }

  const candidate = scorePlayerForSlot(row, slot);

  if (!candidate) {
    return null;
  }

  if (shouldBlockByFootballLogic(profiles, slot, context)) {
    return null;
  }

  const candidateKind = mobility.kind as CandidateKind;

  const finalScore = clampScore(
    candidate.finalScore - getVisiblePenalty(candidateKind)
  );

  const minimumScore = getMinimumScoreForSlot(slot, candidateKind);

  if (finalScore < minimumScore) {
    return null;
  }

  const selectionScore =
    finalScore +
    getSelectionKindBonus(slot, candidateKind) +
    getOverallAbilityTieBreaker(row);

  return {
    ...candidate,
    overallAbility: candidate.overallAbility ?? overallAbility,
    finalScore,
    phaseScore: finalScore,
    positionPenalty:
      candidateKind === "natural" ? 0 : candidateKind === "close" ? 4 : 10,
    positionScore: mobility.score,
    mobilityScore: mobility.score,
    sideScore: mobility.score,
    candidateKind,
    candidateKindLabel: mobility.reason,
    selectionScore,
  } as CandidateWithSelectionScore;
}

export function buildCandidatesBySlot(
  rows: TableRow[],
  slots: FormationSlot[],
  options: BuildCandidatesBySlotOptions = {}
): Record<string, SlotCandidate[]> {
  const hiddenPlayerKeys = options.hiddenPlayerKeys ?? new Set<string>();
  const topOnlyNatural = options.topOnlyNatural ?? false;
  const scoreMode = options.scoreMode ?? "role-score";

  const centerBackSlotsCount = slots.filter(
    (slot) => getSlotFamily(slot) === "center-back"
  ).length;

  const context: LogicalScoreContext = {
    centerBackSlotsCount,
  };

  const result: Record<string, SlotCandidate[]> = {};

  for (const slot of slots) {
    result[slot.id] = rows
      .map((row) => scorePlayerForLogicalSquadSlot(row, slot, context))
      .filter((candidate): candidate is SlotCandidate => candidate !== null)
      .filter((candidate) => !hiddenPlayerKeys.has(candidate.key))
      .filter((candidate) => {
        if (!topOnlyNatural) {
          return true;
        }

        return candidate.candidateKind === "natural";
      })
      .sort((left, right) =>
        compareCandidatesForLineup(left, right, scoreMode)
      );
  }

  return result;
}

export function solveLineupFromCandidates(
  slots: FormationSlot[],
  candidatesBySlot: Record<string, SlotCandidate[]>,
  lockedSlotCandidateKeys: Record<string, string> = {}
): Record<string, SlotCandidate | null> {
  return solveSquad(slots, candidatesBySlot, lockedSlotCandidateKeys);
}

export function solveLineup(
  slots: FormationSlot[],
  rows: TableRow[],
  options: SolveLineupOptions = {}
): Record<string, SlotCandidate | null> {
  const candidatesBySlot = buildCandidatesBySlot(rows, slots, {
    hiddenPlayerKeys: options.hiddenPlayerKeys,
    topOnlyNatural: options.topOnlyNatural,
    scoreMode: options.scoreMode,
  });

  return solveLineupFromCandidates(
    slots,
    candidatesBySlot,
    options.lockedSlotCandidateKeys ?? {}
  );
}

export function getLineupCandidates(
  lineup: Record<string, SlotCandidate | null>
): SlotCandidate[] {
  return Object.values(lineup).filter(
    (candidate): candidate is SlotCandidate => candidate !== null
  );
}

export function getLineupRows(
  lineup: Record<string, SlotCandidate | null>
): TableRow[] {
  return getLineupCandidates(lineup).map((candidate) => candidate.row);
}
export function getAverageLineupScore(
  lineup: Record<string, SlotCandidate | null>
): number {
  const candidates = getLineupCandidates(lineup);

  if (candidates.length === 0) {
    return 0;
  }

  return (
    candidates.reduce((sum, candidate) => sum + candidate.finalScore, 0) /
    candidates.length
  );
}

export function getWeakestLineupScore(
  lineup: Record<string, SlotCandidate | null>
): number {
  const candidates = getLineupCandidates(lineup);

  if (candidates.length === 0) {
    return 0;
  }

  return Math.min(...candidates.map((candidate) => candidate.finalScore));
}