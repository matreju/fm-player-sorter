import { ROLE_DEFINITIONS, type RolePhase } from "../constants/roles";
import type { FormationSlot, PitchPosition } from "../types/squadBuilderTypes";
import {
  FORMATION_PRESETS,
  PITCH_POSITIONS,
} from "../constants/squadBuilderFormations";
import { getPitchPosition } from "./squadBuilderPitch";

export type TacticalView = RolePhase;

export function getTacticalViewLabel(view: TacticalView) {
  return view === "with-ball" ? "Przy piłce" : "Bez piłki";
}

export function getSlotRoleIdForView(
  slot: FormationSlot,
  tacticalView: TacticalView
): string {
  if (tacticalView === "with-ball") {
    return slot.withBallRoleId ?? (slot.phase === "with-ball" ? slot.roleId : "best");
  }

  return slot.withoutBallRoleId ?? (slot.phase === "without-ball" ? slot.roleId : "best");
}

export function getSlotForTacticalView(
  slot: FormationSlot,
  tacticalView: TacticalView
): FormationSlot {
  if (tacticalView === "with-ball") {
    return {
      ...slot,
      phase: "with-ball",
      roleId: getSlotRoleIdForView(slot, "with-ball"),
    };
  }

  return {
    ...slot,
    label: slot.withoutBallLabel ?? slot.label,
    line: slot.withoutBallLine ?? slot.line,
    positionGroup: slot.withoutBallPositionGroup ?? slot.positionGroup,
    footRequirement: slot.withoutBallFootRequirement ?? slot.footRequirement,
    phase: "without-ball",
    roleId: getSlotRoleIdForView(slot, "without-ball"),
  };
}

export function normalizeTacticalSlot(slot: FormationSlot): FormationSlot {
  const withBallRoleId =
    slot.withBallRoleId ?? (slot.phase === "with-ball" ? slot.roleId : "best");
  const withoutBallRoleId =
    slot.withoutBallRoleId ?? (slot.phase === "without-ball" ? slot.roleId : "best");

  return {
    ...slot,
    withBallRoleId,
    withoutBallRoleId,
    withoutBallLabel: slot.withoutBallLabel ?? slot.label,
    withoutBallLine: slot.withoutBallLine ?? slot.line,
    withoutBallPositionGroup: slot.withoutBallPositionGroup ?? slot.positionGroup,
    withoutBallFootRequirement: slot.withoutBallFootRequirement ?? slot.footRequirement,
  };
}

export function normalizeTacticalSlots(slots: FormationSlot[]): FormationSlot[] {
  return slots.map(normalizeTacticalSlot);
}

export function roleExistsForSlotPhase(
  roleId: string,
  positionGroup: string,
  phase: TacticalView
): boolean {
  if (roleId === "best") return true;

  return ROLE_DEFINITIONS.some(
    (role) =>
      role.id === roleId &&
      role.positionGroup === positionGroup &&
      role.phase === phase
  );
}

/**
 * Funkcja legacy dla starszego tacticalPlanAdvisor. Nowy system używa osobnych
 * slotów PP/BP, ale zostawiamy ją, żeby stare importy nie rozwalały builda.
 */
export function applyWithoutBallFormationToSlots(
  slots: FormationSlot[],
  withoutBallFormationId: string
): {
  slots: FormationSlot[];
  pitchPositions: Record<string, PitchPosition>;
} {
  const preset =
    FORMATION_PRESETS.find((formation) => formation.id === withoutBallFormationId) ??
    FORMATION_PRESETS[0];

  const pitchPositions: Record<string, PitchPosition> = {};

  const nextSlots = slots.map((slot, index) => {
    const targetSlot = preset.slots[index] ?? slot;
    const targetPosition =
      PITCH_POSITIONS[withoutBallFormationId]?.[targetSlot.id] ??
      getPitchPosition(withoutBallFormationId, targetSlot);

    pitchPositions[slot.id] = targetPosition;

    return normalizeTacticalSlot({
      ...slot,
      withoutBallLabel: targetSlot.label,
      withoutBallLine: targetSlot.line,
      withoutBallPositionGroup: targetSlot.positionGroup,
      withoutBallFootRequirement: targetSlot.footRequirement,
      withoutBallRoleId: "best",
    });
  });

  return { slots: nextSlots, pitchPositions };
}
