export type CompareMetricDefinition = {
  label: string;
  columns: string[];
  higherBetter?: boolean;
};

export type CompareMetricGroup = {
  title: string;
  metrics: CompareMetricDefinition[];
};

export const MONEYBALL_COMPARE_METRIC_GROUPS: CompareMetricGroup[] = [
  {
    title: "Produkcja",
    metrics: [
      {
        label: "Gole/90",
        columns: ["Liczba goli na 90 min", "Gole/90", "Brm/90"],
      },
      {
        label: "xG/90",
        columns: ["xG/90"],
      },
      {
        label: "Strz./90",
        columns: ["Strz./90"],
      },
      {
        label: "Celne strz.",
        columns: ["% strzałów"],
      },
    ],
  },
  {
    title: "Kreacja",
    metrics: [
      {
        label: "Asysty/90",
        columns: ["Asys./90", "Asysty/90", "Asys/90"],
      },
      {
        label: "xA/90",
        columns: ["xA/90"],
      },
      {
        label: "KP/90",
        columns: ["KP/90"],
      },
      {
        label: "KP z gry/90",
        columns: ["KPzG/90"],
      },
      {
        label: "Stw. syt./90",
        columns: ["StS/90"],
      },
    ],
  },
  {
    title: "Podania",
    metrics: [
      {
        label: "Podania %",
        columns: ["Pod %"],
      },
      {
        label: "Próby/90",
        columns: ["Pod/90"],
      },
      {
        label: "Celne/90",
        columns: ["PodC/90"],
      },
      {
        label: "Do przodu/90",
        columns: ["Podania dP/90"],
      },
      {
        label: "Straty/90",
        columns: ["Str Płk/90"],
        higherBetter: false,
      },
    ],
  },
  {
    title: "Dośrodkowania",
    metrics: [
      {
        label: "Próby/90",
        columns: ["Doś P/90"],
      },
      {
        label: "Próby z gry/90",
        columns: ["Pr Doś zG/90"],
      },
      {
        label: "Celne",
        columns: ["Doś C"],
      },
      {
        label: "Celne/90",
        columns: ["Doś P/90 (2)", "C Doś zG/90"],
      },
      {
        label: "Celne %",
        columns: ["Doś C/P"],
      },
    ],
  },
  {
    title: "Pressing",
    metrics: [
      {
        label: "Próby/90",
        columns: ["Pr Pres/90"],
      },
      {
        label: "Udane/90",
        columns: ["Ud Pres/90"],
      },
      {
        label: "Odzyskane/90",
        columns: ["Odz Płk/90"],
      },
      {
        label: "Przechw./90",
        columns: ["Prz/90"],
      },
    ],
  },
  {
    title: "Odbiór",
    metrics: [
      {
        label: "Próby odb.",
        columns: ["Wślizgi"],
      },
      {
        label: "Odbiory/90",
        columns: ["W/90"],
      },
      {
        label: "Odbiór %",
        columns: ["Odb%"],
      },
      {
        label: "Klucz. odb./90",
        columns: ["K Wś/90"],
      },
    ],
  },
  {
    title: "Defensywa",
    metrics: [
      {
        label: "Wybicia/90",
        columns: ["Wyb/90"],
      },
      {
        label: "Bloki/90",
        columns: ["Blk/90"],
      },
      {
        label: "Główki %",
        columns: ["% Głw"],
      },
      {
        label: "Wygr. główki",
        columns: ["Głw"],
      },
      {
        label: "Zaw. bramki",
        columns: ["ZwB"],
        higherBetter: false,
      },
    ],
  },
  {
    title: "Fizyczność/ryzyko",
    metrics: [
      {
        label: "Dystans/90",
        columns: ["Dyst./90"],
      },
      {
        label: "Sprinty/90",
        columns: ["Sprinty/90"],
      },
      {
        label: "Faule",
        columns: ["Faule"],
        higherBetter: false,
      },
      {
        label: "Żółte",
        columns: ["ŻK"],
        higherBetter: false,
      },
      {
        label: "Czerwone",
        columns: ["Czerwone kartki"],
        higherBetter: false,
      },
    ],
  },
];