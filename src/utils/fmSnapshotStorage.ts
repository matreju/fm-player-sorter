import type { FmDatabaseLoadResult } from "../services/fmConnection";
import type { TableRow } from "../types/table";

const DATABASE_NAME = "fm-player-sorter";
const DATABASE_VERSION = 1;
const STORE_NAME = "fm-snapshots";
const CURRENT_SNAPSHOT_KEY = "current-national-team";
const CURRENT_SNAPSHOT_SCHEMA = 4;

export type StoredFmSnapshot = {
  key: typeof CURRENT_SNAPSHOT_KEY;
  schemaVersion: typeof CURRENT_SNAPSHOT_SCHEMA;
  savedAt: string;
  gameDate: string | null;
  managedTeam: string | null;
  managedNation: string | null;
  managedTeamUid: number | null;
  managedNationUid: number | null;
  teamLogoDataUrl: string | null;
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

export function createFmSnapshot(
  result: FmDatabaseLoadResult,
): StoredFmSnapshot {
  return {
    key: CURRENT_SNAPSHOT_KEY,
    schemaVersion: CURRENT_SNAPSHOT_SCHEMA,
    savedAt: new Date().toISOString(),
    gameDate: result.gameDate,
    managedTeam: result.managedTeam,
    managedNation: result.managedNation,
    managedTeamUid: result.managedTeamUid,
    managedNationUid: result.managedNationUid,
    teamLogoDataUrl: result.teamLogoDataUrl,
    managedSquadGender: result.managedSquadGender,
    databasePlayerCount: result.databasePlayerCount,
    playerCount: result.playerCount,
    headers: result.headers,
    rows: result.rows,
  };
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
