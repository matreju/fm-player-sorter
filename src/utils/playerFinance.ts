// The reader exposes GBP and weekly wages. Keep source rows unchanged so
// existing snapshots, sorting and the native scouting index retain their units.
// Until the game currency table is exposed, EUR is an explicit estimate.
export const EUR_PER_GBP = 1.2;
export const WEEKS_PER_YEAR = 52;
export const FINANCE_NOTE = "Kwoty w euro są orientacyjne: 1 GBP = 1,20 EUR. Pensja roczna = 52 tygodnie.";
const euro = new Intl.NumberFormat("pl-PL", {style:"currency", currency:"EUR", maximumFractionDigits:0});
export function formatPlayerFinance(column: string, value: string | undefined): string {
  if (!value?.trim()) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return euro.format(amount * EUR_PER_GBP * (column === "Pensja" ? WEEKS_PER_YEAR : 1));
}
export function financeFilterToNative(value: string, wage: boolean, bound: "min" | "max"): number | undefined {
  if (!value.trim()) return undefined;
  const amount = Number(value) / (EUR_PER_GBP * (wage ? WEEKS_PER_YEAR : 1));
  // Native amounts are integers; preserve inclusive range boundaries.
  return bound === "min" ? Math.ceil(amount - 1e-9) : Math.floor(amount + 1e-9);
}
