use serde::{Deserialize, Serialize};
use crate::fm_reader::FmTableRow;

pub(crate) const RATING_COLUMNS: &[&str] = &["Dośrodkowania", "Drybling", "Wykańczanie akcji", "Gra głową", "Strzały z dystansu", "Krycie", "Gra bez piłki", "Podania", "Rzuty karne", "Odbiór piłki", "Przegląd sytuacji", "Chwytanie", "Zasięg wyskoku", "Gra na przedpolu", "Komunikacja", "Wykopy", "Wyrzuty", "Przewidywanie", "Decyzje", "Jeden na jednego", "Ustawianie się", "Refleks", "Przyjęcie piłki", "Technika", "Błyskotliwość", "Rzuty rożne", "Współpraca", "Pracowitość", "Długie wrzuty", "Ekscentryczność", "Wychodzenie poza pole karne", "Piąstkowanie", "Przyspieszenie", "Rzuty wolne", "Siła", "Wytrzymałość", "Szybkość", "Skoczność", "Przywództwo", "Równowaga", "Waleczność", "Agresja", "Zwinność", "Sprawność", "Determinacja", "Opanowanie", "Koncentracja", "Brudna gra", "Regularność", "Ważne mecze", "Podatność na kontuzje", "Wszechstronność", "Adaptacja", "Ambicja", "Lojalność", "Radzenie sobie z presją", "Profesjonalizm", "Fair play", "Temperament", "Kontrowersyjność"];
#[derive(Debug,Clone,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct AttributeFilter {pub column:String,pub min:Option<u8>,pub max:Option<u8>}
#[derive(Debug,Clone,Serialize)]
#[serde(rename_all="camelCase")]
pub struct FmShortlistInfo {pub id:String,pub name:String,pub player_count:usize,pub unresolved_count:usize}

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
    let highest=ratings.iter().copied().max().unwrap_or(0);
    let threshold=15u8.max(highest.saturating_sub(2));
    if let Some(rank)=ratings.iter().position(|value|*value>=threshold) { return rank as u8; }
    if highest==0 { 255 } else { ratings.iter().position(|value|*value==highest).unwrap_or(255) as u8 }
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct ScoutingQuery {
    pub session_id: u64,
    pub text: String,
    pub position: String,
    pub positions: Vec<String>,
    pub position_match: String,
    pub shortlist_id: String,
    pub nationality: String,
    pub club: String,
    pub league: String,
    pub foot: String,
    pub gender: String,
    pub loan: String,
    pub min_height: Option<u16>,
    pub max_height: Option<u16>,
    pub min_condition: Option<u16>,
    pub max_condition: Option<u16>,
    pub min_growth: Option<u16>,
    pub max_growth: Option<u16>,
    pub attributes: Vec<AttributeFilter>,
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
    pub euro_per_gbp: Option<f64>,
    pub session_id: u64,
    pub total: usize,
    pub database_total: usize,
    pub page: usize,
    pub page_size: usize,
    pub game_date: Option<String>,
    pub rows: Vec<FmTableRow>,
    pub headers: Vec<String>,
    pub attribute_columns: Vec<String>,
    pub shortlists: Vec<FmShortlistInfo>,
    pub shortlist_error: Option<String>,
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
    pub league: String,
    pub height: Option<u16>,
    pub condition: Option<u16>,
    pub left_foot: u8,
    pub right_foot: u8,
    pub female: bool,
    pub on_loan: Option<bool>,
    pub not_for_sale: bool,
    pub set_for_release: bool,
    pub ratings: [u8;64],
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
    if !["", "all", "listed", "free", "not_for_sale", "release"].contains(&query.status.as_str()) {
        return Err("Nieznany filtr dostępności.".into());
    }
    if !["", "name", "position", "nation", "club", "age", "ca", "pa", "value", "fee", "wage", "expiry", "height", "condition", "growth"].contains(&query.sort.as_str())
        && !query.sort.strip_prefix("rating:").is_some_and(|column|RATING_COLUMNS.contains(&column)) {
        return Err("Nieznany sposób sortowania.".into());
    }
    if !["", "asc", "desc"].contains(&query.sort_direction.as_str()) {
        return Err("Nieznany kierunek sortowania.".into());
    }
    if !range(query.min_height,query.max_height)||!range(query.min_condition,query.max_condition)||!range(query.min_growth,query.max_growth)
        || query.min_height.into_iter().chain(query.max_height).any(|v|v>250)
        || query.min_condition.into_iter().chain(query.max_condition).any(|v|v>100)
        || query.min_growth.into_iter().chain(query.max_growth).any(|v|v>200)
        || !["","any","left","right","both"].contains(&query.foot.as_str())
        || !["","all","male","female"].contains(&query.gender.as_str())
        || !["","all","yes","no"].contains(&query.loan.as_str())
        || query.attributes.len()>12 {
        return Err("Nieprawidłowy zakres filtrów dodatkowych.".into());
    }
    for filter in &query.attributes {
        if !RATING_COLUMNS.contains(&filter.column.as_str()) || !range(filter.min,filter.max)
            || filter.min.into_iter().chain(filter.max).any(|value|value>20) {
            return Err("Filtr atrybutu wymaga znanej nazwy i zakresu 0–20.".into());
        }
    }
    if [&query.nationality,&query.club,&query.league,&query.shortlist_id].iter().any(|value|value.len()>256) {return Err("Zbyt długi filtr tekstowy.".into());}
    if query.positions.len()>15 || query.positions.iter().any(|position|!POSITION_GROUPS.iter().flat_map(|group|group.iter()).any(|known|*known==position.as_str()))
        || !["","any","all"].contains(&query.position_match.as_str()) {
        return Err("Nieprawidłowy wybór pozycji.".into());
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
    let nation=search_text(&query.nationality);let club=search_text(&query.club);let league=search_text(&query.league);
    let mut found = entries.iter().enumerate().filter(|(_, entry)| {
        (match query.club_scope.as_str() { "own" => entry.own_player, "other" => !entry.own_player, _ => true })
        && text.split_whitespace().all(|word| entry.search.contains(word))
        && (nation.is_empty()||entry.nationality.contains(&nation)) && (club.is_empty()||entry.club.contains(&club)) && (league.is_empty()||entry.league.contains(&league))
        && within(entry.height,query.min_height,query.max_height)
        && within(entry.condition,query.min_condition.map(|value|value*100),query.max_condition.map(|value|value*100))
        && within(Some(entry.pa.saturating_sub(entry.ca)),query.min_growth,query.max_growth)
        && match query.foot.as_str() {"left"=>entry.left_foot>entry.right_foot,"right"=>entry.right_foot>entry.left_foot,"both"=>entry.left_foot>=15&&entry.right_foot>=15,_=>true}
        && match query.gender.as_str() {"male"=>!entry.female,"female"=>entry.female,_=>true}
        && match query.loan.as_str() {"yes"=>entry.on_loan==Some(true),"no"=>entry.on_loan==Some(false),_=>true}
        && query.attributes.iter().all(|filter|RATING_COLUMNS.iter().position(|column|*column==filter.column)
            .map(|index|within((entry.ratings[index]>0).then_some(entry.ratings[index]),filter.min,filter.max)).unwrap_or(false))
        && (if query.positions.is_empty() {query.position.is_empty() || query.position == "any" || entry.positions.contains(&query.position)}
            else if query.position_match=="all" {query.positions.iter().all(|position|entry.positions.contains(position))}
            else {query.positions.iter().any(|position|entry.positions.contains(position))})
        && within(Some(entry.ca),query.min_ca,query.max_ca)
        && within(Some(entry.pa),query.min_pa,query.max_pa)
        && within(entry.age,query.min_age,query.max_age)
        && within(if entry.free {Some(0)} else {entry.asking_price.or(entry.value)},query.min_fee,query.max_fee)
        && within(entry.wage,query.min_wage,query.max_wage)
        && (query.contract_after.is_empty() || entry.expiry.as_ref().map(|date| date >= &query.contract_after).unwrap_or(false))
        && (query.contract_before.is_empty() || entry.expiry.as_ref().map(|date| date <= &query.contract_before).unwrap_or(false))
        && match query.status.as_str() { "listed" => entry.listed, "free" => entry.free, "not_for_sale" => entry.not_for_sale, "release" => entry.set_for_release, _ => true }
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
            "height" => optional(left.height.map(u64::from),right.height.map(u64::from)),
            "condition" => optional(left.condition.map(u64::from),right.condition.map(u64::from)),
            "growth" => optional(Some(u64::from(left.pa.saturating_sub(left.ca))),Some(u64::from(right.pa.saturating_sub(right.ca)))),
            field if field.starts_with("rating:") => {
                let index=RATING_COLUMNS.iter().position(|column|Some(*column)==field.strip_prefix("rating:")).unwrap_or(0);
                optional((left.ratings[index]>0).then_some(u64::from(left.ratings[index])),(right.ratings[index]>0).then_some(u64::from(right.ratings[index])))
            },
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
            listed:true, free:false, own_player:own, league:String::new(),height:None,condition:None,left_foot:0,right_foot:0,female:false,on_loan:None,not_for_sale:false,set_for_release:false,ratings:[0;64] }
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
