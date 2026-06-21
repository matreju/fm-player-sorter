import type { CampType } from "../../types/camp";
import { CAMP_TYPES } from "../../utils/campCore";
import { styles } from "./CampsDrawer.styles";

type CampCreatePanelProps = {
  campName: string;
  campType: CampType;
  dateFrom: string;
  dateTo: string;
  selectedPlayersCount: number;
  onCampNameChange: (value: string) => void;
  onCampTypeChange: (value: CampType) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onOpenCampaigns: () => void;
  onOpenCareerHistory: () => void;
  onAddSelectedPlayersToActiveCamp: () => void;
  onCreateCamp: () => void;
};

export function CampCreatePanel({
  campName,
  campType,
  dateFrom,
  dateTo,
  selectedPlayersCount,
  onCampNameChange,
  onCampTypeChange,
  onDateFromChange,
  onDateToChange,
  onOpenCampaigns,
  onOpenCareerHistory,
  onAddSelectedPlayersToActiveCamp,
  onCreateCamp,
}: CampCreatePanelProps) {
  return (
    <section style={styles.createPanel}>
      <h3 style={styles.sectionTitle}>Nowe zgrupowanie</h3>

      <div style={styles.formGrid}>
        <label style={styles.field}>
          Nazwa
          <input
            value={campName}
            onChange={(event) => onCampNameChange(event.target.value)}
            style={styles.input}
            placeholder="np. Czerwiec 2031"
          />
        </label>

        <label style={styles.field}>
          Typ
          <select
            value={campType}
            onChange={(event) => onCampTypeChange(event.target.value as CampType)}
            style={styles.input}
          >
            {CAMP_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.field}>
          Data od
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            style={styles.input}
          />
        </label>

        <label style={styles.field}>
          Data do
          <input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            style={styles.input}
          />
        </label>
      </div>

      <div style={styles.createBottom}>
        <div style={styles.snapshotInfo}>
          Aktualnie powołani do zapisania:{" "}
          <strong>{selectedPlayersCount}</strong>
        </div>

        <div style={styles.campActionRow}>
          <button
            type="button"
            onClick={onOpenCampaigns}
            style={styles.secondaryButton}
          >
            Kampanie
          </button>

          <button
            type="button"
            onClick={onOpenCareerHistory}
            style={styles.secondaryButton}
          >
            Historia zawodników
          </button>

          <button
            type="button"
            onClick={onAddSelectedPlayersToActiveCamp}
            style={styles.secondaryButton}
          >
            Dodaj nowych z aktualnych powołań
          </button>
        </div>

        <button
          type="button"
          onClick={onCreateCamp}
          style={styles.primaryButton}
        >
          Utwórz z aktualnych powołań
        </button>
      </div>
    </section>
  );
}