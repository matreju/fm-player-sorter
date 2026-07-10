import { isGoalkeeper as isGoalkeeperByPosition } from "./playerPositionType";
import { ROLE_DEFINITIONS, type RoleDefinition } from "../constants/roles";
import type { TableRow } from "../types/table";
import type {
  CandidateKind,
  FootRequirement,
  FormationSlot,
  SlotCandidate,
  SlotCandidateScoreBreakdown,
} from "../types/squadBuilderTypes";
import { calculateRoleScoreDetails, type RoleScoreResult } from "./roleScoring";
import { getFootStrength } from "./filters";
import { applyClubFormImpact, calculateClubFormImpact } from "./clubForm";
import {
  calculatePositionFit,
  formatCandidateKind,
  getBestPositionFit,
  getCandidateKind,
} from "./positionScoring";
import {
  getSlotForTacticalView,
  type TacticalView,
} from "./squadBuilderTacticalView";
import { getPlayerAvailability } from "./playerAvailability";
import { parseAttributeValue } from "./attributeValue";
import { getPlayerKey } from "./playerIdentity";

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const match = String(value).replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getAttributeAverage(row: TableRow, name: string): number | null {
  const parsed = parseAttributeValue(String(row[name] ?? ""));
  return parsed?.average ?? null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampScore(value: number): number {
  return clamp(value, 0, 100);
}

export function getOverallAbility(row: TableRow): number | null {
  return (
    parseNumber(row["OU"]) ??
    parseNumber(row["Obecne Umiejętności"]) ??
    parseNumber(row["Obecne umiejętności"]) ??
    parseNumber(row["CA"])
  );
}
export type SquadBuilderScoringContext = {
  overallAbilityQ25: number | null;
  overallAbilityMedian: number | null;
  overallAbilityQ75: number | null;
  overallAbilityP90: number | null;
};

function getPercentile(sortedValues: number[], percentile: number): number | null {
  if (sortedValues.length === 0) {
    return null;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }
  const index = (sortedValues.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const weight = index - lowerIndex;

  const lowerValue = sortedValues[lowerIndex];
  const upperValue = sortedValues[upperIndex];

  return lowerValue + (upperValue - lowerValue) * weight;
}
export function createSquadBuilderScoringContext(
  rows: TableRow[]
): SquadBuilderScoringContext {
  const overallAbilityValues = rows
    .map((row) => getOverallAbility(row))
    .filter((value): value is number => value !== null && Number.isFinite(value))
    .sort((left, right) => left - right);

  return {
    overallAbilityQ25: getPercentile(overallAbilityValues, 0.25),
    overallAbilityMedian: getPercentile(overallAbilityValues, 0.5),
    overallAbilityQ75: getPercentile(overallAbilityValues, 0.75),
    overallAbilityP90: getPercentile(overallAbilityValues, 0.9),
  };
}
function interpolateScore(
  value: number,
  lowerValue: number,
  lowerScore: number,
  upperValue: number,
  upperScore: number
): number {
  if (upperValue <= lowerValue) {
    return (lowerScore + upperScore) / 2;
  }

  const progress = clamp((value - lowerValue) / (upperValue - lowerValue), 0, 1);

  return lowerScore + (upperScore - lowerScore) * progress;
}

function getOverallAbilityImpact(
  row: TableRow,
  scoringContext?: SquadBuilderScoringContext
): number {
  const overallAbility = getOverallAbility(row);

  if (overallAbility === null) {
    return 0;
  }
  const q25 = scoringContext?.overallAbilityQ25;
  const median = scoringContext?.overallAbilityMedian;
  const q75 = scoringContext?.overallAbilityQ75;
  const p90 = scoringContext?.overallAbilityP90;
  if (
    q25 === null ||
    q25 === undefined ||
    median === null ||
    median === undefined ||
    q75 === null ||
    q75 === undefined ||
    p90 === null ||
    p90 === undefined
  ) {
    return clamp((overallAbility - 123) / 6.5, -3.5, 6.5);
  }
  if (overallAbility <= q25) {
    return clamp(
      interpolateScore(overallAbility, q25 - 18, -3.0, q25, -1.4),
      -3.0,
      -1.4
    );
  }

  if (overallAbility <= median) {
    return interpolateScore(overallAbility, q25, -1.4, median, 0);
  }

  if (overallAbility <= q75) {
    return interpolateScore(overallAbility, median, 0, q75, 2.2);
  }

  if (overallAbility <= p90) {
    return interpolateScore(overallAbility, q75, 2.2, p90, 4.6);
  }
   return clamp(4.6 + (overallAbility - p90) * 0.14, 4.6, 6.4);
}

function getPlayerName(row: TableRow): string {
  return String(row["Nazwisko"] || "-");
}

export function isGoalkeeper(row: TableRow): boolean {
  return isGoalkeeperByPosition(row);
}

function passesFootRequirement(
  row: TableRow,
  requirement: FootRequirement
): boolean {
  if (requirement === "any") return true;

  const left = getFootStrength(row["Lewa noga"] ?? "");
  const right = getFootStrength(row["Prawa noga"] ?? "");

  if (requirement === "left") return left >= right;
  if (requirement === "right") return right >= left;

  if (requirement === "left-decent") return left >= 9;
  if (requirement === "left-strong") return left >= 12;
  if (requirement === "left-high") return left >= 15;
  if (requirement === "left-dominant") return left > right && left >= 9;

  if (requirement === "right-decent") return right >= 9;
  if (requirement === "right-strong") return right >= 12;
  if (requirement === "right-high") return right >= 15;
  if (requirement === "right-dominant") return right > left && right >= 9;

  if (requirement === "both-decent") return left >= 9 && right >= 9;
  if (requirement === "both-strong") return left >= 12 && right >= 12;

  return true;
}

function getFootLabel(row: TableRow): string {
  return `L: ${row["Lewa noga"] || "-"} · P: ${row["Prawa noga"] || "-"}`;
}

export function getPositionGroups(): string[] {
  return Array.from(new Set(ROLE_DEFINITIONS.map((role) => role.positionGroup)));
}

export function getRoleOptions(slot: FormationSlot): RoleDefinition[] {
  return ROLE_DEFINITIONS.filter(
    (role) =>
      role.positionGroup === slot.positionGroup && role.phase === slot.phase
  );
}

function getBestRoleForSlot(
  row: TableRow,
  slot: FormationSlot
): RoleScoreResult | null {
  const roles = getRoleOptions(slot).filter((role) => {
    if (slot.excludedRoleId && role.id === slot.excludedRoleId) {
      return false;
    }

    if (slot.roleId === "best") {
      return true;
    }

    return role.id === slot.roleId;
  });

  let best: RoleScoreResult | null = null;

  for (const role of roles) {
    const result = calculateRoleScoreDetails(row, role);

    if (!result) {
      continue;
    }

    if (!best || result.score > best.score) {
      best = result;
    }
  }

  return best;
}
function getSoftPositionPenalty(
  kind: CandidateKind,
  fitGap: number,
  roleScore: number
): number {
  if (kind === "natural") {
    return clamp(fitGap * 0.1, 0, 1.3);
  }

  if (kind === "close") {
    return clamp(3 + fitGap * 0.22, 2.5, 6.5);
  }

  // Bardzo mocna konwersja ma zostać w grze.
  // Przykład: skrzydłowy, który jako napastnik ma 80+.
  if (roleScore >= 80) {
    return clamp(6 + fitGap * 0.28, 5, 11);
  }

  return clamp(9 + fitGap * 0.38, 7, 16);
}

function getPositionBoostMultiplier(
  kind: CandidateKind,
  roleScore: number
): number {
  if (kind === "natural") return 1;
  if (kind === "close") return 0.72;

  // Jeśli ktoś naprawdę dobrze wypada w roli, nie kasujemy mu całego OU/formy.
  if (roleScore >= 80) return 0.58;
  if (roleScore >= 74) return 0.42;

  return 0.25;
}

function applyPositionBoostLimit(
  value: number,
  kind: CandidateKind,
  roleScore: number
): number {
  if (kind === "natural") {
    return clamp(value, -4, 8);
  }

  if (kind === "close") {
    return clamp(value, -3, 5);
  }

  if (roleScore >= 80) {
    return clamp(value, -2, 4.5);
  }

  return clamp(value, -2, 2.5);
}

function getReliabilityMultiplier(kind: CandidateKind): number {
  if (kind === "natural") return 1;
  if (kind === "close") return 0.75;
  return 0.45;
}

function getReliabilityImpact(row: TableRow): number {
  const importantMatches = getAttributeAverage(row, "Ważne mecze");
  const pressure = getAttributeAverage(row, "Presja");
  const consistency = getAttributeAverage(row, "Stabilność formy");
  const versatility = getAttributeAverage(row, "Wszechstronność");
  const professionalism = getAttributeAverage(row, "Profesjonalizm");
  const injury = getAttributeAverage(row, "Podatność na kontuzje");

  let impact = 0;

  if (importantMatches !== null) impact += (importantMatches - 10) * 0.16;
  if (pressure !== null) impact += (pressure - 10) * 0.12;
  if (consistency !== null) impact += (consistency - 10) * 0.1;
  if (versatility !== null) impact += (versatility - 10) * 0.08;
  if (professionalism !== null) impact += (professionalism - 10) * 0.05;
  if (injury !== null) impact -= Math.max(0, injury - 10) * 0.12;

  return clamp(impact, -4, 4.5);
}
function roundScorePart(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildScoreBreakdown({
  roleScore,
  formBoost,
  overallAbilityBoost,
  reliabilityBoost,
  positionPenalty,
  finalScore,
}: SlotCandidateScoreBreakdown): SlotCandidateScoreBreakdown {
  return {
    roleScore: roundScorePart(roleScore),
    formBoost: roundScorePart(formBoost),
    overallAbilityBoost: roundScorePart(overallAbilityBoost),
    reliabilityBoost: roundScorePart(reliabilityBoost),
    positionPenalty: roundScorePart(positionPenalty),
    finalScore: roundScorePart(finalScore),
  };
}
function normalizeCandidateKind(
  rawKind: ReturnType<typeof getCandidateKind>
): CandidateKind {
  if (rawKind === "natural") return "natural";
  if (rawKind === "close") return "close";
  return "conversion";
}

function getFallbackCandidateKindLabel(
  rawKind: ReturnType<typeof getCandidateKind>,
  kind: CandidateKind
) {
  if (rawKind) return formatCandidateKind(rawKind);
  if (kind === "natural") return "⭐ Naturalny";
  if (kind === "close") return "◆ Bliski";
  return "↗ Eksperyment atrybutowy";
}
type ManualCandidateKind = {
  kind: CandidateKind;
  label: string;
};

function normalizePositionText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .toUpperCase();
}

function hasWideLeftOrRight(positionText: string): boolean {
  return (
    positionText.includes("(L") ||
    positionText.includes("(P") ||
    positionText.includes("(PL") ||
    positionText.includes("(LP")
  );
}

function hasCentralMidPosition(positionText: string): boolean {
  return (
    positionText.includes("P (S") ||
    positionText.includes("P (LS") ||
    positionText.includes("P (PS") ||
    positionText.includes("P (LŚ") ||
    positionText.includes("P (PŚ")
  );
}

function hasCenterBackPosition(positionText: string): boolean {
  return (
    positionText.includes("O (S") ||
    positionText.includes("O (Ś") ||
    positionText.includes("SO") ||
    positionText.includes("ŚO")
  );
}

function hasDefensiveMidfielderPosition(positionText: string): boolean {
  return positionText.includes("DP");
}

function isCenterBackOnlyToDefensiveMidfielder(
  row: TableRow,
  slot: FormationSlot
): boolean {
  if (slot.positionGroup !== "Defensywny pomocnik") {
    return false;
  }

  const positionText = normalizePositionText(row["Pozycja"]);

  return (
    hasCenterBackPosition(positionText) &&
    !hasDefensiveMidfielderPosition(positionText) &&
    !hasCentralMidPosition(positionText)
  );
}

function getCenterBackToDefensiveMidfielderPenalty(roleScore: number): number | null {
  // Zwykły stoper odpada jako DP.
  if (roleScore < 76) {
    return null;
  }

  // Dobry atrybutowo, ale nadal mocno awaryjny.
  if (roleScore < 80) {
    return 16;
  }

  // Bardzo dobry profil pod DP, ale nadal nie naturalny pomocnik.
  if (roleScore < 84) {
    return 11;
  }

  // Wybitny profil, może być realną opcją.
  return 7;
}

function isPureCenterBackToDefensiveMidfielder(
  row: TableRow,
  slot: FormationSlot
): boolean {
  if (slot.positionGroup !== "Defensywny pomocnik") {
    return false;
  }

  const positionText = normalizePositionText(row["Pozycja"]);

  return (
    hasCenterBackPosition(positionText) &&
    !hasDefensiveMidfielderPosition(positionText) &&
    !hasCentralMidPosition(positionText)
  );
}
function getManualCandidateKindForSlot(
  row: TableRow,
  slot: FormationSlot
): ManualCandidateKind | null {
  const positionText = normalizePositionText(row["Pozycja"]);
  const group = slot.positionGroup;

  if (group === "Wahadłowy") {
    if (positionText.includes("WO")) {
      return {
        kind: "natural",
        label: "Naturalny wahadłowy",
      };
    }

    if (
      positionText.includes("O (L") ||
      positionText.includes("O (P") ||
      positionText.includes("P/OP") ||
      positionText.includes("OP (L") ||
      positionText.includes("OP (P")
    ) {
      return {
        kind: "close",
        label: "Boczny/szeroki profil jako wahadłowy",
      };
    }
  }

  if (group === "Boczny obrońca") {
    if (
      positionText.includes("O/WO") ||
      positionText.includes("O (L") ||
      positionText.includes("O (P")
    ) {
      return {
        kind: "natural",
        label: "Naturalny boczny obrońca",
      };
    }

    if (positionText.includes("WO")) {
      return {
        kind: "close",
        label: "Wahadłowy jako boczny obrońca",
      };
    }
  }

  if (group === "Środkowy obrońca") {
    if (
      positionText.includes("O (S") ||
      positionText.includes("O (Ś") ||
      positionText.includes("SO") ||
      positionText.includes("ŚO")
    ) {
      return {
        kind: "natural",
        label: "Naturalny środkowy obrońca",
      };
    }

    if (positionText.includes("DP")) {
      return {
        kind: "close",
        label: "Defensywny pomocnik jako środkowy obrońca",
      };
    }
  }

  if (group === "Defensywny pomocnik") {
  if (positionText.includes("DP")) {
    return {
      kind: "natural",
      label: "Naturalny defensywny pomocnik",
    };
  }

  if (hasCentralMidPosition(positionText)) {
    return {
      kind: "close",
      label: "Centralny pomocnik jako defensywny pomocnik",
    };
  }

  if (hasCenterBackPosition(positionText)) {
    return {
      kind: "conversion",
      label: "Środkowy obrońca awaryjnie jako defensywny pomocnik",
    };
  }
}
  if (group === "Środkowy pomocnik") {
    if (hasCentralMidPosition(positionText)) {
      return {
        kind: "natural",
        label: "Naturalny środkowy pomocnik",
      };
    }

    if (positionText.includes("DP") || positionText.includes("OP")) {
      return {
        kind: "close",
        label: "Bliski profil środkowego pomocnika",
      };
    }
  }

  if (group === "Ofensywny pomocnik") {
    if (positionText.includes("OP")) {
      return {
        kind: "natural",
        label: "Naturalny ofensywny pomocnik",
      };
    }

    if (hasCentralMidPosition(positionText) || positionText.includes("N (")) {
      return {
        kind: "close",
        label: "Bliski profil ofensywnego pomocnika",
      };
    }
  }

  if (group === "Skrzydłowy") {
    if (
      positionText.includes("OP (L") ||
      positionText.includes("OP (P") ||
      positionText.includes("P/OP")
    ) {
      return {
        kind: "natural",
        label: "Naturalny skrzydłowy",
      };
    }

    if (
      positionText.includes("P (L") ||
      positionText.includes("P (P") ||
      positionText.includes("WO")
    ) {
      return {
        kind: "close",
        label: "Szeroki profil jako skrzydłowy",
      };
    }
  }

  if (group === "Boczny pomocnik") {
    if (
      positionText.includes("P (L") ||
      positionText.includes("P (P") ||
      positionText.includes("P/OP")
    ) {
      return {
        kind: "natural",
        label: "Naturalny boczny pomocnik",
      };
    }

    if (
      positionText.includes("WO") ||
      positionText.includes("OP (L") ||
      positionText.includes("OP (P")
    ) {
      return {
        kind: "close",
        label: "Szeroki profil jako boczny pomocnik",
      };
    }
  }

  if (group === "Napastnik") {
    if (positionText.includes("N (")) {
      return {
        kind: "natural",
        label: "Naturalny napastnik",
      };
    }

    if (positionText.includes("OP") && hasWideLeftOrRight(positionText)) {
      return {
        kind: "close",
        label: "Skrzydłowy awaryjnie jako napastnik",
      };
    }

    if (positionText.includes("OP")) {
      return {
        kind: "close",
        label: "Ofensywny pomocnik jako napastnik",
      };
    }
  }

  return null;
}

function getCandidateKindRank(kind: CandidateKind): number {
  if (kind === "natural") return 3;
  if (kind === "close") return 2;
  return 1;
}

function pickStrongerCandidateKind(
  inferredKind: CandidateKind,
  manualKind: ManualCandidateKind | null
): CandidateKind {
  if (!manualKind) {
    return inferredKind;
  }

  return getCandidateKindRank(manualKind.kind) > getCandidateKindRank(inferredKind)
    ? manualKind.kind
    : inferredKind;
}

function getCandidateKindLabelForSlot({
  rawKind,
  finalKind,
  manualKind,
}: {
  rawKind: ReturnType<typeof getCandidateKind>;
  finalKind: CandidateKind;
  manualKind: ManualCandidateKind | null;
}) {
  if (manualKind && manualKind.kind === finalKind) {
    return manualKind.label;
  }

  return getFallbackCandidateKindLabel(rawKind, finalKind);
}
export function scorePlayerForSlot(
  row: TableRow,
  slot: FormationSlot,
  scoringContext?: SquadBuilderScoringContext
): SlotCandidate | null {
  const rowIsGoalkeeper = isGoalkeeper(row);
  const slotIsGoalkeeper = slot.positionGroup === "Bramkarz";

  if (slotIsGoalkeeper && !rowIsGoalkeeper) return null;
  if (!slotIsGoalkeeper && rowIsGoalkeeper) return null;

  if (!passesFootRequirement(row, slot.footRequirement)) {
  return null;
}

if (isPureCenterBackToDefensiveMidfielder(row, slot)) {
  return null;
}

const roleResult = getBestRoleForSlot(row, slot);
  if (!roleResult) return null;
const centerBackToDefensiveMidfielderPenalty =
  isCenterBackOnlyToDefensiveMidfielder(row, slot)
    ? getCenterBackToDefensiveMidfielderPenalty(roleResult.score)
    : 0;

if (centerBackToDefensiveMidfielderPenalty === null) {
  return null;
}
  const availability = getPlayerAvailability(row);
  const formImpact = calculateClubFormImpact(row);
  const roleWithForm = applyClubFormImpact(roleResult.score, formImpact);
  const reliabilityImpact = getReliabilityImpact(row);
const overallAbilityImpact = getOverallAbilityImpact(row, scoringContext);
  if (slotIsGoalkeeper) {
  const formOnlyBoost = roleWithForm - roleResult.score;

  const finalScore = clampScore(
    roleWithForm + reliabilityImpact + overallAbilityImpact
  );

  const scoreBreakdown = buildScoreBreakdown({
    roleScore: roleResult.score,
    formBoost: formOnlyBoost,
    overallAbilityBoost: overallAbilityImpact,
    reliabilityBoost: reliabilityImpact,
    positionPenalty: 0,
    finalScore,
  });

  return {
      row,
      key: getPlayerKey(row),
      name: getPlayerName(row),
      club: row["Klub"] || "-",
      position: row["Pozycja"] || "-",
      finalScore,
      scoreBreakdown,
      roleScore: roleResult.score,
      roleResult,
      overallAbility: getOverallAbility(row),
      positionPenalty: 0,
      positionScore: 100,
      mobilityScore: 100,
      sideScore: 100,
      candidateKind: "natural",
      candidateKindLabel: "Naturalny bramkarz",
      footLabel: getFootLabel(row),
      infoStatus: availability.info,
      isInjured: availability.isInjured,
      availabilityLabel: availability.label,
      availabilityTone: availability.tone,
    };
  }

  const targetFit = calculatePositionFit(row, slot.positionGroup);
const overallFit = getBestPositionFit(row);
const rawKind = getCandidateKind(targetFit, overallFit);
const inferredKind = normalizeCandidateKind(rawKind);
const manualKind = getManualCandidateKindForSlot(row, slot);
const candidateKind = pickStrongerCandidateKind(inferredKind, manualKind);
const candidateKindLabel = getCandidateKindLabelForSlot({
  rawKind,
  finalKind: candidateKind,
  manualKind,
});

const fitGap =
  targetFit && overallFit ? Math.max(0, overallFit.score - targetFit.score) : 10;

const basePositionPenalty = getSoftPositionPenalty(
  candidateKind,
  fitGap,
  roleResult.score
);

const positionPenalty =
  basePositionPenalty + centerBackToDefensiveMidfielderPenalty;
const boostMultiplier = getPositionBoostMultiplier(
  candidateKind,
  roleResult.score
);

  const formOnlyBoost = roleWithForm - roleResult.score;
  const adjustedFormBoost = applyPositionBoostLimit(
  formOnlyBoost * boostMultiplier,
  candidateKind,
  roleResult.score
);

  const adjustedOverallAbilityImpact = applyPositionBoostLimit(
  overallAbilityImpact * boostMultiplier,
  candidateKind,
  roleResult.score
);

  const adjustedReliabilityImpact =
    reliabilityImpact * getReliabilityMultiplier(candidateKind);

  const finalScore = clampScore(
    roleResult.score +
      adjustedFormBoost +
      adjustedOverallAbilityImpact +
      adjustedReliabilityImpact -
      positionPenalty
  );
const scoreBreakdown = buildScoreBreakdown({
  roleScore: roleResult.score,
  formBoost: adjustedFormBoost,
  overallAbilityBoost: adjustedOverallAbilityImpact,
  reliabilityBoost: adjustedReliabilityImpact,
  positionPenalty,
  finalScore,
});
  if (
  candidateKind === "conversion" &&
  roleResult.score < 67 &&
  finalScore < 54
) {
  return null;
}

  return {
    row,
    key: getPlayerKey(row),
    name: getPlayerName(row),
    club: row["Klub"] || "-",
    position: row["Pozycja"] || "-",
    finalScore,
    scoreBreakdown,
    roleScore: roleResult.score,
    roleResult,
    overallAbility: getOverallAbility(row),
    positionPenalty,
    positionScore: targetFit?.score,
    sideScore: 100,
    candidateKind,
candidateKindLabel,
    footLabel: getFootLabel(row),
    infoStatus: availability.info,
    isInjured: availability.isInjured,
    availabilityLabel: availability.label,
    availabilityTone: availability.tone,
  };
}

export function scorePlayerForTacticalSlot(
  row: TableRow,
  slot: FormationSlot,
  tacticalView: TacticalView,
  scoringContext?: SquadBuilderScoringContext
): SlotCandidate | null {
  const currentSlot = getSlotForTacticalView(slot, tacticalView);
const currentCandidate = scorePlayerForSlot(row, currentSlot, scoringContext);

  if (!currentCandidate) {
    return null;
  }

  const withBallCandidate = scorePlayerForSlot(
  row,
  getSlotForTacticalView(slot, "with-ball"),
  scoringContext
);

  const withoutBallCandidate = scorePlayerForSlot(
  row,
  getSlotForTacticalView(slot, "without-ball"),
  scoringContext
);

  const phaseScore = currentCandidate.finalScore;
  const withBallScore = withBallCandidate?.finalScore ?? phaseScore;
  const withoutBallScore = withoutBallCandidate?.finalScore ?? phaseScore;

  return {
    ...currentCandidate,
    finalScore: phaseScore,
    phaseScore,
    withBallScore,
    withoutBallScore,
    withBallRoleName:
      withBallCandidate?.roleResult.role.name ??
      currentCandidate.roleResult.role.name,
    withoutBallRoleName:
      withoutBallCandidate?.roleResult.role.name ??
      currentCandidate.roleResult.role.name,
  };
}