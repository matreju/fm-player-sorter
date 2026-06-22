import { isGoalkeeper as isGoalkeeperByPosition } from "./playerPositionType";
import { ROLE_DEFINITIONS, type RoleDefinition } from "../constants/roles";
import type { TableRow } from "../types/table";
import type {
  CandidateKind,
  FootRequirement,
  FormationSlot,
  SlotCandidate,
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
import { getSlotForTacticalView, type TacticalView } from "./squadBuilderTacticalView";
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
    (role) => role.positionGroup === slot.positionGroup && role.phase === slot.phase
  );
}

function getBestRoleForSlot(row: TableRow, slot: FormationSlot): RoleScoreResult | null {
  const roles = getRoleOptions(slot).filter((role) => {
    if (slot.roleId === "best") return true;
    return role.id === slot.roleId;
  });

  let best: RoleScoreResult | null = null;

  for (const role of roles) {
    const result = calculateRoleScoreDetails(row, role);
    if (!result) continue;
    if (!best || result.score > best.score) best = result;
  }

  return best;
}



function getSoftPositionPenalty(kind: CandidateKind, fitGap: number): number {
  if (kind === "natural") return clamp(fitGap * 0.12, 0, 1.5);
  if (kind === "close") return clamp(2.5 + fitGap * 0.2, 2, 5);
  return clamp(6 + fitGap * 0.35, 5, 12);
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

function normalizeCandidateKind(rawKind: ReturnType<typeof getCandidateKind>): CandidateKind {
  if (rawKind === "natural") return "natural";
  if (rawKind === "close") return "close";
  return "conversion";
}

function getFallbackCandidateKindLabel(rawKind: ReturnType<typeof getCandidateKind>, kind: CandidateKind) {
  if (rawKind) return formatCandidateKind(rawKind);
  if (kind === "natural") return "⭐ Naturalny";
  if (kind === "close") return "◆ Bliski";
  return "↗ Eksperyment atrybutowy";
}

export function scorePlayerForSlot(row: TableRow, slot: FormationSlot): SlotCandidate | null {
  const rowIsGoalkeeper = isGoalkeeper(row);
  const slotIsGoalkeeper = slot.positionGroup === "Bramkarz";

  if (slotIsGoalkeeper && !rowIsGoalkeeper) return null;
  if (!slotIsGoalkeeper && rowIsGoalkeeper) return null;
if (!passesFootRequirement(row, slot.footRequirement)) {
  return null;
}
  const roleResult = getBestRoleForSlot(row, slot);
  if (!roleResult) return null;

  const availability = getPlayerAvailability(row);
  const formImpact = calculateClubFormImpact(row);
  const roleWithForm = applyClubFormImpact(roleResult.score, formImpact);
  const reliabilityImpact = getReliabilityImpact(row);

  if (slotIsGoalkeeper) {
    const finalScore = clampScore(roleWithForm + reliabilityImpact);

    return {
      row,
      key: getPlayerKey(row),
      name: getPlayerName(row),
      club: row["Klub"] || "-",
      position: row["Pozycja"] || "-",
      finalScore,
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
  const candidateKind = normalizeCandidateKind(rawKind);
  const fitGap = targetFit && overallFit ? Math.max(0, overallFit.score - targetFit.score) : 10;
  const positionPenalty = getSoftPositionPenalty(candidateKind, fitGap);
const finalScore = clampScore(roleWithForm + reliabilityImpact - positionPenalty);
  if (candidateKind === "conversion" && finalScore < 45) return null;

  return {
    row,
    key: getPlayerKey(row),
    name: getPlayerName(row),
    club: row["Klub"] || "-",
    position: row["Pozycja"] || "-",
    finalScore,
    roleScore: roleResult.score,
    roleResult,
    overallAbility: getOverallAbility(row),
positionPenalty,
positionScore: targetFit?.score,
sideScore: 100,
    candidateKind,
    candidateKindLabel: getFallbackCandidateKindLabel(rawKind, candidateKind),
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
  tacticalView: TacticalView
): SlotCandidate | null {
  const currentSlot = getSlotForTacticalView(slot, tacticalView);
  const currentCandidate = scorePlayerForSlot(row, currentSlot);

  if (!currentCandidate) {
    return null;
  }

  const withBallCandidate = scorePlayerForSlot(
    row,
    getSlotForTacticalView(slot, "with-ball")
  );

  const withoutBallCandidate = scorePlayerForSlot(
    row,
    getSlotForTacticalView(slot, "without-ball")
  );

  const phaseScore = currentCandidate.finalScore;
  const withBallScore = withBallCandidate?.finalScore ?? phaseScore;
  const withoutBallScore = withoutBallCandidate?.finalScore ?? phaseScore;

  return {
    ...currentCandidate,

    // WAŻNE:
    // finalScore zostaje dokładnie taki, jaki policzył scorePlayerForSlot()
    // dla aktualnie oglądanej fazy. Nie mieszamy już 80/20 z drugą fazą.
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