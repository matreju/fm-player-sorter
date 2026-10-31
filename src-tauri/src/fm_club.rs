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
