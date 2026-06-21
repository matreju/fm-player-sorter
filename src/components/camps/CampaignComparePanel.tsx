import type { Campaign } from "../../types/camp";
import {
  formatAverageRating,
  formatCampaignPlayerLeader,
  formatCampaignRecord,
  formatCampaignRotation,
  type CampaignPlayerExtraStats,
  type CampaignStats,
} from "../../utils/campStats";
import { styles } from "./CampsDrawer.styles";

type CampaignComparePanelProps = {
  campaigns: Campaign[];
  compareLeftCampaign: Campaign | null;
  compareRightCampaign: Campaign | null;
  compareLeftCampaignStats: CampaignStats;
  compareRightCampaignStats: CampaignStats;
  compareLeftCampaignExtraStats: CampaignPlayerExtraStats;
  compareRightCampaignExtraStats: CampaignPlayerExtraStats;
  onCompareLeftCampaignChange: (campaignId: string) => void;
  onCompareRightCampaignChange: (campaignId: string) => void;
};

export function CampaignComparePanel({
  campaigns,
  compareLeftCampaign,
  compareRightCampaign,
  compareLeftCampaignStats,
  compareRightCampaignStats,
  compareLeftCampaignExtraStats,
  compareRightCampaignExtraStats,
  onCompareLeftCampaignChange,
  onCompareRightCampaignChange,
}: CampaignComparePanelProps) {
  return (
    <section style={styles.campaignComparePanel}>
      <div style={styles.campaignCompareHeader}>
        <div>
          <h3 style={styles.sectionTitle}>Porównywarka kampanii</h3>

          <div style={styles.campaignCompareSubtitle}>
            Zestaw dwie kampanie i sprawdź, gdzie szerzej rotowałeś, kto grał
            więcej i jakie były wyniki.
          </div>
        </div>
      </div>

      {campaigns.length < 2 && (
        <div style={styles.empty}>
          Do porównania potrzebujesz minimum dwóch kampanii.
        </div>
      )}

      {campaigns.length >= 2 && (
        <>
          <div style={styles.campaignCompareSelectors}>
            <label style={styles.field}>
              Kampania A

              <select
                value={compareLeftCampaign?.id ?? ""}
                onChange={(event) =>
                  onCompareLeftCampaignChange(event.target.value)
                }
                style={styles.input}
              >
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={styles.field}>
              Kampania B

              <select
                value={compareRightCampaign?.id ?? ""}
                onChange={(event) =>
                  onCompareRightCampaignChange(event.target.value)
                }
                style={styles.input}
              >
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={styles.campaignCompareTable}>
            <div
              style={{
                ...styles.campaignCompareRow,
                ...styles.campaignTableHead,
              }}
            >
              <div>Statystyka</div>
              <div>{compareLeftCampaign?.name ?? "Kampania A"}</div>
              <div>{compareRightCampaign?.name ?? "Kampania B"}</div>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Zgrupowania</span>
              <strong>{compareLeftCampaignStats.campsCount}</strong>
              <strong>{compareRightCampaignStats.campsCount}</strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Mecze</span>
              <strong>{compareLeftCampaignStats.matches}</strong>
              <strong>{compareRightCampaignStats.matches}</strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Bilans W-R-P</span>
              <strong>{formatCampaignRecord(compareLeftCampaignStats)}</strong>
              <strong>{formatCampaignRecord(compareRightCampaignStats)}</strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Gole</span>

              <strong>
                {compareLeftCampaignStats.goalsFor}:
                {compareLeftCampaignStats.goalsAgainst}
              </strong>

              <strong>
                {compareRightCampaignStats.goalsFor}:
                {compareRightCampaignStats.goalsAgainst}
              </strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Powołani łącznie</span>
              <strong>{compareLeftCampaignStats.calledPlayers}</strong>
              <strong>{compareRightCampaignStats.calledPlayers}</strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Sprawdzeni piłkarze</span>
              <strong>{compareLeftCampaignStats.checkedPlayers}</strong>
              <strong>{compareRightCampaignStats.checkedPlayers}</strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Rotacja kadry</span>
              <strong>{formatCampaignRotation(compareLeftCampaignStats)}</strong>
              <strong>{formatCampaignRotation(compareRightCampaignStats)}</strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Piłkarze z min. 180 minut</span>
              <strong>{compareLeftCampaignExtraStats.playersMin180}</strong>
              <strong>{compareRightCampaignExtraStats.playersMin180}</strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Piłkarze z golem</span>
              <strong>{compareLeftCampaignExtraStats.playersWithGoal}</strong>
              <strong>{compareRightCampaignExtraStats.playersWithGoal}</strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Piłkarze z asystą</span>
              <strong>{compareLeftCampaignExtraStats.playersWithAssist}</strong>
              <strong>{compareRightCampaignExtraStats.playersWithAssist}</strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Śr. minut / sprawdzonego</span>
              <strong>
                {compareLeftCampaignExtraStats.averageMinutesPerCheckedPlayer}
              </strong>
              <strong>
                {compareRightCampaignExtraStats.averageMinutesPerCheckedPlayer}
              </strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Śr. ocena kampanii</span>
              <strong>
                {formatAverageRating(compareLeftCampaignExtraStats.averageRating)}
              </strong>
              <strong>
                {formatAverageRating(compareRightCampaignExtraStats.averageRating)}
              </strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Lider minut</span>

              <strong>
                {formatCampaignPlayerLeader(
                  compareLeftCampaignExtraStats.topMinutesPlayer,
                  "minutes"
                )}
              </strong>

              <strong>
                {formatCampaignPlayerLeader(
                  compareRightCampaignExtraStats.topMinutesPlayer,
                  "minutes"
                )}
              </strong>
            </div>

            <div style={styles.campaignCompareRow}>
              <span>Najlepszy strzelec</span>

              <strong>
                {formatCampaignPlayerLeader(
                  compareLeftCampaignExtraStats.topScorer,
                  "goals"
                )}
              </strong>

              <strong>
                {formatCampaignPlayerLeader(
                  compareRightCampaignExtraStats.topScorer,
                  "goals"
                )}
              </strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
}