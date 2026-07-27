import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { FootFilter } from "../../utils/filters";
import {
  AppButton,
  AppCheckbox,
  AppSelectField,
  AppTextField,
} from "../ui";
import { FOOT_FILTER_OPTIONS } from "./MainToolbar.config";
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
  showOnlySelectedPlayers: boolean;
  setShowOnlySelectedPlayers: Dispatch<SetStateAction<boolean>>;
  hideMarkedPlayers: boolean;
  setHideMarkedPlayers: Dispatch<SetStateAction<boolean>>;
  compactTableMode: boolean;
  setCompactTableMode: Dispatch<SetStateAction<boolean>>;
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
  showOnlySelectedPlayers,
  setShowOnlySelectedPlayers,
  hideMarkedPlayers,
  setHideMarkedPlayers,
  compactTableMode,
  setCompactTableMode,
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
    footFilter !== "any";
  const hasPlayerMarks = selectedPlayersCount > 0 || rejectedPlayersCount > 0;

  function clearFilters() {
    setDraftSearchTerm("");
    setSearchTerm("");
    setMinAge("");
    setMaxAge("");
    setFootFilter("any");
  }

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

          <AppCheckbox
            checked={compactTableMode}
            onChange={setCompactTableMode}
            style={styles.toolbarCheckbox}
          >
            Widok kompaktowy
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
