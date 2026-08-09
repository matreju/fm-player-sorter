import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { FootFilter } from "../../utils/filters";
import {
  getRolePhaseLabel,
  type RoleDefinition,
} from "../../constants/roles";
import type { RolePhaseFilter } from "../../utils/roleScoring";
import {
  AppButton,
  AppCheckbox,
  AppSelectField,
  AppTextField,
} from "../ui";
import { FOOT_FILTER_OPTIONS } from "./MainToolbar.config";
import {
  ROLE_PHASE_OPTIONS,
  isRolePhaseFilter,
} from "../role-analysis-toolbar/RoleAnalysisToolbar.config";
import { mainToolbarStyles as styles } from "./MainToolbar.styles";

type MainToolbarProps = {
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  minAge: string;
  setMinAge: Dispatch<SetStateAction<string>>;
  maxAge: string;
  setMaxAge: Dispatch<SetStateAction<string>>;
  footFilter: FootFilter;
  setFootFilter: Dispatch<SetStateAction<FootFilter>>;
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
  showOnlySelectedPlayers: boolean;
  setShowOnlySelectedPlayers: Dispatch<SetStateAction<boolean>>;
  hideMarkedPlayers: boolean;
  setHideMarkedPlayers: Dispatch<SetStateAction<boolean>>;
  selectedPlayersCount: number;
  selectedPlayersWithPositionCount: number;
  rejectedPlayersCount: number;
  onClearPlayerSelection: () => void;
};

export function MainToolbar({
  searchTerm,
  setSearchTerm,
  minAge,
  setMinAge,
  maxAge,
  setMaxAge,
  footFilter,
  setFootFilter,
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
  showOnlySelectedPlayers,
  setShowOnlySelectedPlayers,
  hideMarkedPlayers,
  setHideMarkedPlayers,
  selectedPlayersCount,
  selectedPlayersWithPositionCount,
  rejectedPlayersCount,
  onClearPlayerSelection,
}: MainToolbarProps) {
  const [draftSearchTerm, setDraftSearchTerm] = useState(searchTerm);
  const lastCommittedSearchRef = useRef(searchTerm);

  useEffect(() => {
    if (searchTerm === lastCommittedSearchRef.current) return;
    lastCommittedSearchRef.current = searchTerm;
    setDraftSearchTerm(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (draftSearchTerm === searchTerm) return;

    const timeoutId = window.setTimeout(() => {
      lastCommittedSearchRef.current = draftSearchTerm;
      setSearchTerm(draftSearchTerm);
    }, 140);

    return () => window.clearTimeout(timeoutId);
  }, [draftSearchTerm, searchTerm, setSearchTerm]);

  const hasActiveFilters =
    draftSearchTerm.trim() !== "" ||
    minAge.trim() !== "" ||
    maxAge.trim() !== "" ||
    footFilter !== "any" ||
    analysisPositionGroup !== "any" ||
    analysisPhase !== "any" ||
    analysisRoleId !== "any" ||
    minRoleScore !== "60" ||
    !onlyRoleMatches ||
    showOnlySelectedPlayers ||
    hideMarkedPlayers;
  const hasPlayerMarks = selectedPlayersCount > 0 || rejectedPlayersCount > 0;

  function clearFilters() {
    setDraftSearchTerm("");
    setSearchTerm("");
    setMinAge("");
    setMaxAge("");
    setFootFilter("any");
    setAnalysisPositionGroup("any");
    setAnalysisPhase("any");
    setAnalysisRoleId("any");
    setMinRoleScore("60");
    setOnlyRoleMatches(true);
    setShowOnlySelectedPlayers(false);
    setHideMarkedPlayers(false);
  }

  const positionOptions = [
    { value: "any", label: "Wszyscy" },
    ...rolePositionOptions.map((positionGroup) => ({
      value: positionGroup,
      label: positionGroup,
    })),
  ];
  const roleOptions = [
    { value: "any", label: "Dowolna rola" },
    ...availableAnalysisRoles.map((role) => ({
      value: role.id,
      label: `${getRolePhaseLabel(role.phase)} — ${role.name}`,
    })),
  ];

  return (
    <section style={styles.toolbar} aria-labelledby="main-toolbar-title">
      <h2 id="main-toolbar-title" style={visuallyHiddenStyle}>
        Filtry listy piłkarzy
      </h2>

      <div style={styles.toolbarGrid}>
        <AppTextField
          label="Szukaj zawodnika"
          type="search"
          placeholder="Nazwisko, klub, pozycja…"
          value={draftSearchTerm}
          onChange={setDraftSearchTerm}
          autoComplete="off"
          spellCheck={false}
          fieldStyle={styles.filterField}
          labelStyle={styles.filterLabel}
          inputStyle={styles.fieldInput}
        />

        <AppTextField
          label="Wiek od"
          type="number"
          min="0"
          placeholder="Od"
          value={minAge}
          onChange={setMinAge}
          fieldStyle={styles.filterField}
          labelStyle={styles.filterLabel}
          inputStyle={styles.fieldInput}
        />

        <AppTextField
          label="Wiek do"
          type="number"
          min="0"
          placeholder="Do"
          value={maxAge}
          onChange={setMaxAge}
          fieldStyle={styles.filterField}
          labelStyle={styles.filterLabel}
          inputStyle={styles.fieldInput}
        />

        <AppSelectField
          label="Preferowana noga"
          value={footFilter}
          options={FOOT_FILTER_OPTIONS}
          onChange={(value) => setFootFilter(value as FootFilter)}
          fieldStyle={styles.filterField}
          labelStyle={styles.filterLabel}
          selectStyle={styles.fieldInput}
        />

        <div style={styles.toolbarActions}>
          <AppButton
            type="button"
            variant="neutral"
            size="compact"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Wyczyść filtry
          </AppButton>

          <AppButton
            type="button"
            variant="danger"
            size="compact"
            onClick={onClearPlayerSelection}
            disabled={!hasPlayerMarks}
          >
            Wyczyść wybór
          </AppButton>
        </div>
      </div>

      <div style={styles.toolbarBottom}>
        <div style={styles.toolbarOptions}>
          <AppCheckbox
            checked={showOnlySelectedPlayers}
            onChange={setShowOnlySelectedPlayers}
            style={styles.toolbarCheckbox}
          >
            Tylko powołani
          </AppCheckbox>

          <AppCheckbox
            checked={hideMarkedPlayers}
            onChange={setHideMarkedPlayers}
            disabled={showOnlySelectedPlayers}
            style={styles.toolbarCheckbox}
          >
            Ukryj ocenionych
          </AppCheckbox>
        </div>

        <div style={styles.toolbarMeta}>
          <span style={styles.toolbarCounter}>
            Powołani <strong>{selectedPlayersCount}</strong>
          </span>
          <span style={styles.toolbarCounter}>
            Z pozycją <strong>{selectedPlayersWithPositionCount}</strong>
          </span>
          <span style={styles.toolbarCounter}>
            Odrzuceni <strong>{rejectedPlayersCount}</strong>
          </span>
        </div>
      </div>

      <div style={styles.analysisGrid}>
        <AppSelectField
          label="Szukana pozycja"
          value={analysisPositionGroup}
          options={positionOptions}
          onChange={(value) => {
            setAnalysisPositionGroup(value);
            setAnalysisRoleId("any");
          }}
          fieldStyle={styles.filterField}
          labelStyle={styles.filterLabel}
          selectStyle={styles.fieldInput}
        />

        <AppSelectField
          label="Faza"
          value={analysisPhase}
          options={ROLE_PHASE_OPTIONS}
          onChange={(value) => {
            if (!isRolePhaseFilter(value)) return;
            setAnalysisPhase(value);
            setAnalysisRoleId("any");
          }}
          fieldStyle={styles.filterField}
          labelStyle={styles.filterLabel}
          selectStyle={styles.fieldInput}
        />

        <AppSelectField
          label="Rola"
          value={analysisRoleId}
          options={roleOptions}
          onChange={setAnalysisRoleId}
          fieldStyle={styles.filterField}
          labelStyle={styles.filterLabel}
          selectStyle={styles.fieldInput}
        />

        <AppTextField
          label="Minimalny wynik"
          type="number"
          min="0"
          max="100"
          placeholder="60"
          value={minRoleScore}
          onChange={setMinRoleScore}
          fieldStyle={styles.filterField}
          labelStyle={styles.filterLabel}
          inputStyle={styles.fieldInput}
        />

        <div style={styles.analysisCheckboxWrap}>
          <AppCheckbox
            checked={onlyRoleMatches}
            onChange={setOnlyRoleMatches}
            style={styles.analysisCheckbox}
          >
            Pokaż tylko powyżej progu
          </AppCheckbox>
        </div>
      </div>
    </section>
  );
}

const visuallyHiddenStyle = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;
