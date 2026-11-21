import { invoke } from "@tauri-apps/api/core";

const STORAGE_PREFIX = "fm-player-sorter:national-callup-limit:v1:";

function storageKey(nationUid: number) {
  return `${STORAGE_PREFIX}${nationUid}`;
}

export function rememberNationalCallupLimit(nationUid: number | null | undefined, value: number) {
  if (!nationUid || !Number.isInteger(value) || value < 0 || value > 99) return;
  try {
    window.localStorage.setItem(storageKey(nationUid), String(value));
  } catch {
    // A blocked settings store must never interrupt a confirmed FM write.
  }
}

export async function restoreNationalCallupLimit(sessionId: number, nationUid: number | null) {
  if (!sessionId || !nationUid) return false;
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(storageKey(nationUid));
  } catch {
    return false;
  }
  if (!stored || !/^\d{1,2}$/.test(stored)) return false;
  const value = Number(stored);
  await invoke("restore_fm_national_callup_limit", { sessionId, value });
  return true;
}
