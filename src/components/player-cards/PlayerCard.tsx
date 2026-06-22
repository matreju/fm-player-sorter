import { memo, type KeyboardEvent, type MouseEvent } from "react";
import type { PlayerMark } from "../../constants/selection";
import type { TableRow } from "../../types/table";
import { buildPlayerCardSummary } from "../../utils/playerCardSummary";
import { AppButton, CallUpButton } from "../ui";
import { playerCardStyles as styles } from "./PlayerCard.styles";

type PlayerCardProps = {
  row: TableRow;
  mark: PlayerMark | null;
  analysisLabel: string;
  compact?: boolean;
  onTogglePlayerMark: (row: TableRow, mark: PlayerMark) => void;
  onOpenDetails: (playerKey: string) => void;
  onComparePlayer: (playerKey: string) => void;
};

type ScoreTone = "elite" | "good" | "okay" | "low";

function parseScore(value: string): number | null {
  const parsed = Number(String(value).replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function getScoreTone(scoreLabel: string): ScoreTone {
  const score = parseScore(scoreLabel);

  if (score === null) {
    return "low";
  }

  if (score >= 80) {
    return "elite";
  }

  if (score >= 70) {
    return "good";
  }

  if (score >= 60) {
    return "okay";
  }

  return "low";
}

function getScoreBadgeStyle(tone: ScoreTone) {
  if (tone === "elite") {
    return styles.scoreBadgeElite;
  }

  if (tone === "good") {
    return styles.scoreBadgeGood;
  }

  if (tone === "okay") {
    return styles.scoreBadgeOkay;
  }

  return styles.scoreBadgeLow;
}

function getScoreValueStyle(tone: ScoreTone) {
  if (tone === "elite") {
    return styles.scoreValueElite;
  }

  if (tone === "good") {
    return styles.scoreValueGood;
  }

  if (tone === "okay") {
    return styles.scoreValueOkay;
  }

  return styles.scoreValueLow;
}

function getFormToneStyle(tone: "positive" | "neutral" | "negative") {
  if (tone === "positive") {
    return styles.formPositive;
  }

  if (tone === "negative") {
    return styles.formNegative;
  }

  return styles.formNeutral;
}

function stopCardClick(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function PlayerCardComponent({
  row,
  mark,
  analysisLabel,
  compact = false,
  onTogglePlayerMark,
  onOpenDetails,
  onComparePlayer,
}: PlayerCardProps) {
  const summary = buildPlayerCardSummary(row);
  const isSelected = mark === "selected";
  const isRejected = mark === "rejected";
  const scoreTone = getScoreTone(summary.analysisScoreLabel);

  function openDetails() {
    onOpenDetails(summary.key);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openDetails();
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={handleCardKeyDown}
      style={{
        ...styles.card,
        ...(compact ? styles.cardCompact : {}),
        ...(isSelected ? styles.cardSelected : {}),
        ...(isRejected ? styles.cardRejected : {}),
      }}
      aria-label={`Otwórz szczegóły zawodnika ${summary.name}`}
    >
      <div
        style={{
          ...styles.analysisPill,
          ...(compact ? styles.analysisPillCompact : {}),
        }}
        title={analysisLabel}
      >
        <span style={styles.analysisPillLabel}>Analiza</span>
        <span style={styles.analysisPillValue}>{analysisLabel}</span>
      </div>

      <header style={styles.header}>
        <div style={styles.titleBlock}>
          <button
            type="button"
            style={{
              ...styles.nameButton,
              ...(compact ? styles.nameButtonCompact : {}),
            }}
            onClick={(event) => {
              stopCardClick(event);
              openDetails();
            }}
            title={`Otwórz szczegóły: ${summary.name}`}
          >
            {summary.name}
          </button>

          <div
            style={{
              ...styles.meta,
              ...(compact ? styles.metaCompact : {}),
            }}
          >
            {summary.position} · {summary.club}
            {summary.age !== "-" ? ` · ${summary.age} lat` : ""}
          </div>
        </div>

        <div
          style={{
            ...styles.scoreBadge,
            ...getScoreBadgeStyle(scoreTone),
            ...(compact ? styles.scoreBadgeCompact : {}),
          }}
        >
          <span style={styles.scoreLabel}>Dopas.</span>
          <strong
            style={{
              ...styles.scoreValue,
              ...getScoreValueStyle(scoreTone),
              ...(compact ? styles.scoreValueCompact : {}),
            }}
          >
            {summary.analysisScoreLabel}
          </strong>
        </div>
      </header>

      <div
        style={{
          ...styles.body,
          ...(compact ? styles.bodyCompact : {}),
        }}
      >
        <div>
          <div
            style={{
              ...styles.roleName,
              ...(compact ? styles.roleNameCompact : {}),
            }}
          >
            {summary.analysisRoleName}
          </div>

          <div
            style={{
              ...styles.roleMeta,
              ...(compact ? styles.roleMetaCompact : {}),
            }}
          >
            {summary.analysisPhaseLabel} · {summary.candidateKindLabel}
          </div>
        </div>

        <div
          style={{
            ...styles.row,
            ...(compact ? styles.rowCompact : {}),
          }}
        >
          <span style={styles.rowLabel}>Forma</span>
          <strong style={getFormToneStyle(summary.clubFormTone)}>
            {summary.clubFormLabel}
          </strong>
        </div>

        {!compact && (
          <div style={styles.row}>
            <span style={styles.rowLabel}>Noga</span>
            <span>{summary.footLabel}</span>
          </div>
        )}

        <div
          style={{
            ...styles.moneyball,
            ...(compact ? styles.moneyballCompact : {}),
          }}
          title={summary.moneyballSummary}
        >
          {summary.moneyballSummary}
        </div>
      </div>

      <footer
        style={{
          ...styles.actions,
          ...(compact ? styles.actionsCompact : {}),
        }}
        onClick={stopCardClick}
      >
        <div style={styles.actionsLeft}>
          <CallUpButton
            isSelected={isSelected}
            onClick={() => onTogglePlayerMark(row, "selected")}
            size="compact"
          />

          <AppButton
            type="button"
            variant={isRejected ? "danger" : "neutral"}
            size="compact"
            onClick={() => onTogglePlayerMark(row, "rejected")}
            aria-pressed={isRejected}
            title={isRejected ? "Cofnij odrzucenie" : "Odrzuć zawodnika"}
          >
            {isRejected ? "Cofnij" : "Odrzuć"}
          </AppButton>
        </div>

<AppButton
  type="button"
  variant="secondary"
  size="compact"
  onClick={() => onComparePlayer(summary.key)}
>
  Porównaj
</AppButton>

<AppButton
  type="button"
  variant="secondary"
  size="compact"
  onClick={openDetails}
>
  Szczegóły
</AppButton>
      </footer>
    </article>
    
  );
  
}
export const PlayerCard = memo(PlayerCardComponent);