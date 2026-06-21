import { isGoalkeeper as isGoalkeeperByPosition } from "./playerPositionType";
import { ROLE_DEFINITIONS, type RoleDefinition } from "../constants/roles";
import type { TableRow } from "../types/table";
import type {
  CandidateKind,
  FootRequirement,
  FormationSlot,
  SlotCandidate,
} from "../types/squadBuilderTypes";
import {
  calculateRoleScoreDetails,
  type RoleScoreResult,
} from "./roleScoring";
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

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const match = String(value).replace(",", ".").match(/-?\d+(\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);

  return Number.isFinite(parsed) ? parsed : null;
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

function getPlayerKey(row: TableRow): string {
  return [
    row["Nazwisko"] ?? "",
    row["Klub"] ?? "",
    row["Pozycja"] ?? "",
    row["Wiek"] ?? "",
  ].join("|");
}

function getPositionText(row: TableRow): string {
  return String(row["Pozycja"] || "").toLowerCase();
}

export function isGoalkeeper(row: TableRow): boolean {
  return isGoalkeeperByPosition(row);
}

function hasStriker(row: TableRow): boolean {
  const position = getPositionText(row);
  return /(^|[\s,/])n\s*\(/i.test(position) || position.includes("napast");
}

function hasWinger(row: TableRow): boolean {
  const position = getPositionText(row);
  return (
    /op\s*\([^)]*[pl]/i.test(position) ||
    /p\s*\([^)]*[pl]/i.test(position) ||
    position.includes("skrzyd")
  );
}

function hasWideMidfielder(row: TableRow): boolean {
  const position = getPositionText(row);
  return /(^|[\s,/])p\s*\([^)]*[pl]/i.test(position);
}

function hasWingBack(row: TableRow): boolean {
  const position = getPositionText(row);
  return /wo\s*\(/i.test(position) || position.includes("wahad");
}

function hasFullBack(row: TableRow): boolean {
  const position = getPositionText(row);
  return /o\s*\([^)]*[pl]/i.test(position) || position.includes("boczny");
}

function hasCentreBack(row: TableRow): boolean {
  const position = getPositionText(row);
  return (
    /o\s*\([^)]*ś/i.test(position) ||
    /o\s*\([^)]*s/i.test(position) ||
    position.includes("środkowy obrońca") ||
    position.includes("srodkowy obronca") ||
    position.includes("stoper")
  );
}

function hasDefensiveMidfielder(row: TableRow): boolean {
  const position = getPositionText(row);
  return position.includes("dp") || position.includes("defensywn");
}

function hasCentralMidfielder(row: TableRow): boolean {
  const position = getPositionText(row);
  return (
    /(^|[\s,/])p\s*\([^)]*[śs]/i.test(position) ||
    position.includes("środkowy pomocnik") ||
    position.includes("srodkowy pomocnik")
  );
}

function hasAttackingMidfielder(row: TableRow): boolean {
  const position = getPositionText(row);
  return /op\s*\([^)]*[śs]/i.test(position) || position.includes("ofensywn");
}

function getPositionPenalty(row: TableRow, positionGroup: string): number {
  const natural =
    (positionGroup === "Bramkarz" && isGoalkeeper(row)) ||
    (positionGroup === "Napastnik" && hasStriker(row)) ||
    (positionGroup === "Skrzydłowy" && hasWinger(row)) ||
    (positionGroup === "Boczny pomocnik" && hasWideMidfielder(row)) ||
    (positionGroup === "Wahadłowy" && hasWingBack(row)) ||
    (positionGroup === "Boczny obrońca" && hasFullBack(row)) ||
    (positionGroup === "Środkowy obrońca" && hasCentreBack(row)) ||
    (positionGroup === "Defensywny pomocnik" && hasDefensiveMidfielder(row)) ||
    (positionGroup === "Środkowy pomocnik" && hasCentralMidfielder(row)) ||
    (positionGroup === "Ofensywny pomocnik" && hasAttackingMidfielder(row));

  if (natural) return 0;

  const close =
    (positionGroup === "Boczny obrońca" && hasWingBack(row)) ||
    (positionGroup === "Wahadłowy" && hasFullBack(row)) ||
    (positionGroup === "Skrzydłowy" &&
      (hasWideMidfielder(row) || hasAttackingMidfielder(row))) ||
    (positionGroup === "Boczny pomocnik" &&
      (hasWinger(row) || hasFullBack(row))) ||
    (positionGroup === "Środkowy pomocnik" &&
      (hasDefensiveMidfielder(row) || hasAttackingMidfielder(row))) ||
    (positionGroup === "Defensywny pomocnik" && hasCentralMidfielder(row)) ||
    (positionGroup === "Ofensywny pomocnik" &&
      (hasCentralMidfielder(row) || hasWinger(row) || hasStriker(row))) ||
    (positionGroup === "Środkowy obrońca" && hasDefensiveMidfielder(row));

  if (close) return 4;

  return 10;
}

function getCandidateKindPenalty(kind: CandidateKind): number {
  if (kind === "natural") return 0;
  if (kind === "close") return 2;
  return 5;
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
  return Array.from(
    new Set(ROLE_DEFINITIONS.map((role) => role.positionGroup))
  );
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

function clampScore(value: number): number {
  return Math.max(0, Math.min(value, 100));
}

export function scorePlayerForSlot(
  row: TableRow,
  slot: FormationSlot
): SlotCandidate | null {
  const rowIsGoalkeeper = isGoalkeeper(row);
  const slotIsGoalkeeper = slot.positionGroup === "Bramkarz";

  // Twarda zasada:
  // BR tylko na BR, zawodnik z pola nigdy na BR.
  if (slotIsGoalkeeper && !rowIsGoalkeeper) {
    return null;
  }

  if (!slotIsGoalkeeper && rowIsGoalkeeper) {
    return null;
  }

  if (!passesFootRequirement(row, slot.footRequirement)) {
    return null;
  }

  const roleResult = getBestRoleForSlot(row, slot);

  if (!roleResult) {
    return null;
  }
  const availability = getPlayerAvailability(row);
  const formImpact = calculateClubFormImpact(row);
  const roleWithForm = applyClubFormImpact(roleResult.score, formImpact);

  // Bramkarz nie idzie przez calculatePositionFit,
  // bo positionScoring jest pisany pod zawodników z pola.
  if (slotIsGoalkeeper) {
    const finalScore = clampScore(roleWithForm);

    return {
      row,
      key: getPlayerKey(row),
      name: getPlayerName(row),
      club: row["Klub"] || "-",
      position: row["Pozycja"] || "-",
      finalScore,
      roleScore: roleResult.score,
      roleResult,
      positionPenalty: 0,
      candidateKind: "natural",
      candidateKindLabel: "Naturalny",
      footLabel: getFootLabel(row),

      infoStatus: availability.info,
      isInjured: availability.isInjured,
      availabilityLabel: availability.label,
      availabilityTone: availability.tone,
    };
  }

  const targetFit = calculatePositionFit(row, slot.positionGroup);
  const overallFit = getBestPositionFit(row);
  const candidateKind = getCandidateKind(targetFit, overallFit);

  if (!candidateKind || candidateKind === "forced") {
    return null;
  }

  const positionPenalty = Math.min(
    getPositionPenalty(row, slot.positionGroup),
    getCandidateKindPenalty(candidateKind)
  );

  const finalScore = clampScore(roleWithForm - positionPenalty);

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
    candidateKind,
    candidateKindLabel: formatCandidateKind(candidateKind),
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

  if (!currentCandidate) return null;

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
  const supportScore =
    tacticalView === "with-ball" ? withoutBallScore : withBallScore;
  const finalScore = clampScore(phaseScore * 0.78 + supportScore * 0.22);

  return {
    ...currentCandidate,
    finalScore,
    phaseScore,
    withBallScore,
    withoutBallScore,
    withBallRoleName:
      withBallCandidate?.roleResult.role.name ?? currentCandidate.roleResult.role.name,
    withoutBallRoleName:
      withoutBallCandidate?.roleResult.role.name ?? currentCandidate.roleResult.role.name,
  };
}
