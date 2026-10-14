use std::{
    fs,
    mem::size_of,
    path::{Path, PathBuf},
};

use serde::Serialize;

use crate::{fm_build::calculate_sha256, fm_process::detect_football_manager};

const MAX_HASHED_CANDIDATES: usize = 12;
const LARGE_MODULE_LIMIT: u32 = 1024 * 1024;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmLoadedModule {
    pub name: String,
    pub path: String,

    pub base_address: String,
    pub memory_size: u32,
    pub file_size: Option<u64>,

    pub is_game_directory: bool,
    pub is_candidate: bool,
    pub category: String,

    pub sha256: Option<String>,
    pub short_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmModuleReport {
    pub pid: u32,
    pub executable_path: String,
    pub game_directory: String,

    pub module_count: usize,
    pub candidate_count: usize,

    pub modules: Vec<FmLoadedModule>,
}

#[tauri::command]
pub async fn inspect_fm_modules() -> Result<FmModuleReport, String> {
    tauri::async_runtime::spawn_blocking(inspect_fm_modules_blocking)
        .await
        .map_err(|error| format!("Wątek odczytu modułów FM zakończył się błędem: {error}"))?
}

pub(crate) fn inspect_fm_modules_blocking() -> Result<FmModuleReport, String> {
    let process = detect_football_manager();

    if !process.detected {
        return Err("Nie wykryto uruchomionego Football Managera.".to_string());
    }

    let pid = process
        .pid
        .ok_or_else(|| "FM został wykryty, ale nie udało się odczytać PID.".to_string())?;

    let executable_path = process
        .executable_path
        .ok_or_else(|| "Nie udało się odczytać ścieżki fm.exe.".to_string())?;

    let game_directory = PathBuf::from(&executable_path)
        .parent()
        .ok_or_else(|| "Nie udało się ustalić folderu Football Managera.".to_string())?
        .to_path_buf();

    let game_directory_text = game_directory.to_string_lossy().to_string();

    let normalized_game_directory = normalize_path(&game_directory_text);

    let mut modules = enumerate_modules(pid, &normalized_game_directory)?;

    /*
     * Najpierw pokazujemy kandydatów,
     * potem sortujemy malejąco po rozmiarze.
     */
    modules.sort_by(|left, right| {
        right
            .is_candidate
            .cmp(&left.is_candidate)
            .then_with(|| right.memory_size.cmp(&left.memory_size))
            .then_with(|| {
                left.name
                    .to_ascii_lowercase()
                    .cmp(&right.name.to_ascii_lowercase())
            })
    });

    /*
     * Nie haszujemy wszystkich bibliotek systemowych.
     * Obliczamy SHA-256 tylko dla pierwszych
     * najbardziej prawdopodobnych modułów gry.
     */
    let mut hashed_count = 0_usize;

    for module in &mut modules {
        if !module.is_candidate || hashed_count >= MAX_HASHED_CANDIDATES {
            continue;
        }

        if !Path::new(&module.path).is_file() {
            continue;
        }

        match calculate_sha256(&module.path) {
            Ok(hash) => {
                module.short_hash = Some(hash.get(..16).unwrap_or(&hash).to_string());

                module.sha256 = Some(hash);
                hashed_count += 1;
            }

            Err(error) => {
                eprintln!(
                    "Nie udało się obliczyć hasha modułu {}: {}",
                    module.name, error,
                );
            }
        }
    }

    let candidate_count = modules.iter().filter(|module| module.is_candidate).count();

    Ok(FmModuleReport {
        pid,
        executable_path,
        game_directory: game_directory_text,

        module_count: modules.len(),
        candidate_count,

        modules,
    })
}

#[cfg(target_os = "windows")]
fn enumerate_modules(
    pid: u32,
    normalized_game_directory: &str,
) -> Result<Vec<FmLoadedModule>, String> {
    use std::{thread, time::Duration};

    let mut last_error = None;

    // CreateToolhelp32Snapshot potrafi zwrócić przejściowy ERROR_PARTIAL_COPY,
    // gdy FM ładuje lub zwalnia bibliotekę dokładnie w chwili wykonywania
    // migawki. Nie uznajemy pojedynczej takiej próby za trwałą awarię.
    for attempt in 0..5_u64 {
        match enumerate_modules_once(pid, normalized_game_directory) {
            Ok(modules) => return Ok(modules),
            Err(error) => last_error = Some(error),
        }

        if attempt < 4 {
            thread::sleep(Duration::from_millis(40 * (attempt + 1)));
        }
    }

    Err(last_error.unwrap_or_else(|| {
        "Nie udało się pobrać listy modułów procesu FM.".to_string()
    }))
}

#[cfg(target_os = "windows")]
fn enumerate_modules_once(
    pid: u32,
    normalized_game_directory: &str,
) -> Result<Vec<FmLoadedModule>, String> {
    use windows::Win32::{
        Foundation::{CloseHandle, HANDLE},
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Module32FirstW, Module32NextW, MODULEENTRY32W,
            TH32CS_SNAPMODULE, TH32CS_SNAPMODULE32,
        },
    };

    struct HandleGuard(HANDLE);

    impl Drop for HandleGuard {
        fn drop(&mut self) {
            unsafe {
                let _ = CloseHandle(self.0);
            }
        }
    }

    let snapshot =
        unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, pid) }
            .map(HandleGuard)
            .map_err(|error| format!("Nie udało się pobrać listy modułów procesu FM: {error}"))?;

    let mut entry = MODULEENTRY32W::default();

    entry.dwSize = size_of::<MODULEENTRY32W>() as u32;

    unsafe { Module32FirstW(snapshot.0, &mut entry) }
        .map_err(|error| format!("Nie udało się odczytać pierwszego modułu FM: {error}"))?;

    let mut modules = Vec::new();

    loop {
        let name = wide_string(&entry.szModule);
        let path = wide_string(&entry.szExePath);

        let normalized_path = normalize_path(&path);

        let is_game_directory = normalized_path.starts_with(normalized_game_directory);

        let memory_size = entry.modBaseSize;

        let file_size = fs::metadata(&path)
            .ok()
            .filter(|metadata| metadata.is_file())
            .map(|metadata| metadata.len());

        let category = classify_module(&name, is_game_directory, memory_size);

        let is_candidate = is_candidate_module(&name, is_game_directory, memory_size);

        modules.push(FmLoadedModule {
            name,
            path,

            base_address: format!("0x{:X}", entry.modBaseAddr as usize,),

            memory_size,
            file_size,

            is_game_directory,
            is_candidate,
            category,

            sha256: None,
            short_hash: None,
        });

        let next_result = unsafe { Module32NextW(snapshot.0, &mut entry) };

        if next_result.is_err() {
            break;
        }
    }

    Ok(modules)
}

#[cfg(not(target_os = "windows"))]
fn enumerate_modules(
    _pid: u32,
    _normalized_game_directory: &str,
) -> Result<Vec<FmLoadedModule>, String> {
    Err("Odczyt modułów FM jest przygotowany tylko dla Windows.".to_string())
}

fn wide_string(value: &[u16]) -> String {
    let length = value
        .iter()
        .position(|character| *character == 0)
        .unwrap_or(value.len());

    String::from_utf16_lossy(&value[..length])
}

fn normalize_path(value: &str) -> String {
    value
        .replace('/', "\\")
        .trim_end_matches('\\')
        .to_ascii_lowercase()
}

fn classify_module(name: &str, is_game_directory: bool, memory_size: u32) -> String {
    let normalized = name.to_ascii_lowercase();

    match normalized.as_str() {
        "fm.exe" => "program-startowy".to_string(),

        "gameassembly.dll" => "unity-il2cpp".to_string(),

        "unityplayer.dll" => "unity-runtime".to_string(),

        "mono-2.0-bdwgc.dll" | "mono.dll" | "monobleedingedge.dll" => "unity-mono".to_string(),

        _ if normalized.contains("unity") => "unity".to_string(),

        _ if normalized.contains("mono") => "mono".to_string(),

        _ if is_game_directory && memory_size >= LARGE_MODULE_LIMIT => "duzy-modul-gry".to_string(),

        _ if is_game_directory => "modul-gry".to_string(),

        _ => "system-lub-biblioteka-zewnetrzna".to_string(),
    }
}

fn is_candidate_module(name: &str, is_game_directory: bool, memory_size: u32) -> bool {
    if !is_game_directory {
        return false;
    }

    let normalized = name.to_ascii_lowercase();

    let known_name = matches!(
        normalized.as_str(),
        "fm.exe"
            | "gameassembly.dll"
            | "unityplayer.dll"
            | "mono-2.0-bdwgc.dll"
            | "mono.dll"
            | "monobleedingedge.dll"
    );

    known_name
        || normalized.contains("unity")
        || normalized.contains("mono")
        || memory_size >= LARGE_MODULE_LIMIT
}
