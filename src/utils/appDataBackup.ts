const APP_STORAGE_PREFIX = "fm-player-sorter-";
const BACKUP_SCHEMA = "fm-player-sorter-backup";
const BACKUP_VERSION = 1;

export type AppDataBackup = {
  schema: typeof BACKUP_SCHEMA;
  version: number;
  exportedAt: string;
  appStoragePrefix: typeof APP_STORAGE_PREFIX;
  items: Record<string, string>;
};

function getAppStorageKeys(): string[] {
  const keys: string[] = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);

    if (!key) {
      continue;
    }

    if (key.startsWith(APP_STORAGE_PREFIX)) {
      keys.push(key);
    }
  }

  return keys.sort((left, right) => left.localeCompare(right, "pl"));
}

function makeSafeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function createAppDataBackup(): AppDataBackup {
  const items: Record<string, string> = {};

  for (const key of getAppStorageKeys()) {
    const value = localStorage.getItem(key);

    if (value !== null) {
      items[key] = value;
    }
  }

  return {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appStoragePrefix: APP_STORAGE_PREFIX,
    items,
  };
}

export function getAppDataBackupSummary() {
  const keys = getAppStorageKeys();

  let totalBytes = 0;

  for (const key of keys) {
    totalBytes += key.length;
    totalBytes += localStorage.getItem(key)?.length ?? 0;
  }

  return {
    keysCount: keys.length,
    totalBytes,
  };
}

export function downloadAppDataBackup(fileNameHint?: string) {
  const backup = createAppDataBackup();

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], {
    type: "application/json;charset=utf-8",
  });

  const objectUrl = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const safeHint = fileNameHint ? makeSafeFileNamePart(fileNameHint) : "";
  const fileName = safeHint
    ? `fm-player-sorter-backup_${safeHint}_${date}.json`
    : `fm-player-sorter-backup_${date}.json`;

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAppDataBackup(raw: string): AppDataBackup {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Nie udało się odczytać pliku JSON.");
  }

  if (!isPlainObject(parsed)) {
    throw new Error("To nie jest poprawny plik backupu aplikacji.");
  }

  if (parsed.schema !== BACKUP_SCHEMA) {
    throw new Error("Ten plik nie wygląda jak backup fm-player-sorter.");
  }

  if (!isPlainObject(parsed.items)) {
    throw new Error("Backup nie zawiera poprawnych danych aplikacji.");
  }

  const items: Record<string, string> = {};

  for (const [key, value] of Object.entries(parsed.items)) {
    if (!key.startsWith(APP_STORAGE_PREFIX)) {
      continue;
    }

    if (typeof value !== "string") {
      continue;
    }

    items[key] = value;
  }

  return {
    schema: BACKUP_SCHEMA,
    version:
      typeof parsed.version === "number" && Number.isFinite(parsed.version)
        ? parsed.version
        : 0,
    exportedAt:
      typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    appStoragePrefix: APP_STORAGE_PREFIX,
    items,
  };
}

export function replaceAppDataFromBackup(backup: AppDataBackup) {
  for (const key of getAppStorageKeys()) {
    localStorage.removeItem(key);
  }

  for (const [key, value] of Object.entries(backup.items)) {
    if (!key.startsWith(APP_STORAGE_PREFIX)) {
      continue;
    }

    localStorage.setItem(key, value);
  }
}

export function clearAppData() {
  for (const key of getAppStorageKeys()) {
    localStorage.removeItem(key);
  }
}