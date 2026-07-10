import { useState } from "react";
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
onForceCandidateOnSlot?: (slotId: string, candidateKey: string) => void;
  onHideTopCandidate: (
    slotId: string,
    candidateKey: string,
    view?: TacticalView
  ) => void;
  onHideTopCandidateEverywhere: (candidateKey: string) => void;
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

type ScoreBreakdownItem = {
  label: string;
  value: number;
  displayValue: string;
  tone: "neutral" | "signed" | "total";
};

const ATTRIBUTE_SHORT_NAMES: Record<string, string> = {
  "Wykańczanie akcji": "Wykańcz.",
  "Gra bez piłki": "Bez piłki",
  "Przyjęcie piłki": "Przyjęcie",
  "Przegląd sytuacji": "Przegląd",
  "Odbiór piłki": "Odbiór",
  "Ustawianie się": "Ustaw.",
  Dośrodkowania: "Dośr.",
  Pracowitość: "Praca",
  Błyskotliwość: "Błysk.",
  Koncentracja: "Koncentr.",
  Przewidywanie: "Przewid.",
  Wytrzymałość: "Wytrz.",
  Przyspieszenie: "Przysp.",
  Równowaga: "Równow.",
  Skoczność: "Skocz.",
  Współpraca: "Współpr.",
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
    const cautiousValue = parsed.min + (parsed.average - parsed.min) * 0.35;

    return {
      valueLabel: `${formatAttributeNumber(parsed.min)}–${formatAttributeNumber(
        parsed.max
      )}`,
      averageValue: cautiousValue,
    };
  }

  return {
    valueLabel: formatAttributeNumber(parsed.average),
    averageValue: parsed.average,
  };
}

function getRoleAttributePreviews(
  candidate: SlotCandidate
): RoleAttributePreview[] {
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

function getCandidateRoleScore(candidate: SlotCandidate): number {
  return candidate.roleScore ?? candidate.roleResult.score;
}

function getCandidateKindBadgeLabel(candidate: SlotCandidate): string {
  if (candidate.candidateKind === "natural") {
    return "Naturalny";
  }

  if (candidate.candidateKind === "close") {
    return "Bliski";
  }

  return "Awaryjnie";
}

function getCandidateKindBadgeStyle(candidate: SlotCandidate) {
  if (candidate.candidateKind === "natural") {
    return styles.candidateKindBadgeNatural;
  }

  if (candidate.candidateKind === "close") {
    return styles.candidateKindBadgeClose;
  }

  return styles.candidateKindBadgeConversion;
}

function getCandidateCardKindStyle(candidate: SlotCandidate) {
  if (candidate.candidateKind === "natural") {
    return styles.activeTopMiniCardNatural;
  }

  if (candidate.candidateKind === "close") {
    return styles.activeTopMiniCardClose;
  }

  return styles.activeTopMiniCardConversion;
}

function isUsedInOtherSlotCandidate(candidate: SlotCandidate): boolean {
  return candidate.isUsedInOtherSlot === true;
}

function getUsedInOtherSlotLabel(candidate: SlotCandidate): string | null {
  return candidate.usedInOtherSlotLabel ?? null;
}

function getCandidateRankLabel(candidate: SlotCandidate, index: number): string {
  if (isUsedInOtherSlotCandidate(candidate)) {
    return "XI";
  }

  return String(index + 1);
}

function getPotentialRankLabel(candidate: SlotCandidate): string | null {
  const rank = candidate.potentialRankInSlot;

  if (typeof rank !== "number" || !Number.isFinite(rank)) {
    return null;
  }

  return `#${rank}`;
}

function formatSignedScore(value: number): string {
  const rounded = Math.round(value * 10) / 10;

  if (rounded > 0) {
    return `+${formatRoleScore(rounded)}`;
  }

  return formatRoleScore(rounded);
}

function getBreakdownValueStyle(value: number) {
  if (value > 0) {
    return styles.scoreBreakdownValuePositive;
  }

  if (value < 0) {
    return styles.scoreBreakdownValueNegative;
  }

  return styles.scoreBreakdownValueNeutral;
}

function getCompactBreakdownLabel(label: string): string {
  return label
    .replace("Forma klubu", "Forma")
    .replace("OU / jakość", "OU")
    .replace("Mental", "Mental")
    .replace("Pozycja", "Poz.")
    .replace("Pozycja powołania", "Pow. poz.")
    .replace("Przejście fazy", "Faza");
}

function getScoreBreakdownItems(candidate: SlotCandidate): ScoreBreakdownItem[] {
  const breakdown = candidate.scoreBreakdown;

  if (!breakdown) {
    return [
      {
        label: "Rola",
        value: getCandidateRoleScore(candidate),
        displayValue: formatRoleScore(getCandidateRoleScore(candidate)),
        tone: "neutral",
      },
      {
        label: "Ocena selekcyjna",
        value: candidate.finalScore,
        displayValue: formatRoleScore(candidate.finalScore),
        tone: "total",
      },
    ];
  }

  const items: ScoreBreakdownItem[] = [
    {
      label: "Rola",
      value: breakdown.roleScore,
      displayValue: formatRoleScore(breakdown.roleScore),
      tone: "neutral",
    },
  ];

  if (Math.abs(breakdown.formBoost) >= 0.05) {
    items.push({
      label: "Forma klubu",
      value: breakdown.formBoost,
      displayValue: formatSignedScore(breakdown.formBoost),
      tone: "signed",
    });
  }

  if (Math.abs(breakdown.overallAbilityBoost) >= 0.05) {
    items.push({
      label: "OU / jakość",
      value: breakdown.overallAbilityBoost,
      displayValue: formatSignedScore(breakdown.overallAbilityBoost),
      tone: "signed",
    });
  }

  if (Math.abs(breakdown.reliabilityBoost) >= 0.05) {
    items.push({
      label: "Mental",
      value: breakdown.reliabilityBoost,
      displayValue: formatSignedScore(breakdown.reliabilityBoost),
      tone: "signed",
    });
  }

  if (Math.abs(breakdown.positionPenalty) >= 0.05) {
    items.push({
      label: "Pozycja",
      value: -breakdown.positionPenalty,
      displayValue: formatSignedScore(-breakdown.positionPenalty),
      tone: "signed",
    });
  }

  items.push({
    label: "Ocena selekcyjna",
    value: breakdown.finalScore,
    displayValue: formatRoleScore(breakdown.finalScore),
    tone: "total",
  });

  return items;
}

function getRankingBreakdownItems(candidate: SlotCandidate): ScoreBreakdownItem[] {
  const breakdown = candidate.rankingBreakdown;

  if (!breakdown) {
    return [];
  }

  const callUpPositionAdjustment = breakdown.callUpPositionAdjustment ?? 0;
  const tacticalTransitionAdjustment =
    breakdown.tacticalTransitionAdjustment ?? 0;

  const items: ScoreBreakdownItem[] = [];

  if (Math.abs(callUpPositionAdjustment) >= 0.05) {
    items.push({
      label: "Pozycja powołania",
      value: callUpPositionAdjustment,
      displayValue: formatSignedScore(callUpPositionAdjustment),
      tone: "signed",
    });
  }

  if (Math.abs(tacticalTransitionAdjustment) >= 0.05) {
    items.push({
      label: "Przejście fazy",
      value: tacticalTransitionAdjustment,
      displayValue: formatSignedScore(tacticalTransitionAdjustment),
      tone: "signed",
    });
  }

  return items;
}

export function SquadBuilderActiveSlotPanel({
  activeSlot,
  scoreMode,
  tacticalView,
  getVisibleTopCandidates,
  getCurrentPitchPosition,
  onUpdateSlot,
  onHideTopCandidate,
  onHideTopCandidateEverywhere,
  onForceCandidateOnSlot,
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

  const baseActiveRoleLabel =
    activeSlot.roleId === "best"
      ? "najlepsza rola"
      : ROLE_DEFINITIONS.find((role) => role.id === activeSlot.roleId)?.name ??
        "-";

  const excludedRoleName = activeSlot.excludedRoleId
    ? ROLE_DEFINITIONS.find((role) => role.id === activeSlot.excludedRoleId)
        ?.name ?? null
    : null;

  const activeRoleLabel = excludedRoleName
    ? `${baseActiveRoleLabel} · bez: ${excludedRoleName}`
    : baseActiveRoleLabel;

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
                  excludedRoleId: undefined,
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
              onChange={(event) => {
                const nextRoleId = event.target.value;

                onUpdateSlot(activeSlot.id, {
                  roleId: nextRoleId,
                  excludedRoleId:
                    activeSlot.excludedRoleId === nextRoleId
                      ? undefined
                      : activeSlot.excludedRoleId,
                });
              }}
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
            Rola NIE

            <select
              value={activeSlot.excludedRoleId ?? ""}
              onChange={(event) => {
                const nextExcludedRoleId = event.target.value || undefined;

                onUpdateSlot(activeSlot.id, {
                  excludedRoleId: nextExcludedRoleId,
                  roleId:
                    nextExcludedRoleId &&
                    activeSlot.roleId === nextExcludedRoleId
                      ? "best"
                      : activeSlot.roleId,
                });
              }}
              style={styles.select}
              aria-label="Wykluczona rola aktywnego slotu"
            >
              <option value="">Nie wykluczaj roli</option>

              {getRoleOptions(activeSlot).map((role) => (
                <option
                  key={role.id}
                  value={role.id}
                  disabled={
                    activeSlot.roleId !== "best" && activeSlot.roleId === role.id
                  }
                >
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

            const isUsedInOtherSlot = isUsedInOtherSlotCandidate(candidate);
            const usedInOtherSlotLabel = getUsedInOtherSlotLabel(candidate);
            const potentialRankLabel = getPotentialRankLabel(candidate);

            const scoreBreakdownItems = getScoreBreakdownItems(candidate);
            const rankingBreakdownItems = getRankingBreakdownItems(candidate);

            const roleScoreItem = scoreBreakdownItems.find(
              (item) => item.label === "Rola"
            );

            const selectionScoreItem = scoreBreakdownItems.find(
              (item) => item.label === "Ocena selekcyjna"
            );

            const compactScoreBreakdownItems = scoreBreakdownItems.filter(
              (item) =>
                item.label !== "Rola" && item.label !== "Ocena selekcyjna"
            );

            const compactAdjustmentItems = [
              ...compactScoreBreakdownItems,
              ...rankingBreakdownItems,
            ];

            return (
              <div
                key={`${candidate.key}-${isUsedInOtherSlot ? "used" : "free"}`}
                style={{
                  ...styles.activeTopMiniCard,
                  ...getCandidateCardKindStyle(candidate),
                  ...(isUsedInOtherSlot
                    ? styles.activeTopMiniCardUsedElsewhere
                    : {}),
                  ...(isSelected ? styles.selectedCandidateRow : {}),
                }}
              >
                <div
                  style={{
                    ...styles.miniCandidateRank,
                    ...(isUsedInOtherSlot
                      ? styles.miniCandidateRankUsedElsewhere
                      : {}),
                  }}
                >
                  {getCandidateRankLabel(candidate, index)}
                </div>

                {isUsedInOtherSlot && (
                  <div style={styles.usedElsewhereBadgeRow}>
                    {usedInOtherSlotLabel && (
                      <span style={styles.usedElsewhereBadgeCompact}>
                        XI: {usedInOtherSlotLabel}
                      </span>
                    )}

                    {potentialRankLabel && (
                      <span style={styles.potentialRankBadgeCompact}>
                        tutaj {potentialRankLabel}
                      </span>
                    )}
                  </div>
                )}

                <div
                  style={{
                    ...styles.candidateKindBadge,
                    ...getCandidateKindBadgeStyle(candidate),
                    ...(isUsedInOtherSlot
                      ? styles.candidateKindBadgeMuted
                      : {}),
                    justifySelf: "center",
                  }}
                >
                  {getCandidateKindBadgeLabel(candidate)}
                </div>

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

                  {scoreMode === "campaign-callups" && (
                    <>
                      <div style={styles.miniCandidateMeta}>
                        Powołany na tę pozycję:{" "}
                        {candidate.campaignPositionCallUps ?? 0} · razem:{" "}
                        {candidate.campaignCallUps ?? 0}
                      </div>

                      <div style={styles.miniCandidateMeta}>
                        Mecze: {candidate.campaignMatches ?? 0} · minuty:{" "}
                        {candidate.campaignMinutes ?? 0}
                        {candidate.campaignAvgRating !== null &&
                        candidate.campaignAvgRating !== undefined
                          ? ` · ocena: ${candidate.campaignAvgRating.toFixed(
                              2
                            )}`
                          : ""}
                      </div>
                    </>
                  )}

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
                </div>

                <div style={styles.miniCandidateBottom}>
                  <div style={styles.scoreBreakdownCompact}>
                    <div style={styles.scoreBreakdownCompactMain}>
                      <span>
                        Dopasowanie:{" "}
                        <strong>
                          {roleScoreItem?.displayValue ??
                            formatRoleScore(getCandidateRoleScore(candidate))}
                        </strong>
                      </span>

                      <span>
                        Selekcja:{" "}
                        <strong>
                          {selectionScoreItem?.displayValue ??
                            formatRoleScore(candidate.finalScore)}
                        </strong>
                      </span>
                    </div>

                    {compactAdjustmentItems.length > 0 && (
                      <div style={styles.scoreBreakdownCompactChips}>
                        {compactAdjustmentItems.map((item) => (
                          <span
                            key={item.label}
                            style={styles.scoreBreakdownCompactChip}
                          >
                            {getCompactBreakdownLabel(item.label)}{" "}
                            <strong
                              style={{
                                ...styles.scoreBreakdownValue,
                                ...(item.tone === "total"
                                  ? styles.scoreBreakdownValueTotal
                                  : getBreakdownValueStyle(item.value)),
                              }}
                            >
                              {item.displayValue}
                            </strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
<div style={styles.miniCandidateButtons}>
  {onForceCandidateOnSlot && (
    <AppButton
      type="button"
      variant="primary"
      size="sm"
      onClick={() => onForceCandidateOnSlot(activeSlot.id, candidate.key)}
    >
      Ustaw tutaj
    </AppButton>
  )}

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
      onHideTopCandidate(activeSlot.id, candidate.key, tacticalView)
    }
  >
    Ukryj slot
  </AppButton>

  <AppButton
    type="button"
    variant="danger"
    size="sm"
    onClick={() => onHideTopCandidateEverywhere(candidate.key)}
  >
    Wyklucz
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
                  <span>Dopasowanie roli</span>
                  <strong>
                    {formatRoleScore(
                      getCandidateRoleScore(attributeDetailsCandidate)
                    )}
                  </strong>
                </div>

                <div style={styles.roleAttributesModalScoreRow}>
                  <span>Ocena selekcyjna</span>
                  <strong>
                    {formatRoleScore(attributeDetailsCandidate.finalScore)}
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
                                ...getRoleAttributeChipStyle(
                                  attribute.importance
                                ),
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