import {
  useEffect,
  useId,
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
  fileName: string;

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

  onFileUpload: (file: File) => void | Promise<void>;
  onClearData: () => void;
  onClearPlayerSelection: () => void;
};

export function MainToolbar({
  fileName,
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
  onFileUpload,
  onClearData,
  onClearPlayerSelection,
}: MainToolbarProps) {
  const fileInputId = useId();
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
    }, 180);

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
    <section
      style={styles.toolbar}
      aria-labelledby="main-toolbar-title"
    >
      <h2 id="main-toolbar-title" style={visuallyHiddenStyle}>
        Import danych i filtry listy piłkarzy
      </h2>

      <div style={styles.toolbarGrid}>
        <div style={styles.filterField}>
          <span id={`${fileInputId}-label`} style={styles.filterLabel}>
            Plik HTML / CSV
          </span>

          <div style={styles.filePickerRow}>
            <input
              id={fileInputId}
              type="file"
              accept=".html,.htm,.csv"
              aria-labelledby={`${fileInputId}-label`}
              aria-describedby={`${fileInputId}-hint ${fileInputId}-status`}
              style={styles.fileInput}
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  onFileUpload(file);
                }

                event.target.value = "";
              }}
            />

            <label htmlFor={fileInputId} style={styles.fileButton}>
              Wybierz plik
            </label>

            <span
              id={`${fileInputId}-status`}
              style={styles.fileName}
              aria-live="polite"
              title={fileName || "Nie wybrano pliku"}
            >
              {fileName || "Nie wybrano pliku"}
            </span>
          </div>

          <span id={`${fileInputId}-hint`} style={styles.helperText}>
            Obsługiwane formaty: HTML, HTM albo CSV.
          </span>
        </div>

        <AppTextField
          label="Wyszukiwarka"
          type="text"
          placeholder="Nazwisko, klub, liga, pozycja..."
          value={draftSearchTerm}
          onChange={setDraftSearchTerm}
          autoComplete="off"
          spellCheck={false}
          fieldStyle={styles.filterField}
          labelStyle={styles.filterLabel}
          inputStyle={styles.fieldInput}
        />

        <div style={styles.ageGrid}>
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
        </div>

        <AppSelectField
          label="Noga"
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
            size="md"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Wyczyść filtry
          </AppButton>

          <AppButton
            type="button"
            variant="danger"
            size="md"
            onClick={onClearData}
            disabled={!fileName}
          >
            Wyczyść zapisany plik
          </AppButton>

          <AppButton
            type="button"
            variant="danger"
            size="md"
            onClick={onClearPlayerSelection}
            disabled={!hasPlayerMarks}
          >
            Wyczyść zaznaczenia
          </AppButton>

          <AppCheckbox
            checked={showOnlySelectedPlayers}
            onChange={setShowOnlySelectedPlayers}
            style={styles.toolbarCheckbox}
          >
            Pokaż tylko wybranych
          </AppCheckbox>

          <AppCheckbox
            checked={hideMarkedPlayers}
            onChange={setHideMarkedPlayers}
            disabled={showOnlySelectedPlayers}
            style={styles.toolbarCheckbox}
          >
            Ukryj wybranych i odrzuconych
          </AppCheckbox>

          <span style={styles.toolbarCounter} aria-live="polite">
            Wybrani: <strong>{selectedPlayersCount}</strong> / z pozycją:{" "}
            <strong>{selectedPlayersWithPositionCount}</strong> / odrzuceni:{" "}
            <strong>{rejectedPlayersCount}</strong>
          </span>

          <AppCheckbox
            checked={compactTableMode}
            onChange={setCompactTableMode}
            style={styles.toolbarCheckbox}
          >
            Tabela kompaktowa
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
