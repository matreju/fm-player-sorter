import type { Dispatch, SetStateAction } from "react";
import {
  getRolePhaseLabel,
  type RoleDefinition,
} from "../../constants/roles";
import type { RolePhaseFilter } from "../../utils/roleScoring";
import {
  AppCheckbox,
  AppSelectField,
  AppTextField,
  type AppSelectOption,
} from "../ui";
import {
  ROLE_PHASE_OPTIONS,
  isRolePhaseFilter,
} from "./RoleAnalysisToolbar.config";
import { roleAnalysisToolbarStyles as styles } from "./RoleAnalysisToolbar.styles";

type RoleAnalysisToolbarProps = {
  rolePositionOptions: string[];
  availableAnalysisRoles: RoleDefinition[];

  analysisPositionGroup: string;
  setAnalysisPositionGroup: Dispatch<SetStateAction<string>>;

  analysisPhase: RolePhaseFilter;
  setAnalysisPhase: Dispatch<SetStateAction<RolePhaseFilter>>;

  analysisRoleId: string;
  setAnalysisRoleId: Dispatch<SetStateAction<string>>;

  minRoleScore: string;
  setMinRoleScore: Dispatch<SetStateAction<string>>;

  onlyRoleMatches: boolean;
  setOnlyRoleMatches: Dispatch<SetStateAction<boolean>>;
};

function makePositionOptions(rolePositionOptions: string[]): AppSelectOption[] {
  return [
    { value: "any", label: "Wszyscy" },
    ...rolePositionOptions.map((positionGroup) => ({
      value: positionGroup,
      label: positionGroup,
    })),
  ];
}

function makeRoleOptions(
  availableAnalysisRoles: RoleDefinition[]
): AppSelectOption[] {
  return [
    { value: "any", label: "Dowolna rola" },
    ...availableAnalysisRoles.map((role) => ({
      value: role.id,
      label: `${getRolePhaseLabel(role.phase)} — ${role.name}`,
    })),
  ];
}

export function RoleAnalysisToolbar({
  rolePositionOptions,
  availableAnalysisRoles,
  analysisPositionGroup,
  setAnalysisPositionGroup,
  analysisPhase,
  setAnalysisPhase,
  analysisRoleId,
  setAnalysisRoleId,
  minRoleScore,
  setMinRoleScore,
  onlyRoleMatches,
  setOnlyRoleMatches,
}: RoleAnalysisToolbarProps) {
  const positionOptions = makePositionOptions(rolePositionOptions);
  const roleOptions = makeRoleOptions(availableAnalysisRoles);

  return (
    <section
      style={styles.toolbar}
      aria-labelledby="role-analysis-toolbar-title"
    >
      <h2 id="role-analysis-toolbar-title" style={styles.hiddenTitle}>
        Filtry analizy ról
      </h2>

      <AppSelectField
        label="Szukana pozycja"
        value={analysisPositionGroup}
        options={positionOptions}
        onChange={(value) => {
          setAnalysisPositionGroup(value);
          setAnalysisRoleId("any");
        }}
        fieldStyle={styles.field}
        selectStyle={styles.input}
      />

      <AppSelectField
        label="Faza"
        value={analysisPhase}
        options={ROLE_PHASE_OPTIONS}
        onChange={(value) => {
          if (!isRolePhaseFilter(value)) {
            return;
          }

          setAnalysisPhase(value);
          setAnalysisRoleId("any");
        }}
        fieldStyle={styles.field}
        selectStyle={styles.input}
      />

      <AppSelectField
        label="Rola"
        value={analysisRoleId}
        options={roleOptions}
        onChange={setAnalysisRoleId}
        fieldStyle={styles.roleField}
        selectStyle={styles.input}
      />

      <AppTextField
        label="Minimalny wynik"
        type="number"
        min="0"
        max="100"
        placeholder="60"
        value={minRoleScore}
        onChange={setMinRoleScore}
        fieldStyle={styles.thresholdField}
        inputStyle={styles.input}
      />

      <div style={styles.checkboxWrap}>
        <AppCheckbox
          checked={onlyRoleMatches}
          onChange={setOnlyRoleMatches}
          style={styles.checkbox}
        >
          Pokaż tylko powyżej progu
        </AppCheckbox>
      </div>
    </section>
  );
}