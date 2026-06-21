import type { CampType } from "../../types/camp";
import { CAMP_TYPES } from "../../utils/campCore";
import { styles } from "./CampsDrawer.styles";

type CampaignCreatePanelProps = {
  campaignName: string;
  campaignType: CampType;
  campaignDateFrom: string;
  campaignDateTo: string;
  onCampaignNameChange: (value: string) => void;
  onCampaignTypeChange: (value: CampType) => void;
  onCampaignDateFromChange: (value: string) => void;
  onCampaignDateToChange: (value: string) => void;
  onCreateCampaign: () => void;
};

export function CampaignCreatePanel({
  campaignName,
  campaignType,
  campaignDateFrom,
  campaignDateTo,
  onCampaignNameChange,
  onCampaignTypeChange,
  onCampaignDateFromChange,
  onCampaignDateToChange,
  onCreateCampaign,
}: CampaignCreatePanelProps) {
  return (
    <div style={styles.campaignCreatePanel}>
      <label style={styles.field}>
        Nazwa kampanii
        <input
          value={campaignName}
          onChange={(event) => onCampaignNameChange(event.target.value)}
          style={styles.input}
          placeholder="np. Eliminacje do EURO 2032"
        />
      </label>

      <label style={styles.field}>
        Typ
        <select
          value={campaignType}
          onChange={(event) =>
            onCampaignTypeChange(event.target.value as CampType)
          }
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
          value={campaignDateFrom}
          onChange={(event) => onCampaignDateFromChange(event.target.value)}
          style={styles.input}
        />
      </label>

      <label style={styles.field}>
        Data do
        <input
          type="date"
          value={campaignDateTo}
          onChange={(event) => onCampaignDateToChange(event.target.value)}
          style={styles.input}
        />
      </label>

      <button type="button" onClick={onCreateCampaign} style={styles.primaryButton}>
        Utwórz kampanię
      </button>
    </div>
  );
}