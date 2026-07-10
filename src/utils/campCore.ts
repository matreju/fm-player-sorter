import type {
  Camp,
  CampMatchType,
  CampPlayerSnapshot,
  CampType,
} from "../types/camp";
import type { TableRow } from "../types/table";
import {
  getLegacyPlayerKey,
  getPlayerKey,
  getPlayerUniqueId,
} from "./playerIdentity";

export const CAMP_TYPES: { id: CampType; label: string }[] = [
  { id: "friendly", label: "Towarzyskie" },
  { id: "qualifiers", label: "Eliminacje" },
  { id: "nations-league", label: "Liga Narodów" },
  { id: "tournament", label: "Turniej" },
  { id: "other", label: "Inne" },
];

export const MATCH_TYPES: { id: CampMatchType; label: string }[] = [
  { id: "friendly", label: "Towarzyski" },
  { id: "qualifiers", label: "Eliminacje" },
  { id: "nations-league", label: "Liga Narodów" },
  { id: "tournament", label: "Turniej" },
  { id: "other", label: "Inny" },
];

export function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getPlayerName(row: TableRow) {
  return row["Nazwisko"] || "-";
}

export function createPlayerSnapshot(row: TableRow): CampPlayerSnapshot {
  const uid = getPlayerUniqueId(row);

  return {
    key: getPlayerKey(row),
    name: getPlayerName(row),
    club: row["Klub"] || "-",
    position: row["Pozycja"] || "-",
    age: row["Wiek"] || "-",
    uid: uid || undefined,
    legacyKey: getLegacyPlayerKey(row),
    status: "active",
  };
}
export function isCampPlayerActive(player: CampPlayerSnapshot): boolean {
  return player.status !== "released";
}

export function isCampPlayerReleased(player: CampPlayerSnapshot): boolean {
  return player.status === "released";
}

export function getActiveCampPlayers(
  players: CampPlayerSnapshot[]
): CampPlayerSnapshot[] {
  return players.filter(isCampPlayerActive);
}
export function isValidCampPlayer(player: CampPlayerSnapshot): boolean {
  const name = player.name.trim();
  const key = player.key.trim();

  if (!name || name === "-") {
    return false;
  }

  if (!key || key === "|||") {
    return false;
  }

  return true;
}

function getCampPlayerIdentityKeys(player: CampPlayerSnapshot): string[] {
  return [
    player.key,
    player.uid ? `uid:${player.uid}` : "",
    player.uid ?? "",
    player.legacyKey ?? "",
    [player.name ?? "", player.club ?? "", player.position ?? "", player.age ?? ""].join("|"),
  ].filter(Boolean);
}

export function hasSharedIdentity(
  left: CampPlayerSnapshot,
  right: CampPlayerSnapshot
): boolean {
  const leftKeys = new Set(getCampPlayerIdentityKeys(left));

  return getCampPlayerIdentityKeys(right).some((key) => leftKeys.has(key));
}

function getSnapshotLegacyKey(player: CampPlayerSnapshot): string {
  return (
    player.legacyKey ??
    [player.name ?? "", player.club ?? "", player.position ?? "", player.age ?? ""].join("|")
  );
}

export function migrateCampsToUniqueIds(camps: Camp[], rows: TableRow[]): Camp[] {
  const replacements = new Map<string, string>();

  for (const row of rows) {
    const uniqueId = getPlayerUniqueId(row);

    if (!uniqueId) {
      continue;
    }

    const legacyKey = getLegacyPlayerKey(row);
    const uidKey = getPlayerKey(row);

    if (legacyKey && uidKey !== legacyKey) {
      replacements.set(legacyKey, uidKey);
    }
  }

  if (replacements.size === 0) {
    return camps;
  }

  let changed = false;

  const nextCamps = camps.map((camp) => {
    let campChanged = false;
    const playerKeyMap = new Map<string, string>();

    const nextPlayers = camp.players.map((player) => {
      const legacyKey = getSnapshotLegacyKey(player);
      const nextKey =
        replacements.get(player.key) ??
        replacements.get(legacyKey) ??
        player.key;

      playerKeyMap.set(player.key, nextKey);
      playerKeyMap.set(legacyKey, nextKey);

      if (nextKey !== player.key || !player.legacyKey) {
        changed = true;
        campChanged = true;

        return {
          ...player,
          key: nextKey,
          legacyKey,
        };
      }

      return player;
    });

    const nextMatches = camp.matches.map((match) => {
      let matchChanged = false;

      const nextAppearances = (match.appearances ?? []).map((appearance) => {
        const nextPlayerKey =
          playerKeyMap.get(appearance.playerKey) ??
          replacements.get(appearance.playerKey) ??
          appearance.playerKey;

        if (nextPlayerKey !== appearance.playerKey) {
          changed = true;
          campChanged = true;
          matchChanged = true;

          return {
            ...appearance,
            playerKey: nextPlayerKey,
          };
        }

        return appearance;
      });

      if (!matchChanged) {
        return match;
      }

      return {
        ...match,
        appearances: nextAppearances,
      };
    });

    if (!campChanged) {
      return camp;
    }

    return {
      ...camp,
      players: nextPlayers,
      matches: nextMatches,
    };
  });

  return changed ? nextCamps : camps;
}

export function getCampTypeLabel(type: CampType) {
  return CAMP_TYPES.find((item) => item.id === type)?.label ?? "Inne";
}

export function getMatchTypeLabel(type: CampMatchType) {
  return MATCH_TYPES.find((item) => item.id === type)?.label ?? "Inny";
}

export function getDefaultCampName() {
  return `Zgrupowanie ${new Date().toLocaleDateString("pl-PL")}`;
}