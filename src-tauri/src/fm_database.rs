use serde::Serialize;

use crate::{
    fm_memory::{probe_fm_memory, FmMemoryStatus},
    fm_profile::{inspect_fm_reader_profile_blocking, FmReaderProfileStatus},
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmPlayerPreview {
    pub uid: Option<u64>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub club_name: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmDatabaseLoadResult {
    pub success: bool,
    pub stage: String,
    pub message: String,

    pub reader_mode: String,
    pub requires_bepinex: bool,
    pub read_only: bool,

    pub profile: FmReaderProfileStatus,
    pub memory: FmMemoryStatus,

    pub database_root_found: bool,
    pub player_count: usize,
    pub game_date: Option<String>,
    pub data_stale: bool,
    pub players: Vec<FmPlayerPreview>,
}

#[tauri::command]
pub async fn load_fm_database() -> Result<FmDatabaseLoadResult, String> {
    tauri::async_runtime::spawn_blocking(load_fm_database_blocking)
        .await
        .map_err(|error| format!("Wątek wczytywania bazy FM zakończył się błędem: {error}"))?
}

fn load_fm_database_blocking() -> Result<FmDatabaseLoadResult, String> {
    let profile = inspect_fm_reader_profile_blocking()?;
    let memory = probe_fm_memory();

    if !profile.process_detected {
        return Ok(FmDatabaseLoadResult {
            success: false,
            stage: "fm-not-running".to_string(),
            message: "Nie wykryto uruchomionego Football Managera.".to_string(),

            reader_mode: "external-process-memory".to_string(),
            requires_bepinex: false,
            read_only: true,

            profile,
            memory,

            database_root_found: false,
            player_count: 0,
            game_date: None,
            data_stale: false,
            players: Vec::new(),
        });
    }

    if !memory.memory_readable {
        return Ok(FmDatabaseLoadResult {
            success: false,
            stage: "memory-unavailable".to_string(),
            message: memory.error.clone().unwrap_or_else(|| {
                "Nie udało się otworzyć pamięci FM w trybie odczytu.".to_string()
            }),

            reader_mode: "external-process-memory".to_string(),
            requires_bepinex: false,
            read_only: true,

            profile,
            memory,

            database_root_found: false,
            player_count: 0,
            game_date: None,
            data_stale: false,
            players: Vec::new(),
        });
    }

    if !profile.supported_build {
        return Ok(FmDatabaseLoadResult {
            success: false,
            stage: "unsupported-build".to_string(),
            message: profile.error.clone().unwrap_or_else(|| {
                "Wersja Football Managera nie pasuje do wbudowanego profilu czytnika.".to_string()
            }),

            reader_mode: "external-process-memory".to_string(),
            requires_bepinex: false,
            read_only: true,

            profile,
            memory,

            database_root_found: false,
            player_count: 0,
            game_date: None,
            data_stale: false,
            players: Vec::new(),
        });
    }

    if !profile.runtime_ready {
        return Ok(FmDatabaseLoadResult {
            success: false,
            stage: "runtime-not-ready".to_string(),
            message: profile.error.clone().unwrap_or_else(|| {
                "Profil buildu pasuje, ale wymagane moduły FM nie są jeszcze gotowe.".to_string()
            }),

            reader_mode: "external-process-memory".to_string(),
            requires_bepinex: false,
            read_only: true,

            profile,
            memory,

            database_root_found: false,
            player_count: 0,
            game_date: None,
            data_stale: false,
            players: Vec::new(),
        });
    }

    let has_live_game_plugin = profile
        .game_plugin_instances
        .iter()
        .any(|instance| instance.likely_live_instance);

    /*
     * Ten etap celowo NIE zwraca fikcyjnych zawodników.
     *
     * Mamy już:
     * - właściwy proces,
     * - dostęp tylko do odczytu,
     * - zgodność trzech hashy buildu,
     * - prawidłowy global-metadata.dat,
     * - bazę GameAssembly po ASLR,
     * - czytelny kod metody pod znanym RVA,
     * - załadowany game_plugin.dll.
     *
     * Brakującym elementem jest stabilna sygnatura lub pointer-chain
     * prowadząca do głównego rejestru bazy osób. Dopiero po jej ustaleniu
     * można bezpiecznie przejść po wszystkich rekordach Person/Player.
     */
    Ok(FmDatabaseLoadResult {
        success: false,
        stage: if has_live_game_plugin {
            "runtime-game-plugin-resolved".to_string()
        } else {
            "profile-ready-root-unresolved".to_string()
        },
        message: if has_live_game_plugin {
            concat!(
                "Rozpoznano dokładny build FM26 oraz aktywną instancję ",
                "FM.GamePlugin.GamePlugin. Odczytano jej most do natywnego pluginu ",
                "i odbiornik danych. Następny profil musi przejść z tego mostu ",
                "do natywnego rejestru Person/Player."
            )
            .to_string()
        } else {
            concat!(
                "Zewnętrzny czytnik jest podłączony i rozpoznał dokładny build FM26. ",
                "GameAssembly.dll, game_plugin.dll oraz global-metadata.dat są gotowe. ",
                "Nie znaleziono jeszcze żywej instancji GamePlugin prowadzącej ",
                "do natywnego runtime gry."
            )
            .to_string()
        },

        reader_mode: "external-process-memory".to_string(),
        requires_bepinex: false,
        read_only: true,

        profile,
        memory,

        database_root_found: false,
        player_count: 0,
        game_date: None,
        data_stale: false,
        players: Vec::new(),
    })
}
