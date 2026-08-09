use serde::Serialize;
use sysinfo::System;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmProcessStatus {
    pub detected: bool,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub executable_path: Option<String>,
    pub matched_by: Option<String>,
}

impl FmProcessStatus {
    fn not_detected() -> Self {
        Self {
            detected: false,
            pid: None,
            process_name: None,
            executable_path: None,
            matched_by: None,
        }
    }
}

fn is_known_fm_process_name(name: &str) -> bool {
    matches!(
        name,
        "fm.exe" | "fm" | "fm24.exe" | "fm24" | "fm25.exe" | "fm25" | "fm26.exe" | "fm26"
    )
}

#[tauri::command]
pub fn detect_football_manager() -> FmProcessStatus {
    let system = System::new_all();

    /*
     * Pierwsze przejście:
     * wybieramy wyłącznie proces o dokładnej nazwie fm.exe.
     *
     * Nie wybieramy żadnych launcherów, crash reporterów,
     * helperów ani innych plików z folderu Football Managera.
     */
    if let Some(process) = system
        .processes()
        .values()
        .filter(|process| {
            is_known_fm_process_name(&process.name().to_string_lossy().to_ascii_lowercase())
        })
        .max_by_key(|process| {
            let is_game_path = process
                .exe()
                .map(|path| {
                    path.to_string_lossy()
                        .to_ascii_lowercase()
                        .contains("football manager")
                })
                .unwrap_or(false);
            (is_game_path, process.memory())
        })
    {
        let process_name = process.name().to_string_lossy().to_string();
        let executable_path = process.exe().map(|path| path.to_string_lossy().to_string());
        return FmProcessStatus {
            detected: true,
            pid: Some(process.pid().as_u32()),
            process_name: Some(process_name),
            executable_path,
            matched_by: Some("exact_process_name".to_string()),
        };
    }

    /*
     * Drugie przejście jest tylko awaryjne.
     *
     * Ścieżka musi prowadzić do znanego pliku FM,
     * a nie do dowolnego programu w folderze gry.
     */
    if let Some(process) = system
        .processes()
        .values()
        .filter(|process| {
            let Some(executable) = process.exe() else {
                return false;
            };
            let normalized_path = executable.to_string_lossy().to_ascii_lowercase();
            let executable_name = executable
                .file_name()
                .map(|name| name.to_string_lossy().to_ascii_lowercase());
            executable_name
                .as_deref()
                .map(is_known_fm_process_name)
                .unwrap_or(false)
                && normalized_path.contains("football manager")
        })
        .max_by_key(|process| process.memory())
    {
        let executable = process
            .exe()
            .expect("proces został wcześniej odfiltrowany po ścieżce");
        let process_name = process.name().to_string_lossy().to_string();

        return FmProcessStatus {
            detected: true,
            pid: Some(process.pid().as_u32()),
            process_name: Some(process_name),
            executable_path: Some(executable.to_string_lossy().to_string()),
            matched_by: Some("exact_executable_path".to_string()),
        };
    }

    FmProcessStatus::not_detected()
}
