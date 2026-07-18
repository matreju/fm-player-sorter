mod fm_build;
mod fm_database;
mod fm_memory;
mod fm_modules;
mod fm_process;
mod fm_profile;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            fm_process::detect_football_manager,
            fm_memory::probe_fm_memory,
            fm_build::inspect_fm_build,
            fm_modules::inspect_fm_modules,
            fm_profile::inspect_fm_reader_profile,
            fm_database::load_fm_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FM Player Sorter");
}
