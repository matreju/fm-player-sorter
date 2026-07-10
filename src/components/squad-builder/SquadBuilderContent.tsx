import { useEffect, useMemo, useState } from "react";
import { squadBuilderStyles as styles } from "./squadBuilderStyles";
import { SquadBuilderToolbar } from "./SquadBuilderToolbar";
import { SquadBuilderPitch } from "./SquadBuilderPitch";
import { SquadBuilderActiveSlotPanel } from "./SquadBuilderActiveSlotPanel";
import { SquadBuilderPlanSuggestionsModal } from "./SquadBuilderPlanSuggestionsModal";
import { useSquadBuilderSlotDrag } from "./useSquadBuilderSlotDrag";
import { useSquadBuilderSuggestions } from "./useSquadBuilderSuggestions";
import { loadCamps } from "../../utils/campStorage";
import { loadCampaigns } from "../../utils/campaignStorage";
import { buildCampaignCallUpsByPlayerKey } from "../../utils/squadBuilderCampaignCallups";
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
  FormationPreset,
  FormationSlot,
  PitchPosition,
  SquadBuilderProps,
  SquadBuilderScoreMode,
} from "../../types/squadBuilderTypes";
import {
  addCustomSquadBuilderFormation,
  createCustomSquadBuilderFormation,
  loadCustomSquadBuilderFormations,
  removeCustomSquadBuilderFormation,
  type CustomSquadBuilderFormation,
} from "../../utils/customSquadBuilderFormations";

const SQUAD_BUILDER_STATE_STORAGE_KEY =
  "fm-player-sorter-squad-builder-state-v3";

type PersistedSquadBuilderState = {
  formationId?: string;
  withoutBallFormationId?: string;
  activeSlotId?: string;
  tacticalView?: TacticalView;
  onlySelected?: boolean;
  topOnlyNatural?: boolean;
  scoreMode?: SquadBuilderScoreMode;
  campaignCallUpsCampaignId?: string;
  slots?: FormationSlot[];
  withoutBallSlotOverrides?: Record<string, Partial<FormationSlot>>;
};

function getDefaultFormationId(
  formationPresets: FormationPreset[] = FORMATION_PRESETS
) {
  return formationPresets.some((preset) => preset.id === "433dm")
    ? "433dm"
    : formationPresets[0]?.id ?? "";
}

function getValidFormationId(
  formationId: string | undefined,
  formationPresets: FormationPreset[] = FORMATION_PRESETS
) {
  if (!formationId) {
    return getDefaultFormationId(formationPresets);
  }

  return formationPresets.some((preset) => preset.id === formationId)
    ? formationId
    : getDefaultFormationId(formationPresets);
}

function getFormationById(
  formationId: string,
  formationPresets: FormationPreset[] = FORMATION_PRESETS
) {
  return (
    formationPresets.find((preset) => preset.id === formationId) ??
    formationPresets[0]
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
  overrides: Record<string, Partial<FormationSlot>>,
  formationPresets: FormationPreset[] = FORMATION_PRESETS
): FormationSlot[] {
  const formation = getFormationById(formationId, formationPresets);

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

export function SquadBuilderContent({
  rows,
  playerMarks = {},
  selectedPositionByPlayerKey = {},
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
const [customFormations, setCustomFormations] = useState<
  CustomSquadBuilderFormation[]
>(() => loadCustomSquadBuilderFormations());

const formationPresets = useMemo(
  () => [...FORMATION_PRESETS, ...customFormations],
  [customFormations]
);
const initialFormationId = getValidFormationId(
  persistedState.formationId,
  formationPresets
);
const initialFormation = getFormationById(initialFormationId, formationPresets);

  
  const [formationId, setFormationId] = useState(initialFormationId);

  const [withoutBallFormationId, setWithoutBallFormationId] = useState(
  getValidFormationId(
    persistedState.withoutBallFormationId ?? initialFormationId,
    formationPresets
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
  const [campaigns] = useState(() => loadCampaigns());
  const [storedCamps] = useState(() => loadCamps());

  const campaignOptions = useMemo(() => {
    return campaigns.filter((campaign) =>
      storedCamps.some((camp) => camp.campaignId === campaign.id)
    );
  }, [campaigns, storedCamps]);

  const [campaignCallUpsCampaignId, setCampaignCallUpsCampaignId] = useState(
    persistedState.campaignCallUpsCampaignId ??
      campaignOptions[0]?.id ??
      ""
  );

  const selectedCampaignId =
    campaignCallUpsCampaignId || campaignOptions[0]?.id || "";

  const selectedCampaignName =
    campaignOptions.find((campaign) => campaign.id === selectedCampaignId)
      ?.name ?? "brak kampanii";
const formation = getFormationById(formationId, formationPresets);
const withoutBallFormation = getFormationById(
  withoutBallFormationId,
  formationPresets
);

  const withBallSlots = useMemo(() => makeWithBallSlots(slots), [slots]);

  const withoutBallSlots = useMemo(
  () =>
    makeWithoutBallSlots(
      withoutBallFormationId,
      withoutBallSlotOverrides,
      formationPresets
    ),
  [withoutBallFormationId, withoutBallSlotOverrides, formationPresets]
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
    campaignCallUpsCampaignId,
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
    campaignCallUpsCampaignId,
    slots,
    withoutBallSlotOverrides,
  ]);
  const campaignCallUpsByPlayerKey = useMemo(() => {
    if (scoreMode !== "campaign-callups") {
      return {};
    }

    return buildCampaignCallUpsByPlayerKey(
      rows,
      storedCamps,
      selectedCampaignId
    );
  }, [rows, storedCamps, selectedCampaignId, scoreMode]);
 const {
  availableRows,
  suggestedSquadWithBall,
  suggestedSquadWithoutBall,
  hiddenTopCount,
  getVisibleTopCandidates,
  hideTopCandidate,
  hideTopCandidateEverywhere,
  clearHiddenTopCandidates,
  forceCandidateOnSlot,
} = useSquadBuilderSuggestions({
  rows,
  playerMarks,
  selectedPositionByPlayerKey,
  campaignCallUpsByPlayerKey,
  withBallSlots,
  withoutBallSlots,
  tacticalView,
  onlySelected,
  topOnlyNatural,
  scoreMode,
  getPlayerMark,
});
  const selectionFilterSignatureForPlans = useMemo(() => {
  const rejectedKeys: string[] = [];
  const selectedKeys: string[] = [];

  for (const [playerKey, mark] of Object.entries(playerMarks)) {
    if (mark === "rejected") {
      rejectedKeys.push(playerKey);
      continue;
    }

    if (onlySelected && mark === "selected") {
      selectedKeys.push(playerKey);
    }
  }

  rejectedKeys.sort();
  selectedKeys.sort();

  return `${onlySelected ? selectedKeys.join("|") : ""}::${rejectedKeys.join(
    "|"
  )}`;
}, [playerMarks, onlySelected]);

const tacticalPlanRecommendations = useMemo(() => {
  if (!isPlanSuggestionsOpen) {
    return [];
  }

  return getTacticalPlanRecommendations({
    rows,
    getPlayerMark,
    onlySelected,
    topOnlyNatural,
    limit: 6,
  });
}, [
  isPlanSuggestionsOpen,
  rows,
  onlySelected,
  topOnlyNatural,
  selectionFilterSignatureForPlans,
]);

  function updateWithBallSlot(slotId: string, patch: Partial<FormationSlot>) {
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
    onOpenDrawer: () => {},
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
    onOpenDrawer: () => {},
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
function getEffectivePitchPositionsForSlots(
  currentSlots: FormationSlot[],
  getCurrentPitchPosition: (slot: FormationSlot) => PitchPosition
): Record<string, PitchPosition> {
  return Object.fromEntries(
    currentSlots.map((slot) => [
      slot.id,
      { ...getCurrentPitchPosition(slot) },
    ])
  );
}

function isCustomFormationId(id: string) {
  return customFormations.some((formation) => formation.id === id);
}

const activeFormationIsCustom =
  tacticalView === "with-ball"
    ? isCustomFormationId(formationId)
    : isCustomFormationId(withoutBallFormationId);

function saveCurrentCustomFormation() {
  const currentSlots =
    tacticalView === "with-ball" ? withBallSlots : withoutBallSlots;

  const getCurrentPitchPosition =
    tacticalView === "with-ball"
      ? withBallDrag.getCurrentPitchPosition
      : withoutBallDrag.getCurrentPitchPosition;

  const detectedName =
    tacticalView === "with-ball"
      ? detectedShape || formation.name
      : detectedWithoutBallShape || withoutBallFormation.name;

  const name = window.prompt(
    "Nazwa własnej formacji:",
    `Moja ${detectedName}`
  );

  if (!name?.trim()) {
    return;
  }

  const pitchPositions = getEffectivePitchPositionsForSlots(
    currentSlots,
    getCurrentPitchPosition
  );

  const customFormation = createCustomSquadBuilderFormation({
    name: name.trim(),
    slots: currentSlots,
    pitchPositions,
  });

  const nextCustomFormations = addCustomSquadBuilderFormation(
    customFormations,
    customFormation
  );

  setCustomFormations(nextCustomFormations);

  if (tacticalView === "with-ball") {
    setFormationId(customFormation.id);
    setSlots(makeWithBallSlots(cloneFormationSlots(customFormation.slots)));
    withBallDrag.replaceCustomPitchPositions(customFormation.pitchPositions);
    setActiveSlotId(customFormation.slots[0]?.id ?? "");
    return;
  }

  setWithoutBallFormationId(customFormation.id);
  setWithoutBallSlotOverrides({});
  withoutBallDrag.replaceCustomPitchPositions(customFormation.pitchPositions);
  setActiveSlotId(customFormation.slots[0]?.id ?? "");
}

function deleteActiveCustomFormation() {
  const activeFormationId =
    tacticalView === "with-ball" ? formationId : withoutBallFormationId;

  const activeCustomFormation = customFormations.find(
    (formation) => formation.id === activeFormationId
  );

  if (!activeCustomFormation) {
    return;
  }

  const confirmed = window.confirm(
    `Usunąć własną formację "${activeCustomFormation.name}"?`
  );

  if (!confirmed) {
    return;
  }

  const nextCustomFormations = removeCustomSquadBuilderFormation(
    customFormations,
    activeCustomFormation.id
  );

  setCustomFormations(nextCustomFormations);

  const defaultFormationId = getDefaultFormationId(FORMATION_PRESETS);
  const defaultFormation = getFormationById(defaultFormationId, FORMATION_PRESETS);

  if (formationId === activeCustomFormation.id) {
    setFormationId(defaultFormationId);
    setSlots(makeWithBallSlots(cloneFormationSlots(defaultFormation.slots)));
    withBallDrag.replaceCustomPitchPositions({});
  }

  if (withoutBallFormationId === activeCustomFormation.id) {
    setWithoutBallFormationId(defaultFormationId);
    setWithoutBallSlotOverrides({});
    withoutBallDrag.replaceCustomPitchPositions({});
  }

  setActiveSlotId(defaultFormation.slots[0]?.id ?? "");
}
function changeFormation(nextFormationId: string) {
  const nextFormation = formationPresets.find(
    (preset) => preset.id === nextFormationId
  );

  if (!nextFormation) return;

  const customFormation = customFormations.find(
    (preset) => preset.id === nextFormation.id
  );

  setFormationId(nextFormation.id);
  setSlots(makeWithBallSlots(cloneFormationSlots(nextFormation.slots)));
  setTacticalView("with-ball");
  setActiveSlotId(nextFormation.slots[0]?.id ?? "");
  withBallDrag.replaceCustomPitchPositions(
    customFormation?.pitchPositions ?? {}
  );
  clearHiddenTopCandidates();
}

  function changeWithoutBallFormation(nextFormationId: string) {
  const nextFormation = formationPresets.find(
    (preset) => preset.id === nextFormationId
  );

  if (!nextFormation) return;

  const customFormation = customFormations.find(
    (preset) => preset.id === nextFormation.id
  );

  setWithoutBallFormationId(nextFormation.id);
  setWithoutBallSlotOverrides({});
  setTacticalView("without-ball");
  setActiveSlotId(nextFormation.slots[0]?.id ?? "");
  withoutBallDrag.replaceCustomPitchPositions(
    customFormation?.pitchPositions ?? {}
  );
  clearHiddenTopCandidates();
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
    setIsPlanSuggestionsOpen(false);
  }

  function resetCurrentFormationLayout() {
  const withBallCustomFormation = customFormations.find(
    (preset) => preset.id === formationId
  );

  const withoutBallCustomFormation = customFormations.find(
    (preset) => preset.id === withoutBallFormationId
  );

  setSlots(makeWithBallSlots(cloneFormationSlots(formation.slots)));
  setWithoutBallSlotOverrides({});

  setActiveSlotId(
    tacticalView === "with-ball"
      ? formation.slots[0]?.id ?? ""
      : withoutBallFormation.slots[0]?.id ?? ""
  );

  withBallDrag.replaceCustomPitchPositions(
    withBallCustomFormation?.pitchPositions ?? {}
  );

  withoutBallDrag.replaceCustomPitchPositions(
    withoutBallCustomFormation?.pitchPositions ?? {}
  );
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
  onHideTopCandidateEverywhere={hideTopCandidateEverywhere}
  onForceCandidateOnSlot={forceCandidateOnSlot}
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
  formationOptions={formationPresets}
  formationId={formationId}
  withoutBallFormationId={withoutBallFormationId}
  onlySelected={onlySelected}
  topOnlyNatural={topOnlyNatural}
  hiddenTopCount={hiddenTopCount}
  selectedPlayersCount={selectedPlayersCount}
planSuggestionsCount={6}
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
  activeFormationIsCustom={activeFormationIsCustom}
  onSaveCustomFormation={saveCurrentCustomFormation}
  onDeleteCustomFormation={deleteActiveCustomFormation}
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
            <label style={styles.compactField}>
              <span style={styles.compactLabel}>Tryb składu</span>

              <select
                value={scoreMode}
                onChange={(event) =>
                  setScoreMode(event.target.value as SquadBuilderScoreMode)
                }
                style={styles.compactSelect}
              >
                <option value="role-score">Dopasowanie do roli</option>
                <option value="overall-ability">Obecne umiejętności / OU</option>
                <option value="campaign-callups">Powołania w kampanii</option>
              </select>
            </label>

            {scoreMode === "campaign-callups" && (
              <label style={styles.compactField}>
                <span style={styles.compactLabel}>Kampania</span>

                <select
                  value={selectedCampaignId}
                  onChange={(event) =>
                    setCampaignCallUpsCampaignId(event.target.value)
                  }
                  style={styles.compactSelect}
                >
                  {campaignOptions.length === 0 && (
                    <option value="">Brak kampanii</option>
                  )}

                  {campaignOptions.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div style={styles.pitchActiveInfo}>
              Tryb składu:{" "}
              <strong>
                {scoreMode === "overall-ability"
                  ? "obecne umiejętności"
                  : scoreMode === "campaign-callups"
                    ? `powołania w kampanii · ${selectedCampaignName}`
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

  return renderSquadBuilder()
}