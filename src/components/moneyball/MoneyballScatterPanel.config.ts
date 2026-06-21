import type { TableRow } from "../../types/table";
import { getNumberFromColumns } from "../../utils/moneyball";

export type MetricDefinition = {
  columns?: string[];
  getValue?: (row: TableRow) => number | null;
};

export type QuadrantTone = "good" | "warning" | "bad";

export type QuadrantLabel = {
  text: string;
  tone: QuadrantTone;
};

export type ChartPreset = {
  id: string;
  title: string;
  description: string;
  xLabel: string;
  yLabel: string;
  xMetric: MetricDefinition;
  yMetric: MetricDefinition;
  note: string;
  quadrants: {
    topLeft: QuadrantLabel;
    topRight: QuadrantLabel;
    bottomLeft: QuadrantLabel;
    bottomRight: QuadrantLabel;
  };
};


export type ComparisonFilter =
  | "auto"
  | "all"
  | "goalkeepers"
  | "strikers"
  | "attackers"
  | "wingers"
  | "midfielders"
  | "defensive-midfielders"
  | "defenders"
  | "centre-backs"
  | "wide-defenders";

export const COMPARISON_FILTERS: { id: ComparisonFilter; label: string }[] = [
  { id: "auto", label: "Auto z analizy" },
  { id: "all", label: "Wszyscy" },
  { id: "strikers", label: "Napastnicy" },
  { id: "attackers", label: "Ofensywni" },
  { id: "wingers", label: "Skrzydłowi" },
  { id: "midfielders", label: "Pomocnicy" },
  { id: "defensive-midfielders", label: "Defensywni pomocnicy" },
  { id: "defenders", label: "Obrońcy" },
  { id: "centre-backs", label: "Środkowi obrońcy" },
  { id: "wide-defenders", label: "Boczni / wahadła" },
];
export const GOALKEEPER_COMPARISON_FILTERS: {
  id: ComparisonFilter;
  label: string;
}[] = [
  { id: "auto", label: "Auto z analizy" },
  { id: "goalkeepers", label: "Bramkarze" },
];

export const MAX_HIGHLIGHTED_PLAYERS = 4;

export const HIGHLIGHT_COLORS = [
  "#ef4444",
  "#22c55e",
  "#60a5fa",
  "#facc15",
];

export function getHighlightColor(index: number): string {
  return HIGHLIGHT_COLORS[index] ?? "#f97316";
}


function getGoals90(row: TableRow): number | null {
  return getNumberFromColumns(row, [
    "Liczba goli na 90 min",
    "Gole/90",
    "Brm/90",
  ]);
}

function getShots90(row: TableRow): number | null {
  return getNumberFromColumns(row, ["Strz./90"]);
}

function getShotAccuracy(row: TableRow): number | null {
  return getNumberFromColumns(row, ["% strzałów"]);
}

function getShotConversion(row: TableRow): number | null {
  const direct = getNumberFromColumns(row, [
    "Skuteczność (%)",
    "Skuteczność %",
    "Skuteczność",
    "Skut%",
  ]);

  if (direct !== null) {
    return direct;
  }

  const goals90 = getGoals90(row);
  const shots90 = getShots90(row);

  if (goals90 === null || shots90 === null || shots90 <= 0) {
    return null;
  }

  return (goals90 / shots90) * 100;
}
export function normalizePositionText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ł/g, "L")
    .replace(/ł/g, "l")
    .toUpperCase();
}

export function isGoalkeeperRow(row: TableRow): boolean {
  const position = normalizePositionText(row["Pozycja"]);

  return (
    /^BR\b/.test(position) ||
    position.includes(" BR ") ||
    position.includes("BRAMKARZ")
  );
}

function getPer90FromTotal(row: TableRow, columns: string[]): number | null {
  const total = getNumberFromColumns(row, columns);
  const minutes = getNumberFromColumns(row, ["Minuty"]);

  if (total === null || minutes === null || minutes <= 0) {
    return null;
  }

  return (total * 90) / minutes;
}

function getGoalkeeperSavesPer90(row: TableRow): number | null {
  const direct = getNumberFromColumns(row, ["Obs/90", "Obr./90"]);

  if (direct !== null) {
    return direct;
  }

  return getPer90FromTotal(row, ["Obs"]);
}

function getGoalkeeperParriesPer90(row: TableRow): number | null {
  const direct = getNumberFromColumns(row, ["Sps/90"]);

  if (direct !== null) {
    return direct;
  }

  return getPer90FromTotal(row, ["Sps"]);
}

function getGoalkeeperParriesToCornerPer90(row: TableRow): number | null {
  const direct = getNumberFromColumns(row, ["Ssr/90"]);

  if (direct !== null) {
    return direct;
  }

  return getPer90FromTotal(row, ["Ssr"]);
}
function getHeadersWon90(row: TableRow): number | null {
  const direct = getNumberFromColumns(row, [
    "Głw/90",
    "Główki/90",
    "Wygrane główki/90",
  ]);

  if (direct !== null) {
    return direct;
  }

  const headersWon = getNumberFromColumns(row, ["Głw"]);
  const minutes = getNumberFromColumns(row, ["Minuty"]);

  if (headersWon === null || minutes === null || minutes <= 0) {
    return null;
  }

  return (headersWon * 90) / minutes;
}



export const CHART_PRESETS: ChartPreset[] = [
  {
    id: "shooting",
    title: "Strzelanie",
    description: "Agresywność strzałów i precyzja uderzeń.",
    xLabel: "Celne strzały (%)",
    yLabel: "Strzały/90",
    xMetric: { getValue: getShotAccuracy },
    yMetric: { getValue: getShots90 },
    note: "Prawy górny róg = dużo strzałów i dobra celność.",
    quadrants: {
      topLeft: {
        text: "Agresywne strzały\nNieprecyzyjne strzały",
        tone: "warning",
      },
      topRight: {
        text: "Agresywne strzały\nPrecyzyjne strzały",
        tone: "good",
      },
      bottomLeft: {
        text: "Pasywne strzały\nNieprecyzyjne strzały",
        tone: "bad",
      },
      bottomRight: {
        text: "Pasywne strzały\nPrecyzyjne strzały",
        tone: "warning",
      },
    },
  },
  {
    id: "goals",
    title: "Zdobywane bramki",
    description: "Skuteczność wykańczania i gole na 90 minut.",
    xLabel: "Skuteczność (%)",
    yLabel: "Gole/90",
    xMetric: { getValue: getShotConversion },
    yMetric: { getValue: getGoals90 },
    note: "Prawy górny róg = skuteczny atak i dużo goli.",
    quadrants: {
      topLeft: {
        text: "Skuteczny atak\nNieskuteczne strzały",
        tone: "warning",
      },
      topRight: {
        text: "Skuteczny atak\nPrecyzyjne strzały",
        tone: "good",
      },
      bottomLeft: {
        text: "Nieskuteczny atak\nNieskuteczne strzały",
        tone: "bad",
      },
      bottomRight: {
        text: "Nieskuteczny atak\nPrecyzyjne strzały",
        tone: "warning",
      },
    },
  },
  {
    id: "expected",
    title: "Oczekiwana skuteczność",
    description: "Jakość sytuacji bramkowych i kreacyjnych.",
    xLabel: "xA/90",
    yLabel: "xG/90",
    xMetric: { columns: ["xA/90"] },
    yMetric: { columns: ["xG/90"] },
    note: "Prawy górny róg = wysoka wartość xG i xA.",
    quadrants: {
      topLeft: {
        text: "Wysoka wartość xG\nNiska kreacja",
        tone: "warning",
      },
      topRight: {
        text: "Wysoka wartość xG\nWysoka kreacja",
        tone: "good",
      },
      bottomLeft: {
        text: "Niska wartość xG\nNiska kreacja",
        tone: "bad",
      },
      bottomRight: {
        text: "Niska wartość xG\nWysoka kreacja",
        tone: "warning",
      },
    },
  },
  {
    id: "assists",
    title: "Asysty",
    description: "Jakość kreacji i liczba kluczowych podań.",
    xLabel: "Oczekiwane asysty z gry/90 min",
    yLabel: "Kluczowe podania/90 min",
    xMetric: { columns: ["xA/90"] },
    yMetric: { columns: ["KPzG/90", "KP/90"] },
    note: "Prawy górny róg = bardzo kreatywny zawodnik.",
    quadrants: {
      topLeft: {
        text: "Bardzo kreatywny\nPodania z gry niskiej jakości",
        tone: "warning",
      },
      topRight: {
        text: "Bardzo kreatywny\nPodania z gry wysokiej jakości",
        tone: "good",
      },
      bottomLeft: {
        text: "Mniej kreatywny\nPodania z gry niskiej jakości",
        tone: "bad",
      },
      bottomRight: {
        text: "Mniej kreatywny\nPodania z gry wysokiej jakości",
        tone: "warning",
      },
    },
  },
  {
    id: "crossing",
    title: "Dośrodkowania",
    description: "Aktywność i jakość wrzutek z bocznych sektorów.",
    xLabel: "Udane dośrodkowania %",
    yLabel: "Próby dośrodkowań/90 min",
    xMetric: { columns: ["Doś C/P"] },
    yMetric: { columns: ["Doś P/90", "Pr Doś zG/90"] },
    note: "Prawy górny róg = dużo dośrodkowań i dobra jakość.",
    quadrants: {
      topLeft: {
        text: "Wiele dośrodkowań\nNieudane dośrodkowania",
        tone: "warning",
      },
      topRight: {
        text: "Wiele dośrodkowań\nUdane dośrodkowania",
        tone: "good",
      },
      bottomLeft: {
        text: "Mniej dośrodkowań\nNieudane dośrodkowania",
        tone: "bad",
      },
      bottomRight: {
        text: "Mniej dośrodkowań\nUdane dośrodkowania",
        tone: "warning",
      },
    },
  },
  {
    id: "aerial",
    title: "Gra w powietrzu",
    description: "Skuteczność i częstotliwość pojedynków główkowych.",
    xLabel: "Wygrane pojedynki główkowe (%)",
    yLabel: "Próby zagrań głową/90 min",
    xMetric: { columns: ["% Głw"] },
    yMetric: { getValue: getHeadersWon90 },
    note: "Prawy górny róg = dużo główek i skuteczna gra głową.",
    quadrants: {
      topLeft: {
        text: "Wiele główek\nKiepska gra głową",
        tone: "warning",
      },
      topRight: {
        text: "Wiele główek\nSkuteczna gra głową",
        tone: "good",
      },
      bottomLeft: {
        text: "Mniej główek\nKiepska gra głową",
        tone: "bad",
      },
      bottomRight: {
        text: "Mniej główek\nSkuteczna gra głową",
        tone: "warning",
      },
    },
  },
  {
    id: "tackling",
    title: "Próby odbioru piłki",
    description: "Aktywność w odbiorze i skuteczność prób odbioru.",
    xLabel: "Skuteczność wślizgów (%)",
    yLabel: "Próby odbiorów piłki/90 min",
    xMetric: { columns: ["Odb%"] },
    yMetric: { columns: ["W/90"] },
    note: "Prawy górny róg = dużo prób odbioru i wysoka skuteczność.",
    quadrants: {
      topLeft: {
        text: "Wiele ataków na piłkę\nNieskuteczny odbiór",
        tone: "warning",
      },
      topRight: {
        text: "Wiele ataków na piłkę\nSkuteczny odbiór",
        tone: "good",
      },
      bottomLeft: {
        text: "Mniej ataków na piłkę\nNieskuteczny odbiór",
        tone: "bad",
      },
      bottomRight: {
        text: "Mniej ataków na piłkę\nSkuteczny odbiór",
        tone: "warning",
      },
    },
  },
  {
    id: "passing",
    title: "Podania",
    description: "Liczba podań i celność podań.",
    xLabel: "Celność podań (%)",
    yLabel: "Próby podań/90 min",
    xMetric: { columns: ["Pod %"] },
    yMetric: { columns: ["Pod/90"] },
    note: "Prawy górny róg = dużo podań i dobra celność.",
    quadrants: {
      topLeft: {
        text: "Wiele podań\nNiedokładne podania",
        tone: "warning",
      },
      topRight: {
        text: "Wiele podań\nPrecyzyjne podania",
        tone: "good",
      },
      bottomLeft: {
        text: "Mniej podań\nNiedokładne podania",
        tone: "bad",
      },
      bottomRight: {
        text: "Mniej podań\nPrecyzyjne podania",
        tone: "warning",
      },
    },
  },
  {
    id: "progressive-passing",
    title: "Progresja podań",
    description: "Celność podań i liczba podań do przodu.",
    xLabel: "Podania do przodu/90 min",
    yLabel: "Celność podań (%)",
    xMetric: { columns: ["Podania dP/90"] },
    yMetric: { columns: ["Pod %"] },
    note: "Prawy górny róg = dużo celnych podań progresywnych.",
    quadrants: {
      topLeft: {
        text: "Precyzyjne podania\nMało celnych podań progresywnych",
        tone: "warning",
      },
      topRight: {
        text: "Precyzyjne podania\nWiele celnych podań progresywnych",
        tone: "good",
      },
      bottomLeft: {
        text: "Niedokładne podania\nMało celnych podań progresywnych",
        tone: "bad",
      },
      bottomRight: {
        text: "Niedokładne podania\nWiele celnych podań progresywnych",
        tone: "warning",
      },
    },
  },
  {
    id: "possession",
    title: "Posiadanie piłki",
    description: "Odzyskane piłki kontra straty.",
    xLabel: "Stracone piłki/90 min",
    yLabel: "Odzyskane piłki/90 min",
    xMetric: { columns: ["Str Płk/90"] },
    yMetric: { columns: ["Odz Płk/90"] },
    note: "Lewy górny róg = często odzyskuje piłkę i rzadko ją traci.",
    quadrants: {
      topLeft: {
        text: "Często zdobywa piłkę\nDobrze pilnuje piłki",
        tone: "good",
      },
      topRight: {
        text: "Często zdobywa piłkę\nŁatwo traci piłkę",
        tone: "warning",
      },
      bottomLeft: {
        text: "Rzadko zdobywa piłkę\nDobrze pilnuje piłki",
        tone: "warning",
      },
      bottomRight: {
        text: "Rzadko zdobywa piłkę\nŁatwo traci piłkę",
        tone: "bad",
      },
    },
  },
  {
    id: "defending",
    title: "Defensywa",
    description: "Wybicia i bloki w działaniach defensywnych.",
    xLabel: "Wybite piłki/90 min",
    yLabel: "Bloki/90 min",
    xMetric: { columns: ["Wyb/90"] },
    yMetric: { columns: ["Blk/90"] },
    note: "Prawy górny róg = dużo wybić i dużo bloków.",
    quadrants: {
      topLeft: {
        text: "Wiele bloków\nMniej wybić piłki",
        tone: "warning",
      },
      topRight: {
        text: "Wiele bloków\nWiele wybić piłki",
        tone: "good",
      },
      bottomLeft: {
        text: "Mniej bloków\nMniej wybić piłki",
        tone: "bad",
      },
      bottomRight: {
        text: "Mniej bloków\nWiele wybić piłki",
        tone: "warning",
      },
    },
  },
  {
    id: "motor",
    title: "Aktywność motoryczna",
    description: "Dystans i sprinty na 90 minut.",
    xLabel: "Intensywne sprinty/90 min",
    yLabel: "Pokonana odległość/90 min",
    xMetric: { columns: ["Sprinty/90"] },
    yMetric: { columns: ["Dyst./90"] },
    note: "Prawy górny róg = wysoka aktywność fizyczna.",
    quadrants: {
      topLeft: {
        text: "Wysoki pokonany dystans\nNiska liczba udanych sprintów",
        tone: "warning",
      },
      topRight: {
        text: "Wysoki pokonany dystans\nWysoka liczba udanych sprintów",
        tone: "good",
      },
      bottomLeft: {
        text: "Niski pokonany dystans\nNiska liczba udanych sprintów",
        tone: "bad",
      },
      bottomRight: {
        text: "Niski pokonany dystans\nWysoka liczba udanych sprintów",
        tone: "warning",
      },
    },
  },
  {
    id: "movement",
    title: "Ruch na boisku",
    description: "Dryblingi i faule na 90 minut.",
    xLabel: "Faule na/90 min",
    yLabel: "Dryblingi/90 min",
    xMetric: { columns: ["Faule"] },
    yMetric: { columns: ["Drb/90"] },
    note: "Lewy górny róg = dużo dryblingów i rzadko faulowany.",
    quadrants: {
      topLeft: {
        text: "Wiele dryblingów\nRzadko faulowany",
        tone: "good",
      },
      topRight: {
        text: "Wiele dryblingów\nCzęsto faulowany",
        tone: "warning",
      },
      bottomLeft: {
        text: "Mniej dryblingów\nRzadko faulowany",
        tone: "warning",
      },
      bottomRight: {
        text: "Mniej dryblingów\nCzęsto faulowany",
        tone: "bad",
      },
    },
  },
];

export const GOALKEEPER_CHART_PRESETS: ChartPreset[] = [
  {
    id: "gk-saving",
    title: "Gra na bramce",
    description: "Procent obron i liczba interwencji na 90 minut.",
    xLabel: "Procent obron (%)",
    yLabel: "Obronione/90 min",
    xMetric: { columns: ["OS %"] },
    yMetric: { getValue: getGoalkeeperSavesPer90 },
    note: "Prawy górny róg = broni dużo strzałów i ma wysoki procent obron.",
    quadrants: {
      topLeft: {
        text: "Dużo obr. strzałów\nBroni mniejszy procent",
        tone: "warning",
      },
      topRight: {
        text: "Dużo obr. strzałów\nBroni większość strzałów",
        tone: "good",
      },
      bottomLeft: {
        text: "Mało obr. strzałów\nBroni mniejszy procent",
        tone: "bad",
      },
      bottomRight: {
        text: "Mało obr. strzałów\nBroni większość strzałów",
        tone: "warning",
      },
    },
  },
  {
    id: "gk-advanced-saving",
    title: "Zaawansowana gra na bramce",
    description: "Procent obron i gole uniknięte względem xG.",
    xLabel: "Procent obron (%)",
    yLabel: "Uniknięte oczekiwane gole",
    xMetric: { columns: ["OS %"] },
    yMetric: { columns: ["xGUn"] },
    note: "Prawy górny róg = wysoki procent obron i dodatnie xG uniknięte.",
    quadrants: {
      topLeft: {
        text: "Dobre xG uniknięte\nNiższy procent obron",
        tone: "warning",
      },
      topRight: {
        text: "Skutecznie broni strzały\nBroni powyżej oczekiwań",
        tone: "good",
      },
      bottomLeft: {
        text: "Kiepsko broni strzały\nBroni poniżej oczekiwań",
        tone: "bad",
      },
      bottomRight: {
        text: "Wysoki procent obron\nSłabe xG uniknięte",
        tone: "warning",
      },
    },
  },
  {
    id: "gk-parries",
    title: "Kontrola interwencji",
    description: "Sparowane strzały i odbicia na róg.",
    xLabel: "Sparowane strzały/90",
    yLabel: "Strzały sparowane na róg/90",
    xMetric: { getValue: getGoalkeeperParriesPer90 },
    yMetric: { getValue: getGoalkeeperParriesToCornerPer90 },
    note: "Niższy dół = mniej odbić na róg po interwencji.",
    quadrants: {
      topLeft: {
        text: "Mniej paruje\nCzęsto na róg",
        tone: "warning",
      },
      topRight: {
        text: "Często paruje\nCzęsto na róg",
        tone: "bad",
      },
      bottomLeft: {
        text: "Mniej paruje\nRzadziej na róg",
        tone: "good",
      },
      bottomRight: {
        text: "Często paruje\nRzadziej na róg",
        tone: "warning",
      },
    },
  },
  {
    id: "gk-distribution",
    title: "Dystrybucja",
    description: "Celność i liczba podań bramkarza.",
    xLabel: "Celność podań (%)",
    yLabel: "Podania/90",
    xMetric: { columns: ["Pod %"] },
    yMetric: { columns: ["Pod/90"] },
    note: "Prawy górny róg = aktywny i dokładny w rozegraniu.",
    quadrants: {
      topLeft: {
        text: "Dużo podań\nNiższa celność",
        tone: "warning",
      },
      topRight: {
        text: "Dużo podań\nWysoka celność",
        tone: "good",
      },
      bottomLeft: {
        text: "Mało podań\nNiższa celność",
        tone: "bad",
      },
      bottomRight: {
        text: "Mało podań\nWysoka celność",
        tone: "warning",
      },
    },
  },
];