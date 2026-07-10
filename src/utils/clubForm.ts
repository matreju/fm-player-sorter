import type { TableRow } from "../types/table";

export type ClubFormImpact = {
  rating: number | null;
  recentRating: number | null;
  minutes: number | null;
  bonus: number;
};

function parseNumber(value: string): number | null {
  const normalized = value
    .trim()
    .replace(",", ".")
    .replace(/\s+/g, "");

  if (!normalized || normalized === "-") return null;

  const number = Number(normalized);

  if (!Number.isFinite(number)) return null;

  return number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function getMinutesMultiplier(minutes: number | null): number {
  if (minutes === null) return 0.65;
  if (minutes < 250) return 0.35;
  if (minutes < 500) return 0.6;
  if (minutes < 800) return 0.82;

  return 1;
}

function getClubFormRawBonus(combinedRating: number): number {
  const baseBonus = (combinedRating - 6.75) * 3.2;

  if (combinedRating >= 7.6) {
    return baseBonus + 1.4;
  }

  if (combinedRating >= 7.4) {
    return baseBonus + 0.9;
  }

  if (combinedRating >= 7.2) {
    return baseBonus + 0.45;
  }

  if (combinedRating <= 6.45) {
    return baseBonus - 0.45;
  }

  return baseBonus;
}

export function calculateClubFormImpact(row: TableRow): ClubFormImpact {
  const rating = parseNumber(row["Średnia ocena w klubie"] ?? "");
  const recentRating = parseNumber(row["Ostatnie 5 występów klubowych"] ?? "");
  const minutes = parseNumber(row["Minuty"] ?? "");

  let combinedRating: number | null = null;

  if (rating !== null && recentRating !== null) {
    combinedRating = rating * 0.55 + recentRating * 0.45;
  } else if (rating !== null) {
    combinedRating = rating;
  } else if (recentRating !== null) {
    combinedRating = recentRating;
  }

  if (combinedRating === null) {
    return {
      rating,
      recentRating,
      minutes,
      bonus: 0,
    };
  }

  const minutesMultiplier = getMinutesMultiplier(minutes);
  const rawBonus = getClubFormRawBonus(combinedRating);
  const limitedBonus = clamp(rawBonus, -2.0, 6.0);
  const finalBonus = Math.round(limitedBonus * minutesMultiplier * 10) / 10;

  return {
    rating,
    recentRating,
    minutes,
    bonus: finalBonus,
  };
}

export function applyClubFormImpact(
  score: number,
  impact: ClubFormImpact
): number {
  return clamp(score + impact.bonus, 0, 100);
}

export function formatClubFormImpact(impact: ClubFormImpact): string {
  const bestRating = impact.recentRating ?? impact.rating;

  if (bestRating === null) {
    return "-";
  }

  const ratingText = bestRating.toFixed(2).replace(".", ",");
  const bonusText =
    impact.bonus > 0
      ? `+${impact.bonus.toFixed(1)}`
      : impact.bonus.toFixed(1);

  return `${ratingText} (${bonusText})`;
}