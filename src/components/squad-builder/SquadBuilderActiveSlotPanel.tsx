import type {
  FormationSlot,
  PitchPosition,
  PlayerMark,
  SlotCandidate,
  SquadBuilderScoreMode,
} from "../../types/squadBuilderTypes";
import type { TableRow } from "../../types/table";
import { FOOT_REQUIREMENTS } from "../../constants/squadBuilderFormations";
import { ROLE_DEFINITIONS, getRolePhaseLabel } from "../../constants/roles";
import {
  getPositionGroups,
  getRoleOptions,
} from "../../utils/squadBuilderScoring";
import { inferSlotLabelFromPitch } from "../../utils/squadBuilderPitch";
import { formatRoleScore } from "../../utils/roleScoring";
import { formatCandidateScoreForMode } from "../../utils/squadBuilderScoreMode";
import { AppButton, CallUpButton } from "../ui";
import { squadBuilderStyles as styles } from "./squadBuilderStyles";
import {
  getTacticalViewLabel,
  type TacticalView,
} from "../../utils/squadBuilderTacticalView";

type SquadBuilderActiveSlotPanelProps = {
  activeSlot: FormationSlot | null;
  scoreMode: SquadBuilderScoreMode;
  tacticalView: TacticalView;
  getVisibleTopCandidates: (
    slot: FormationSlot,
    limit?: number,
    view?: TacticalView
  ) => SlotCandidate[];
  getLockedCandidateKey: (slotId: string, view?: TacticalView) => string;
  getCurrentPitchPosition: (slot: FormationSlot) => PitchPosition;
  onUpdateSlot: (slotId: string, patch: Partial<FormationSlot>) => void;
  onToggleSlotCandidateLock: (
    slotId: string,
    candidateKey: string,
    view?: TacticalView
  ) => void;
  onHideTopCandidate: (
    slotId: string,
    candidateKey: string,
    view?: TacticalView
  ) => void;
  getPlayerMark?: (row: TableRow) => PlayerMark | null;
  onSelectPlayer?: (row: TableRow, selectionPosition: string) => void;
};

export function SquadBuilderActiveSlotPanel({
  activeSlot,
  scoreMode,
  tacticalView,
  getVisibleTopCandidates,
  getLockedCandidateKey,
  getCurrentPitchPosition,
  onUpdateSlot,
  onToggleSlotCandidateLock,
  onHideTopCandidate,
  getPlayerMark,
  onSelectPlayer,
}: SquadBuilderActiveSlotPanelProps) {
  if (!activeSlot) {
    return <div style={styles.emptyText}>Kliknij slot na boisku.</div>;
  }

  const visibleTopCandidates = getVisibleTopCandidates(
    activeSlot,
    3,
    tacticalView
  );
  const tacticalViewLabel = getTacticalViewLabel(tacticalView);

  const activeRoleLabel =
    activeSlot.roleId === "best"
      ? "najlepsza rola"
      : ROLE_DEFINITIONS.find((role) => role.id === activeSlot.roleId)?.name ??
        "-";

  return (
    <>
      <section style={styles.activeSlotEditor}>
        <h3 style={styles.activeTopTitle}>
          {activeSlot.label} · {activeSlot.positionGroup}
        </h3>

        <div style={styles.activeTopRole}>Ustawienia aktywnego slotu</div>

        <div style={styles.activeSlotEditorGrid}>
          <label style={styles.field}>
            Pozycja

            <select
              value={activeSlot.positionGroup}
              onChange={(event) => {
                const nextPositionGroup = event.target.value;
                const currentPitchPosition = getCurrentPitchPosition(activeSlot);

                onUpdateSlot(activeSlot.id, {
                  label: inferSlotLabelFromPitch(
                    nextPositionGroup,
                    currentPitchPosition
                  ),
                  positionGroup: nextPositionGroup,
                  roleId: "best",
                });
              }}
              style={styles.select}
              aria-label="Pozycja aktywnego slotu"
            >
              {getPositionGroups().map((positionGroup) => (
                <option key={positionGroup} value={positionGroup}>
                  {positionGroup}
                </option>
              ))}
            </select>
          </label>

          <div style={styles.phaseInfoBox}>
            <span>Edytujesz:</span>
            <strong>{tacticalViewLabel}</strong>
          </div>

          <label style={styles.field}>
            Rola

            <select
              value={activeSlot.roleId}
              onChange={(event) =>
                onUpdateSlot(activeSlot.id, {
                  roleId: event.target.value,
                })
              }
              style={styles.select}
              aria-label="Rola aktywnego slotu"
            >
              <option value="best">Najlepsza rola z tej grupy</option>

              {getRoleOptions(activeSlot).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.field}>
            Noga

            <select
              value={activeSlot.footRequirement}
              onChange={(event) =>
                onUpdateSlot(activeSlot.id, {
                  footRequirement:
                    event.target.value as FormationSlot["footRequirement"],
                })
              }
              style={styles.select}
              aria-label="Wymagana noga aktywnego slotu"
            >
              {FOOT_REQUIREMENTS.map((requirement) => (
                <option key={requirement.id} value={requirement.id}>
                  {requirement.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section style={styles.activeSlotTopSection}>
        <div style={styles.activeTopHeader}>
          <h3 style={styles.activeTopTitle}>
            TOP 3 · {activeSlot.label} · {activeSlot.positionGroup}
          </h3>

          <div style={styles.activeTopRole}>
            {scoreMode === "overall-ability"
              ? "według OU"
              : getRolePhaseLabel(tacticalView)}{" "}
            · {activeRoleLabel}
          </div>
        </div>

        {visibleTopCandidates.length === 0 && (
          <div style={styles.emptyText}>Brak kandydatów po filtrach.</div>
        )}

        <div style={styles.activeTopCards}>
          {visibleTopCandidates.map((candidate, index) => {
            const isSelected = getPlayerMark?.(candidate.row) === "selected";
            const isLocked =
              getLockedCandidateKey(activeSlot.id, tacticalView) ===
              candidate.key;

            return (
              <div
                key={candidate.key}
                style={{
                  ...styles.activeTopMiniCard,
                  ...(isSelected ? styles.selectedCandidateRow : {}),
                }}
              >
                <div style={styles.miniCandidateRank}>{index + 1}</div>

                <div style={styles.miniCandidateMain}>
                  <div style={styles.miniCandidateNameRow}>
                    <strong style={styles.miniCandidateName}>
                      {candidate.name}
                    </strong>

                    {candidate.isInjured && (
                      <span
                        style={styles.injuryBadge}
                        title={`Kontuzja: ${candidate.infoStatus || "Ktz"}`}
                        aria-label={`Kontuzja: ${
                          candidate.infoStatus || "Ktz"
                        }`}
                      >
                        ✚ Ktz
                      </span>
                    )}
                  </div>

                  <div style={styles.miniCandidateMeta}>
                    {candidate.position} · {candidate.club}
                  </div>

                  <div style={styles.miniCandidateMeta}>
                    {candidate.roleResult.role.name} ·{" "}
                    {candidate.candidateKindLabel}
                  </div>

                  <div style={styles.miniCandidateMeta}>
                    {candidate.footLabel}
                  </div>

                  <div style={styles.miniCandidateDualScores}>
                    <span>
                      {scoreMode === "overall-ability"
                        ? "Obecne umiejętności:"
                        : "Wynik:"}{" "}
                      <strong>
                        {formatCandidateScoreForMode(candidate, scoreMode)}
                      </strong>
                    </span>
                  </div>

                  {scoreMode === "overall-ability" && (
                    <div style={styles.miniCandidateMeta}>
                      Dopasowanie roli:{" "}
                      {formatRoleScore(candidate.phaseScore ?? candidate.finalScore)}
                    </div>
                  )}
                </div>

                <div style={styles.miniCandidateBottom}>
                  <strong style={styles.miniCandidateScore}>
                    {formatCandidateScoreForMode(candidate, scoreMode)}
                  </strong>

                  <div style={styles.miniCandidateButtons}>
                    <AppButton
                      type="button"
                      variant={isLocked ? "danger" : "neutral"}
                      size="pillIcon"
                      onClick={() =>
                        onToggleSlotCandidateLock(
                          activeSlot.id,
                          candidate.key,
                          tacticalView
                        )
                      }
                      title={
                        isLocked
                          ? "Odblokuj slot"
                          : "Zablokuj tego zawodnika w slocie"
                      }
                      aria-pressed={isLocked}
                    >
                      {isLocked ? "🔒" : "🔓"}
                    </AppButton>

                    {onSelectPlayer && (
                      <CallUpButton
                        isSelected={isSelected}
                        size="sm"
                        onClick={() =>
                          onSelectPlayer(candidate.row, activeSlot.positionGroup)
                        }
                      />
                    )}

                    <AppButton
                      type="button"
                      variant="neutral"
                      size="sm"
                      onClick={() =>
                        onHideTopCandidate(
                          activeSlot.id,
                          candidate.key,
                          tacticalView
                        )
                      }
                    >
                      Ukryj
                    </AppButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}