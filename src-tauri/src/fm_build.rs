use std::{
    fs::{self, File},
    io::{BufReader, Read},
    time::UNIX_EPOCH,
};

use serde::Serialize;
use sha2::{Digest, Sha256};

use crate::fm_process::detect_football_manager;

const HASH_BUFFER_SIZE: usize = 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmBuildInfo {
    pub pid: u32,
    pub process_name: String,
    pub executable_path: String,

    pub file_size: u64,
    pub modified_unix_ms: Option<u64>,

    pub sha256: String,
    pub short_hash: String,
    pub profile_id: String,
}

#[tauri::command]
pub async fn inspect_fm_build() -> Result<FmBuildInfo, String> {
    tauri::async_runtime::spawn_blocking(inspect_fm_build_blocking)
        .await
        .map_err(|error| format!("Wątek identyfikacji wersji FM zakończył się błędem: {error}"))?
}

fn inspect_fm_build_blocking() -> Result<FmBuildInfo, String> {
    let process = detect_football_manager();

    if !process.detected {
        return Err("Nie wykryto uruchomionego Football Managera.".to_string());
    }

    let pid = process
        .pid
        .ok_or_else(|| "FM został wykryty, ale nie udało się odczytać PID.".to_string())?;

    let process_name = process.process_name.ok_or_else(|| {
        "FM został wykryty, ale nie udało się odczytać nazwy procesu.".to_string()
    })?;

    let executable_path = process
        .executable_path
        .ok_or_else(|| "FM został wykryty, ale ścieżka do fm.exe jest niedostępna.".to_string())?;

    let metadata = fs::metadata(&executable_path)
        .map_err(|error| format!("Nie udało się odczytać informacji o pliku fm.exe: {error}"))?;

    if !metadata.is_file() {
        return Err("Wykryta ścieżka Football Managera nie prowadzi do pliku.".to_string());
    }

    let file_size = metadata.len();

    let modified_unix_ms = metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .and_then(|duration| u64::try_from(duration.as_millis()).ok());

    let sha256 = calculate_sha256(&executable_path)?;

    let short_hash = sha256.get(..16).unwrap_or(&sha256).to_string();

    let profile_id = format!("fm-{}-{}", file_size, short_hash);

    Ok(FmBuildInfo {
        pid,
        process_name,
        executable_path,

        file_size,
        modified_unix_ms,

        sha256,
        short_hash,
        profile_id,
    })
}

pub(crate) fn calculate_sha256(path: &str) -> Result<String, String> {
    let file = File::open(path)
        .map_err(|error| format!("Nie udało się otworzyć pliku do obliczenia SHA-256: {error}"))?;

    let mut reader = BufReader::with_capacity(HASH_BUFFER_SIZE, file);

    let mut hasher = Sha256::new();
    let mut buffer = vec![0_u8; HASH_BUFFER_SIZE];

    loop {
        let bytes_read = reader
            .read(&mut buffer)
            .map_err(|error| format!("Błąd podczas odczytu pliku: {error}"))?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
    }

    let digest = hasher.finalize();

    Ok(format!("{digest:x}"))
}
