import {
  CANDIDATE_TYPE_COLUMN,
  CLUB_FORM_COLUMN,
  ROLE_BEST_ROLE_COLUMN,
  ROLE_PHASE_COLUMN,
  ROLE_SCORE_COLUMN,
} from "../constants/appColumns";
import type { TableRow } from "../types/table";

type AttributeInsight = {
  attribute: string;
  value: number;
  valueText: string;
};

type RoleInsightsForReasons = {
  strengths: AttributeInsight[];
  weaknesses: AttributeInsight[];
};

type BuildPlayerDecisionReasonsArgs = {
  player: TableRow;
  roleInsights: RoleInsightsForReasons;
  decisionLabel: string;
};

export type PlayerDecisionReasons = {
  summary: string;
  positives: string[];
  risks: string[];
};

function getText(row: TableRow, key: string, fallback = "-"): string {
  const value = row[key];

  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function parseScore(value: unknown): number | null {
  const parsed = Number(String(value ?? "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function includesAny(value: string, patterns: string[]): boolean {
  const normalized = value.toLowerCase();

  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

function pushUnique(list: string[], value: string) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function limitList(list: string[], limit: number) {
  return list.slice(0, limit);
}

export function buildPlayerDecisionReasons({
  player,
  roleInsights,
  decisionLabel,
}: BuildPlayerDecisionReasonsArgs): PlayerDecisionReasons {
  const positives: string[] = [];
  const risks: string[] = [];

  const score = parseScore(player[ROLE_SCORE_COLUMN]);
  const roleName = getText(player, ROLE_BEST_ROLE_COLUMN);
  const phaseLabel = getText(player, ROLE_PHASE_COLUMN);
  const candidateType = getText(player, CANDIDATE_TYPE_COLUMN, "");
  const clubForm = getText(player, CLUB_FORM_COLUMN, "");
  const info = getText(player, "Inf", "");

  if (score !== null) {
    if (score >= 80) {
      pushUnique(
        positives,
        `Elitarny wynik dopasowania: ${score.toFixed(1)} do aktualnej analizy.`
      );
    } else if (score >= 70) {
      pushUnique(
        positives,
        `Mocny wynik dopasowania: ${score.toFixed(1)} — realny kandydat do gry.`
      );
    } else if (score >= 60) {
      pushUnique(
        positives,
        `Akceptowalny wynik dopasowania: ${score.toFixed(1)} — raczej rotacja lub wariant.`
      );
      pushUnique(
        risks,
        `Nie jest to topowy wynik do tej roli — wymaga kontekstu taktycznego.`
      );
    } else {
      pushUnique(
        risks,
        `Niski wynik dopasowania: ${score.toFixed(1)} — ryzykowny wybór do tej analizy.`
      );
    }
  } else {
    pushUnique(risks, "Brak policzonego wyniku dopasowania dla aktualnej analizy.");
  }

  if (roleName !== "-" && phaseLabel !== "-") {
    pushUnique(positives, `Najlepszy kontekst: ${roleName} · ${phaseLabel}.`);
  }

  if (includesAny(candidateType, ["naturalny"])) {
    pushUnique(positives, "Naturalne dopasowanie pozycyjne — bez dużego eksperymentu.");
  } else if (includesAny(candidateType, ["bliski"])) {
    pushUnique(positives, "Bliski profil pozycyjny — sensowna adaptacja.");
  } else if (
    candidateType &&
    !includesAny(candidateType, ["-", "brak", "naturalny", "bliski"])
  ) {
    pushUnique(risks, `Eksperyment pozycyjny: ${candidateType}.`);
  }

  if (clubForm.includes("(+")) {
    pushUnique(positives, `Forma klubowa pomaga: ${clubForm}.`);
  }

  if (/\(-/.test(clubForm)) {
    pushUnique(risks, `Forma klubowa obniża ocenę: ${clubForm}.`);
  }

  for (const item of roleInsights.strengths.slice(0, 4)) {
    if (item.value >= 14) {
      pushUnique(
        positives,
        `Mocny atrybut pod rolę: ${item.attribute} ${item.valueText}.`
      );
    }
  }

  for (const item of roleInsights.weaknesses.slice(0, 4)) {
    if (item.value <= 10) {
      pushUnique(
        risks,
        `Słabszy wymagany atrybut: ${item.attribute} ${item.valueText}.`
      );
    }
  }

  if (includesAny(info, ["ktz"])) {
    pushUnique(risks, "Status zawodnika wskazuje kontuzję lub problem zdrowotny.");
  } else if (info !== "-") {
    pushUnique(risks, `Dodatkowy status do sprawdzenia: ${info}.`);
  }

  if (decisionLabel.toLowerCase().includes("wybrany")) {
    pushUnique(positives, `Jest już w Twojej selekcji: ${decisionLabel}.`);
  }

  const summary =
    score !== null && score >= 75
      ? "Profil wygląda mocno dla aktualnej analizy."
      : score !== null && score >= 60
        ? "Profil jest użyteczny, ale wymaga świadomego kontekstu."
        : "Profil wygląda ryzykownie dla aktualnej analizy.";

  return {
    summary,
    positives: limitList(
      positives.length > 0 ? positives : ["Brak wyraźnych plusów w aktualnej analizie."],
      6
    ),
    risks: limitList(
      risks.length > 0 ? risks : ["Brak dużych czerwonych flag w aktualnej analizie."],
      6
    ),
  };
}