import type { TableRow } from "../types/table";

export type SquadDepthTarget = {
  min: number;
  ideal?: number;
};

export type SquadDepthStatus = "empty" | "low" | "ok" | "high";

export type SquadDepthItem = {
  position: string;
  players: TableRow[];
  count: number;
  target?: SquadDepthTarget;
  status: SquadDepthStatus;
};

export const SQUAD_POSITION_TARGETS: Record<string, SquadDepthTarget> = {
  Bramkarz: {
    min: 2,
    ideal: 3,
  },
  "Boczny obrońca": {
    min: 3,
    ideal: 4,
  },
  "Środkowy obrońca": {
    min: 3,
    ideal: 4,
  },
  Wahadłowy: {
    min: 0,
    ideal: 2,
  },
  "Defensywny pomocnik": {
    min: 1,
    ideal: 2,
  },
  "Środkowy pomocnik": {
    min: 2,
    ideal: 3,
  },
  "Boczny pomocnik": {
    min: 0,
    ideal: 2,
  },
  Skrzydłowy: {
    min: 3,
    ideal: 4,
  },
  "Ofensywny pomocnik": {
    min: 1,
    ideal: 2,
  },
  Napastnik: {
    min: 2,
    ideal: 3,
  },
};