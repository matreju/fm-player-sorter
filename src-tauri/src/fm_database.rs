use serde::Serialize;

use crate::{
    fm_graphics::find_managed_team_logo,
    fm_reader::{
        read_fm_date_status, read_fm_native_database, FmClassOffsetStat, FmDateStatus, FmTableRow,
    },
    fm_stats::{load_latest_save_stats, SeasonStatsRows, SEASON_STATS_HEADERS},
    fm_process::detect_football_manager,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmDatabaseLoadResult {
    pub success: bool,
    pub stage: String,
    pub message: String,
    pub reader_mode: String,
    pub requires_bepinex: bool,
    pub read_only: bool,
    pub pid: Option<u32>,
    pub profile: Option<String>,
    pub database_root_found: bool,
    pub database_player_count: usize,
    pub player_count: usize,
    pub managed_team: Option<String>,
    pub managed_nation: Option<String>,
    pub managed_team_uid: Option<u32>,
    pub managed_nation_uid: Option<u32>,
    pub team_logo_data_url: Option<String>,
    pub managed_squad_gender: Option<String>,
    pub national_filter_applied: bool,
    pub scan_region_count: usize,
    pub scanned_bytes: u64,
    pub scan_duration_ms: u128,
    pub game_date: Option<String>,
    pub game_date_source: String,
    pub date_monitor_candidates: usize,
    pub data_stale: bool,
    pub headers: Vec<String>,
    pub rows: Vec<FmTableRow>,
    pub class_offsets: Vec<FmClassOffsetStat>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmSeasonStatsResult {
    pub headers: Vec<String>,
    pub rows: SeasonStatsRows,
    pub player_count: usize,
}

impl FmDatabaseLoadResult {
    fn failed(stage: &str, message: String, pid: Option<u32>) -> Self {
        Self {
            success: false,
            stage: stage.to_string(),
            message,
            reader_mode: "external-process-memory".to_string(),
            requires_bepinex: false,
            read_only: true,
            pid,
            profile: None,
            database_root_found: false,
            database_player_count: 0,
            player_count: 0,
            managed_team: None,
            managed_nation: None,
            managed_team_uid: None,
            managed_nation_uid: None,
            team_logo_data_url: None,
            managed_squad_gender: None,
            national_filter_applied: false,
            scan_region_count: 0,
            scanned_bytes: 0,
            scan_duration_ms: 0,
            game_date: None,
            game_date_source: "unavailable".to_string(),
            date_monitor_candidates: 0,
            data_stale: false,
            headers: Vec::new(),
            rows: Vec::new(),
            class_offsets: Vec::new(),
        }
    }
}

#[tauri::command]
pub async fn load_fm_database() -> Result<FmDatabaseLoadResult, String> {
    tauri::async_runtime::spawn_blocking(load_fm_database_blocking)
        .await
        .map_err(|error| format!("Wątek wczytywania bazy FM zakończył się błędem: {error}"))
}

fn load_fm_database_blocking() -> FmDatabaseLoadResult {
    let process = detect_football_manager();
    if !process.detected {
        return FmDatabaseLoadResult::failed(
            "fm-not-running",
            "Nie wykryto uruchomionego Football Managera.".to_string(),
            None,
        );
    }

    match read_fm_native_database() {
        Ok(database) => FmDatabaseLoadResult {
            success: true,
            stage: "database-loaded".to_string(),
            message: format!(
                "Wczytano jednorazowo {} zawodników uprawnionych do gry dla reprezentacji {} wraz z pełnymi atrybutami i danymi ukrytymi.",
                database.player_count,
                database.managed_nation.as_deref().unwrap_or("narodowej")
            ),
            reader_mode: "external-process-memory".to_string(),
            requires_bepinex: false,
            read_only: true,
            pid: Some(database.pid),
            profile: Some(database.profile),
            database_root_found: true,
            database_player_count: database.database_player_count,
            player_count: database.player_count,
            managed_team: database.managed_team,
            managed_nation: database.managed_nation,
            managed_team_uid: database.managed_team_uid,
            managed_nation_uid: database.managed_nation_uid,
            team_logo_data_url: None,
            managed_squad_gender: database.managed_squad_gender,
            national_filter_applied: database.national_filter_applied,
            scan_region_count: database.scan_region_count,
            scanned_bytes: database.scanned_bytes,
            scan_duration_ms: database.scan_duration_ms,
            game_date: database.game_date,
            game_date_source: database.game_date_source,
            date_monitor_candidates: database.date_monitor_candidates,
            data_stale: false,
            headers: database.headers,
            rows: database.rows,
            class_offsets: database.class_offsets,
        },
        Err(message) => FmDatabaseLoadResult::failed(
            if message.contains("26.3.x") {
                "unsupported-memory-profile"
            } else {
                "database-read-failed"
            },
            message,
            process.pid,
        ),
    }
}

#[tauri::command(rename_all = "camelCase")]
pub async fn load_fm_season_stats(uids: Vec<u32>) -> Result<FmSeasonStatsResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let rows = load_latest_save_stats(&uids);
        FmSeasonStatsResult {
            headers: SEASON_STATS_HEADERS
                .iter()
                .map(|header| (*header).to_string())
                .collect(),
            player_count: rows.len(),
            rows,
        }
    })
    .await
    .map_err(|error| format!("Wątek odczytu statystyk FM zakończył się błędem: {error}"))
}

#[tauri::command(rename_all = "camelCase")]
pub async fn load_fm_team_logo(
    managed_nation_uid: Option<u32>,
    managed_team_uid: Option<u32>,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        find_managed_team_logo(managed_nation_uid, managed_team_uid)
    })
    .await
    .map_err(|error| format!("Wątek odczytu herbu reprezentacji zakończył się błędem: {error}"))
}

#[tauri::command]
pub async fn get_fm_date_status() -> Result<FmDateStatus, String> {
    tauri::async_runtime::spawn_blocking(read_fm_date_status)
        .await
        .map_err(|error| format!("Wątek monitorowania daty FM zakończył się błędem: {error}"))
}
