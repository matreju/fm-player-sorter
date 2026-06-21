export function loadLocalStorageValue<T>(storageKey: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveLocalStorageValue<T>(storageKey: string, value: T) {
  localStorage.setItem(storageKey, JSON.stringify(value));
}