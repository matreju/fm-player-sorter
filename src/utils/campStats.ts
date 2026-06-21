import type {
  Camp,
  CampMatch,
  CampMatchAppearance,
  CampMatchType,
  CampPlayerSnapshot,
  CampType,
} from "../types/camp";

export type CampPlayerSummary = {
  player: CampPlayerSnapshot;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  ratingSum: number;
  ratingCount: number;
  avgRating: number | null;
};
export type CareerPlayerSummary = {
  player: CampPlayerSnapshot;
  callUps: number;
  callUpPositionCounts: CallUpPositionCount[];
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  ratingSum: number;
  ratingCount: number;
  avgRating: number | null;
};
export type CareerPlayerCampEntry = {
  campId: string;
  campName: string;
  campType: CampType;
  dateFrom: string;
  dateTo: string;
};

export type CareerPlayerMatchEntry = {
  campId: string;
  campName: string;
  matchId: string;
  opponent: string;
  date: string;
  matchType: CampMatchType;
  score: string;
  resultTone: "win" | "draw" | "loss" | "none";
  minutes: number;
  goals: number;
  assists: number;
  rating: string;
};

export type CareerPlayerDetails = {
  camps: CareerPlayerCampEntry[];
  matches: CareerPlayerMatchEntry[];
};
export type CampaignStats = {
  campsCount: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  calledPlayers: number;
  checkedPlayers: number;
};
export type CampaignPlayerExtraStats = {
  playersWithMinutes: number;
  playersMin180: number;
  playersWithGoal: number;
  playersWithAssist: number;
  totalMinutes: number;
  averageMinutesPerCheckedPlayer: number;
  averageRating: number | null;
  topMinutesPlayer: CareerPlayerSummary | null;
  topScorer: CareerPlayerSummary | null;
};
export type CallUpPositionCount = {
  position: string;
  count: number;
};

export function formatMatchScore(match: CampMatch) {
  const hasTeamGoals = match.teamGoals.trim() !== "";
  const hasOpponentGoals = match.opponentGoals.trim() !== "";

  if (!hasTeamGoals && !hasOpponentGoals) {
    return "wynik nieuzupełniony";
  }

  return `${match.teamGoals || "0"}:${match.opponentGoals || "0"}`;
}

export function getMatchResultTone(match: CampMatch): "win" | "draw" | "loss" | "none" {
  const hasTeamGoals = match.teamGoals.trim() !== "";
  const hasOpponentGoals = match.opponentGoals.trim() !== "";

  if (!hasTeamGoals || !hasOpponentGoals) {
    return "none";
  }

  const team = Number(match.teamGoals);
  const opponent = Number(match.opponentGoals);

  if (Number.isNaN(team) || Number.isNaN(opponent)) {
    return "none";
  }

  if (team > opponent) {
    return "win";
  }

  if (team < opponent) {
    return "loss";
  }

  return "draw";
}
export function createDefaultAppearance(playerKey: string): CampMatchAppearance {
  return {
    playerKey,
    played: false,
    minutes: "",
    goals: "",
    assists: "",
    rating: "",
  };
}

export function getAppearanceForPlayer(
  match: CampMatch,
  playerKey: string
): CampMatchAppearance {
  return (
    match.appearances.find((appearance) => appearance.playerKey === playerKey) ??
    createDefaultAppearance(playerKey)
  );
}

function toNumber(value: string): number {
  const parsed = Number(String(value).replace(",", "."));

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

export function getMatchAppearancesSummary(match: CampMatch) {
  const appearances = match.appearances ?? [];

  const played = appearances.filter((appearance) => appearance.played).length;

  const goals = appearances.reduce(
    (sum, appearance) => sum + toNumber(appearance.goals),
    0
  );

  const assists = appearances.reduce(
    (sum, appearance) => sum + toNumber(appearance.assists),
    0
  );

  return {
    played,
    goals,
    assists,
  };
}
export function getCampPlayerSummaries(camp: Camp): CampPlayerSummary[] {
  const summaries = new Map<string, CampPlayerSummary>();

  for (const player of camp.players) {
    summaries.set(player.key, {
      player,
      matches: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      ratingSum: 0,
      ratingCount: 0,
      avgRating: null,
    });
  }

  for (const match of camp.matches) {
    for (const appearance of match.appearances ?? []) {
      if (!appearance.played) {
        continue;
      }

      const summary = summaries.get(appearance.playerKey);

      if (!summary) {
        continue;
      }

      summary.matches += 1;


      summary.minutes += toNumber(appearance.minutes);
      summary.goals += toNumber(appearance.goals);
      summary.assists += toNumber(appearance.assists);

      const rawRating = appearance.rating.trim();

      if (rawRating) {
        const rating = Number(rawRating.replace(",", "."));

        if (!Number.isNaN(rating)) {
          summary.ratingSum += rating;
          summary.ratingCount += 1;
        }
      }
    }
  }

  return Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      avgRating:
        summary.ratingCount > 0 ? summary.ratingSum / summary.ratingCount : null,
    }))
    .sort((left, right) => {
      if (right.minutes !== left.minutes) {
        return right.minutes - left.minutes;
      }

      if (right.matches !== left.matches) {
        return right.matches - left.matches;
      }

      return left.player.name.localeCompare(right.player.name, "pl");
    });
}

export function getCampTotals(camp: Camp | null, summaries: CampPlayerSummary[]) {
  const checkedPlayers = summaries.filter((summary) => summary.matches > 0).length;

  const totalMinutes = summaries.reduce(
    (sum, summary) => sum + summary.minutes,
    0
  );

  const averageMinutesPerCheckedPlayer =
    checkedPlayers > 0 ? Math.round(totalMinutes / checkedPlayers) : 0;

  const goalsFor =
    camp?.matches.reduce(
      (sum, match) => sum + toNumber(match.teamGoals),
      0
    ) ?? 0;

  const goalsAgainst =
    camp?.matches.reduce(
      (sum, match) => sum + toNumber(match.opponentGoals),
      0
    ) ?? 0;

  return {
    checkedPlayers,
    averageMinutesPerCheckedPlayer,
    goalsFor,
    goalsAgainst,
  };
}
export function formatAverageRating(value: number | null): string {
  if (value === null) {
    return "-";
  }

  return value.toFixed(2).replace(".", ",");
}
function getCallUpPositionForStats(player: CampPlayerSnapshot): string {
  const value = player.callUpPosition?.trim();

  if (value) {
    return value;
  }

  return "Brak zapisanej pozycji";
}

function addCallUpPositionCount(
  summary: CareerPlayerSummary,
  player: CampPlayerSnapshot
) {
  const position = getCallUpPositionForStats(player);
  const existing = summary.callUpPositionCounts.find(
    (item) => item.position === position
  );

  if (existing) {
    existing.count += 1;
    return;
  }

  summary.callUpPositionCounts.push({
    position,
    count: 1,
  });
}

export function formatCallUpPositionCounts(
  counts: CallUpPositionCount[]
): string {
  if (counts.length === 0) {
    return "Brak zapisanej pozycji";
  }

  return [...counts]
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.position.localeCompare(right.position, "pl");
    })
    .map((item) => `${item.position} ×${item.count}`)
    .join(", ");
}


export function getCampaignStats(camps: Camp[]): CampaignStats {
  const calledPlayers = new Set<string>();
  const checkedPlayers = new Set<string>();

  let matches = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const camp of camps) {
    for (const player of camp.players) {
      calledPlayers.add(player.key);
    }

    for (const match of camp.matches) {
      matches += 1;

      const teamGoals = toNumber(match.teamGoals);
      const opponentGoals = toNumber(match.opponentGoals);

      goalsFor += teamGoals;
      goalsAgainst += opponentGoals;

      const hasResult =
        match.teamGoals.trim() !== "" && match.opponentGoals.trim() !== "";

      if (hasResult) {
        if (teamGoals > opponentGoals) {
          wins += 1;
        } else if (teamGoals < opponentGoals) {
          losses += 1;
        } else {
          draws += 1;
        }
      }

      for (const appearance of match.appearances ?? []) {
        if (appearance.played) {
          checkedPlayers.add(appearance.playerKey);
        }
      }
    }
  }

  return {
    campsCount: camps.length,
    matches,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    calledPlayers: calledPlayers.size,
    checkedPlayers: checkedPlayers.size,
  };
}
export function getCampaignPlayerExtraStats(
  players: CareerPlayerSummary[]
): CampaignPlayerExtraStats {
  const playersWithMinutes = players.filter((player) => player.minutes > 0);
  const playersWithRating = players.filter((player) => player.avgRating !== null);

  const totalMinutes = players.reduce(
    (sum, player) => sum + player.minutes,
    0
  );

  const averageMinutesPerCheckedPlayer =
    playersWithMinutes.length > 0
      ? Math.round(totalMinutes / playersWithMinutes.length)
      : 0;

  const averageRating =
    playersWithRating.length > 0
      ? playersWithRating.reduce(
          (sum, player) => sum + (player.avgRating ?? 0),
          0
        ) / playersWithRating.length
      : null;

  const topMinutesPlayer =
    [...players]
      .filter((player) => player.minutes > 0)
      .sort(
        (left, right) =>
          right.minutes - left.minutes ||
          right.matches - left.matches ||
          left.player.name.localeCompare(right.player.name, "pl")
      )[0] ?? null;

  const topScorer =
    [...players]
      .filter((player) => player.goals > 0)
      .sort(
        (left, right) =>
          right.goals - left.goals ||
          right.minutes - left.minutes ||
          left.player.name.localeCompare(right.player.name, "pl")
      )[0] ?? null;

  return {
    playersWithMinutes: playersWithMinutes.length,
    playersMin180: players.filter((player) => player.minutes >= 180).length,
    playersWithGoal: players.filter((player) => player.goals > 0).length,
    playersWithAssist: players.filter((player) => player.assists > 0).length,
    totalMinutes,
    averageMinutesPerCheckedPlayer,
    averageRating,
    topMinutesPlayer,
    topScorer,
  };
}

export function formatCampaignRecord(stats: CampaignStats): string {
  return `${stats.wins}-${stats.draws}-${stats.losses}`;
}

export function formatCampaignRotation(stats: CampaignStats): string {
  if (stats.calledPlayers === 0) {
    return "0%";
  }

  return `${Math.round((stats.checkedPlayers / stats.calledPlayers) * 100)}%`;
}

export function formatCampaignPlayerLeader(
  player: CareerPlayerSummary | null,
  stat: "minutes" | "goals"
): string {
  if (!player) {
    return "-";
  }

  if (stat === "minutes") {
    return `${player.player.name} (${player.minutes})`;
  }

  return `${player.player.name} (${player.goals})`;
}
export function getCampComparisonStats(camp: Camp) {
  const summaries = getCampPlayerSummaries(camp);

  const checkedPlayers = summaries.filter((summary) => summary.matches > 0).length;

  const goalsFor = camp.matches.reduce(
    (sum, match) => sum + toNumber(match.teamGoals),
    0
  );

  const goalsAgainst = camp.matches.reduce(
    (sum, match) => sum + toNumber(match.opponentGoals),
    0
  );

  const bestRatedPlayer =
    [...summaries]
      .filter((summary) => summary.avgRating !== null)
      .sort(
        (left, right) =>
          (right.avgRating ?? 0) - (left.avgRating ?? 0) ||
          right.minutes - left.minutes
      )[0] ?? null;

  const withoutMinutes = summaries.filter((summary) => summary.matches === 0).length;

  return {
    checkedPlayers,
    goalsFor,
    goalsAgainst,
    bestRatedPlayer,
    withoutMinutes,
  };
}
export function getCareerPlayerSummaries(camps: Camp[]): CareerPlayerSummary[] {
  const summaries = new Map<string, CareerPlayerSummary>();

  for (const camp of camps) {
    const playersByKey = new Map(
      camp.players.map((player) => [player.key, player])
    );

    for (const player of camp.players) {
      const current = summaries.get(player.key);

      if (!current) {
        const nextSummary: CareerPlayerSummary = {
  player,
  callUps: 1,
  callUpPositionCounts: [],
  matches: 0,
  minutes: 0,
  goals: 0,
  assists: 0,
  ratingSum: 0,
  ratingCount: 0,
  avgRating: null,
};

addCallUpPositionCount(nextSummary, player);

summaries.set(player.key, nextSummary);

continue;
      }

      current.callUps += 1;
      current.player = player;
      addCallUpPositionCount(current, player);
    }

    for (const match of camp.matches) {
      for (const appearance of match.appearances ?? []) {
        if (!appearance.played) {
          continue;
        }

        const player = playersByKey.get(appearance.playerKey);
        const current = summaries.get(appearance.playerKey);

        if (!player || !current) {
          continue;
        }

        current.matches += 1;
        current.minutes += toNumber(appearance.minutes);
        current.goals += toNumber(appearance.goals);
        current.assists += toNumber(appearance.assists);

        const rawRating = appearance.rating.trim();

        if (rawRating) {
          const rating = Number(rawRating.replace(",", "."));

          if (!Number.isNaN(rating)) {
            current.ratingSum += rating;
            current.ratingCount += 1;
          }
        }
      }
    }
  }

  return Array.from(summaries.values())
    .map((summary) => ({
      ...summary,
      avgRating:
        summary.ratingCount > 0 ? summary.ratingSum / summary.ratingCount : null,
    }))
    .sort((left, right) => {
      if (right.callUps !== left.callUps) {
        return right.callUps - left.callUps;
      }

      if (right.matches !== left.matches) {
        return right.matches - left.matches;
      }

      if (right.minutes !== left.minutes) {
        return right.minutes - left.minutes;
      }

      return left.player.name.localeCompare(right.player.name, "pl");
    });
}
export function getCareerPlayerDetails(
  camps: Camp[],
  playerKey: string
): CareerPlayerDetails {
  const campEntries: CareerPlayerCampEntry[] = [];
  const matchEntries: CareerPlayerMatchEntry[] = [];

  for (const camp of camps) {
    const wasCalledUp = camp.players.some((player) => player.key === playerKey);

    if (!wasCalledUp) {
      continue;
    }

    campEntries.push({
      campId: camp.id,
      campName: camp.name,
      campType: camp.type,
      dateFrom: camp.dateFrom,
      dateTo: camp.dateTo,
    });

    for (const match of camp.matches) {
      const appearance = (match.appearances ?? []).find(
        (item) => item.playerKey === playerKey && item.played
      );

      if (!appearance) {
        continue;
      }

      matchEntries.push({
  campId: camp.id,
  campName: camp.name,
  matchId: match.id,
  opponent: match.opponent,
  date: match.date,
  matchType: match.type,
  score: formatMatchScore(match),
  resultTone: getMatchResultTone(match),
  minutes: toNumber(appearance.minutes),
  goals: toNumber(appearance.goals),
  assists: toNumber(appearance.assists),
  rating: appearance.rating,
});
    }
  }

  return {
    camps: campEntries,
    matches: matchEntries.sort((left, right) => {
      if (right.date !== left.date) {
        return right.date.localeCompare(left.date);
      }

      return right.campName.localeCompare(left.campName, "pl");
    }),
  };
}