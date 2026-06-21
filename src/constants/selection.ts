export type PlayerMark = "selected" | "rejected";

export const SELECTION_POSITION_OPTIONS = [
  "Bramkarz",
  "Boczny obrońca",
  "Środkowy obrońca",
  "Wahadłowy",
  "Defensywny pomocnik",
  "Środkowy pomocnik",
  "Boczny pomocnik",
  "Skrzydłowy",
  "Ofensywny pomocnik",
  "Napastnik",
];

export const SELECTION_POSITION_ORDER: Record<string, number> = {
  Bramkarz: 0,
  "Boczny obrońca": 10,
  "Środkowy obrońca": 20,
  "Defensywny pomocnik": 30,
  "Środkowy pomocnik": 40,
  "Boczny pomocnik": 50,
  Skrzydłowy: 60,
  "Ofensywny pomocnik": 70,
  Napastnik: 80,
};