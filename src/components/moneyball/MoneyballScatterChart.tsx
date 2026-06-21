import {
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "./MoneyballScatterPanel";
import type { ChartPreset } from "./MoneyballScatterPanel.config";
import { getHighlightColor } from "./MoneyballScatterPanel.config";
import { moneyballScatterPanelStyles as styles } from "./MoneyballScatterPanel.styles";

type MoneyballScatterChartProps = {
  chartData: {
    points: ChartPoint[];
    otherPoints: ChartPoint[];
    highlightedPoints: ChartPoint[];
    averageX: number | null;
    averageY: number | null;
    xDomain: [number, number];
    yDomain: [number, number];
    filteredCount: number;
  };
  selectedPreset: ChartPreset;
  hasAnyPoints: boolean;
  hasHighlightedPoints: boolean;
};

function getDotFill(point: ChartPoint) {
  if (point.highlightIndex !== null) {
    return getHighlightColor(point.highlightIndex);
  }

  return point.isSelected ? getHighlightColor(0) : "#64748b";
}

function getDotStroke(point: ChartPoint) {
  if (point.highlightIndex !== null || point.isSelected) {
    return "#ffffff";
  }

  return "#94a3b8";
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload as ChartPoint;

  return (
    <div style={styles.tooltip}>
      <strong>{point.name}</strong>
      <span>{point.club}</span>
      <span>{point.league}</span>
      <span>
        X: <strong>{point.rawX.toFixed(2)}</strong>
      </span>
      <span>
        Y: <strong>{point.rawY.toFixed(2)}</strong>
      </span>
    </div>
  );
}

export function MoneyballScatterChart({
  chartData,
  selectedPreset,
  hasAnyPoints,
  hasHighlightedPoints,
}: MoneyballScatterChartProps) {
  if (!hasAnyPoints) {
    return (
      <div style={styles.emptyChart}>
        Brak danych do narysowania wykresu dla wybranego zestawu.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 16, right: 96, bottom: 28, left: 10 }}>
        <CartesianGrid stroke="#273142" strokeDasharray="3 3" />

        <XAxis
          type="number"
          dataKey="x"
          name={selectedPreset.xLabel}
          stroke="#9ca3af"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
domain={chartData.xDomain}          label={{
            value: selectedPreset.xLabel,
            position: "insideBottom",
            offset: -18,
            fill: "#cbd5e1",
            fontSize: 11,
            fontWeight: 800,
          }}
        />

        <YAxis
          type="number"
          dataKey="y"
          name={selectedPreset.yLabel}
          stroke="#9ca3af"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
domain={chartData.yDomain}
          label={{
            value: selectedPreset.yLabel,
            angle: -90,
            position: "insideLeft",
            fill: "#cbd5e1",
            fontSize: 11,
            fontWeight: 800,
          }}
        />

        {hasAnyPoints && (
          <>
{chartData.averageX !== null && (
  <ReferenceLine
    x={chartData.averageX}
    stroke="#64748b"
    strokeDasharray="4 4"
  />
)}

{chartData.averageY !== null && (
  <ReferenceLine
    y={chartData.averageY}
    stroke="#64748b"
    strokeDasharray="4 4"
  />
)}
          </>
        )}

        <Tooltip content={<CustomTooltip />} />

        <Scatter
          name="Zawodnicy"
          data={chartData.points}
          fill="#64748b"
          shape={(props: any) => {
            const point = props.payload as ChartPoint;

            return (
              <circle
                cx={props.cx}
                cy={props.cy}
                r={point.isSelected ? 6 : 4}
                fill={getDotFill(point)}
                stroke={getDotStroke(point)}
                strokeWidth={point.isSelected ? 3 : 1.5}
                opacity={point.isSelected ? 1 : 0.45}
              />
            );
          }}
        />

        {hasHighlightedPoints && (
          <Scatter
            name="Wyróżnieni"
            data={chartData.highlightedPoints}
            shape={(props: any) => {
              const point = props.payload as ChartPoint;
              const color = getHighlightColor(point.highlightIndex ?? 0);

              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={7}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              );
            }}
          >
            <LabelList
              dataKey="name"
              position="right"
              style={{
                fill: "#e5e7eb",
                fontSize: 11,
                fontWeight: 800,
              }}
            />
          </Scatter>
        )}
      </ScatterChart>
    </ResponsiveContainer>
  );
}