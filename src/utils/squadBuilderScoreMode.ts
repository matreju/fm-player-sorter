import type {
  SlotCandidate,
  SquadBuilderScoreMode,
} from "../types/squadBuilderTypes";

import { formatRoleScore } from "./roleScoring";

type CandidateWithSelectionScore = SlotCandidate & {
  selectionScore?: number;
};

function getCampaignCallUps(candidate: SlotCandidate): number {
  return candidate.campaignCallUps ?? 0;
}

function getCampaignPositionCallUps(candidate: SlotCandidate): number {
  return candidate.campaignPositionCallUps ?? 0;
}

function getCampaignMatches(candidate: SlotCandidate): number {
  return candidate.campaignMatches ?? 0;
}

function getCampaignMinutes(candidate: SlotCandidate): number {
  return candidate.campaignMinutes ?? 0;
}

function getCampaignAvgRating(candidate: SlotCandidate): number | null {
  return candidate.campaignAvgRating ?? null;
}

function getSelectionScore(candidate: SlotCandidate): number | null {
  const selectionScore = (candidate as CandidateWithSelectionScore)
    .selectionScore;

  if (typeof selectionScore === "number" && Number.isFinite(selectionScore)) {
    return selectionScore;
  }

  return null;
}

function getCampaignRatingBonus(candidate: SlotCandidate): number {
  const avgRating = getCampaignAvgRating(candidate);

  if (avgRating === null) {
    return 0;
  }

  return Math.max(-8, Math.min(14, (avgRating - 6.8) * 8));
}

export function getCampaignCallUpScore(candidate: SlotCandidate): number {
  const roleScore = candidate.finalScore;

  const positionCallUps = getCampaignPositionCallUps(candidate);
  const totalCallUps = getCampaignCallUps(candidate);
  const matches = getCampaignMatches(candidate);
  const minutes = getCampaignMinutes(candidate);

  const positionCallUpsBonus = positionCallUps * 6;
  const totalCallUpsBonus = totalCallUps * 0.8;
  const matchesBonus = matches * 3.5;
  const minutesBonus = Math.min(16, (minutes / 90) * 1.5);
  const ratingBonus = getCampaignRatingBonus(candidate);
  const positionTrustBonus = positionCallUps > 0 ? 3 : 0;

  const noCampaignPenalty = totalCallUps === 0 ? 22 : 0;
  const outOfPositionPenalty =
    totalCallUps > 0 && positionCallUps === 0 ? 14 : 0;
  const noMatchPenalty = totalCallUps > 0 && matches === 0 ? 8 : 0;

  return (
    roleScore +
    positionCallUpsBonus +
    totalCallUpsBonus +
    matchesBonus +
    minutesBonus +
    ratingBonus +
    positionTrustBonus -
    noCampaignPenalty -
    outOfPositionPenalty -
    noMatchPenalty
  );
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

  if (scoreMode === "campaign-callups") {
    return getCampaignCallUpScore(candidate);
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

  if (scoreMode === "campaign-callups") {
    const positionCallUpsDiff =
      getCampaignPositionCallUps(right) - getCampaignPositionCallUps(left);

    if (positionCallUpsDiff !== 0) {
      return positionCallUpsDiff;
    }

    const matchesDiff = getCampaignMatches(right) - getCampaignMatches(left);

    if (matchesDiff !== 0) {
      return matchesDiff;
    }

    const minutesDiff = getCampaignMinutes(right) - getCampaignMinutes(left);

    if (minutesDiff !== 0) {
      return minutesDiff;
    }

    const totalCallUpsDiff = getCampaignCallUps(right) - getCampaignCallUps(left);

    if (totalCallUpsDiff !== 0) {
      return totalCallUpsDiff;
    }
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

  if (scoreMode === "campaign-callups") {
    const positionCallUps = getCampaignPositionCallUps(candidate);
    const totalCallUps = getCampaignCallUps(candidate);
    const matches = getCampaignMatches(candidate);

    return `${positionCallUps}/${totalCallUps} pow. · ${matches}M`;
  }

  return formatRoleScore(
    candidate.roleScore ?? candidate.roleResult?.score ?? candidate.finalScore
  );
}