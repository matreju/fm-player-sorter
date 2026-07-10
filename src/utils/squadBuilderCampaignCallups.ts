import type { Camp, CampPlayerSnapshot } from "../types/camp";
import type { TableRow } from "../types/table";
import { createPlayerSnapshot, hasSharedIdentity } from "./campCore";
import { getPlayerKey } from "./playerIdentity";

export type CampaignCallUpsPlayerSummary = {
  total: number;
  byPositionGroup: Record<string, number>;
  matches: number;
  minutes: number;
  ratingSum: number;
  ratingCount: number;
  avgRating: number | null;
};

export type CampaignCallUpsByPlayerKey = Record<
  string,
  CampaignCallUpsPlayerSummary
>;

function normalizePositionGroup(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseNumber(value: unknown): number | null {
  const text = String(value ?? "")
    .replace(",", ".")
    .trim();

  if (!text) {
    return null;
  }

  const parsed = Number(text);

  return Number.isFinite(parsed) ? parsed : null;
}

function getCampPlayerCallUpPositionGroup(player: CampPlayerSnapshot): string {
  return normalizePositionGroup(player.callUpPosition);
}

function createEmptySummary(): CampaignCallUpsPlayerSummary {
  return {
    total: 0,
    byPositionGroup: {},
    matches: 0,
    minutes: 0,
    ratingSum: 0,
    ratingCount: 0,
    avgRating: null,
  };
}

function incrementPositionCount(
  summary: CampaignCallUpsPlayerSummary,
  positionGroup: string
) {
  if (!positionGroup) {
    return;
  }

  summary.byPositionGroup[positionGroup] =
    (summary.byPositionGroup[positionGroup] ?? 0) + 1;
}

function finalizeSummary(
  summary: CampaignCallUpsPlayerSummary
): CampaignCallUpsPlayerSummary {
  if (summary.ratingCount === 0) {
    return {
      ...summary,
      avgRating: null,
    };
  }

  return {
    ...summary,
    avgRating: Number((summary.ratingSum / summary.ratingCount).toFixed(2)),
  };
}

export function getCampaignPositionCallUpsForSlot(
  summary: CampaignCallUpsPlayerSummary | undefined,
  slotPositionGroup: string
): number {
  if (!summary) {
    return 0;
  }

  return summary.byPositionGroup[normalizePositionGroup(slotPositionGroup)] ?? 0;
}

export function buildCampaignCallUpsByPlayerKey(
  rows: TableRow[],
  camps: Camp[],
  campaignId: string
): CampaignCallUpsByPlayerKey {
  if (!campaignId) {
    return {};
  }

  const campaignCamps = camps.filter((camp) => camp.campaignId === campaignId);

  if (campaignCamps.length === 0) {
    return {};
  }

  const result: CampaignCallUpsByPlayerKey = {};

  for (const row of rows) {
    const rowSnapshot = createPlayerSnapshot(row);
    const rowKey = getPlayerKey(row);
    const summary = createEmptySummary();

    for (const camp of campaignCamps) {
      const matchingCampPlayer = camp.players.find((campPlayer) =>
        hasSharedIdentity(rowSnapshot, campPlayer)
      );

      if (!matchingCampPlayer) {
        continue;
      }

      summary.total += 1;

      incrementPositionCount(
        summary,
        getCampPlayerCallUpPositionGroup(matchingCampPlayer)
      );

      for (const match of camp.matches) {
        const appearance = match.appearances.find(
          (item) => item.playerKey === matchingCampPlayer.key
        );

        if (!appearance) {
          continue;
        }

        const minutes = parseNumber(appearance.minutes) ?? 0;
        const rating = parseNumber(appearance.rating);

        const played = appearance.played || minutes > 0;

        if (!played) {
          continue;
        }

        summary.matches += 1;
        summary.minutes += minutes;

        if (rating !== null) {
          summary.ratingSum += rating;
          summary.ratingCount += 1;
        }
      }
    }

    result[rowKey] = finalizeSummary(summary);
  }

  return result;
}