use serde::{Deserialize, Serialize};
use crate::fm_reader::FmTableRow;

#[derive(Clone, Serialize)]
#[serde(rename_all="camelCase")]
pub struct EditorField {
    pub key:String, pub label:String, pub value:String, pub kind:String,
    pub min:Option<u16>, pub max:Option<u16>,
}
#[derive(Clone, Serialize)]
#[serde(rename_all="camelCase")]
pub struct PlayerEditSnapshot {
    pub token:String, pub session_id:u64, pub uid:u32, pub name:String,
    pub fields:Vec<EditorField>,
}
#[derive(Deserialize)]
#[serde(rename_all="camelCase", deny_unknown_fields)]
pub struct EditorChange {pub key:String,pub value:String}
#[derive(Deserialize)]
#[serde(rename_all="camelCase", deny_unknown_fields)]
pub struct PlayerEditRequest {pub token:String,pub changes:Vec<EditorChange>}
#[derive(Clone, Serialize)]
#[serde(rename_all="camelCase")]
pub struct AppliedChange {pub label:String,pub before:String,pub after:String}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct PlayerEditResult {
    pub session_id:u64, pub uid:u32, pub row:FmTableRow, pub message:Option<String>, pub changes:Vec<AppliedChange>,pub undo_token:Option<String>,
}

#[tauri::command]
pub async fn get_fm_player_editor(session_id:u64,uid:u32)->Result<PlayerEditSnapshot,String> {
    tauri::async_runtime::spawn_blocking(move||crate::fm_reader::get_player_editor(session_id,uid)).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn apply_fm_player_edit(request:PlayerEditRequest)->Result<PlayerEditResult,String> {
    tauri::async_runtime::spawn_blocking(move||crate::fm_reader::apply_player_edit(request)).await.map_err(|e|e.to_string())?
}
#[tauri::command]
pub async fn undo_fm_player_edit(token:String)->Result<PlayerEditResult,String> {
    tauri::async_runtime::spawn_blocking(move||crate::fm_reader::undo_player_edit(token)).await.map_err(|e|e.to_string())?
}
