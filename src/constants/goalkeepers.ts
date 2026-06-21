export const GOALKEEPER_POSITION_GROUP = "Bramkarz";

export const GOALKEEPER_ATTRIBUTE_COLUMNS = [
  "Zasięg wyskoku",
  "Gra na przedpolu",
  "Komunikacja",
  "Ekscentryczność",
  "Chwytanie",
  "Wykopy",
  "Jeden na jednego",
  "Piąstkowanie",
  "Refleks",
  "Wychodzenie poza pole karne",
  "Wyrzuty",
] as const;

export const GOALKEEPER_MENTAL_AND_PHYSICAL_COLUMNS = [
  "Przyspieszenie",
  "Zwinność",
  "Koncentracja",
  "Ustawianie się",
  "Przewidywanie",
  "Opanowanie",
  "Decyzje",
] as const;

export const GOALKEEPER_ON_BALL_COLUMNS = [
  "Podania",
  "Przyjęcie piłki",
  "Opanowanie",
  "Decyzje",
  "Wykopy",
  "Wyrzuty",
] as const;

export const GOALKEEPER_STAT_COLUMNS = [
  "xGUn",
  "ZxG/90",
  "xOS %",
  "OS %",
  "Obs",
  "Sps",
  "Ssr",
] as const;

export type GoalkeeperCompareGroup = {
  name: string;
  attributes: string[];
};

export const GOALKEEPER_COMPARE_GROUPS: GoalkeeperCompareGroup[] = [
  {
    name: "Bramkarskie",
    attributes: [
      "Chwytanie",
      "Gra na przedpolu",
      "Komunikacja",
      "Refleks",
      "Jeden na jednego",
      "Piąstkowanie",
      "Wychodzenie poza pole karne",
      "Wykopy",
      "Wyrzuty",
      "Zasięg wyskoku",
      "Ekscentryczność",
    ],
  },
  {
    name: "Bramkarz — mental/fizyczne",
    attributes: [
      "Koncentracja",
      "Ustawianie się",
      "Przewidywanie",
      "Decyzje",
      "Opanowanie",
      "Zwinność",
      "Przyspieszenie",
    ],
  },
];