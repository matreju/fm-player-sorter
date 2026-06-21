import type { FormationRecommendation } from "../../utils/formationAdvisor";
import { AppButton } from "../ui";
import { squadBuilderStyles as styles } from "./squadBuilderStyles";

type SquadBuilderFormationAdvisorProps = {
  recommendations: FormationRecommendation[];
  activeFormationId: string;
  onApplyRecommendation: (recommendation: FormationRecommendation) => void;
};

function formatScore(value: number) {
  return value.toFixed(1);
}

export function SquadBuilderFormationAdvisor({
  recommendations,
  activeFormationId,
  onApplyRecommendation,
}: SquadBuilderFormationAdvisorProps) {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section
      style={styles.formationAdvisor}
      aria-labelledby="formation-advisor-title"
    >
      <div style={styles.formationAdvisorHeader}>
        <div>
          <h3 id="formation-advisor-title" style={styles.formationAdvisorTitle}>
            Rekomendowane formacje
          </h3>

          <div style={styles.formationAdvisorSubtitle}>
            Liczone na bazie dostępnych zawodników, dopasowania do slotów i
            najlepszych ról.
          </div>
        </div>
      </div>

      <div style={styles.formationAdvisorList}>
        {recommendations.slice(0, 3).map((recommendation, index) => {
          const isActive = activeFormationId === recommendation.formationId;

          return (
            <article
              key={recommendation.formationId}
              style={{
                ...styles.formationAdvisorCard,
                ...(isActive ? styles.formationAdvisorCardActive : {}),
              }}
            >
              <div style={styles.formationAdvisorRank}>{index + 1}</div>

              <div style={styles.formationAdvisorMain}>
                <strong style={styles.formationAdvisorName}>
                  {recommendation.formationName}
                </strong>

                <span style={styles.formationAdvisorMeta}>
                  XI: {recommendation.filledSlots}/{recommendation.slotCount} ·
                  naturalni: {recommendation.naturalCount} · bliscy:{" "}
                  {recommendation.closeCount}
                </span>

                <span style={styles.formationAdvisorMeta}>
                  Śr. XI: {formatScore(recommendation.averageScore)} · najsłabszy
                  slot: {formatScore(recommendation.weakestSlotScore)}
                </span>

                {recommendation.emptySlots.length > 0 && (
                  <span style={styles.formationAdvisorWarning}>
                    Braki: {recommendation.emptySlots.join(", ")}
                  </span>
                )}
              </div>

              <div style={styles.formationAdvisorSide}>
                <strong style={styles.formationAdvisorScore}>
                  {formatScore(recommendation.score)}
                </strong>

                <AppButton
                  type="button"
                  variant={isActive ? "secondary" : "primary"}
                  size="sm"
                  onClick={() => onApplyRecommendation(recommendation)}
                >
                  Ustaw
                </AppButton>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}