import { invoke, isTauri } from "@tauri-apps/api/core";

export interface FmProcessStatus {
  detected: boolean;
  pid: number | null;
  processName: string | null;
  executablePath: string | null;
  matchedBy: "process_name" | "executable_path" | null;
}
export interface FmMemoryStatus {
  processDetected: boolean;
  memoryReadable: boolean;

  pid: number | null;
  processName: string | null;
  executablePath: string | null;

  moduleBaseAddress: string | null;
  moduleSize: number | null;
  executableSignature: string | null;

  error: string | null;
}
export function isDesktopApp(): boolean {
  return isTauri();
}

export async function detectFootballManager(): Promise<FmProcessStatus> {
  if (!isTauri()) {
    return {
      detected: false,
      pid: null,
      processName: null,
      executablePath: null,
      matchedBy: null,
    };
  }

  return invoke<FmProcessStatus>("detect_football_manager");
}
export async function probeFootballManagerMemory(): Promise<FmMemoryStatus> {
  if (!isTauri()) {
    return {
      processDetected: false,
      memoryReadable: false,

      pid: null,
      processName: null,
      executablePath: null,

      moduleBaseAddress: null,
      moduleSize: null,
      executableSignature: null,

      error: null,
    };
  }

  return invoke<FmMemoryStatus>("probe_fm_memory");
}
export interface FmBuildInfo {
  pid: number;
  processName: string;
  executablePath: string;

  fileSize: number;
  modifiedUnixMs: number | null;

  sha256: string;
  shortHash: string;
  profileId: string;
}

export async function inspectFootballManagerBuild(): Promise<FmBuildInfo> {
  if (!isTauri()) {
    throw new Error(
      "Identyfikacja wersji FM jest dostępna tylko w aplikacji desktopowej.",
    );
  }

  return invoke<FmBuildInfo>("inspect_fm_build");
}
export interface FmLoadedModule {
  name: string;
  path: string;

  baseAddress: string;
  memorySize: number;
  fileSize: number | null;

  isGameDirectory: boolean;
  isCandidate: boolean;
  category: string;

  sha256: string | null;
  shortHash: string | null;
}

export interface FmModuleReport {
  pid: number;
  executablePath: string;
  gameDirectory: string;

  moduleCount: number;
  candidateCount: number;

  modules: FmLoadedModule[];
}

export async function inspectFootballManagerModules(): Promise<FmModuleReport> {
  if (!isTauri()) {
    throw new Error(
      "Odczyt modułów FM jest dostępny tylko w aplikacji desktopowej.",
    );
  }

  return invoke<FmModuleReport>("inspect_fm_modules");
}
export interface FmStaticPointerCandidate {
  sourceMethod: string;
  sourceRva: string;
  instructionAddress: string;
  targetAddress: string;
  targetValue: string | null;
  targetValueReadable: boolean;

  valueFirstQword: string | null;
  valueSecondQword: string | null;
  objectClassPointer: string | null;
  objectTypeName: string | null;
  objectNamespace: string | null;
  directClassName: string | null;
  directClassNamespace: string | null;

  staticFieldsOffset: string | null;
  staticFieldObjectPointer: string | null;
  staticFieldObjectType: string | null;

  classification: string;
  likelyExpectedObject: boolean;
  memoryPreview: string | null;
}

export interface FmRuntimeInstanceCandidate {
  objectAddress: string;
  objectType: string;
  classPointer: string;

  gamePluginBridgePointer: string | null;
  gamePluginBridgeType: string | null;

  receiverPointer: string | null;
  receiverType: string | null;

  likelyLiveInstance: boolean;
  memoryPreview: string | null;
}

export interface FmReaderProfileStatus {
  processDetected: boolean;
  pid: number | null;
  executablePath: string | null;
  gameDirectory: string | null;

  profileId: string;
  expectedFmVersion: string;
  supportedBuild: boolean;
  runtimeReady: boolean;

  fmExePath: string | null;
  fmExeSha256: string | null;
  fmExeMatches: boolean;

  gameAssemblyPath: string | null;
  gameAssemblySha256: string | null;
  gameAssemblyMatches: boolean;
  gameAssemblyBase: string | null;
  gameAssemblyModuleReady: boolean;

  globalMetadataPath: string | null;
  globalMetadataSha256: string | null;
  globalMetadataMatches: boolean;
  metadataHeaderValid: boolean;

  gamePluginPath: string | null;
  gamePluginBase: string | null;
  gamePluginModuleReady: boolean;

  methodProbeRva: string;
  methodProbeAddress: string | null;
  methodProbeReadable: boolean;
  methodProbeBytes: string | null;

  staticPointerCandidates: FmStaticPointerCandidate[];
  resolvedRuntimeRootCount: number;

  gameRecordSerialisationObject: string | null;
  channelDataPoolObject: string | null;
  gamePluginClassPointer: string | null;
  gamePluginInstances: FmRuntimeInstanceCandidate[];
  instanceScanBytes: number;
  instanceScanDurationMs: number;
  instanceScanTruncated: boolean;

  databaseRootProfileReady: boolean;
  error: string | null;
}

export interface FmClassOffsetStat {
  offset: string;
  count: number;
}

export interface FmDatabaseLoadResult {
  success: boolean;
  stage:
    | "fm-not-running"
    | "memory-unavailable"
    | "unsupported-build"
    | "runtime-not-ready"
    | "profile-ready-root-unresolved"
    | "database-loaded"
    | string;
  message: string;

  readerMode: string;
  requiresBepinex: boolean;
  readOnly: boolean;
  pid: number | null;
  profile: string | null;
  databaseRootFound: boolean;
  databasePlayerCount: number;
  playerCount: number;
  managedTeam: string | null;
  managedNation: string | null;
  managedTeamUid: number | null;
  managedNationUid: number | null;
  teamLogoDataUrl: string | null;
  managedSquadGender: string | null;
  managedMode: "club" | "nation" | "unknown";
  managedClubUid: number | null;
  sessionId: number;
  nationalFilterApplied: boolean;
  scanRegionCount: number;
  scannedBytes: number;
  scanDurationMs: number;
  gameDate: string | null;
  gameDateSource: string;
  dateMonitorCandidates: number;
  dataStale: boolean;
  headers: string[];
  rows: Record<string, string>[];
  classOffsets: FmClassOffsetStat[];
}

export interface FmDateStatus {
  processDetected: boolean;
  available: boolean;
  importedDate: string | null;
  currentDate: string | null;
  dataStale: boolean;
  source: string;
  candidateCount: number;
  error: string | null;
}

export interface FmSeasonStatsResult {
  headers: string[];
  rows: Record<string, Record<string, string>>;
  playerCount: number;
}

export async function inspectFootballManagerReaderProfile(): Promise<FmReaderProfileStatus> {
  if (!isTauri()) {
    throw new Error(
      "Profil zewnętrznego czytnika FM jest dostępny tylko w aplikacji desktopowej.",
    );
  }

  return invoke<FmReaderProfileStatus>("inspect_fm_reader_profile");
}

export async function loadFootballManagerDatabase(): Promise<FmDatabaseLoadResult> {
  if (!isTauri()) {
    throw new Error(
      "Wczytywanie bazy FM jest dostępne tylko w aplikacji desktopowej.",
    );
  }

  return invoke<FmDatabaseLoadResult>("load_fm_database");
}

export async function loadFootballManagerSeasonStats(
  uids: number[],
): Promise<FmSeasonStatsResult> {
  if (!isTauri()) {
    return { headers: [], rows: {}, playerCount: 0 };
  }

  return invoke<FmSeasonStatsResult>("load_fm_season_stats", { uids });
}

export async function loadFootballManagerTeamLogo(
  managedNationUid: number | null,
  managedTeamUid: number | null,
): Promise<string | null> {
  if (!isTauri()) return null;

  return invoke<string | null>("load_fm_team_logo", {
    managedNationUid,
    managedTeamUid,
  });
}

export async function getFootballManagerDateStatus(): Promise<FmDateStatus> {
  if (!isTauri()) {
    return {
      processDetected: false,
      available: false,
      importedDate: null,
      currentDate: null,
      dataStale: false,
      source: "unavailable",
      candidateCount: 0,
      error: null,
    };
  }

  return invoke<FmDateStatus>("get_fm_date_status");
}

export interface FmScoutingQuery {
  sessionId: number; text: string; position: string; status: string; sort: string;
  minCa?: number; maxCa?: number; minPa?: number; maxPa?: number; minAge?: number; maxAge?: number;
  minFee?: number; maxFee?: number; minWage?: number; maxWage?: number;
  clubScope: string; contractAfter: string;
  contractBefore: string; page: number; pageSize: number;
}
export interface FmScoutingResult {
  sessionId: number; total: number; databaseTotal: number; page: number; pageSize: number; gameDate: string | null;
  rows: Record<string,string>[];
}
export async function searchFootballManagerPlayers(query: FmScoutingQuery): Promise<FmScoutingResult> {
  if (!isTauri()) throw new Error("Wyszukiwarka wymaga połączenia z grą w aplikacji Windows.");
  return invoke<FmScoutingResult>("search_fm_players", {query});
}
