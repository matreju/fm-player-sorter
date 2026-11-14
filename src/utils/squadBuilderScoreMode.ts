import type {
  SlotCandidate,
  SquadBuilderScoreMode,
} from "../types/squadBuilderTypes";

import { formatRoleScore } from "./roleScoring";

type CandidateWithSelectionScore = SlotCandidate & {
  selectionScore?: number;
};

function getSelectionScore(candidate: SlotCandidate): number | null {
  const selectionScore = (candidate as CandidateWithSelectionScore)
    .selectionScore;

  if (typeof selectionScore === "number" && Number.isFinite(selectionScore)) {
    return selectionScore;
  }

  return null;
}

export function getCandidateScoreForMode(
  candidate: SlotCandidate,
  scoreMode: SquadBuilderScoreMode
): number {
  const selectionScore = getSelectionScore(candidate);

  if (selectionScore !== null) {
    return selectionScore;
  }

  if (scoreMode === "overall-ability") {
    return candidate.overallAbility ?? -1;
  }

  return candidate.finalScore;
}

export function getCandidateFormationScoreForMode(
  candidate: SlotCandidate,
  scoreMode: SquadBuilderScoreMode
): number {
  return getCandidateScoreForMode(candidate, scoreMode);
}

export function compareCandidatesForMode(
  left: SlotCandidate,
  right: SlotCandidate,
  scoreMode: SquadBuilderScoreMode
): number {
  const rightScore = getCandidateScoreForMode(right, scoreMode);
  const leftScore = getCandidateScoreForMode(left, scoreMode);

  if (Math.abs(rightScore - leftScore) >= 0.001) {
    return rightScore - leftScore;
  }

  const kindDiff =
    getCandidateKindPriority(right) - getCandidateKindPriority(left);

  if (kindDiff !== 0) {
    return kindDiff;
  }

  const finalDiff = right.finalScore - left.finalScore;

  if (Math.abs(finalDiff) >= 0.001) {
    return finalDiff;
  }

  const roleDiff = (right.roleScore ?? 0) - (left.roleScore ?? 0);

  if (Math.abs(roleDiff) >= 0.001) {
    return roleDiff;
  }

  const overallDiff =
    (right.overallAbility ?? -1) - (left.overallAbility ?? -1);

  if (overallDiff !== 0) {
    return overallDiff;
  }

  return left.name.localeCompare(right.name, "pl");
}

function getCandidateKindPriority(candidate: SlotCandidate): number {
  if (candidate.candidateKind === "natural") return 3;
  if (candidate.candidateKind === "close") return 2;
  return 1;
}

export function formatCandidateScoreForMode(
  candidate: SlotCandidate,
  scoreMode: SquadBuilderScoreMode
): string {
  if (scoreMode === "overall-ability") {
    return candidate.overallAbility !== null &&
      candidate.overallAbility !== undefined
      ? `OU ${candidate.overallAbility}`
      : "OU -";
  }

  return formatRoleScore(
    candidate.roleScore ?? candidate.roleResult?.score ?? candidate.finalScore
  );
}
