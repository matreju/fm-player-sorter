import { useMemo, useState, type CSSProperties } from "react";
import type { PlayerMark } from "../../constants/selection";
import {
  ROLE_BEST_ROLE_COLUMN,
  ROLE_SCORE_COLUMN,
} from "../../constants/appColumns";
import type { TableRow } from "../../types/table";
import { getPlayerKey } from "../../utils/playerIdentity";
import { PlayerCard } from "./PlayerCard";
import { playerCardStyles as styles } from "./PlayerCard.styles";

type PlayerCardGridProps = {
  rows: TableRow[];
  analysisLabel: string;
  compact?: boolean;
  getPlayerMark: (row: TableRow) => PlayerMark | null;
  onTogglePlayerMark: (row: TableRow, mark: PlayerMark) => void;
  onOpenDetails: (playerKey: string) => void;
};

type CardScoreMetrics = {
  total: number;
  averageScore: string;
  eliteCount: number;
  goodCount: number;
  okayCount: number;
  lowCount: number;
  selectedCount: number;
  rejectedCount: number;
};

type CardQuickFilter =
  | "all"
  | "elite"
  | "good"
  | "okay"
  | "low"
  | "selected";

type PositionDepthFilter =
  | "all"
  | "goalkeeper"
  | "center-back"
  | "wide-back"
  | "defensive-midfielder"
  | "central-midfielder"
  | "attacking-midfielder"
  | "winger"
  | "striker";

type StatCardConfig = {
  id: CardQuickFilter;
  label: string;
  value: number | string;
  hint: string;
  style?: CSSProperties;
};

type PositionDepthCard = {
  id: PositionDepthFilter;
  label: string;
  shortLabel: string;
  rows: TableRow[];
  count: number;
  bestName: string;
  bestScore: number | null;
  topThreeAverage: string;
  selectedCount: number;
};

const POSITION_DEPTH_ORDER: Array<{
  id: Exclude<PositionDepthFilter, "all">;
  label: string;
  shortLabel: string;
}> = [
  {
    id: "striker",
    label: "Napastnicy",
    shortLabel: "N",
  },
  {
    id: "winger",
    label: "Skrzydła",
    shortLabel: "Skrz.",
  },
  {
    id: "attacking-midfielder",
    label: "Ofensywni pomocnicy",
    shortLabel: "OP",
  },
  {
    id: "central-midfielder",
    label: "Środkowi pomocnicy",
    shortLabel: "ŚP",
  },
  {
    id: "defensive-midfielder",
    label: "Defensywni pomocnicy",
    shortLabel: "DP",
  },
  {
    id: "wide-back",
    label: "Boczni obrońcy / wahadła",
    shortLabel: "BO/W",
  },
  {
    id: "center-back",
    label: "Środkowi obrońcy",
    shortLabel: "ŚO",
  },
  {
    id: "goalkeeper",
    label: "Bramkarze",
    shortLabel: "BR",
  },
];

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .toLowerCase();
}

function parseScore(value: unknown): number | null {
  const parsed = Number(String(value ?? "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function getRowScore(row: TableRow): number | null {
  return parseScore(row[ROLE_SCORE_COLUMN]);
}

function getText(row: TableRow, key: string): string {
  return String(row[key] ?? "");
}

function hasPositionCode(position: string, code: string): boolean {
  const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|[,;]\\s*)${escapedCode}`);

  return pattern.test(position);
}

function addBucket(
  buckets: Set<Exclude<PositionDepthFilter, "all">>,
  bucket: Exclude<PositionDepthFilter, "all">
) {
  buckets.add(bucket);
}

function getPositionDepthBuckets(
  row: TableRow
): Array<Exclude<PositionDepthFilter, "all">> {
  const role = normalizeText(row[ROLE_BEST_ROLE_COLUMN]);

  const position = normalizeText(
    [
      row["Pozycja"],
      row["Pozycja pob."],
      row["Pozycje"],
      row["Pozycja naturalna"],
    ].join(", ")
  );

  const buckets = new Set<Exclude<PositionDepthFilter, "all">>();

  if (
    hasPositionCode(position, "br") ||
    role.includes("bramkarz")
  ) {
    return ["goalkeeper"];
  }

  if (
    hasPositionCode(position, "n (s") ||
    hasPositionCode(position, "n (l") ||
    hasPositionCode(position, "n (p") ||
    hasPositionCode(position, "n") ||
    role.includes("lis pola karnego") ||
    role.includes("napastnik")
  ) {
    addBucket(buckets, "striker");
  }

  if (
    hasPositionCode(position, "op (l") ||
    hasPositionCode(position, "op (p") ||
    hasPositionCode(position, "p (l") ||
    hasPositionCode(position, "p (p") ||
    role.includes("skrzydl") ||
    role.includes("boczny napastnik") ||
    role.includes("odwrocony skrzydl")
  ) {
    addBucket(buckets, "winger");
  }

  if (
    hasPositionCode(position, "op (s") ||
    hasPositionCode(position, "op (ls") ||
    hasPositionCode(position, "op (ps") ||
    role.includes("ofensywny pomocnik") ||
    role.includes("wysuniety rozgrywajacy")
  ) {
    addBucket(buckets, "attacking-midfielder");
  }

  if (
    hasPositionCode(position, "dp") ||
    role.includes("defensywny pomocnik") ||
    role.includes("cofniety rozgrywajacy") ||
    role.includes("rygiel defensywny")
  ) {
    addBucket(buckets, "defensive-midfielder");
  }

  if (
    hasPositionCode(position, "p (s") ||
    hasPositionCode(position, "p (ls") ||
    hasPositionCode(position, "p (ps") ||
    role.includes("srodkowy pomocnik") ||
    role.includes("mezzala") ||
    role.includes("carrilero") ||
    role.includes("pomocnik dlugiej pilki")
  ) {
    addBucket(buckets, "central-midfielder");
  }

  if (
    hasPositionCode(position, "o (l") ||
    hasPositionCode(position, "o (p") ||
    hasPositionCode(position, "wo (l") ||
    hasPositionCode(position, "wo (p") ||
    role.includes("boczny obronca") ||
    role.includes("wahadlowy")
  ) {
    addBucket(buckets, "wide-back");
  }

  if (
    hasPositionCode(position, "o (s") ||
    hasPositionCode(position, "so") ||
    role.includes("srodkowy obronca") ||
    role.includes("stoper") ||
    role.includes("asekurujacy") ||
    role.includes("blokujacy")
  ) {
    addBucket(buckets, "center-back");
  }

  if (buckets.size === 0) {
    addBucket(buckets, "central-midfielder");
  }

  return Array.from(buckets);
}

function buildScoreMetrics(
  rows: TableRow[],
  getPlayerMark: (row: TableRow) => PlayerMark | null
): CardScoreMetrics {
  let scoreSum = 0;
  let scoredCount = 0;

  let eliteCount = 0;
  let goodCount = 0;
  let okayCount = 0;
  let lowCount = 0;

  let selectedCount = 0;
  let rejectedCount = 0;

  for (const row of rows) {
    const mark = getPlayerMark(row);

    if (mark === "selected") {
      selectedCount += 1;
    }

    if (mark === "rejected") {
      rejectedCount += 1;
    }

    const score = getRowScore(row);

    if (score === null) {
      continue;
    }

    scoreSum += score;
    scoredCount += 1;

    if (score >= 80) {
      eliteCount += 1;
    } else if (score >= 70) {
      goodCount += 1;
    } else if (score >= 60) {
      okayCount += 1;
    } else {
      lowCount += 1;
    }
  }

  return {
    total: rows.length,
    averageScore: scoredCount > 0 ? (scoreSum / scoredCount).toFixed(1) : "-",
    eliteCount,
    goodCount,
    okayCount,
    lowCount,
    selectedCount,
    rejectedCount,
  };
}

function buildPositionDepthCards(
  rows: TableRow[],
  getPlayerMark: (row: TableRow) => PlayerMark | null
): PositionDepthCard[] {
  const grouped = new Map<Exclude<PositionDepthFilter, "all">, TableRow[]>();

  for (const item of POSITION_DEPTH_ORDER) {
    grouped.set(item.id, []);
  }

for (const row of rows) {
  for (const bucket of getPositionDepthBuckets(row)) {
    grouped.get(bucket)?.push(row);
  }
}

  return POSITION_DEPTH_ORDER.map((item) => {
    const bucketRows = grouped.get(item.id) ?? [];

    const sortedByScore = [...bucketRows].sort((left, right) => {
      const leftScore = getRowScore(left) ?? -1;
      const rightScore = getRowScore(right) ?? -1;

      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return getText(left, "Nazwisko").localeCompare(
        getText(right, "Nazwisko"),
        "pl"
      );
    });

    const topThree = sortedByScore.slice(0, 3);
    const topThreeScores = topThree
      .map(getRowScore)
      .filter((score): score is number => score !== null);

    const topThreeAverage =
      topThreeScores.length > 0
        ? (
            topThreeScores.reduce((sum, score) => sum + score, 0) /
            topThreeScores.length
          ).toFixed(1)
        : "-";

    const bestRow = sortedByScore[0] ?? null;
    const bestScore = bestRow ? getRowScore(bestRow) : null;

    return {
      id: item.id,
      label: item.label,
      shortLabel: item.shortLabel,
      rows: bucketRows,
      count: bucketRows.length,
      bestName: bestRow ? getText(bestRow, "Nazwisko") : "-",
      bestScore,
      topThreeAverage,
      selectedCount: bucketRows.filter((row) => getPlayerMark(row) === "selected")
        .length,
    };
  });
}

function getPercentLabel(value: number, total: number): string {
  if (total <= 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function rowMatchesQuickFilter(
  row: TableRow,
  filter: CardQuickFilter,
  getPlayerMark: (row: TableRow) => PlayerMark | null
): boolean {
  if (filter === "all") {
    return true;
  }

  if (filter === "selected") {
    return getPlayerMark(row) === "selected";
  }

  const score = getRowScore(row);

  if (score === null) {
    return false;
  }

  if (filter === "elite") {
    return score >= 80;
  }

  if (filter === "good") {
    return score >= 70 && score < 80;
  }

  if (filter === "okay") {
    return score >= 60 && score < 70;
  }

  return score < 60;
}

function rowMatchesPositionDepthFilter(
  row: TableRow,
  filter: PositionDepthFilter
): boolean {
  if (filter === "all") {
    return true;
  }

return getPositionDepthBuckets(row).includes(filter);
}

function getQuickFilterLabel(filter: CardQuickFilter): string {
  if (filter === "elite") {
    return "80+";
  }

  if (filter === "good") {
    return "70–79";
  }

  if (filter === "okay") {
    return "60–69";
  }

  if (filter === "low") {
    return "poniżej 60";
  }

  if (filter === "selected") {
    return "powołani";
  }

  return "wszyscy";
}

function getPositionFilterLabel(filter: PositionDepthFilter): string {
  if (filter === "all") {
    return "wszystkie pozycje";
  }

  return (
    POSITION_DEPTH_ORDER.find((item) => item.id === filter)?.label ??
    "wybrana grupa"
  );
}

export function PlayerCardGrid({
  rows,
  analysisLabel,
  compact = false,
  getPlayerMark,
  onTogglePlayerMark,
  onOpenDetails,
}: PlayerCardGridProps) {
  const [quickFilter, setQuickFilter] = useState<CardQuickFilter>("all");
  const [positionDepthFilter, setPositionDepthFilter] =
    useState<PositionDepthFilter>("all");

  const metrics = useMemo(
    () => buildScoreMetrics(rows, getPlayerMark),
    [rows, getPlayerMark]
  );

  const positionDepthCards = useMemo(
    () => buildPositionDepthCards(rows, getPlayerMark),
    [rows, getPlayerMark]
  );

  const visibleRows = useMemo(() => {
    return rows
      .filter((row) => rowMatchesQuickFilter(row, quickFilter, getPlayerMark))
      .filter((row) => rowMatchesPositionDepthFilter(row, positionDepthFilter));
  }, [rows, quickFilter, positionDepthFilter, getPlayerMark]);

  const statCards: StatCardConfig[] = [
    {
      id: "all",
      label: "Pokazani",
      value: metrics.total,
      hint: "aktualny filtr",
    },
    {
      id: "elite",
      label: "80+",
      value: metrics.eliteCount,
      hint: `${getPercentLabel(metrics.eliteCount, metrics.total)} puli`,
      style: styles.statCardElite,
    },
    {
      id: "good",
      label: "70–79",
      value: metrics.goodCount,
      hint: `${getPercentLabel(metrics.goodCount, metrics.total)} puli`,
      style: styles.statCardGood,
    },
    {
      id: "okay",
      label: "60–69",
      value: metrics.okayCount,
      hint: `${getPercentLabel(metrics.okayCount, metrics.total)} puli`,
      style: styles.statCardOkay,
    },
    {
      id: "low",
      label: "Poniżej 60",
      value: metrics.lowCount,
      hint: `${getPercentLabel(metrics.lowCount, metrics.total)} puli`,
      style: styles.statCardLow,
    },
    {
      id: "selected",
      label: "Powołani",
      value: metrics.selectedCount,
      hint: `odrzuceni: ${metrics.rejectedCount}`,
      style: styles.statCardSelected,
    },
  ];

  if (rows.length === 0) {
    return (
      <section style={styles.empty}>
        Brak zawodników do pokazania przy aktualnych filtrach.
      </section>
    );
  }

  return (
    <section style={styles.cardView} aria-label="Kafelkowa lista piłkarzy">
      <div
        style={{
          ...styles.statsBar,
          ...(compact ? styles.statsBarCompact : {}),
        }}
      >
        <button
          type="button"
          style={{
            ...styles.statCard,
            ...styles.statButton,
            ...styles.statCardGood,
            ...(compact ? styles.statCardCompact : {}),
          }}
          title="Średni wynik widocznej puli"
        >
          <span style={styles.statLabel}>Śr. wynik</span>

          <strong
            style={{
              ...styles.statValue,
              ...(compact ? styles.statValueCompact : {}),
            }}
          >
            {metrics.averageScore}
          </strong>

          <span style={styles.statHint}>dla tej analizy</span>
        </button>

        {statCards.map((card) => {
          const isActive = quickFilter === card.id;
          const isDisabled = card.id !== "all" && Number(card.value) === 0;

          return (
            <button
              key={card.id}
              type="button"
              disabled={isDisabled}
              onClick={() => setQuickFilter(card.id)}
              style={{
                ...styles.statCard,
                ...styles.statButton,
                ...(card.style ?? {}),
                ...(compact ? styles.statCardCompact : {}),
                ...(isActive ? styles.statButtonActive : {}),
                ...(isDisabled ? styles.statButtonDisabled : {}),
              }}
              aria-pressed={isActive}
              title={`Pokaż: ${card.label}`}
            >
              <span style={styles.statLabel}>{card.label}</span>

              <strong
                style={{
                  ...styles.statValue,
                  ...(compact ? styles.statValueCompact : {}),
                }}
              >
                {card.value}
              </strong>

              <span
                style={{
                  ...styles.statHint,
                  ...(isActive ? styles.statHintActive : {}),
                }}
              >
                {card.hint}
              </span>
            </button>
          );
        })}
      </div>

      <section
        style={{
          ...styles.positionDepthPanel,
          ...(compact ? styles.positionDepthPanelCompact : {}),
        }}
        aria-label="Głębia pozycji"
      >
        <header style={styles.positionDepthHeader}>
          <strong style={styles.positionDepthTitle}>Głębia pozycji</strong>

          <span style={styles.positionDepthHint}>
            Kliknij grupę, żeby przefiltrować kafelki
          </span>

          {positionDepthFilter !== "all" && (
            <button
              type="button"
              style={styles.positionDepthResetButton}
              onClick={() => setPositionDepthFilter("all")}
            >
              Wszystkie pozycje
            </button>
          )}
        </header>

        <div
          style={{
            ...styles.positionDepthGrid,
            ...(compact ? styles.positionDepthGridCompact : {}),
          }}
        >
          {positionDepthCards.map((card) => {
            const isActive = positionDepthFilter === card.id;
            const isEmpty = card.count === 0;

            return (
              <button
                key={card.id}
                type="button"
                disabled={isEmpty}
                onClick={() => setPositionDepthFilter(card.id)}
                style={{
                  ...styles.positionDepthCard,
                  ...(compact ? styles.positionDepthCardCompact : {}),
                  ...(isActive ? styles.positionDepthCardActive : {}),
                  ...(isEmpty ? styles.positionDepthCardEmpty : {}),
                }}
                aria-pressed={isActive}
                title={`Pokaż grupę: ${card.label}`}
              >
                <div style={styles.positionDepthTop}>
                  <strong style={styles.positionDepthName}>
                    {card.shortLabel} · {card.label}
                  </strong>

                  <span style={styles.positionDepthCount}>{card.count}</span>
                </div>

                <div style={styles.positionDepthBest}>
  Najl. {card.bestName}
  {card.bestScore !== null ? ` · ${card.bestScore.toFixed(1)}` : ""}
</div>

<div style={styles.positionDepthScoreRow}>
  <span>TOP3</span>
  <strong style={styles.positionDepthScore}>
    {card.topThreeAverage}
  </strong>
  <span>Pow.</span>
  <strong>{card.selectedCount}</strong>
</div>
              </button>
            );
          })}
        </div>
      </section>

      {(quickFilter !== "all" || positionDepthFilter !== "all") && (
        <div
          style={{
            ...styles.filteredNotice,
            ...(compact ? styles.filteredNoticeCompact : {}),
          }}
        >
          <span>
            Szybki filtr: <strong>{getQuickFilterLabel(quickFilter)}</strong> ·
            pozycje: <strong>{getPositionFilterLabel(positionDepthFilter)}</strong>{" "}
            · pokazano <strong>{visibleRows.length}</strong> z{" "}
            <strong>{rows.length}</strong>
          </span>

          <button
            type="button"
            style={styles.filteredNoticeButton}
            onClick={() => {
              setQuickFilter("all");
              setPositionDepthFilter("all");
            }}
          >
            Wyczyść filtry
          </button>
        </div>
      )}

      {visibleRows.length === 0 ? (
        <section style={styles.empty}>
          Brak zawodników w wybranym szybkim filtrze.
        </section>
      ) : (
        <section
          style={{
            ...styles.grid,
            ...(compact ? styles.gridCompact : {}),
          }}
          aria-label={`Kafelki zawodników: ${analysisLabel}`}
        >
          {visibleRows.map((row) => (
<PlayerCard
  key={getPlayerKey(row)}
  row={row}
  mark={getPlayerMark(row)}
  analysisLabel={analysisLabel}
  compact={compact}
  onTogglePlayerMark={onTogglePlayerMark}
  onOpenDetails={onOpenDetails}
/>
          ))}
        </section>
      )}
    </section>
  );
}