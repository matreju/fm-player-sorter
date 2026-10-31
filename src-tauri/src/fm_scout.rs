use serde::{Deserialize, Serialize};
use crate::fm_reader::FmTableRow;

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct ScoutingQuery {
    pub session_id: u64,
    pub text: String,
    pub position: String,
    pub min_ca: Option<u16>,
    pub min_pa: Option<u16>,
    pub max_age: Option<u16>,
    pub max_fee: Option<u32>,
    pub max_wage: Option<u32>,
    pub contract_before: String,
    pub status: String,
    pub sort: String,
    pub page: usize,
    pub page_size: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoutingResult {
    pub session_id: u64,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub game_date: Option<String>,
    pub rows: Vec<FmTableRow>,
}

pub(crate) struct ScoutingEntry {
    pub candidate_index: usize,
    pub search: String,
    pub positions: Vec<String>,
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
    if query.min_ca.unwrap_or(0) > 200 || query.min_pa.unwrap_or(0) > 200 || query.text.len() > 256 {
        return Err("Nieprawidłowy zakres wyszukiwania.".into());
    }
    if !["", "all", "listed", "free"].contains(&query.status.as_str()) {
        return Err("Nieznany filtr dostępności.".into());
    }
    if !["", "ca", "pa", "fee", "wage", "expiry"].contains(&query.sort.as_str()) {
        return Err("Nieznany sposób sortowania.".into());
    }
    if !query.contract_before.is_empty() {
        let value = query.contract_before.as_bytes();
        if value.len() != 10 || value[4] != b'-' || value[7] != b'-'
            || value.iter().enumerate().any(|(i,c)| i != 4 && i != 7 && !c.is_ascii_digit()) {
            return Err("Podaj datę końca kontraktu w formacie RRRR-MM-DD.".into());
        }
    }
    let text = search_text(&query.text);
    let mut found = entries.iter().enumerate().filter(|(_, entry)| {
        !entry.own_player
        && text.split_whitespace().all(|word| entry.search.contains(word))
        && (query.position.is_empty() || query.position == "any" || entry.positions.contains(&query.position))
        && query.min_ca.map(|min| entry.ca >= min).unwrap_or(true)
        && query.min_pa.map(|min| entry.pa >= min).unwrap_or(true)
        && query.max_age.map(|max| entry.age.map(|age| age <= max).unwrap_or(false)).unwrap_or(true)
        && query.max_fee.map(|max| if entry.free { true } else { entry.asking_price.or(entry.value).map(|fee| fee <= max).unwrap_or(false) }).unwrap_or(true)
        && query.max_wage.map(|max| entry.wage.map(|wage| wage <= max).unwrap_or(false)).unwrap_or(true)
        && (query.contract_before.is_empty() || entry.expiry.as_ref().map(|date| date <= &query.contract_before).unwrap_or(false))
        && match query.status.as_str() { "listed" => entry.listed, "free" => entry.free, _ => true }
    }).map(|(i,_)| i).collect::<Vec<_>>();
    found.sort_by(|&a,&b| {
        let left = &entries[a]; let right = &entries[b];
        let order = match query.sort.as_str() {
            "pa" => right.pa.cmp(&left.pa),
            "fee" => (if left.free {0} else {left.asking_price.or(left.value).unwrap_or(u32::MAX)}).cmp(&(if right.free {0} else {right.asking_price.or(right.value).unwrap_or(u32::MAX)})),
            "wage" => left.wage.unwrap_or(u32::MAX).cmp(&right.wage.unwrap_or(u32::MAX)),
            "expiry" => left.expiry.as_deref().unwrap_or("9999").cmp(right.expiry.as_deref().unwrap_or("9999")),
            _ => right.ca.cmp(&left.ca),
        };
        order.then_with(|| left.candidate_index.cmp(&right.candidate_index))
    });
    Ok(found)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn entry(index: usize, fee: Option<u32>, own: bool) -> ScoutingEntry {
        ScoutingEntry { candidate_index:index, search:search_text("Łukasz Żółć Warszawa"), positions:vec!["DP".into()],
            ca:120, pa:170, age:Some(20), value:fee, asking_price:None, wage:Some(1000), expiry:Some("2027-06-30".into()),
            listed:true, free:false, own_player:own }
    }
    #[test]
    fn unknown_prices_are_not_free_and_own_squad_stays_out_of_market() {
        let rows = vec![entry(0, None, false), entry(1, Some(100), true), entry(2, Some(100), false)];
        let q = ScoutingQuery { text:"lukasz zolc".into(), max_fee:Some(1000), ..Default::default() };
        assert_eq!(matching_entries(&rows,&q).unwrap(), vec![2]);
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
}
