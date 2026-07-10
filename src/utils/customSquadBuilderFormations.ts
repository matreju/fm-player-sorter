import type {
  FormationPreset,
  FormationSlot,
  PitchPosition,
} from "../types/squadBuilderTypes";

const CUSTOM_SQUAD_BUILDER_FORMATIONS_STORAGE_KEY =
  "fm-player-sorter-custom-squad-builder-formations-v1";

export type CustomSquadBuilderFormation = FormationPreset & {
  isCustom: true;
  createdAt: string;
  updatedAt: string;
  pitchPositions: Record<string, PitchPosition>;
};

type CreateCustomSquadBuilderFormationArgs = {
  name: string;
  slots: FormationSlot[];
  pitchPositions: Record<string, PitchPosition>;
};

function cloneSlots(slots: FormationSlot[]): FormationSlot[] {
  return slots.map((slot) => ({ ...slot }));
}

function clonePitchPositions(
  pitchPositions: Record<string, PitchPosition>
): Record<string, PitchPosition> {
  return Object.fromEntries(
    Object.entries(pitchPositions).map(([slotId, position]) => [
      slotId,
      { ...position },
    ])
  );
}

export function createCustomSquadBuilderFormation({
  name,
  slots,
  pitchPositions,
}: CreateCustomSquadBuilderFormationArgs): CustomSquadBuilderFormation {
  const now = new Date().toISOString();

  return {
    id: `custom-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    name,
    slots: cloneSlots(slots),
    pitchPositions: clonePitchPositions(pitchPositions),
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function loadCustomSquadBuilderFormations(): CustomSquadBuilderFormation[] {
  const saved = localStorage.getItem(CUSTOM_SQUAD_BUILDER_FORMATIONS_STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved) as CustomSquadBuilderFormation[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (formation) =>
        formation &&
        formation.isCustom === true &&
        typeof formation.id === "string" &&
        typeof formation.name === "string" &&
        Array.isArray(formation.slots)
    );
  } catch {
    localStorage.removeItem(CUSTOM_SQUAD_BUILDER_FORMATIONS_STORAGE_KEY);
    return [];
  }
}

export function saveCustomSquadBuilderFormations(
  formations: CustomSquadBuilderFormation[]
): void {
  localStorage.setItem(
    CUSTOM_SQUAD_BUILDER_FORMATIONS_STORAGE_KEY,
    JSON.stringify(formations)
  );
}

export function addCustomSquadBuilderFormation(
  currentFormations: CustomSquadBuilderFormation[],
  formation: CustomSquadBuilderFormation
): CustomSquadBuilderFormation[] {
  const nextFormations = [...currentFormations, formation];

  saveCustomSquadBuilderFormations(nextFormations);

  return nextFormations;
}

export function removeCustomSquadBuilderFormation(
  currentFormations: CustomSquadBuilderFormation[],
  formationId: string
): CustomSquadBuilderFormation[] {
  const nextFormations = currentFormations.filter(
    (formation) => formation.id !== formationId
  );

  saveCustomSquadBuilderFormations(nextFormations);

  return nextFormations;
}