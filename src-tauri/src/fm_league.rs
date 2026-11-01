use serde::Serialize;
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct LeagueRoot {pub field:String,pub address:String,pub name:Option<String>,pub uid:Option<u32>,pub native_type:Option<String>}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct LeagueLink {pub from:String,pub field:String,pub target:String,pub native_type:String}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct AgeRuleSample {pub address:String,pub native_type:String,pub kind:u8,pub date_raw:u32,pub date:Option<String>,pub age_parameter:i8,pub extra_parameter:Option<i8>,pub stable_read:bool}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct LeagueRuleReport {
    pub schema:u32,pub read_only:bool,pub session_id:u64,pub game_date:Option<String>,pub managed_team:Option<String>,pub managed_club_uid:Option<u32>,
    pub roots:Vec<LeagueRoot>,pub candidate_links:Vec<LeagueLink>,pub age_rule_samples:Vec<AgeRuleSample>,
    pub scanned_bytes:u64,pub read_failures:usize,pub elapsed_ms:u128,pub truncated:bool,pub warnings:Vec<String>,
}
#[tauri::command]
pub async fn inspect_fm_league_rules(session_id:u64)->Result<LeagueRuleReport,String> {
    tauri::async_runtime::spawn_blocking(move||crate::fm_reader::inspect_league_rules(session_id)).await.map_err(|e|e.to_string())?
}
