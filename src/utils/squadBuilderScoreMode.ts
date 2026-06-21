import type {
  SlotCandidate,
  SquadBuilderScoreMode,
} from "../types/squadBuilderTypes";

import { formatRoleScore } from "./roleScoring";

export function getCandidateScoreForMode(
  candidate: SlotCandidate,
  scoreMode: SquadBuilderScoreMode
): number {
  if (scoreMode === "overall-ability") {
    return candidate.overallAbility ?? -1;
  }

  return candidate.finalScore;
}

export function compareCandidatesForMode(
  left: SlotCandidate,
  right: SlotCandidate,
  scoreMode: SquadBuilderScoreMode
): number {
  const rightScore = getCandidateScoreForMode(right, scoreMode);
  const leftScore = getCandidateScoreForMode(left, scoreMode);

  if (rightScore !== leftScore) {
    return rightScore - leftScore;
  }

  if (right.finalScore !== left.finalScore) {
    return right.finalScore - left.finalScore;
  }

  return left.name.localeCompare(right.name, "pl");
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

  return formatRoleScore(candidate.finalScore);
}

/**
 * Do punktacji formacji normalizujemy OU 0–200 do skali 0–100,
 * żeby nie rozwalić rankingu formacji.
 */
export function getCandidateFormationScoreForMode(
  candidate: SlotCandidate,
  scoreMode: SquadBuilderScoreMode
): number {
  if (scoreMode === "overall-ability") {
    const overallAbility = candidate.overallAbility ?? 0;
    return Math.max(0, Math.min(100, overallAbility / 2));
  }

  return candidate.finalScore;
}