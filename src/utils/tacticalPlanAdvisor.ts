import { FORMATION_PRESETS } from "../constants/squadBuilderFormations";
import type { TableRow } from "../types/table";
import type {
  FormationSlot,
  PlayerMark,
  SlotCandidate,
} from "../types/squadBuilderTypes";
import {
  getAverageLineupScore,
  getLineupCandidates,
  getLineupRows,
  getWeakestLineupScore,
  solveLineup,
} from "./squadBuilderLineupSolver";
import { cloneFormationSlots } from "./squadBuilderPitch";
import { getPlayerAvailability } from "./playerAvailability";

const PLAN_LIMIT = 6;
const WITH_BALL_PLAN_WEIGHT = 0.9;
const WITHOUT_BALL_PLAN_WEIGHT = 0.1;
const MIN_WITH_BALL_VARIETY_GAP = 0.15;

export type TacticalPlanRecommendation = {
  id: string;
  name: string;

  score: number;
  withBallScore: number;
  withoutBallScore: number;

  withBallFormationId: string;
  withBallFormationName: string;
  withoutBallFormationId: string;
  withoutBallFormationName: string;

  withBallSlots: FormationSlot[];
  withoutBallSlots: FormationSlot[];

  withBallSquad: Record<string, SlotCandidate | null>;
  withoutBallSquad: Record<string, SlotCandidate | null>;

  withBallAverage: number;
  withoutBallAverage: number;
  weakestWithBallScore: number;
  weakestWithoutBallScore: number;

  naturalCount: number;
  closeCount: number;
  conversionCount: number;
  injuredCount: number;

  warnings: string[];
};

type TacticalPlanAdvisorParams = {
  rows: TableRow[];
  getPlayerMark?: (row: TableRow) => PlayerMark | null;
  onlySelected: boolean;
  topOnlyNatural: boolean;
  limit?: number;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getRowName(row: TableRow) {
  return String(row["Nazwisko"] ?? "").trim();
}

function getAvailableRows({
  rows,
  getPlayerMark,
  onlySelected,
}: TacticalPlanAdvisorParams) {
  return rows.filter((row) => {
    const mark = getPlayerMark?.(row) ?? null;

    if (mark === "rejected") return false;
    if (onlySelected && mark !== "selected") return false;

    return true;
  });
}

function getLineupScore(lineup: Record<string, SlotCandidate | null>) {
  const average = getAverageLineupScore(lineup);
  const weakest = getWeakestLineupScore(lineup);

  return clampScore(average * 0.8 + weakest * 0.2);
}

function countCandidateKinds(candidates: SlotCandidate[]) {
  return {
    naturalCount: candidates.filter(
      (candidate) => candidate.candidateKind === "natural"
    ).length,
    closeCount: candidates.filter(
      (candidate) => candidate.candidateKind === "close"
    ).length,
    conversionCount: candidates.filter(
      (candidate) => candidate.candidateKind === "conversion"
    ).length,
  };
}

function getInjuryWarnings(candidates: SlotCandidate[]) {
  const injuredNames = candidates
    .filter((candidate) => getPlayerAvailability(candidate.row).isInjured)
    .map((candidate) => getRowName(candidate.row))
    .filter(Boolean);

  return injuredNames.map((name) => `Kontuzja: ${name}`);
}

function makeWithBallSlots(formationId: string) {
  const formation =
    FORMATION_PRESETS.find((preset) => preset.id === formationId) ??
    FORMATION_PRESETS[0];

  return cloneFormationSlots(formation.slots).map((slot) => ({
    ...slot,
    phase: "with-ball" as const,
    roleId: slot.withBallRoleId ?? slot.roleId ?? "best",
  }));
}

function makeWithoutBallSlots(formationId: string) {
  const formation =
    FORMATION_PRESETS.find((preset) => preset.id === formationId) ??
    FORMATION_PRESETS[0];

  return cloneFormationSlots(formation.slots).map((slot) => ({
    ...slot,
    phase: "without-ball" as const,
    roleId: slot.withoutBallRoleId ?? slot.roleId ?? "best",
  }));
}

function buildPlanRecommendation(
  withBallFormationId: string,
  withoutBallFormationId: string,
  withBallSlots: FormationSlot[],
  withoutBallSlots: FormationSlot[],
  withBallSquad: Record<string, SlotCandidate | null>,
  withoutBallSquad: Record<string, SlotCandidate | null>
): TacticalPlanRecommendation {
  const withBallFormation =
    FORMATION_PRESETS.find((preset) => preset.id === withBallFormationId) ??
    FORMATION_PRESETS[0];
  const withoutBallFormation =
    FORMATION_PRESETS.find((preset) => preset.id === withoutBallFormationId) ??
    FORMATION_PRESETS[0];

  const withBallCandidates = getLineupCandidates(withBallSquad);
  const candidateKinds = countCandidateKinds(withBallCandidates);
  const injuredWarnings = getInjuryWarnings(withBallCandidates);

  const withBallAverage = getAverageLineupScore(withBallSquad);
  const withoutBallAverage = getAverageLineupScore(withoutBallSquad);
  const weakestWithBallScore = getWeakestLineupScore(withBallSquad);
  const weakestWithoutBallScore = getWeakestLineupScore(withoutBallSquad);

  const withBallScore = getLineupScore(withBallSquad);
  const withoutBallScore = getLineupScore(withoutBallSquad);

  const conversionPenalty = candidateKinds.conversionCount * 1.25;
  const injuredPenalty = injuredWarnings.length * 0.75;

  const score = clampScore(
    withBallScore * WITH_BALL_PLAN_WEIGHT +
      withoutBallScore * WITHOUT_BALL_PLAN_WEIGHT -
      conversionPenalty -
      injuredPenalty
  );

  return {
    id: `${withBallFormationId}__${withoutBallFormationId}`,
    name: `${withBallFormation.name} / ${withoutBallFormation.name}`,
    score,
    withBallScore,
    withoutBallScore,
    withBallFormationId,
    withBallFormationName: withBallFormation.name,
    withoutBallFormationId,
    withoutBallFormationName: withoutBallFormation.name,
    withBallSlots,
    withoutBallSlots,
    withBallSquad,
    withoutBallSquad,
    withBallAverage,
    withoutBallAverage,
    weakestWithBallScore,
    weakestWithoutBallScore,
    naturalCount: candidateKinds.naturalCount,
    closeCount: candidateKinds.closeCount,
    conversionCount: candidateKinds.conversionCount,
    injuredCount: injuredWarnings.length,
    warnings: injuredWarnings.slice(0, 5),
  };
}

function comparePlans(
  left: TacticalPlanRecommendation,
  right: TacticalPlanRecommendation
) {
  if (right.score !== left.score) return right.score - left.score;
  if (right.withBallScore !== left.withBallScore) {
    return right.withBallScore - left.withBallScore;
  }
  if (right.withoutBallScore !== left.withoutBallScore) {
    return right.withoutBallScore - left.withoutBallScore;
  }
  return left.name.localeCompare(right.name, "pl");
}

function pickBestPlanPerWithBallFormation(
  plans: TacticalPlanRecommendation[]
): TacticalPlanRecommendation[] {
  const bestByWithBallFormation = new Map<string, TacticalPlanRecommendation>();

  for (const plan of plans) {
    const current = bestByWithBallFormation.get(plan.withBallFormationId);

    if (!current || comparePlans(plan, current) < 0) {
      bestByWithBallFormation.set(plan.withBallFormationId, plan);
    }
  }

  return [...bestByWithBallFormation.values()];
}

function removeAlmostDuplicateWithBallScores(
  plans: TacticalPlanRecommendation[]
): TacticalPlanRecommendation[] {
  const result: TacticalPlanRecommendation[] = [];

  for (const plan of plans) {
    const hasAlmostSameWithBallScore = result.some(
      (selectedPlan) =>
        Math.abs(selectedPlan.withBallScore - plan.withBallScore) <
        MIN_WITH_BALL_VARIETY_GAP
    );

    // Nie wycinamy wszystkiego na siłę. Jeżeli formacja jest inna, ale wynik
    // jest niemal identyczny, nadal może wejść, gdy brakuje propozycji.
    if (!hasAlmostSameWithBallScore || result.length < 3) {
      result.push(plan);
    }
  }

  return result;
}

export function getTacticalPlanRecommendations({
  rows,
  getPlayerMark,
  onlySelected,
  topOnlyNatural,
  limit = PLAN_LIMIT,
}: TacticalPlanAdvisorParams): TacticalPlanRecommendation[] {
  const availableRows = getAvailableRows({
    rows,
    getPlayerMark,
    onlySelected,
    topOnlyNatural,
  });

  const allPlans: TacticalPlanRecommendation[] = [];

  for (const withBallFormation of FORMATION_PRESETS) {
    const withBallSlots = makeWithBallSlots(withBallFormation.id);
    const withBallSquad = solveLineup(withBallSlots, availableRows, {
      topOnlyNatural,
    });
    const withBallCandidates = getLineupCandidates(withBallSquad);

    if (withBallCandidates.length < withBallSlots.length) continue;

    const selectedXiRows = getLineupRows(withBallSquad);

    for (const withoutBallFormation of FORMATION_PRESETS) {
      const withoutBallSlots = makeWithoutBallSlots(withoutBallFormation.id);
      const withoutBallSquad = solveLineup(withoutBallSlots, selectedXiRows, {
        topOnlyNatural,
      });
      const withoutBallCandidates = getLineupCandidates(withoutBallSquad);

      if (withoutBallCandidates.length < withoutBallSlots.length) continue;

      allPlans.push(
        buildPlanRecommendation(
          withBallFormation.id,
          withoutBallFormation.id,
          withBallSlots,
          withoutBallSlots,
          withBallSquad,
          withoutBallSquad
        )
      );
    }
  }

  const variedPlans = pickBestPlanPerWithBallFormation(allPlans).sort(comparePlans);
  const softlyFilteredPlans = removeAlmostDuplicateWithBallScores(variedPlans);

  const finalPlans =
    softlyFilteredPlans.length >= limit ? softlyFilteredPlans : variedPlans;

  return finalPlans.slice(0, limit);
}
