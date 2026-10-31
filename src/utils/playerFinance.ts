import type { TableRow } from "../types/table";

// Source rows and the native index retain GBP and weekly wages. The only
// permitted conversion factor is the one read from this game's currency records.
export const WEEKS_PER_YEAR = 52;
export const FINANCE_NOTE = "Kurs EUR/GBP odczytany z gry. Pensja roczna = 52 tygodnie.";
export const FINANCE_UNAVAILABLE = "Brak potwierdzonego kursu EUR w pamięci gry. Odśwież dane; kwoty i filtry w euro będą dostępne po odczycie kursu.";
const euro = new Intl.NumberFormat("pl-PL", {style:"currency", currency:"EUR", maximumFractionDigits:0});
export function getGameEuroRate(row: TableRow | undefined): number | undefined {
  const rate = Number(row?.["_fmEurPerGbp"]);
  return Number.isFinite(rate) && rate > 0 ? rate : undefined;
}
export function formatPlayerFinance(column: string, value: string | undefined, rate: number | undefined): string {
  if (!value?.trim() || rate === undefined) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return euro.format(amount * rate * (column === "Pensja" ? WEEKS_PER_YEAR : 1));
}
export function financeFilterToNative(value: string, wage: boolean, bound: "min" | "max", rate: number | undefined): number | undefined {
  if (!value.trim()) return undefined;
  if (rate === undefined) throw new Error(FINANCE_UNAVAILABLE);
  const amount = Number(value) / (rate * (wage ? WEEKS_PER_YEAR : 1));
  return bound === "min" ? Math.ceil(amount - 1e-9) : Math.floor(amount + 1e-9);
}
