import type { Camp } from "../types/camp";
import type { TableRow } from "../types/table";
import { getCareerPlayerSummaries } from "./campStats";
import {
  getLegacyPlayerKey,
  getPlayerKey,
  getPlayerUniqueId,
} from "./playerIdentity";

export type NationalCoreStatus =
  | "Trzon kadry"
  | "Regularny"
  | "Rotacja"
  | "Epizod"
  | "Nowy";

  export type NationalCoreCurrentStatus =
  | "Aktualnie powołany"
  | "Odesłany / poza finałową kadrą"
  | "Regularnie powoływany"
  | "Ostatnio w rotacji"
  | "Historyczny lider"
  | "Poza aktualną kadrą";

export type NationalCorePlayer = {
  key: string;
  name: string;
  club: string;
  position: string;
  age: number | null;
  overallAbility: number | null;

  nationalCaps: number;
  nationalGoals: number;

  appCallUps: number;
  appMatches: number;
  appMinutes: number;
  goals: number;
  assists: number;
  avgRating: number | null;
    recentCallUps: number;
  recentMatches: number;
  recentMinutes: number;
  currentStatus: NationalCoreCurrentStatus;
  latestCampName: string;

  leadership: number | null;
  teamwork: number | null;
  pressure: number | null;
  professionalism: number | null;
  importantMatches: number | null;
  ambition: number | null;
  loyalty: number | null;
  controversy: number | null;
  fairPlay: number | null;
  temperament: number | null;
  consistency: number | null;
  injuryProneness: number | null;
  versatility: number | null;
  currentReputation: number | null;
  homeReputation: number | null;
  worldReputation: number | null;
  potential: number | null;

  captainScore: number;
  captainStatus: string;
  coreScore: number;
  coreStatus: NationalCoreStatus;
};

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function normalizeHeaderName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[.\s_-]+/g, "");
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const text = String(value).trim().replace(",", ".");

  if (!text || text === "-") {
    return null;
  }

  const rangeMatch = text.match(
    /(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/
  );

  if (rangeMatch) {
    const left = Number(rangeMatch[1]);
    const right = Number(rangeMatch[2]);

    if (Number.isFinite(left) && Number.isFinite(right)) {
      return (left + right) / 2;
    }
  }

  const match = text.match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);

  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeToAttributeScale(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  if (value > 1000) {
    return clamp(value / 500, 0, 20);
  }

  if (value > 20) {
    return clamp(value / 10, 0, 20);
  }

  return clamp(value, 0, 20);
}

function getRowValue(row: TableRow, names: string[]): string {
  for (const name of names) {
    const directValue = row[name];

    if (directValue !== undefined && directValue !== null && directValue !== "") {
      return String(directValue);
    }
  }

  const normalizedNames = new Set(names.map(normalizeHeaderName));

  const matchedKey = Object.keys(row).find((key) =>
    normalizedNames.has(normalizeHeaderName(key))
  );

  if (!matchedKey) {
    return "";
  }

  return String(row[matchedKey] ?? "");
}

function getRowName(row: TableRow): string {
  return getRowValue(row, ["Nazwisko", "Piłkarz"]) || "-";
}

function getRowClub(row: TableRow): string {
  return getRowValue(row, ["Klub"]) || "-";
}

function getRowPosition(row: TableRow): string {
  return getRowValue(row, ["Pozycja"]) || "-";
}

function getRowAge(row: TableRow): number | null {
  return parseNumber(getRowValue(row, ["Wiek"]));
}

function getRowOverallAbility(row: TableRow): number | null {
  return parseNumber(
    getRowValue(row, [
      "OU",
      "Obecne Umiejętności",
      "Obecne umiejętności",
      "CA",
    ])
  );
}

function getRowNationalCaps(row: TableRow): number {
  return (
    parseNumber(
      getRowValue(row, [
        "Wyst. Rep.",
        "Wyst Rep",
        "Rep",
        "Występy w reprezentacji",
        "Wystepy w reprezentacji",
        "Występy w kadrze",
        "Wystepy w kadrze",
      ])
    ) ?? 0
  );
}

function getRowNationalGoals(row: TableRow): number {
  return (
    parseNumber(
      getRowValue(row, [
        "Br. Rep.",
        "Br Rep",
        "Bramki Rep.",
        "Bramki Rep",
        "Gole Rep.",
        "Gole Rep",
        "Gole w reprezentacji",
        "Bramki w reprezentacji",
        "Gole w kadrze",
        "Bramki w kadrze",
      ])
    ) ?? 0
  );
}

function getRowAttribute(row: TableRow, names: string[]): number | null {
  return parseNumber(getRowValue(row, names));
}

function getRowLeadership(row: TableRow): number | null {
  return getRowAttribute(row, ["Przywództwo", "Przywodztwo"]);
}

function getRowTeamwork(row: TableRow): number | null {
  return getRowAttribute(row, ["Współpraca", "Wspolpraca"]);
}

function getRowPressure(row: TableRow): number | null {
  return getRowAttribute(row, ["Presja"]);
}

function getRowProfessionalism(row: TableRow): number | null {
  return getRowAttribute(row, ["Profesjonalizm"]);
}

function getRowImportantMatches(row: TableRow): number | null {
  return getRowAttribute(row, ["Ważne mecze", "Wazne mecze"]);
}

function getRowAmbition(row: TableRow): number | null {
  return getRowAttribute(row, ["Ambicja"]);
}

function getRowLoyalty(row: TableRow): number | null {
  return getRowAttribute(row, ["Lojalność", "Lojalnosc"]);
}

function getRowControversy(row: TableRow): number | null {
  return getRowAttribute(row, ["Kontrowersja"]);
}

function getRowFairPlay(row: TableRow): number | null {
  return getRowAttribute(row, ["Fair play"]);
}

function getRowTemperament(row: TableRow): number | null {
  return getRowAttribute(row, ["Temperament"]);
}

function getRowConsistency(row: TableRow): number | null {
  return getRowAttribute(row, ["Stabilność formy", "Stabilnosc formy"]);
}

function getRowInjuryProneness(row: TableRow): number | null {
  return getRowAttribute(row, [
    "Podatność na kontuzje",
    "Podatnosc na kontuzje",
  ]);
}

function getRowVersatility(row: TableRow): number | null {
  return getRowAttribute(row, ["Wszechstronność", "Wszechstronnosc"]);
}

function getRowCurrentReputation(row: TableRow): number | null {
  return normalizeToAttributeScale(
    getRowAttribute(row, ["Aktualna reputacja", "AR"])
  );
}

function getRowHomeReputation(row: TableRow): number | null {
  return normalizeToAttributeScale(
    getRowAttribute(row, ["Reputacja w ojczyźnie", "Reputacja w ojczyznie"])
  );
}

function getRowWorldReputation(row: TableRow): number | null {
  return normalizeToAttributeScale(
    getRowAttribute(row, [
      "Reputacja na świecie",
      "Reputacja na swiecie",
      "RnŚ",
      "RnS",
    ])
  );
}

function getRowPotential(row: TableRow): number | null {
  return normalizeToAttributeScale(
    getRowAttribute(row, ["Potencjał", "Potencjal"])
  );
}

function makeRowLookupKeys(row: TableRow): string[] {
  const name = normalizeText(getRowName(row));
  const club = normalizeText(getRowClub(row));
  const uniqueId = normalizeText(getPlayerUniqueId(row));
  const playerKey = normalizeText(getPlayerKey(row));
  const legacyKey = normalizeText(getLegacyPlayerKey(row));

  return [
    playerKey,
    legacyKey,
    uniqueId ? `uid:${uniqueId}` : "",
    uniqueId,
    `name-club:${name}|${club}`,
    `name:${name}`,
  ].filter(Boolean);
}

function makeSummaryLookupKeys(player: {
  key: string;
  name: string;
  club: string;
  uid?: string;
  legacyKey?: string;
}): string[] {
  const name = normalizeText(player.name);
  const club = normalizeText(player.club);
  const key = normalizeText(player.key);
  const uid = normalizeText(player.uid);
  const legacyKey = normalizeText(player.legacyKey);

  return [
    key,
    legacyKey,
    uid ? `uid:${uid}` : "",
    uid,
    `name-club:${name}|${club}`,
    `name:${name}`,
  ].filter(Boolean);
}

function buildRowLookup(rows: TableRow[]): Map<string, TableRow> {
  const lookup = new Map<string, TableRow>();

  for (const row of rows) {
    for (const key of makeRowLookupKeys(row)) {
      if (!lookup.has(key)) {
        lookup.set(key, row);
      }
    }
  }

  return lookup;
}

function attr(value: number | null): number {
  return value ?? 0;
}

function reputationAverage(player: Pick<
  NationalCorePlayer,
  "currentReputation" | "homeReputation" | "worldReputation"
>): number {
  const values = [
    player.currentReputation,
    player.homeReputation,
    player.worldReputation,
  ].filter((value): value is number => value !== null);

  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getAgeCaptainBonus(age: number | null): number {
  if (age === null) return 0;

  if (age <= 20) return -8;
  if (age <= 22) return -4;
  if (age <= 24) return 2;
  if (age <= 31) return 9;
  if (age <= 34) return 6;
  if (age <= 36) return 2;

  return -2;
}

function getYoungPotentialBonus(age: number | null, potential: number | null): number {
  if (age === null || potential === null) {
    return 0;
  }

  if (age > 23) {
    return 0;
  }

  return Math.max(0, (potential - 13) * 0.8);
}
type RecentPlayerUsage = {
  recentCallUps: number;
  recentMatches: number;
  recentMinutes: number;
  currentStatus: NationalCoreCurrentStatus | null;
  latestCampName: string;
};

const EMPTY_RECENT_USAGE: RecentPlayerUsage = {
  recentCallUps: 0,
  recentMatches: 0,
  recentMinutes: 0,
  currentStatus: null,
  latestCampName: "",
};

function getCampDateValue(camp: Camp): string {
  return camp.dateTo || camp.dateFrom || camp.createdAt || "";
}

function getEmptyRecentUsage(): RecentPlayerUsage {
  return { ...EMPTY_RECENT_USAGE };
}

function getRecentPlayerUsageMap(camps: Camp[]): Map<string, RecentPlayerUsage> {
  const sortedCamps = [...camps].sort((left, right) =>
    getCampDateValue(right).localeCompare(getCampDateValue(left))
  );

  const latestCamp = sortedCamps[0] ?? null;
  const recentCamps = sortedCamps.slice(0, 6);
  const usageByPlayerKey = new Map<string, RecentPlayerUsage>();

  function getUsage(playerKey: string): RecentPlayerUsage {
    const existing = usageByPlayerKey.get(playerKey);

    if (existing) {
      return existing;
    }

    const next = getEmptyRecentUsage();
    usageByPlayerKey.set(playerKey, next);

    return next;
  }

  for (const camp of recentCamps) {
    const campPlayerKeys = new Set(camp.players.map((player) => player.key));

    for (const player of camp.players) {
      const usage = getUsage(player.key);

      usage.recentCallUps += 1;

      if (latestCamp && camp.id === latestCamp.id) {
        usage.latestCampName = camp.name;
        usage.currentStatus =
          player.status === "released"
            ? "Odesłany / poza finałową kadrą"
            : "Aktualnie powołany";
      }
    }

    for (const match of camp.matches) {
      for (const appearance of match.appearances ?? []) {
        if (!appearance.played || !campPlayerKeys.has(appearance.playerKey)) {
          continue;
        }

        const usage = getUsage(appearance.playerKey);

        usage.recentMatches += 1;
        usage.recentMinutes += parseNumber(appearance.minutes) ?? 0;
      }
    }
  }

  return usageByPlayerKey;
}

function resolveCurrentStatus(params: {
  explicitStatus: NationalCoreCurrentStatus | null;
  recentCallUps: number;
  recentMatches: number;
  recentMinutes: number;
  appCallUps: number;
  appMatches: number;
  nationalCaps: number;
}): NationalCoreCurrentStatus {
  if (params.explicitStatus) {
    return params.explicitStatus;
  }

  if (params.recentCallUps >= 4 || params.recentMinutes >= 270) {
    return "Regularnie powoływany";
  }

if (
  params.recentCallUps > 0 ||
  params.recentMatches > 0 ||
  params.recentMinutes > 0
) {
  return "Ostatnio w rotacji";
}

  if (params.nationalCaps >= 25 || params.appMatches >= 12 || params.appCallUps >= 5) {
    return "Historyczny lider";
  }

  return "Poza aktualną kadrą";
}

function getCurrentStatusBaseScore(status: NationalCoreCurrentStatus): number {
  if (status === "Aktualnie powołany") return 28;
  if (status === "Regularnie powoływany") return 22;
  if (status === "Ostatnio w rotacji") return 14;
  if (status === "Odesłany / poza finałową kadrą") return 10;
  if (status === "Historyczny lider") return 5;

  return 0;
}

function getCurrentCycleScore(params: {
  currentStatus: NationalCoreCurrentStatus;
  recentCallUps: number;
  recentMatches: number;
  recentMinutes: number;
}): number {
  const statusScore = getCurrentStatusBaseScore(params.currentStatus);
  const callUpsScore = Math.min(16, params.recentCallUps * 4);
  const matchesScore = Math.min(16, params.recentMatches * 4);
  const minutesScore = Math.min(18, params.recentMinutes / 45);

  return clamp(statusScore + callUpsScore + matchesScore + minutesScore, 0, 55);
}

function getCaptainAvailabilityMultiplier(status: NationalCoreCurrentStatus): number {
  if (status === "Aktualnie powołany") return 1;
  if (status === "Regularnie powoływany") return 0.92;
  if (status === "Ostatnio w rotacji") return 0.82;
  if (status === "Odesłany / poza finałową kadrą") return 0.68;
  if (status === "Historyczny lider") return 0.55;

  return 0.42;
}

function getStrongerCurrentStatus(
  left: NationalCoreCurrentStatus,
  right: NationalCoreCurrentStatus
): NationalCoreCurrentStatus {
  const order: Record<NationalCoreCurrentStatus, number> = {
    "Aktualnie powołany": 6,
    "Regularnie powoływany": 5,
    "Ostatnio w rotacji": 4,
    "Odesłany / poza finałową kadrą": 3,
    "Historyczny lider": 2,
    "Poza aktualną kadrą": 1,
  };

  return order[right] > order[left] ? right : left;
}
function getCaptainStatus(
  captainScore: number,
  age: number | null,
  nationalCaps: number,
  appMatches: number,
  currentStatus: NationalCoreCurrentStatus
): string {
  // To jest tylko status bazowy. Finalny status kapitański
  // nadamy później rankingowo, żeby nie było 40 naturalnych liderów.
  if (
    currentStatus === "Poza aktualną kadrą" ||
    currentStatus === "Historyczny lider"
  ) {
    if (nationalCaps + appMatches >= 30) {
      return "Historyczny lider poza aktualną kadrą";
    }

    return "Poza aktualną hierarchią";
  }

  if (currentStatus === "Odesłany / poza finałową kadrą") {
    return "Poza finałową kadrą";
  }

  if (nationalCaps + appMatches < 5) {
    if (age !== null && age <= 23 && captainScore >= 55) {
      return "Przyszły lider";
    }

    return "Za mało doświadczenia";
  }

  if (captainScore >= 64) {
    return "Opcja w hierarchii";
  }

  return "Opcja rezerwowa";
}

function getCaptainScore(params: {
  leadership: number | null;
  teamwork: number | null;
  pressure: number | null;
  professionalism: number | null;
  importantMatches: number | null;
  loyalty: number | null;
  fairPlay: number | null;
  controversy: number | null;
  temperament: number | null;
  age: number | null;
  nationalCaps: number;
  appMatches: number;
  appCallUps: number;
    recentCallUps: number;
  recentMatches: number;
  recentMinutes: number;
  currentStatus: NationalCoreCurrentStatus;
}): number {
  const experienceScore =
    Math.min(18, params.nationalCaps * 0.35) +
    Math.min(9, params.appMatches * 0.6) +
    Math.min(7, params.appCallUps * 1.05);

  const riskPenalty =
    attr(params.controversy) * 0.65 + attr(params.temperament) * 0.45;
  const currentCycleScore =
    getCurrentCycleScore({
      currentStatus: params.currentStatus,
      recentCallUps: params.recentCallUps,
      recentMatches: params.recentMatches,
      recentMinutes: params.recentMinutes,
    }) * 0.32;

  const availabilityMultiplier = getCaptainAvailabilityMultiplier(
    params.currentStatus
  );
  const raw =
    attr(params.leadership) * 2.65 +
    attr(params.teamwork) * 1.45 +
    attr(params.pressure) * 1.1 +
    attr(params.professionalism) * 1.0 +
    attr(params.importantMatches) * 0.8 +
    attr(params.loyalty) * 0.45 +
    attr(params.fairPlay) * 0.28 +
    experienceScore +
    currentCycleScore +
    getAgeCaptainBonus(params.age) -
    riskPenalty;

  return roundScore(clamp(raw * availabilityMultiplier));
}

function getCoreStatus(coreScore: number): NationalCoreStatus {
  // "Trzon kadry" nadajemy rankingowo po scaleniu zawodników,
  // maksymalnie TOP 15. Tu zostają tylko statusy bazowe.
  if (coreScore >= 45) return "Regularny";
  if (coreScore >= 20) return "Rotacja";
  if (coreScore > 0) return "Epizod";

  return "Nowy";
}
function getCoreScore(params: {
  nationalCaps: number;
  nationalGoals: number;
  appCallUps: number;
  appMatches: number;
  appMinutes: number;
  avgRating: number | null;
  currentReputation: number | null;
  homeReputation: number | null;
  worldReputation: number | null;
  consistency: number | null;
  importantMatches: number | null;
  professionalism: number | null;
  ambition: number | null;
  versatility: number | null;
  injuryProneness: number | null;
  potential: number | null;
  age: number | null;
  recentCallUps: number;
  recentMatches: number;
  recentMinutes: number;
  currentStatus: NationalCoreCurrentStatus;
}): number {
  const repAverage = reputationAverage({
    currentReputation: params.currentReputation,
    homeReputation: params.homeReputation,
    worldReputation: params.worldReputation,
  });

  const currentCycleScore = getCurrentCycleScore({
    currentStatus: params.currentStatus,
    recentCallUps: params.recentCallUps,
    recentMatches: params.recentMatches,
    recentMinutes: params.recentMinutes,
  });

  const capsScore = Math.min(14, params.nationalCaps * 0.18);
  const nationalGoalsScore = Math.min(8, params.nationalGoals * 0.35);
  const callUpsScore = Math.min(10, params.appCallUps * 1.0);
  const matchesScore = Math.min(8, params.appMatches * 0.45);
  const minutesScore = Math.min(6, params.appMinutes / 240);

  const reputationScore = repAverage * 0.85;

  const hiddenScore =
    attr(params.consistency) * 0.45 +
    attr(params.importantMatches) * 0.4 +
    attr(params.professionalism) * 0.35 +
    attr(params.ambition) * 0.25 +
    attr(params.versatility) * 0.25;

  const ratingBonus =
    params.avgRating !== null ? Math.max(0, (params.avgRating - 6.7) * 3.5) : 0;

  const injuryPenalty = attr(params.injuryProneness) * 0.28;
  const potentialBonus = getYoungPotentialBonus(params.age, params.potential);

const raw =
  currentCycleScore +
  capsScore +
  nationalGoalsScore +
  callUpsScore +
  matchesScore +
  minutesScore +
  reputationScore +
  hiddenScore +
  ratingBonus +
  potentialBonus -
  injuryPenalty;

  return roundScore(clamp(raw));
}

function buildPlayerFromRowAndHistory(params: {
  row: TableRow | null;
  fallbackKey: string;
  fallbackName: string;
  fallbackClub: string;
  fallbackPosition: string;
  appCallUps: number;
  appMatches: number;
  appMinutes: number;
  goals: number;
  assists: number;
  avgRating: number | null;
    recentCallUps: number;
  recentMatches: number;
  recentMinutes: number;
  explicitCurrentStatus: NationalCoreCurrentStatus | null;
  latestCampName: string;
}): NationalCorePlayer {
  const row = params.row;

  const name = row ? getRowName(row) : params.fallbackName;
  const club = row ? getRowClub(row) : params.fallbackClub;
  const position = row ? getRowPosition(row) : params.fallbackPosition;
  const age = row ? getRowAge(row) : null;
  const overallAbility = row ? getRowOverallAbility(row) : null;
  const nationalCaps = row ? getRowNationalCaps(row) : 0;
  const nationalGoals = row ? getRowNationalGoals(row) : 0;

  const leadership = row ? getRowLeadership(row) : null;
  const teamwork = row ? getRowTeamwork(row) : null;
  const pressure = row ? getRowPressure(row) : null;
  const professionalism = row ? getRowProfessionalism(row) : null;
  const importantMatches = row ? getRowImportantMatches(row) : null;
  const ambition = row ? getRowAmbition(row) : null;
  const loyalty = row ? getRowLoyalty(row) : null;
  const controversy = row ? getRowControversy(row) : null;
  const fairPlay = row ? getRowFairPlay(row) : null;
  const temperament = row ? getRowTemperament(row) : null;
  const consistency = row ? getRowConsistency(row) : null;
  const injuryProneness = row ? getRowInjuryProneness(row) : null;
  const versatility = row ? getRowVersatility(row) : null;
  const currentReputation = row ? getRowCurrentReputation(row) : null;
  const homeReputation = row ? getRowHomeReputation(row) : null;
  const worldReputation = row ? getRowWorldReputation(row) : null;
  const potential = row ? getRowPotential(row) : null;
  const currentStatus = resolveCurrentStatus({
    explicitStatus: params.explicitCurrentStatus,
    recentCallUps: params.recentCallUps,
    recentMatches: params.recentMatches,
    recentMinutes: params.recentMinutes,
    appCallUps: params.appCallUps,
    appMatches: params.appMatches,
    nationalCaps,
  });
  const captainScore = getCaptainScore({
    leadership,
    teamwork,
    pressure,
    professionalism,
    importantMatches,
    loyalty,
    fairPlay,
    controversy,
    temperament,
    age,
    nationalCaps,
    appMatches: params.appMatches,
    appCallUps: params.appCallUps,
     recentCallUps: params.recentCallUps,
    recentMatches: params.recentMatches,
    recentMinutes: params.recentMinutes,
    currentStatus,
  });

  const coreScore = getCoreScore({
    nationalCaps,
    nationalGoals,
    appCallUps: params.appCallUps,
    appMatches: params.appMatches,
    appMinutes: params.appMinutes,
    avgRating: params.avgRating,
    currentReputation,
    homeReputation,
    worldReputation,
    consistency,
    importantMatches,
    professionalism,
    ambition,
    versatility,
    injuryProneness,
    potential,
    age,
        recentCallUps: params.recentCallUps,
    recentMatches: params.recentMatches,
    recentMinutes: params.recentMinutes,
    currentStatus,
  });

  return {
    key:
      (row ? getPlayerKey(row) : "") ||
      params.fallbackKey ||
      `${name}-${club}`,
    name,
    club,
    position,
    age,
    overallAbility,

    nationalCaps,
    nationalGoals,

    appCallUps: params.appCallUps,
    appMatches: params.appMatches,
    appMinutes: params.appMinutes,
    goals: params.goals,
    assists: params.assists,
    avgRating: params.avgRating,
    recentCallUps: params.recentCallUps,
    recentMatches: params.recentMatches,
    recentMinutes: params.recentMinutes,
    currentStatus,
    latestCampName: params.latestCampName,
    leadership,
    teamwork,
    pressure,
    professionalism,
    importantMatches,
    ambition,
    loyalty,
    controversy,
    fairPlay,
    temperament,
    consistency,
    injuryProneness,
    versatility,
    currentReputation,
    homeReputation,
    worldReputation,
    potential,

    captainScore,
    captainStatus: getCaptainStatus(
      captainScore,
      age,
      nationalCaps,
      params.appMatches,
      currentStatus
    ),
    coreScore,
    coreStatus: getCoreStatus(coreScore),
  };
}

function getNationalCorePlayerMergeKey(player: NationalCorePlayer): string {
  const key = normalizeText(player.key);

  if (key) {
    return key;
  }

  return `name-club:${normalizeText(player.name)}|${normalizeText(player.club)}`;
}

function mergeAverageRatings(
  leftRating: number | null,
  leftMatches: number,
  rightRating: number | null,
  rightMatches: number
): number | null {
  if (leftRating === null && rightRating === null) {
    return null;
  }

  if (leftRating !== null && rightRating === null) {
    return leftRating;
  }

  if (leftRating === null && rightRating !== null) {
    return rightRating;
  }

  const leftWeight = Math.max(1, leftMatches);
  const rightWeight = Math.max(1, rightMatches);

  return (
    ((leftRating ?? 0) * leftWeight + (rightRating ?? 0) * rightWeight) /
    (leftWeight + rightWeight)
  );
}

function recalculateNationalCorePlayerScores(
  player: NationalCorePlayer
): NationalCorePlayer {
  const captainScore = getCaptainScore({
    leadership: player.leadership,
    teamwork: player.teamwork,
    pressure: player.pressure,
    professionalism: player.professionalism,
    importantMatches: player.importantMatches,
    loyalty: player.loyalty,
    fairPlay: player.fairPlay,
    controversy: player.controversy,
    temperament: player.temperament,
    age: player.age,
    nationalCaps: player.nationalCaps,
    appMatches: player.appMatches,
    appCallUps: player.appCallUps,
        recentCallUps: player.recentCallUps,
    recentMatches: player.recentMatches,
    recentMinutes: player.recentMinutes,
    currentStatus: player.currentStatus,
  });

  const coreScore = getCoreScore({
    nationalCaps: player.nationalCaps,
    nationalGoals: player.nationalGoals,
    appCallUps: player.appCallUps,
    appMatches: player.appMatches,
    appMinutes: player.appMinutes,
    avgRating: player.avgRating,
    currentReputation: player.currentReputation,
    homeReputation: player.homeReputation,
    worldReputation: player.worldReputation,
    consistency: player.consistency,
    importantMatches: player.importantMatches,
    professionalism: player.professionalism,
    ambition: player.ambition,
    versatility: player.versatility,
    injuryProneness: player.injuryProneness,
    potential: player.potential,
    age: player.age,
        recentCallUps: player.recentCallUps,
    recentMatches: player.recentMatches,
    recentMinutes: player.recentMinutes,
    currentStatus: player.currentStatus,
  });

  return {
    ...player,
    captainScore,
    captainStatus: getCaptainStatus(
      captainScore,
      player.age,
      player.nationalCaps,
      player.appMatches,
      player.currentStatus
    ),
    coreScore,
    coreStatus: getCoreStatus(coreScore),
  };
}

function mergeNationalCorePlayer(
  left: NationalCorePlayer,
  right: NationalCorePlayer
): NationalCorePlayer {
  const appMatches = left.appMatches + right.appMatches;

  const merged: NationalCorePlayer = {
    ...left,

    name: left.name !== "-" ? left.name : right.name,
    club: left.club !== "-" ? left.club : right.club,
    position: left.position !== "-" ? left.position : right.position,
    age: left.age ?? right.age,
    overallAbility: left.overallAbility ?? right.overallAbility,

    nationalCaps: Math.max(left.nationalCaps, right.nationalCaps),
    nationalGoals: Math.max(left.nationalGoals, right.nationalGoals),

    appCallUps: left.appCallUps + right.appCallUps,
    appMatches,
    appMinutes: left.appMinutes + right.appMinutes,
    goals: left.goals + right.goals,
    assists: left.assists + right.assists,
    avgRating: mergeAverageRatings(
      left.avgRating,
      left.appMatches,
      right.avgRating,
      right.appMatches
    ),
        recentCallUps: Math.max(left.recentCallUps, right.recentCallUps),
    recentMatches: Math.max(left.recentMatches, right.recentMatches),
    recentMinutes: Math.max(left.recentMinutes, right.recentMinutes),
    currentStatus: getStrongerCurrentStatus(
      left.currentStatus,
      right.currentStatus
    ),
    latestCampName: left.latestCampName || right.latestCampName,

    leadership: left.leadership ?? right.leadership,
    teamwork: left.teamwork ?? right.teamwork,
    pressure: left.pressure ?? right.pressure,
    professionalism: left.professionalism ?? right.professionalism,
    importantMatches: left.importantMatches ?? right.importantMatches,
    ambition: left.ambition ?? right.ambition,
    loyalty: left.loyalty ?? right.loyalty,
    controversy: left.controversy ?? right.controversy,
    fairPlay: left.fairPlay ?? right.fairPlay,
    temperament: left.temperament ?? right.temperament,
    consistency: left.consistency ?? right.consistency,
    injuryProneness: left.injuryProneness ?? right.injuryProneness,
    versatility: left.versatility ?? right.versatility,
    currentReputation: left.currentReputation ?? right.currentReputation,
    homeReputation: left.homeReputation ?? right.homeReputation,
    worldReputation: left.worldReputation ?? right.worldReputation,
    potential: left.potential ?? right.potential,
  };

  return recalculateNationalCorePlayerScores(merged);
}

function mergeNationalCorePlayers(
  players: NationalCorePlayer[]
): NationalCorePlayer[] {
  const mergedByKey = new Map<string, NationalCorePlayer>();

  for (const player of players) {
    const key = getNationalCorePlayerMergeKey(player);
    const existing = mergedByKey.get(key);

    if (!existing) {
      mergedByKey.set(key, player);
      continue;
    }

    mergedByKey.set(key, mergeNationalCorePlayer(existing, player));
  }

  return [...mergedByKey.values()];
}
const MAX_CORE_PLAYERS = 15;
const MAX_NATURAL_CAPTAINS = 4;
const MAX_CAPTAIN_CANDIDATES = 10;
const MAX_VICE_CAPTAIN_CANDIDATES = 18;

function isEligibleForCurrentCore(player: NationalCorePlayer): boolean {
  if (
    player.currentStatus !== "Aktualnie powołany" &&
    player.currentStatus !== "Regularnie powoływany" &&
    player.currentStatus !== "Ostatnio w rotacji"
  ) {
    return false;
  }

  return player.coreScore >= 55;
}

function getCoreRankingValue(player: NationalCorePlayer): number {
  const currentStatusBonus: Record<NationalCoreCurrentStatus, number> = {
    "Aktualnie powołany": 30,
    "Regularnie powoływany": 22,
    "Ostatnio w rotacji": 12,
    "Odesłany / poza finałową kadrą": -5,
    "Historyczny lider": -12,
    "Poza aktualną kadrą": -20,
  };

  return (
    player.coreScore +
    currentStatusBonus[player.currentStatus] +
    Math.min(12, player.recentMinutes / 45) +
    Math.min(8, player.recentCallUps * 2)
  );
}

function isEligibleForCaptainHierarchy(player: NationalCorePlayer): boolean {
  if (
    player.currentStatus !== "Aktualnie powołany" &&
    player.currentStatus !== "Regularnie powoływany" &&
    player.currentStatus !== "Ostatnio w rotacji"
  ) {
    return false;
  }

  if (player.appMatches + player.nationalCaps < 5) {
    return false;
  }

  return player.captainScore >= 58;
}

function getCaptainRankingValue(player: NationalCorePlayer): number {
  const currentStatusBonus: Record<NationalCoreCurrentStatus, number> = {
    "Aktualnie powołany": 28,
    "Regularnie powoływany": 20,
    "Ostatnio w rotacji": 10,
    "Odesłany / poza finałową kadrą": -10,
    "Historyczny lider": -18,
    "Poza aktualną kadrą": -28,
  };

  const leadershipScore =
    attr(player.leadership) * 1.6 +
    attr(player.teamwork) * 0.9 +
    attr(player.pressure) * 0.75 +
    attr(player.professionalism) * 0.65 +
    attr(player.importantMatches) * 0.45;

  const experienceScore =
    Math.min(12, player.nationalCaps * 0.16) +
    Math.min(8, player.appMatches * 0.45) +
    Math.min(6, player.recentMinutes / 90);

  return (
    player.captainScore +
    leadershipScore +
    experienceScore +
    currentStatusBonus[player.currentStatus]
  );
}

function getRankedCaptainStatus(
  player: NationalCorePlayer,
  captainRank: number | null
): string {
  if (
    player.currentStatus === "Poza aktualną kadrą" ||
    player.currentStatus === "Historyczny lider"
  ) {
    if (player.nationalCaps + player.appMatches >= 30) {
      return "Historyczny lider poza aktualną kadrą";
    }

    return "Poza aktualną hierarchią";
  }

  if (player.currentStatus === "Odesłany / poza finałową kadrą") {
    return "Poza finałową kadrą";
  }

  if (captainRank === null) {
    if (player.age !== null && player.age <= 23 && player.captainScore >= 55) {
      return "Przyszły lider";
    }

    if (player.appMatches + player.nationalCaps < 5) {
      return "Za mało doświadczenia";
    }

    return "Opcja rezerwowa";
  }

  if (captainRank <= MAX_NATURAL_CAPTAINS) {
    return "Naturalny lider kadry";
  }

  if (captainRank <= MAX_CAPTAIN_CANDIDATES) {
    return "Kandydat na kapitana";
  }

  if (captainRank <= MAX_VICE_CAPTAIN_CANDIDATES) {
    return "Kandydat na wicekapitana";
  }

  return "Opcja rezerwowa";
}

function applyNationalCoreStatuses(
  players: NationalCorePlayer[]
): NationalCorePlayer[] {
  const corePlayerKeys = new Set(
    [...players]
      .filter(isEligibleForCurrentCore)
      .sort((left, right) => {
        const rankingDiff =
          getCoreRankingValue(right) - getCoreRankingValue(left);

        if (rankingDiff !== 0) {
          return rankingDiff;
        }

        if (right.coreScore !== left.coreScore) {
          return right.coreScore - left.coreScore;
        }

        if (right.recentMinutes !== left.recentMinutes) {
          return right.recentMinutes - left.recentMinutes;
        }

        return left.name.localeCompare(right.name, "pl");
      })
      .slice(0, MAX_CORE_PLAYERS)
      .map((player) => player.key)
  );

  const captainRankByKey = new Map<string, number>();

  [...players]
    .filter(isEligibleForCaptainHierarchy)
    .sort((left, right) => {
      const rankingDiff =
        getCaptainRankingValue(right) - getCaptainRankingValue(left);

      if (rankingDiff !== 0) {
        return rankingDiff;
      }

      if (right.captainScore !== left.captainScore) {
        return right.captainScore - left.captainScore;
      }

      if (right.recentMinutes !== left.recentMinutes) {
        return right.recentMinutes - left.recentMinutes;
      }

      if (right.nationalCaps !== left.nationalCaps) {
        return right.nationalCaps - left.nationalCaps;
      }

      return left.name.localeCompare(right.name, "pl");
    })
    .slice(0, MAX_VICE_CAPTAIN_CANDIDATES)
    .forEach((player, index) => {
      captainRankByKey.set(player.key, index + 1);
    });

  return players.map((player) => {
    let coreStatus: NationalCoreStatus;

    if (corePlayerKeys.has(player.key)) {
      coreStatus = "Trzon kadry";
    } else if (
      player.currentStatus === "Aktualnie powołany" ||
      player.currentStatus === "Regularnie powoływany"
    ) {
      if (player.coreScore >= 45) {
        coreStatus = "Regularny";
      } else if (player.coreScore >= 20) {
        coreStatus = "Rotacja";
      } else {
        coreStatus = "Epizod";
      }
    } else if (player.currentStatus === "Ostatnio w rotacji") {
      coreStatus = player.coreScore >= 35 ? "Rotacja" : "Epizod";
    } else if (player.currentStatus === "Historyczny lider") {
      coreStatus = player.nationalCaps >= 40 ? "Rotacja" : "Epizod";
    } else if (player.currentStatus === "Odesłany / poza finałową kadrą") {
      coreStatus = "Rotacja";
    } else {
      coreStatus = player.coreScore > 0 ? "Epizod" : "Nowy";
    }

    const captainRank = captainRankByKey.get(player.key) ?? null;

    return {
      ...player,
      coreStatus,
      captainStatus: getRankedCaptainStatus(player, captainRank),
    };
  });
}
export function getNationalCorePlayers(
  rows: TableRow[],
  camps: Camp[]
): NationalCorePlayer[] {
  const rowLookup = buildRowLookup(rows);
  const summaries = getCareerPlayerSummaries(camps);
  const recentUsageByPlayerKey = getRecentPlayerUsageMap(camps);
  const usedRowKeys = new Set<string>();

  const playersFromHistory = summaries.map((summary) => {
    const lookupKeys = makeSummaryLookupKeys(summary.player);

    const row =
      lookupKeys.map((key) => rowLookup.get(key)).find(Boolean) ?? null;

    if (row) {
      for (const key of makeRowLookupKeys(row)) {
        usedRowKeys.add(key);
      }
    }
    const recentUsage =
      recentUsageByPlayerKey.get(summary.player.key) ?? getEmptyRecentUsage();
    return buildPlayerFromRowAndHistory({
      row,
      fallbackKey: summary.player.key,
      fallbackName: summary.player.name,
      fallbackClub: summary.player.club,
      fallbackPosition: summary.player.position,
      appCallUps: summary.callUps,
      appMatches: summary.matches,
      appMinutes: summary.minutes,
      goals: summary.goals,
      assists: summary.assists,
      avgRating: summary.avgRating,
      recentCallUps: recentUsage.recentCallUps,
      recentMatches: recentUsage.recentMatches,
      recentMinutes: recentUsage.recentMinutes,
      explicitCurrentStatus: recentUsage.currentStatus,
      latestCampName: recentUsage.latestCampName,
    });
  });

  const playersOnlyFromCurrentImport = rows
    .filter((row) => {
      const keys = makeRowLookupKeys(row);

      return !keys.some((key) => usedRowKeys.has(key));
    })
    .map((row) =>
      buildPlayerFromRowAndHistory({
        row,
        fallbackKey:
          getPlayerKey(row) ||
          String(row["Unique ID"] || "").trim() ||
          `${getRowName(row)}-${getRowClub(row)}`,
        fallbackName: getRowName(row),
        fallbackClub: getRowClub(row),
        fallbackPosition: getRowPosition(row),
        appCallUps: 0,
        appMatches: 0,
        appMinutes: 0,
        goals: 0,
        assists: 0,
        avgRating: null,
                recentCallUps: 0,
        recentMatches: 0,
        recentMinutes: 0,
        explicitCurrentStatus: null,
        latestCampName: "",
      })
    );
const mergedPlayers = applyNationalCoreStatuses(
  mergeNationalCorePlayers([
    ...playersFromHistory,
    ...playersOnlyFromCurrentImport,
  ])
);

return mergedPlayers.sort((left, right) => {
  const coreStatusOrder: Record<NationalCoreStatus, number> = {
    "Trzon kadry": 0,
    Regularny: 1,
    Rotacja: 2,
    Epizod: 3,
    Nowy: 4,
  };

  const statusDiff =
    coreStatusOrder[left.coreStatus] - coreStatusOrder[right.coreStatus];

  if (statusDiff !== 0) {
    return statusDiff;
  }

  if (right.coreScore !== left.coreScore) {
    return right.coreScore - left.coreScore;
  }

  if (right.recentMinutes !== left.recentMinutes) {
    return right.recentMinutes - left.recentMinutes;
  }

  if (right.nationalCaps !== left.nationalCaps) {
    return right.nationalCaps - left.nationalCaps;
  }

  return left.name.localeCompare(right.name, "pl");
});
}

export function formatNullableNumber(value: number | null): string {
  return value === null ? "-" : String(Math.round(value));
}

export function formatAverageRatingValue(value: number | null): string {
  if (value === null) return "-";

  return value.toFixed(2).replace(".", ",");
}

export function formatNationalCoreScore(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(".", ",");
}