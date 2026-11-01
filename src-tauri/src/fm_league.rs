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


#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct LeaguePhaseView {pub id:String,pub label:String}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct LeagueCompetitionView {pub uid:u32,pub name:String,pub phases:Vec<LeaguePhaseView>,pub message:Option<String>}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct LeagueCompetitionList {pub session_id:u64,pub club:String,pub competitions:Vec<LeagueCompetitionView>,pub warnings:Vec<String>}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct LeagueRuleView {pub id:String,pub label:String,pub value:u32,pub mode:String,pub token:Option<String>,pub persistent:bool,pub note:Option<String>}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct LeagueU22Snapshot {
    pub session_id:u64,pub club:String,pub competition:String,pub competition_uid:u32,pub phase_id:String,pub game_date:String,
    pub shared_default:bool,pub rules:Vec<LeagueRuleView>,pub undo_token:Option<String>,pub warnings:Vec<String>,
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct LeagueU22Result {
    pub session_id:u64,pub shared_default:bool,pub before:u32,pub after:u32,pub record_count:usize,pub undo_token:Option<String>,pub persistent:bool,
}
#[tauri::command]
pub async fn get_fm_league_competitions(session_id:u64)->Result<LeagueCompetitionList,String> {
    tauri::async_runtime::spawn_blocking(move||crate::fm_reader::get_league_competitions(session_id)).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn get_fm_league_u22_editor(session_id:u64,competition_uid:u32,phase_id:String)->Result<LeagueU22Snapshot,String> {
    tauri::async_runtime::spawn_blocking(move||crate::fm_reader::get_league_u22_editor(session_id,competition_uid,phase_id)).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn disable_fm_league_u22(token:String,value:u32,accept_shared_default:Option<bool>)->Result<LeagueU22Result,String> {
    tauri::async_runtime::spawn_blocking(move||crate::fm_reader::disable_league_u22(token,value,accept_shared_default.unwrap_or(false))).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn undo_fm_league_u22(token:String)->Result<LeagueU22Result,String> {
    tauri::async_runtime::spawn_blocking(move||crate::fm_reader::undo_league_u22(token)).await.map_err(|e|e.to_string())?
}
