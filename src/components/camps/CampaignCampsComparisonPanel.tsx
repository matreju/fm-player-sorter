import type { Camp } from "../../types/camp";
import { getCampTypeLabel } from "../../utils/campCore";
import {
  formatAverageRating,
  getCampComparisonStats,
} from "../../utils/campStats";
import { styles } from "./CampsDrawer.styles";

type CampaignCampsComparisonPanelProps = {
  camps: Camp[];
};

export function CampaignCampsComparisonPanel({
  camps,
}: CampaignCampsComparisonPanelProps) {
  return (
    <section style={styles.campaignSection}>
      <h3 style={styles.sectionTitle}>Porównanie zgrupowań</h3>

      <div style={styles.campaignTable}>
        <div
          style={{
            ...styles.campaignTableRow,
            ...styles.campaignTableHead,
          }}
        >
          <div>Zgrupowanie</div>
          <div>Mecze</div>
          <div>Sprawdzeni</div>
          <div>Gole</div>
          <div>Stracone</div>
          <div>Bez minut</div>
          <div>Najlepsza ocena</div>
        </div>

        {camps.length === 0 && (
          <div style={styles.empty}>
            Brak zgrupowań przypisanych do tej kampanii.
          </div>
        )}

        {camps.map((camp) => {
          const comparison = getCampComparisonStats(camp);

          return (
            <div key={camp.id} style={styles.campaignTableRow}>
              <div style={styles.campaignTableNameCell}>
                <strong>{camp.name}</strong>
                <span>{getCampTypeLabel(camp.type)}</span>
              </div>

              <strong>{camp.matches.length}</strong>
              <strong>{comparison.checkedPlayers}</strong>
              <strong>{comparison.goalsFor}</strong>
              <strong>{comparison.goalsAgainst}</strong>
              <strong>{comparison.withoutMinutes}</strong>
              <strong>
                {comparison.bestRatedPlayer
                  ? `${comparison.bestRatedPlayer.player.name} (${formatAverageRating(
                      comparison.bestRatedPlayer.avgRating
                    )})`
                  : "-"}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}