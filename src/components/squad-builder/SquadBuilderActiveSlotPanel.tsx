import { useMemo, useState } from "react";
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
import {
  formatRoleScore,
  getRoleAttributeGroupMeta,
  type RoleAttributeImportance,
} from "../../utils/roleScoring";
import { formatCandidateScoreForMode } from "../../utils/squadBuilderScoreMode";
import { AppButton, CallUpButton } from "../ui";
import { squadBuilderStyles as styles } from "./squadBuilderStyles";
import {
  getTacticalViewLabel,
  type TacticalView,
} from "../../utils/squadBuilderTacticalView";
import { parseAttributeValue } from "../../utils/attributeValue";

type SquadBuilderActiveSlotPanelProps = {
  activeSlot: FormationSlot | null;
  scoreMode: SquadBuilderScoreMode;
  tacticalView: TacticalView;
  getVisibleTopCandidates: (
    slot: FormationSlot,
    limit?: number,
    view?: TacticalView
  ) => SlotCandidate[];
  getCurrentPitchPosition: (slot: FormationSlot) => PitchPosition;
  onUpdateSlot: (slotId: string, patch: Partial<FormationSlot>) => void;

  onHideTopCandidate: (
    slotId: string,
    candidateKey: string,
    view?: TacticalView
  ) => void;
  getPlayerMark?: (row: TableRow) => PlayerMark | null;
  onSelectPlayer?: (row: TableRow, selectionPosition: string) => void;
};

type RoleAttributePreview = {
  name: string;
  shortName: string;
  valueLabel: string;
  averageValue: number | null;
  importance: RoleAttributeImportance;
  groupLabel: string;
  weightLabel: string;
};

const ATTRIBUTE_SHORT_NAMES: Record<string, string> = {
  "Wykańczanie akcji": "Wykańcz.",
  "Gra bez piłki": "Bez piłki",
  "Przyjęcie piłki": "Przyjęcie",
  "Przegląd sytuacji": "Przegląd",
  "Odbiór piłki": "Odbiór",
  "Ustawianie się": "Ustaw.",
  "Dośrodkowania": "Dośr.",
  "Pracowitość": "Praca",
  "Błyskotliwość": "Błysk.",
  "Koncentracja": "Koncentr.",
  "Przewidywanie": "Przewid.",
  "Wytrzymałość": "Wytrz.",
  "Przyspieszenie": "Przysp.",
  "Równowaga": "Równow.",
  "Skoczność": "Skocz.",
  "Współpraca": "Współpr.",
};

function getShortAttributeName(name: string): string {
  return ATTRIBUTE_SHORT_NAMES[name] ?? name;
}

function formatAttributeNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(1);
}

function getAttributePreviewValue(row: TableRow, attributeName: string) {
  const parsed = parseAttributeValue(String(row[attributeName] ?? ""));

  if (!parsed) {
    return {
      valueLabel: "-",
      averageValue: null,
    };
  }

  if (parsed.isRange) {
    return {
      valueLabel: `${formatAttributeNumber(parsed.min)}–${formatAttributeNumber(
        parsed.max
      )}`,
      averageValue: parsed.average,
    };
  }

  return {
    valueLabel: formatAttributeNumber(parsed.average),
    averageValue: parsed.average,
  };
}

function getRoleAttributePreviews(candidate: SlotCandidate): RoleAttributePreview[] {
  const role = candidate.roleResult.role;
  const used = new Set<string>();
  const result: RoleAttributePreview[] = [];

  function addAttributes(
    attributes: string[] | undefined,
    importance: RoleAttributeImportance
  ) {
    const meta = getRoleAttributeGroupMeta(importance);

    for (const attributeName of attributes ?? []) {
      if (used.has(attributeName)) {
        continue;
      }

      used.add(attributeName);

      const value = getAttributePreviewValue(candidate.row, attributeName);

      result.push({
        name: attributeName,
        shortName: getShortAttributeName(attributeName),
        valueLabel: value.valueLabel,
        averageValue: value.averageValue,
        importance,
        groupLabel: meta.groupLabel,
        weightLabel: meta.weightLabel,
      });
    }
  }

  // Dokładnie ta sama kolejność i deduplikacja co w roleScoring.ts:
  addAttributes(role.coreAttributes, "core");
  addAttributes(role.keyAttributes, "key");
  addAttributes(role.importantAttributes, "important");
  addAttributes(role.supportAttributes, "support");

  return result;
}

function groupRoleAttributes(attributes: RoleAttributePreview[]) {
  return (["core", "key", "important", "support"] as const)
    .map((importance) => {
      const meta = getRoleAttributeGroupMeta(importance);

      return {
        id: importance,
        label: meta.groupLabel,
        weightLabel: meta.weightLabel,
        items: attributes.filter(
          (attribute) => attribute.importance === importance
        ),
      };
    })
    .filter((group) => group.items.length > 0);
}
function getRoleAttributeChipStyle(importance: RoleAttributeImportance) {
  if (importance === "core") {
    return styles.roleAttributeChipCore;
  }

  if (importance === "key") {
    return styles.roleAttributeChipKey;
  }

  if (importance === "important") {
    return styles.roleAttributeChipImportant;
  }

  return styles.roleAttributeChipSupport;
}

function getRoleAttributeValueStyle(averageValue: number | null) {
  if (averageValue === null) {
    return styles.roleAttributeValueUnknown;
  }

  if (averageValue >= 15) {
    return styles.roleAttributeValueHigh;
  }

  if (averageValue >= 12) {
    return styles.roleAttributeValueGood;
  }

  if (averageValue >= 10) {
    return styles.roleAttributeValueOk;
  }

  return styles.roleAttributeValueLow;
}
export function SquadBuilderActiveSlotPanel({
  activeSlot,
  scoreMode,
  tacticalView,
  getVisibleTopCandidates,
  getCurrentPitchPosition,
  onUpdateSlot,
  onHideTopCandidate,
  getPlayerMark,
  onSelectPlayer,
}: SquadBuilderActiveSlotPanelProps) {
  const [attributeDetailsCandidate, setAttributeDetailsCandidate] =
  useState<SlotCandidate | null>(null);
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

  const roleAttributes = getRoleAttributePreviews(candidate);

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
<button
  type="button"
  style={styles.roleAttributesOpenButton}
  onClick={() => setAttributeDetailsCandidate(candidate)}
>
  <span style={styles.roleAttributesOpenButtonText}>
    Atrybuty scoringu
  </span>

  <strong style={styles.roleAttributesOpenButtonCount}>
    {roleAttributes.length}
  </strong>

  <small style={styles.roleAttributesOpenButtonHint}>
    kliknij szczegóły
  </small>
</button>

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
      {attributeDetailsCandidate &&
  (() => {
    const modalAttributes = getRoleAttributePreviews(
      attributeDetailsCandidate
    );
    const modalAttributeGroups = groupRoleAttributes(modalAttributes);

    return (
      <div
        style={styles.roleAttributesModalBackdrop}
        role="presentation"
        onClick={() => setAttributeDetailsCandidate(null)}
      >
        <section
          style={styles.roleAttributesModal}
          role="dialog"
          aria-modal="true"
          aria-label={`Atrybuty scoringu: ${attributeDetailsCandidate.name}`}
          onClick={(event) => event.stopPropagation()}
        >
          <header style={styles.roleAttributesModalHeader}>
            <div>
              <h3 style={styles.roleAttributesModalTitle}>
                {attributeDetailsCandidate.name}
              </h3>

              <div style={styles.roleAttributesModalSubtitle}>
                {attributeDetailsCandidate.roleResult.role.name} ·{" "}
                {attributeDetailsCandidate.candidateKindLabel}
              </div>

              <div style={styles.roleAttributesModalSubtitle}>
                {attributeDetailsCandidate.position} ·{" "}
                {attributeDetailsCandidate.club} ·{" "}
                {attributeDetailsCandidate.footLabel}
              </div>
            </div>

            <button
              type="button"
              style={styles.roleAttributesModalClose}
              onClick={() => setAttributeDetailsCandidate(null)}
              aria-label="Zamknij okno atrybutów"
            >
              ×
            </button>
          </header>

          <div style={styles.roleAttributesModalScoreRow}>
            <span>Wynik</span>
            <strong>
              {formatCandidateScoreForMode(
                attributeDetailsCandidate,
                scoreMode
              )}
            </strong>
          </div>

          <div style={styles.roleAttributesModalBody}>
            <div style={styles.roleAttributesModalIntro}>
              Atrybuty faktycznie używane w scoringu tej roli:{" "}
              <strong>{modalAttributes.length}</strong>
            </div>

            <div style={styles.roleAttributeModalGroups}>
              {modalAttributeGroups.map((group) => (
                <div key={group.id} style={styles.roleAttributeModalGroup}>
                  <div style={styles.roleAttributeModalGroupHeader}>
                    <span>{group.label}</span>
                    <small>{group.weightLabel}</small>
                  </div>

                  <div style={styles.roleAttributeModalGrid}>
                    {group.items.map((attribute) => (
                      <div
                        key={`${attribute.importance}-${attribute.name}`}
                        style={{
                          ...styles.roleAttributeModalChip,
                          ...getRoleAttributeChipStyle(attribute.importance),
                        }}
                        title={`${attribute.name} · ${attribute.groupLabel} · ${attribute.weightLabel}`}
                      >
                        <span style={styles.roleAttributeModalName}>
                          {attribute.name}
                        </span>

                        <strong
                          style={{
                            ...styles.roleAttributeModalValue,
                            ...getRoleAttributeValueStyle(
                              attribute.averageValue
                            ),
                          }}
                        >
                          {attribute.valueLabel}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  })()}
    </>
  );
}