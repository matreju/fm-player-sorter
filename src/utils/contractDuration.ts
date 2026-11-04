/** Remaining whole calendar months, using the game's date rather than the computer clock. */
export function contractDuration(expiry: string | undefined, gameDate: string | null): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!expiry || !gameDate || !iso.test(expiry) || !iso.test(gameDate)) return "—";
  if (expiry < gameDate) return "Wygasł";
  const [ey,em,ed] = expiry.split("-").map(Number);
  const [gy,gm,gd] = gameDate.split("-").map(Number);
  const months = (ey-gy)*12+em-gm-(ed<gd ? 1 : 0);
  if (months < 1) return "< 1 mies.";
  const years=Math.floor(months/12), rest=months%12;
  return [years ? `${years} ${years===1 ? "rok" : years<5 ? "lata" : "lat"}` : "",rest ? `${rest} mies.` : ""].filter(Boolean).join(" ");
}
