import type { StoredTable } from "../types/table";

const STORAGE_KEY = "fm-player-sorter-table-v1";

export function loadStoredTable(): StoredTable | null {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved) as StoredTable;

    if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
      return parsed;
    }

    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveStoredTable(table: StoredTable): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(table));
}

export function clearStoredTable(): void {
  localStorage.removeItem(STORAGE_KEY);
}