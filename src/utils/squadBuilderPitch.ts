import { PITCH_POSITIONS } from "../constants/squadBuilderFormations";
import type { FormationSlot, PitchPosition } from "../types/squadBuilderTypes";

const GOALKEEPER_SLOT: FormationSlot = {
  id: "GK",
  label: "BR",
  line: "Obrona",
  positionGroup: "Bramkarz",
  phase: "with-ball",
  roleId: "best",
  footRequirement: "any",
};

function hasGoalkeeperSlot(slots: FormationSlot[]): boolean {
  return slots.some(
    (slot) => slot.id === "GK" || slot.positionGroup === "Bramkarz"
  );
}

export function cloneFormationSlots(slots: FormationSlot[]): FormationSlot[] {
  const clonedSlots = slots.map((slot) => ({ ...slot }));

  if (hasGoalkeeperSlot(clonedSlots)) {
    return clonedSlots;
  }

  return [...clonedSlots, { ...GOALKEEPER_SLOT }];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function getPitchPosition(
  formationId: string,
  slot: FormationSlot
): PitchPosition {
  if (slot.id === "GK" || slot.positionGroup === "Bramkarz") {
    return { x: 50, y: 92 };
  }

  const presetPosition = PITCH_POSITIONS[formationId]?.[slot.id];

  const basePosition =
    presetPosition ??
    (slot.line === "Atak"
      ? { x: 50, y: 18 }
      : slot.line === "Pomoc"
        ? { x: 50, y: 50 }
        : { x: 50, y: 80 });

  if (
    slot.positionGroup === "Środkowy obrońca" ||
    slot.positionGroup === "Boczny obrońca"
  ) {
    return {
      ...basePosition,
      y: Math.min(basePosition.y, 74),
    };
  }

  if (slot.positionGroup === "Wahadłowy") {
    return {
      ...basePosition,
      y: Math.min(basePosition.y, 62),
    };
  }

  return basePosition;
}

export function getDetectedShape(
  slots: FormationSlot[],
  formationId: string,
  customPositions: Record<string, PitchPosition>
): string {
  const lines = {
    defence: 0,
    defensiveMidfield: 0,
    midfield: 0,
    attackingMidfield: 0,
    attack: 0,
  };

  for (const slot of slots) {
    if (slot.id === "GK" || slot.positionGroup === "Bramkarz") {
      continue;
    }

    const position =
      customPositions[slot.id] ?? getPitchPosition(formationId, slot);
    const y = position.y;

    if (y >= 70) {
      lines.defence += 1;
      continue;
    }

    if (y >= 50) {
      lines.defensiveMidfield += 1;
      continue;
    }

    if (y >= 37) {
      lines.midfield += 1;
      continue;
    }

    if (y >= 19) {
      lines.attackingMidfield += 1;
      continue;
    }

    lines.attack += 1;
  }

  return [
    lines.defence,
    lines.defensiveMidfield,
    lines.midfield,
    lines.attackingMidfield,
    lines.attack,
  ]
    .filter((value) => value > 0)
    .join("-");
}

export function inferPositionGroupFromPitch(position: PitchPosition): string {
  const isWide = position.x <= 28 || position.x >= 72;
  const y = position.y;

  if (y >= 88) {
    return "Bramkarz";
  }

  if (y >= 70) {
    return isWide ? "Boczny obrońca" : "Środkowy obrońca";
  }

  if (y >= 50) {
    return isWide ? "Wahadłowy" : "Defensywny pomocnik";
  }

  if (y >= 37) {
    return isWide ? "Boczny pomocnik" : "Środkowy pomocnik";
  }

  if (y >= 19) {
    return isWide ? "Skrzydłowy" : "Ofensywny pomocnik";
  }

  return "Napastnik";
}

export function inferSlotLabelFromPitch(
  positionGroup: string,
  position: PitchPosition
): string {
  if (positionGroup === "Bramkarz") {
    return "BR";
  }

  const x = position.x;

  if (positionGroup === "Napastnik") {
    if (x < 42) return "LN";
    if (x > 58) return "PN";
    return "N";
  }

  if (positionGroup === "Ofensywny pomocnik") {
    if (x < 42) return "LOP";
    if (x > 58) return "POP";
    return "OP";
  }

  if (positionGroup === "Skrzydłowy") {
    return x < 50 ? "LS" : "PS";
  }

  if (positionGroup === "Boczny pomocnik") {
    return x < 50 ? "LP" : "PP";
  }

  if (positionGroup === "Wahadłowy") {
    return x < 50 ? "LW" : "PW";
  }

  if (positionGroup === "Boczny obrońca") {
    return x < 50 ? "LO" : "PO";
  }

  if (positionGroup === "Środkowy pomocnik") {
    if (x < 42) return "LŚP";
    if (x > 58) return "PŚP";
    return "ŚP";
  }

  if (positionGroup === "Defensywny pomocnik") {
    if (x < 42) return "LDP";
    if (x > 58) return "PDP";
    return "DP";
  }

  if (positionGroup === "Środkowy obrońca") {
    if (x < 42) return "LŚO";
    if (x > 58) return "PŚO";
    return "ŚO";
  }

  return positionGroup;
}