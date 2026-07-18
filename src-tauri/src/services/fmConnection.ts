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

  return invoke<FmModuleReport>(
    "inspect_fm_modules",
  );
}