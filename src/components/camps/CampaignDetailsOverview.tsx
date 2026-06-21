import type { Campaign } from "../../types/camp";
import { getCampTypeLabel } from "../../utils/campCore";
import type { CampaignStats } from "../../utils/campStats";
import { styles } from "./CampsDrawer.styles";

type CampaignDetailsOverviewProps = {
  campaign: Campaign;
  stats: CampaignStats;
  onDeleteCampaign: (campaignId: string) => void;
};

export function CampaignDetailsOverview({
  campaign,
  stats,
  onDeleteCampaign,
}: CampaignDetailsOverviewProps) {
  return (
    <>
      <div style={styles.campaignDetailsHeader}>
        <div>
          <h3 style={styles.detailsTitle}>{campaign.name}</h3>

          <div style={styles.detailsMeta}>
            {getCampTypeLabel(campaign.type)}
            {campaign.dateFrom ? ` · od ${campaign.dateFrom}` : ""}
            {campaign.dateTo ? ` · do ${campaign.dateTo}` : ""}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDeleteCampaign(campaign.id)}
          style={styles.dangerButton}
        >
          Usuń kampanię
        </button>
      </div>

      <div style={styles.campaignStatsGrid}>
        <div style={styles.summaryMiniCard}>
          <span>Zgrupowania</span>
          <strong>{stats.campsCount}</strong>
        </div>

        <div style={styles.summaryMiniCard}>
          <span>Mecze</span>
          <strong>{stats.matches}</strong>
        </div>

        <div style={styles.summaryMiniCard}>
          <span>Bilans</span>
          <strong>
            {stats.wins}-{stats.draws}-{stats.losses}
          </strong>
        </div>

        <div style={styles.summaryMiniCard}>
          <span>Gole</span>
          <strong>
            {stats.goalsFor}:{stats.goalsAgainst}
          </strong>
        </div>

        <div style={styles.summaryMiniCard}>
          <span>Powołani łącznie</span>
          <strong>{stats.calledPlayers}</strong>
        </div>

        <div style={styles.summaryMiniCard}>
          <span>Sprawdzeni</span>
          <strong>{stats.checkedPlayers}</strong>
        </div>
      </div>
    </>
  );
}