pub const SEASON_STATS_HEADERS: &[&str] = &[
    "Występy", "Z ławki", "Minuty", "Śr. ocena", "Gracz meczu", "Gole", "Asysty",
    "Żółte kartki", "Czerwone kartki", "xG", "npxG", "xA", "Strzały", "Celne strzały",
    "Strzały spoza pola karnego", "Gole spoza pola karnego", "Strzały z rzutów wolnych",
    "Rzuty karne (próby)", "Wykorzystane rzuty karne", "Podania (próby)", "Celne podania",
    "Podania progresywne", "Kluczowe podania", "Kluczowe podania z gry",
    "Stworzone klarowne sytuacje", "Dośrodkowania (próby)", "Celne dośrodkowania",
    "Dośrodkowania z gry", "Celne dośrodkowania z gry", "Dryblingi", "Spalone",
    "Dystans (km)", "Sprinty o wysokiej intensywności", "Pojedynki główkowe",
    "Wygrane główki", "Kluczowe główki", "Próby odbiorów", "Udane odbiory",
    "Kluczowe odbiory", "Przechwyty", "Odzyskane piłki", "Stracone piłki",
    "Próby pressingu", "Udany pressing", "Bloki", "Zablokowane strzały", "Wybicia",
    "Faule", "Faule na zawodniku", "Błędy prowadzące do gola", "Czyste konta",
    "Stracone gole", "Złapane strzały", "Sparowane strzały", "Strzały przeniesione",
    "Celne strzały przeciwko", "xG uniknięte", "Obrony", "Podania (%)",
    "Dośrodkowania (%)", "Doś. z gry (%)", "Główki (%)", "Odbiory (%)",
    "Celne strzały (%)", "Konwersja strzałów (%)", "Obrony (%)", "xG/strzał",
    "Gole/90", "Asysty/90", "xG/90", "npxG/90", "xA/90", "xG uniknięte/90",
    "Strz./90", "Celne strzały/90", "Strzały spoza pola/90", "Pod/90", "PodC/90",
    "Podania dP/90", "KP/90", "KPzG/90", "StS/90", "Doś P/90", "Celne doś./90",
    "Pr Doś zG/90", "C Doś zG/90", "Drb/90", "Dyst./90", "Sprinty/90",
    "Poj. gł./90", "Głw/90", "Przegrane główki/90", "Kl. główki/90", "Pr Odb/90",
    "Odb/90", "K Odb/90", "Prz/90", "Odz Płk/90", "Str Płk/90", "Pr Pres/90",
    "Ud Pres/90", "Blk/90", "Zabl. strz./90", "Wyb/90", "Stracone gole/90",
    "Obrony/90",
];

#[cfg(target_os = "windows")]
mod platform {
    use std::{
        collections::BTreeMap,
        env,
        io::Write,
        os::windows::process::CommandExt,
        path::PathBuf,
        process::{Command, Stdio},
    };

    use serde::{Deserialize, Serialize};

    use crate::fm_reader::FmNativeDatabase;

    use super::SEASON_STATS_HEADERS;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    #[derive(Serialize)]
    struct StatsRequest {
        uids: Vec<u32>,
    }

    #[derive(Deserialize)]
    struct StatsResponse {
        rows: BTreeMap<String, BTreeMap<String, String>>,
    }

    pub fn enrich_with_latest_save_stats(database: &mut FmNativeDatabase) -> usize {
        append_headers(database);
        let Some(sidecar) = find_sidecar() else {
            return 0;
        };
        let uids = database
            .rows
            .iter()
            .filter_map(|row| row.get("UID")?.parse::<u32>().ok())
            .collect::<Vec<_>>();
        if uids.is_empty() {
            return 0;
        }

        let request = match serde_json::to_vec(&StatsRequest { uids }) {
            Ok(request) => request,
            Err(_) => return 0,
        };
        let mut child = match Command::new(sidecar)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
        {
            Ok(child) => child,
            Err(_) => return 0,
        };
        if let Some(mut stdin) = child.stdin.take() {
            if stdin.write_all(&request).is_err() {
                return 0;
            }
        }
        let output = match child.wait_with_output() {
            Ok(output) if output.status.success() => output,
            _ => return 0,
        };
        let response = match serde_json::from_slice::<StatsResponse>(&output.stdout) {
            Ok(response) => response,
            Err(_) => return 0,
        };

        let mut matched = 0;
        for row in &mut database.rows {
            let Some(uid) = row.get("UID").cloned() else {
                continue;
            };
            let Some(stats) = response.rows.get(&uid) else {
                continue;
            };
            matched += 1;
            for (header, value) in stats {
                row.insert(header.clone(), value.clone());
            }
        }
        matched
    }

    fn append_headers(database: &mut FmNativeDatabase) {
        for header in SEASON_STATS_HEADERS {
            if !database.headers.iter().any(|value| value == header) {
                database.headers.push((*header).to_string());
            }
        }
    }

    fn find_sidecar() -> Option<PathBuf> {
        let mut candidates = Vec::new();
        if let Ok(executable) = env::current_exe() {
            if let Some(parent) = executable.parent() {
                candidates.push(parent.join("fmstats.exe"));
                candidates.push(parent.join("resources").join("fmstats.exe"));
            }
        }
        candidates.push(
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("binaries")
                .join("fmstats-x86_64-pc-windows-msvc.exe"),
        );
        candidates.into_iter().find(|path| path.is_file())
    }
}

#[cfg(target_os = "windows")]
pub use platform::enrich_with_latest_save_stats;

#[cfg(not(target_os = "windows"))]
pub fn enrich_with_latest_save_stats(database: &mut crate::fm_reader::FmNativeDatabase) -> usize {
    for header in SEASON_STATS_HEADERS {
        if !database.headers.iter().any(|value| value == header) {
            database.headers.push((*header).to_string());
        }
    }
    0
}
