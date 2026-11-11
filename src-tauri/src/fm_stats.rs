use std::collections::BTreeMap;
use serde::{Deserialize, Serialize};

pub const SEASON_STATS_HEADERS: &[&str] = &[
    "Mecze", "Występy", "Z ławki", "Minuty", "Śr. ocena", "Gracz meczu", "Gole", "Asysty",
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

pub type SeasonStatsRows = BTreeMap<String, BTreeMap<String, String>>;

#[derive(Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NationalMatchAppearance {
    pub uid: u32,
    pub minutes: Option<u16>,
    pub goals: Option<u8>,
    pub assists: Option<u8>,
    pub rating: Option<f32>,
}

#[derive(Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NationalMatchRecord {
    pub id: String,
    pub date: String,
    pub opponent: String,
    pub competition: String,
    pub team_goals: Option<u8>,
    pub opponent_goals: Option<u8>,
    pub appearances: Vec<NationalMatchAppearance>,
}

#[derive(Debug, Default, Deserialize)]
pub struct SeasonStatsData {
    pub rows: SeasonStatsRows,
    #[serde(default, rename = "nationalMatches")]
    pub national_matches: Vec<NationalMatchRecord>,
}

#[cfg(target_os = "windows")]
mod platform {
    use std::{
        env,
        io::Write,
        os::windows::process::CommandExt,
        path::PathBuf,
        process::{Command, Stdio},
    };

    use serde::Serialize;

    use super::SeasonStatsData;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    #[derive(Serialize)]
    struct StatsRequest {
        edition: u16,
        uids: Vec<u32>,
    }

    pub fn load_latest_save_stats(uids: &[u32]) -> SeasonStatsData {
        let Some(sidecar) = find_sidecar() else {
            return SeasonStatsData::default();
        };
        if uids.is_empty() {
            return SeasonStatsData::default();
        }

        let Some(edition) = crate::fm_version::current_edition() else {
            return SeasonStatsData::default();
        };
        let request = match serde_json::to_vec(&StatsRequest {
            edition,
            uids: uids.to_vec(),
        }) {
            Ok(request) => request,
            Err(_) => return SeasonStatsData::default(),
        };
        let mut child = match Command::new(sidecar)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
        {
            Ok(child) => child,
            Err(_) => return SeasonStatsData::default(),
        };
        if let Some(mut stdin) = child.stdin.take() {
            if stdin.write_all(&request).is_err() {
                return SeasonStatsData::default();
            }
        }
        let output = match child.wait_with_output() {
            Ok(output) if output.status.success() => output,
            _ => return SeasonStatsData::default(),
        };
        match serde_json::from_slice::<SeasonStatsData>(&output.stdout) {
            Ok(response) => response,
            Err(_) => SeasonStatsData::default(),
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
pub use platform::load_latest_save_stats;

#[cfg(not(target_os = "windows"))]
pub fn load_latest_save_stats(_uids: &[u32]) -> SeasonStatsData {
    SeasonStatsData::default()
}
