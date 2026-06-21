import type { Camp } from "../types/camp";
import { loadLocalStorageList, saveLocalStorageList } from "./localStorageList";

const STORAGE_KEY = "fm-player-sorter-camps-v1";

export function loadCamps(): Camp[] {
  return loadLocalStorageList<Camp>(STORAGE_KEY);
}

export function saveCamps(camps: Camp[]) {
  saveLocalStorageList(STORAGE_KEY, camps);
}