use serde::{Deserialize, Serialize};
use crate::fm_reader::FmTableRow;

// Same pitch-line order as playerPositionType.ts. Sort by complete native
// proficiency data, never by the shortened display string or filter options.
pub(crate) const POSITION_GROUPS: &[&[&str]] = &[
    &["BR"], &["O (P)"], &["O (Ś)","LIB"], &["O (L)"],
    &["WO (P)"], &["WO (L)"], &["DP"],
    &["P (P)"], &["P (Ś)"], &["P (L)"],
    &["OP (P)"], &["OP (Ś)"], &["OP (L)"], &["N (Ś)"],
];
pub(crate) fn position_sort_rank(rating: impl Fn(&str) -> u8) -> u8 {
    let ratings = POSITION_GROUPS.iter().map(|group|group.iter().map(|position|rating(position)).filter(|value|*value<=20).max().unwrap_or(0)).collect::<Vec<_>>();
    if let Some(rank)=ratings.iter().position(|value|*value>=15) { return rank as u8; }
    let highest=ratings.iter().copied().max().unwrap_or(0);
    if highest==0 { 255 } else { ratings.iter().position(|value|*value==highest).unwrap_or(255) as u8 }
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct ScoutingQuery {
    pub session_id: u64,
    pub text: String,
    pub position: String,
    pub min_ca: Option<u16>,
    pub max_ca: Option<u16>,
    pub min_pa: Option<u16>,
    pub max_pa: Option<u16>,
    pub min_age: Option<u16>,
    pub max_age: Option<u16>,
    pub min_fee: Option<u32>,
    pub max_fee: Option<u32>,
    pub min_wage: Option<u32>,
    pub max_wage: Option<u32>,
    pub contract_after: String,
    pub contract_before: String,
    pub club_scope: String,
    pub status: String,
    pub sort: String,
    pub sort_direction: String,
    pub page: usize,
    pub page_size: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoutingResult {
    pub session_id: u64,
    pub total: usize,
    pub database_total: usize,
    pub page: usize,
    pub page_size: usize,
    pub game_date: Option<String>,
    pub rows: Vec<FmTableRow>,
}

pub(crate) struct ScoutingEntry {
    pub candidate_index: usize,
    pub search: String,
    pub name: String,
    pub club: String,
    pub nationality: String,
    pub positions: Vec<String>,
    pub position_rank: u8,
    pub ca: u16,
    pub pa: u16,
    pub age: Option<u16>,
    pub value: Option<u32>,
    pub asking_price: Option<u32>,
    pub wage: Option<u32>,
    pub expiry: Option<String>,
    pub listed: bool,
    pub free: bool,
    pub own_player: bool,
}

pub(crate) fn search_text(text: &str) -> String {
    text.to_lowercase().chars().map(|c| match c {
        'ą'|'á'|'à'|'â'|'ä'|'ã' => 'a', 'ć'|'ç' => 'c', 'ę'|'é'|'è'|'ê'|'ë' => 'e',
        'í'|'ì'|'î'|'ï' => 'i', 'ł' => 'l', 'ń'|'ñ' => 'n', 'ó'|'ò'|'ô'|'ö'|'õ' => 'o',
        'ś' => 's', 'ú'|'ù'|'û'|'ü' => 'u', 'ź'|'ż' => 'z', other => other,
    }).collect()
}

pub(crate) fn matching_entries(entries: &[ScoutingEntry], query: &ScoutingQuery) -> Result<Vec<usize>, String> {
    fn range<T: Ord + Copy>(min: Option<T>, max: Option<T>) -> bool {
        min.zip(max).map(|(a,b)| a <= b).unwrap_or(true)
    }
    if [query.min_ca,query.max_ca,query.min_pa,query.max_pa].into_iter().flatten().any(|n| n > 200)
        || [query.min_age,query.max_age].into_iter().flatten().any(|n| n > 100)
        || !range(query.min_ca,query.max_ca) || !range(query.min_pa,query.max_pa)
        || !range(query.min_age,query.max_age) || !range(query.min_fee,query.max_fee)
        || !range(query.min_wage,query.max_wage) || query.text.len() > 256 {
        return Err("Nieprawidłowy zakres: wartość „od” nie może przekraczać „do”. OU i PA: 0–200, wiek: 0–100.".into());
    }
    if !["", "all", "own", "other"].contains(&query.club_scope.as_str()) {
        return Err("Nieznany zakres klubów.".into());
    }
    if !["", "all", "listed", "free"].contains(&query.status.as_str()) {
        return Err("Nieznany filtr dostępności.".into());
    }
    if !["", "name", "position", "nation", "club", "age", "ca", "pa", "value", "fee", "wage", "expiry"].contains(&query.sort.as_str()) {
        return Err("Nieznany sposób sortowania.".into());
    }
    if !["", "asc", "desc"].contains(&query.sort_direction.as_str()) {
        return Err("Nieznany kierunek sortowania.".into());
    }
    for date in [&query.contract_after,&query.contract_before] {
        if date.is_empty() { continue; }
        let value = date.as_bytes();
        if value.len() != 10 || value[4] != b'-' || value[7] != b'-'
            || value.iter().enumerate().any(|(i,c)| i != 4 && i != 7 && !c.is_ascii_digit()) {
            return Err("Podaj datę końca kontraktu w formacie RRRR-MM-DD.".into());
        }
    }
    if !query.contract_after.is_empty() && !query.contract_before.is_empty() && query.contract_after > query.contract_before {
        return Err("Początek zakresu kontraktu nie może być późniejszy niż koniec.".into());
    }
    fn within<T: Ord + Copy>(value: Option<T>, min: Option<T>, max: Option<T>) -> bool {
        if min.is_none() && max.is_none() { return true; }
        value.map(|v| min.map(|m| v >= m).unwrap_or(true) && max.map(|m| v <= m).unwrap_or(true)).unwrap_or(false)
    }
    let text = search_text(&query.text);
    let mut found = entries.iter().enumerate().filter(|(_, entry)| {
        (match query.club_scope.as_str() { "own" => entry.own_player, "other" => !entry.own_player, _ => true })
        && text.split_whitespace().all(|word| entry.search.contains(word))
        && (query.position.is_empty() || query.position == "any" || entry.positions.contains(&query.position))
        && within(Some(entry.ca),query.min_ca,query.max_ca)
        && within(Some(entry.pa),query.min_pa,query.max_pa)
        && within(entry.age,query.min_age,query.max_age)
        && within(if entry.free {Some(0)} else {entry.asking_price.or(entry.value)},query.min_fee,query.max_fee)
        && within(entry.wage,query.min_wage,query.max_wage)
        && (query.contract_after.is_empty() || entry.expiry.as_ref().map(|date| date >= &query.contract_after).unwrap_or(false))
        && (query.contract_before.is_empty() || entry.expiry.as_ref().map(|date| date <= &query.contract_before).unwrap_or(false))
        && match query.status.as_str() { "listed" => entry.listed, "free" => entry.free, _ => true }
    }).map(|(i,_)| i).collect::<Vec<_>>();
    let descending = match query.sort_direction.as_str() {
        "desc" => true, "asc" => false, _ => matches!(query.sort.as_str(), "" | "ca" | "pa"),
    };
    found.sort_by(|&a,&b| {
        let left = &entries[a]; let right = &entries[b];
        let optional = |left: Option<u64>, right: Option<u64>| -> std::cmp::Ordering {
            match (left, right) {
                (Some(a), Some(b)) => if descending { b.cmp(&a) } else { a.cmp(&b) },
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (Some(_), None) => std::cmp::Ordering::Less,
                _ => std::cmp::Ordering::Equal,
            }
        };
        let order = match query.sort.as_str() {
            "age" => optional(left.age.map(u64::from), right.age.map(u64::from)),
            "value" => optional(left.value.map(u64::from), right.value.map(u64::from)),
            "fee" => optional((if left.free {Some(0)} else {left.asking_price.or(left.value)}).map(u64::from), (if right.free {Some(0)} else {right.asking_price.or(right.value)}).map(u64::from)),
            "wage" => optional(left.wage.map(u64::from), right.wage.map(u64::from)),
            "position" => optional((left.position_rank != 255).then(|| u64::from(left.position_rank)), (right.position_rank != 255).then(|| u64::from(right.position_rank))),
            "expiry" => match (&left.expiry, &right.expiry) {
                (Some(a),Some(b)) => if descending { b.cmp(a) } else { a.cmp(b) },
                (None,Some(_)) => std::cmp::Ordering::Greater,
                (Some(_),None) => std::cmp::Ordering::Less,
                _ => std::cmp::Ordering::Equal,
            },
            field => {
                let order = match field {
                    "name" => left.name.cmp(&right.name), "club" => left.club.cmp(&right.club),
                    "nation" => left.nationality.cmp(&right.nationality), "pa" => left.pa.cmp(&right.pa),
                    _ => left.ca.cmp(&right.ca),
                };
                if descending { order.reverse() } else { order }
            },
        };
        order.then_with(|| left.name.cmp(&right.name)).then_with(|| left.candidate_index.cmp(&right.candidate_index))
    });
    Ok(found)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn entry(index: usize, fee: Option<u32>, own: bool) -> ScoutingEntry {
        ScoutingEntry { candidate_index:index, name:"lukasz zolc".into(), club:"warszawa".into(), nationality:"polska".into(), search:search_text("Łukasz Żółć Warszawa"), positions:vec!["DP".into()], position_rank:6,
            ca:120, pa:170, age:Some(20), value:fee, asking_price:None, wage:Some(1000), expiry:Some("2027-06-30".into()),
            listed:true, free:false, own_player:own }
    }
    #[test]
    fn unknown_prices_are_not_free_and_all_clubs_are_searchable() {
        let rows = vec![entry(0, None, false), entry(1, Some(100), true), entry(2, Some(100), false)];
        let q = ScoutingQuery { text:"lukasz zolc".into(), max_fee:Some(1000), ..Default::default() };
        assert_eq!(matching_entries(&rows,&q).unwrap(), vec![1,2]);
        let q = ScoutingQuery {status:"free".into(), ..Default::default()};
        assert!(matching_entries(&rows,&q).unwrap().is_empty());
    }
    #[test]
    fn position_filters_are_exact_and_expiry_is_inclusive() {
        let rows=vec![entry(0,Some(0),false)];
        let mut q=ScoutingQuery{position:"P".into(),..Default::default()};
        assert!(matching_entries(&rows,&q).unwrap().is_empty());
        q.position="DP".into();q.contract_before="2027-06-30".into();
        assert_eq!(matching_entries(&rows,&q).unwrap(),vec![0]);
        q.contract_before="2027-06-29".into();assert!(matching_entries(&rows,&q).unwrap().is_empty());
    }
    #[test]
    fn unfiltered_search_includes_every_player_and_own_scope_is_optional() {
        let rows=vec![entry(0,None,false),entry(1,Some(100),true),entry(2,Some(200),false)];
        assert_eq!(matching_entries(&rows,&ScoutingQuery::default()).unwrap(),vec![0,1,2]);
        assert_eq!(matching_entries(&rows,&ScoutingQuery{club_scope:"own".into(),..Default::default()}).unwrap(),vec![1]);
        assert_eq!(matching_entries(&rows,&ScoutingQuery{club_scope:"other".into(),..Default::default()}).unwrap(),vec![0,2]);
    }
    #[test]
    fn ranges_are_inclusive_and_unknown_values_are_not_zero() {
        let mut rows=vec![entry(0,Some(100),false),entry(1,Some(200),true),entry(2,None,false)];
        rows[1].ca=150;rows[1].pa=190;rows[1].age=Some(25);rows[1].wage=Some(2000);
        let q=ScoutingQuery{min_ca:Some(120),max_ca:Some(150),min_pa:Some(170),max_pa:Some(190),min_age:Some(20),max_age:Some(25),min_fee:Some(100),max_fee:Some(200),min_wage:Some(1000),max_wage:Some(2000),..Default::default()};
        assert_eq!(matching_entries(&rows,&q).unwrap(),vec![1,0]);
        assert!(matching_entries(&rows,&ScoutingQuery{min_ca:Some(151),max_ca:Some(150),..Default::default()}).is_err());
        rows[2].free=true;
        assert_eq!(matching_entries(&rows,&ScoutingQuery{min_fee:Some(0),max_fee:Some(0),..Default::default()}).unwrap(),vec![2]);
        assert_eq!(matching_entries(&rows,&ScoutingQuery{min_fee:Some(1),max_fee:Some(100),..Default::default()}).unwrap(),vec![0]);
    }

}
