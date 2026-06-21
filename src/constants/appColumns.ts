export const PLAYER_MARK_COLUMN = "Wybór";
export const ROLE_SCORE_COLUMN = "Dopasowanie";
export const CLUB_FORM_COLUMN = "Forma klubu";
export const MONEYBALL_COLUMN = "Moneyball";
export const CANDIDATE_TYPE_COLUMN = "Typ kandydata";
export const ROLE_SCORE_RANGE_COLUMN = "Zakres dopasowania";
export const ROLE_SCORE_UNCERTAINTY_COLUMN = "Niepewność";
export const ROLE_BEST_ROLE_COLUMN = "Najlepsza rola";
export const ROLE_PHASE_COLUMN = "Faza roli";
export const ROLE_SIDE_COLUMN = "Najlepsza strona";
export const ROLE_SIDE_SCORE_COLUMN = "Dopasowanie strony";
export const ROLE_SIDE_PROFILE_COLUMN = "Profil strony";
export const OVERALL_POSITION_COLUMN = "Najlepsza pozycja ogólnie";
export const OVERALL_ROLE_COLUMN = "Najlepsza rola ogólnie";
export const OVERALL_SCORE_COLUMN = "Dopasowanie ogólne";

export const ROLE_ANALYSIS_COLUMNS = [
  ROLE_SCORE_COLUMN,
  CLUB_FORM_COLUMN,
  MONEYBALL_COLUMN,
  CANDIDATE_TYPE_COLUMN,
  ROLE_SCORE_RANGE_COLUMN,
  ROLE_SCORE_UNCERTAINTY_COLUMN,
  ROLE_BEST_ROLE_COLUMN,
  ROLE_PHASE_COLUMN,
  ROLE_SIDE_COLUMN,
  ROLE_SIDE_SCORE_COLUMN,
  ROLE_SIDE_PROFILE_COLUMN,
  OVERALL_POSITION_COLUMN,
  OVERALL_ROLE_COLUMN,
  OVERALL_SCORE_COLUMN,
];

export const COMPACT_TABLE_COLUMNS = new Set([
  PLAYER_MARK_COLUMN,
  "Nazwisko",
  ROLE_SCORE_COLUMN,
  CLUB_FORM_COLUMN,
  MONEYBALL_COLUMN,
  CANDIDATE_TYPE_COLUMN,
  ROLE_BEST_ROLE_COLUMN,
  ROLE_PHASE_COLUMN,
  "Pozycja",
  "Wiek",
  "Klub",
  "Liga",
  "Minuty",
]);

export function insertRoleAnalysisColumns(headers: string[]): string[] {
  const cleanHeaders = headers.filter(
    (header) =>
      header !== PLAYER_MARK_COLUMN && !ROLE_ANALYSIS_COLUMNS.includes(header)
  );

  const nameIndex = cleanHeaders.indexOf("Nazwisko");

  if (nameIndex === -1) {
    return [PLAYER_MARK_COLUMN, ...ROLE_ANALYSIS_COLUMNS, ...cleanHeaders];
  }

  return [
    ...cleanHeaders.slice(0, nameIndex),
    PLAYER_MARK_COLUMN,
    cleanHeaders[nameIndex],
    ...ROLE_ANALYSIS_COLUMNS,
    ...cleanHeaders.slice(nameIndex + 1),
  ];
}