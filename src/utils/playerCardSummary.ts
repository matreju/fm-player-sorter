import type { PlayerMark } from "../constants/selection";
import {
  CANDIDATE_TYPE_COLUMN,
  CLUB_FORM_COLUMN,
  MONEYBALL_COLUMN,
  ROLE_BEST_ROLE_COLUMN,
  ROLE_PHASE_COLUMN,
  ROLE_SCORE_COLUMN,
} from "../constants/appColumns";
import type { TableRow } from "../types/table";
import { getPlayerKey } from "./playerIdentity";

function getText(row: TableRow, key: string, fallback = "-") {
  const value = row[key];

  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function getClubFormTone(value: string): "positive" | "neutral" | "negative" {
  if (value.includes("(+")) {
    return "positive";
  }

  if (/\(-/.test(value)) {
    return "negative";
  }

  return "neutral";
}

export type PlayerCardSummary = {
  key: string;
  name: string;
  club: string;
  position: string;
  age: string;

  analysisScoreLabel: string;
  analysisRoleName: string;
  analysisPhaseLabel: string;
  candidateKindLabel: string;

  clubFormLabel: string;
  clubFormTone: "positive" | "neutral" | "negative";

  moneyballSummary: string;
  footLabel: string;

  mark: PlayerMark | null;
};

export function buildPlayerCardSummary(row: TableRow): PlayerCardSummary {
  const clubFormLabel = getText(row, CLUB_FORM_COLUMN);

  return {
    key: getPlayerKey(row),
    name: getText(row, "Nazwisko"),
    club: getText(row, "Klub"),
    position: getText(row, "Pozycja"),
    age: getText(row, "Wiek"),

    // WAŻNE:
    // To są wartości już policzone w App.tsx dla aktualnie wybranej analizy.
    // Dzięki temu kafelki pokazują to samo co tabela i panel szczegółów.
    analysisScoreLabel: getText(row, ROLE_SCORE_COLUMN),
    analysisRoleName: getText(row, ROLE_BEST_ROLE_COLUMN),
    analysisPhaseLabel: getText(row, ROLE_PHASE_COLUMN),
    candidateKindLabel: getText(row, CANDIDATE_TYPE_COLUMN),

    clubFormLabel,
    clubFormTone: getClubFormTone(clubFormLabel),

    moneyballSummary: getText(row, MONEYBALL_COLUMN),

    footLabel: `L: ${getText(row, "Lewa noga")} · P: ${getText(
      row,
      "Prawa noga"
    )}`,

    mark: null,
  };
}