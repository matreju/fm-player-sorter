export function loadLocalStorageList<T>(storageKey: string): T[] {
  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as T[];
  } catch {
    return [];
  }
}

export function saveLocalStorageList<T>(storageKey: string, items: T[]) {
  localStorage.setItem(storageKey, JSON.stringify(items));
}