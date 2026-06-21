import type { Camp, Campaign } from "../../types/camp";
import { getCampTypeLabel } from "../../utils/campCore";
import { styles } from "./CampsDrawer.styles";

type CampDetailsHeaderProps = {
  camp: Camp;
  campaigns: Campaign[];
  onDeleteCamp: (campId: string) => void;
  onAssignCampaign: (campaignId: string) => void;
};

export function CampDetailsHeader({
  camp,
  campaigns,
  onDeleteCamp,
  onAssignCampaign,
}: CampDetailsHeaderProps) {
  return (
    <>
      <div style={styles.detailsHeader}>
        <div>
          <h3 style={styles.detailsTitle}>{camp.name}</h3>

          <div style={styles.detailsMeta}>
            {getCampTypeLabel(camp.type)}
            {camp.dateFrom ? ` · od ${camp.dateFrom}` : ""}
            {camp.dateTo ? ` · do ${camp.dateTo}` : ""}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDeleteCamp(camp.id)}
          style={styles.dangerButton}
        >
          Usuń zgrupowanie
        </button>
      </div>

      <div style={styles.campaignAssignRow}>
        <label style={styles.field}>
          Kampania / cykl

          <select
            value={camp.campaignId ?? ""}
            onChange={(event) => onAssignCampaign(event.target.value)}
            style={styles.input}
          >
            <option value="">Bez kampanii</option>

            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span>Powołani</span>
          <strong>{camp.players.length}</strong>
        </div>

        <div style={styles.statCard}>
          <span>Mecze</span>
          <strong>{camp.matches.length}</strong>
        </div>
      </div>
    </>
  );
}