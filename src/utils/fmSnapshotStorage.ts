import type { FmDatabaseLoadResult } from "../services/fmConnection";
import type { TableRow } from "../types/table";

const DATABASE_NAME = "fm-player-sorter";
const DATABASE_VERSION = 1;
const STORE_NAME = "fm-snapshots";
const CURRENT_SNAPSHOT_KEY = "current-national-team";

export type StoredFmSnapshot = {
  key: typeof CURRENT_SNAPSHOT_KEY;
  savedAt: string;
  gameDate: string | null;
  managedTeam: string | null;
  managedNation: string | null;
  managedSquadGender: string | null;
  databasePlayerCount: number;
  playerCount: number;
  headers: string[];
  rows: TableRow[];
};

function openSnapshotDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error("Nie udało się otworzyć pamięci aplikacji."));
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveFmSnapshot(
  result: FmDatabaseLoadResult,
): Promise<StoredFmSnapshot> {
  const snapshot: StoredFmSnapshot = {
    key: CURRENT_SNAPSHOT_KEY,
    savedAt: new Date().toISOString(),
    gameDate: result.gameDate,
    managedTeam: result.managedTeam,
    managedNation: result.managedNation,
    managedSquadGender: result.managedSquadGender,
    databasePlayerCount: result.databasePlayerCount,
    playerCount: result.playerCount,
    headers: result.headers,
    rows: result.rows,
  };

  const database = await openSnapshotDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(snapshot);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Nie udało się zapisać danych FM."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Zapisywanie danych FM przerwano."));
    });
  } finally {
    database.close();
  }

  return snapshot;
}

export async function loadFmSnapshot(): Promise<StoredFmSnapshot | null> {
  const database = await openSnapshotDatabase();
  try {
    return await new Promise<StoredFmSnapshot | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction
        .objectStore(STORE_NAME)
        .get(CURRENT_SNAPSHOT_KEY);
      request.onsuccess = () =>
        resolve((request.result as StoredFmSnapshot | undefined) ?? null);
      request.onerror = () =>
        reject(request.error ?? new Error("Nie udało się odczytać danych FM."));
    });
  } finally {
    database.close();
  }
}

export async function clearFmSnapshot(): Promise<void> {
  const database = await openSnapshotDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(CURRENT_SNAPSHOT_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Nie udało się usunąć danych FM."));
    });
  } finally {
    database.close();
  }
}
