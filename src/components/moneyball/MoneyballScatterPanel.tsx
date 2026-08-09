import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { TableRow } from "../../types/table";
import { AppButton, AppSelectField } from "../ui";
import { moneyballScatterPanelStyles as styles } from "./MoneyballScatterPanel.styles";
import { getNumberFromColumns } from "../../utils/moneyball";
import {
  CHART_PRESETS,
  COMPARISON_FILTERS,
  GOALKEEPER_CHART_PRESETS,
  GOALKEEPER_COMPARISON_FILTERS,
  MAX_HIGHLIGHTED_PLAYERS,
  getHighlightColor,
  isGoalkeeperRow,
  normalizePositionText,
  type ChartPreset,
  type ComparisonFilter,
  type MetricDefinition,
  type QuadrantLabel,
  type QuadrantTone,
} from "./MoneyballScatterPanel.config";
import { MoneyballScatterChart } from "./MoneyballScatterChart";

type MoneyballScatterPanelProps = {
  player: TableRow;
  rows: TableRow[];
  analysisPositionGroup?: string;
};


export type ChartPoint = {
  id: string;
  playerKey: string;
  name: string;
  club: string;
  league: string;
  x: number;
  y: number;
  rawX: number;
  rawY: number;
  isSelected: boolean;
  highlightIndex: number | null;
};





function getMetricValue(row: TableRow, metric: MetricDefinition): number | null {
  if (metric.getValue) {
    return metric.getValue(row);
  }

  return getNumberFromColumns(row, metric.columns ?? []);
}

function getPlayerName(row: TableRow): string {
  return row["Nazwisko"] || "-";
}
function getPlayerDisplayLabel(row: TableRow): string {
  return `${getPlayerName(row)} · ${row["Pozycja"] || "-"} · ${
    row["Klub"] || "-"
  }`;
}

function getPlayerPositionSortRank(row: TableRow): number {
  const position = normalizePositionText(row["Pozycja"]);

  if (isGoalkeeperRow(row)) return 0;

  if (/O\s*\([^)]*[SŚ]/i.test(position) || position.includes("STOPER")) {
    return 10;
  }

  if (/O\s*\([^)]*L/i.test(position)) return 20;
  if (/O\s*\([^)]*P/i.test(position)) return 21;

  if (/WO\s*\([^)]*L/i.test(position)) return 25;
  if (/WO\s*\([^)]*P/i.test(position)) return 26;

  if (/\bDP\b/i.test(position)) return 30;

  if (/P\s*\([^)]*[SŚ]/i.test(position)) return 40;

  if (/OP\s*\([^)]*[SŚ]/i.test(position)) return 50;

  if (/OP\s*\([^)]*L/i.test(position) || /P\s*\([^)]*L/i.test(position)) {
    return 60;
  }

  if (/OP\s*\([^)]*P/i.test(position) || /P\s*\([^)]*P/i.test(position)) {
    return 61;
  }

  if (/\bN\s*\(/i.test(position) || position.includes("NAPAST")) {
    return 70;
  }

  return 999;
}

function getPositionText(row: TableRow): string {
  return (row["Pozycja"] || "").toLowerCase();
}

function getPlayerKey(row: TableRow): string {
  return [
    row["Nazwisko"] ?? "",
    row["Klub"] ?? "",
    row["Wiek"] ?? "",
    row["Pozycja"] ?? "",
  ].join("|");
}

function isSamePlayer(left: TableRow, right: TableRow): boolean {
  return getPlayerKey(left) === getPlayerKey(right);
}

function hasStriker(row: TableRow): boolean {
  const position = getPositionText(row);

  return /(^|[\s,/])n\s*\(/i.test(position) || position.includes("napast");
}

function hasAttackingMidfielder(row: TableRow): boolean {
  const position = getPositionText(row);

  return position.includes("op") || position.includes("ofensywn");
}

function hasWinger(row: TableRow): boolean {
  const position = getPositionText(row);

  return (
    /op\s*\([^)]*[pl]/i.test(position) ||
    /p\s*\([^)]*[pl]/i.test(position) ||
    position.includes("skrzyd")
  );
}

function hasMidfielder(row: TableRow): boolean {
  const position = getPositionText(row);

  return (
    position.includes("dp") ||
    /(^|[\s,/])p\s*\(/i.test(position) ||
    position.includes("op") ||
    position.includes("pomoc")
  );
}

function hasDefensiveMidfielder(row: TableRow): boolean {
  const position = getPositionText(row);

  return position.includes("dp") || position.includes("defensywn");
}

function hasDefender(row: TableRow): boolean {
  const position = getPositionText(row);

  return (
    /(^|[\s,/])o\s*\(/i.test(position) ||
    position.includes("wo") ||
    position.includes("obro")
  );
}

function hasCentreBack(row: TableRow): boolean {
  const position = getPositionText(row);

  return (
    /o\s*\([^)]*ś/i.test(position) ||
    /o\s*\([^)]*s/i.test(position) ||
    position.includes("środkowy obrońca") ||
    position.includes("srodkowy obronca") ||
    position.includes("stoper")
  );
}

function hasWideDefender(row: TableRow): boolean {
  const position = getPositionText(row);

  return (
    /wo\s*\(/i.test(position) ||
    /o\s*\([^)]*[pl]/i.test(position) ||
    position.includes("wahad") ||
    position.includes("boczny")
  );
}

function getAutoFilterFromAnalysisPosition(
  analysisPositionGroup: string | undefined
): ComparisonFilter {
  const value = (analysisPositionGroup || "").toLowerCase();
    if (value.includes("bramkarz") || value === "br") {
    return "goalkeepers";
  }

  if (!value || value === "any" || value.includes("wszyscy")) {
    return "all";
  }

  if (value.includes("napast")) {
    return "strikers";
  }

  if (value.includes("skrzyd")) {
    return "wingers";
  }

  if (value.includes("wahad") || value.includes("boczny")) {
    return "wide-defenders";
  }

  if (
    value.includes("środkowy obrońca") ||
    value.includes("srodkowy obronca") ||
    value.includes("stoper")
  ) {
    return "centre-backs";
  }

  if (value.includes("defensywn")) {
    return "defensive-midfielders";
  }

  if (value.includes("pomoc")) {
    return "midfielders";
  }

  return "all";
}

function matchesComparisonFilter(
  row: TableRow,
  filter: ComparisonFilter
): boolean {
  if (filter === "goalkeepers") {
    return isGoalkeeperRow(row);
  }

  if (filter === "all" || filter === "auto") {
    return !isGoalkeeperRow(row);
  }

  if (filter === "strikers") {
    return hasStriker(row);
  }

  if (filter === "attackers") {
    return hasStriker(row) || hasAttackingMidfielder(row) || hasWinger(row);
  }

  if (filter === "wingers") {
    return hasWinger(row);
  }

  if (filter === "midfielders") {
    return hasMidfielder(row);
  }

  if (filter === "defensive-midfielders") {
    return hasDefensiveMidfielder(row);
  }

  if (filter === "defenders") {
    return hasDefender(row);
  }

  if (filter === "centre-backs") {
    return hasCentreBack(row);
  }

  if (filter === "wide-defenders") {
    return hasWideDefender(row);
  }

  return true;
}


function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getDomain(values: number[]): [number, number] {
  if (values.length === 0) {
    return [0, 1];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.max(1, Math.abs(max), Math.abs(min));
  const padding = range * 0.14;

  const minDomain = Math.max(0, min - padding);
  const maxDomain = max + padding;

  return [
    Number(minDomain.toFixed(3)),
    Number(maxDomain.toFixed(3)),
  ];
}

function stableJitter(seed: string): number {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }

  return hash / 100000 - 0.5;
}
function buildRawPoint(
  row: TableRow,
  index: number,
  preset: ChartPreset,
  highlightIndexByKey: Map<string, number>
): ChartPoint | null {
  const rawX = getMetricValue(row, preset.xMetric);
  const rawY = getMetricValue(row, preset.yMetric);

  if (rawX === null || rawY === null) {
    return null;
  }

  const playerKey = getPlayerKey(row);
  const highlightIndex = highlightIndexByKey.get(playerKey) ?? null;

  return {
    id: `${playerKey}-${index}`,
    playerKey,
    name: getPlayerName(row),
    club: row["Klub"] || "-",
    league: row["Liga"] || "-",
    x: rawX,
    y: rawY,
    rawX,
    rawY,
    isSelected: highlightIndex === 0,
    highlightIndex,
  };
}

function applyVisualJitter(
  points: ChartPoint[],
  xDomain: [number, number],
  yDomain: [number, number]
): ChartPoint[] {
  const xRange = Math.max(0.01, xDomain[1] - xDomain[0]);
  const yRange = Math.max(0.01, yDomain[1] - yDomain[0]);

  return points.map((point) => {
if (point.highlightIndex !== null) {
  return point;
}

    return {
      ...point,
      x: Math.max(0, point.rawX + stableJitter(`${point.id}-x`) * xRange * 0.018),
      y: Math.max(0, point.rawY + stableJitter(`${point.id}-y`) * yRange * 0.018),
    };
  });
}



function getQuadrantToneStyle(tone: QuadrantTone): CSSProperties {
  if (tone === "good") {
    return {
      color: "#22c55e",
    };
  }

  if (tone === "warning") {
    return {
      color: "#facc15",
    };
  }

  return {
    color: "#ef4444",
  };
}

function renderQuadrantLabel(label: QuadrantLabel) {
  return label.text.split("\n").map((line) => (
    <span key={line}>
      {line}
      <br />
    </span>
  ));
}

export function MoneyballScatterPanel({
  player,
  rows,
  analysisPositionGroup = "any",
}: MoneyballScatterPanelProps) {
  const goalkeeperMode = isGoalkeeperRow(player);

  const activeChartPresets = goalkeeperMode
    ? GOALKEEPER_CHART_PRESETS
    : CHART_PRESETS;

  const activeComparisonFilters = goalkeeperMode
    ? GOALKEEPER_COMPARISON_FILTERS
    : COMPARISON_FILTERS;

  const [selectedPresetId, setSelectedPresetId] = useState(
    activeChartPresets[0].id
  );
  const [comparisonFilter, setComparisonFilter] =
    useState<ComparisonFilter>("auto");
  const [extraHighlightedPlayerKeys, setExtraHighlightedPlayerKeys] = useState<
    string[]
  >([]);
  const [playerToAddKey, setPlayerToAddKey] = useState("");
  useEffect(() => {
  const presetExists = activeChartPresets.some(
    (preset) => preset.id === selectedPresetId
  );

  if (!presetExists) {
    setSelectedPresetId(activeChartPresets[0]?.id ?? "");
  }

  const filterExists = activeComparisonFilters.some(
    (filter) => filter.id === comparisonFilter
  );

  if (!filterExists) {
    setComparisonFilter("auto");
  }

  setExtraHighlightedPlayerKeys([]);
  setPlayerToAddKey("");
}, [goalkeeperMode]);

  const selectedPreset =
    activeChartPresets.find((preset) => preset.id === selectedPresetId) ??
    activeChartPresets[0];

  const resolvedComparisonFilter =
    goalkeeperMode
      ? "goalkeepers"
      : comparisonFilter === "auto"
        ? getAutoFilterFromAnalysisPosition(analysisPositionGroup)
        : comparisonFilter;

  const highlightedPlayerRows = useMemo(() => {
    const rowByKey = new Map(rows.map((row) => [getPlayerKey(row), row]));

    return [
      player,
      ...extraHighlightedPlayerKeys
        .map((key) => rowByKey.get(key))
        .filter((row): row is TableRow => row !== undefined),
    ].slice(0, MAX_HIGHLIGHTED_PLAYERS);
  }, [player, rows, extraHighlightedPlayerKeys]);

  const highlightIndexByKey = useMemo(() => {
    const result = new Map<string, number>();

    highlightedPlayerRows.forEach((row, index) => {
      result.set(getPlayerKey(row), index);
    });

    return result;
  }, [highlightedPlayerRows]);

 const playerHighlightOptions = useMemo(() => {
  return rows
    .filter((row) => !isSamePlayer(row, player))
    .filter((row) => isGoalkeeperRow(row) === goalkeeperMode)
    .filter((row) => !extraHighlightedPlayerKeys.includes(getPlayerKey(row)))
    .map((row) => ({
      key: getPlayerKey(row),
      label: getPlayerDisplayLabel(row),
      positionRank: getPlayerPositionSortRank(row),
      name: getPlayerName(row),
    }))
    .sort((left, right) => {
      if (left.positionRank !== right.positionRank) {
        return left.positionRank - right.positionRank;
      }

      return left.name.localeCompare(right.name, "pl");
    });
}, [rows, player, goalkeeperMode, extraHighlightedPlayerKeys]);

function addHighlightedPlayer(key: string) {
  if (!key) {
    return;
  }

  setExtraHighlightedPlayerKeys((current) => {
    if (current.includes(key)) {
      return current;
    }

    if (current.length >= MAX_HIGHLIGHTED_PLAYERS - 1) {
      return current;
    }

    return [...current, key];
  });

  setPlayerToAddKey("");
}

function removeHighlightedPlayer(key: string) {
  setExtraHighlightedPlayerKeys((current) =>
    current.filter((item) => item !== key)
  );
}

const chartData = useMemo(() => {
  const filteredRows = rows.filter((row) => {
    const sameType = isGoalkeeperRow(row) === goalkeeperMode;

    if (!sameType) {
      return false;
    }

    return (
      matchesComparisonFilter(row, resolvedComparisonFilter) ||
      highlightIndexByKey.has(getPlayerKey(row))
    );
  });

  const rawPointsFromRows = filteredRows
    .map((row, index) =>
      buildRawPoint(row, index, selectedPreset, highlightIndexByKey)
    )
    .filter((point): point is ChartPoint => point !== null);

  const missingHighlightedPoints = highlightedPlayerRows
    .filter(
      (row) =>
        !rawPointsFromRows.some(
          (point) => point.playerKey === getPlayerKey(row)
        )
    )
    .map((row, index) =>
      buildRawPoint(row, -1 - index, selectedPreset, highlightIndexByKey)
    )
    .filter((point): point is ChartPoint => point !== null);

  const rawPoints = [...rawPointsFromRows, ...missingHighlightedPoints];

  const otherRawPoints = rawPoints.filter(
    (point) => point.highlightIndex === null
  );
  const highlightedRawPoints = rawPoints
    .filter((point) => point.highlightIndex !== null)
    .sort((left, right) => {
      return (left.highlightIndex ?? 99) - (right.highlightIndex ?? 99);
    });

  const rawVisiblePoints = [...otherRawPoints, ...highlightedRawPoints];

  const rawXDomain = getDomain(rawVisiblePoints.map((point) => point.rawX));
  const rawYDomain = getDomain(rawVisiblePoints.map((point) => point.rawY));

  const visiblePoints = applyVisualJitter(
    rawVisiblePoints,
    rawXDomain,
    rawYDomain
  );

  const otherPoints = visiblePoints.filter(
    (point) => point.highlightIndex === null
  );

  const highlightedPoints = visiblePoints
    .filter((point) => point.highlightIndex !== null)
    .sort((left, right) => {
      return (left.highlightIndex ?? 99) - (right.highlightIndex ?? 99);
    });

  return {
    points: visiblePoints,
    otherPoints,
    highlightedPoints,
    averageX: average(rawVisiblePoints.map((point) => point.rawX)),
    averageY: average(rawVisiblePoints.map((point) => point.rawY)),
    xDomain: getDomain(visiblePoints.map((point) => point.x)),
    yDomain: getDomain(visiblePoints.map((point) => point.y)),
    filteredCount: visiblePoints.length,
  };
}, [
  player,
  rows,
  selectedPreset,
  resolvedComparisonFilter,
  highlightIndexByKey,
  highlightedPlayerRows,
]);

const hasHighlightedPoints = chartData.highlightedPoints.length > 0;
  const hasAnyPoints = chartData.points.length > 0;

  return (
    <section style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Mapa Moneyball</h3>
<div style={styles.subtitle}>
  {goalkeeperMode
    ? "Bramkarz na tle bramkarzy z kadry"
    : "Zawodnik na tle wybranej grupy z kadry"}
</div>
        </div>

        <div style={styles.controls}>
<AppSelectField
  label="Porównaj na tle"
  value={comparisonFilter}
  options={activeComparisonFilters.map((filter) => ({
    value: filter.id,
    label: filter.label,
  }))}
  onChange={(value) => setComparisonFilter(value as ComparisonFilter)}
  fieldStyle={styles.controlField}
  selectStyle={styles.select}
/>

<AppSelectField
  label="Wykres"
  value={selectedPresetId}
  options={activeChartPresets.map((preset) => ({
    value: preset.id,
    label: preset.title,
  }))}
  onChange={setSelectedPresetId}
  fieldStyle={styles.controlField}
  selectStyle={styles.select}
/>
<AppSelectField
  label="Dodaj zawodnika"
  value={playerToAddKey}
  options={[
    {
      value: "",
      label:
        extraHighlightedPlayerKeys.length >= MAX_HIGHLIGHTED_PLAYERS - 1
          ? "Limit zawodników"
          : "Wybierz zawodnika",
    },
    ...playerHighlightOptions.map((option) => ({
      value: option.key,
      label: option.label,
    })),
  ]}
  onChange={addHighlightedPlayer}
  disabled={extraHighlightedPlayerKeys.length >= MAX_HIGHLIGHTED_PLAYERS - 1}
  fieldStyle={styles.controlField}
  selectStyle={styles.select}
/>
        </div>
      </div>

      <div style={styles.chartHeader}>
        <div>
          <strong>{selectedPreset.title}</strong>
          <div style={styles.chartDescription}>
            {selectedPreset.description}
          </div>
        </div>

        <div style={styles.legend}>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: "#64748b" }} />
            Grupa: {chartData.filteredCount}
          </span>

{chartData.highlightedPoints.map((point) => (
  <span key={point.id} style={styles.legendItem}>
    <span
      style={{
        ...styles.legendDot,
        background: getHighlightColor(point.highlightIndex ?? 0),
      }}
    />
    {point.name}
  </span>
))}
        </div>
      </div>
{extraHighlightedPlayerKeys.length > 0 && (
  <div style={styles.highlightChips}>
    {chartData.highlightedPoints.map((point) => {
      if (point.highlightIndex === 0) {
        return null;
      }

      return (
<AppButton
  key={point.playerKey}
  type="button"
  variant="neutral"
  size="pill"
  onClick={() => removeHighlightedPlayer(point.playerKey)}
  style={{
    ...styles.highlightChip,
    borderColor: getHighlightColor(point.highlightIndex ?? 0),
    color: getHighlightColor(point.highlightIndex ?? 0),
  }}
  aria-label={`Usuń zawodnika ${point.name} z wyróżnionych na wykresie`}
>
  {point.name} ×
</AppButton>
      );
    })}
  </div>
)}

      {!hasAnyPoints && (
        <div style={styles.empty}>
          Brak wystarczających danych do narysowania tego wykresu.
        </div>
      )}

      {hasAnyPoints && (
  <div style={styles.chartBox}>
    <div
      style={{
        ...styles.quadrantLabel,
        ...styles.quadrantTopLeft,
        ...getQuadrantToneStyle(selectedPreset.quadrants.topLeft.tone),
      }}
    >
      {renderQuadrantLabel(selectedPreset.quadrants.topLeft)}
    </div>

    <div
      style={{
        ...styles.quadrantLabel,
        ...styles.quadrantTopRight,
        ...getQuadrantToneStyle(selectedPreset.quadrants.topRight.tone),
      }}
    >
      {renderQuadrantLabel(selectedPreset.quadrants.topRight)}
    </div>

    <div
      style={{
        ...styles.quadrantLabel,
        ...styles.quadrantBottomLeft,
        ...getQuadrantToneStyle(selectedPreset.quadrants.bottomLeft.tone),
      }}
    >
      {renderQuadrantLabel(selectedPreset.quadrants.bottomLeft)}
    </div>

    <div
      style={{
        ...styles.quadrantLabel,
        ...styles.quadrantBottomRight,
        ...getQuadrantToneStyle(selectedPreset.quadrants.bottomRight.tone),
      }}
    >
      {renderQuadrantLabel(selectedPreset.quadrants.bottomRight)}
    </div>

<MoneyballScatterChart
  chartData={chartData}
  selectedPreset={selectedPreset}
  hasAnyPoints={hasAnyPoints}
  hasHighlightedPoints={hasHighlightedPoints}
/>
  </div>
)}
    </section>
  );
}
