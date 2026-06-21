import type { CSSProperties } from "react";
import type { TableRow } from "../../types/table";
import { parseAttributeValue } from "../../utils/attributeValue";
import { isGoalkeeper } from "../../utils/playerPositionType";

type RadarAxis = {
  label: string;
  attributes: string[];
};

const OUTFIELD_RADAR_AXES: RadarAxis[] = [
  {
    label: "Obrona",
    attributes: [
      "Krycie",
      "Odbiór piłki",
      "Ustawianie się",
      "Koncentracja",
      "Przewidywanie",
      "Waleczność",
    ],
  },
  {
    label: "Fizyczność",
    attributes: ["Siła", "Równowaga", "Wytrzymałość", "Sprawność"],
  },
  {
    label: "Szybkość",
    attributes: ["Przyspieszenie", "Szybkość", "Zwinność"],
  },
  {
    label: "Wizja",
    attributes: ["Podania", "Przegląd sytuacji", "Decyzje", "Współpraca"],
  },
  {
    label: "Atak",
    attributes: [
      "Wykańczanie akcji",
      "Gra bez piłki",
      "Opanowanie",
      "Strzały z dystansu",
    ],
  },
  {
    label: "Technika",
    attributes: ["Drybling", "Technika", "Przyjęcie piłki", "Dośrodkowania"],
  },
  {
    label: "Powietrze",
    attributes: ["Gra głową", "Skoczność", "Siła"],
  },
  {
    label: "Mental",
    attributes: [
      "Przewidywanie",
      "Decyzje",
      "Koncentracja",
      "Pracowitość",
      "Współpraca",
      "Determinacja",
    ],
  },
];

const GOALKEEPER_RADAR_AXES: RadarAxis[] = [
  {
    label: "Obrona strzałów",
    attributes: ["Chwytanie", "Refleks", "Jeden na jednego"],
  },
  {
    label: "Fizyczne",
    attributes: ["Zasięg wyskoku", "Zwinność", "Skoczność", "Równowaga"],
  },
  {
    label: "Szybkość",
    attributes: ["Przyspieszenie", "Szybkość", "Wychodzenie poza pole karne"],
  },
  {
    label: "Psychiczne",
    attributes: [
      "Koncentracja",
      "Decyzje",
      "Przewidywanie",
      "Ustawianie się",
      "Opanowanie",
    ],
  },
  {
    label: "Komunikacja",
    attributes: ["Komunikacja", "Przywództwo", "Współpraca"],
  },
  {
    label: "Ekscentryczność",
    attributes: ["Ekscentryczność"],
  },
  {
    label: "Górne piłki",
    attributes: [
      "Gra na przedpolu",
      "Zasięg wyskoku",
      "Piąstkowanie",
      "Chwytanie",
    ],
  },
  {
    label: "Wyprowadzenie piłki",
    attributes: ["Podania", "Przyjęcie piłki", "Wykopy", "Wyrzuty", "Decyzje"],
  },
];

type PlayerAttributeRadarProps = {
  player: TableRow;
  title?: string;
  showHeader?: boolean;
  showAxisList?: boolean;
  compact?: boolean;
};

function getAverage(row: TableRow, attributes: string[]): number {
  const values = attributes
    .map((attribute) => parseAttributeValue(row[attribute] ?? ""))
    .filter((value) => value !== null)
    .map((value) => value.average);

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getPoint(
  index: number,
  value: number,
  total: number,
  center: number,
  radius: number
): string {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const normalized = Math.max(0, Math.min(1, value / 20));
  const x = center + Math.cos(angle) * radius * normalized;
  const y = center + Math.sin(angle) * radius * normalized;

  return `${x},${y}`;
}

function getGridPoint(
  index: number,
  level: number,
  total: number,
  center: number,
  radius: number
): string {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const x = center + Math.cos(angle) * radius * level;
  const y = center + Math.sin(angle) * radius * level;

  return `${x},${y}`;
}

function getLabelPosition(
  index: number,
  total: number,
  center: number,
  radius: number
) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const x = center + Math.cos(angle) * (radius + 24);
  const y = center + Math.sin(angle) * (radius + 24);

  return { x, y };
}

function getScoreColor(value: number): string {
  if (value >= 16) return "#63ff6b";
  if (value >= 11) return "#ffd84a";
  if (value >= 6) return "#d8e2f0";
  return "#8b95a7";
}

export function PlayerAttributeRadar({
  player,
  title = "Profil atrybutów",
  showHeader = true,
  showAxisList = true,
  compact = false,
}: PlayerAttributeRadarProps) {
  const goalkeeper = isGoalkeeper(player);
  const axes = goalkeeper ? GOALKEEPER_RADAR_AXES : OUTFIELD_RADAR_AXES;

  const size = compact ? 170 : 220;
  const center = size / 2;
  const radius = compact ? 50 : 66;

  const values = axes.map((axis) => ({
    ...axis,
    value: getAverage(player, axis.attributes),
  }));

  const polygonPoints = values
    .map((axis, index) =>
      getPoint(index, axis.value, values.length, center, radius)
    )
    .join(" ");

  const polygonColor = goalkeeper ? "#22c55e" : "#6eb6ff";
  const polygonFill = goalkeeper
    ? "rgba(34, 197, 94, 0.25)"
    : "rgba(110, 182, 255, 0.28)";

  return (
    <section
      style={{
        ...styles.wrapper,
        ...(compact ? styles.wrapperCompact : {}),
      }}
    >
      {showHeader && (
        <div style={styles.header}>
          <h3 style={styles.title}>
            {title}
            {goalkeeper ? " — BR" : ""}
          </h3>
          <span style={styles.subtitle}>{player["Nazwisko"] ?? "-"}</span>
        </div>
      )}

      <div
        style={{
          ...styles.content,
          ...(compact ? styles.contentCompact : {}),
        }}
      >
        <div
          style={{
            ...styles.chartBox,
            ...(compact ? styles.chartBoxCompact : {}),
          }}
        >
          <svg
            width="100%"
            viewBox={`0 0 ${size} ${size}`}
            style={styles.svg}
            role="img"
          >
            {[0.25, 0.5, 0.75, 1].map((level) => (
              <polygon
                key={level}
                points={values
                  .map((_, index) =>
                    getGridPoint(index, level, values.length, center, radius)
                  )
                  .join(" ")}
                fill="none"
                stroke="rgba(148, 163, 184, 0.18)"
                strokeWidth="1"
              />
            ))}

            {values.map((_, index) => {
              const end = getGridPoint(index, 1, values.length, center, radius);
              const [x2, y2] = end.split(",");

              return (
                <line
                  key={index}
                  x1={center}
                  y1={center}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(148, 163, 184, 0.14)"
                  strokeWidth="1"
                />
              );
            })}

            <polygon
              points={polygonPoints}
              fill={polygonFill}
              stroke={polygonColor}
              strokeWidth="2"
            />

            {values.map((axis, index) => {
              const { x, y } = getLabelPosition(
                index,
                values.length,
                center,
                radius
              );

              return (
                <text
                  key={axis.label}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#dbe4f0"
                  fontSize={compact ? "9" : "11"}
                  fontWeight="700"
                >
                  {axis.label}
                </text>
              );
            })}
          </svg>
        </div>

        {showAxisList && (
          <div style={styles.axisList}>
            {values.map((axis) => (
              <div key={axis.label} style={styles.axisRow}>
                <span>{axis.label}</span>
                <strong style={{ color: getScoreColor(axis.value) }}>
                  {axis.value.toFixed(1)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    padding: 14,
    border: "1px solid #2d3340",
    borderRadius: 12,
    background: "#151922",
  },

  wrapperCompact: {
    padding: 0,
    border: "none",
    background: "transparent",
  },

  header: {
    marginBottom: 12,
  },

  title: {
    margin: 0,
    color: "#f2f4f8",
    fontSize: 16,
    fontWeight: 900,
  },

  subtitle: {
    color: "#9ca3af",
    fontSize: 12,
  },

  content: {
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: 16,
    alignItems: "center",
  },

  contentCompact: {
    display: "block",
  },

  chartBox: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  chartBoxCompact: {
    width: 190,
    height: 190,
  },

  svg: {
    overflow: "visible",
  },

  axisList: {
    display: "grid",
    gap: 7,
  },

  axisRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
    color: "#dbe4f0",
    fontSize: 13,
  },
};