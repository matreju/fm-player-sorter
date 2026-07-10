import { ROLE_DEFINITIONS } from "../constants/roles";
import type { TableRow } from "../types/table";
import type { RoleScoreResult } from "./roleScoring";

type PlayerRoleAttributeInsight = {
  attribute: string;
  value: number;
  valueText: string;
};

type PlayerRoleInsights = {
  strengths: PlayerRoleAttributeInsight[];
  weaknesses: PlayerRoleAttributeInsight[];
};

export type PlayerNationalRankInfo = {
  rank: number;
  total: number;
  value: number;
  valueText: string;
  label: string;
  percentileFromTop: number;
};

export type PlayerNationalReportItem = {
  title: string;
  meta: string;
  value?: string;
  rank?: PlayerNationalRankInfo | null;
};

export type PlayerNationalReport = {
  summary: string;
  mainLine: string;
  roleRank: PlayerNationalRankInfo | null;
  overallAbilityRank: PlayerNationalRankInfo | null;
  attributeRanks: Record<string, PlayerNationalRankInfo | null>;
  pros: PlayerNationalReportItem[];
  risks: PlayerNationalReportItem[];
};

type StatDirection = "higher-is-better" | "lower-is-better";

type StatColumnMeta = {
  column: string;
  label: string;
  direction: StatDirection;
  relevance: number;
};

const ATTRIBUTE_COLUMNS = new Set(
  ROLE_DEFINITIONS.flatMap((role) => [
    ...(role.coreAttributes ?? []),
    ...role.keyAttributes,
    ...role.importantAttributes,
    ...(role.supportAttributes ?? []),
  ])
);

const EXACT_EXCLUDED_COLUMNS = new Set([
  "Nazwisko",
  "Imię",
  "Pozycja",
  "Klub",
  "Liga",
  "Kraj",
  "Narodowość",
  "Wiek",
  "UID",
  "ID",
  "Unique ID",
  "OU",
  "CA",
  "PA",
  "Dopasowanie",
  "Forma klubu",
  "Typ kandydata",
  "Najlepsza rola",
  "Faza roli",
  "Zakres wyniku",
  "Niepewność",
  "Noga",
  "Lewa noga",
  "Prawa noga",
  "Decyzja",
  "Powołanie",
  "Kandydat",
  "Moneyball",
]);

const EXCLUDED_COLUMN_PARTS = [
  "warto",
  "pensj",
  "płac",
  "kontrakt",
  "data",
  "urodz",
  "narod",
  "reputac",
  "osobowo",
  "charakter",
  "agent",
  "status",
  "kontuz",
  "dostęp",
  "morale",
  "zadowolen",
  "klauzul",
  "transfer",
  "wypożycz",
  "scout",
  "raport",
  "gwiazd",
  "potencjał",
  "obecne umiejętności",
  "obecne umiejetnosci",
];

const STAT_LIKE_PARTS = [
  "/90",
  "%",
  "gole",
  "bramki",
  "asyst",
  "xg",
  "xa",
  "strz",
  "celne",
  "podania",
  "podan",
  "klucz",
  "kp",
  "drybl",
  "doś",
  "dos",
  "dośr",
  "dosr",
  "press",
  "pres",
  "odbiór",
  "odbior",
  "odzysk",
  "przechwyt",
  "interception",
  "posiadanie",
  "possession",
  "wślizg",
  "wslizg",
  "głów",
  "glow",
  "header",
  "faul",
  "kart",
  "żółt",
  "zolt",
  "czerwon",
  "strac",
  "błęd",
  "bled",
  "minuty",
  "występy",
  "wystepy",
  "mecze",
  "śr. ocena",
  "sr. ocena",
  "ocena",
];

const NEGATIVE_STAT_PARTS = [
  "faul",
  "kart",
  "żółt",
  "zolt",
  "czerwon",
  "strac",
  "utrac",
  "błęd",
  "bled",
  "samob",
  "przegrane",
  "spalone",
  "spalon",
];

const KNOWN_STAT_LABELS: Record<string, string> = {
  "gole/90": "Gole / 90 minut",
  "bramki/90": "Bramki / 90 minut",
  "xg/90": "Oczekiwane gole / 90 minut",
  "strz/90": "Strzały / 90 minut",
  "strzaly/90": "Strzały / 90 minut",
  "celne strzaly %": "Celność strzałów",
  "celne strz %": "Celność strzałów",
  "asysty/90": "Asysty / 90 minut",
  "xa/90": "Oczekiwane asysty / 90 minut",
  "kp/90": "Kluczowe podania / 90 minut",
  "kluczowe podania/90": "Kluczowe podania / 90 minut",
  "podania %": "Celność podań",
  "podan %": "Celność podań",
  "proby/90": "Próby podań / 90 minut",
  "próby/90": "Próby podań / 90 minut",
  "celne/90": "Celne podania / 90 minut",
  "proby dos/90": "Próby dośrodkowań / 90 minut",
  "proby dosr/90": "Próby dośrodkowań / 90 minut",
  "próby dos/90": "Próby dośrodkowań / 90 minut",
  "próby dosr/90": "Próby dośrodkowań / 90 minut",
  "celne dos %": "Celność dośrodkowań",
  "celne dosr %": "Celność dośrodkowań",
  "celne dos": "Celne dośrodkowania",
  "celne dosr": "Celne dośrodkowania",
  "pressing/90": "Akcje pressingowe / 90 minut",
  "ud pressing/90": "Udany pressing / 90 minut",
  "odzyskane/90": "Odzyskane piłki / 90 minut",
  "dryblingi/90": "Dryblingi / 90 minut",
  "udane dryblingi/90": "Udane dryblingi / 90 minut",
  "przechwyty/90": "Przechwyty / 90 minut",
  "odbiory/90": "Odbiory piłki / 90 minut",
  "wslizgi/90": "Wślizgi / 90 minut",
  "posiadanie odzyskane/90": "Posiadanie odzyskane / 90 minut",
  "glowki wygrane/90": "Wygrane główki / 90 minut",
  "sr ocena": "Średnia ocena",
  "srednia ocena": "Średnia ocena",
  "srednia ocena w klubie": "Średnia ocena klubowa",
  "sr ocena w klubie": "Średnia ocena klubowa",
  "wystepy": "Występy",
  "mecze": "Mecze",
  "minuty": "Minuty",
  "faul/90": "Faule / 90 minut",
  "faule/90": "Faule / 90 minut",
  "zolte kartki": "Żółte kartki",
  "czerwone kartki": "Czerwone kartki",
};

const BLOCKED_UNKNOWN_STAT_KEYS = new Set([
  // Ten skrót z importu nie jest jednoznaczny bez słownika eksportu.
  // Nie pokazujemy go w raporcie, żeby użytkownik nie musiał zgadywać.
  "zxg/90",
]);

function normalizeStatKey(value: unknown): string {
  return normalizeText(value)
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getReadableStatLabel(column: string): string | null {
  const key = normalizeStatKey(column);

  if (!key || BLOCKED_UNKNOWN_STAT_KEYS.has(key)) {
    return null;
  }

  const exactLabel = KNOWN_STAT_LABELS[key];

  if (exactLabel) {
    return exactLabel;
  }

  if (key.includes("zxg")) {
    return null;
  }

  if (key.includes("xg") && key.includes("/90")) {
    return "Oczekiwane gole / 90 minut";
  }

  if (key.includes("xa") && key.includes("/90")) {
    return "Oczekiwane asysty / 90 minut";
  }

  if ((key.includes("kp") || key.includes("klucz")) && key.includes("/90")) {
    return "Kluczowe podania / 90 minut";
  }

  if (key.includes("drybl") && key.includes("/90")) {
    return key.includes("udan")
      ? "Udane dryblingi / 90 minut"
      : "Dryblingi / 90 minut";
  }

  if ((key.includes("dos") || key.includes("dosr")) && key.includes("%")) {
    return "Celność dośrodkowań";
  }

  if ((key.includes("dos") || key.includes("dosr")) && key.includes("/90")) {
    return "Dośrodkowania / 90 minut";
  }

  if (key.includes("press") && key.includes("/90")) {
    return key.includes("ud")
      ? "Udany pressing / 90 minut"
      : "Akcje pressingowe / 90 minut";
  }

  if ((key.includes("odbior") || key.includes("odzysk")) && key.includes("/90")) {
    return key.includes("odzysk")
      ? "Odzyskane piłki / 90 minut"
      : "Odbiory piłki / 90 minut";
  }

  if (key.includes("przechwyt") && key.includes("/90")) {
    return "Przechwyty / 90 minut";
  }

  if (key.includes("wslizg") && key.includes("/90")) {
    return "Wślizgi / 90 minut";
  }

  if ((key.includes("strz") || key.includes("strzal")) && key.includes("/90")) {
    return "Strzały / 90 minut";
  }

  if ((key.includes("gole") || key.includes("bramki")) && key.includes("/90")) {
    return "Gole / 90 minut";
  }

  if (key.includes("asyst") && key.includes("/90")) {
    return "Asysty / 90 minut";
  }

  if (key.includes("ocena")) {
    return key.includes("klub") ? "Średnia ocena klubowa" : "Średnia ocena";
  }

  // Nie pokazujemy nieopisanych skrótów. Raport ma być czytelny, nie zgadywany.
  return null;
}

function shouldUseStatAsPro(meta: StatColumnMeta, rank: PlayerNationalRankInfo): boolean {
  if (meta.direction === "lower-is-better") {
    return rank.percentileFromTop <= 0.25;
  }

  const key = normalizeStatKey(meta.column);
  const canBeZeroAndStillUseful =
    key.includes("ocena") ||
    key.includes("minuty") ||
    key.includes("wystepy") ||
    key.includes("mecze") ||
    key.includes("%") ||
    key.includes("podania %");

  if (!canBeZeroAndStillUseful && rank.value <= 0) {
    return false;
  }

  return rank.percentileFromTop <= 0.3;
}

const SAMPLE_STAT_COLUMNS = [
  "Gole/90",
  "xG/90",
  "Strz./90",
  "Asysty/90",
  "xA/90",
  "KP/90",
  "Podania %",
  "Próby/90",
  "Celne/90",
  "Próby doś./90",
  "Celne doś. %",
  "Pressing/90",
  "Ud. pressing/90",
  "Odzyskane/90",
  "Dryblingi/90",
  "Udane dryblingi/90",
  "Kluczowe podania/90",
  "Przechwyty/90",
  "Odbiory/90",
  "Wślizgi/90",
  "Posiadanie odzyskane/90",
  "Główki wygrane/90",
  "Śr. ocena",
  "Występy",
  "Minuty",
];

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l");
}

function parseNumber(value: unknown): number | null {
  const raw = String(value ?? "")
    .replace(/\s/g, "")
    .replace("%", "")
    .replace(",", ".")
    .trim();

  if (!raw || raw === "-" || raw === "—") {
    return null;
  }

  const exact = Number(raw);

  if (Number.isFinite(exact)) {
    return exact;
  }

  const match = raw.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatValue(value: number, column: string): string {
  if (Number.isInteger(value) && !column.includes("/90") && !column.includes("%")) {
    return value.toFixed(0);
  }

  if (column.includes("%")) {
    return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
  }

  return value.toFixed(1).replace(".", ",");
}

function formatRankLabel(rank: number, total: number): string {
  return `nr ${rank}/${total} na liście`;
}

function getRankForValue(
  values: number[],
  playerValue: number,
  direction: StatDirection = "higher-is-better",
  column = ""
): PlayerNationalRankInfo | null {
  const cleanValues = values.filter((value) => Number.isFinite(value));

  if (cleanValues.length === 0 || !Number.isFinite(playerValue)) {
    return null;
  }

  const rank =
    direction === "higher-is-better"
      ? cleanValues.filter((value) => value > playerValue).length + 1
      : cleanValues.filter((value) => value < playerValue).length + 1;

  const total = cleanValues.length;

  return {
    rank,
    total,
    value: playerValue,
    valueText: formatValue(playerValue, column),
    label: formatRankLabel(rank, total),
    percentileFromTop: rank / total,
  };
}

function getNumericColumnRank(
  player: TableRow,
  rows: TableRow[],
  column: string,
  direction: StatDirection = "higher-is-better"
): PlayerNationalRankInfo | null {
  const playerValue = parseNumber(player[column]);

  if (playerValue === null) {
    return null;
  }

  const values = rows
    .map((row) => parseNumber(row[column]))
    .filter((value): value is number => value !== null);

  return getRankForValue(values, playerValue, direction, column);
}

function isExcludedColumn(column: string): boolean {
  if (EXACT_EXCLUDED_COLUMNS.has(column)) {
    return true;
  }

  if (ATTRIBUTE_COLUMNS.has(column)) {
    return true;
  }

  const normalized = normalizeText(column);

  return EXCLUDED_COLUMN_PARTS.some((part) => normalized.includes(normalizeText(part)));
}

function looksLikeStatColumn(column: string): boolean {
  const normalized = normalizeText(column);

  return STAT_LIKE_PARTS.some((part) => normalized.includes(normalizeText(part)));
}

function getStatDirection(column: string): StatDirection {
  const normalized = normalizeText(column);

  if (NEGATIVE_STAT_PARTS.some((part) => normalized.includes(normalizeText(part)))) {
    return "lower-is-better";
  }

  return "higher-is-better";
}

function getRoleRelevantStatParts(roleMatch: RoleScoreResult | null): string[] {
  const positionGroup = normalizeText(roleMatch?.role.positionGroup ?? "");
  const roleName = normalizeText(roleMatch?.role.name ?? "");
  const context = `${positionGroup} ${roleName}`;

  if (context.includes("napast")) {
    return ["gole", "bramki", "xg", "strz", "celne", "glow", "głów", "wygrane", "ocena"];
  }

  if (
    context.includes("skrzydl") ||
    context.includes("boczny pomocnik") ||
    context.includes("wahadl") ||
    context.includes("boczny obron")
  ) {
    return [
      "drybl",
      "dos",
      "doś",
      "dosr",
      "dośr",
      "asyst",
      "xa",
      "kp",
      "klucz",
      "press",
      "odbior",
      "odbiór",
      "odzysk",
      "ocena",
    ];
  }

  if (
    context.includes("srodkowy pomoc") ||
    context.includes("ofensywny pomoc") ||
    context.includes("defensywny pomoc") ||
    context.includes("rozgryw")
  ) {
    return [
      "podan",
      "klucz",
      "kp",
      "xa",
      "asyst",
      "press",
      "odbior",
      "odbiór",
      "odzysk",
      "przechwyt",
      "ocena",
    ];
  }

  if (context.includes("obron") || context.includes("stoper")) {
    return [
      "odbior",
      "odbiór",
      "przechwyt",
      "wslizg",
      "wślizg",
      "posiadanie",
      "possession",
      "glow",
      "głów",
      "header",
      "podan",
      "ocena",
    ];
  }

  if (context.includes("bramkarz")) {
    return ["obron", "interw", "czyste", "strac", "ocena", "podan"];
  }

  return ["gole", "asyst", "xg", "xa", "kp", "press", "odbior", "odzysk", "ocena"];
}

function getStatRelevance(column: string, roleMatch: RoleScoreResult | null): number {
  const normalized = normalizeText(column);
  const relevantParts = getRoleRelevantStatParts(roleMatch);

  let relevance = relevantParts.some((part) => normalized.includes(normalizeText(part))) ? 2 : 0;

  if (normalized.includes("/90")) {
    relevance += 1;
  }

  if (normalized.includes("sr. ocena") || normalized.includes("ocena")) {
    relevance += 1;
  }

  if (normalized.includes("minuty") || normalized.includes("wystepy") || normalized.includes("mecze")) {
    relevance -= 1;
  }

  return relevance;
}

function hasUsefulNumericSpread(rows: TableRow[], column: string): boolean {
  const values = rows
    .map((row) => parseNumber(row[column]))
    .filter((value): value is number => value !== null);

  if (values.length < 3) {
    return false;
  }

  const uniqueValues = new Set(values.map((value) => value.toFixed(3)));

  if (uniqueValues.size < 2) {
    return false;
  }

  const nonZeroValues = values.filter((value) => Math.abs(value) > 0.0001);

  return nonZeroValues.length >= Math.min(3, values.length);
}

function getStatColumnMetas(
  player: TableRow,
  rows: TableRow[],
  roleMatch: RoleScoreResult | null
): StatColumnMeta[] {
  const columns = new Set<string>();

  for (const row of rows) {
    for (const column of Object.keys(row)) {
      columns.add(column);
    }
  }

  for (const column of SAMPLE_STAT_COLUMNS) {
    if (player[column] !== undefined || rows.some((row) => row[column] !== undefined)) {
      columns.add(column);
    }
  }

  return [...columns]
    .filter((column) => !isExcludedColumn(column))
    .filter((column) => looksLikeStatColumn(column))
    .filter((column) => getReadableStatLabel(column) !== null)
    .filter((column) => parseNumber(player[column]) !== null)
    .filter((column) => hasUsefulNumericSpread(rows, column))
    .map((column) => ({
      column,
      label: getReadableStatLabel(column) ?? column,
      direction: getStatDirection(column),
      relevance: getStatRelevance(column, roleMatch),
    }));
}

function getRankQualityLabel(rank: PlayerNationalRankInfo | null): string {
  if (!rank) {
    return "brak rankingu na liście";
  }

  if (rank.percentileFromTop <= 0.1) {
    return "ścisła czołówka listy";
  }

  if (rank.percentileFromTop <= 0.25) {
    return "mocny wynik na tle listy";
  }

  if (rank.percentileFromTop <= 0.5) {
    return "górna połowa listy";
  }

  return "niżej na tle listy";
}

function makeStatItem(
  column: string,
  label: string,
  rank: PlayerNationalRankInfo,
  direction: StatDirection,
  relevance: number,
  type: "pro" | "risk"
): PlayerNationalReportItem {
  const isNegativeStat = direction === "lower-is-better";

  const titlePrefix =
    type === "pro"
      ? isNegativeStat
        ? "Nisko w negatywnej statystyce"
        : "Statystyka"
      : isNegativeStat
        ? "Wysoko w negatywnej statystyce"
        : "Słabo w statystyce";

  const context = relevance > 0 ? "ważne dla obecnej analizy" : "na tle listy";

  return {
    title: `${titlePrefix}: ${label}`,
    value: rank.valueText,
    rank,
    meta: `${rank.label} · ${getRankQualityLabel(rank)} · ${context}`,
  };
}

function uniqueByTitle(items: PlayerNationalReportItem[]): PlayerNationalReportItem[] {
  const seen = new Set<string>();
  const result: PlayerNationalReportItem[] = [];

  for (const item of items) {
    if (seen.has(item.title)) {
      continue;
    }

    seen.add(item.title);
    result.push(item);
  }

  return result;
}

function comparePros(
  left: PlayerNationalReportItem,
  right: PlayerNationalReportItem
): number {
  const leftRank = left.rank?.rank ?? 9999;
  const rightRank = right.rank?.rank ?? 9999;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return left.title.localeCompare(right.title, "pl");
}

function compareRisks(
  left: PlayerNationalReportItem,
  right: PlayerNationalReportItem
): number {
  const leftRatio = left.rank?.percentileFromTop ?? 0;
  const rightRatio = right.rank?.percentileFromTop ?? 0;

  if (leftRatio !== rightRatio) {
    return rightRatio - leftRatio;
  }

  return left.title.localeCompare(right.title, "pl");
}

function compareStatItems(
  left: PlayerNationalReportItem & { relevance?: number },
  right: PlayerNationalReportItem & { relevance?: number },
  risk = false
): number {
  const relevanceDiff = (right.relevance ?? 0) - (left.relevance ?? 0);

  if (relevanceDiff !== 0) {
    return relevanceDiff;
  }

  return risk ? compareRisks(left, right) : comparePros(left, right);
}

export function buildPlayerNationalReport({
  player,
  rows,
  roleMatch,
  roleInsights,
}: {
  player: TableRow;
  rows: TableRow[];
  roleMatch: RoleScoreResult | null;
  roleInsights: PlayerRoleInsights;
}): PlayerNationalReport {
  void roleInsights;

  const statColumns = getStatColumnMetas(player, rows, roleMatch);
  const pros: Array<PlayerNationalReportItem & { relevance?: number }> = [];
  const risks: Array<PlayerNationalReportItem & { relevance?: number }> = [];

  for (const meta of statColumns) {
    const rank = getNumericColumnRank(player, rows, meta.column, meta.direction);

    if (!rank) {
      continue;
    }

    const item = {
      ...makeStatItem(meta.column, meta.label, rank, meta.direction, meta.relevance, "pro"),
      relevance: meta.relevance,
    };

    const riskItem = {
      ...makeStatItem(meta.column, meta.label, rank, meta.direction, meta.relevance, "risk"),
      relevance: meta.relevance,
    };

    if (shouldUseStatAsPro(meta, rank)) {
      pros.push(item);
    }

    if (rank.percentileFromTop >= 0.7 && meta.direction === "higher-is-better") {
      risks.push(riskItem);
    }

    if (rank.percentileFromTop <= 0.25 && meta.direction === "lower-is-better") {
      risks.push(riskItem);
    }
  }

  const finalPros = uniqueByTitle(
    pros.sort((left, right) => compareStatItems(left, right, false))
  ).slice(0, 5);

  const finalRisks = uniqueByTitle(
    risks.sort((left, right) => compareStatItems(left, right, true))
  ).slice(0, 5);

  const bestStat = finalPros[0];
  const worstStat = finalRisks[0];

  const bestStatTitle = bestStat?.title
    .replace("Statystyka: ", "")
    .replace("Nisko w negatywnej statystyce: ", "");

  const summary = bestStat?.rank
    ? `Raport statystyczny: ${bestStatTitle} — ${bestStat.value}, ${bestStat.rank.label}.`
    : "Raport statystyczny na tle aktualnej listy zawodników.";

  const mainLine = bestStat?.rank
    ? `${bestStatTitle} — ${bestStat.value} · ${bestStat.rank.label}`
    : worstStat?.rank
      ? `${worstStat.title} — ${worstStat.value} · ${worstStat.rank.label}`
      : "Brak wystarczających statystyk meczowych/Moneyball do rankingu.";

  return {
    summary,
    mainLine,
    roleRank: null,
    overallAbilityRank: null,
    attributeRanks: {},
    pros:
      finalPros.length > 0
        ? finalPros
        : [
            {
              title: "Brak wyraźnego atutu statystycznego",
              meta:
                "Nie znaleziono statystyki meczowej/Moneyball, w której zawodnik jest wysoko na tle aktualnej listy.",
            },
          ],
    risks:
      finalRisks.length > 0
        ? finalRisks
        : [
            {
              title: "Brak dużej czerwonej flagi statystycznej",
              meta:
                "Nie znaleziono statystyki meczowej/Moneyball, w której zawodnik mocno odstaje negatywnie na tle listy.",
            },
          ],
  };
}
