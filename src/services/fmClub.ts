import { invoke } from "@tauri-apps/api/core";

export interface ClubTeamSnapshot {
  uid: number;
  kind: string;
  reputation: number;
}

export interface ClubProfileSnapshot {
  sessionId: number;
  uid: number;
  name: string;
  shortName: string | null;
  teams: ClubTeamSnapshot[];
}

export const getClubProfile = (sessionId: number) =>
  invoke<ClubProfileSnapshot>("get_fm_club_profile", { sessionId });
