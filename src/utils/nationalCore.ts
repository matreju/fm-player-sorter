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

function getCaptainStatus(
  captainScore: number,
  age: number | null,
  nationalCaps: number,
  appMatches: number
): string {
  if (captainScore >= 84) return "Naturalny lider kadry";
  if (captainScore >= 74) return "Kandydat na kapitana";
  if (captainScore >= 64) return "Kandydat na wicekapitana";

  if (age !== null && age <= 23 && captainScore >= 55) {
    return "Przyszły lider";
  }

  if (nationalCaps + appMatches < 5) {
    return "Za mało doświadczenia";
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
}): number {
  const experienceScore =
    Math.min(18, params.nationalCaps * 0.35) +
    Math.min(9, params.appMatches * 0.6) +
    Math.min(7, params.appCallUps * 1.05);

  const riskPenalty =
    attr(params.controversy) * 0.65 + attr(params.temperament) * 0.45;

  const raw =
    attr(params.leadership) * 2.65 +
    attr(params.teamwork) * 1.45 +
    attr(params.pressure) * 1.1 +
    attr(params.professionalism) * 1.0 +
    attr(params.importantMatches) * 0.8 +
    attr(params.loyalty) * 0.45 +
    attr(params.fairPlay) * 0.28 +
    experienceScore +
    getAgeCaptainBonus(params.age) -
    riskPenalty;

  return roundScore(clamp(raw));
}

function getCoreStatus(coreScore: number): NationalCoreStatus {
  if (coreScore >= 70) return "Trzon kadry";
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
}): number {
  const repAverage = reputationAverage({
    currentReputation: params.currentReputation,
    homeReputation: params.homeReputation,
    worldReputation: params.worldReputation,
  });

  const capsScore = Math.min(40, params.nationalCaps * 0.66);
  const nationalGoalsScore = Math.min(10, params.nationalGoals * 0.55);
  const callUpsScore = Math.min(18, params.appCallUps * 3.0);
  const matchesScore = Math.min(13, params.appMatches * 1.0);
  const minutesScore = Math.min(6, params.appMinutes / 180);

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
      params.appMatches
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
  });

  return {
    ...player,
    captainScore,
    captainStatus: getCaptainStatus(
      captainScore,
      player.age,
      player.nationalCaps,
      player.appMatches
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

export function getNationalCorePlayers(
  rows: TableRow[],
  camps: Camp[]
): NationalCorePlayer[] {
  const rowLookup = buildRowLookup(rows);
  const summaries = getCareerPlayerSummaries(camps);
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
      })
    );

  const mergedPlayers = mergeNationalCorePlayers([
    ...playersFromHistory,
    ...playersOnlyFromCurrentImport,
  ]);

  return mergedPlayers.sort((left, right) => {
    if (right.coreScore !== left.coreScore) {
      return right.coreScore - left.coreScore;
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