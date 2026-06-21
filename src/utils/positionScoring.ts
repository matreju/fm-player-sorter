
import { ROLE_DEFINITIONS, type RoleDefinition, type RolePhase } from "../constants/roles";
import type { TableRow } from "../types/table";
import { calculateRoleScore, formatRoleScore } from "./roleScoring";

export type CandidateKind = "natural" | "close" | "conversion" | "forced";

export type PhaseRoleScore = {
  role: RoleDefinition;
  score: number;
};

export type PositionFitResult = {
  positionGroup: string;
  score: number;
  withBall: PhaseRoleScore | null;
  withoutBall: PhaseRoleScore | null;
  primaryRole: PhaseRoleScore | null;
};

type PositionWeights = {
  withBall: number;
  withoutBall: number;
};

const POSITION_PHASE_WEIGHTS: Record<string, PositionWeights> = {
  Napastnik: {
    withBall: 0.78,
    withoutBall: 0.22,
  },
  Skrzydłowy: {
    withBall: 0.74,
    withoutBall: 0.26,
  },
  "Boczny pomocnik": {
    withBall: 0.62,
    withoutBall: 0.38,
  },
  Wahadłowy: {
    withBall: 0.54,
    withoutBall: 0.46,
  },
  "Boczny obrońca": {
    withBall: 0.43,
    withoutBall: 0.57,
  },
  "Defensywny pomocnik": {
    withBall: 0.45,
    withoutBall: 0.55,
  },
  "Środkowy pomocnik": {
    withBall: 0.55,
    withoutBall: 0.45,
  },
  "Ofensywny pomocnik": {
    withBall: 0.76,
    withoutBall: 0.24,
  },
  "Środkowy obrońca": {
    withBall: 0.36,
    withoutBall: 0.64,
  },
};

const ATTACKING_POSITION_GROUPS = new Set([
  "Napastnik",
  "Skrzydłowy",
  "Ofensywny pomocnik",
]);

const POSITION_GROUPS = Array.from(
  new Set(ROLE_DEFINITIONS.map((role) => role.positionGroup))
);

const ROLES_BY_POSITION_AND_PHASE = new Map<string, RoleDefinition[]>();

for (const role of ROLE_DEFINITIONS) {
  const key = `${role.positionGroup}|${role.phase}`;
  const currentRoles = ROLES_BY_POSITION_AND_PHASE.get(key) ?? [];

  currentRoles.push(role);
  ROLES_BY_POSITION_AND_PHASE.set(key, currentRoles);
}

export function getPositionGroups(): string[] {
  return POSITION_GROUPS;
}

function getRolesForPhase(
  positionGroup: string,
  phase: RolePhase
): RoleDefinition[] {
  return ROLES_BY_POSITION_AND_PHASE.get(`${positionGroup}|${phase}`) ?? [];
}

function getPositionWeights(positionGroup: string): PositionWeights {
  return (
    POSITION_PHASE_WEIGHTS[positionGroup] ?? {
      withBall: 0.5,
      withoutBall: 0.5,
    }
  );
}

function getBestRoleForPhase(
  row: TableRow,
  positionGroup: string,
  phase: RolePhase
): PhaseRoleScore | null {
const roles = getRolesForPhase(positionGroup, phase);

  let best: PhaseRoleScore | null = null;

  for (const role of roles) {
    const score = calculateRoleScore(row, role);

    if (score === null || !Number.isFinite(score)) {
      continue;
    }

    if (!best || score > best.score) {
      best = {
        role,
        score,
      };
    }
  }

  return best;
}

export function calculatePositionFit(
  row: TableRow,
  positionGroup: string
): PositionFitResult | null {
  const withBall = getBestRoleForPhase(row, positionGroup, "with-ball");
  const withoutBall = getBestRoleForPhase(row, positionGroup, "without-ball");

  if (!withBall && !withoutBall) {
    return null;
  }

  const weights = getPositionWeights(positionGroup);

  let score: number;

  if (withBall && withoutBall) {
    score = withBall.score * weights.withBall + withoutBall.score * weights.withoutBall;
  } else if (withBall) {
    score = withBall.score;
  } else {
    score = withoutBall!.score;
  }

  const primaryRole =
    weights.withBall >= weights.withoutBall
      ? withBall ?? withoutBall
      : withoutBall ?? withBall;

  return {
    positionGroup,
    score,
    withBall,
    withoutBall,
    primaryRole,
  };
}

export function getBestPositionFit(row: TableRow): PositionFitResult | null {
  let best: PositionFitResult | null = null;

  for (const positionGroup of getPositionGroups()) {
    const fit = calculatePositionFit(row, positionGroup);

    if (!fit) {
      continue;
    }

    if (!best || fit.score > best.score) {
      best = fit;
    }
  }

  return best;
}

export function getCandidateKind(
  targetFit: PositionFitResult | null,
  overallFit: PositionFitResult | null
): CandidateKind | null {
  if (!targetFit || !overallFit) {
    return null;
  }

  const difference = overallFit.score - targetFit.score;

  if (targetFit.positionGroup === overallFit.positionGroup) {
    return "natural";
  }

  if (difference <= 3) {
    return "close";
  }

  if (
    ATTACKING_POSITION_GROUPS.has(targetFit.positionGroup) &&
    targetFit.withBall &&
    targetFit.withoutBall &&
    targetFit.withBall.score + 10 < targetFit.withoutBall.score
  ) {
    return "forced";
  }

  if (difference <= 8) {
    return "conversion";
  }

  return "forced";
}

export function formatCandidateKind(kind: CandidateKind | null): string {
  if (kind === "natural") return "⭐ Naturalny";
  if (kind === "close") return "◆ Bliski";
  if (kind === "conversion") return "↗ Do przestawienia";
  if (kind === "forced") return "⚠ Naciągany";

  return "-";
}

export function formatPositionScore(score: number | null | undefined): string {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return "-";
  }

  return formatRoleScore(score);
}

export function getPhaseLabel(phase: RolePhase): string {
  if (phase === "with-ball") return "przy piłce";
  return "bez piłki";
}