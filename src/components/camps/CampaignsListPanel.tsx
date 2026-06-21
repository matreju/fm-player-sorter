import type { Camp, Campaign } from "../../types/camp";
import { getCampTypeLabel } from "../../utils/campCore";
import { styles } from "./CampsDrawer.styles";

type CampaignsListPanelProps = {
  campaigns: Campaign[];
  camps: Camp[];
  activeCampaignId: string;
  onSelectCampaign: (campaignId: string) => void;
};

export function CampaignsListPanel({
  campaigns,
  camps,
  activeCampaignId,
  onSelectCampaign,
}: CampaignsListPanelProps) {
  return (
    <aside style={styles.campaignListPanel}>
      <h3 style={styles.sectionTitle}>Lista kampanii</h3>

      {campaigns.length === 0 && (
        <div style={styles.empty}>Brak zapisanych kampanii.</div>
      )}

      {campaigns.map((campaign) => {
        const isActive = campaign.id === activeCampaignId;
        const campaignCampsCount = camps.filter(
          (camp) => camp.campaignId === campaign.id
        ).length;

        return (
          <button
            key={campaign.id}
            type="button"
            onClick={() => onSelectCampaign(campaign.id)}
            style={{
              ...styles.campaignButton,
              ...(isActive ? styles.campaignButtonActive : {}),
            }}
          >
            <strong>{campaign.name}</strong>

            <span>
              {getCampTypeLabel(campaign.type)} · zgrupowania:{" "}
              {campaignCampsCount}
            </span>
          </button>
        );
      })}
    </aside>
  );
}