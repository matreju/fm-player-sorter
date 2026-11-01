import { invoke } from "@tauri-apps/api/core";
import type { TableRow } from "../types/table";
export interface EditorField {key:string;label:string;value:string;kind:"number"|"date";min:number|null;max:number|null}
export interface PlayerEditSnapshot {token:string;sessionId:number;uid:number;name:string;fields:EditorField[]}
export interface PlayerEditResult {sessionId:number;uid:number;row:TableRow;message:string|null;changes:{label:string;before:string;after:string}[];undoToken:string|null}
export const getPlayerEditor=(sessionId:number,uid:number)=>invoke<PlayerEditSnapshot>("get_fm_player_editor",{sessionId,uid});
export const applyPlayerEdit=(token:string,changes:{key:string;value:string}[])=>invoke<PlayerEditResult>("apply_fm_player_edit",{request:{token,changes}});
export const undoPlayerEdit=(token:string)=>invoke<PlayerEditResult>("undo_fm_player_edit",{token});
