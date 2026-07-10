import type { TacticalPlanRecommendation } from "../../utils/tacticalPlanAdvisor";
import { AppButton } from "../ui";
import { squadBuilderStyles as styles } from "./squadBuilderStyles";

type SquadBuilderPlanSuggestionsModalProps = {
  isOpen: boolean;
  recommendations: TacticalPlanRecommendation[];
  onClose: () => void;
  onApplyPlan: (recommendation: TacticalPlanRecommendation) => void;
};

function formatScore(value: number) {
  return value.toFixed(1);
}

export function SquadBuilderPlanSuggestionsModal({
  isOpen,
  recommendations,
  onClose,
  onApplyPlan,
}: SquadBuilderPlanSuggestionsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={styles.planModalBackdrop} role="presentation">
      <section
        style={styles.planModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-suggestions-title"
      >
        <div style={styles.planModalHeader}>
          <div>
            <h3 id="plan-suggestions-title" style={styles.planModalTitle}>
              Sugestie planu gry
            </h3>

            <div style={styles.planModalSubtitle}>
              Generator pokazuje różne formacje przy piłce, a dla każdej dobiera
              najlepszy wariant bez piłki dla tej samej XI.
            </div>
          </div>

          <AppButton type="button" variant="neutral" size="sm" onClick={onClose}>
            Zamknij
          </AppButton>
        </div>

        {recommendations.length === 0 ? (
          <div style={styles.planModalEmpty}>
            Brak sensownych propozycji dla aktualnej puli zawodników i filtrów.
            Spróbuj wyłączyć „Tylko powołani” albo „Top 3 naturalni”.
          </div>
        ) : (
          <div style={styles.planList}>
            {recommendations.map((recommendation, index) => (
              <article key={recommendation.id} style={styles.planCard}>
                <div style={styles.planCardRank}>{index + 1}</div>

                <div style={styles.planCardMain}>
                  <strong style={styles.planCardTitle}>
                    {recommendation.withBallFormationName} /{" "}
                    {recommendation.withoutBallFormationName}
                  </strong>

                  <div style={styles.planCardGrid}>
                    <span>
                      Przy piłce:{" "}
                      <strong>{formatScore(recommendation.withBallScore)}</strong>
                    </span>

                    <span>
                      Bez piłki:{" "}
                      <strong>
                        {formatScore(recommendation.withoutBallScore)}
                      </strong>
                    </span>

                    <span>
                      Najsłabszy PP:{" "}
                      <strong>
                        {formatScore(recommendation.weakestWithBallScore)}
                      </strong>
                    </span>

                    <span>
                      Najsłabszy BP:{" "}
                      <strong>
                        {formatScore(recommendation.weakestWithoutBallScore)}
                      </strong>
                    </span>

                    <span>
                      Naturalni: <strong>{recommendation.naturalCount}</strong>
                    </span>

                    <span>
                      Bliscy: <strong>{recommendation.closeCount}</strong>
                    </span>

                    <span>
                      Konwersje:{" "}
                      <strong>{recommendation.conversionCount}</strong>
                    </span>

                    <span>
                      Ktz: <strong>{recommendation.injuredCount}</strong>
                    </span>
                  </div>

                  {recommendation.warnings.length > 0 && (
                    <div style={styles.planWarnings}>
                      {recommendation.warnings.map((warning) => (
                        <span key={warning} style={styles.planWarningPill}>
                          {warning}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.planCardSide}>
                  <strong style={styles.planScore}>
                    {formatScore(recommendation.score)}
                  </strong>

                  <AppButton
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => onApplyPlan(recommendation)}
                  >
                    Ustaw plan
                  </AppButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
