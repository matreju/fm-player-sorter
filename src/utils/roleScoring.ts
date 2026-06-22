import {
  ROLE_DEFINITIONS,
  type RoleDefinition,
  type RoleImportance,
  type RolePhase,
} from "../constants/roles";
import type { TableRow } from "../types/table";
import { parseAttributeValue } from "./attributeValue";

export type RolePhaseFilter = RolePhase | "any";

export type RoleSearchConfig = {
  positionGroup?: string;
  phase?: RolePhaseFilter;
  roleId?: string;
};

export type RoleScoreResult = {
  role: RoleDefinition;
  score: number;
  minScore: number;
  maxScore: number;
  uncertainty: number;
  usedAttributes: number;
  rangedAttributes: number;
};
type RoleGateStrategy = "allBelow" | "averageBelow";

type RoleGate = {
  roleIds: string[];
  attributes: string[];
  strategy: RoleGateStrategy;
  threshold: number;
  penalty: number;
  cap: number;
};

const ROLE_GATES: RoleGate[] = [
    // BRAMKARZE — przy piłce
  {
    roleIds: [
      "goalkeeper-playing-with-ball",
      "traditional-goalkeeper-with-ball",
      "goalkeeper-with-ball",
    ],
    attributes: [
      "Chwytanie",
      "Gra na przedpolu",
      "Komunikacja",
      "Refleks",
      "Zasięg wyskoku",
    ],
    strategy: "averageBelow",
    threshold: 9,
    penalty: 10,
    cap: 55,
  },

  // BRAMKARZE — bez piłki
  {
    roleIds: [
      "goalkeeper-without-ball",
      "sweeper-goalkeeper-without-ball",
      "line-goalkeeper-without-ball",
    ],
    attributes: [
      "Chwytanie",
      "Gra na przedpolu",
      "Komunikacja",
      "Refleks",
      "Zasięg wyskoku",
    ],
    strategy: "averageBelow",
    threshold: 9,
    penalty: 10,
    cap: 55,
  },
  // NAPASTNICY — przy piłce
  {
    roleIds: [
      "poacher",
      "deep-lying-forward",
      "target-forward",
      "complete-forward",
      "advanced-forward",
    ],
    attributes: ["Wykańczanie akcji", "Gra bez piłki"],
    strategy: "allBelow",
    threshold: 10,
    penalty: 8,
    cap: 58,
  },
  {
    roleIds: [
      "poacher",
      "deep-lying-forward",
      "target-forward",
      "complete-forward",
      "advanced-forward",
    ],
    attributes: [
      "Wykańczanie akcji",
      "Gra bez piłki",
      "Opanowanie",
      "Przewidywanie",
      "Przyspieszenie",
    ],
    strategy: "averageBelow",
    threshold: 11,
    penalty: 5,
    cap: 64,
  },
  {
    roleIds: ["false-nine"],
    attributes: ["Podania", "Drybling", "Przyjęcie piłki", "Technika"],
    strategy: "averageBelow",
    threshold: 11,
    penalty: 6,
    cap: 64,
  },

  // SKRZYDŁA / BOCZNI POMOCNICY — przy piłce
  {
    roleIds: [
      "winger-with-ball",
      "wide-midfielder-winger-with-ball",
      "complete-wing-back-with-ball",
      "wing-back-with-ball",
      "full-back-wing-back-with-ball",
      "full-back-with-ball",
    ],
    attributes: ["Dośrodkowania", "Drybling"],
    strategy: "allBelow",
    threshold: 10,
    penalty: 8,
    cap: 58,
  },
  {
    roleIds: [
      "winger-with-ball",
      "wide-midfielder-winger-with-ball",
      "complete-wing-back-with-ball",
      "wing-back-with-ball",
      "full-back-wing-back-with-ball",
      "full-back-with-ball",
    ],
    attributes: [
      "Dośrodkowania",
      "Drybling",
      "Podania",
      "Przyjęcie piłki",
      "Technika",
    ],
    strategy: "averageBelow",
    threshold: 11,
    penalty: 5,
    cap: 63,
  },
  {
    roleIds: [
      "wide-forward-with-ball",
      "inside-forward-with-ball",
      "inverted-winger-with-ball",
      "wide-midfielder-inverted-winger-with-ball",
    ],
    attributes: ["Drybling", "Przyspieszenie"],
    strategy: "allBelow",
    threshold: 10,
    penalty: 8,
    cap: 60,
  },
  {
    roleIds: [
      "wide-forward-with-ball",
      "inside-forward-with-ball",
      "inverted-winger-with-ball",
      "wide-midfielder-inverted-winger-with-ball",
    ],
    attributes: [
      "Drybling",
      "Przyjęcie piłki",
      "Technika",
      "Przyspieszenie",
      "Zwinność",
    ],
    strategy: "averageBelow",
    threshold: 11,
    penalty: 5,
    cap: 64,
  },
  {
    roleIds: [
      "wide-playmaker-with-ball",
      "wide-midfielder-wide-playmaker-with-ball",
      "wide-playmaker-wing-back-with-ball",
      "full-back-wide-playmaker-with-ball",
    ],
    attributes: ["Podania", "Przyjęcie piłki", "Technika", "Przegląd sytuacji"],
    strategy: "averageBelow",
    threshold: 11,
    penalty: 7,
    cap: 62,
  },

  // BOCZNI OBROŃCY / WAHADŁOWI — przy piłce
  {
    roleIds: [
      "full-back-with-ball",
      "full-back-wing-back-with-ball",
      "full-back-wide-playmaker-with-ball",
      "full-back-inverted-wing-back-with-ball",
      "inverted-full-back-with-ball",
      "complete-wing-back-with-ball",
      "wing-back-with-ball",
      "wide-playmaker-wing-back-with-ball",
      "inverted-wing-back-with-ball",
    ],
    attributes: ["Dośrodkowania", "Drybling"],
    strategy: "allBelow",
    threshold: 10,
    penalty: 8,
    cap: 58,
  },
  {
    roleIds: [
      "full-back-with-ball",
      "full-back-wing-back-with-ball",
      "full-back-wide-playmaker-with-ball",
      "full-back-inverted-wing-back-with-ball",
      "inverted-full-back-with-ball",
      "complete-wing-back-with-ball",
      "wing-back-with-ball",
      "wide-playmaker-wing-back-with-ball",
      "inverted-wing-back-with-ball",
    ],
    attributes: [
      "Dośrodkowania",
      "Drybling",
      "Podania",
      "Przyjęcie piłki",
      "Technika",
    ],
    strategy: "averageBelow",
    threshold: 11,
    penalty: 5,
    cap: 63,
  },

  // BOCZNI OBROŃCY / WAHADŁOWI — bez piłki
  {
    roleIds: [
      "pressing-full-back-without-ball",
      "defensive-full-back-without-ball",
      "full-back-without-ball",
      "pressing-wing-back-without-ball",
      "wing-back-without-ball",
      "defensive-wing-back-without-ball",
    ],
    attributes: ["Krycie", "Odbiór piłki"],
    strategy: "allBelow",
    threshold: 10,
    penalty: 8,
    cap: 58,
  },
  {
    roleIds: [
      "pressing-full-back-without-ball",
      "defensive-full-back-without-ball",
      "full-back-without-ball",
      "pressing-wing-back-without-ball",
      "wing-back-without-ball",
      "defensive-wing-back-without-ball",
    ],
    attributes: [
      "Krycie",
      "Odbiór piłki",
      "Przewidywanie",
      "Ustawianie się",
      "Koncentracja",
    ],
    strategy: "averageBelow",
    threshold: 11,
    penalty: 6,
    cap: 64,
  },

  // DEFENSYWNI POMOCNICY
  {
    roleIds: [
      "defensive-midfielder-with-ball",
      "segundo-volante-with-ball",
      "half-back-with-ball",
      "roaming-playmaker-dm-with-ball",
      "deep-lying-playmaker-dm-with-ball",
      "working-defensive-midfielder-without-ball",
      "wide-covering-defensive-midfielder-without-ball",
      "defensive-midfielder-without-ball",
      "dropping-defensive-midfielder-without-ball",
      "marking-defensive-midfielder-without-ball",
    ],
    attributes: ["Odbiór piłki", "Krycie"],
    strategy: "allBelow",
    threshold: 10,
    penalty: 8,
    cap: 58,
  },
  {
    roleIds: [
      "defensive-midfielder-with-ball",
      "segundo-volante-with-ball",
      "half-back-with-ball",
      "roaming-playmaker-dm-with-ball",
      "deep-lying-playmaker-dm-with-ball",
      "working-defensive-midfielder-without-ball",
      "wide-covering-defensive-midfielder-without-ball",
      "defensive-midfielder-without-ball",
      "dropping-defensive-midfielder-without-ball",
      "marking-defensive-midfielder-without-ball",
    ],
    attributes: [
      "Odbiór piłki",
      "Krycie",
      "Przewidywanie",
      "Ustawianie się",
      "Koncentracja",
    ],
    strategy: "averageBelow",
    threshold: 11,
    penalty: 6,
    cap: 64,
  },

  // ŚRODKOWI POMOCNICY
  {
    roleIds: [
      "central-midfielder-with-ball",
      "wide-central-midfielder-with-ball",
      "playmaker-midfielder-with-ball",
      "arriving-midfielder-with-ball",
      "attacking-midfielder-cm-with-ball",
      "advanced-playmaker-cm-with-ball",
    ],
    attributes: ["Podania", "Przyjęcie piłki", "Decyzje"],
    strategy: "averageBelow",
    threshold: 10.5,
    penalty: 5,
    cap: 66,
  },
  {
    roleIds: [
      "pressing-central-midfielder-without-ball",
      "wide-covering-central-midfielder-without-ball",
      "central-midfielder-without-ball",
      "marking-central-midfielder-without-ball",
    ],
    attributes: ["Odbiór piłki", "Pracowitość", "Przewidywanie", "Współpraca"],
    strategy: "averageBelow",
    threshold: 10.5,
    penalty: 5,
    cap: 66,
  },

  // OFENSYWNI POMOCNICY
  {
    roleIds: [
      "attacking-midfielder-am-with-ball",
      "free-role-am-with-ball",
      "advanced-playmaker-am-with-ball",
      "arriving-midfielder-am-with-ball",
      "false-forward-am-with-ball",
    ],
    attributes: ["Podania", "Przyjęcie piłki", "Technika", "Błyskotliwość"],
    strategy: "averageBelow",
    threshold: 11,
    penalty: 6,
    cap: 64,
  },
  {
    roleIds: [
      "attacking-midfielder-am-without-ball",
      "hanging-receiving-am-without-ball",
      "central-receiving-am-without-ball",
      "tracking-am-without-ball",
    ],
    attributes: ["Pracowitość", "Przewidywanie", "Współpraca"],
    strategy: "averageBelow",
    threshold: 10.5,
    penalty: 5,
    cap: 66,
  },

  // ŚRODKOWI OBROŃCY
  {
    roleIds: [
      "ball-playing-centre-back-with-ball",
      "overlapping-centre-back-with-ball",
      "advanced-centre-back-with-ball",
      "traditional-centre-back-with-ball",
      "centre-back-with-ball",
      "wide-centre-back-with-ball",
      "blocking-wide-centre-back-without-ball",
      "wide-centre-back-without-ball",
      "blocking-centre-back-without-ball",
      "centre-back-without-ball",
      "covering-wide-centre-back-without-ball",
      "covering-centre-back-without-ball",
    ],
    attributes: ["Krycie", "Odbiór piłki"],
    strategy: "allBelow",
    threshold: 10,
    penalty: 10,
    cap: 56,
  },
  {
    roleIds: [
      "ball-playing-centre-back-with-ball",
      "overlapping-centre-back-with-ball",
      "advanced-centre-back-with-ball",
      "traditional-centre-back-with-ball",
      "centre-back-with-ball",
      "wide-centre-back-with-ball",
      "blocking-wide-centre-back-without-ball",
      "wide-centre-back-without-ball",
      "blocking-centre-back-without-ball",
      "centre-back-without-ball",
      "covering-wide-centre-back-without-ball",
      "covering-centre-back-without-ball",
    ],
    attributes: [
      "Krycie",
      "Odbiór piłki",
      "Gra głową",
      "Przewidywanie",
      "Ustawianie się",
      "Skoczność",
    ],
    strategy: "averageBelow",
    threshold: 11,
    penalty: 7,
    cap: 63,
  },
];
const ROLE_GATES_BY_ROLE_ID = ROLE_GATES.reduce<Record<string, RoleGate[]>>(
  (accumulator, gate) => {
    for (const roleId of gate.roleIds) {
      if (!accumulator[roleId]) {
        accumulator[roleId] = [];
      }

      accumulator[roleId].push(gate);
    }

    return accumulator;
  },
  {}
);

function applyRoleGateAdjustment(
  score: number,
  row: TableRow,
  role: RoleDefinition,
  mode: ScoreMode
): number {
  let adjustedScore = score;
  let scoreCap = 100;

const gates = ROLE_GATES_BY_ROLE_ID[role.id] ?? [];

  for (const gate of gates) {
    const values = gate.attributes
      .map((attribute) => getParsedValue(row[attribute] ?? "", mode)?.value)
      .filter((value): value is number => value !== undefined);

    if (values.length === 0) {
      continue;
    }

    let failed = false;

    if (gate.strategy === "allBelow") {
      failed = values.every((value) => value < gate.threshold);
    }

    if (gate.strategy === "averageBelow") {
      const average =
        values.reduce((sum, value) => sum + value, 0) / values.length;

      failed = average < gate.threshold;
    }

    if (failed) {
      adjustedScore -= gate.penalty;
      scoreCap = Math.min(scoreCap, gate.cap);
    }
  }

  return Math.max(0, Math.min(adjustedScore, scoreCap));
}
type ScoreMode = "min" | "average" | "max";

export type RoleAttributeImportance = "core" | "key" | "important" | "support";

export const ROLE_ATTRIBUTE_WEIGHTS: Record<RoleAttributeImportance, number> = {
  core: 3.0,
  key: 2.1,
  important: 1.2,
  support: 0.65,
};

export const ROLE_ATTRIBUTE_GROUP_LABELS: Record<RoleAttributeImportance, string> = {
  core: "Rdzeń roli",
  key: "Kluczowe",
  important: "Ważne",
  support: "Pomocnicze",
};

export function getRoleAttributeGroupMeta(importance: RoleImportance) {
  const weight = ROLE_ATTRIBUTE_WEIGHTS[importance];

  return {
    importance,
    groupLabel: ROLE_ATTRIBUTE_GROUP_LABELS[importance],
    weight,
    weightLabel: `waga ${weight}`,
  };
}

const CORE_ATTRIBUTE_WEIGHT = ROLE_ATTRIBUTE_WEIGHTS.core;
const KEY_ATTRIBUTE_WEIGHT = ROLE_ATTRIBUTE_WEIGHTS.key;
const IMPORTANT_ATTRIBUTE_WEIGHT = ROLE_ATTRIBUTE_WEIGHTS.important;
const SUPPORT_ATTRIBUTE_WEIGHT = ROLE_ATTRIBUTE_WEIGHTS.support;
const roleScoreDetailsCache = new WeakMap<
  TableRow,
  Map<string, RoleScoreResult | null>
>();

function getParsedValue(
  value: string,
  mode: ScoreMode
): { value: number; isRange: boolean } | null {
  const parsed = parseAttributeValue(value);

  if (!parsed) {
    return null;
  }

  if (mode === "min") {
    return {
      value: parsed.min,
      isRange: parsed.isRange,
    };
  }

  if (mode === "max") {
    return {
      value: parsed.max,
      isRange: parsed.isRange,
    };
  }

  return {
    value: parsed.average,
    isRange: parsed.isRange,
  };
}

function addAttributeToScore(
  row: TableRow,
  attribute: string,
  weight: number,
  mode: ScoreMode,
  current: {
    weightedSum: number;
    totalWeight: number;
    usedAttributes: number;
    rangedAttributes: number;
  }
) {
  const parsed = getParsedValue(row[attribute] ?? "", mode);

  if (!parsed) {
    return current;
  }

  return {
    weightedSum: current.weightedSum + parsed.value * weight,
    totalWeight: current.totalWeight + weight,
    usedAttributes: current.usedAttributes + 1,
    rangedAttributes: current.rangedAttributes + (parsed.isRange ? 1 : 0),
  };
}

function calculateRawScoreForMode(
  row: TableRow,
  role: RoleDefinition,
  mode: ScoreMode
) {
  let scoreState = {
    weightedSum: 0,
    totalWeight: 0,
    usedAttributes: 0,
    rangedAttributes: 0,
  };

  const alreadyUsedAttributes = new Set<string>();

for (const attribute of role.coreAttributes ?? []) {
  alreadyUsedAttributes.add(attribute);

  scoreState = addAttributeToScore(
    row,
    attribute,
    CORE_ATTRIBUTE_WEIGHT,
    mode,
    scoreState
  );
}

for (const attribute of role.keyAttributes) {
  if (alreadyUsedAttributes.has(attribute)) {
    continue;
  }

  alreadyUsedAttributes.add(attribute);

  scoreState = addAttributeToScore(
    row,
    attribute,
    KEY_ATTRIBUTE_WEIGHT,
    mode,
    scoreState
  );
}

for (const attribute of role.importantAttributes) {
  if (alreadyUsedAttributes.has(attribute)) {
    continue;
  }

  alreadyUsedAttributes.add(attribute);

  scoreState = addAttributeToScore(
    row,
    attribute,
    IMPORTANT_ATTRIBUTE_WEIGHT,
    mode,
    scoreState
  );
}

for (const attribute of role.supportAttributes ?? []) {
  if (alreadyUsedAttributes.has(attribute)) {
    continue;
  }

  scoreState = addAttributeToScore(
    row,
    attribute,
    SUPPORT_ATTRIBUTE_WEIGHT,
    mode,
    scoreState
  );
}

  if (scoreState.totalWeight === 0) {
    return null;
  }

  const average = scoreState.weightedSum / scoreState.totalWeight;
  const rawScore = (average / 20) * 100;

  return {
    rawScore,
    usedAttributes: scoreState.usedAttributes,
    rangedAttributes: scoreState.rangedAttributes,
  };
}

function calculateKeyAttributeWeakness(
  row: TableRow,
  role: RoleDefinition,
  mode: ScoreMode
) {
  let penalty = 0;
  let below8 = 0;
  let below10 = 0;
  let below12 = 0;

  for (const attribute of [...(role.coreAttributes ?? []), ...role.keyAttributes]) {
    const parsed = getParsedValue(row[attribute] ?? "", mode);

    if (!parsed) {
      continue;
    }

    const value = parsed.value;

    if (value < 8) {
      below8 += 1;
      below10 += 1;
      below12 += 1;
      penalty += 10;
      continue;
    }

    if (value < 10) {
      below10 += 1;
      below12 += 1;
      penalty += 5;
      continue;
    }

    if (value < 12) {
      below12 += 1;
      penalty += 2;
    }
  }

  let scoreCap = 100;

  if (below8 >= 1) {
    scoreCap = Math.min(scoreCap, 55);
  }

  if (below10 >= 2) {
    scoreCap = Math.min(scoreCap, 58);
  } else if (below10 === 1) {
    scoreCap = Math.min(scoreCap, 66);
  }

  if (below12 >= 3) {
    scoreCap = Math.min(scoreCap, 68);
  } else if (below12 >= 2) {
    scoreCap = Math.min(scoreCap, 74);
  }

  return {
    penalty,
    scoreCap,
    below8,
    below10,
    below12,
  };
}

function applyRoleWeaknessAdjustment(
  rawScore: number,
  row: TableRow,
  role: RoleDefinition,
  mode: ScoreMode
): number {
  const weakness = calculateKeyAttributeWeakness(row, role, mode);

  const scoreAfterPenalty = rawScore - weakness.penalty;
  const cappedScore = Math.min(scoreAfterPenalty, weakness.scoreCap);

  return Math.max(0, cappedScore);
}

function calculateAdjustedScoreForMode(
  row: TableRow,
  role: RoleDefinition,
  mode: ScoreMode
) {
  const rawResult = calculateRawScoreForMode(row, role, mode);

  if (!rawResult) {
    return null;
  }

  const weaknessAdjustedScore = applyRoleWeaknessAdjustment(
    rawResult.rawScore,
    row,
    role,
    mode
  );

  const gateAdjustedScore = applyRoleGateAdjustment(
    weaknessAdjustedScore,
    row,
    role,
    mode
  );

  return {
    score: gateAdjustedScore,
    usedAttributes: rawResult.usedAttributes,
    rangedAttributes: rawResult.rangedAttributes,
  };
}

export function calculateRoleScoreDetails(
  row: TableRow,
  role: RoleDefinition
): RoleScoreResult | null {
  let rowCache = roleScoreDetailsCache.get(row);

  if (!rowCache) {
    rowCache = new Map<string, RoleScoreResult | null>();
    roleScoreDetailsCache.set(row, rowCache);
  }

  if (rowCache.has(role.id)) {
    return rowCache.get(role.id) ?? null;
  }

  const minResult = calculateAdjustedScoreForMode(row, role, "min");
  const averageResult = calculateAdjustedScoreForMode(row, role, "average");
  const maxResult = calculateAdjustedScoreForMode(row, role, "max");

  if (!averageResult) {
    rowCache.set(role.id, null);
    return null;
  }

  const minScore = minResult?.score ?? averageResult.score;
  const score = averageResult.score;
  const maxScore = maxResult?.score ?? averageResult.score;

  const result: RoleScoreResult = {
    role,
    score,
    minScore,
    maxScore,
    uncertainty: maxScore - minScore,
    usedAttributes: averageResult.usedAttributes,
    rangedAttributes: averageResult.rangedAttributes,
  };

  rowCache.set(role.id, result);

  return result;
}

export function calculateRoleScore(
  row: TableRow,
  role: RoleDefinition
): number | null {
  return calculateRoleScoreDetails(row, role)?.score ?? null;
}

export function getBestRoleMatch(
  row: TableRow,
  config: RoleSearchConfig = {}
): RoleScoreResult | null {
  const candidates = ROLE_DEFINITIONS.filter((role) => {
    if (config.positionGroup && role.positionGroup !== config.positionGroup) {
      return false;
    }

    if (config.phase && config.phase !== "any" && role.phase !== config.phase) {
      return false;
    }

    if (config.roleId && config.roleId !== "any" && role.id !== config.roleId) {
      return false;
    }

    return true;
  });

  let bestResult: RoleScoreResult | null = null;

  for (const role of candidates) {
    const result = calculateRoleScoreDetails(row, role);

    if (!result) {
      continue;
    }

    if (!bestResult || result.score > bestResult.score) {
      bestResult = result;
    }
  }

  return bestResult;
}

export function formatRoleScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return "-";
  }

  return score.toFixed(1);
}

export function formatRoleScoreRange(
  result: RoleScoreResult | null | undefined
): string {
  if (!result) {
    return "-";
  }

  if (result.uncertainty < 0.05) {
    return "-";
  }

  return `${result.minScore.toFixed(1)}–${result.maxScore.toFixed(1)}`;
}

export function formatRoleUncertainty(
  result: RoleScoreResult | null | undefined
): string {
  if (!result || result.uncertainty < 0.05) {
    return "-";
  }

  return `±${(result.uncertainty / 2).toFixed(1)}`;
}