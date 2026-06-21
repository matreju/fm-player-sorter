import type { FormationSlot } from "../../types/squadBuilderTypes";
import { FORMATION_PRESETS } from "../../constants/squadBuilderFormations";
import { AppButton, AppCheckbox, AppSelectField } from "../ui";
import { squadBuilderStyles as styles } from "./squadBuilderStyles";
import type { TacticalView } from "../../utils/squadBuilderTacticalView";

type SquadBuilderToolbarProps = {
  formationName: string;
  detectedShape: string;
  detectedWithoutBallShape: string;
  availableRowsCount: number;
  slotsCount: number;

  formationId: string;
  withoutBallFormationId: string;
  onlySelected: boolean;
  topOnlyNatural: boolean;
  hiddenTopCount: number;
  selectedPlayersCount: number;
  planSuggestionsCount: number;
  tacticalView: TacticalView;
  activeSlot: FormationSlot | null;

  onFormationChange: (formationId: string) => void;
  onWithoutBallFormationChange: (formationId: string) => void;
  onTacticalViewChange: (view: TacticalView) => void;
  onOnlySelectedChange: (value: boolean) => void;
  onTopOnlyNaturalChange: (value: boolean) => void;
  onClearHiddenTopCandidates: () => void;
  onClearCallUps?: () => void;
  onResetFormationLayout: () => void;
  onOpenPlanSuggestions: () => void;
};

export function SquadBuilderToolbar({
  formationName,
  detectedShape,
  detectedWithoutBallShape,
  availableRowsCount,
  slotsCount,
  formationId,
  withoutBallFormationId,
  onlySelected,
  topOnlyNatural,
  hiddenTopCount,
  selectedPlayersCount,
  planSuggestionsCount,
  tacticalView,
  activeSlot,
  onFormationChange,
  onWithoutBallFormationChange,
  onTacticalViewChange,
  onOnlySelectedChange,
  onTopOnlyNaturalChange,
  onClearHiddenTopCandidates,
  onClearCallUps,
  onResetFormationLayout,
  onOpenPlanSuggestions,
}: SquadBuilderToolbarProps) {
  return (
    <div style={styles.pitchHeader}>
      <div style={styles.pitchHeaderControls}>
        <AppSelectField
          label="Przy piłce"
          value={formationId}
          options={FORMATION_PRESETS.map((preset) => ({
            value: preset.id,
            label: preset.name,
          }))}
          onChange={onFormationChange}
          ariaLabel="Wybierz formację przy piłce"
          fieldStyle={styles.compactField}
          selectStyle={styles.compactSelect}
        />

        <AppSelectField
          label="Bez piłki"
          value={withoutBallFormationId}
          options={FORMATION_PRESETS.map((preset) => ({
            value: preset.id,
            label: preset.name,
          }))}
          onChange={onWithoutBallFormationChange}
          ariaLabel="Wybierz formację bez piłki"
          fieldStyle={styles.compactField}
          selectStyle={styles.compactSelect}
        />

        <div style={styles.pitchMetaPill}>
          PP {formationName} / {detectedShape || "-"} · BP{" "}
          {detectedWithoutBallShape || "-"} · pula {availableRowsCount} · sloty{" "}
          {slotsCount}
        </div>

        <AppCheckbox
          checked={onlySelected}
          onChange={onOnlySelectedChange}
          style={styles.compactCheckbox}
        >
          Tylko powołani
        </AppCheckbox>

        <AppCheckbox
          checked={topOnlyNatural}
          onChange={onTopOnlyNaturalChange}
          style={styles.compactCheckbox}
        >
          Top 3 naturalni
        </AppCheckbox>

        <AppButton
          type="button"
          variant="neutral"
          size="compact"
          onClick={onClearHiddenTopCandidates}
          disabled={hiddenTopCount === 0}
        >
          Wyczyść ukrycia{hiddenTopCount > 0 ? ` (${hiddenTopCount})` : ""}
        </AppButton>

        <AppButton
          type="button"
          variant="danger"
          size="compact"
          onClick={onClearCallUps}
          disabled={!onClearCallUps || selectedPlayersCount === 0}
        >
          Wyczyść powołania
          {selectedPlayersCount > 0 ? ` (${selectedPlayersCount})` : ""}
        </AppButton>

        <AppButton
          type="button"
          variant="primary"
          size="compact"
          onClick={onResetFormationLayout}
        >
          Reset układu
        </AppButton>

        <AppButton
          type="button"
          variant="success"
          size="compact"
          onClick={onOpenPlanSuggestions}
        >
          Sugestie planu
          {planSuggestionsCount > 0 ? ` (${planSuggestionsCount})` : ""}
        </AppButton>

        <div style={styles.tacticalViewSwitch} aria-label="Widok fazy">
          <button
            type="button"
            style={{
              ...styles.tacticalViewButton,
              ...(tacticalView === "with-ball"
                ? styles.tacticalViewButtonActive
                : {}),
            }}
            onClick={() => onTacticalViewChange("with-ball")}
          >
            Przy piłce
          </button>

          <button
            type="button"
            style={{
              ...styles.tacticalViewButton,
              ...(tacticalView === "without-ball"
                ? styles.tacticalViewButtonActive
                : {}),
            }}
            onClick={() => onTacticalViewChange("without-ball")}
          >
            Bez piłki
          </button>
        </div>

        {activeSlot && (
          <div style={styles.pitchActiveInfo}>
            Aktywny: <strong>{activeSlot.label} · {activeSlot.positionGroup}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
