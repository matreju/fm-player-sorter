import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type {
  FormationSlot,
  PitchPosition,
} from "../../types/squadBuilderTypes";
import {
  clamp,
  getPitchPosition,
  inferPositionGroupFromPitch,
  inferSlotLabelFromPitch,
} from "../../utils/squadBuilderPitch";
import {
  loadLocalStorageValue,
  saveLocalStorageValue,
} from "../../utils/localStorageValue";

const DEFAULT_PITCH_POSITIONS_STORAGE_KEY =
  "fm-player-sorter-squad-builder-pitch-positions-v1";

type UseSquadBuilderSlotDragParams = {
  formationId: string;
  storageKey?: string;
  initialCustomPitchPositions?: Record<string, PitchPosition>;
  getBasePitchPosition?: (slot: FormationSlot) => PitchPosition;
  onSelectSlot: (slotId: string) => void;
  onOpenDrawer: () => void;
  onUpdateSlot?: (slotId: string, patch: Partial<FormationSlot>) => void;
  onInferSlotFromPosition?: (
    slot: FormationSlot,
    position: PitchPosition,
    inferred: {
      label: string;
      positionGroup: string;
    }
  ) => Partial<FormationSlot>;
};

export function useSquadBuilderSlotDrag({
  formationId,
  storageKey = DEFAULT_PITCH_POSITIONS_STORAGE_KEY,
  initialCustomPitchPositions,
  getBasePitchPosition,
  onSelectSlot,
  onOpenDrawer,
  onUpdateSlot,
  onInferSlotFromPosition,
}: UseSquadBuilderSlotDragParams) {
  const pitchRef = useRef<HTMLDivElement | null>(null);
  const draggingSlotIdRef = useRef<string | null>(null);
  const dragStartPointerRef = useRef<{ x: number; y: number } | null>(null);
  const wasDraggingRef = useRef(false);

  const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null);
  const [customPitchPositions, setCustomPitchPositions] = useState<
    Record<string, PitchPosition>
  >(() =>
    loadLocalStorageValue<Record<string, PitchPosition>>(
      storageKey,
      initialCustomPitchPositions ?? {}
    )
  );

  useEffect(() => {
    saveLocalStorageValue(storageKey, customPitchPositions);
  }, [customPitchPositions, storageKey]);

  function resetCustomPitchPositions() {
    setCustomPitchPositions({});
  }

  function replaceCustomPitchPositions(
    nextPositions: Record<string, PitchPosition>
  ) {
    setCustomPitchPositions(nextPositions);
  }

  function getCurrentPitchPosition(slot: FormationSlot): PitchPosition {
    return (
      customPitchPositions[slot.id] ??
      getBasePitchPosition?.(slot) ??
      getPitchPosition(formationId, slot)
    );
  }

  function getPitchPositionFromPointer(
    clientX: number,
    clientY: number
  ): PitchPosition | null {
    const rect = pitchRef.current?.getBoundingClientRect();

    if (!rect) return null;

    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 6, 94),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 6, 94),
    };
  }

  function handleSlotPointerDown(
    event: PointerEvent<HTMLButtonElement>,
    slotId: string
  ) {
    event.currentTarget.setPointerCapture(event.pointerId);

    onSelectSlot(slotId);
    setDraggingSlotId(slotId);

    draggingSlotIdRef.current = slotId;
    dragStartPointerRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    wasDraggingRef.current = false;
  }

  function handleSlotPointerMove(
    event: PointerEvent<HTMLButtonElement>,
    slotId: string
  ) {
    if (draggingSlotIdRef.current !== slotId) return;

    const dragStart = dragStartPointerRef.current;
    const distance = dragStart
      ? Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y)
      : 0;

    if (distance < 4) return;

    const nextPosition = getPitchPositionFromPointer(event.clientX, event.clientY);

    if (!nextPosition) return;

    wasDraggingRef.current = true;

    setCustomPitchPositions((current) => ({
      ...current,
      [slotId]: nextPosition,
    }));
  }

  function handleSlotPointerUp(
    event: PointerEvent<HTMLButtonElement>,
    slot: FormationSlot
  ) {
    if (draggingSlotIdRef.current !== slot.id) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const nextPosition = getPitchPositionFromPointer(event.clientX, event.clientY);

    draggingSlotIdRef.current = null;
    dragStartPointerRef.current = null;
    setDraggingSlotId(null);

    if (!wasDraggingRef.current || !nextPosition) return;

    setCustomPitchPositions((current) => ({
      ...current,
      [slot.id]: nextPosition,
    }));

 const inferredPositionGroup =
      slot.positionGroup === "Bramkarz"
        ? "Bramkarz"
        : inferPositionGroupFromPitch(nextPosition);

    const inferredLabel = inferSlotLabelFromPitch(
      inferredPositionGroup,
      nextPosition
    );

    const baseInferredPatch = onInferSlotFromPosition
      ? onInferSlotFromPosition(slot, nextPosition, {
          label: inferredLabel,
          positionGroup: inferredPositionGroup,
        })
      : {
          label: inferredLabel,
          positionGroup: inferredPositionGroup,
          roleId:
            inferredPositionGroup !== slot.positionGroup ? "best" : slot.roleId,
        };

    const inferredPatch: Partial<FormationSlot> = {
      ...baseInferredPatch,
      ...(inferredPositionGroup === "Bramkarz"
        ? {
            label: "BR",
            positionGroup: "Bramkarz",
            roleId:
              slot.positionGroup !== "Bramkarz" ? "best" : slot.roleId,
            footRequirement: "any",
          }
        : {}),
    };

    onUpdateSlot?.(slot.id, inferredPatch);
  }

  function handleSlotPointerCancel(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    draggingSlotIdRef.current = null;
    dragStartPointerRef.current = null;
    setDraggingSlotId(null);
  }

  function handleSlotClick(event: MouseEvent<HTMLButtonElement>, slotId: string) {
    if (wasDraggingRef.current) {
      event.preventDefault();
      wasDraggingRef.current = false;
      return;
    }

    onSelectSlot(slotId);
    onOpenDrawer();
  }

  return {
    pitchRef,
    customPitchPositions,
    draggingSlotId,
    getCurrentPitchPosition,
    handleSlotPointerDown,
    handleSlotPointerMove,
    handleSlotPointerUp,
    handleSlotPointerCancel,
    handleSlotClick,
    resetCustomPitchPositions,
    replaceCustomPitchPositions,
  };
}
