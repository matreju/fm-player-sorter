import type { TableRow } from "../types/table";

export type MoneyballMetric = {
  label: string;
  value: number | null;
  raw: string;
  suffix?: string;
  better?: "higher" | "lower";
};

export type MoneyballSection = {
  title: string;
  metrics: MoneyballMetric[];
};

export type MoneyballInsightTone = "good" | "warning" | "bad" | "info";

export type MoneyballInsight = {
  tone: MoneyballInsightTone;
  text: string;
};

function parseMoneyballNumber(value: string | undefined): number | null {
  if (!value || value === "-") return null;

  const normalized = value
    .replace("%", "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  if (!normalized.trim()) return null;

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}

export function getNumberFromColumns(
  row: TableRow,
  columns: string[]
): number | null {
  for (const column of columns) {
    const value = parseMoneyballNumber(row[column]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getRawFromColumns(row: TableRow, columns: string[]): string {
  for (const column of columns) {
    const value = row[column];

    if (value && value.trim() && value !== "-") {
      return value;
    }
  }

  return "-";
}

function metric(
  row: TableRow,
  columns: string[],
  label: string,
  options?: {
    suffix?: string;
    better?: "higher" | "lower";
  }
): MoneyballMetric {
  const raw = getRawFromColumns(row, columns);
  const value = getNumberFromColumns(row, columns);

  return {
    label,
    value,
    raw,
    suffix: options?.suffix,
    better: options?.better ?? "higher",
  };
}

export type MinutesReliabilityLevel =
  | "very-low"
  | "low"
  | "medium"
  | "good"
  | "strong";

export type MinutesReliability = {
  label: string;
  level: MinutesReliabilityLevel;
  minutes: number | null;
  referenceMinutes: number | null;
  ratio: number | null;
  scope: "league" | "import" | "fixed";
};

function getLeagueName(row: TableRow): string {
  return (row["Liga"] || row["Rozgrywki"] || "").trim().toLowerCase();
}

function getMinutesValue(row: TableRow): number | null {
  return getNumberFromColumns(row, ["Minuty"]);
}

function percentile(values: number[], ratio: number): number | null {
  const sorted = values
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right);

  if (sorted.length === 0) {
    return null;
  }

  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * ratio))
  );

  return sorted[index];
}

function getMinutesReference(
  row: TableRow,
  contextRows: TableRow[]
): {
  referenceMinutes: number | null;
  scope: "league" | "import" | "fixed";
} {
  const league = getLeagueName(row);

  const allMinutes = contextRows
    .map(getMinutesValue)
    .filter((value): value is number => value !== null && value > 0);

  const leagueMinutes = contextRows
    .filter((item) => getLeagueName(item) === league && league.length > 0)
    .map(getMinutesValue)
    .filter((value): value is number => value !== null && value > 0);

  if (leagueMinutes.length >= 8) {
    return {
      referenceMinutes: percentile(leagueMinutes, 0.75),
      scope: "league",
    };
  }

  if (allMinutes.length >= 20) {
    return {
      referenceMinutes: percentile(allMinutes, 0.75),
      scope: "import",
    };
  }

  return {
    referenceMinutes: null,
    scope: "fixed",
  };
}

function getMinutesReliabilityFromFixedThresholds(
  minutes: number
): MinutesReliability {
  if (minutes < 300) {
    return {
      label: "Bardzo mała próba",
      level: "very-low",
      minutes,
      referenceMinutes: null,
      ratio: null,
      scope: "fixed",
    };
  }

  if (minutes < 700) {
    return {
      label: "Mała próba",
      level: "low",
      minutes,
      referenceMinutes: null,
      ratio: null,
      scope: "fixed",
    };
  }

  if (minutes < 1500) {
    return {
      label: "Średnia próba",
      level: "medium",
      minutes,
      referenceMinutes: null,
      ratio: null,
      scope: "fixed",
    };
  }

  if (minutes < 2500) {
    return {
      label: "Dobra próba",
      level: "good",
      minutes,
      referenceMinutes: null,
      ratio: null,
      scope: "fixed",
    };
  }

  return {
    label: "Bardzo mocna próba",
    level: "strong",
    minutes,
    referenceMinutes: null,
    ratio: null,
    scope: "fixed",
  };
}

export function getMinutesReliability(
  row: TableRow,
  contextRows: TableRow[] = []
): MinutesReliability {
  const minutes = getMinutesValue(row);

  if (minutes === null) {
    return {
      label: "Brak danych o minutach",
      level: "very-low",
      minutes,
      referenceMinutes: null,
      ratio: null,
      scope: "fixed",
    };
  }

  if (contextRows.length === 0) {
    return getMinutesReliabilityFromFixedThresholds(minutes);
  }

  const { referenceMinutes, scope } = getMinutesReference(row, contextRows);

  if (referenceMinutes === null || referenceMinutes <= 0) {
    return getMinutesReliabilityFromFixedThresholds(minutes);
  }

  const ratio = minutes / referenceMinutes;
  const scopeLabel = scope === "league" ? "vs liga" : "vs import";

  if (minutes < 90) {
    return {
      label: `Bardzo mała próba ${scopeLabel}`,
      level: "very-low",
      minutes,
      referenceMinutes,
      ratio,
      scope,
    };
  }

  if (ratio >= 0.95) {
    return {
      label: `Bardzo mocna próba ${scopeLabel}`,
      level: "strong",
      minutes,
      referenceMinutes,
      ratio,
      scope,
    };
  }

  if (ratio >= 0.7) {
    return {
      label: `Dobra próba ${scopeLabel}`,
      level: "good",
      minutes,
      referenceMinutes,
      ratio,
      scope,
    };
  }

  if (ratio >= 0.45) {
    return {
      label: `Umiarkowana próba ${scopeLabel}`,
      level: "medium",
      minutes,
      referenceMinutes,
      ratio,
      scope,
    };
  }

  if (ratio >= 0.25) {
    return {
      label: `Mała próba ${scopeLabel}`,
      level: "low",
      minutes,
      referenceMinutes,
      ratio,
      scope,
    };
  }

  return {
    label: `Bardzo mała próba ${scopeLabel}`,
    level: "very-low",
    minutes,
    referenceMinutes,
    ratio,
    scope,
  };
}

export function getMoneyballSections(row: TableRow): MoneyballSection[] {
  return [
    {
      title: "Próba i forma",
      metrics: [
        metric(row, ["Minuty"], "Minuty"),
        metric(row, ["Występy"], "Występy"),
        metric(row, ["Średnia ocena w klubie"], "Śr. ocena"),
        metric(row, ["Ostatnie 5 występów klubowych"], "Ostatnie 5"),
      ],
    },
    {
      title: "Produkcja",
      metrics: [
        metric(row, ["Liczba goli na 90 min", "Gole/90", "Brm/90"], "Gole/90"),
        metric(row, ["xG/90"], "xG/90"),
        metric(row, ["Strz./90"], "Strz./90"),
        metric(row, ["% strzałów"], "Celne strz."),
      ],
    },
    {
      title: "Kreacja/podania",
      metrics: [
        metric(row, ["Asys./90", "Asysty/90", "Asys/90"], "Asysty/90"),
        metric(row, ["xA/90"], "xA/90"),
        metric(row, ["KP/90"], "KP/90"),
        metric(row, ["KPzG/90"], "KP z gry/90"),
        metric(row, ["Podania dP/90"], "Pod. do prz./90"),
      ],
    },
    {
      title: "Podania",
      metrics: [
        metric(row, ["Pod %"], "Podania %"),
        metric(row, ["Pod/90"], "Próby/90"),
        metric(row, ["PodC/90"], "Celne/90"),
        metric(row, ["Str Płk/90"], "Straty/90", {
          better: "lower",
        }),
      ],
    },
    {
      title: "Dośrodkowania",
      metrics: [
        metric(row, ["Doś P/90"], "Próby doś./90"),
        metric(row, ["Doś C/P"], "Celne doś. %"),
        metric(row, ["Doś C"], "Celne doś."),
        metric(row, ["C Doś zG/90"], "Celne z gry/90"),
        metric(row, ["Pr Doś zG/90"], "Próby z gry/90"),
      ],
    },
    {
      title: "Pressing/odbiór",
      metrics: [
        metric(row, ["Pr Pres/90"], "Pressing/90"),
        metric(row, ["Ud Pres/90"], "Ud. pressing/90"),
        metric(row, ["Odz Płk/90"], "Odzyskane/90"),
        metric(row, ["Wślizgi"], "Próby odb."),
        metric(row, ["W/90"], "Odbiory/90"),
      ],
    },
    {
      title: "Defensywa",
      metrics: [
        metric(row, ["Prz/90"], "Przechw./90"),
        metric(row, ["Wyb/90"], "Wybicia/90"),
        metric(row, ["Blk/90"], "Bloki/90"),
        metric(row, ["Odb%"], "Odbiór %"),
        metric(row, ["K Wś/90"], "Klucz. odb./90"),
      ],
    },
    {
      title: "Powietrze/fizyczność",
      metrics: [
        metric(row, ["% Głw"], "Główki %"),
        metric(row, ["Głw"], "Wygrane główki"),
        metric(row, ["Dyst./90"], "Dystans/90"),
        metric(row, ["Sprinty/90"], "Sprinty/90"),
        metric(row, ["ZwB"], "Zaw. bramki", {
          better: "lower",
        }),
      ],
    },
  ];
}

export function hasMoneyballData(row: TableRow): boolean {
  return getMoneyballSections(row).some((section) =>
    section.metrics.some((item) => item.value !== null)
  );
}

export function formatMoneyballValue(metric: MoneyballMetric): string {
  if (metric.raw && metric.raw !== "-") {
    return metric.raw;
  }

  if (metric.value === null) {
    return "-";
  }

  return String(metric.value);
}

export function getMoneyballInsights(
  row: TableRow,
  contextRows: TableRow[] = []
): MoneyballInsight[] {
  const insights: MoneyballInsight[] = [];

  const reliability = getMinutesReliability(row, contextRows);

if (reliability.level === "very-low") {
  insights.push({
    tone: "bad",
    text:
      reliability.scope === "fixed"
        ? "Bardzo mała próba — statystyki mogą mocno przekłamywać."
        : "Bardzo mała próba względem kontekstu — statystyki mogą mocno przekłamywać.",
  });
} else if (reliability.level === "low") {
  insights.push({
    tone: "warning",
    text:
      reliability.scope === "fixed"
        ? "Mała próba minut — traktuj liczby ostrożnie."
        : "Mała próba względem ligi/importu — traktuj liczby ostrożnie.",
  });
} else if (reliability.level === "medium") {
  insights.push({
    tone: "info",
    text:
      reliability.scope === "fixed"
        ? "Średnia próba minut — dane są użyteczne, ale jeszcze nie pełne."
        : "Umiarkowana próba względem ligi/importu — dane są użyteczne, ale nie pełne.",
  });
} else {
  insights.push({
    tone: "good",
    text:
      reliability.scope === "fixed"
        ? "Dobra próba minut — statystyki są dość wiarygodne."
        : "Dobra próba względem ligi/importu — statystyki są dość wiarygodne.",
  });
}

  const goals90 = getNumberFromColumns(row, [
    "Liczba goli na 90 min",
    "Gole/90",
    "Brm/90",
  ]);
  const xg90 = getNumberFromColumns(row, ["xG/90"]);
  const assists90 = getNumberFromColumns(row, ["Asys./90", "Asysty/90"]);
  const xa90 = getNumberFromColumns(row, ["xA/90"]);
  const keyPasses90 = getNumberFromColumns(row, ["KP/90", "KPzG/90"]);
  const chances90 = getNumberFromColumns(row, ["StS/90"]);
  const dribbles90 = getNumberFromColumns(row, ["Drb/90"]);
  const crosses90 = getNumberFromColumns(row, ["Doś P/90", "Pr Doś zG/90"]);
  const accurateCrosses90 = getNumberFromColumns(row, [
    "Doś P/90 (2)",
    "C Doś zG/90",
  ]);
  const losses90 = getNumberFromColumns(row, ["Str Płk/90"]);
  const passPercent = getNumberFromColumns(row, ["Pod %"]);
  const interceptions90 = getNumberFromColumns(row, ["Prz/90"]);
  const recoveries90 = getNumberFromColumns(row, ["Odz Płk/90"]);
  const press90 = getNumberFromColumns(row, ["Pr Pres/90"]);
  const successfulPress90 = getNumberFromColumns(row, ["Ud Pres/90"]);
  const tacklePercent = getNumberFromColumns(row, ["Odb%"]);
  const headersPercent = getNumberFromColumns(row, ["% Głw"]);
  const distance90 = getNumberFromColumns(row, ["Dyst./90"]);
  const sprints90 = getNumberFromColumns(row, ["Sprinty/90"]);
  const errors = getNumberFromColumns(row, ["ZwB"]);

  if (goals90 !== null || xg90 !== null) {
    if ((goals90 ?? 0) >= 0.35 && (xg90 ?? 0) >= 0.25) {
      insights.push({
        tone: "good",
        text: "Produkcja bramkowa potwierdza profil ofensywny.",
      });
    } else if ((goals90 ?? 0) >= 0.35 && (xg90 ?? 0) < 0.2) {
      insights.push({
        tone: "warning",
        text: "Strzela ponad xG — może być skuteczny, ale wynik może spaść.",
      });
    } else if ((xg90 ?? 0) >= 0.3 && (goals90 ?? 0) < 0.2) {
      insights.push({
        tone: "warning",
        text: "Dochodzi do sytuacji, ale nie zamienia ich regularnie na gole.",
      });
    }
  }

  if (
    (assists90 ?? 0) >= 0.25 ||
    (xa90 ?? 0) >= 0.18 ||
    (keyPasses90 ?? 0) >= 1.5 ||
    (chances90 ?? 0) >= 1.0
  ) {
    insights.push({
      tone: "good",
      text: "Kreacja wygląda dobrze — liczby wspierają rolę twórczą.",
    });
  }

  if ((dribbles90 ?? 0) >= 5) {
    insights.push({
      tone: "good",
      text: "Bardzo aktywny w prowadzeniu piłki i dryblingu.",
    });
  }

  if ((crosses90 ?? 0) >= 5 || (accurateCrosses90 ?? 0) >= 1.2) {
    insights.push({
      tone: "info",
      text: "Mocno obecny w dośrodkowaniach — ważne dla boku boiska.",
    });
  }

  if ((losses90 ?? 0) >= 18) {
    insights.push({
      tone: "bad",
      text: "Bardzo dużo strat na 90 minut — ryzyko przy grze pod presją.",
    });
  } else if ((losses90 ?? 0) >= 13) {
    insights.push({
      tone: "warning",
      text: "Dość dużo strat — sprawdź, czy wynika to z ryzykownej roli.",
    });
  }

  if (passPercent !== null && passPercent < 75) {
    insights.push({
      tone: "warning",
      text: "Niska celność podań — może mieć problem w bezpiecznym rozegraniu.",
    });
  }

  if ((interceptions90 ?? 0) >= 2.5 || (recoveries90 ?? 0) >= 10) {
    insights.push({
      tone: "good",
      text: "Dobre liczby odzysku i przechwytów — aktywny bez piłki.",
    });
  }

  if ((press90 ?? 0) >= 10 || (successfulPress90 ?? 0) >= 2.5) {
    insights.push({
      tone: "good",
      text: "Wysoka aktywność pressingowa.",
    });
  }

  if (tacklePercent !== null && tacklePercent >= 80) {
    insights.push({
      tone: "good",
      text: "Wysoka skuteczność odbioru.",
    });
  }

  if (headersPercent !== null) {
    if (headersPercent >= 60) {
      insights.push({
        tone: "good",
        text: "Mocny w powietrzu według pojedynków główkowych.",
      });
    } else if (headersPercent < 40) {
      insights.push({
        tone: "warning",
        text: "Słabszy w pojedynkach główkowych.",
      });
    }
  }

  if ((distance90 ?? 0) >= 12 || (sprints90 ?? 0) >= 18) {
    insights.push({
      tone: "info",
      text: "Wysoka aktywność fizyczna w meczu.",
    });
  }

  if ((errors ?? 0) >= 2) {
    insights.push({
      tone: "bad",
      text: "Zawinione bramki — duży sygnał ostrzegawczy.",
    });
  } else if ((errors ?? 0) === 1) {
    insights.push({
      tone: "warning",
      text: "Ma na koncie zawinioną bramkę.",
    });
  }

  return insights.slice(0, 5);
}

export function getMoneyballTableSummary(
  row: TableRow,
  contextRows: TableRow[] = []
): string {
  if (!hasMoneyballData(row)) {
    return "-";
  }

  const reliability = getMinutesReliability(row, contextRows);
  const tags: string[] = [];

  if (reliability.level === "very-low") {
    tags.push("❌ próba");
  } else if (reliability.level === "low") {
    tags.push("⚠ próba");
  } else if (reliability.level === "medium") {
    tags.push("~ próba");
  } else {
    tags.push("✓ próba");
  }

  const goals90 = getNumberFromColumns(row, ["Liczba goli na 90 min"]);
  const xg90 = getNumberFromColumns(row, ["xG/90"]);
  const assists90 = getNumberFromColumns(row, ["Asys./90"]);
  const xa90 = getNumberFromColumns(row, ["xA/90"]);
  const keyPasses90 = getNumberFromColumns(row, ["KP/90", "KPzG/90"]);
  const dribbles90 = getNumberFromColumns(row, ["Drb/90"]);
  const crosses90 = getNumberFromColumns(row, ["Doś P/90"]);
  const interceptions90 = getNumberFromColumns(row, ["Prz/90"]);
  const recoveries90 = getNumberFromColumns(row, ["Odz Płk/90"]);
  const losses90 = getNumberFromColumns(row, ["Str Płk/90"]);
  const errors = getNumberFromColumns(row, ["ZwB"]);

  if ((goals90 ?? 0) >= 0.35 || (xg90 ?? 0) >= 0.3) {
    tags.push("+ gole");
  }

  if (
    (assists90 ?? 0) >= 0.25 ||
    (xa90 ?? 0) >= 0.18 ||
    (keyPasses90 ?? 0) >= 1.5
  ) {
    tags.push("+ kreacja");
  }

  if ((dribbles90 ?? 0) >= 5) {
    tags.push("+ drybling");
  }

  if ((crosses90 ?? 0) >= 5) {
    tags.push("+ dośr.");
  }

  if ((interceptions90 ?? 0) >= 2.5 || (recoveries90 ?? 0) >= 10) {
    tags.push("+ bez piłki");
  }

  if ((losses90 ?? 0) >= 18) {
    tags.push("- straty");
  }

  if ((errors ?? 0) >= 1) {
    tags.push("- błędy");
  }

  return tags.slice(0, 4).join(" · ");
}
export type MoneyballPositionProfileTone = "good" | "warning" | "bad" | "info";

export type MoneyballPositionProfile = {
  title: string;
  subtitle: string;
  tone: MoneyballPositionProfileTone;
  summary: string;
  positives: string[];
  warnings: string[];
};

function getPositionFamily(positionGroup: string): 
  | "striker"
  | "winger"
  | "wide-defender"
  | "attacking-midfielder"
  | "central-midfielder"
  | "defensive-midfielder"
  | "centre-back"
  | "general" {
  const value = positionGroup.toLowerCase();

  if (!value || value === "any" || value.includes("wszyscy") || value.includes("dowol")) {
    return "general";
  }

  if (value.includes("napast")) {
    return "striker";
  }

  if (value.includes("skrzyd")) {
    return "winger";
  }

  if (
    value.includes("wahad") ||
    value.includes("boczny") ||
    value.includes("boczna") ||
    value.includes("obrońca boczny")
  ) {
    return "wide-defender";
  }

  if (value.includes("ofensywn") || value.includes("op ")) {
    return "attacking-midfielder";
  }

  if (value.includes("defensywn") || value.includes("dp")) {
    return "defensive-midfielder";
  }

  if (
    value.includes("środkowy obrońca") ||
    value.includes("srodkowy obronca") ||
    value.includes("stoper") ||
    value.includes("obrońca środkowy")
  ) {
    return "centre-back";
  }

  if (value.includes("środkowy") || value.includes("srodkowy") || value.includes("pomocnik")) {
    return "central-midfielder";
  }

  return "general";
}

function buildTone(
  positives: string[],
  warnings: string[]
): MoneyballPositionProfileTone {
  if (warnings.length >= 3 && positives.length <= 1) {
    return "bad";
  }

  if (positives.length >= 3 && warnings.length <= 1) {
    return "good";
  }

  if (warnings.length >= 2) {
    return "warning";
  }

  return "info";
}

function buildSummary(
  tone: MoneyballPositionProfileTone,
  positives: string[],
  warnings: string[]
): string {
  if (tone === "good") {
    return "Statystyki dobrze potwierdzają profil pod tę pozycję.";
  }

  if (tone === "bad") {
    return "Statystyki mocno nie potwierdzają profilu pod tę pozycję.";
  }

  if (tone === "warning") {
    return "Profil ma zalety, ale są też wyraźne czerwone flagi.";
  }

  if (positives.length > 0 || warnings.length > 0) {
    return "Profil jest mieszany — warto zestawić liczby z atrybutami.";
  }

  return "Brak mocnego sygnału moneyball pod tę pozycję.";
}

export function getMoneyballPositionProfile(
  row: TableRow,
  positionGroup: string
): MoneyballPositionProfile {
  const family = getPositionFamily(positionGroup);

  const positives: string[] = [];
  const warnings: string[] = [];

  const goals90 = getNumberFromColumns(row, ["Liczba goli na 90 min"]);
  const assists90 = getNumberFromColumns(row, ["Asys./90"]);
  const xg90 = getNumberFromColumns(row, ["xG/90"]);
  const xa90 = getNumberFromColumns(row, ["xA/90"]);
  const shots90 = getNumberFromColumns(row, ["Strz./90"]);
  const shotAccuracy = getNumberFromColumns(row, ["% strzałów"]);

  const keyPasses90 = getNumberFromColumns(row, ["KP/90"]);
  const keyPassesOpenPlay90 = getNumberFromColumns(row, ["KPzG/90"]);
  const chances90 = getNumberFromColumns(row, ["StS/90"]);

  const passPercent = getNumberFromColumns(row, ["Pod %"]);
  const passes90 = getNumberFromColumns(row, ["Pod/90"]);
  const accuratePasses90 = getNumberFromColumns(row, ["PodC/90"]);
  const forwardPasses90 = getNumberFromColumns(row, ["Podania dP/90"]);

  const dribbles90 = getNumberFromColumns(row, ["Drb/90"]);
  const losses90 = getNumberFromColumns(row, ["Str Płk/90"]);

  const crosses90 = getNumberFromColumns(row, ["Doś P/90"]);
  const openPlayCrosses90 = getNumberFromColumns(row, ["Pr Doś zG/90"]);
  const accurateCrosses90 = getNumberFromColumns(row, ["Doś P/90 (2)", "C Doś zG/90"]);
  const crossAccuracy = getNumberFromColumns(row, ["Doś C/P"]);

  const interceptions90 = getNumberFromColumns(row, ["Prz/90"]);
  const clearances90 = getNumberFromColumns(row, ["Wyb/90"]);
  const blocks90 = getNumberFromColumns(row, ["Blk/90"]);
  const recoveries90 = getNumberFromColumns(row, ["Odz Płk/90"]);
  const press90 = getNumberFromColumns(row, ["Pr Pres/90"]);
  const successfulPress90 = getNumberFromColumns(row, ["Ud Pres/90"]);

  const tacklesTotal = getNumberFromColumns(row, ["Wślizgi"]);
  const tackles90 = getNumberFromColumns(row, ["W/90"]);
  const tacklePercent = getNumberFromColumns(row, ["Odb%"]);

  const headersPercent = getNumberFromColumns(row, ["% Głw"]);
  const headersWon = getNumberFromColumns(row, ["Głw"]);

  const distance90 = getNumberFromColumns(row, ["Dyst./90"]);
  const sprints90 = getNumberFromColumns(row, ["Sprinty/90"]);

  const errors = getNumberFromColumns(row, ["ZwB"]);

  let title = "Profil ogólny";
  let subtitle = "Ogólne potwierdzenie liczbami z klubu";

  if (family === "striker") {
    title = "Profil pod napastnika";
    subtitle = "Gole, xG, strzały, gra w polu karnym i ryzyko strat";

    if ((goals90 ?? 0) >= 0.35) positives.push("Dobra produkcja bramkowa na 90 minut.");
    if ((xg90 ?? 0) >= 0.3) positives.push("Dochodzi do wartościowych sytuacji strzeleckich.");
    if ((shots90 ?? 0) >= 2.0) positives.push("Oddaje odpowiednią liczbę strzałów.");
    if ((shotAccuracy ?? 0) >= 45) positives.push("Dobra celność strzałów.");
    if ((headersPercent ?? 0) >= 55 || (headersWon ?? 0) >= 40) positives.push("Może dawać wartość w powietrzu.");

    if ((xg90 ?? 0) < 0.15) warnings.push("Niskie xG/90 — mało realnych sytuacji.");
    if ((shots90 ?? 0) < 1.2) warnings.push("Mało strzałów jak na napastnika.");
    if ((goals90 ?? 0) < 0.15 && (xg90 ?? 0) < 0.2) warnings.push("Liczby nie potwierdzają regularnego zagrożenia bramki.");
    if ((losses90 ?? 0) >= 15) warnings.push("Wysokie straty mogą przeszkadzać przy grze tyłem do bramki.");
  }

  if (family === "winger") {
    title = "Profil pod skrzydłowego";
    subtitle = "Drybling, kreacja, dośrodkowania, strzały i straty";

    if ((dribbles90 ?? 0) >= 3.5) positives.push("Aktywny w dryblingu i prowadzeniu piłki.");
    if ((keyPasses90 ?? 0) >= 1.5 || (keyPassesOpenPlay90 ?? 0) >= 1.4) positives.push("Tworzy grę przez kluczowe podania.");
    if ((xa90 ?? 0) >= 0.18 || (assists90 ?? 0) >= 0.2) positives.push("Kreacja przekłada się na xA/asysty.");
    if ((crosses90 ?? 0) >= 4 || (openPlayCrosses90 ?? 0) >= 3.5) positives.push("Często dostarcza piłki z bocznego sektora.");
    if ((accurateCrosses90 ?? 0) >= 0.8 || (crossAccuracy ?? 0) >= 25) positives.push("Dośrodkowania mają sensowną jakość.");
    if ((shots90 ?? 0) >= 1.5) positives.push("Dorzuca zagrożenie strzałem.");

    if ((losses90 ?? 0) >= 17) warnings.push("Bardzo dużo strat jak na bocznego gracza.");
    if ((crosses90 ?? 0) >= 4 && (crossAccuracy ?? 0) < 18) warnings.push("Dużo wrzutek, ale słaba jakość dośrodkowań.");
    if ((dribbles90 ?? 0) < 1.0 && (keyPasses90 ?? 0) < 1.0) warnings.push("Mało dryblingu i kreacji jak na skrzydło.");
  }

  if (family === "wide-defender") {
    title = "Profil pod bocznego obrońcę / wahadło";
    subtitle = "Dośrodkowania, sprinty, odzysk, pressing i bezpieczeństwo";

    if ((crosses90 ?? 0) >= 4 || (openPlayCrosses90 ?? 0) >= 3.5) positives.push("Duża aktywność w dośrodkowaniach.");
    if ((accurateCrosses90 ?? 0) >= 0.8 || (crossAccuracy ?? 0) >= 25) positives.push("Dośrodkowania mają jakość, nie tylko liczbę prób.");
    if ((sprints90 ?? 0) >= 16) positives.push("Wysoka aktywność sprintowa.");
    if ((distance90 ?? 0) >= 11.5) positives.push("Duży dystans na 90 minut.");
    if ((recoveries90 ?? 0) >= 8 || (interceptions90 ?? 0) >= 2.5) positives.push("Dobrze pracuje w odbiorze i odzysku.");
    if ((press90 ?? 0) >= 8 || (successfulPress90 ?? 0) >= 2.0) positives.push("Aktywny pressingowo.");

    if ((losses90 ?? 0) >= 17) warnings.push("Za dużo strat jak na bocznego obrońcę/wahadło.");
    if ((crosses90 ?? 0) >= 4 && (crossAccuracy ?? 0) < 18) warnings.push("Dużo dośrodkowań, ale niska skuteczność.");
    if ((errors ?? 0) >= 1) warnings.push("Zawinione bramki są dużym ostrzeżeniem dla obrońcy.");
    if ((headersPercent ?? 0) < 35) warnings.push("Słabo wygląda w pojedynkach powietrznych.");
  }

  if (family === "attacking-midfielder") {
    title = "Profil pod ofensywnego pomocnika";
    subtitle = "Kreacja, xA, kluczowe podania, straty i zagrożenie bramki";

    if ((keyPasses90 ?? 0) >= 1.8 || (keyPassesOpenPlay90 ?? 0) >= 1.5) positives.push("Mocna liczba kluczowych podań.");
    if ((xa90 ?? 0) >= 0.18 || (assists90 ?? 0) >= 0.2) positives.push("Kreacja przekłada się na xA/asysty.");
    if ((chances90 ?? 0) >= 0.5) positives.push("Tworzy sytuacje dla drużyny.");
    if ((forwardPasses90 ?? 0) >= 5) positives.push("Często gra do przodu.");
    if ((goals90 ?? 0) >= 0.2 || (xg90 ?? 0) >= 0.2) positives.push("Dorzuca zagrożenie bramkowe.");
    if ((dribbles90 ?? 0) >= 2.5) positives.push("Potrafi przenosić piłkę dryblingiem.");

    if ((losses90 ?? 0) >= 16) warnings.push("Dużo strat jak na kreatora gry.");
    if ((keyPasses90 ?? 0) < 0.8 && (xa90 ?? 0) < 0.1) warnings.push("Kreacja nie wybija się w liczbach.");
    if (passPercent !== null && passPercent < 80) warnings.push("Celność podań może być problemem.");
  }

  if (family === "central-midfielder") {
    title = "Profil pod środkowego pomocnika";
    subtitle = "Podania, progresja, odzysk, pressing i bezpieczeństwo";

    if ((passPercent ?? 0) >= 88) positives.push("Bardzo dobra celność podań.");
    if ((passes90 ?? 0) >= 50 || (accuratePasses90 ?? 0) >= 45) positives.push("Duży udział w obiegu piłki.");
    if ((forwardPasses90 ?? 0) >= 5) positives.push("Często gra do przodu.");
    if ((keyPasses90 ?? 0) >= 1.2 || (keyPassesOpenPlay90 ?? 0) >= 1.0) positives.push("Daje wkład kreatywny.");
    if ((recoveries90 ?? 0) >= 8 || (interceptions90 ?? 0) >= 2) positives.push("Pomaga w odzysku piłki.");
    if ((press90 ?? 0) >= 6) positives.push("Aktywny w pressingu.");

    if (passPercent !== null && passPercent < 80) warnings.push("Niska celność podań jak na środkowego pomocnika.");
    if ((losses90 ?? 0) >= 14) warnings.push("Podwyższone ryzyko strat w środku pola.");
    if ((recoveries90 ?? 0) < 4 && (interceptions90 ?? 0) < 1) warnings.push("Mało widoczny w odzysku.");
  }

  if (family === "defensive-midfielder") {
    title = "Profil pod defensywnego pomocnika";
    subtitle = "Odzysk, przechwyty, odbiory, pressing, podania i błędy";

    if ((interceptions90 ?? 0) >= 2.5) positives.push("Wysokie przechwyty na 90 minut.");
    if ((recoveries90 ?? 0) >= 10) positives.push("Dużo odzyskanych piłek.");
    if ((tackles90 ?? 0) >= 1.5 || (tacklesTotal ?? 0) >= 50) positives.push("Aktywny w odbiorze.");
    if ((tacklePercent ?? 0) >= 75) positives.push("Dobra skuteczność odbioru.");
    if ((passPercent ?? 0) >= 88) positives.push("Bezpieczny w podaniu.");
    if ((forwardPasses90 ?? 0) >= 5) positives.push("Potrafi grać do przodu po odbiorze.");

    if ((errors ?? 0) >= 1) warnings.push("Zawinione bramki są groźne dla pozycji zabezpieczającej.");
    if (passPercent !== null && passPercent < 82) warnings.push("Niska celność podań jak na DP.");
    if ((losses90 ?? 0) >= 12) warnings.push("Za dużo strat jak na zawodnika zabezpieczającego.");
    if ((recoveries90 ?? 0) < 5 && (interceptions90 ?? 0) < 1.5) warnings.push("Liczby odbioru są słabe jak na DP.");
  }

  if (family === "centre-back") {
    title = "Profil pod środkowego obrońcę";
    subtitle = "Powietrze, przechwyty, wybicia, bloki, podania i błędy";

    if ((headersPercent ?? 0) >= 65) positives.push("Bardzo mocny w pojedynkach główkowych.");
    if ((headersWon ?? 0) >= 100) positives.push("Duża liczba wygranych główek.");
    if ((clearances90 ?? 0) >= 0.8) positives.push("Regularnie wybija zagrożenie.");
    if ((blocks90 ?? 0) >= 0.5) positives.push("Dobrze blokuje strzały i akcje.");
    if ((interceptions90 ?? 0) >= 2.5) positives.push("Dobre przechwyty jak na obrońcę.");
    if ((passPercent ?? 0) >= 88) positives.push("Bezpieczny w rozegraniu.");

    if ((errors ?? 0) >= 2) warnings.push("Kilka zawinionych bramek — poważna czerwona flaga.");
    else if ((errors ?? 0) === 1) warnings.push("Ma zawinioną bramkę — warto uważać.");
    if (headersPercent !== null && headersPercent < 50) warnings.push("Poniżej oczekiwań w powietrzu jak na stopera.");
    if (passPercent !== null && passPercent < 80) warnings.push("Ryzykowny lub niedokładny w rozegraniu.");
  }

  if (family === "general") {
    title = "Profil ogólny";
    subtitle = "Ogólne potwierdzenie liczbami bez jednej wybranej pozycji";

    if ((goals90 ?? 0) >= 0.35 || (xg90 ?? 0) >= 0.3) positives.push("Daje zagrożenie bramkowe.");
    if ((keyPasses90 ?? 0) >= 1.5 || (xa90 ?? 0) >= 0.18) positives.push("Daje kreację.");
    if ((dribbles90 ?? 0) >= 4) positives.push("Aktywny w dryblingu.");
    if ((recoveries90 ?? 0) >= 10 || (interceptions90 ?? 0) >= 2.5) positives.push("Dobrze wygląda bez piłki.");
    if ((crosses90 ?? 0) >= 5) positives.push("Często dośrodkowuje.");

    if ((losses90 ?? 0) >= 18) warnings.push("Bardzo dużo strat.");
    if ((errors ?? 0) >= 1) warnings.push("Ma zawinione bramki.");
    if (passPercent !== null && passPercent < 75) warnings.push("Niska celność podań.");
  }

let tone = buildTone(positives, warnings);

const errorsMatterForPosition =
  family === "centre-back" ||
  family === "defensive-midfielder" ||
  family === "wide-defender";

if (errorsMatterForPosition) {
  if ((errors ?? 0) >= 2) {
    tone = "bad";
  } else if ((errors ?? 0) === 1 && tone === "good") {
    tone = "warning";
  }
}

return {
  title,
  subtitle,
  tone,
  summary: buildSummary(tone, positives, warnings),
  positives: positives.slice(0, 5),
  warnings: warnings.slice(0, 5),
};
}