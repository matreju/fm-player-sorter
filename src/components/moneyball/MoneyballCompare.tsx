import type { CSSProperties } from "react";
import type { TableRow } from "../../types/table";
import { moneyballCompareStyles as styles } from "./MoneyballCompare.styles";
import {
  getMinutesReliability,
  getMoneyballTableSummary,
  getNumberFromColumns,
} from "../../utils/moneyball";
import { MONEYBALL_COMPARE_METRIC_GROUPS } from "./MoneyballCompare.config";
import {
  areComparablePlayerTypes,
  isGoalkeeper,
} from "../../utils/playerPositionType";

type MoneyballCompareProps = {
  leftPlayer: TableRow;
  rightPlayer: TableRow;
  rows?: TableRow[];
};

type CompareMetricDefinition = {
  label: string;
  columns?: string[];
  getValue?: (row: TableRow) => number | null;
  higherBetter?: boolean;
};

type CompareMetricGroup = {
  title: string;
  metrics: CompareMetricDefinition[];
};

function getPlayerName(row: TableRow): string {
  return row["Nazwisko"] || "-";
}

function getRawFromColumns(row: TableRow, columns: string[] = []): string {
  for (const column of columns) {
    const value = row[column];

    if (value && value.trim()) {
      return value;
    }
  }

  return "-";
}

function formatComputedValue(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }

  return value.toLocaleString("pl-PL", {
    maximumFractionDigits: 2,
  });
}

function getSavesPer90(row: TableRow): number | null {
  const saves = getNumberFromColumns(row, ["Obs"]);
  const minutes = getNumberFromColumns(row, ["Minuty", "Min"]);

  if (saves === null || minutes === null || minutes <= 0) {
    return null;
  }

  return (saves * 90) / minutes;
}

function getMetricResult(row: TableRow, metric: CompareMetricDefinition) {
  if (metric.getValue) {
    const value = metric.getValue(row);

    return {
      value,
      raw: formatComputedValue(value),
    };
  }

  return {
    value: getNumberFromColumns(row, metric.columns ?? []),
    raw: getRawFromColumns(row, metric.columns ?? []),
  };
}

function getWinner(
  leftValue: number | null,
  rightValue: number | null,
  higherBetter = true
): "left" | "right" | "draw" | "none" {
  if (leftValue === null || rightValue === null) {
    return "none";
  }

  if (Math.abs(leftValue - rightValue) < 0.01) {
    return "draw";
  }

  if (higherBetter) {
    return leftValue > rightValue ? "left" : "right";
  }

  return leftValue < rightValue ? "left" : "right";
}

function getValueStyle(
  winner: "left" | "right" | "draw" | "none",
  side: "left" | "right"
): CSSProperties {
  if (winner === side) {
    return {
      color: "#63ff6b",
      fontWeight: 950,
    };
  }

  if (winner === "draw") {
    return {
      color: "#ffd84a",
      fontWeight: 900,
    };
  }

  return {
    color: "#dbe4f0",
    fontWeight: 800,
  };
}

function getReliabilityBadgeStyle(level: string): CSSProperties {
  if (level === "strong" || level === "good") {
    return {
      color: "#63ff6b",
      borderColor: "rgba(99, 255, 107, 0.35)",
      background: "rgba(99, 255, 107, 0.09)",
    };
  }

  if (level === "medium") {
    return {
      color: "#ffd84a",
      borderColor: "rgba(255, 216, 74, 0.35)",
      background: "rgba(255, 216, 74, 0.09)",
    };
  }

  return {
    color: "#fb7185",
    borderColor: "rgba(251, 113, 133, 0.35)",
    background: "rgba(251, 113, 133, 0.09)",
  };
}

function getGoalkeeperTableSummary(row: TableRow): string {
  const savePercent = getRawFromColumns(row, ["OS %"]);
  const expectedSavePercent = getRawFromColumns(row, ["xOS %"]);
  const preventedGoals = getRawFromColumns(row, ["xGUn"]);
  const preventedPer90 = getRawFromColumns(row, ["ZxG/90"]);

  return [
    savePercent !== "-" ? `OS ${savePercent}` : null,
    expectedSavePercent !== "-" ? `xOS ${expectedSavePercent}` : null,
    preventedGoals !== "-" ? `xGUn ${preventedGoals}` : null,
    preventedPer90 !== "-" ? `ZxG/90 ${preventedPer90}` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "Brak statystyk bramkarskich";
}

const GOALKEEPER_METRIC_GROUPS: CompareMetricGroup[] = [
  {
    title: "Bronienie strzałów",
    metrics: [
      { label: "OS %", columns: ["OS %"] },
      { label: "xOS %", columns: ["xOS %"] },
      { label: "Obronione", columns: ["Obs"] },
      { label: "Obronione/90", getValue: getSavesPer90 },
    ],
  },
  {
    title: "Oczekiwane gole",
    metrics: [
      { label: "xG uniknięte", columns: ["xGUn"] },
      { label: "ZxG/90", columns: ["ZxG/90"] },
    ],
  },
  {
    title: "Zachowanie przy strzałach",
    metrics: [
      { label: "Złapane", columns: ["Złapane strzały", "Złapane", "ZłS"] },
      { label: "Sparowane", columns: ["Sps"] },
      { label: "Sparowane na róg", columns: ["Ssr"], higherBetter: false },
    ],
  },
  {
    title: "Dystrybucja",
    metrics: [
      { label: "Podania %", columns: ["Pod %"] },
      { label: "Podania/90", columns: ["Pod/90"] },
      { label: "Straty/90", columns: ["Str Płk/90"], higherBetter: false },
    ],
  },
];

const warningBoxStyle: CSSProperties = {
  padding: 12,
  border: "1px solid rgba(251, 113, 133, 0.45)",
  borderRadius: 10,
  background: "rgba(251, 113, 133, 0.08)",
  color: "#fecdd3",
  fontSize: 13,
  fontWeight: 800,
};

export function MoneyballCompare({
  leftPlayer,
  rightPlayer,
  rows = [],
}: MoneyballCompareProps) {
  const leftReliability = getMinutesReliability(leftPlayer, rows);
  const rightReliability = getMinutesReliability(rightPlayer, rows);

  const samePlayerType = areComparablePlayerTypes(leftPlayer, rightPlayer);
  const goalkeeperCompare = isGoalkeeper(leftPlayer) && isGoalkeeper(rightPlayer);

  const metricGroups: CompareMetricGroup[] = goalkeeperCompare
    ? GOALKEEPER_METRIC_GROUPS
    : (MONEYBALL_COMPARE_METRIC_GROUPS as unknown as CompareMetricGroup[]);

  if (!samePlayerType) {
    return (
      <section style={styles.wrapper}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>Moneyball H2H</h3>
            <div style={styles.subtitle}>
              Nie można porównać bramkarza z zawodnikiem z pola.
            </div>
          </div>
        </div>

        <div style={warningBoxStyle}>
          Wybierz dwóch bramkarzy albo dwóch zawodników z pola. Moneyball dla
          bramkarzy korzysta z innych statystyk niż Moneyball zawodników z pola.
        </div>
      </section>
    );
  }

  return (
    <section style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Moneyball H2H</h3>
          <div style={styles.subtitle}>
            {goalkeeperCompare
              ? "Porównanie bramkarskich statystyk klubowych"
              : "Porównanie produkcji klubowej i ryzyka statystycznego"}
          </div>
        </div>

        <div style={styles.reliabilityRow}>
          <span
            style={{
              ...styles.reliabilityBadge,
              ...getReliabilityBadgeStyle(leftReliability.level),
            }}
          >
            {getPlayerName(leftPlayer)}: {leftReliability.label}
            {leftReliability.minutes !== null ? ` · ${leftReliability.minutes} min` : ""}
          </span>

          <span
            style={{
              ...styles.reliabilityBadge,
              ...getReliabilityBadgeStyle(rightReliability.level),
            }}
          >
            {getPlayerName(rightPlayer)}: {rightReliability.label}
            {rightReliability.minutes !== null ? ` · ${rightReliability.minutes} min` : ""}
          </span>
        </div>
      </div>

      <div style={styles.summaryRow}>
        <div style={styles.summaryBox}>
          <strong>{getPlayerName(leftPlayer)}</strong>
          <span>
            {goalkeeperCompare
              ? getGoalkeeperTableSummary(leftPlayer)
              : getMoneyballTableSummary(leftPlayer, rows)}
          </span>
        </div>

        <div style={styles.summaryBox}>
          <strong>{getPlayerName(rightPlayer)}</strong>
          <span>
            {goalkeeperCompare
              ? getGoalkeeperTableSummary(rightPlayer)
              : getMoneyballTableSummary(rightPlayer, rows)}
          </span>
        </div>
      </div>

      <div style={styles.groupsGrid}>
        {metricGroups.map((group) => (
          <div key={group.title} style={styles.groupCard}>
            <h4 style={styles.groupTitle}>{group.title}</h4>

            <div style={styles.metricRows}>
              {group.metrics.map((metric) => {
                const left = getMetricResult(leftPlayer, metric);
                const right = getMetricResult(rightPlayer, metric);
                const winner = getWinner(
                  left.value,
                  right.value,
                  metric.higherBetter ?? true
                );

                return (
                  <div key={metric.label} style={styles.metricRow}>
                    <div style={styles.metricLabel}>{metric.label}</div>

                    <div
                      style={{
                        ...styles.metricValue,
                        ...getValueStyle(winner, "left"),
                      }}
                    >
                      {left.raw}
                    </div>

                    <div style={styles.metricVs}>
                      {winner === "left"
                        ? "←"
                        : winner === "right"
                        ? "→"
                        : winner === "draw"
                        ? "="
                        : "–"}
                    </div>

                    <div
                      style={{
                        ...styles.metricValue,
                        ...getValueStyle(winner, "right"),
                      }}
                    >
                      {right.raw}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
