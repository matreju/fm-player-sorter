import type { TableRow } from "../types/table";
import type {
  CandidateKind,
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
  type MobilityKind,
  type PlayerMobilityProfile,
  type PositionFamily,
} from "./squadBuilderMobility";
import { compareCandidatesForMode } from "./squadBuilderScoreMode";
import { getPlayerKey } from "./playerIdentity";

export type BuildCandidatesBySlotOptions = {
  hiddenPlayerKeys?: Set<string>;
  topOnlyNatural?: boolean;
  scoreMode?: SquadBuilderScoreMode;
};

type SolveLineupOptions = BuildCandidatesBySlotOptions & {
  lockedSlotCandidateKeys?: Record<string, string>;
};

type CandidateWithSelectionScore = SlotCandidate & {
  selectionScore?: number;
};

type LogicalScoreContext = {
  centerBackSlotsCount: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampScore(value: number): number {
  return clamp(value, 0, 100);
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const match = String(value).replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!match) return null;

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
  if (overallAbility === null) return 0;
  return clamp((overallAbility - 120) * 0.035, -3.5, 5);
}

function hasFamily(profiles: PlayerMobilityProfile[], family: PositionFamily): boolean {
  return profiles.some((profile) => profile.family === family);
}

function hasAnyFamily(profiles: PlayerMobilityProfile[], families: PositionFamily[]): boolean {
  return families.some((family) => hasFamily(profiles, family));
}

function isWideFamily(family: PositionFamily): boolean {
  return (
    family === "wide-back" ||
    family === "wing-back" ||
    family === "wide-midfielder" ||
    family === "winger"
  );
}

function getBestProfileFamily(profiles: PlayerMobilityProfile[]): PositionFamily | null {
  return profiles[0]?.family ?? null;
}

function hasCompatibleWideSide(profiles: PlayerMobilityProfile[], slot: FormationSlot): boolean {
  const slotSide = getSlotSide(slot);
  if (slotSide === "center") return true;

  return profiles.some((profile) => profile.side === slotSide || profile.side === "center");
}

function isCriticalSlot(slot: FormationSlot) {
  const slotFamily = getSlotFamily(slot);
  return (
    slotFamily === "center-back" ||
    slotFamily === "wide-back" ||
    slotFamily === "defensive-midfielder" ||
    slotFamily === "striker"
  );
}

function getMinimumScoreForSlot(slot: FormationSlot, kind: CandidateKind) {
  const critical = isCriticalSlot(slot);

  if (kind === "natural") return critical ? 39 : 34;
  if (kind === "close") return critical ? 48 : 43;

  return critical ? 56 : 51;
}

function getVisibleAdjustment(kind: CandidateKind, mobilityKind: MobilityKind) {
  if (kind === "natural") return mobilityKind === "natural" ? 0.5 : 0;
  if (kind === "close") return 0;
  return mobilityKind === "blocked" ? -6 : -3;
}

function getSelectionKindBonus(slot: FormationSlot, kind: CandidateKind) {
  if (kind === "natural") {
    return 2;
  }

  if (kind === "close") {
    return 0;
  }

  return isCriticalSlot(slot) ? -10 : -6;
}

function getCandidateSelectionScore(candidate: SlotCandidate): number {
  const selectionScore = (candidate as CandidateWithSelectionScore).selectionScore;
  if (typeof selectionScore === "number" && Number.isFinite(selectionScore)) return selectionScore;
  return candidate.finalScore;
}

function compareCandidatesForLineup(
  left: SlotCandidate,
  right: SlotCandidate,
  scoreMode: SquadBuilderScoreMode
): number {
  if (scoreMode === "overall-ability") return compareCandidatesForMode(left, right, scoreMode);

  const selectionDiff = getCandidateSelectionScore(right) - getCandidateSelectionScore(left);
  if (selectionDiff !== 0) return selectionDiff;

  const finalDiff = right.finalScore - left.finalScore;
  if (finalDiff !== 0) return finalDiff;

  return left.name.localeCompare(right.name, "pl");
}

function getExperimentalLabel(slot: FormationSlot, profiles: PlayerMobilityProfile[]) {
  const family = getBestProfileFamily(profiles);
  const slotFamily = getSlotFamily(slot);

  if (!family) return "↗ Eksperyment atrybutowy";

  if (family === "winger" && slotFamily === "wide-back") {
    return "↗ Skrzydłowy cofnięty na bocznego obrońcę dzięki atrybutom";
  }

  if (family === "winger" && slotFamily === "wing-back") {
    return "↗ Skrzydłowy cofnięty na wahadło dzięki atrybutom";
  }

  if (family === "wide-midfielder" && slotFamily === "wide-back") {
    return "↗ Boczny pomocnik cofnięty na bocznego obrońcę";
  }

  if (family === "attacking-midfielder" && slotFamily === "central-midfielder") {
    return "↗ OP cofnięty do środka pola";
  }

  return "↗ Eksperyment atrybutowy";
}

function shouldRejectImpossibleWideSide(
  profiles: PlayerMobilityProfile[],
  slot: FormationSlot,
  candidate: SlotCandidate
): boolean {
  const slotFamily = getSlotFamily(slot);
  const slotSide = getSlotSide(slot);

  if (!isWideFamily(slotFamily) || slotSide === "center") return false;
  if (hasCompatibleWideSide(profiles, slot)) return false;

  return candidate.finalScore < 66;
}

function shouldRejectByBasicFootballLogic(
  profiles: PlayerMobilityProfile[],
  slot: FormationSlot,
  candidate: SlotCandidate,
  context: LogicalScoreContext
): boolean {
  const slotFamily = getSlotFamily(slot);

  if (slotFamily === "center-back") {
    if (hasAnyFamily(profiles, ["center-back", "defensive-midfielder"])) return false;
    if (
      context.centerBackSlotsCount >= 3 &&
      hasAnyFamily(profiles, ["wide-back", "wing-back"]) &&
      candidate.finalScore >= 55
    ) {
      return false;
    }

    return candidate.finalScore < 68;
  }

  if (slotFamily === "defensive-midfielder") {
    if (hasAnyFamily(profiles, ["defensive-midfielder", "central-midfielder", "center-back"])) {
      return false;
    }

    return candidate.finalScore < 64;
  }

  if (slotFamily === "striker") {
    if (hasAnyFamily(profiles, ["striker", "attacking-midfielder", "winger"])) return false;
    return candidate.finalScore < 67;
  }

  return false;
}

function normalizeKind(baseKind: CandidateKind, mobilityKind: MobilityKind): CandidateKind {
  if (baseKind === "natural" && mobilityKind === "natural") return "natural";
  if (baseKind === "natural" && mobilityKind === "close") return "close";
  if (baseKind === "close" && mobilityKind !== "blocked") return "close";
  return "conversion";
}

export function scorePlayerForLogicalSquadSlot(
  row: TableRow,
  slot: FormationSlot,
  context: LogicalScoreContext
): SlotCandidate | null {
  const candidate = scorePlayerForSlot(row, slot);
  if (!candidate) return null;

  const slotIsGoalkeeper = slot.positionGroup === "Bramkarz";
  if (slotIsGoalkeeper) {
    return {
      ...candidate,
      key: getPlayerKey(row),
      overallAbility: candidate.overallAbility ?? getOverallAbility(row),
      selectionScore: candidate.finalScore + getOverallAbilityTieBreaker(row),
    } as CandidateWithSelectionScore;
  }

  const profiles = getPlayerMobilityProfiles(row);
  const mobility = scorePlayerMobilityToSlot(row, slot);

  if (shouldRejectImpossibleWideSide(profiles, slot, candidate)) return null;
  if (shouldRejectByBasicFootballLogic(profiles, slot, candidate, context)) return null;

  const kind = normalizeKind(candidate.candidateKind, mobility.kind);
  const finalScore = clampScore(candidate.finalScore + getVisibleAdjustment(kind, mobility.kind));
  const minimumScore = getMinimumScoreForSlot(slot, kind);

  if (finalScore < minimumScore) return null;

  const selectionScore =
    finalScore +
    getSelectionKindBonus(slot, kind) +
    getOverallAbilityTieBreaker(row) +
    (mobility.kind === "blocked" ? -4 : clamp((mobility.score - 75) * 0.035, -3, 3));

  return {
    ...candidate,
    key: getPlayerKey(row),
    overallAbility: candidate.overallAbility ?? getOverallAbility(row),
    finalScore,
    phaseScore: finalScore,
    positionPenalty:
      kind === "natural" ? 0 : kind === "close" ? 4 : Math.max(candidate.positionPenalty ?? 0, 8),
    positionScore: mobility.kind === "blocked" ? candidate.positionScore : mobility.score,
    mobilityScore: mobility.kind === "blocked" ? 35 : mobility.score,
    sideScore: mobility.kind === "blocked" ? candidate.sideScore : mobility.score,
    candidateKind: kind,
    candidateKindLabel: mobility.kind === "blocked" ? getExperimentalLabel(slot, profiles) : mobility.reason,
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

  const centerBackSlotsCount = slots.filter((slot) => getSlotFamily(slot) === "center-back").length;
  const context: LogicalScoreContext = { centerBackSlotsCount };
  const result: Record<string, SlotCandidate[]> = {};

  for (const slot of slots) {
    result[slot.id] = rows
      .map((row) => scorePlayerForLogicalSquadSlot(row, slot, context))
      .filter((candidate): candidate is SlotCandidate => candidate !== null)
      .filter((candidate) => !hiddenPlayerKeys.has(candidate.key))
      .filter((candidate) => !topOnlyNatural || candidate.candidateKind === "natural")
      .sort((left, right) => compareCandidatesForLineup(left, right, scoreMode));
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

  return solveLineupFromCandidates(slots, candidatesBySlot, options.lockedSlotCandidateKeys ?? {});
}

export function getLineupCandidates(lineup: Record<string, SlotCandidate | null>): SlotCandidate[] {
  return Object.values(lineup).filter((candidate): candidate is SlotCandidate => candidate !== null);
}

export function getLineupRows(lineup: Record<string, SlotCandidate | null>): TableRow[] {
  return getLineupCandidates(lineup).map((candidate) => candidate.row);
}

export function getAverageLineupScore(lineup: Record<string, SlotCandidate | null>): number {
  const candidates = getLineupCandidates(lineup);
  if (candidates.length === 0) return 0;
  return candidates.reduce((sum, candidate) => sum + candidate.finalScore, 0) / candidates.length;
}

export function getWeakestLineupScore(lineup: Record<string, SlotCandidate | null>): number {
  const candidates = getLineupCandidates(lineup);
  if (candidates.length === 0) return 0;
  return Math.min(...candidates.map((candidate) => candidate.finalScore));
}