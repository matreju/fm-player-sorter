import { useEffect, useMemo, useState } from "react";
import { squadBuilderStyles as styles } from "./squadBuilderStyles";
import { SquadBuilderToolbar } from "./SquadBuilderToolbar";
import { SquadBuilderPitch } from "./SquadBuilderPitch";
import { SquadBuilderActiveSlotPanel } from "./SquadBuilderActiveSlotPanel";
import { SquadBuilderPlanSuggestionsModal } from "./SquadBuilderPlanSuggestionsModal";
import { useSquadBuilderSlotDrag } from "./useSquadBuilderSlotDrag";
import { useSquadBuilderSuggestions } from "./useSquadBuilderSuggestions";
import { SquadBuilderDrawerShell } from "./SquadBuilderDrawerShell";
import {
  loadLocalStorageValue,
  saveLocalStorageValue,
} from "../../utils/localStorageValue";
import { FORMATION_PRESETS } from "../../constants/squadBuilderFormations";
import {
  cloneFormationSlots,
  getDetectedShape,
} from "../../utils/squadBuilderPitch";
import {
  normalizeTacticalSlots,
  roleExistsForSlotPhase,
  type TacticalView,
} from "../../utils/squadBuilderTacticalView";
import {
  getTacticalPlanRecommendations,
  type TacticalPlanRecommendation,
} from "../../utils/tacticalPlanAdvisor";
import type {
  FormationSlot,
  SquadBuilderProps,
  SquadBuilderScoreMode,
} from "../../types/squadBuilderTypes";

const SQUAD_BUILDER_STATE_STORAGE_KEY =
  "fm-player-sorter-squad-builder-state-v3"

type PersistedSquadBuilderState = {
  isOpen?: boolean;
  formationId?: string;
  withoutBallFormationId?: string;
  activeSlotId?: string;
  tacticalView?: TacticalView;
  onlySelected?: boolean;
  topOnlyNatural?: boolean;
  scoreMode?: SquadBuilderScoreMode;
  slots?: FormationSlot[];
  withoutBallSlotOverrides?: Record<string, Partial<FormationSlot>>;
};

function getDefaultFormationId() {
  return FORMATION_PRESETS.some((preset) => preset.id === "433dm")
    ? "433dm"
    : FORMATION_PRESETS[0]?.id ?? "";
}

function getValidFormationId(formationId: string | undefined) {
  if (!formationId) return getDefaultFormationId();

  return FORMATION_PRESETS.some((preset) => preset.id === formationId)
    ? formationId
    : getDefaultFormationId();
}

function getFormationById(formationId: string) {
  return (
    FORMATION_PRESETS.find((preset) => preset.id === formationId) ??
    FORMATION_PRESETS[0]
  );
}

function makeWithBallSlots(slots: FormationSlot[]): FormationSlot[] {
  return normalizeTacticalSlots(slots).map((slot) => ({
    ...slot,
    phase: "with-ball" as const,
    roleId: slot.withBallRoleId ?? slot.roleId ?? "best",
  }));
}

function makeWithoutBallSlots(
  formationId: string,
  overrides: Record<string, Partial<FormationSlot>>
): FormationSlot[] {
  const formation = getFormationById(formationId);

  return cloneFormationSlots(formation.slots).map((slot) => {
    const override = overrides[slot.id] ?? {};

    return {
      ...slot,
      ...override,
      phase: "without-ball" as const,
      roleId:
        override.roleId ??
        override.withoutBallRoleId ??
        slot.withoutBallRoleId ??
        slot.roleId ??
        "best",
    };
  });
}

export function SquadBuilder({
  rows,
  getPlayerMark,
  onSelectPlayer,
  onClearCallUps,
  selectedPlayersCount = 0,
}: SquadBuilderProps) {
  const [persistedState] = useState(() =>
    loadLocalStorageValue<PersistedSquadBuilderState>(
      SQUAD_BUILDER_STATE_STORAGE_KEY,
      {}
    )
  );

  const initialFormationId = getValidFormationId(persistedState.formationId);
  const initialFormation = getFormationById(initialFormationId);

const [isSquadDrawerOpen, setIsSquadDrawerOpen] = useState(false);

  const [formationId, setFormationId] = useState(initialFormationId);

  const [withoutBallFormationId, setWithoutBallFormationId] = useState(
    getValidFormationId(
      persistedState.withoutBallFormationId ?? initialFormationId
    )
  );

  const [slots, setSlots] = useState<FormationSlot[]>(() => {
    if (persistedState.slots && persistedState.slots.length > 0) {
      return cloneFormationSlots(persistedState.slots);
    }

    return cloneFormationSlots(initialFormation.slots);
  });

  const [withoutBallSlotOverrides, setWithoutBallSlotOverrides] = useState<
    Record<string, Partial<FormationSlot>>
  >(persistedState.withoutBallSlotOverrides ?? {});

  const [activeSlotId, setActiveSlotId] = useState(
    persistedState.activeSlotId ?? initialFormation.slots[0]?.id ?? ""
  );

  const [tacticalView, setTacticalView] = useState<TacticalView>(
    persistedState.tacticalView ?? "with-ball"
  );

  const [onlySelected, setOnlySelected] = useState(
    persistedState.onlySelected ?? false
  );

  const [topOnlyNatural, setTopOnlyNatural] = useState(
    persistedState.topOnlyNatural ?? false
  );

  const [scoreMode, setScoreMode] = useState<SquadBuilderScoreMode>(
    persistedState.scoreMode ?? "role-score"
  );

  const [isPlanSuggestionsOpen, setIsPlanSuggestionsOpen] = useState(false);

  const formation = getFormationById(formationId);
  const withoutBallFormation = getFormationById(withoutBallFormationId);

  const withBallSlots = useMemo(() => makeWithBallSlots(slots), [slots]);

  const withoutBallSlots = useMemo(
    () => makeWithoutBallSlots(withoutBallFormationId, withoutBallSlotOverrides),
    [withoutBallFormationId, withoutBallSlotOverrides]
  );

  const activeSlots =
    tacticalView === "with-ball" ? withBallSlots : withoutBallSlots;

  const activeSlot =
    activeSlots.find((slot) => slot.id === activeSlotId) ??
    activeSlots[0] ??
    null;

  useEffect(() => {
    saveLocalStorageValue<PersistedSquadBuilderState>(
  SQUAD_BUILDER_STATE_STORAGE_KEY,
  {
    formationId,
    withoutBallFormationId,
    activeSlotId,
    tacticalView,
    onlySelected,
    topOnlyNatural,
    scoreMode,
    slots,
    withoutBallSlotOverrides,
  }
);
  }, [
    formationId,
    withoutBallFormationId,
    activeSlotId,
    tacticalView,
    onlySelected,
    topOnlyNatural,
    scoreMode,
    slots,
    withoutBallSlotOverrides,
  ]);

  const {
    availableRows,
    suggestedSquadWithBall,
    suggestedSquadWithoutBall,
    hiddenTopCount,
    lockedSlotCandidateKeys,
    getVisibleTopCandidates,
    toggleSlotCandidateLock,
    clearLockedSlotCandidate,
    clearLockedSlotCandidates,
    hideTopCandidate,
    clearHiddenTopCandidates,
  } = useSquadBuilderSuggestions({
    rows,
    withBallSlots,
    withoutBallSlots,
    tacticalView,
    onlySelected,
    topOnlyNatural,
    scoreMode,
    getPlayerMark,
  });

  const tacticalPlanRecommendations = useMemo(() => {
    return getTacticalPlanRecommendations({
      rows,
      getPlayerMark,
      onlySelected,
      topOnlyNatural,
      limit: 4,
    });
  }, [rows, getPlayerMark, onlySelected, topOnlyNatural]);

  function updateWithBallSlot(slotId: string, patch: Partial<FormationSlot>) {
    clearLockedSlotCandidate(slotId, "with-ball");

    setSlots((current) =>
      current.map((slot) => {
        if (slot.id !== slotId) return slot;

        const nextSlot: FormationSlot = {
          ...slot,
          ...patch,
          phase: "with-ball",
          roleId: patch.roleId ?? patch.withBallRoleId ?? slot.roleId ?? "best",
          withBallRoleId:
            patch.roleId ?? patch.withBallRoleId ?? slot.withBallRoleId,
        };

        if (
          nextSlot.withBallRoleId &&
          !roleExistsForSlotPhase(
            nextSlot.withBallRoleId,
            nextSlot.positionGroup,
            "with-ball"
          )
        ) {
          nextSlot.withBallRoleId = "best";
          nextSlot.roleId = "best";
        }

        return nextSlot;
      })
    );
  }

  function updateWithoutBallSlot(slotId: string, patch: Partial<FormationSlot>) {
    clearLockedSlotCandidate(slotId, "without-ball");

    setWithoutBallSlotOverrides((current) => {
      const currentPatch = current[slotId] ?? {};
      const nextPatch: Partial<FormationSlot> = {
        ...currentPatch,
        ...patch,
        phase: "without-ball",
        roleId:
          patch.roleId ??
          patch.withoutBallRoleId ??
          currentPatch.roleId ??
          "best",
      };

      return {
        ...current,
        [slotId]: nextPatch,
      };
    });
  }

  function updateActiveSlot(slotId: string, patch: Partial<FormationSlot>) {
    if (tacticalView === "with-ball") {
      updateWithBallSlot(slotId, patch);
      return;
    }

    updateWithoutBallSlot(slotId, patch);
  }

  const withBallDrag = useSquadBuilderSlotDrag({
    formationId,
    storageKey: "fm-player-sorter-squad-builder-pitch-positions-with-ball-v2",
    onSelectSlot: (slotId) => {
      setTacticalView("with-ball");
      setActiveSlotId(slotId);
    },
    onOpenDrawer: () => setIsSquadDrawerOpen(true),
    onUpdateSlot: updateWithBallSlot,
    onInferSlotFromPosition: (_slot, _position, inferred) => ({
      label: inferred.label,
      positionGroup: inferred.positionGroup,
      roleId: "best",
      withBallRoleId: "best",
    }),
  });

  const withoutBallDrag = useSquadBuilderSlotDrag({
    formationId: withoutBallFormationId,
    storageKey: "fm-player-sorter-squad-builder-pitch-positions-without-ball-v2",
    onSelectSlot: (slotId) => {
      setTacticalView("without-ball");
      setActiveSlotId(slotId);
    },
    onOpenDrawer: () => setIsSquadDrawerOpen(true),
    onUpdateSlot: updateWithoutBallSlot,
    onInferSlotFromPosition: (_slot, _position, inferred) => ({
      label: inferred.label,
      positionGroup: inferred.positionGroup,
      roleId: "best",
      withoutBallRoleId: "best",
    }),
  });

  const detectedShape = getDetectedShape(
    withBallSlots,
    formationId,
    withBallDrag.customPitchPositions
  );

  const detectedWithoutBallShape = getDetectedShape(
    withoutBallSlots,
    withoutBallFormationId,
    withoutBallDrag.customPitchPositions
  );

  function changeFormation(nextFormationId: string) {
    const nextFormation = FORMATION_PRESETS.find(
      (preset) => preset.id === nextFormationId
    );

    if (!nextFormation) return;

    setFormationId(nextFormation.id);
    setSlots(makeWithBallSlots(cloneFormationSlots(nextFormation.slots)));
    setTacticalView("with-ball");
    setActiveSlotId(nextFormation.slots[0]?.id ?? "");
    withBallDrag.resetCustomPitchPositions();
    clearHiddenTopCandidates();
    clearLockedSlotCandidates();
  }

  function changeWithoutBallFormation(nextFormationId: string) {
    const nextFormation = FORMATION_PRESETS.find(
      (preset) => preset.id === nextFormationId
    );

    if (!nextFormation) return;

    setWithoutBallFormationId(nextFormation.id);
    setWithoutBallSlotOverrides({});
    setTacticalView("without-ball");
    setActiveSlotId(nextFormation.slots[0]?.id ?? "");
    withoutBallDrag.resetCustomPitchPositions();
    clearHiddenTopCandidates();
    clearLockedSlotCandidates();
  }

  function applyTacticalPlan(recommendation: TacticalPlanRecommendation) {
    setFormationId(recommendation.withBallFormationId);
    setWithoutBallFormationId(recommendation.withoutBallFormationId);
    setSlots(
      makeWithBallSlots(cloneFormationSlots(recommendation.withBallSlots))
    );
    setWithoutBallSlotOverrides({});
    setActiveSlotId(recommendation.withBallSlots[0]?.id ?? "");
    setTacticalView("with-ball");
    withBallDrag.resetCustomPitchPositions();
    withoutBallDrag.resetCustomPitchPositions();
    clearLockedSlotCandidates();
    setIsPlanSuggestionsOpen(false);
  }

  function resetCurrentFormationLayout() {
    setSlots(makeWithBallSlots(cloneFormationSlots(formation.slots)));
    setWithoutBallSlotOverrides({});
    setActiveSlotId(
      tacticalView === "with-ball"
        ? formation.slots[0]?.id ?? ""
        : withoutBallFormation.slots[0]?.id ?? ""
    );
    clearHiddenTopCandidates();
    clearLockedSlotCandidates();
    withBallDrag.resetCustomPitchPositions();
    withoutBallDrag.resetCustomPitchPositions();
  }

  function renderActiveSlotPanel() {
    return (
<SquadBuilderActiveSlotPanel
  activeSlot={activeSlot}
  scoreMode={scoreMode}
  tacticalView={tacticalView}
  getVisibleTopCandidates={getVisibleTopCandidates}
  getCurrentPitchPosition={
    tacticalView === "with-ball"
      ? withBallDrag.getCurrentPitchPosition
      : withoutBallDrag.getCurrentPitchPosition
  }
  onUpdateSlot={updateActiveSlot}
  onHideTopCandidate={hideTopCandidate}
  getPlayerMark={getPlayerMark}
  onSelectPlayer={onSelectPlayer}
/>
    );
  }

  function renderSquadBuilder() {
    return (
      <section style={styles.wrapper}>
        <div style={styles.pitchSection}>
          <SquadBuilderToolbar
            formationName={formation.name ?? "-"}
            detectedShape={detectedShape}
            detectedWithoutBallShape={detectedWithoutBallShape}
            availableRowsCount={availableRows.length}
            slotsCount={withBallSlots.length}
            formationId={formationId}
            withoutBallFormationId={withoutBallFormationId}
            onlySelected={onlySelected}
            topOnlyNatural={topOnlyNatural}
            hiddenTopCount={hiddenTopCount}
            selectedPlayersCount={selectedPlayersCount}
            planSuggestionsCount={tacticalPlanRecommendations.length}
            tacticalView={tacticalView}
            activeSlot={activeSlot}
            onFormationChange={changeFormation}
            onWithoutBallFormationChange={changeWithoutBallFormation}
            onTacticalViewChange={setTacticalView}
            onOnlySelectedChange={setOnlySelected}
            onTopOnlyNaturalChange={setTopOnlyNatural}
            onClearHiddenTopCandidates={clearHiddenTopCandidates}
            onClearCallUps={onClearCallUps}
            onResetFormationLayout={resetCurrentFormationLayout}
            onOpenPlanSuggestions={() => setIsPlanSuggestionsOpen(true)}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              padding: "0 12px 10px",
            }}
          >
            <label style={styles.compactCheckbox}>
              <input
                type="checkbox"
                checked={scoreMode === "overall-ability"}
                onChange={(event) =>
                  setScoreMode(
                    event.currentTarget.checked
                      ? "overall-ability"
                      : "role-score"
                  )
                }
              />
              Buduj wg OU
            </label>

            <div style={styles.pitchActiveInfo}>
              Tryb składu:{" "}
              <strong>
                {scoreMode === "overall-ability"
                  ? "obecne umiejętności"
                  : "dopasowanie do roli"}
              </strong>
            </div>
          </div>

<SquadBuilderPitch
  withBallPitchRef={withBallDrag.pitchRef}
  withoutBallPitchRef={withoutBallDrag.pitchRef}
  withBallSlots={withBallSlots}
  withoutBallSlots={withoutBallSlots}
  activeSlotId={activeSlot?.id ?? ""}
  tacticalView={tacticalView}
  suggestedSquadWithBall={suggestedSquadWithBall}
  suggestedSquadWithoutBall={suggestedSquadWithoutBall}
  scoreMode={scoreMode}
  lockedSlotCandidateKeys={lockedSlotCandidateKeys}
            withBallDraggingSlotId={withBallDrag.draggingSlotId}
            withoutBallDraggingSlotId={withoutBallDrag.draggingSlotId}
            getCurrentWithBallPitchPosition={
              withBallDrag.getCurrentPitchPosition
            }
            getCurrentWithoutBallPitchPosition={
              withoutBallDrag.getCurrentPitchPosition
            }
            onWithBallSlotPointerDown={withBallDrag.handleSlotPointerDown}
            onWithBallSlotPointerMove={withBallDrag.handleSlotPointerMove}
            onWithBallSlotPointerUp={withBallDrag.handleSlotPointerUp}
            onWithBallSlotPointerCancel={withBallDrag.handleSlotPointerCancel}
            onWithoutBallSlotPointerDown={withoutBallDrag.handleSlotPointerDown}
            onWithoutBallSlotPointerMove={withoutBallDrag.handleSlotPointerMove}
            onWithoutBallSlotPointerUp={withoutBallDrag.handleSlotPointerUp}
            onWithoutBallSlotPointerCancel={
              withoutBallDrag.handleSlotPointerCancel
            }
            onWithBallSlotClick={withBallDrag.handleSlotClick}
            onWithoutBallSlotClick={withoutBallDrag.handleSlotClick}
            onTacticalViewChange={setTacticalView}
            onToggleSlotCandidateLock={toggleSlotCandidateLock}
            renderActiveSlotPanel={renderActiveSlotPanel}
          />

          <SquadBuilderPlanSuggestionsModal
            isOpen={isPlanSuggestionsOpen}
            recommendations={tacticalPlanRecommendations}
            onClose={() => setIsPlanSuggestionsOpen(false)}
            onApplyPlan={applyTacticalPlan}
          />
        </div>
      </section>
    );
  }

  return (
    <SquadBuilderDrawerShell
      isOpen={isSquadDrawerOpen}
      onToggle={() => setIsSquadDrawerOpen((current) => !current)}
      onClose={() => setIsSquadDrawerOpen(false)}
    >
      {renderSquadBuilder()}
    </SquadBuilderDrawerShell>
  );
}