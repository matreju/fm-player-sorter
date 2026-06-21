import type { Campaign } from "../types/camp";
import { loadLocalStorageList, saveLocalStorageList } from "./localStorageList";

const STORAGE_KEY = "fm-player-sorter-campaigns-v1";

export function loadCampaigns(): Campaign[] {
  return loadLocalStorageList<Campaign>(STORAGE_KEY);
}

export function saveCampaigns(campaigns: Campaign[]) {
  saveLocalStorageList(STORAGE_KEY, campaigns);
}