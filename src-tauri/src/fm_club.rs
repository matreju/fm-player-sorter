//! Exact club-family traversal: only explicit reserve-team links, never names or affiliations.
use std::collections::{HashSet, VecDeque};

pub(crate) struct ClubNode {
    pub teams: Vec<usize>,
    pub reserve_clubs: Vec<usize>,
}

pub(crate) fn club_teams(
    root: usize,
    mut read: impl FnMut(usize) -> Result<ClubNode, String>,
) -> Result<HashSet<usize>, String> {
    let mut clubs = HashSet::new();
    let mut teams = HashSet::new();
    let mut pending = VecDeque::from([root]);
    while let Some(club) = pending.pop_front() {
        if !clubs.insert(club) { continue; }
        if clubs.len() > 64 { return Err("Zbyt wiele powiązanych klubów rezerw.".into()); }
        let node = read(club)?;
        teams.extend(node.teams);
        if teams.len() > 512 { return Err("Zbyt wiele zespołów w strukturze klubu.".into()); }
        pending.extend(node.reserve_clubs);
    }
    Ok(teams)
}

/// A known current team takes priority over a parent club's roster (loans).
pub(crate) fn belongs_to_club(current_team: Option<usize>, teams: &HashSet<usize>, on_roster: bool) -> bool {
    match current_team { Some(team) if team != 0 => teams.contains(&team), _ => on_roster }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn includes_nested_reserves_and_juniors_deduplicates_cycles() {
        let teams = club_teams(1, |club| Ok(match club {
            1 => ClubNode { teams: vec![10,11], reserve_clubs: vec![2] },
            2 => ClubNode { teams: vec![20], reserve_clubs: vec![1,3] },
            3 => ClubNode { teams: vec![30], reserve_clubs: vec![] },
            _ => panic!("unrelated club must not be read"),
        })).unwrap();
        assert_eq!(teams, HashSet::from([10,11,20,30]));
        assert!(belongs_to_club(Some(20), &teams, false)); // incoming loan
        assert!(!belongs_to_club(Some(99), &teams, true)); // outgoing loan
        assert!(belongs_to_club(None, &teams, true)); // roster-only youth
        assert!(!belongs_to_club(None, &teams, false));
    }
    #[test]
    fn broken_reserve_graph_does_not_return_partial_membership() {
        let result = club_teams(1, |club| if club == 1 {
            Ok(ClubNode { teams: vec![10], reserve_clubs: vec![2] })
        } else { Err("unreadable reserve club".into()) });
        assert!(result.is_err());
    }
}

/// Proof from the active manager's native contract, independent of any UI binding.
pub(crate) struct NativeClubIdentity {
    pub club: usize,
    pub uid: u32,
    pub name: String,
    pub native_type: String,
    pub teams: Vec<usize>,
}

pub(crate) struct ActiveClub {
    pub team: usize,
    pub name: String,
}

pub(crate) fn resolve_active_club(
    active_team: Option<usize>, manager_count: usize, team_count: usize,
    read_owner: impl FnOnce(usize) -> Option<NativeClubIdentity>,
) -> Option<ActiveClub> {
    if manager_count != 1 || team_count != 1 { return None; }
    let team = active_team.filter(|address| *address >= 0x10_000)?;
    let owner = read_owner(team)?;
    if owner.club < 0x10_000 || owner.uid == 0 || owner.uid == u32::MAX
        || owner.name.trim().is_empty() || owner.native_type != ".?AVCLUB@db@@"
        || !owner.teams.contains(&team) { return None; }
    Some(ActiveClub { team, name: owner.name })
}

#[cfg(test)]
mod active_job_tests {
    use super::*;
    fn club() -> NativeClubIdentity {
        NativeClubIdentity {club:0x20000,uid:123,name:"Test FC".into(),native_type:".?AVCLUB@db@@".into(),teams:vec![0x10000,0x10008,0x10010]}
    }
    #[test]
    fn active_club_does_not_require_human_team_or_ui_job_contexts() {
        // Regression: H0/VC0 with M1/GT1 must still resolve the native club job.
        let result=resolve_active_club(Some(0x10000),1,1, |_|Some(club())).unwrap();
        assert_eq!(result.team,0x10000);assert_eq!(result.name,"Test FC");
    }
    #[test]
    fn nation_and_unrelated_team_are_never_accepted_as_a_club() {
        assert!(resolve_active_club(Some(0x10000),1,1, |_|{let mut c=club();c.native_type=".?AVNATION@db@@".into();Some(c)}).is_none());
        assert!(resolve_active_club(Some(0x30000),1,1, |_|Some(club())).is_none());
        assert!(resolve_active_club(Some(0x10000),1,1, |_|None).is_none());
    }
    #[test]
    fn ambiguous_managers_and_missing_contracts_do_not_select_a_club() {
        assert!(resolve_active_club(Some(0x10000),2,1, |_|panic!("multiple managers")).is_none());
        assert!(resolve_active_club(Some(0x10000),1,2, |_|panic!("multiple teams")).is_none());
        assert!(resolve_active_club(None,1,1, |_|panic!("missing contract")).is_none());
    }
}
