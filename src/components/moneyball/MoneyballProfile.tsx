import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { TableRow } from "../../types/table";
import { MoneyballCompare } from "./MoneyballCompare";
import { MoneyballScatterPanel } from "./MoneyballScatterPanel";
import {
  formatMoneyballValue,
  getMinutesReliability,
  getMoneyballInsights,
  getMoneyballPositionProfile,
  getMoneyballSections,
  hasMoneyballData,
  type MoneyballInsight,
  type MoneyballMetric,
  type MoneyballPositionProfile,
  type MoneyballSection,
} from "../../utils/moneyball";
import {
  getCompatiblePlayerOptions,
  getSortedPlayerSelectOptions,
  isGoalkeeper,
} from "../../utils/playerPositionType";

type MoneyballProfileProps = {
  player: TableRow;
  rows?: TableRow[];
  analysisPositionGroup?: string;
};

function getRawFromColumns(row: TableRow, columns: string[]): string {
  for (const column of columns) {
    const value = row[column];

    if (value && value.trim() && value !== "-") {
      return value;
    }
  }

  return "-";
}

function getNumberFromColumnsLocal(row: TableRow, columns: string[]): number | null {
  for (const column of columns) {
    const raw = row[column];

    if (!raw || raw === "-") {
      continue;
    }

    const value = Number(
      String(raw)
        .replace("%", "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, "")
    );

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function goalkeeperMetric(
  row: TableRow,
  columns: string[],
  label: string,
  options?: { suffix?: string; better?: "higher" | "lower" }
): MoneyballMetric {
  const raw = getRawFromColumns(row, columns);
  const value = getNumberFromColumnsLocal(row, columns);

  return {
    label,
    value,
    raw,
    suffix: options?.suffix,
    better: options?.better ?? "higher",
  };
}

function getSavesPer90(row: TableRow): MoneyballMetric {
  const saves = getNumberFromColumnsLocal(row, ["Obs"]);
  const minutes = getNumberFromColumnsLocal(row, ["Minuty", "Min"]);

  if (saves === null || minutes === null || minutes <= 0) {
    return {
      label: "Obronione/90",
      value: null,
      raw: "-",
      better: "higher",
    };
  }

  const value = (saves * 90) / minutes;

  return {
    label: "Obronione/90",
    value,
    raw: value.toLocaleString("pl-PL", { maximumFractionDigits: 2 }),
    better: "higher",
  };
}

function getGoalkeeperMoneyballSections(row: TableRow): MoneyballSection[] {
  return [
    {
      title: "Próba i forma",
      metrics: [
        goalkeeperMetric(row, ["Minuty", "Min"], "Minuty"),
        goalkeeperMetric(row, ["Występy"], "Występy"),
        goalkeeperMetric(row, ["Średnia ocena w klubie"], "Śr. ocena"),
        goalkeeperMetric(row, ["Ostatnie 5 występów klubowych"], "Ostatnie 5"),
      ],
    },
    {
      title: "Bronienie strzałów",
      metrics: [
        goalkeeperMetric(row, ["OS %"], "OS %"),
        goalkeeperMetric(row, ["xOS %"], "xOS %"),
        goalkeeperMetric(row, ["Obs"], "Obronione"),
        getSavesPer90(row),
      ],
    },
    {
      title: "Oczekiwane gole",
      metrics: [
        goalkeeperMetric(row, ["xGUn"], "xG uniknięte"),
        goalkeeperMetric(row, ["ZxG/90"], "ZxG/90"),
      ],
    },
    {
      title: "Parady i reakcje",
      metrics: [
        goalkeeperMetric(row, ["Złapane strzały", "Złapane", "ZłS"], "Złapane"),
        goalkeeperMetric(row, ["Sps"], "Sparowane"),
        goalkeeperMetric(row, ["Ssr"], "Sparowane na róg", {
          better: "lower",
        }),
      ],
    },
    {
      title: "Dystrybucja",
      metrics: [
        goalkeeperMetric(row, ["Pod %"], "Podania %"),
        goalkeeperMetric(row, ["Pod/90"], "Podania/90"),
        goalkeeperMetric(row, ["PodC/90"], "Celne/90"),
        goalkeeperMetric(row, ["Str Płk/90"], "Straty/90", {
          better: "lower",
        }),
      ],
    },
  ];
}

function hasGoalkeeperMoneyballData(row: TableRow): boolean {
  return getGoalkeeperMoneyballSections(row).some((section) =>
    section.metrics.some((metric) => metric.value !== null)
  );
}

function getGoalkeeperMoneyballInsights(
  row: TableRow,
  contextRows: TableRow[] = []
): MoneyballInsight[] {
  const insights: MoneyballInsight[] = [];
  const reliability = getMinutesReliability(row, contextRows);

  if (reliability.level === "very-low") {
    insights.push({
      tone: "bad",
      text: "Bardzo mała próba minut — statystyki bramkarza mogą przekłamywać.",
    });
  } else if (reliability.level === "low") {
    insights.push({
      tone: "warning",
      text: "Mała próba minut — traktuj liczby bramkarza ostrożnie.",
    });
  } else if (reliability.level === "medium") {
    insights.push({
      tone: "info",
      text: "Średnia próba minut — dane bramkarza są użyteczne, ale jeszcze nie pełne.",
    });
  } else {
    insights.push({
      tone: "good",
      text: "Dobra próba minut — statystyki bramkarza są dość wiarygodne.",
    });
  }

  const savePercent = getNumberFromColumnsLocal(row, ["OS %"]);
  const expectedSavePercent = getNumberFromColumnsLocal(row, ["xOS %"]);
  const preventedGoals = getNumberFromColumnsLocal(row, ["xGUn"]);
  const preventedPer90 = getNumberFromColumnsLocal(row, ["ZxG/90"]);
  const parriedToCorner = getNumberFromColumnsLocal(row, ["Ssr"]);

  if (preventedGoals !== null && preventedGoals > 0) {
    insights.push({
      tone: "good",
      text: "Bramkarz broni powyżej oczekiwań — dodatnie xG uniknięte.",
    });
  } else if (preventedGoals !== null && preventedGoals < 0) {
    insights.push({
      tone: "warning",
      text: "Bramkarz broni poniżej oczekiwań — ujemne xG uniknięte.",
    });
  }

  if (preventedPer90 !== null && preventedPer90 > 0.12) {
    insights.push({
      tone: "good",
      text: "Bardzo dobry wpływ na bramkę w przeliczeniu na 90 minut.",
    });
  }

  if (
    savePercent !== null &&
    expectedSavePercent !== null &&
    savePercent >= expectedSavePercent + 3
  ) {
    insights.push({
      tone: "good",
      text: "Stosunek obronionych strzałów przewyższa oczekiwany poziom.",
    });
  }

  if (parriedToCorner !== null && parriedToCorner > 0) {
    insights.push({
      tone: "info",
      text: "Sprawdź odbijanie strzałów na róg — ważne przy ocenie kontroli interwencji.",
    });
  }

  return insights;
}

function getGoalkeeperPositionProfile(row: TableRow): MoneyballPositionProfile {
  const positives: string[] = [];
  const warnings: string[] = [];

  const savePercent = getNumberFromColumnsLocal(row, ["OS %"]);
  const expectedSavePercent = getNumberFromColumnsLocal(row, ["xOS %"]);
  const preventedGoals = getNumberFromColumnsLocal(row, ["xGUn"]);
  const preventedPer90 = getNumberFromColumnsLocal(row, ["ZxG/90"]);
  const parried = getNumberFromColumnsLocal(row, ["Sps"]);
  const parriedToCorner = getNumberFromColumnsLocal(row, ["Ssr"]);
  const passPercent = getNumberFromColumnsLocal(row, ["Pod %"]);
  const losses90 = getNumberFromColumnsLocal(row, ["Str Płk/90"]);

  if (preventedGoals !== null && preventedGoals > 0) {
    positives.push("Dodatnie xG uniknięte — broni powyżej oczekiwań.");
  }

  if (preventedPer90 !== null && preventedPer90 > 0.1) {
    positives.push("Dobry wpływ na wynik w przeliczeniu na 90 minut.");
  }

  if (
    savePercent !== null &&
    expectedSavePercent !== null &&
    savePercent >= expectedSavePercent
  ) {
    positives.push("OS% wygląda co najmniej zgodnie z oczekiwanym poziomem.");
  }

  if (passPercent !== null && passPercent >= 85) {
    positives.push("Bezpieczna dystrybucja — wysoka celność podań.");
  }

  if (preventedGoals !== null && preventedGoals < 0) {
    warnings.push("Ujemne xG uniknięte — broni poniżej oczekiwań.");
  }

  if (
    savePercent !== null &&
    expectedSavePercent !== null &&
    savePercent + 3 < expectedSavePercent
  ) {
    warnings.push("OS% wyraźnie poniżej oczekiwanego poziomu.");
  }

  if (losses90 !== null && losses90 > 10) {
    warnings.push("Dużo strat przy rozegraniu od bramki.");
  }

  if (parried !== null && parriedToCorner !== null && parried > 0 && parriedToCorner > parried * 0.4) {
    warnings.push("Duży udział parowanych strzałów na róg — sprawdź kontrolę odbić.");
  }

  const tone =
    warnings.length >= 2 && positives.length <= 1
      ? "warning"
      : positives.length >= 2 && warnings.length === 0
      ? "good"
      : "info";

  return {
    title: "Profil bramkarza",
    subtitle: "Ocena oparta o statystyki bramkarskie, a nie liczby zawodników z pola.",
    tone,
    summary:
      tone === "good"
        ? "Statystyki dobrze potwierdzają profil bramkarza."
        : tone === "warning"
        ? "Profil bramkarza ma wyraźne ryzyka w liczbach."
        : "Profil bramkarza jest mieszany — zestaw liczby z atrybutami.",
    positives,
    warnings,
  };
}

function getReliabilityStyle(level: string): CSSProperties {
  if (level === "strong" || level === "good") {
    return {
      color: "#63ff6b",
      borderColor: "rgba(99, 255, 107, 0.35)",
      background: "rgba(99, 255, 107, 0.1)",
    };
  }

  if (level === "medium") {
    return {
      color: "#ffd84a",
      borderColor: "rgba(255, 216, 74, 0.35)",
      background: "rgba(255, 216, 74, 0.1)",
    };
  }

  return {
    color: "#fb7185",
    borderColor: "rgba(251, 113, 133, 0.35)",
    background: "rgba(251, 113, 133, 0.1)",
  };
}

function getMetricValueStyle(metric: MoneyballMetric): CSSProperties {
  if (metric.value === null) {
    return {
      color: "#64748b",
    };
  }

  return {
    color: "#f8fafc",
  };
}
function getInsightStyle(insight: MoneyballInsight): CSSProperties {
  if (insight.tone === "good") {
    return {
      color: "#63ff6b",
      borderColor: "rgba(99, 255, 107, 0.32)",
      background: "rgba(99, 255, 107, 0.08)",
    };
  }

  if (insight.tone === "warning") {
    return {
      color: "#ffd84a",
      borderColor: "rgba(255, 216, 74, 0.32)",
      background: "rgba(255, 216, 74, 0.08)",
    };
  }

  if (insight.tone === "bad") {
    return {
      color: "#fb7185",
      borderColor: "rgba(251, 113, 133, 0.32)",
      background: "rgba(251, 113, 133, 0.08)",
    };
  }

  return {
    color: "#93c5fd",
    borderColor: "rgba(147, 197, 253, 0.28)",
    background: "rgba(147, 197, 253, 0.07)",
  };
}

function getPositionProfileStyle(
  profile: MoneyballPositionProfile
): CSSProperties {
  if (profile.tone === "good") {
    return {
      borderColor: "rgba(99, 255, 107, 0.32)",
      background:
        "linear-gradient(135deg, rgba(99, 255, 107, 0.10), rgba(16, 20, 29, 0.95))",
    };
  }

  if (profile.tone === "warning") {
    return {
      borderColor: "rgba(255, 216, 74, 0.32)",
      background:
        "linear-gradient(135deg, rgba(255, 216, 74, 0.10), rgba(16, 20, 29, 0.95))",
    };
  }

  if (profile.tone === "bad") {
    return {
      borderColor: "rgba(251, 113, 133, 0.32)",
      background:
        "linear-gradient(135deg, rgba(251, 113, 133, 0.10), rgba(16, 20, 29, 0.95))",
    };
  }

  return {
    borderColor: "rgba(147, 197, 253, 0.28)",
    background:
      "linear-gradient(135deg, rgba(147, 197, 253, 0.08), rgba(16, 20, 29, 0.95))",
  };
}
function getMoneyballCompareKey(row: TableRow): string {
  return [
    row["Nazwisko"] ?? "",
    row["Klub"] ?? "",
    row["Wiek"] ?? "",
    row["Pozycja"] ?? "",
  ].join("|");
}

function isSameMoneyballPlayer(left: TableRow, right: TableRow): boolean {
  return getMoneyballCompareKey(left) === getMoneyballCompareKey(right);
}
export function MoneyballProfile({
  player,
  rows = [],
  analysisPositionGroup = "any",
}: MoneyballProfileProps) {
const goalkeeper = isGoalkeeper(player);
const reliability = getMinutesReliability(player, rows);
const sections = goalkeeper
  ? getGoalkeeperMoneyballSections(player)
  : getMoneyballSections(player);
const insights = goalkeeper
  ? getGoalkeeperMoneyballInsights(player, rows)
  : getMoneyballInsights(player, rows);

const positionProfile = goalkeeper
  ? getGoalkeeperPositionProfile(player)
  : getMoneyballPositionProfile(player, analysisPositionGroup);

const [comparePlayerKey, setComparePlayerKey] = useState("");

const moneyballCompareOptions = useMemo(() => {
  return getCompatiblePlayerOptions(getSortedPlayerSelectOptions(rows), player)
    .filter((option) => !isSameMoneyballPlayer(option.row, player))
    .map((option) => ({
      key: getMoneyballCompareKey(option.row),
      label: option.label,
      row: option.row,
    }));
}, [rows, player]);

const comparePlayer =
  moneyballCompareOptions.find((option) => option.key === comparePlayerKey)
    ?.row ?? null;

useEffect(() => {
  if (!comparePlayerKey) {
    return;
  }

  const stillValid = moneyballCompareOptions.some(
    (option) => option.key === comparePlayerKey
  );

  if (!stillValid) {
    setComparePlayerKey("");
  }
}, [comparePlayerKey, moneyballCompareOptions]);

  if (goalkeeper ? !hasGoalkeeperMoneyballData(player) : !hasMoneyballData(player)) {
    return (
      <section style={styles.wrapper}>
        <div style={styles.header}>
          <h3 style={styles.title}>Moneyball</h3>
        </div>

        <div style={styles.empty}>Brak danych statystycznych w imporcie.</div>
      </section>
    );
  }

  return (
    <section style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Moneyball</h3>
          <div style={styles.subtitle}>
            {goalkeeper
              ? "Statystyki bramkarskie i potwierdzenie profilu BR"
              : "Produkcja klubowa i potwierdzenie profilu zawodnika"}
          </div>
        </div>

        <div
          style={{
            ...styles.reliabilityBadge,
            ...getReliabilityStyle(reliability.level),
          }}
        >
          {reliability.label}
          {reliability.minutes !== null ? ` · ${reliability.minutes} min` : ""}
        </div>
      </div>
      {insights.length > 0 && (
        <div style={styles.insightList}>
          {insights.map((insight) => (
            <div
              key={insight.text}
              style={{
                ...styles.insightChip,
                ...getInsightStyle(insight),
              }}
            >
              {insight.text}
            </div>
          ))}
        </div>
        
      )}
            <div
        style={{
          ...styles.positionProfileBox,
          ...getPositionProfileStyle(positionProfile),
        }}
      >
        <div style={styles.positionProfileHeader}>
          <div>
            <h4 style={styles.positionProfileTitle}>
              {positionProfile.title}
            </h4>

            <div style={styles.positionProfileSubtitle}>
              {positionProfile.subtitle}
            </div>
          </div>

          <strong style={styles.positionProfileSummary}>
            {positionProfile.summary}
          </strong>
        </div>

        <div style={styles.positionProfileColumns}>
          <div>
            <div style={styles.positionProfileColumnTitle}>Plusy</div>

            {positionProfile.positives.length === 0 ? (
              <div style={styles.positionProfileEmpty}>Brak mocnych plusów.</div>
            ) : (
              positionProfile.positives.map((item) => (
                <div key={item} style={styles.positionProfilePositive}>
                  + {item}
                </div>
              ))
            )}
          </div>

          <div>
            <div style={styles.positionProfileColumnTitle}>Ryzyka</div>

            {positionProfile.warnings.length === 0 ? (
              <div style={styles.positionProfileEmpty}>Brak dużych czerwonych flag.</div>
            ) : (
              positionProfile.warnings.map((item) => (
                <div key={item} style={styles.positionProfileWarning}>
                  - {item}
                </div>
              ))
            )}
          </div>
        </div>
{rows.length > 1 && (
  <MoneyballScatterPanel
    player={player}
    rows={rows}
    analysisPositionGroup={analysisPositionGroup}
  />
)}

{moneyballCompareOptions.length > 0 && (
  <div style={styles.playerDuelBox}>
    <div style={styles.playerDuelHeader}>
      <div>
        <h3 style={styles.playerDuelTitle}>Porównanie Moneyball H2H</h3>
        <div style={styles.playerDuelSubtitle}>
          Porównaj aktualnego zawodnika z konkretnym piłkarzem z importu
        </div>
      </div>

      <label style={styles.playerDuelField}>
        Porównaj z
        <select
          value={comparePlayerKey}
          onChange={(event) => setComparePlayerKey(event.target.value)}
          style={styles.playerDuelSelect}
        >
          <option value="">Wybierz zawodnika</option>

          {moneyballCompareOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>

    {comparePlayer ? (
<MoneyballCompare
  leftPlayer={player}
  rightPlayer={comparePlayer}
  rows={rows}
/>    ) : (
      <div style={styles.playerDuelEmpty}>
        Wybierz drugiego zawodnika, żeby zobaczyć bezpośrednie porównanie
        moneyball.
      </div>
    )}
  </div>
)}
 </div>
<div style={styles.grid}>
        {sections.map((section) => (
          <div key={section.title} style={styles.sectionCard}>
            <h4 style={styles.sectionTitle}>{section.title}</h4>

            <div style={styles.metricList}>
              {section.metrics.map((metric) => (
                <div key={metric.label} style={styles.metricRow}>
                  <span style={styles.metricLabel}>{metric.label}</span>

                  <strong
                    style={{
                      ...styles.metricValue,
                      ...getMetricValueStyle(metric),
                    }}
                  >
                    {formatMoneyballValue(metric)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
wrapper: {
  margin: "0 0 8px",
  padding: 8,
  border: "1px solid #2c313a",
  borderRadius: 9,
  background: "#151922",
},

header: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  marginBottom: 6,
},

  title: {
    margin: 0,
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: 900,
  },

  subtitle: {
    marginTop: 2,
    color: "#94a3b8",
    fontSize: 10,
  },

  reliabilityBadge: {
    padding: "4px 7px",
    border: "1px solid",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

grid: {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: 6,
},

sectionCard: {
  padding: 6,
  border: "1px solid #252b36",
  borderRadius: 7,
  background: "#10141d",
  minWidth: 0,
},

  sectionTitle: {
    margin: "0 0 6px",
    color: "#dbeafe",
    fontSize: 11,
    fontWeight: 900,
    textAlign: "center",
  },

  metricList: {
    display: "grid",
    gap: 3,
  },

metricRow: {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 5,
  padding: "2px 0",
  borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
},

  metricLabel: {
    color: "#aeb6c7",
    fontSize: 10,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

metricValue: {
  fontSize: 11,
  fontWeight: 900,
  whiteSpace: "nowrap",
  textAlign: "right",
},

  empty: {
    color: "#94a3b8",
    fontSize: 12,
  },
  insightList: {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  marginBottom: 8,
},

insightChip: {
  padding: "4px 7px",
  border: "1px solid",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 800,
  lineHeight: 1.2,
},
positionProfileBox: {
  marginBottom: 8,
  padding: 8,
  border: "1px solid",
  borderRadius: 8,
},

positionProfileHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  marginBottom: 7,
},

positionProfileTitle: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 12,
  fontWeight: 950,
},

positionProfileSubtitle: {
  marginTop: 2,
  color: "#94a3b8",
  fontSize: 10,
},

positionProfileSummary: {
  color: "#f8fafc",
  fontSize: 11,
  textAlign: "right",
  maxWidth: 360,
  lineHeight: 1.25,
},

positionProfileColumns: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
},

positionProfileColumnTitle: {
  marginBottom: 4,
  color: "#cbd5e1",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
},

positionProfilePositive: {
  padding: "3px 0",
  color: "#86efac",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1.25,
},

positionProfileWarning: {
  padding: "3px 0",
  color: "#fda4af",
  fontSize: 11,
  fontWeight: 800,
  lineHeight: 1.25,
},

positionProfileEmpty: {
  color: "#94a3b8",
  fontSize: 11,
  fontStyle: "italic",
},
playerDuelBox: {
  marginBottom: 8,
  padding: 8,
  border: "1px solid #2c313a",
  borderRadius: 9,
  background: "#10141d",
},

playerDuelHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 10,
  marginBottom: 8,
},

playerDuelTitle: {
  margin: 0,
  color: "#f8fafc",
  fontSize: 13,
  fontWeight: 950,
},

playerDuelSubtitle: {
  marginTop: 2,
  color: "#94a3b8",
  fontSize: 10,
},

playerDuelField: {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  minWidth: 320,
  color: "#aeb6c7",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

playerDuelSelect: {
  height: 28,
  width: "100%",
  padding: "0 8px",
  borderRadius: 7,
  border: "1px solid #313746",
  background: "#0f131b",
  color: "#f2f4f8",
  outline: "none",
  fontSize: 12,
  fontWeight: 800,
},

playerDuelEmpty: {
  padding: 10,
  border: "1px solid #252b36",
  borderRadius: 8,
  background: "#0b1018",
  color: "#94a3b8",
  fontSize: 12,
  textAlign: "center",
},
};