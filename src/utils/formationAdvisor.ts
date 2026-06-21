import { FORMATION_PRESETS } from "../constants/squadBuilderFormations";
import type { TableRow } from "../types/table";
import type {
  FormationPreset,
  FormationSlot,
  PlayerMark,
  SlotCandidate,
  SquadBuilderScoreMode,
} from "../types/squadBuilderTypes";
import { cloneFormationSlots } from "./squadBuilderPitch";
import { scorePlayerForSlot } from "./squadBuilderScoring";
import { solveSquad } from "./squadBuilderSolver";
import {
  compareCandidatesForMode,
  getCandidateFormationScoreForMode,
} from "./squadBuilderScoreMode";

export type FormationRecommendationSlot = {
  slot: FormationSlot;
  candidate: SlotCandidate | null;
};

export type FormationRecommendation = {
  formationId: string;
  formationName: string;
  score: number;
  averageScore: number;
  weakestSlotScore: number;
  filledSlots: number;
  slotCount: number;
  naturalCount: number;
  closeCount: number;
  conversionCount: number;
  emptySlots: string[];
  slots: FormationSlot[];
  recommendationSlots: FormationRecommendationSlot[];
};

type GetFormationRecommendationsParams = {
  rows: TableRow[];
  getPlayerMark?: (row: TableRow) => PlayerMark | null;
  onlySelected: boolean;
  scoreMode?: SquadBuilderScoreMode;
  limit?: number;
};

function getAvailableRows({
  rows,
  getPlayerMark,
  onlySelected,
}: GetFormationRecommendationsParams) {
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
}

function getCandidatesBySlot(
  slots: FormationSlot[],
  rows: TableRow[],
  scoreMode: SquadBuilderScoreMode
): Record<string, SlotCandidate[]> {
  const result: Record<string, SlotCandidate[]> = {};

  for (const slot of slots) {
    result[slot.id] = rows
      .map((row) => scorePlayerForSlot(row, slot))
      .filter((candidate): candidate is SlotCandidate => candidate !== null)
      .sort((left, right) =>
        compareCandidatesForMode(left, right, scoreMode)
      );
  }

  return result;
}

function evaluateFormation(
  preset: FormationPreset,
  availableRows: TableRow[],
  scoreMode: SquadBuilderScoreMode
): FormationRecommendation {
  const baseSlots = cloneFormationSlots(preset.slots).map((slot) => ({
    ...slot,
    roleId: "best",
  }));

  const candidatesBySlot = getCandidatesBySlot(
    baseSlots,
    availableRows,
    scoreMode
  );

  const suggestedSquad = solveSquad(baseSlots, candidatesBySlot);

  const recommendationSlots: FormationRecommendationSlot[] = baseSlots.map(
    (slot) => ({
      slot,
      candidate: suggestedSquad[slot.id] ?? null,
    })
  );

  const filled = recommendationSlots.filter((item) => item.candidate);
  const filledSlots = filled.length;
  const slotCount = baseSlots.length;

  const averageScore =
    filledSlots > 0
      ? filled.reduce(
          (sum, item) =>
            sum +
            getCandidateFormationScoreForMode(
              item.candidate as SlotCandidate,
              scoreMode
            ),
          0
        ) / filledSlots
      : 0;

  const weakestSlotScore =
    filledSlots > 0
      ? Math.min(
          ...filled.map((item) =>
            getCandidateFormationScoreForMode(
              item.candidate as SlotCandidate,
              scoreMode
            )
          )
        )
      : 0;

  const naturalCount = filled.filter(
    (item) => item.candidate?.candidateKind === "natural"
  ).length;

  const closeCount = filled.filter(
    (item) => item.candidate?.candidateKind === "close"
  ).length;

  const conversionCount = filled.filter(
    (item) => item.candidate?.candidateKind === "conversion"
  ).length;

  const emptySlots = recommendationSlots
    .filter((item) => !item.candidate)
    .map((item) => item.slot.label);

  const coverageScore = (filledSlots / slotCount) * 100;
  const naturalScore = (naturalCount / slotCount) * 100;
  const closeScore = (closeCount / slotCount) * 60;
  const conversionPenalty = conversionCount * 3;
  const emptyPenalty = emptySlots.length * 14;

  const score = Math.max(
    0,
    Math.min(
      100,
      averageScore * 0.54 +
        weakestSlotScore * 0.22 +
        coverageScore * 0.14 +
        naturalScore * 0.07 +
        closeScore * 0.03 -
        conversionPenalty -
        emptyPenalty
    )
  );

  const slotsWithRecommendedRoles = baseSlots.map((slot) => {
    const candidate = suggestedSquad[slot.id];

    if (!candidate) {
      return slot;
    }

    return {
      ...slot,
      roleId: candidate.roleResult.role.id,
      phase: candidate.roleResult.role.phase,
    };
  });

  return {
    formationId: preset.id,
    formationName: preset.name,
    score,
    averageScore,
    weakestSlotScore,
    filledSlots,
    slotCount,
    naturalCount,
    closeCount,
    conversionCount,
    emptySlots,
    slots: slotsWithRecommendedRoles,
    recommendationSlots,
  };
}

export function getFormationRecommendations({
  rows,
  getPlayerMark,
  onlySelected,
  scoreMode = "role-score",
  limit = 5,
}: GetFormationRecommendationsParams): FormationRecommendation[] {
  const availableRows = getAvailableRows({
    rows,
    getPlayerMark,
    onlySelected,
  });

  return FORMATION_PRESETS.map((preset) =>
    evaluateFormation(preset, availableRows, scoreMode)
  )
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}