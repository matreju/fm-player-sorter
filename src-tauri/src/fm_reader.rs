use std::collections::BTreeMap;

use serde::Serialize;

pub type FmTableRow = BTreeMap<String, String>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmClassOffsetStat {
    pub offset: String,
    pub count: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmNativeDatabase {
    pub pid: u32,
    pub profile: String,
    pub managed_mode: String,
    pub managed_club_uid: Option<u32>,
    pub session_id: u64,
    pub database_player_count: usize,
    pub player_count: usize,
    pub managed_team: Option<String>,
    pub managed_nation: Option<String>,
    pub managed_team_uid: Option<u32>,
    pub managed_nation_uid: Option<u32>,
    pub managed_squad_gender: Option<String>,
    pub national_filter_applied: bool,
    pub scan_region_count: usize,
    pub scanned_bytes: u64,
    pub scan_duration_ms: u128,
    pub game_date: Option<String>,
    pub game_date_source: String,
    pub date_monitor_candidates: usize,
    pub headers: Vec<String>,
    pub rows: Vec<FmTableRow>,
    pub class_offsets: Vec<FmClassOffsetStat>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmDateStatus {
    pub process_detected: bool,
    pub available: bool,
    pub imported_date: Option<String>,
    pub current_date: Option<String>,
    pub data_stale: bool,
    pub source: String,
    pub candidate_count: usize,
    pub error: Option<String>,
}

#[cfg(target_os = "windows")]
mod windows_reader {
    use std::{
        collections::{BTreeMap, HashMap, HashSet, VecDeque},
        ffi::c_void,
        mem::size_of,
        sync::{Arc, Mutex, OnceLock, atomic::{AtomicU64, Ordering}},
        time::Instant,
    };

    use memchr::{memchr_iter, memmem};

    use windows::Win32::{
        Foundation::{CloseHandle, HANDLE, FILETIME},
        System::{
            Diagnostics::Debug::{ReadProcessMemory, WriteProcessMemory},
            Memory::{
                VirtualQueryEx, MEMORY_BASIC_INFORMATION, MEM_COMMIT, MEM_PRIVATE,
                PAGE_EXECUTE_READWRITE, PAGE_EXECUTE_WRITECOPY, PAGE_GUARD, PAGE_NOACCESS,
                PAGE_READWRITE, PAGE_WRITECOPY,
            },
            Threading::{GetProcessTimes, OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ, PROCESS_VM_WRITE, PROCESS_VM_OPERATION},
        },
    };

    use crate::{
        fm_club::{self, ClubNode},
        fm_scout::{self, ScoutingQuery, ScoutingResult, ScoutingEntry},
        fm_modules::inspect_fm_modules_blocking,
        fm_process::detect_football_manager,
        fm_version::{self, FmLayout},
        fm_reader::{
            FmClassOffsetStat, FmDateStatus, FmNativeDatabase, FmTableRow,
        },
    };

    const CHUNK_SIZE: usize = 16 * 1024 * 1024;
    const IMAGE_CHUNK_SIZE: usize = 8 * 1024 * 1024;
    const MAX_REGION_SIZE: usize = 512 * 1024 * 1024;
    const MAX_MONITOR_DATE_CANDIDATES: usize = 2_048;
    const DOTNET_TICKS_PER_DAY: u64 = 864_000_000_000;
    const DOTNET_TICKS_MASK: u64 = (1_u64 << 62) - 1;

    const PLAYER_OFFSET: i32 = 0x288;
    const PLAYER_STAFF_OFFSET: i32 = 0x380;
    const STAFF_OFFSET: i32 = 0x100;

    const NATIVE_RECORD_INDEX: usize = 0x08;
    const OBJ_UID: usize = 0x0C;
    const PLAYER_CA: usize = 0x264;
    const PLAYER_PA: usize = 0x266;
    const PLAYER_HOME_REP: usize = 0x25E;
    const PLAYER_CURRENT_REP: usize = 0x260;
    const PLAYER_WORLD_REP: usize = 0x262;
    const PLAYER_CONDITION: usize = 0x258;
    const PLAYER_MORALE: usize = 0x26C;
    const PLAYER_HEIGHT: usize = 0x22E;
    const PLAYER_POSITIONS: usize = 0x150;
    const PLAYER_ATTRIBUTES: usize = 0x15F;
    const PLAYER_VALUE: usize = 0x234;
    const PLAYER_ASKING_PRICE: usize = 0x238;

    const PERSON_GENDER: usize = 0x19;
    const GENDER_FEMALE_BIT: u8 = 0x10;
    const PERSON_FIRST_NAME: usize = 0x50;
    const PERSON_LAST_NAME: usize = 0x58;
    const PERSON_COMMON_NAME: usize = 0x60;
    const PERSON_NATION: usize = 0x68;
    const PERSON_DOB: usize = 0x88;
    const PERSON_CONTRACT: usize = 0xA8;

    const CONTRACT_TEAM: usize = 0x10;
    const CONTRACT_WAGE: usize = 0x20;
    const CONTRACT_EXPIRY: usize = 0x48;
    const CONTRACT_STATUS: usize = 0x57;
    const CONTRACT_SQUAD_NUMBER: usize = 0x5D;

    const CLUB_NAME: usize = 0xC0;
    const CLUB_SHORT_NAME: usize = 0xC8;
    const CLUB_TEAMS_BEGIN: usize = 0x18;
    const CLUB_TEAMS_END: usize = 0x20;
    const NATION_NAME: usize = 0x18;
    const TEAM_TYPE: usize = 0x28;
    const TEAM_CLUB: usize = 0x30;
    const TEAM_PLAYERS_BEGIN: usize = 0x38;
    const TEAM_PLAYERS_END: usize = 0x40;
    const TEAM_MANAGER: usize = 0x80;
    const TEAM_COMPETITION: [usize; 2] = [0x50, 0x60];
    const TEAM_REPUTATION: usize = 0xA8;
    const TEAM_SCHEDULE: usize = 0xA0;
    const SCHEDULE_DATE: [usize; 2] = [0x94, 0x18];
    const COMPETITION_NAME: usize = 0x40;
    const COMPETITION_SHORT_NAME: usize = 0x48;

    // FM26 26.3.2 IL2CPP layout (Cpp2IL profile for the supported build).
    // BindingSubsystem derives directly from Bindings, so these offsets are
    // relative to the managed BindingSubsystem object.
    const BINDING_NODE_BINDINGS: usize = 0x10;
    const BINDING_NODE_NAME: usize = 0x18;
    const BINDING_NODE_FIRST_CHILD: usize = 0x28;
    const BINDING_NODE_NEXT_SIBLING: usize = 0x30;
    const BINDING_NODE_DATA_KEY: usize = 0x70;
    const BINDING_DATA_VALUE: usize = 0x30;
    const MANAGED_LIST_ITEMS: usize = 0x10;
    const MANAGED_LIST_SIZE: usize = 0x18;
    const MANAGED_ARRAY_LENGTH: usize = 0x18;
    const MANAGED_ARRAY_DATA: usize = 0x20;
    const TYPED_VALUE_VALUE: usize = 0x18;
    const INTEROP_REFERENCE_ID_LIST: usize = 0x10;
    const DATABASE_RECORD_INDEX: usize = 0x20;
    const DATABASE_RECORD_TYPE: usize = 0x24;
    const DATABASE_RECORD_INDEX_MASK: u32 = 0x007F_FFFF;
    const DATABASE_TABLE_COUNT: u32 = 74;
    const DATABASE_TABLE_CLUB: u32 = 3;
    const DATABASE_TABLE_NATIONAL_TEAM_CONTAINER: u32 = 9;
    const DATABASE_TABLE_NATION: u32 = 10;
    const DATABASE_TABLE_TEAM: u32 = 24;
    const INTEROP_REFERENCE_PAIR_SIZE: usize = 0x08;
    const INTEROP_REFERENCE_PAIR_VALUE: usize = 0x04;
    const MANAGED_DICTIONARY_ENTRIES: usize = 0x18;
    const MANAGED_DICTIONARY_COUNT: usize = 0x20;
    const DICTIONARY_ENTRY_SIZE: usize = 0x18;
    const DYNAMIC_REFERENCE_UID_PROPERTY: u32 = 1;
    const MAX_BINDING_NODES: usize = 16_384;
    const MAX_INTEROP_REFERENCE_PAIRS: usize = 64;
    const MAX_DYNAMIC_REFERENCE_PROPERTIES: usize = 256;
    const HUMAN_CONTEXT_SCAN_TAIL: usize = 0x5C8;

    const HUMAN_JOB_NATION_MANAGER: u32 = 1;
    const HUMAN_JOB_CLUB_MANAGER: u32 = 2;
    const HUMAN_JOB_UNEMPLOYED: u32 = 4;

    // Verified FM26 26.3.x game_plugin.dll signature for the global registry
    // that owns the one active human manager. Wildcards are the RIP-relative
    // address of the registry slot.
    const HUMAN_MANAGER_REGISTRY_SIGNATURE: [Option<u8>; 25] = [
        Some(0x48), Some(0x8B), Some(0x0D), None, None, None, None, Some(0x48),
        Some(0x8B), Some(0x41), Some(0x18), Some(0x48), Some(0x8B), Some(0x49),
        Some(0x20), Some(0x48), Some(0x29), Some(0xC1), Some(0x48), Some(0xC1),
        Some(0xF9), Some(0x03), Some(0x48), Some(0x39), Some(0xCE),
    ];
    const HUMAN_MANAGER_REGISTRY_VECTOR: usize = 0x18;

    const PLAYER_ATTRIBUTE_FIELDS: [(&str, usize); 47] = [
        ("Dośrodkowania", 0x00),
        ("Drybling", 0x01),
        ("Wykańczanie akcji", 0x02),
        ("Gra głową", 0x03),
        ("Strzały z dystansu", 0x04),
        ("Krycie", 0x05),
        ("Gra bez piłki", 0x06),
        ("Podania", 0x07),
        ("Rzuty karne", 0x08),
        ("Odbiór piłki", 0x09),
        ("Przegląd sytuacji", 0x0A),
        ("Chwytanie", 0x0B),
        ("Zasięg wyskoku", 0x0C),
        ("Gra na przedpolu", 0x0D),
        ("Komunikacja", 0x0E),
        ("Wykopy", 0x0F),
        ("Wyrzuty", 0x10),
        ("Przewidywanie", 0x11),
        ("Decyzje", 0x12),
        ("Jeden na jednego", 0x13),
        ("Ustawianie się", 0x14),
        ("Refleks", 0x15),
        ("Przyjęcie piłki", 0x16),
        ("Technika", 0x17),
        ("Błyskotliwość", 0x1A),
        ("Rzuty rożne", 0x1B),
        ("Współpraca", 0x1C),
        ("Pracowitość", 0x1D),
        ("Długie wrzuty", 0x1E),
        ("Ekscentryczność", 0x1F),
        ("Wychodzenie poza pole karne", 0x20),
        ("Piąstkowanie", 0x21),
        ("Przyspieszenie", 0x22),
        ("Rzuty wolne", 0x23),
        ("Siła", 0x24),
        ("Wytrzymałość", 0x25),
        ("Szybkość", 0x26),
        ("Skoczność", 0x27),
        ("Przywództwo", 0x28),
        ("Równowaga", 0x2A),
        ("Waleczność", 0x2B),
        ("Agresja", 0x2D),
        ("Zwinność", 0x2E),
        ("Sprawność", 0x32),
        ("Determinacja", 0x33),
        ("Opanowanie", 0x34),
        ("Koncentracja", 0x35),
    ];

    const PLAYER_HIDDEN_FIELDS: [(&str, usize); 5] = [
        ("Brudna gra", 0x29),
        ("Regularność", 0x2C),
        ("Ważne mecze", 0x2F),
        ("Podatność na kontuzje", 0x30),
        ("Wszechstronność", 0x31),
    ];

    const PERSONALITY_FIELDS: [(&str, usize); 8] = [
        ("Adaptacja", 0x70),
        ("Ambicja", 0x71),
        ("Lojalność", 0x72),
        ("Radzenie sobie z presją", 0x73),
        ("Profesjonalizm", 0x74),
        ("Fair play", 0x75),
        ("Temperament", 0x76),
        ("Kontrowersyjność", 0x77),
    ];

    const POSITION_FIELDS: [(&str, &str, usize); 15] = [
        ("BR", "Pozycja: BR", 0x00),
        ("LIB", "Pozycja: LIB", 0x01),
        ("O (L)", "Pozycja: O (L)", 0x02),
        ("O (Ś)", "Pozycja: O (Ś)", 0x03),
        ("O (P)", "Pozycja: O (P)", 0x04),
        ("DP", "Pozycja: DP", 0x05),
        ("P (L)", "Pozycja: P (L)", 0x06),
        ("P (Ś)", "Pozycja: P (Ś)", 0x07),
        ("P (P)", "Pozycja: P (P)", 0x08),
        ("OP (L)", "Pozycja: OP (L)", 0x09),
        ("OP (Ś)", "Pozycja: OP (Ś)", 0x0A),
        ("OP (P)", "Pozycja: OP (P)", 0x0B),
        ("N (Ś)", "Pozycja: N (Ś)", 0x0C),
        ("WO (L)", "Pozycja: WO (L)", 0x0D),
        ("WO (P)", "Pozycja: WO (P)", 0x0E),
    ];

    const FOOT_LEFT: usize = 0x18;
    const FOOT_RIGHT: usize = 0x19;

    #[derive(Clone)]
    struct ScoutingSession {
        session_id: u64,
        pid: u32,
        layout: FmLayout,
        candidates: Arc<Vec<PlayerCandidate>>,
        own_uids: Arc<HashSet<u32>>,
        own_clubs: Arc<HashSet<usize>>,
        derived_year: i32,
        game_date: Option<u32>,
        euro_per_gbp: Option<f64>,
        index: Option<Arc<Vec<ScoutingEntry>>>,
    }
    static SCOUTING_SEQUENCE: AtomicU64 = AtomicU64::new(0);
    static SCOUTING_CACHE: OnceLock<Mutex<Option<ScoutingSession>>> = OnceLock::new();
    static SCOUTING_QUERY_LOCK: Mutex<()> = Mutex::new(());
    fn scouting_slot() -> &'static Mutex<Option<ScoutingSession>> {
        SCOUTING_CACHE.get_or_init(|| Mutex::new(None))
    }

    fn read_transfer_entry(
        process: &RemoteProcess, candidate: &PlayerCandidate, candidate_index: usize,
        source: &ScoutingSession, cache: &mut PlayerReadCache,
    ) -> Option<ScoutingEntry> {
        let person=process.read_exact(candidate.person_address,0xB0)?;
        if read_u32(&person,OBJ_UID)!=Some(candidate.uid) { return None; }
        let player=process.read_exact(candidate.player_address,0x270)?;
        let ca=read_u16(&player,PLAYER_CA)?; let pa=read_u16(&player,PLAYER_PA)?;
        if !(1..=200).contains(&ca) || !(1..=200).contains(&pa) { return None; }
        let common=nested_string_from_block(process,&person,PERSON_COMMON_NAME);
        let first=nested_string_from_block(process,&person,PERSON_FIRST_NAME);
        let last=nested_string_from_block(process,&person,PERSON_LAST_NAME);
        let name=common.filter(|name| plausible_label(name,160)).unwrap_or_else(|| format!("{} {}",first.unwrap_or_default(),last.unwrap_or_default()));
        if !plausible_label(&name,200) { return None; }
        let contract_address=read_u64(&person,PERSON_CONTRACT)? as usize;
        let contract=if contract_address>=0x10_000 { Some(process.read_exact(contract_address,0x60)?) } else { None };
        let contract_team=contract.as_deref().and_then(|bytes| read_u64(bytes,CONTRACT_TEAM)).filter(|team| *team>=0x10_000).map(|team| team as usize);
        let current_team=read_u64(&player,0x130).filter(|team| *team>=0x10_000).map(|team| team as usize);
        let owner=contract_team.map(|team| cached_team_details(process,team,cache));
        let current=current_team.map(|team| cached_team_details(process,team,cache));
        let club=current.as_ref().and_then(|team| team.owner_club.as_deref()).or_else(|| owner.as_ref().and_then(|team| team.owner_club.as_deref())).unwrap_or("");
        let nationality=cached_nation_name(process,candidate.nation_address,cache).unwrap_or_default();
        let positions=POSITION_FIELDS.iter().filter(|(_,_,offset)| player.get(PLAYER_POSITIONS+offset).copied().unwrap_or(0)>=14)
            .map(|(short,_,_)| (*short).to_string()).collect();
        let position_rank=fm_scout::position_sort_rank(|position|POSITION_FIELDS.iter().find(|(short,_,_)|*short==position)
            .and_then(|(_,_,offset)|player.get(PLAYER_POSITIONS+offset)).copied().unwrap_or(0));
        let age=source.game_date.and_then(|date| read_u32(&person,PERSON_DOB).and_then(|birth| age_at(birth,Some(date),source.derived_year)))
            .and_then(|age| u16::try_from(age).ok()).filter(|age| *age<=90);
        let mut ratings=[0u8;64];
        for (index,(_,offset)) in PLAYER_ATTRIBUTE_FIELDS.iter().chain(PLAYER_HIDDEN_FIELDS.iter()).enumerate() {
            ratings[index]=player.get(PLAYER_ATTRIBUTES+offset).copied().map(decode_attribute).unwrap_or(0);
        }
        let base=PLAYER_ATTRIBUTE_FIELDS.len()+PLAYER_HIDDEN_FIELDS.len();
        for (index,(_,offset)) in PERSONALITY_FIELDS.iter().enumerate() {ratings[base+index]=person.get(*offset).copied().map(valid_twenty).unwrap_or(0);}
        let flags=contract.as_deref().and_then(|bytes| bytes.get(CONTRACT_STATUS)).copied().unwrap_or(0);
        Some(ScoutingEntry {
            candidate_index, name:fm_scout::search_text(&name), club:fm_scout::search_text(club), nationality:fm_scout::search_text(&nationality), search:fm_scout::search_text(&format!("{name} {club} {nationality}")), positions,position_rank,ca,pa,age,
            value:read_u32(&player,PLAYER_VALUE).and_then(money_value),
            asking_price:read_u32(&player,PLAYER_ASKING_PRICE).and_then(money),
            wage:contract.as_deref().and_then(|bytes| read_u32(bytes,CONTRACT_WAGE)).and_then(money),
            expiry:contract.as_deref().and_then(|bytes| read_u32(bytes,CONTRACT_EXPIRY)).and_then(format_fm_date),
            listed:flags&0x09!=0,
            not_for_sale:flags&0x10!=0,set_for_release:flags&0x20!=0,
            league:fm_scout::search_text(current.as_ref().and_then(|team|team.division.as_deref()).or_else(||owner.as_ref().and_then(|team|team.division.as_deref())).unwrap_or("")),
            height:read_u16(&player,PLAYER_HEIGHT).filter(|value|(130..=230).contains(value)),
            condition:read_u16(&player,PLAYER_CONDITION).filter(|value|*value<=10000),
            left_foot:player.get(PLAYER_ATTRIBUTES+FOOT_LEFT).copied().map(decode_attribute).unwrap_or(0),
            right_foot:player.get(PLAYER_ATTRIBUTES+FOOT_RIGHT).copied().map(decode_attribute).unwrap_or(0),
            female:person[PERSON_GENDER]&GENDER_FEMALE_BIT!=0,
            on_loan:owner.as_ref().and_then(|team|team.owner_club_address).zip(current.as_ref().and_then(|team|team.owner_club_address)).map(|(a,b)|a!=b),
            ratings,
            free:contract_address==0 && current_team.is_none(),
            own_player:source.own_uids.contains(&candidate.uid) || owner.as_ref().and_then(|team| team.owner_club_address).map(|club| source.own_clubs.contains(&club)).unwrap_or(false),
        })
    }

    // Uploaded FM27 Steam DLL: Cexr property getter at RVA 0x2F66397 reads
    // float32 +0x38; its setter at 0x2F665CC writes it and updates the game's
    // own float64 formatting table. No rate is embedded in the application.
    const FM27_CURRENCY_VTABLE: usize = 0x4ED4398;
    const FM27_PLUGIN_SHA256: &str = "bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f";

    #[derive(Default)]
    struct GameCurrencyRates {
        euro: HashMap<u32, f64>,
        pound: HashMap<u32, f64>,
        conflicting: bool,
        sources: HashMap<u32,(usize,usize)>,
    }
    impl GameCurrencyRates {
        fn collect(&mut self, process: &RemoteProcess, resolver: &MetaResolver, address: usize) {
            let Some(bytes) = process.read_exact(address, 0x40) else { return; };
            let Some(uid) = read_u32(&bytes, OBJ_UID).filter(|id| *id != 0 && *id != u32::MAX) else { return; };
            let Some(raw) = read_u32(&bytes, 0x38) else { return; };
            let record_rate = f32::from_bits(raw) as f64;
            if !record_rate.is_finite() || !(0.000001..1_000_000.0).contains(&record_rate) { return; }
            let labels = [0x18, 0x20, 0x28, 0x30].into_iter()
                .filter_map(|offset| process.indirect_string(address + offset))
                .map(|label| label.trim().to_lowercase()).collect::<Vec<_>>();
            let euro = labels.iter().any(|label| matches!(label.as_str(), "eur" | "euro" | "euros"));
            let pound = labels.iter().any(|label| matches!(label.as_str(), "gbp" | "pound sterling" | "pounds sterling" | "british pound" | "uk pound" | "uk pound sterling" | "english pound"));
            if euro == pound { return; }
            // Resolve this record's UID through FM's own CURRENCY enum mapping,
            // then read the active float64 rate from its formatting table. This
            // also respects loaded-save/custom rates rather than the DLL defaults.
            let Some(rate_address) = game_currency_table_address(resolver, uid) else { return; };
            let Some(rate) = read_currency_rate(process, resolver.game_plugin.base, rate_address) else { return; };
            self.sources.insert(uid,(address,rate_address));
            let entries = if euro { &mut self.euro } else { &mut self.pound };
            if entries.insert(uid, rate).is_some_and(|old| old != rate) { self.conflicting = true; }
        }
        fn euro_per_gbp(&self) -> Option<f64> {
            // Require one unambiguous EUR and GBP record from this process.
            if self.conflicting || self.euro.len() != 1 || self.pound.len() != 1 { return None; }
            let rate = self.euro.values().next()? / self.pound.values().next()?;
            (rate.is_finite() && (0.01..100.0).contains(&rate)).then_some(rate)
        }
    }
    fn game_currency_table_address(resolver: &MetaResolver, uid: u32) -> Option<usize> {
        let base = resolver.game_plugin.base;
        let index = if (2..=96).contains(&uid) {
            // Switch in CURRENCY_RECORD UID -> currency-enum helper, RVA 0x2F664C0.
            let table = base + 0x4ED47B4;
            let relative = resolver.game_plugin.read_i32(table + (uid as usize - 2) * 4)?;
            let target = table.checked_add_signed(relative as isize)?;
            let offset = target.checked_sub(base)?;
            let code = resolver.game_plugin.bytes.get(offset..offset + 3)?;
            if code[0] == 0xB0 && code[2] == 0xC3 { code[1] as usize }
            else if code == [0x31, 0xC0, 0xC3] { 0 }
            else { return None; }
        } else if uid == 0x43B7AF2 { 0x35 } else { return None; };
        (index < 66).then_some(base + 0x5707180 + index * 0x20)
    }
    fn read_currency_rate(process: &RemoteProcess, base: usize, rate_address: usize) -> Option<f64> {
        if process.read_u8(base + 0x570717C)? != 1 { return None; }
        let rate = f64::from_bits(process.read_u64(rate_address)?);
        (rate.is_finite() && (0.000001..1_000_000.0).contains(&rate)).then_some(rate)
    }
    // Exact FM27 ISO-code parser (RVA 0x448EDA0): GBP -> enum 0,
    // EUR -> enum 7. Read the live formatting table directly; locating the
    // database's currency-object vector or its localized names is unnecessary.
    fn read_fm27_euro_rate(process:&RemoteProcess, plugin_base:usize) -> Option<f64> {
        if !verified_fm27(process) { return None; }
        let pound_address=plugin_base.checked_add(0x5707180)?;
        let euro_address=pound_address.checked_add(7*0x20)?;
        let pound=read_currency_rate(process,plugin_base,pound_address)?;
        let euro=read_currency_rate(process,plugin_base,euro_address)?;
        if read_currency_rate(process,plugin_base,pound_address)!=Some(pound)
            || read_currency_rate(process,plugin_base,euro_address)!=Some(euro) {return None;}
        let rate=euro/pound;
        (rate.is_finite()&&(0.01..100.0).contains(&rate)).then_some(rate)
    }
    fn attach_euro_rate(row: &mut FmTableRow, rate: Option<f64>) {
        row.insert("_fmEurPerGbp".into(), rate.map(|rate|rate.to_string()).unwrap_or_default());
    }

    struct NativeShortlist {
        info: fm_scout::FmShortlistInfo,
        members: HashSet<u32>,
    }
    fn read_manager_shortlists(process:&RemoteProcess,source:&ScoutingSession) -> Result<Vec<NativeShortlist>,String> {
        let cache=refresh_slot().lock().map_err(|_|"Brak dostępu do menedżera list życzeń.".to_string())?
            .as_ref().cloned().ok_or("Połącz aplikację z grą, aby odczytać listy życzeń.")?;
        if cache.database.session_id!=source.session_id { return Err("Sesja gry zmieniła się. Odśwież połączenie.".into()); }
        if source.layout.edition!=27 || cache.native_plugin_hash.as_deref()!=Some(FM27_PLUGIN_SHA256) {
            return Err("Odczyt list życzeń nie jest jeszcze rozpoznany dla tego wydania gry.".into());
        }
        refresh_identity_check(process,&cache)?;
        let (person,_)=cache.manager_person.ok_or("Nie potwierdzono aktywnego menedżera.")?;
        let human=person.checked_sub(source.layout.human_manager_person).ok_or("Nieprawidłowy adres menedżera.")?;
        // Uploaded FM27 DLL: 0x2684180 enumerates HUMAN +0x230/+0x238;
        // 0xF059E9 compares shortlist FmString +0xE8; 0xF1A57D and
        // 0x26841AA enumerate member wrappers +0x80/+0x88. Persistent
        // targets at +0x50/+0x58 resolve Person through target +0x60
        // (0xF18388/0xF183D5). No game function is called or memory written.
        let lists=pointer_vector(process,human+0x230,1024)?;
        let by_address=source.candidates.iter().flat_map(|candidate|[(candidate.person_address,candidate),(candidate.player_address,candidate)])
            .collect::<HashMap<_,_>>();
        let mut result=Vec::new();
        for list in &lists {
            let kind=process.read_u8(*list+0x4C).ok_or("Nie można odczytać typu listy życzeń.")?;
            // 0/1 are the active/inactive human player lists. Engine targets
            // and staff/nation collections are deliberately not labelled as them.
            if kind>1 { continue; }
            let name_ptr=process.read_ptr(*list+0xE8).ok_or("Nie można odczytać nazwy listy życzeń.")?;
            let name=if name_ptr==0 || process.read_u32(name_ptr)==Some(0) {"Domyślna lista życzeń".to_string()} else {
                process.indirect_string(*list+0xE8).filter(|name|plausible_label(name,200)).ok_or("Nie rozpoznano nazwy listy życzeń.")?
            };
            let targets=pointer_vector(process,*list+0x50,200_000)?;
            let entries=pointer_vector(process,*list+0x80,200_000)?;
            let mut members=HashSet::new();let mut resolved_targets=0;
            for target in &targets {
                if let Some(address)=process.read_ptr(*target+0x60) {
                    if let Some(candidate)=by_address.get(&address) {
                        if process.read_u32(candidate.person_address+OBJ_UID)==Some(candidate.uid) {members.insert(candidate.uid);resolved_targets+=1;}
                    }
                }
            }
            for entry in &entries {
                let address=process.read_ptr(*entry).ok_or("Lista jest aktualizowana przez FM. Ponów odczyt list życzeń.")?;
                if let Some(candidate)=by_address.get(&address) {
                    if process.read_u32(candidate.person_address+OBJ_UID)==Some(candidate.uid) {members.insert(candidate.uid);}
                }
            }
            let total=targets.len().max(entries.len()).max(members.len());
            let unresolved=total.saturating_sub(members.len().max(resolved_targets));
            result.push(NativeShortlist {info:fm_scout::FmShortlistInfo {
                id:format!("{:x}",list),name,player_count:members.len(),unresolved_count:unresolved,
            },members});
        }
        if pointer_vector(process,human+0x230,1024)?!=lists {return Err("Listy życzeń zmieniły się podczas odczytu. Ponów wyszukiwanie.".into());}
        refresh_identity_check(process,&cache)?;
        Ok(result)
    }

    pub(super) fn search_players(query: ScoutingQuery) -> Result<ScoutingResult,String> {
        let _query_guard=SCOUTING_QUERY_LOCK.lock().map_err(|_| "Wyszukiwarka jest niedostępna.".to_string())?;
        let source=scouting_slot().lock().map_err(|_| "Brak dostępu do danych transferowych.".to_string())?
            .as_ref().cloned().ok_or("Najpierw połącz aplikację z grą.")?;
        if source.session_id!=query.session_id { return Err("Dane gry zostały odświeżone. Otwórz wyszukiwarkę ponownie.".into()); }
        let detected=detect_football_manager();
        if !detected.detected || detected.pid!=Some(source.pid) {
            *scouting_slot().lock().map_err(|_| "Brak dostępu do sesji.".to_string())?=None;
            return Err("Połączenie z grą wygasło. Połącz aplikację ponownie.".into());
        }
        let mut process=RemoteProcess::open(source.pid)?; process.layout=source.layout;
        let finance_cache=refresh_slot().lock().ok().and_then(|slot|slot.as_ref().filter(|cache|cache.database.session_id==source.session_id).cloned());
        if let Some(cache)=&finance_cache {process.native_plugin_hash=cache.native_plugin_hash.clone();}
        let euro_per_gbp=finance_cache.as_ref().and_then(|cache|read_fm27_euro_rate(&process,cache.plugin_base)).or(source.euro_per_gbp);
        let index=if let Some(index)=source.index.clone() { index } else {
            let mut entries=Vec::new(); let mut cache=PlayerReadCache::default();
            for (i,candidate) in source.candidates.iter().enumerate() {
                if let Some(entry)=read_transfer_entry(&process,candidate,i,&source,&mut cache) { entries.push(entry); }
            }
            let index=Arc::new(entries);
            let mut guard=scouting_slot().lock().map_err(|_| "Brak dostępu do sesji.".to_string())?;
            let current=guard.as_mut().filter(|current| current.session_id==source.session_id)
                .ok_or("Podczas indeksowania odświeżono dane gry. Powtórz wyszukiwanie.")?;
            current.index=Some(index.clone()); index
        };
        if (query.min_age.is_some() || query.max_age.is_some()) && source.game_date.is_none() {
            return Err("Filtr wieku wymaga potwierdzonej daty gry. Usuń limit wieku lub odśwież połączenie.".into());
        }
        let (shortlists,shortlist_error)=match read_manager_shortlists(&process,&source) {Ok(lists)=>(lists,None),Err(error)=>(Vec::new(),Some(error))};
        let mut matches=fm_scout::matching_entries(&index,&query)?;
        if !query.shortlist_id.is_empty() {
            if let Some(error)=&shortlist_error {return Err(error.clone());}
            let list=shortlists.iter().find(|list|list.info.id==query.shortlist_id).ok_or("Wybrana lista życzeń nie jest już dostępna w FM. Wybierz listę ponownie.")?;
            matches.retain(|entry|list.members.contains(&source.candidates[index[*entry].candidate_index].uid));
        }
        let page_size=if query.page_size==0 {50} else {query.page_size.clamp(10,250)};
        let page=query.page.min(matches.len().saturating_sub(1)/page_size);
        let mut rows=Vec::new(); let mut cache=PlayerReadCache::default();
        for &entry_index in matches.iter().skip(page.saturating_mul(page_size)).take(page_size) {
            let entry=&index[entry_index]; let candidate=&source.candidates[entry.candidate_index];
            if process.read_u32(candidate.person_address+OBJ_UID)!=Some(candidate.uid) {
                return Err("Baza w grze zmieniła się. Odśwież połączenie przed dalszym wyszukiwaniem.".into());
            }
            if let Some(player)=read_player(&process,candidate.uid,candidate.person_address,candidate.player_address,entry.ca,entry.pa,&mut cache) {
                let mut row=player_to_row(player,source.game_date,source.derived_year);
                attach_euro_rate(&mut row, euro_per_gbp);
                if source.game_date.is_none() { row.insert("Wiek".into(),String::new()); }
                row.insert("Status transferu".into(),if entry.free {"Wolny zawodnik"} else if entry.listed {"Lista transferowa"} else {"Kontrakt klubowy"}.into());
                row.insert("Na liście transferowej".into(),yes_no(entry.listed));
                row.insert("Zapas potencjału".into(),entry.pa.saturating_sub(entry.ca).to_string());
                row.insert("Wypożyczenie".into(),entry.on_loan.map(yes_no).unwrap_or_default());
                rows.push(row);
            }
        }
        if scouting_slot().lock().map_err(|_| "Brak dostępu do sesji.".to_string())?.as_ref().map(|current| current.session_id)!=Some(source.session_id)
            || detect_football_manager().pid!=Some(source.pid) {
            return Err("Sesja gry zmieniła się podczas wyszukiwania. Połącz aplikację ponownie.".into());
        }
        Ok(ScoutingResult {euro_per_gbp,session_id:source.session_id,total:matches.len(),database_total:index.len(),page,page_size,game_date:source.game_date.and_then(format_fm_date),rows,
            headers:table_headers().into_iter().filter(|column|column!="Numer w składzie").chain(["Pozostały kontrakt".into(),"Status transferu".into(),"Zapas potencjału".into(),"Wypożyczenie".into()]).collect(),
            attribute_columns:fm_scout::RATING_COLUMNS.iter().map(|name|(*name).to_string()).collect(),
            shortlists:shortlists.into_iter().map(|list|list.info).collect(),shortlist_error})
    }

    use crate::fm_editor::{EditorField,PlayerEditSnapshot,PlayerEditRequest,PlayerEditResult,AppliedChange};
    #[derive(Clone, Copy)]
    enum EditEncoding {Ability,Height,ScaledAttribute,PlainAttribute,BirthDate,ContractExpiry,Wage {euro_per_gbp:f64}}
    #[derive(Clone)]
    struct NativeEditorField {ui:EditorField,address:usize,bytes:Vec<u8>,encoding:EditEncoding}
    #[derive(Clone)]
    struct EditorIdentity {session_id:u64,uid:u32,pid:u32,created:u64,person:usize,player:usize,vtable:usize,contract:Option<(usize,usize,usize)>}
    struct EditorDraft {identity:EditorIdentity,fields:Vec<NativeEditorField>,opened:Instant}
    #[derive(Clone)]
    struct EditorPatch {address:usize,before:Vec<u8>,after:Vec<u8>,change:AppliedChange}
    struct EditorUndo {identity:EditorIdentity,patches:Vec<EditorPatch>}
    #[derive(Default)]
    struct EditorState {drafts:HashMap<String,EditorDraft>,undos:HashMap<String,EditorUndo>}
    static EDITOR_STATE:OnceLock<Mutex<EditorState>>=OnceLock::new();
    static EDITOR_SEQUENCE:AtomicU64=AtomicU64::new(1);
    fn editor_state()->&'static Mutex<EditorState> {EDITOR_STATE.get_or_init(||Mutex::new(EditorState::default()))}
    fn editor_token()->String {format!("edit-{}",EDITOR_SEQUENCE.fetch_add(1,Ordering::Relaxed))}

    fn editor_context(session_id:u64,uid:u32,write:bool)->Result<(RemoteProcess,RefreshSession,ScoutingSession,PlayerCandidate),String> {
        let source=scouting_slot().lock().map_err(|_|"Czytnik FM jest zajęty.")?.as_ref().cloned().ok_or("Połącz aplikację z grą.")?;
        let cache=refresh_slot().lock().map_err(|_|"Czytnik FM jest zajęty.")?.as_ref().cloned().ok_or("Połącz aplikację z grą.")?;
        if source.session_id!=session_id || cache.database.session_id!=session_id {return Err("Dane gry zostały odświeżone. Otwórz edytor ponownie.".into());}
        if detect_football_manager().pid!=Some(source.pid) {return Err("Zmienił się proces gry. Połącz aplikację ponownie.".into());}
        let mut process=if write {RemoteProcess::open_editor(source.pid)?} else {RemoteProcess::open(source.pid)?};
        process.layout=source.layout;process.native_plugin_hash=cache.native_plugin_hash.clone();
        if !verified_fm27(&process) {return Err("Zapis jest dostępny wyłącznie dla rozpoznanego wydania FM27. Ten odczyt nie potwierdza zgodności edytora.".into());}
        refresh_identity_check(&process,&cache)?;
        let cached=source.candidates.iter().find(|candidate|candidate.uid==uid).ok_or("Nie znaleziono zawodnika w bieżącej bazie.")?;
        let candidate=live_candidate(&process,cached).ok_or("Rekord zawodnika zmienił się. Odśwież dane i otwórz edytor ponownie.")?;
        let offset=candidate.person_address.checked_sub(candidate.player_address).ok_or("Nieprawidłowy rekord zawodnika.")?;
        if !cache.player_classes.iter().any(|(known,vtable)|*known==offset && process.read_ptr(candidate.person_address)==Some(*vtable)) {return Err("Nie potwierdzono typu rekordu zawodnika. Zapis zablokowany.".into());}
        Ok((process,cache,source,candidate))
    }
    fn editor_identity(process:&RemoteProcess,source:&ScoutingSession,candidate:&PlayerCandidate)->Result<EditorIdentity,String> {
        let contract=process.read_ptr(candidate.person_address+PERSON_CONTRACT).filter(|address|*address>=0x10_000).map(|address| {
            if process.read_ptr(address+8)!=Some(candidate.person_address) {return Err("Nie potwierdzono właściciela kontraktu.");}
            Ok((address,process.read_ptr(address).ok_or("Nie można odczytać kontraktu.")?,process.read_ptr(address+CONTRACT_TEAM).ok_or("Nie można odczytać klubu kontraktu.")?))
        }).transpose()?;
        Ok(EditorIdentity {contract,session_id:source.session_id,uid:candidate.uid,pid:source.pid,created:process.creation_time().ok_or("Nie można potwierdzić procesu gry.")?,person:candidate.person_address,player:candidate.player_address,vtable:process.read_ptr(candidate.person_address).ok_or("Nie można potwierdzić rekordu zawodnika.")?})
    }
    fn verify_editor_identity(expected:&EditorIdentity,actual:&EditorIdentity)->Result<(),String> {
        if expected.session_id!=actual.session_id || expected.uid!=actual.uid || expected.pid!=actual.pid || expected.created!=actual.created || expected.person!=actual.person || expected.player!=actual.player || expected.vtable!=actual.vtable || expected.contract!=actual.contract {return Err("Zmieniła się gra lub adres zawodnika. Otwórz edytor ponownie.".into());} Ok(())
    }
    fn editor_row(process:&RemoteProcess,cache:&RefreshSession,source:&ScoutingSession,candidate:&PlayerCandidate)->Result<FmTableRow,String> {
        let mut reads=PlayerReadCache::default();
        let player=read_player(process,candidate.uid,candidate.person_address,candidate.player_address,candidate.ca,candidate.pa,&mut reads).ok_or("Nie można teraz odczytać danych zawodnika.")?;
        let mut row=player_to_row(player,source.game_date,source.derived_year);
        attach_euro_rate(&mut row,read_fm27_euro_rate(process,cache.plugin_base).or(source.euro_per_gbp));
        if let Some(group)=cache.database.rows.iter().find(|row|row.get("UID")==Some(&candidate.uid.to_string())).and_then(|row|row.get("Grupa klubowa")) {row.insert("Grupa klubowa".into(),group.clone());}
        Ok(row)
    }
    pub(super) fn get_player_editor(session_id:u64,uid:u32)->Result<PlayerEditSnapshot,String> {
        let _guard=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
        let (process,cache,source,candidate)=editor_context(session_id,uid,false)?;
        let identity=editor_identity(&process,&source,&candidate)?;
        let row=editor_row(&process,&cache,&source,&candidate)?;
        let mut fields=Vec::new();
        for (key,label,offset) in [("ca","Obecne umiejętności · CA",PLAYER_CA),("pa","Potencjał · PA",PLAYER_PA)] {
            let address=candidate.player_address+offset;
            let bytes=process.read_exact(address,2).ok_or("Nie można odczytać umiejętności.")?;
            let value=read_u16(&bytes,0).filter(|v|(1..=200).contains(v)).ok_or("Nieprawidłowy odczyt umiejętności.")?;
            fields.push(NativeEditorField {ui:EditorField {key:key.into(),label:label.into(),value:value.to_string(),kind:"number".into(),min:Some(1),max:Some(200)},address,bytes,encoding:EditEncoding::Ability});
        }
        let address=candidate.person_address+PERSON_DOB;
        let bytes=process.read_exact(address,4).ok_or("Nie można odczytać daty urodzenia.")?;
        let value=read_u32(&bytes,0).and_then(format_fm_date).ok_or("Nie potwierdzono daty urodzenia.")?;
        fields.push(NativeEditorField {ui:EditorField {key:"birthDate".into(),label:"Data urodzenia".into(),value,kind:"date".into(),min:None,max:None},address,bytes,encoding:EditEncoding::BirthDate});
        let address=candidate.player_address+PLAYER_HEIGHT;
        if let Some(bytes)=process.read_exact(address,2) {
            if let Some(height)=read_u16(&bytes,0).filter(|height|(130..=230).contains(height)) {
                fields.push(NativeEditorField {ui:EditorField {key:"height".into(),label:"Wzrost · cm".into(),value:height.to_string(),kind:"number".into(),min:Some(130),max:Some(230)},address,bytes,encoding:EditEncoding::Height});
            }
        }
        // Only confirmed full contracts: no guessed layout for trials or loans.
        if let Some((contract,vtable,_))=identity.contract.filter(|(_,vtable,_)|*vtable==cache.plugin_base+0x4B00AE8) {
            if league_native_type(&process,cache.plugin_base,vtable).as_deref()==Some(".?AVFULL_CONTRACT@db@@") {
                if let Some(rate)=read_fm27_euro_rate(&process,cache.plugin_base).filter(|rate|rate.is_finite()&&*rate>0.0) {
                    let address=contract+CONTRACT_WAGE;
                    if let Some(bytes)=process.read_exact(address,4) {
                        if let Some(wage)=read_u32(&bytes,0).filter(|wage|*wage<=10_000_000) {
                            fields.push(NativeEditorField {ui:EditorField {key:"contract:wage".into(),label:"Płaca podstawowa · EUR rocznie".into(),value:format!("{:.2}",wage as f64*52.0*rate),kind:"number".into(),min:Some(0),max:Some(1_000_000_000)},address,bytes,encoding:EditEncoding::Wage {euro_per_gbp:rate}});
                        }
                    }
                }
                let address=contract+CONTRACT_EXPIRY;
                if let Some(bytes)=process.read_exact(address,4) {
                    if let Some(value)=read_u32(&bytes,0).and_then(format_fm_date) {
                        fields.push(NativeEditorField {ui:EditorField {key:"contract:expiry".into(),label:"Koniec kontraktu".into(),value,kind:"date".into(),min:None,max:None},address,bytes,encoding:EditEncoding::ContractExpiry});
                    }
                }
            }
        }
        for (label,offset) in PLAYER_ATTRIBUTE_FIELDS.iter().chain(PLAYER_HIDDEN_FIELDS.iter()) {
            let address=candidate.player_address+PLAYER_ATTRIBUTES+offset;
            let raw=process.read_u8(address).ok_or("Nie można odczytać atrybutów.")?;
            if !(3..=100).contains(&raw) {continue;}
            fields.push(NativeEditorField {ui:EditorField {key:format!("attribute:{label}"),label:(*label).into(),value:decode_attribute(raw).to_string(),kind:"number".into(),min:Some(1),max:Some(20)},address,bytes:vec![raw],encoding:EditEncoding::ScaledAttribute});
        }
        for (label,offset) in PERSONALITY_FIELDS {
            let address=candidate.person_address+offset;
            let raw=process.read_u8(address).ok_or("Nie można odczytać osobowości.")?;
            if !(1..=20).contains(&raw) {continue;}
            fields.push(NativeEditorField {ui:EditorField {key:format!("attribute:{label}"),label:label.into(),value:raw.to_string(),kind:"number".into(),min:Some(1),max:Some(20)},address,bytes:vec![raw],encoding:EditEncoding::PlainAttribute});
        }
        refresh_identity_check(&process,&cache)?;
        let token=editor_token();let ui_fields=fields.iter().map(|field|field.ui.clone()).collect();
        let mut state=editor_state().lock().map_err(|_|"Edytor jest zajęty.")?;
        state.drafts.retain(|_,draft|draft.opened.elapsed().as_secs()<300);
        if state.drafts.len()>=8 {state.drafts.clear();}
        state.drafts.insert(token.clone(),EditorDraft {identity,fields,opened:Instant::now()});
        Ok(PlayerEditSnapshot {token,session_id,uid,name:row.get("Nazwisko").cloned().unwrap_or_else(||uid.to_string()),fields:ui_fields})
    }
    fn encode_editor_date(value:&str,previous:u32)->Result<Vec<u8>,String> {
        if value.len()!=10 || !value.is_ascii() || &value[4..5]!="-" || &value[7..8]!="-" {return Err("Podaj datę w formacie RRRR-MM-DD.".into());}
        let year=value[..4].parse::<i32>().map_err(|_|"Nieprawidłowy rok.")?;
        let month=value[5..7].parse::<u32>().map_err(|_|"Nieprawidłowy miesiąc.")?;
        let day=value[8..10].parse::<u32>().map_err(|_|"Nieprawidłowy dzień.")?;
        if !(1900..=2200).contains(&year)||!(1..=12).contains(&month) {return Err("Nieprawidłowa data.".into());}
        let months=[31,if is_leap_year(year) {29} else {28},31,30,31,30,31,31,30,31,30,31];
        if day==0||day>months[month as usize-1] {return Err("Nieprawidłowy dzień miesiąca.".into());}
        let ordinal=months[..month as usize-1].iter().sum::<u32>()+day;
        let raw=((year as u32)<<16)|ordinal;
        Ok((raw|(previous&0xFE00)).to_le_bytes().to_vec())
    }
    fn invalidate_editor_index() {
        if let Ok(mut slot)=scouting_slot().lock() {if let Some(source)=slot.as_mut() {source.index=None;}}
    }
    fn editor_record_matches(process:&RemoteProcess,identity:&EditorIdentity)->bool {
        if process.read_u32(identity.person+OBJ_UID)!=Some(identity.uid)||process.read_ptr(identity.person)!=Some(identity.vtable) {return false;}
        let current=process.read_ptr(identity.person+PERSON_CONTRACT).filter(|address|*address>=0x10_000);
        match identity.contract {
            Some((address,vtable,team))=>current==Some(address)&&process.read_ptr(address)==Some(vtable)&&process.read_ptr(address+8)==Some(identity.person)&&process.read_ptr(address+CONTRACT_TEAM)==Some(team),
            None=>current.is_none(),
        }
    }
    fn apply_editor_patches(process:&RemoteProcess,identity:&EditorIdentity,patches:&[EditorPatch])->Result<(),String> {
        // Compare every original value before the first write, then again just
        // before each field. Never replace unrelated player bytes or records.
        for patch in patches {
            if process.read_exact(patch.address,patch.before.len()).as_ref()!=Some(&patch.before) {return Err(format!("Pole „{}” zmieniło się w FM. Wczytaj dane edytora ponownie.",patch.change.label));}
        }
        for (index,patch) in patches.iter().enumerate() {
            let same_record=editor_record_matches(process,identity);
            let result=if !same_record {Err("Tożsamość rekordu zmieniła się podczas zapisu.".into())} else if process.read_exact(patch.address,patch.before.len()).as_ref()!=Some(&patch.before) {Err("Gra zmieniła pole podczas zapisu.".into())} else {process.write_exact(patch.address,&patch.after)};
            if let Err(error)=result {
                let mut unreverted=Vec::new();
                for done in patches[..=index].iter().rev() {
                    if !editor_record_matches(process,identity) {unreverted.push(done.change.label.clone());continue;}
                    let current=process.read_exact(done.address,done.before.len());
                    if current.as_ref()==Some(&done.before) {continue;}
                    if current.as_ref()!=Some(&done.after)||process.write_exact(done.address,&done.before).is_err() {unreverted.push(done.change.label.clone());}
                }
                invalidate_editor_index();
                return Err(if unreverted.is_empty() {format!("Zapis nie powiódł się: {error} Przywrócono wcześniejsze wartości.")} else {format!("Niepełny zapis: {error} Nie potwierdzono przywrócenia pól: {}. Sprawdź je w grze przed zapisem kariery.",unreverted.join(", "))});
            }
        }
        invalidate_editor_index();
        if !editor_record_matches(process,identity) {return Err("Pola zapisano, ale gra zmieniła rekord podczas odczytu końcowego. Nie potwierdzono wyniku. Sprawdź zawodnika w grze.".into());}
        Ok(())
    }
    fn finish_player_edit(process:&RemoteProcess,cache:&RefreshSession,source:&ScoutingSession,candidate:&PlayerCandidate,patches:Vec<EditorPatch>,undo_token:Option<String>)->Result<PlayerEditResult,String> {
        let row=live_candidate(process,candidate).and_then(|live|editor_row(process,cache,source,&live).ok());
        let message=row.is_none().then(||"Pola zapisano i odczytano z pamięci. Pełne dane zawodnika są chwilowo niedostępne — użyj odświeżania danych.".to_string());
        Ok(PlayerEditResult {session_id:source.session_id,uid:candidate.uid,row:row.unwrap_or_default(),message,changes:patches.into_iter().map(|patch|patch.change).collect(),undo_token})
    }

    pub(super) fn apply_player_edit(request:PlayerEditRequest)->Result<PlayerEditResult,String> {
        let _guard=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
        if request.changes.is_empty()||request.changes.len()>96 {return Err("Wybierz od 1 do 96 zmienionych pól.".into());}
        let draft=editor_state().lock().map_err(|_|"Edytor jest zajęty.")?.drafts.remove(&request.token).ok_or("Podgląd edycji wygasł. Wczytaj dane ponownie.")?;
        if draft.opened.elapsed().as_secs()>300 {return Err("Podgląd edycji wygasł. Wczytaj dane ponownie.".into());}
        let (process,cache,source,candidate)=editor_context(draft.identity.session_id,draft.identity.uid,true)?;
        verify_editor_identity(&draft.identity,&editor_identity(&process,&source,&candidate)?)?;
        let mut keys=HashSet::new();let mut patches=Vec::new();let mut ca=candidate.ca;let mut pa=candidate.pa;
        for change in request.changes {
            if !keys.insert(change.key.clone()) {return Err("Powtórzone pole edycji.".into());}
            let field=draft.fields.iter().find(|field|field.ui.key==change.key).ok_or("Nieznane pole edycji.")?;
            if change.value==field.ui.value {continue;}
            let mut actual_value=change.value.clone();
            let after=match field.encoding {
                EditEncoding::BirthDate|EditEncoding::ContractExpiry=>{
                    let encoded=encode_editor_date(&change.value,read_u32(&field.bytes,0).ok_or("Nieprawidłowy zapis daty.")?)?;
                    let date=normalize_fm_date(read_u32(&encoded,0).ok_or("Nieprawidłowy zapis daty.")?);
                    let now=normalize_fm_date(source.game_date.ok_or("Zmiana daty wymaga potwierdzonej daty gry.")?);
                    match field.encoding {
                        EditEncoding::BirthDate if date>now=>return Err("Data urodzenia nie może być późniejsza niż data gry.".into()),
                        EditEncoding::ContractExpiry=>{
                            let (contract,_,_)=draft.identity.contract.ok_or("Kontrakt nie jest już dostępny.")?;
                            let start=process.read_u32(contract+0x44).filter(|raw|decode_fm_date(*raw).is_some()).ok_or("Nie potwierdzono daty rozpoczęcia kontraktu.")?;
                            if date<now||date<normalize_fm_date(start) {return Err("Koniec kontraktu nie może poprzedzać daty gry ani początku umowy.".into());}
                        },
                        _=>{},
                    }
                    encoded
                },
                EditEncoding::Wage {euro_per_gbp}=>{
                    if read_fm27_euro_rate(&process,cache.plugin_base)!=Some(euro_per_gbp) {return Err("Kurs w grze zmienił się. Otwórz edytor ponownie.".into());}
                    let annual=change.value.parse::<f64>().map_err(|_|"Podaj płacę w euro rocznie.")?;
                    let weekly=(annual/(52.0*euro_per_gbp)).round();
                    if !annual.is_finite()||annual<0.0||annual>1_000_000_000.0||weekly>10_000_000.0 {return Err("Nieprawidłowa płaca podstawowa.".into());}
                    actual_value=format!("{:.2}",weekly*52.0*euro_per_gbp);
                    (weekly as u32).to_le_bytes().to_vec()
                },
                _=>{
                    let value=change.value.parse::<u32>().map_err(|_|"Wpisz liczbę całkowitą.")?;
                    if value<field.ui.min.unwrap_or(1)||value>field.ui.max.unwrap_or(20) {return Err(format!("Nieprawidłowa wartość pola „{}”.",field.ui.label));}
                    match field.encoding {EditEncoding::Ability=>{if change.key=="ca" {ca=value as u16;}else{pa=value as u16;} (value as u16).to_le_bytes().to_vec()},EditEncoding::Height=>(value as u16).to_le_bytes().to_vec(),EditEncoding::ScaledAttribute=>vec![(value*5) as u8],_=>vec![value as u8]}
                },
            };
            if after==field.bytes {continue;}
            patches.push(EditorPatch {address:field.address,before:field.bytes.clone(),after,change:AppliedChange {label:field.ui.label.clone(),before:field.ui.value.clone(),after:actual_value}});
        }
        if patches.is_empty() {return Err("Nie wybrano żadnej zmiany.".into());}
        if pa<ca {return Err("Potencjał PA nie może być mniejszy niż obecne umiejętności CA. Zmień oba pola w jednym zapisie.".into());}
        refresh_identity_check(&process,&cache)?;
        apply_editor_patches(&process,&draft.identity,&patches)?;
        let token=editor_token();
        let mut state=editor_state().lock().map_err(|_|"Zmiany zapisano, ale nie można przygotować cofnięcia.")?;
        if state.undos.len()>=8 {state.undos.clear();}
        state.undos.insert(token.clone(),EditorUndo {identity:draft.identity,patches:patches.clone()});drop(state);
        finish_player_edit(&process,&cache,&source,&candidate,patches,Some(token))
    }
    pub(super) fn undo_player_edit(token:String)->Result<PlayerEditResult,String> {
        let _guard=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
        let saved=editor_state().lock().map_err(|_|"Edytor jest zajęty.")?.undos.remove(&token).ok_or("Nie ma już zapisu do cofnięcia.")?;
        let (process,cache,source,candidate)=editor_context(saved.identity.session_id,saved.identity.uid,true)?;
        verify_editor_identity(&saved.identity,&editor_identity(&process,&source,&candidate)?)?;
        let patches=saved.patches.into_iter().map(|patch|EditorPatch {address:patch.address,before:patch.after,after:patch.before,change:AppliedChange {label:patch.change.label,before:patch.change.after,after:patch.change.before}}).collect::<Vec<_>>();
        refresh_identity_check(&process,&cache)?;
        apply_editor_patches(&process,&saved.identity,&patches)?;
        finish_player_edit(&process,&cache,&source,&candidate,patches,None)
    }

    // Research report only. No write handle, inferred ownership or edit token.
    fn league_native_type(process:&RemoteProcess,base:usize,vtable:usize)->Option<String> {
        let in_data=|address:usize,length:usize|address>=base+0x4AD9000&&address.checked_add(length).is_some_and(|end|end<=base+0x5768000);
        if !in_data(vtable.checked_sub(8)?,8) {return None;}
        let locator=process.read_ptr(vtable-8)?;
        if !in_data(locator,24) {return None;}
        let header=process.read_exact(locator,24)?;
        if read_u32(&header,0)!=Some(1)||read_u32(&header,4)!=Some(0)||base.checked_add(read_u32(&header,20)? as usize)?!=locator {return None;}
        let name=base.checked_add(read_u32(&header,12)? as usize)?.checked_add(16)?;
        if !in_data(name,128) {return None;}
        let text=process.read_c_string(name,128)?;
        (text.starts_with(".?AV")&&text.is_ascii()).then_some(text)
    }
    include!("fm_league_live.rs");

    pub(super) fn inspect_league_rules(session_id:u64)->Result<crate::fm_league::LeagueRuleReport,String> {
        use crate::fm_league::{LeagueRoot,LeagueLink,AgeRuleSample,LeagueRuleReport};
        let _guard=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.")?;
        let cache=refresh_slot().lock().map_err(|_|"Czytnik FM jest zajęty.")?.as_ref().cloned().ok_or("Najpierw połącz aplikację z grą.")?;
        let source=scouting_slot().lock().map_err(|_|"Czytnik FM jest zajęty.")?.as_ref().cloned().ok_or("Najpierw połącz aplikację z grą.")?;
        if source.session_id!=session_id||cache.database.session_id!=session_id {return Err("Dane gry odświeżono. Otwórz diagnostykę ponownie.".into());}
        if cache.club.is_none() {return Err("Diagnostyka reguł ligi wymaga prowadzonego klubu.".into());}
        if detect_football_manager().pid!=Some(source.pid) {return Err("Zmienił się proces FM. Połącz aplikację ponownie.".into());}
        let mut process=RemoteProcess::open(source.pid)?;process.layout=source.layout;process.native_plugin_hash=cache.native_plugin_hash.clone();
        if !verified_fm27(&process) {return Err("Diagnostyka reguł jest dostępna tylko dla rozpoznanego wydania FM27.".into());}
        refresh_identity_check(&process,&cache)?;
        let started=Instant::now();let regions=process.private_rw_regions();
        let base=cache.plugin_base;
        let game_date=process.read_u32(base+0x56AD378).filter(|raw|decode_fm_date(*raw).is_some()).map(normalize_fm_date);
        let age_vtable=base+0x4DF74B8;let eligibility_vtable=base+0x4E27288;
        let age_type=".?AVAGE_EXTRA_SQUAD_SELECTION_RULE@sicomps@@";
        let eligibility_type=".?AVUNDER_AGE_PLAYERS_ELIGIBLE_EXTRA_SQUAD_SELECTION_RULE@sicomps@@";
        if league_native_type(&process,base,age_vtable).as_deref()!=Some(age_type)||league_native_type(&process,base,eligibility_vtable).as_deref()!=Some(eligibility_type) {return Err("Nie potwierdzono struktur reguł wieku w pamięci gry.".into());}
        let mut roots=Vec::new();let mut queue=VecDeque::new();
        for offset in TEAM_COMPETITION {
            let Some(address)=process.read_ptr(cache.team+offset).filter(|p|pointer_in_regions(*p,&regions)) else {continue;};
            let native_type=process.read_ptr(address).and_then(|vtable|league_native_type(&process,base,vtable));
            let name=process.indirect_string(address+COMPETITION_NAME).filter(|name|plausible_label(name,96));
            roots.push(LeagueRoot {field:format!("team+0x{offset:X}"),address:format!("0x{address:X}"),uid:record_uid(&process,address),name,native_type:native_type.clone()});
            if native_type.is_some() {queue.push_back((address,0usize));}
        }
        let mut links=Vec::new();let mut visited=HashSet::new();let mut type_cache=HashMap::<usize,Option<String>>::new();
        let mut graph_limited=false;
        'graph: while let Some((address,depth))=queue.pop_front() {
            if depth>3 {graph_limited=true;continue;}
            if !visited.insert(address) {continue;}
            if visited.len()>96||links.len()>=512||started.elapsed().as_secs()>=3 {graph_limited=true;break;}
            let Some(bytes)=process.read_exact(address,0x300) else {continue;};
            for offset in (8..bytes.len()-8).step_by(8) {
                if started.elapsed().as_secs()>=3 {graph_limited=true;break 'graph;}
                let Some(pointer)=read_u64(&bytes,offset).map(|p|p as usize).filter(|p|*p%8==0&&pointer_in_regions(*p,&regions)) else {continue;};
                let mut targets=vec![(pointer,format!("+0x{offset:X}"))];
                if let Some(end)=read_u64(&bytes,offset+8).map(|p|p as usize).filter(|end|*end>=pointer&&(*end-pointer)%8==0&&*end-pointer<=32*8) {
                    if end>pointer {
                        if let Some(array)=process.read_exact(pointer,end-pointer) {
                            for (i,chunk) in array.chunks_exact(8).enumerate() {
                                if let Ok(value)=<[u8;8]>::try_from(chunk) {let target=u64::from_le_bytes(value) as usize;if target%8==0&&pointer_in_regions(target,&regions) {targets.push((target,format!("+0x{offset:X}[{i}]")));}}
                            }
                        }
                    }
                }
                for (target,field) in targets {
                    let Some(vtable)=process.read_ptr(target) else {continue;};
                    let name=type_cache.entry(vtable).or_insert_with(||league_native_type(&process,base,vtable));
                    let Some(name)=name.as_ref().filter(|name|["COMP","STAGE","RULE","SQUAD","DIVISION","SEASON","LEAGUE","ROUND"].iter().any(|key|name.contains(*key))) else {continue;};
                    if links.len()>=512 {graph_limited=true;break;}
                    links.push(LeagueLink {from:format!("0x{address:X}"),field,target:format!("0x{target:X}"),native_type:name.clone()});
                    if name.as_str()!=age_type&&name.as_str()!=eligibility_type {queue.push_back((target,depth+1));}
                }
            }
        }
        // Explicit, bounded on-demand heap scan. These are candidate objects,
        // not proof that any one of them belongs to the user's league/stage.
        let mut samples=Vec::new();let mut seen=HashSet::new();let mut scanned=0u64;let mut read_failures=0;let mut truncated=graph_limited;
        let patterns=[age_vtable.to_le_bytes(),eligibility_vtable.to_le_bytes()];
        'scan: for &(region,size) in &regions {
            let mut offset=0;
            while offset<size {
                if scanned>=2*1024*1024*1024u64||started.elapsed().as_secs()>=20||samples.len()>=256 {truncated=true;break 'scan;}
                let length=(size-offset).min(8*1024*1024);
                let Some(bytes)=process.read_exact(region+offset,length) else {read_failures+=1;offset+=length;continue;};
                scanned+=bytes.len() as u64;
                for (kind,pattern) in patterns.iter().enumerate() {
                    for hit in memmem::find_iter(&bytes,pattern) {
                        let address=region+offset+hit;
                        if address%8!=0||!seen.insert(address) {continue;}
                        let record_size=if kind==0 {0x18} else {0x20};
                        let Some(record)=process.read_exact(address,record_size) else {continue;};
                        if read_u64(&record,0)!=Some(if kind==0 {age_vtable as u64} else {eligibility_vtable as u64}) {continue;}
                        let age=record[if kind==0 {0x14} else {0x18}] as i8;
                        // Include neighboring age settings as native fields may
                        // encode an exclusive bound (e.g. 23 for displayed U22).
                        if !(19..=24).contains(&age) {continue;}
                        let date_raw=read_u32(&record,0x10).unwrap_or(0);
                        let stable_read=process.read_exact(address,record_size).as_ref()==Some(&record);
                        samples.push(AgeRuleSample {address:format!("0x{address:X}"),native_type:if kind==0 {age_type.into()} else {eligibility_type.into()},kind:record[8],date_raw,date:format_fm_date(date_raw),age_parameter:age,extra_parameter:if kind==0 {Some(record[0x15] as i8)} else {None},stable_read});
                        if samples.len()>=256 {truncated=true;break 'scan;}
                    }
                }
                offset+=length;
            }
        }
        refresh_identity_check(&process,&cache)?;
        if scouting_slot().lock().map_err(|_|"Czytnik FM jest zajęty.")?.as_ref().map(|source|source.session_id)!=Some(session_id) {return Err("Dane gry zmieniły się podczas diagnostyki. Ponów odczyt.".into());}
        if process.read_u32(base+0x56AD378).filter(|raw|decode_fm_date(*raw).is_some()).map(normalize_fm_date)!=game_date {return Err("Data gry zmieniła się podczas diagnostyki. Wstrzymaj FM i ponów odczyt.".into());}
        let mut warnings=vec!["Raport tylko do odczytu. Nie potwierdza aktywnej reguły ani adresu do edycji.".into(),"Łącza są kandydatami z ograniczonego przeglądu pamięci; wymagają sprawdzenia układu i powiązania z sezonem/fazą.".into(),"Próbki wieku 19–24 mogą pochodzić z innych lig, sezonów lub z pamięci podręcznej interfejsu.".into(),"Skan pomija regiony większe niż 512 MiB. Brak próbki nie oznacza braku reguły.".into()];
        if truncated {warnings.push("Odczyt ograniczony limitem czasu, danych lub liczby obiektów; raport jest częściowy.".into());}
        if read_failures>0 {warnings.push("Część regionów była chwilowo niedostępna.".into());}
        Ok(LeagueRuleReport {schema:1,read_only:true,session_id,game_date:game_date.and_then(format_fm_date),managed_team:cache.database.managed_team.clone(),managed_club_uid:cache.database.managed_club_uid,roots,candidate_links:links,age_rule_samples:samples,scanned_bytes:scanned,read_failures,elapsed_ms:started.elapsed().as_millis(),truncated,warnings})
    }

    struct HandleGuard(HANDLE);

    impl Drop for HandleGuard {
        fn drop(&mut self) {
            unsafe {
                let _ = CloseHandle(self.0);
            }
        }
    }

    struct RemoteProcess {
        handle: HandleGuard,
        layout: FmLayout,
        native_plugin_hash: Option<String>,
    }

    impl RemoteProcess {
        fn open(pid: u32) -> Result<Self, String> {
            let handle = unsafe {
                OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid)
            }
            .map_err(|error| format!("Nie udało się otworzyć pamięci FM: {error}"))?;

            Ok(Self {
                handle: HandleGuard(handle),
                layout: fm_version::FM26,
                native_plugin_hash: None,
            })
        }

        fn open_editor(pid:u32)->Result<Self,String> {
            let handle=unsafe {OpenProcess(PROCESS_QUERY_INFORMATION|PROCESS_VM_READ|PROCESS_VM_WRITE|PROCESS_VM_OPERATION,false,pid)}
                .map_err(|error|format!("Nie można otworzyć FM do zapisu: {error}"))?;
            Ok(Self {handle:HandleGuard(handle),layout:fm_version::FM26,native_plugin_hash:None})
        }
        fn write_exact(&self,address:usize,bytes:&[u8])->Result<(),String> {
            let mut written=0usize;
            unsafe {WriteProcessMemory(self.handle.0,address as *const c_void,bytes.as_ptr() as *const c_void,bytes.len(),Some(&mut written))}
                .map_err(|e|format!("Błąd zapisu pamięci: {e}"))?;
            if written!=bytes.len() || self.read_exact(address,bytes.len()).as_deref()!=Some(bytes) {return Err("Gra nie potwierdziła zapisanej wartości.".into());}
            Ok(())
        }
        fn creation_time(&self) -> Option<u64> {
            let (mut created,mut exited,mut kernel,mut user)=(FILETIME::default(),FILETIME::default(),FILETIME::default(),FILETIME::default());
            unsafe { GetProcessTimes(self.handle.0,&mut created,&mut exited,&mut kernel,&mut user).ok()?; }
            Some((u64::from(created.dwHighDateTime)<<32)|u64::from(created.dwLowDateTime))
        }

        fn read(&self, address: usize, length: usize) -> Option<Vec<u8>> {
            if address < 0x10_000 || length == 0 {
                return None;
            }

            let mut bytes = vec![0u8; length];
            let mut read = 0usize;
            let result = unsafe {
                ReadProcessMemory(
                    self.handle.0,
                    address as *const c_void,
                    bytes.as_mut_ptr() as *mut c_void,
                    length,
                    Some(&mut read as *mut usize),
                )
            };

            if result.is_err() || read == 0 {
                return None;
            }

            bytes.truncate(read);
            Some(bytes)
        }

        fn read_exact(&self, address: usize, length: usize) -> Option<Vec<u8>> {
            let bytes = self.read(address, length)?;
            (bytes.len() == length).then_some(bytes)
        }

        fn read_u8(&self, address: usize) -> Option<u8> {
            Some(*self.read_exact(address, 1)?.first()?)
        }

        fn read_u16(&self, address: usize) -> Option<u16> {
            read_u16(&self.read_exact(address, 2)?, 0)
        }

        fn read_u32(&self, address: usize) -> Option<u32> {
            read_u32(&self.read_exact(address, 4)?, 0)
        }

        fn read_u64(&self, address: usize) -> Option<u64> {
            read_u64(&self.read_exact(address, 8)?, 0)
        }

        fn read_ptr(&self, address: usize) -> Option<usize> {
            read_u64(&self.read_exact(address, 8)?, 0).map(|value| value as usize)
        }

        fn read_c_string(&self, address: usize, max_length: usize) -> Option<String> {
            let bytes = self
                .read(address, max_length)
                .or_else(|| self.read(address, max_length.min(32)))?;
            let end = bytes.iter().position(|byte| *byte == 0).unwrap_or(bytes.len());
            if end == 0 {
                return None;
            }
            let text = std::str::from_utf8(&bytes[..end]).ok()?.trim();
            (!text.is_empty()).then(|| text.to_string())
        }

        fn nested_string(&self, pointer_address: usize) -> Option<String> {
            let outer = self.read_ptr(pointer_address)?;
            let inner = self.read_ptr(outer)?;
            self.read_c_string(inner.saturating_add(4), 160)
        }

        fn indirect_string(&self, pointer_address: usize) -> Option<String> {
            let value = self.read_ptr(pointer_address)?;
            self.read_c_string(value.saturating_add(4), 160)
        }

        fn private_rw_regions(&self) -> Vec<(usize, usize)> {
            let mut regions = Vec::new();
            let mut address = 0x10_000usize;

            loop {
                let mut info = MEMORY_BASIC_INFORMATION::default();
                let queried = unsafe {
                    VirtualQueryEx(
                        self.handle.0,
                        Some(address as *const c_void),
                        &mut info,
                        size_of::<MEMORY_BASIC_INFORMATION>(),
                    )
                };
                if queried == 0 || info.RegionSize == 0 {
                    break;
                }

                let base = info.BaseAddress as usize;
                let next = base.saturating_add(info.RegionSize);
                if next <= address {
                    break;
                }
                address = next;

                if is_scannable_region(&info) && info.RegionSize <= MAX_REGION_SIZE {
                    regions.push((base, info.RegionSize));
                }
            }

            regions
        }
    }

    fn is_scannable_region(info: &MEMORY_BASIC_INFORMATION) -> bool {
        if info.State != MEM_COMMIT || info.Type != MEM_PRIVATE {
            return false;
        }
        if info.Protect.0 & PAGE_GUARD.0 != 0 || info.Protect.0 & PAGE_NOACCESS.0 != 0 {
            return false;
        }
        let protection = info.Protect.0 & 0xFF;
        protection == PAGE_READWRITE.0
            || protection == PAGE_WRITECOPY.0
            || protection == PAGE_EXECUTE_READWRITE.0
            || protection == PAGE_EXECUTE_WRITECOPY.0
    }

    struct ModuleImage {
        base: usize,
        end: usize,
        bytes: Vec<u8>,
    }

    impl ModuleImage {
        fn load(process: &RemoteProcess, base: usize, size: usize) -> Self {
            let mut bytes = vec![0u8; size];
            let mut offset = 0usize;
            while offset < size {
                let length = (size - offset).min(IMAGE_CHUNK_SIZE);
                if let Some(chunk) = process.read(base.saturating_add(offset), length) {
                    let copied = chunk.len().min(length);
                    bytes[offset..offset + copied].copy_from_slice(&chunk[..copied]);
                }
                offset = offset.saturating_add(length);
            }
            Self {
                base,
                end: base.saturating_add(size),
                bytes,
            }
        }

        fn contains(&self, address: usize, length: usize) -> bool {
            address >= self.base && address.saturating_add(length) <= self.end
        }

        fn read_u64(&self, address: usize) -> Option<u64> {
            if !self.contains(address, 8) {
                return None;
            }
            read_u64(&self.bytes, address - self.base)
        }

        fn read_i32(&self, address: usize) -> Option<i32> {
            if !self.contains(address, 4) {
                return None;
            }
            read_i32(&self.bytes, address - self.base)
        }
    }

    struct MetaResolver {
        game_plugin: ModuleImage,
        game_assembly: ModuleImage,
        module_low: usize,
        module_high: usize,
    }

    impl MetaResolver {
        fn is_module_pointer(&self, address: usize) -> bool {
            (self.game_plugin.base..self.game_plugin.end).contains(&address)
                || (self.game_assembly.base..self.game_assembly.end).contains(&address)
        }

        fn image_u64(&self, address: usize) -> Option<u64> {
            self.game_plugin
                .read_u64(address)
                .or_else(|| self.game_assembly.read_u64(address))
        }

        fn image_i32(&self, address: usize) -> Option<i32> {
            self.game_plugin
                .read_i32(address)
                .or_else(|| self.game_assembly.read_i32(address))
        }

        fn native_type_name(&self, vtable: usize) -> Option<String> {
            let image = [&self.game_plugin, &self.game_assembly].into_iter()
                .find(|image| image.contains(vtable.checked_sub(8).unwrap_or(0), 8))?;
            let locator = image.read_u64(vtable.checked_sub(8)?)? as usize;
            // MSVC x64 complete-object locator: signature, offset, cdOffset,
            // type-descriptor RVA, hierarchy RVA, self RVA. Require a primary vtable.
            if image.read_i32(locator)? != 1 || image.read_i32(locator + 4)? != 0 { return None; }
            let self_rva = u32::try_from(image.read_i32(locator + 20)?).ok()? as usize;
            if image.base.checked_add(self_rva)? != locator { return None; }
            let type_rva = u32::try_from(image.read_i32(locator + 12)?).ok()? as usize;
            let name_address = image.base.checked_add(type_rva)?.checked_add(16)?;
            if !image.contains(name_address, 1) { return None; }
            let start = name_address - image.base;
            let bytes = image.bytes.get(start..start.saturating_add(128).min(image.bytes.len()))?;
            let end = bytes.iter().position(|byte| *byte == 0)?;
            std::str::from_utf8(&bytes[..end]).ok().map(str::to_string)
        }

        fn dynamic_offset(&self, vtable: usize) -> Option<i32> {
            let meta = self.image_u64(vtable.checked_sub(8)?)? as usize;
            let offset = self.image_i32(meta.saturating_add(4))?;
            (offset > 0 && offset < 0x2000).then_some(offset)
        }
    }

    fn resolve_active_human_team(
        process: &RemoteProcess,
        resolver: &MetaResolver,
    ) -> ActiveHumanTeamResolution {
        let signature = &HUMAN_MANAGER_REGISTRY_SIGNATURE;
        let anchor = [0x48,0x8B,0x41,0x18,0x48,0x8B,0x49,0x20,0x48,0x29,0xC1,0x48,0xC1,0xF9,0x03,0x48,0x39,0xCE];
        let matches = memmem::find_iter(&resolver.game_plugin.bytes, &anchor)
            .filter_map(|offset| offset.checked_sub(7))
            .filter(|offset| resolver.game_plugin.bytes.get(*offset..*offset+signature.len())
                .map(|window| signature.iter().zip(window).all(|(expected,actual)| expected.map(|byte| byte==*actual).unwrap_or(true))).unwrap_or(false))
            .map(|offset| resolver.game_plugin.base + offset).collect::<Vec<_>>();
        let mut resolution = ActiveHumanTeamResolution {
            signature_match_count: matches.len(),
            ..ActiveHumanTeamResolution::default()
        };
        let [signature_address] = matches.as_slice() else {
            return resolution;
        };
        let Some(displacement) = resolver
            .game_plugin
            .read_i32(signature_address.saturating_add(3))
        else {
            return resolution;
        };
        let instruction_end = signature_address.saturating_add(7);
        let registry_slot = if displacement >= 0 {
            instruction_end.checked_add(displacement as usize)
        } else {
            instruction_end.checked_sub(displacement.unsigned_abs() as usize)
        };
        resolution.registry_slot = registry_slot;
        let Some(registry) = registry_slot
            .and_then(|slot| process.read_ptr(slot))
            .filter(|value| *value >= 0x10_000)
        else {
            return resolution;
        };
        let Some(begin) = process.read_ptr(registry + HUMAN_MANAGER_REGISTRY_VECTOR) else {
            return resolution;
        };
        let Some(end) = process.read_ptr(registry + HUMAN_MANAGER_REGISTRY_VECTOR + 8) else {
            return resolution;
        };
        if end < begin || (end - begin) % 8 != 0 {
            return resolution;
        }
        resolution.active_manager_count = (end - begin) / 8;
        if resolution.active_manager_count != 1 {
            return resolution;
        }
        let Some(human) = process.read_ptr(begin).filter(|value| *value >= 0x10_000) else {
            return resolution;
        };
        let person = human.saturating_add(process.layout.human_manager_person);
        let Some(team) = contract_team(process, person) else {
            return resolution;
        };
        resolution.active_team_count = 1;
        resolution.team_address = Some(team);
        resolution
    }

    // Read-only fallback for the independently documented FM27 Steam build.
    // https://github.com/barak14/fm-editor/blob/main/docs/fm27/memory-layout.md
    // Offset facts only; no third-party editor implementation is incorporated.
    fn resolve_fm27_manager_class(
        process: &RemoteProcess,
        resolver: &MetaResolver,
        managers: &HashSet<HumanManagerCandidate>,
    ) -> Option<usize> {
        const VERIFIED_PLUGIN: &str = "bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f";
        const HUMAN_VTABLE_RVA: usize = 0x4CC086C;
        if process.layout.edition != 27
            || !process.native_plugin_hash.as_deref()
                .map(|hash| hash.eq_ignore_ascii_case(VERIFIED_PLUGIN)).unwrap_or(false) {
            return None;
        }
        let mut active = Vec::new();
        for manager in managers {
            if process.read_ptr(manager.staff_address)
                != Some(resolver.game_plugin.base + HUMAN_VTABLE_RVA) { continue; }
            let Some((year, _)) = process.read_u32(manager.person_address + PERSON_DOB)
                .and_then(decode_fm_date) else { continue; };
            // The platform account placeholder shares the class, but has an
            // empty 1900 birth date and no world contract. Exclude it.
            if year <= 1900 { continue; }
            let Some(contract) = process.read_ptr(manager.person_address + PERSON_CONTRACT) else { continue; };
            if process.read_ptr(contract + 8) != Some(manager.person_address) { continue; }
            let Some(team) = process.read_ptr(contract + CONTRACT_TEAM).filter(|team| *team >= 0x10_000) else { continue; };
            active.push(team);
        }
        // Multiple managers remain ambiguous even when they share a team.
        (active.len() == 1).then(|| active[0])
    }

    #[derive(Debug, Clone)]
    struct PlayerCandidate {
        uid: u32,
        person_address: usize,
        player_address: usize,
        nation_address: usize,
        birth_raw: u32,
        female: bool,
        ca: u16,
        pa: u16,
    }

    #[derive(Debug)]
    struct PlayerRecord {
        uid: u32,
        first_name: Option<String>,
        last_name: Option<String>,
        display_name: String,
        female: bool,
        birth_raw: u32,
        nationality: Option<String>,
        club: Option<String>,
        owner_club: Option<String>,
        division: Option<String>,
        team_type: Option<u8>,
        club_reputation: u16,
        ca: u16,
        pa: u16,
        home_reputation: u16,
        current_reputation: u16,
        world_reputation: u16,
        condition: u16,
        morale: u8,
        height: u16,
        value: Option<u32>,
        asking_price: Option<u32>,
        wage: Option<u32>,
        contract_expiry: Option<String>,
        squad_number: Option<u8>,
        listed: bool,
        not_for_sale: bool,
        set_for_release: bool,
        positions: BTreeMap<String, u8>,
        attributes: BTreeMap<String, u8>,
        hidden: BTreeMap<String, u8>,
        personality: BTreeMap<String, u8>,
        left_foot: u8,
        right_foot: u8,
        owner_club_address: Option<usize>,
    }

    #[derive(Clone)]
    struct CachedTeamDetails {
        owner_club_address: Option<usize>,
        owner_club: Option<String>,
        division: Option<String>,
        club_reputation: u16,
    }

    #[derive(Default)]
    struct PlayerReadCache {
        nation_names: HashMap<usize, Option<String>>,
        team_details: HashMap<usize, CachedTeamDetails>,
    }

    #[derive(Debug)]
    struct ManagedTeamResolution {
        team_address: usize,
        team_name: String,
        nation_address: usize,
        nation_name: String,
        score: usize,
    }

    #[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
    struct HumanManagerCandidate {
        uid: u32,
        person_address: usize,
        staff_address: usize,
    }

    #[derive(Clone, Copy, Debug)]
    struct UidObjectCandidate {
        uid: u32,
        address: usize,
        dynamic_offset: usize,
    }

    #[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
    struct HumanContextCandidate {
        object_address: usize,
        binding_address: usize,
        job_state: u32,
    }

    #[derive(Clone, Copy, Debug)]
    struct HumanBindingResolution {
        human_team_uid: Option<u32>,
        database_index: Option<u32>,
        database_type: Option<u32>,
        nation_manager_evidence: usize,
        club_manager_evidence: usize,
    }

    #[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
    struct HumanTeamReference {
        human_team_uid: Option<u32>,
        database_index: Option<u32>,
        database_type: Option<u32>,
    }

    #[derive(Clone, Copy, Debug, Default)]
    struct ActiveHumanTeamResolution {
        registry_slot: Option<usize>,
        team_address: Option<usize>,
        signature_match_count: usize,
        active_manager_count: usize,
        active_team_count: usize,
    }

    #[derive(Debug, Default)]
    struct HumanBindingDiagnostics {
        context_candidate_count: usize,
        binding_candidate_count: usize,
        validated_binding_count: usize,
        human_team_node_count: usize,
        known_team_uid_count: usize,
        matched_data_count: usize,
        typed_value_count: usize,
        reference_value_count: usize,
        record_array_count: usize,
        uid_property_count: usize,
        interop_list_count: usize,
        interop_pair_count: usize,
        interop_uid_count: usize,
        database_reference_count: usize,
        database_reference_type: u32,
        database_reference_index: u32,
        decoded_uid_count: usize,
        nation_manager_context_count: usize,
        other_job_context_count: usize,
        validated_context_count: usize,
        rejected_context_count: usize,
        uid_object_match_count: usize,
        trusted_team_match_count: usize,
        team_shape_match_count: usize,
        database_index_match_count: usize,
        manager_registry_signature_count: usize,
        active_manager_count: usize,
        active_team_count: usize,
        national_resolution_count: usize,
    }

    #[derive(Debug, Default)]
    struct ManagedTeamDiagnostics {
        manager_count: usize,
        club_count: usize,
        team_count: usize,
        team_to_manager_link_count: usize,
        manager_to_team_link_count: usize,
        manager_graph_node_count: usize,
        national_candidate_count: usize,
    }

    #[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
    enum DateCandidateKind {
        PackedFmDate,
        DotNetTicks,
    }

    #[derive(Clone, Copy, Debug)]
    struct DateCandidate {
        address: usize,
        kind: DateCandidateKind,
        object_context: bool,
        module_static: bool,
    }

    #[derive(Clone)]
    struct DateMonitor {
        pid: u32,
        candidates: Vec<DateCandidate>,
        imported_raw: u32,
        imported_date: String,
        source: String,
        observed_current_raw: Option<u32>,
    }

    static DATE_MONITOR: OnceLock<Mutex<Option<DateMonitor>>> = OnceLock::new();

    fn monitor_slot() -> &'static Mutex<Option<DateMonitor>> {
        DATE_MONITOR.get_or_init(|| Mutex::new(None))
    }

    #[derive(Clone)]
    struct RefreshSession {
        database: FmNativeDatabase,
        created: u64,
        manager_person: Option<(usize,u32)>,
        native_plugin_hash: Option<String>,
        player_classes: Vec<(usize,usize)>,
        team: usize,
        nation: usize,
        club: Option<usize>,
        plugin_base: usize,
        registry_signature: Option<(usize,usize)>,
        registry_pointer_hash: Option<u64>,
        currency_sources: Vec<(u32,usize,usize,bool)>,
    }
    static REFRESH_CACHE: OnceLock<Mutex<Option<RefreshSession>>> = OnceLock::new();
    fn refresh_slot() -> &'static Mutex<Option<RefreshSession>> {
        REFRESH_CACHE.get_or_init(||Mutex::new(None))
    }
    fn verified_fm27(process: &RemoteProcess) -> bool {
        process.layout.edition==27 && process.native_plugin_hash.as_deref()==Some(FM27_PLUGIN_SHA256)
    }
    fn native_player_vector(process: &RemoteProcess, base: usize) -> Option<(usize,usize)> {
        if !verified_fm27(process) { return None; }
        let begin=process.read_ptr(base+0x57037D0)?;
        let end=process.read_ptr(base+0x57037D8)?;
        let length=end.checked_sub(begin)?;
        (begin>=0x10_000 && length%8==0 && (500..=2_000_000).contains(&(length/8))).then_some((begin,end))
    }
    fn registry_pointer_hash(bytes:&[u8]) -> u64 {
        use std::hash::{Hash,Hasher};
        let mut hasher=std::collections::hash_map::DefaultHasher::new();
        bytes.hash(&mut hasher);hasher.finish()
    }
    fn read_native_player_registry(process: &RemoteProcess, resolver: &MetaResolver) -> Option<HashMap<u32,PlayerCandidate>> {
        let (begin,end)=native_player_vector(process,resolver.game_plugin.base)?;
        let pointers=process.read_exact(begin,end-begin)?;
        let mut players=HashMap::with_capacity(pointers.len()/8);
        for pointer in pointers.chunks_exact(8) {
            let address=u64::from_le_bytes(pointer.try_into().ok()?) as usize;
            if address<0x10_000 { return None; }
            let mut bytes=process.read_exact(address,0x340)?;
            let offset=if read_u64(&bytes,PLAYER_OFFSET as usize)
                .and_then(|vtable|resolver.dynamic_offset(vtable as usize))==Some(PLAYER_OFFSET) { PLAYER_OFFSET as usize }
            else {
                bytes=process.read_exact(address,0x440)?;
                if read_u64(&bytes,PLAYER_STAFF_OFFSET as usize)
                    .and_then(|vtable|resolver.dynamic_offset(vtable as usize))!=Some(PLAYER_STAFF_OFFSET) { return None; }
                PLAYER_STAFF_OFFSET as usize
            };
            let person=bytes.get(offset..offset+0xB0)?;
            let uid=read_u32(person,OBJ_UID)?;
            let ca=read_u16(&bytes,PLAYER_CA)?; let pa=read_u16(&bytes,PLAYER_PA)?;
            if uid==0 || uid==u32::MAX || !(1..=200).contains(&ca) || !(1..=200).contains(&pa) { continue; }
            let candidate=PlayerCandidate {uid,person_address:address+offset,player_address:address,
                nation_address:read_u64(person,PERSON_NATION)? as usize,birth_raw:read_u32(person,PERSON_DOB)?,
                female:person[PERSON_GENDER]&GENDER_FEMALE_BIT!=0,ca,pa};
            if players.insert(uid,candidate).is_some() { return None; }
        }
        // A moving registry or a different save must never publish a partial index.
        if native_player_vector(process,resolver.game_plugin.base)!=Some((begin,end)) || players.len()<500 { return None; }
        Some(players)
    }
    fn collect_registry_currencies(process: &RemoteProcess, resolver: &MetaResolver, rates: &mut GameCurrencyRates) {
        if !verified_fm27(process) { return; }
        let vtable=resolver.game_plugin.base+FM27_CURRENCY_VTABLE;
        if resolver.native_type_name(vtable).as_deref()!=Some(".?AVCURRENCY_RECORD@db@@") { return; }
        // Inspect only the bounded entity-array cluster; verify every currency
        // object's RTTI/vtable before treating a vector as currency records.
        for offset in (0x5703000..0x5705000).step_by(8) {
            let slot=resolver.game_plugin.base+offset;
            let Some(begin)=process.read_ptr(slot).filter(|p|*p>=0x10_000) else { continue; };
            let Some(end)=process.read_ptr(slot+8) else { continue; };
            let Some(length)=end.checked_sub(begin).filter(|n|*n>=16 && *n<=256*8 && *n%8==0) else { continue; };
            let Some(pointers)=process.read_exact(begin,length) else { continue; };
            let entries=pointers.chunks_exact(8).filter_map(|chunk|chunk.try_into().ok().map(u64::from_le_bytes)).map(|v|v as usize).collect::<Vec<_>>();
            if entries.len()<2 || entries.iter().any(|p|process.read_ptr(*p)!=Some(vtable)) { continue; }
            for entry in entries { rates.collect(process,resolver,entry); }
        }
    }
    fn live_candidate(process: &RemoteProcess, cached: &PlayerCandidate) -> Option<PlayerCandidate> {
        let person=process.read_exact(cached.person_address,0xB0)?;
        if read_u32(&person,OBJ_UID)!=Some(cached.uid) { return None; }
        let ability=process.read_exact(cached.player_address+PLAYER_CA,4)?;
        let ca=read_u16(&ability,0)?;
        let pa=read_u16(&ability,2)?;
        if !(1..=200).contains(&ca) || !(1..=200).contains(&pa) { return None; }
        Some(PlayerCandidate {ca,pa,nation_address:read_u64(&person,PERSON_NATION)? as usize,
            birth_raw:read_u32(&person,PERSON_DOB)?,female:person[PERSON_GENDER]&GENDER_FEMALE_BIT!=0,..cached.clone()})
    }
    fn refresh_error(code: &str, text: &str) -> String { format!("{text} [FM-{code}]") }
    fn refresh_manager_person(process: &RemoteProcess, registry_slot: Option<usize>, managers: &HashSet<HumanManagerCandidate>, team: usize) -> Option<(usize,u32)> {
        let mut people=managers.iter().map(|manager|manager.person_address).collect::<HashSet<_>>();
        if let Some(slot)=registry_slot {
            if let Some(registry)=process.read_ptr(slot).filter(|p|*p>=0x10_000) {
                if let Ok(humans)=pointer_vector(process,registry+HUMAN_MANAGER_REGISTRY_VECTOR,128) {
                    people.extend(humans.into_iter().map(|human|human+process.layout.human_manager_person));
                }
            }
        }
        if let Some(human)=process.read_ptr(team+TEAM_MANAGER).filter(|p|*p>=0x10_000) {
            people.insert(human+process.layout.human_manager_person);
        }
        let valid=people.into_iter().filter_map(|person| {
            let uid=record_uid(process,person)?;
            let (year,_)=process.read_u32(person+PERSON_DOB).and_then(decode_fm_date)?;
            if year<=1900 { return None; }
            let contract=process.read_ptr(person+PERSON_CONTRACT)?;
            if process.read_ptr(contract+8)!=Some(person) || process.read_ptr(contract+CONTRACT_TEAM)!=Some(team) { return None; }
            Some((person,uid))
        }).collect::<Vec<_>>();
        (valid.len()==1).then(||valid[0])
    }
    fn refresh_identity_check(process: &RemoteProcess, cache: &RefreshSession) -> Result<(),String> {
        let read=|text:&str|refresh_error("R10",text);
        let created=process.creation_time().ok_or_else(||read("Gra nie udostępniła jeszcze informacji o procesie. Ponów odświeżanie."))?;
        if created!=cache.created { return Err(refresh_error("R02","Proces FM został uruchomiony ponownie. Użyj „Połącz ponownie”.")); }
        let actual_team=record_uid(process,cache.team).ok_or_else(||read("Nie można teraz odczytać prowadzonego zespołu. Poczekaj na zakończenie operacji w FM i ponów odświeżanie."))?;
        if Some(actual_team)!=cache.database.managed_team_uid { return Err(refresh_error("R05","Zmienił się obiekt prowadzonego zespołu. Użyj „Połącz ponownie”.")); }
        let (person,uid)=cache.manager_person.ok_or_else(||refresh_error("R01","Brak potwierdzonej tożsamości menedżera dla szybkiego odczytu. Użyj „Połącz ponownie”."))?;
        let actual_uid=record_uid(process,person).ok_or_else(||read("Menedżer jest chwilowo niedostępny w pamięci gry. Ponów odświeżanie."))?;
        if actual_uid!=uid { return Err(refresh_error("R03","Zmienił się menedżer lub zapis gry. Użyj „Połącz ponownie”.")); }
        let team=contract_team(process,person).ok_or_else(||read("Kontrakt menedżera jest chwilowo niedostępny. Ponów odświeżanie po zakończeniu przetwarzania w FM."))?;
        if team!=cache.team { return Err(refresh_error("R04","Menedżer prowadzi teraz inny zespół. Użyj „Połącz ponownie”.")); }
        if let Some(club)=cache.club {
            let club_uid=record_uid(process,club).ok_or_else(||read("Nie można teraz odczytać klubu. Ponów odświeżanie."))?;
            let owner=process.read_ptr(cache.team+TEAM_CLUB).filter(|owner|*owner>=0x10_000).ok_or_else(||read("Powiązanie zespołu z klubem jest chwilowo niedostępne. Ponów odświeżanie."))?;
            if Some(club_uid)!=cache.database.managed_club_uid || owner!=club {
                return Err(refresh_error("R05","Zmieniło się powiązanie zespołu z klubem. Użyj „Połącz ponownie”."));
            }
        }
        Ok(())
    }
    fn rebind_native_player_index(process:&RemoteProcess,cache:&RefreshSession) -> Result<Arc<Vec<PlayerCandidate>>,String> {
        let error=||refresh_error("R07","Nie można jeszcze odczytać bieżącego rejestru zawodników. Poczekaj na zakończenie przetwarzania w FM i ponów odświeżanie.");
        let (begin,end)=native_player_vector(process,cache.plugin_base).ok_or_else(error)?;
        let pointers=process.read_exact(begin,end-begin).ok_or_else(error)?;
        let mut players=Vec::with_capacity(pointers.len()/8);let mut uids=HashSet::new();
        let length=cache.player_classes.iter().map(|(offset,_)|offset+0xB0).max().unwrap_or(0x340).max(0x270);
        for pointer in pointers.chunks_exact(8) {
            let address=u64::from_le_bytes(pointer.try_into().map_err(|_|error())?) as usize;
            let bytes=process.read_exact(address,length).ok_or_else(error)?;
            let offset=cache.player_classes.iter().find(|(offset,vtable)|read_u64(&bytes,*offset)==Some(*vtable as u64))
                .map(|(offset,_)|*offset).ok_or_else(||refresh_error("R08","Rejestr zawiera nowy typ zawodnika. Użyj „Połącz ponownie”, aby potwierdzić układ danych."))?;
            let person=bytes.get(offset..offset+0xB0).ok_or_else(error)?;
            let uid=read_u32(person,OBJ_UID).filter(|uid|*uid!=0 && *uid!=u32::MAX).ok_or_else(error)?;
            let ca=read_u16(&bytes,PLAYER_CA).ok_or_else(error)?;let pa=read_u16(&bytes,PLAYER_PA).ok_or_else(error)?;
            if !(1..=200).contains(&ca)||!(1..=200).contains(&pa) { continue; }
            if !uids.insert(uid) { return Err(error()); }
            players.push(PlayerCandidate {uid,person_address:address+offset,player_address:address,
                nation_address:read_u64(person,PERSON_NATION).ok_or_else(error)? as usize,
                birth_raw:read_u32(person,PERSON_DOB).ok_or_else(error)?,female:person[PERSON_GENDER]&GENDER_FEMALE_BIT!=0,ca,pa});
        }
        if players.len()<500 || native_player_vector(process,cache.plugin_base)!=Some((begin,end)) { return Err(error()); }
        Ok(Arc::new(players))
    }
    pub(super) fn refresh_database() -> Result<FmNativeDatabase,String> {
        let _read_guard=SCOUTING_QUERY_LOCK.lock().map_err(|_|"Czytnik FM jest zajęty.".to_string())?;
        let mut result=refresh_database_inner(false);
        if result.as_ref().err().is_some_and(|error|error.contains("[FM-R07]")) {
            result=refresh_database_inner(true);
        }
        if result.as_ref().err().is_some_and(|error|["R01","R02","R03","R04","R05","R08"].iter().any(|code|error.contains(&format!("[FM-{code}]")))) {
            if let Ok(mut slot)=refresh_slot().lock() { *slot=None; }
            if let Ok(mut slot)=scouting_slot().lock() { *slot=None; }
            if let Ok(mut slot)=monitor_slot().lock() { *slot=None; }
        }
        result
    }
    fn refresh_database_inner(force_reindex:bool) -> Result<FmNativeDatabase,String> {
        let started=Instant::now();
        let missing=||refresh_error("R01","Brak aktywnej sesji szybkiego odświeżania. Użyj „Połącz ponownie”.");
        let cache=refresh_slot().lock().map_err(|_|refresh_error("R10","Czytnik FM jest zajęty. Ponów odświeżanie."))?.as_ref().cloned().ok_or_else(missing)?;
        let mut source=scouting_slot().lock().map_err(|_|refresh_error("R10","Indeks FM jest zajęty. Ponów odświeżanie."))?.as_ref().cloned().ok_or_else(missing)?;
        if source.session_id!=cache.database.session_id { return Err(refresh_error("R10","Inny odczyt zaktualizował sesję. Ponów odświeżanie.")); }
        let detected=detect_football_manager();
        if !detected.detected || detected.pid!=Some(source.pid) { return Err(refresh_error("R02","Nie jest uruchomiony proces FM użyty do połączenia. Użyj „Połącz ponownie”.")); }
        let mut process=RemoteProcess::open(source.pid)?;
        process.layout=source.layout;
        process.native_plugin_hash=cache.native_plugin_hash.clone();
        refresh_identity_check(&process,&cache)?;
        let current_registry=if verified_fm27(&process) {
            Some(native_player_vector(&process,cache.plugin_base).ok_or_else(||refresh_error("R10","Rejestr zawodników jest aktualizowany przez grę. Ponów odświeżanie."))?)
        } else { None };
        let mut reindex=force_reindex || current_registry!=cache.registry_signature;
        let mut current_pointer_hash=None;
        if let Some((begin,end))=current_registry {
            let pointers=process.read_exact(begin,end-begin).ok_or_else(||refresh_error("R10","Lista zawodników jest chwilowo niedostępna. Ponów odświeżanie."))?;
            current_pointer_hash=Some(registry_pointer_hash(&pointers));
            reindex |= current_pointer_hash!=cache.registry_pointer_hash;
        }
        if reindex && verified_fm27(&process) { source.candidates=rebind_native_player_index(&process,&cache)?; }
        let candidates=source.candidates.iter().cloned().map(|p|(p.uid,p)).collect::<HashMap<_,_>>();
        let (groups,own_clubs)=if let Some(club)=cache.club {
            collect_managed_club_players(&process,club,cache.team,&candidates,Some(&source.own_uids))?
        } else { (HashMap::new(),HashSet::new()) };
        let world_date=if verified_fm27(&process) {
            process.read_u32(cache.plugin_base+0x56AD378).filter(|raw|decode_fm_date(*raw).is_some()).map(normalize_fm_date)
        } else { None };
        let derived_year=world_date.and_then(decode_fm_date).map(|(year,_)|year).unwrap_or(source.derived_year);
        let mut eur=None; let mut gbp=None;
        for &(uid,record,table,is_euro) in &cache.currency_sources {
            if record_uid(&process,record)!=Some(uid) { continue; }
            let rate=read_currency_rate(&process,cache.plugin_base,table);
            if is_euro { eur=rate; } else { gbp=rate; }
        }
        let euro_per_gbp=read_fm27_euro_rate(&process,cache.plugin_base).or_else(||eur.zip(gbp).map(|(eur,gbp)|eur/gbp).filter(|rate|rate.is_finite() && (0.01..100.0).contains(rate)));
        let mut rows=Vec::new();let mut read_cache=PlayerReadCache::default();
        for cached in source.candidates.iter() {
            if cache.club.is_some() && !groups.contains_key(&cached.uid) { continue; }
            let candidate=live_candidate(&process,cached).ok_or_else(||refresh_error("R07","Adres zawodnika zmienił się podczas odczytu. Ponów odświeżanie."))?;
            if cache.club.is_none() && candidate.nation_address!=cache.nation { continue; }
            let gender=cache.database.managed_squad_gender.as_deref();
            if gender==Some("Kobiety") && !candidate.female || gender==Some("Mężczyźni") && candidate.female { continue; }
            let player=read_player(&process,candidate.uid,candidate.person_address,candidate.player_address,candidate.ca,candidate.pa,&mut read_cache).ok_or_else(||refresh_error("R10","Dane zawodnika są aktualizowane przez FM. Ponów odświeżanie."))?;
            let mut row=player_to_row(player,world_date,derived_year);
            attach_euro_rate(&mut row,euro_per_gbp);
            if cache.club.is_some() { row.insert("Grupa klubowa".into(),groups.get(&candidate.uid).cloned().unwrap_or_default()); }
            rows.push(row);
        }
        if rows.is_empty() { return Err(refresh_error("R10","Skład jest chwilowo niedostępny. Ponów odświeżanie po zakończeniu operacji w grze.")); }
        refresh_identity_check(&process,&cache)?;
        if current_registry.is_some() && native_player_vector(&process,cache.plugin_base)!=current_registry {
            return Err(refresh_error("R07","Rejestr zawodników zmienił się w trakcie odczytu. Ponów odświeżanie."));
        }
        rows.sort_by(|a,b|a.get("Nazwisko").cmp(&b.get("Nazwisko")).then_with(||a.get("UID").cmp(&b.get("UID"))));
        let session_id=SCOUTING_SEQUENCE.fetch_add(1,Ordering::Relaxed)+1;
        let mut database=cache.database.clone();
        database.rows=rows;database.player_count=database.rows.len();database.session_id=session_id;
        database.game_date=world_date.and_then(format_fm_date);
        database.database_player_count=source.candidates.len();
        database.scan_region_count=0;database.scanned_bytes=0;database.scan_duration_ms=started.elapsed().as_millis();
        let own_uids=if cache.club.is_some() { database.rows.iter().filter_map(|row|row.get("UID")?.parse::<u32>().ok()).collect() } else { HashSet::new() };
        *scouting_slot().lock().map_err(|_|refresh_error("R10","Czytnik jest zajęty. Ponów odświeżanie."))?=Some(ScoutingSession {
            session_id,own_uids:Arc::new(own_uids),own_clubs:Arc::new(own_clubs),derived_year,game_date:world_date,euro_per_gbp,index:None,..source
        });
        if let (Some(raw),Some(date))=(world_date,database.game_date.clone()) {
            if let Ok(mut slot)=monitor_slot().lock() { if let Some(monitor)=slot.as_mut() {
                monitor.imported_raw=raw;monitor.imported_date=date;monitor.observed_current_raw=None;
            }}
        }
        *refresh_slot().lock().map_err(|_|refresh_error("R10","Czytnik jest zajęty. Ponów odświeżanie."))?=Some(RefreshSession {database:database.clone(),registry_signature:current_registry,registry_pointer_hash:current_pointer_hash,..cache});
        Ok(database)
    }

    pub(super) fn read_database() -> Result<FmNativeDatabase, String> {
        let _read_guard = SCOUTING_QUERY_LOCK.lock().map_err(|_| "Czytnik FM jest zajęty.".to_string())?;
        if let Ok(mut slot)=refresh_slot().lock() { *slot=None; }
        if let Ok(mut guard) = monitor_slot().lock() {
            *guard = None;
        }

        if let Ok(mut cache) = scouting_slot().lock() { *cache = None; }
        let started = Instant::now();
        let detected = detect_football_manager();
        let pid = detected
            .pid
            .filter(|_| detected.detected)
            .ok_or_else(|| "Nie wykryto uruchomionego Football Managera.".to_string())?;

        let modules = inspect_fm_modules_blocking()?;
        let game_plugin_module = modules
            .modules
            .iter()
            .find(|module| module.name.eq_ignore_ascii_case("game_plugin.dll"))
            .ok_or_else(|| "FM działa, ale game_plugin.dll nie jest jeszcze załadowany. Wczytaj zapis w grze i spróbuj ponownie.".to_string())?;
        let game_assembly_module = modules
            .modules
            .iter()
            .find(|module| module.name.eq_ignore_ascii_case("GameAssembly.dll"))
            .ok_or_else(|| "FM działa, ale GameAssembly.dll nie jest załadowany.".to_string())?;

        let game_plugin_base = parse_hex_address(&game_plugin_module.base_address)
            .ok_or_else(|| "Nie udało się odczytać adresu game_plugin.dll.".to_string())?;
        let game_assembly_base = parse_hex_address(&game_assembly_module.base_address)
            .ok_or_else(|| "Nie udało się odczytać adresu GameAssembly.dll.".to_string())?;
        let mut process = RemoteProcess::open(pid)?;
        process.layout = fm_version::runtime_layout(std::path::Path::new(&game_assembly_module.path))?;
        process.native_plugin_hash = game_plugin_module.sha256.clone();
        let regions = process.private_rw_regions();
        if regions.is_empty() {
            return Err("Nie znaleziono czytelnych regionów pamięci bazy FM.".to_string());
        }

        let game_plugin = ModuleImage::load(
            &process,
            game_plugin_base,
            game_plugin_module.memory_size as usize,
        );
        let game_assembly = ModuleImage::load(
            &process,
            game_assembly_base,
            game_assembly_module.memory_size as usize,
        );
        let resolver = MetaResolver {
            module_low: game_plugin.base.min(game_assembly.base),
            module_high: game_plugin.end.max(game_assembly.end),
            game_plugin,
            game_assembly,
        };

        let early_active = resolve_active_human_team(&process, &resolver);
        let early_club = resolve_active_contract_club(&process, &resolver, &early_active);
        let native_players = if early_club.is_some() { read_native_player_registry(&process,&resolver) } else { None };
        let direct_registry = native_players.is_some();
        let mut player_candidates = native_players.unwrap_or_default();
        let mut club_candidates = HashSet::<usize>::new();
        let mut human_managers = HashSet::<HumanManagerCandidate>::new();
        let mut uid_objects = Vec::<UidObjectCandidate>::new();
        let mut binding_candidates = HashSet::<usize>::new();
        let mut human_context_candidates = HashSet::<HumanContextCandidate>::new();
        let mut class_offset_histogram = HashMap::<i32, u64>::new();
        let mut scanned_bytes = 0u64;
        let currency_vtable = (process.layout.edition == 27
            && process.native_plugin_hash.as_deref() == Some(FM27_PLUGIN_SHA256))
            .then_some(resolver.game_plugin.base + FM27_CURRENCY_VTABLE)
            .filter(|vtable| resolver.native_type_name(*vtable).as_deref() == Some(".?AVCURRENCY_RECORD@db@@"));
        let mut currency_rates = GameCurrencyRates::default();
        if direct_registry { collect_registry_currencies(&process,&resolver,&mut currency_rates); }

        for &(region_base, region_size) in regions.iter().filter(|_| !direct_registry) {
            let mut region_offset = 0usize;
            while region_offset < region_size {
                let request_size = (region_size - region_offset).min(CHUNK_SIZE);
                let chunk_address = region_base.saturating_add(region_offset);
                let read_size = (region_size - region_offset)
                    .min(request_size.saturating_add(HUMAN_CONTEXT_SCAN_TAIL));
                let Some(buffer) = process.read(chunk_address, read_size) else {
                    region_offset = region_offset.saturating_add(request_size);
                    continue;
                };
                let scan_size = request_size.min(buffer.len());
                scanned_bytes = scanned_bytes.saturating_add(scan_size as u64);

                collect_human_context_candidates(
                    &buffer,
                    scan_size,
                    chunk_address,
                    &regions,
                    &resolver,
                    &mut binding_candidates,
                    &mut human_context_candidates,
                    &process.layout,
                );

                let mut local = (8 - chunk_address % 8) % 8;
                while local + 0x10 <= scan_size {
                    let Some(vtable) = read_u64(&buffer, local).map(|value| value as usize) else {
                        local += 8;
                        continue;
                    };
                    if vtable < resolver.module_low
                        || vtable >= resolver.module_high
                        || !resolver.is_module_pointer(vtable)
                    {
                        local += 8;
                        continue;
                    }

                    if currency_vtable == Some(vtable) {
                        currency_rates.collect(&process, &resolver, chunk_address + local);
                    }
                    collect_human_binding_candidate(
                        &buffer,
                        local,
                        chunk_address,
                        &regions,
                        &mut binding_candidates,
                        &process.layout,
                    );

                    let person_address = chunk_address.saturating_add(local);
                    let uid = read_u32(&buffer, local + OBJ_UID)
                        .or_else(|| process.read_u32(person_address + OBJ_UID))
                        .unwrap_or(0);
                    let dynamic_offset = resolver.dynamic_offset(vtable);
                    if uid != 0 && uid != u32::MAX {
                        uid_objects.push(UidObjectCandidate {
                            uid,
                            address: person_address,
                            dynamic_offset: dynamic_offset
                                .map(|offset| offset as usize)
                                .unwrap_or(0),
                        });
                    }

                    let Some(dynamic_offset) = dynamic_offset else {
                        local += 8;
                        continue;
                    };
                    if uid == 0 || uid == u32::MAX {
                        local += 8;
                        continue;
                    }

                    *class_offset_histogram.entry(dynamic_offset).or_default() += 1;

                    if dynamic_offset == PLAYER_OFFSET || dynamic_offset == PLAYER_STAFF_OFFSET {
                        let offset = dynamic_offset as usize;
                        if person_address < offset {
                            local += 8;
                            continue;
                        }
                        let player_address = person_address - offset;
                        let ca = process.read_u16(player_address + PLAYER_CA).unwrap_or(0);
                        let pa = process.read_u16(player_address + PLAYER_PA).unwrap_or(0);
                        if !(1..=200).contains(&ca) || !(1..=200).contains(&pa) {
                            local += 8;
                            continue;
                        }

                        if let std::collections::hash_map::Entry::Vacant(entry) =
                            player_candidates.entry(uid)
                        {
                            let nation_address = read_u64(&buffer, local + PERSON_NATION)
                                .or_else(|| process.read_u64(person_address + PERSON_NATION))
                                .unwrap_or(0) as usize;
                            let birth_raw = read_u32(&buffer, local + PERSON_DOB)
                                .or_else(|| process.read_u32(person_address + PERSON_DOB))
                                .unwrap_or(0);
                            let female = buffer
                                .get(local + PERSON_GENDER)
                                .copied()
                                .or_else(|| process.read_u8(person_address + PERSON_GENDER))
                                .map(|value| value & GENDER_FEMALE_BIT != 0)
                                .unwrap_or(false);

                            entry.insert(PlayerCandidate {
                                uid,
                                person_address,
                                player_address,
                                nation_address,
                                birth_raw,
                                female,
                                ca,
                                pa,
                            });
                        }
                    } else if dynamic_offset as usize == process.layout.human_manager_person {
                        let offset = dynamic_offset as usize;
                        if person_address >= offset
                            && looks_like_named_person(&process, person_address)
                        {
                            human_managers.insert(HumanManagerCandidate {
                                uid,
                                person_address,
                                staff_address: person_address - offset,
                            });
                        }
                    } else if dynamic_offset != STAFF_OFFSET {
                        if looks_like_club(&process, person_address) {
                            club_candidates.insert(person_address);
                        }
                    }

                    local += 8;
                }

                region_offset = region_offset.saturating_add(request_size);
            }
        }

        let euro_per_gbp = read_fm27_euro_rate(&process,resolver.game_plugin.base).or_else(||currency_rates.euro_per_gbp());
        let class_offsets = top_class_offsets(&class_offset_histogram);
        if player_candidates.len() < 500 {
            let diagnostic = class_offsets
                .iter()
                .take(6)
                .map(|entry| format!("{}={}", entry.offset, entry.count))
                .collect::<Vec<_>>()
                .join(", ");
            return Err(format!(
                "Profil pamięci {} nie przeszedł walidacji: znaleziono tylko {} graczy. Najczęstsze offsety klas: {}. Nie pokazano częściowych ani losowych danych.",
                process.layout.name, player_candidates.len(), diagnostic
            ));
        }

        if process.layout.experimental {
            validate_trial_native_layout(&process, &player_candidates)?;
        }

        let nation_counts = player_candidates
            .values()
            .filter(|candidate| candidate.nation_address != 0)
            .fold(HashMap::<usize, usize>::new(), |mut counts, candidate| {
                *counts.entry(candidate.nation_address).or_default() += 1;
                counts
            });
        let mut active_human_team = early_active;
        if active_human_team.team_address.is_none() {
            if let Some(team) = resolve_fm27_manager_class(&process, &resolver, &human_managers) {
                active_human_team.team_address = Some(team);
                active_human_team.active_manager_count = 1;
                active_human_team.active_team_count = 1;
            }
        }
        let direct_club = early_club.or_else(|| resolve_active_contract_club(&process, &resolver, &active_human_team));
        let (human_binding, mut binding_diagnostics) = if direct_club.is_some() {
            // A proven native club job needs no heap-wide UI binding lookup.
            (None, HumanBindingDiagnostics::default())
        } else {
            let known_team_uids = collect_known_team_uids(&process, &uid_objects, &club_candidates);
            resolve_human_team_binding(&process, &regions, &binding_candidates,
                &human_context_candidates, &known_team_uids)
        };
        binding_diagnostics.manager_registry_signature_count =
            active_human_team.signature_match_count;
        binding_diagnostics.active_manager_count = active_human_team.active_manager_count;
        binding_diagnostics.active_team_count = active_human_team.active_team_count;
        // The native active-manager contract is authoritative for a club career.
        // humanTeam is UI state and may be absent or stale on unrelated screens.
        let club_mode = direct_club.is_some()
            || human_binding.map(|binding| binding.club_manager_evidence > 0).unwrap_or(false);
        let managed = direct_club.or_else(|| human_binding.and_then(|binding| {
            if club_mode {
                return resolve_bound_club_team(&process, binding, active_human_team.team_address, &human_managers);
            }
            resolve_bound_national_team(
                &process,
                binding,
                active_human_team.team_address,
                &uid_objects,
                &club_candidates,
                &human_managers,
                &player_candidates,
                &nation_counts,
                &mut binding_diagnostics,
            )
        }));
        let managed = managed.ok_or_else(|| {
            format!(
                "Wykryto {}, ale nie udało się jednoznacznie odczytać prowadzonego zespołu z kontraktu menedżera ani powiązania humanTeam. Aplikacja nie zgaduje kraju na podstawie liczby zawodników. Kod diagnostyczny: C{}/B{}/V{}/H{}/K{}/D{}/T{}/Q{}/A{}/P{}/L{}/E{}/I{}/F{}/Y{}/N{}/U{}/J{}/X{}/O{}/W{}/S{}/Z{}/G{}/M{}/GT{}/R{}/MC{}/VC{}/IC{}.",
                process.layout.name,
                binding_diagnostics.context_candidate_count,
                binding_diagnostics.binding_candidate_count,
                binding_diagnostics.validated_binding_count,
                binding_diagnostics.human_team_node_count,
                binding_diagnostics.known_team_uid_count,
                binding_diagnostics.matched_data_count,
                binding_diagnostics.typed_value_count,
                binding_diagnostics.reference_value_count,
                binding_diagnostics.record_array_count,
                binding_diagnostics.uid_property_count,
                binding_diagnostics.interop_list_count,
                binding_diagnostics.interop_pair_count,
                binding_diagnostics.interop_uid_count,
                binding_diagnostics.database_reference_count,
                binding_diagnostics.database_reference_type,
                binding_diagnostics.database_reference_index,
                binding_diagnostics.decoded_uid_count,
                binding_diagnostics.nation_manager_context_count,
                binding_diagnostics.other_job_context_count,
                binding_diagnostics.uid_object_match_count,
                binding_diagnostics.trusted_team_match_count,
                binding_diagnostics.team_shape_match_count,
                binding_diagnostics.database_index_match_count,
                binding_diagnostics.manager_registry_signature_count,
                binding_diagnostics.active_manager_count,
                binding_diagnostics.active_team_count,
                binding_diagnostics.national_resolution_count,
                human_managers.len(),
                binding_diagnostics.validated_context_count,
                binding_diagnostics.rejected_context_count,
            )
        })?;
        let manager_team = Some(managed.team_address);
        let managed_team_uid = record_uid(&process, managed.team_address);
        let managed_nation_uid = (!club_mode).then(|| record_uid(&process, managed.nation_address)).flatten();
        let managed_club = if club_mode { process.read_ptr(managed.team_address + TEAM_CLUB) } else { None };
        let managed_club_uid = managed_club.and_then(|club| record_uid(&process, club));
        let managed_team = Some(managed.team_name.clone());
        let managed_nation_address = managed.nation_address;
        let managed_nation = managed.nation_name;
        let managed_gender =
            resolve_managed_squad_gender(&process, managed.team_address, &player_candidates);

        let (club_groups, own_clubs) = if let Some(club) = managed_club {
            collect_managed_club_players(&process, club, managed.team_address, &player_candidates, None)?
        } else { (HashMap::new(), HashSet::new()) };
        let selected_candidates = player_candidates
            .values()
            .filter(|candidate| {
                (if club_mode { club_groups.contains_key(&candidate.uid) } else { candidate.nation_address == managed_nation_address })
                    && managed_gender
                        .map(|female| candidate.female == female)
                        .unwrap_or(true)
            })
            .collect::<Vec<_>>();
        if selected_candidates.is_empty() {
            return Err(format!(
                "Rozpoznano prowadzony zespół, ale nie znaleziono jego zawodników. Odśwież połączenie po wczytaniu zapisu."
            ));
        }

        let database_player_count = player_candidates.len();
        // Documented FM27 Steam world clock; never use a fixture date as today's date.
        let world_date = if process.layout.edition == 27 && process.native_plugin_hash.as_deref()
            .map(|hash| hash.eq_ignore_ascii_case("bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f")).unwrap_or(false) {
            process.read_u32(resolver.game_plugin.base + 0x56AD378)
                .filter(|raw| decode_fm_date(*raw).is_some()).map(normalize_fm_date)
        } else { None };
        let derived_year = world_date.and_then(decode_fm_date).map(|(year,_)| year)
            .unwrap_or_else(|| derive_game_year_from_candidates(player_candidates.values()));
        let mut players = HashMap::<u32, PlayerRecord>::with_capacity(selected_candidates.len());
        let mut person_to_uid = HashMap::<usize, u32>::with_capacity(selected_candidates.len() * 2);
        let mut selected_club_candidates = HashSet::<usize>::new();
        let mut read_cache = PlayerReadCache::default();

        for candidate in selected_candidates {
            if let Some(player) = read_player(
                &process,
                candidate.uid,
                candidate.person_address,
                candidate.player_address,
                candidate.ca,
                candidate.pa,
                &mut read_cache,
            ) {
                if let Some(club) = player.owner_club_address {
                    selected_club_candidates.insert(club);
                }
                person_to_uid.insert(candidate.person_address, candidate.uid);
                person_to_uid.insert(candidate.player_address, candidate.uid);
                players.insert(candidate.uid, player);
            }
        }

        let squad_links = if club_mode { SquadWalk::default() } else { walk_club_squads(
            &process,
            &selected_club_candidates,
            &person_to_uid,
        ) };

        for (uid, link) in &squad_links.player_links {
            if let Some(player) = players.get_mut(uid) {
                player.club = Some(link.club.clone());
                player.division = link.division.clone();
                player.team_type = Some(link.team_type);
                if link.club_reputation > 0 {
                    player.club_reputation = link.club_reputation;
                }
            }
        }

        let date_anchor = manager_team
            .and_then(|team| read_team_date_anchor(&process, team, derived_year))
            .or_else(|| choose_date_vote(&squad_links.date_votes, derived_year));
        let schedule_raw = date_anchor.as_ref().map(|anchor| anchor.raw);
        let monitor_candidates = world_date.map(|_| vec![DateCandidate {
            address: resolver.game_plugin.base + 0x56AD378,
            kind: DateCandidateKind::PackedFmDate, object_context: false, module_static: true,
        }]).unwrap_or_default();
        let game_date = world_date.and_then(format_fm_date);
        let game_date_source = if world_date.is_some() {"verified-fm27-world-clock"} else {"unavailable"}.to_string();
        if let (Some(raw),Some(date))=(world_date,game_date.clone()) {
            *monitor_slot().lock().map_err(|_| "Nie można monitorować daty gry.".to_string())? = Some(DateMonitor {
                pid,candidates:monitor_candidates.clone(),imported_raw:raw,imported_date:date,
                source:game_date_source.clone(),observed_current_raw:None,
            });
        }

        // Kotwica terminarza służy wyłącznie jako wewnętrzne przybliżenie wieku.
        // Nie pokazujemy jej jako daty świata gry, ponieważ może wskazywać datę
        // ostatniego lub następnego meczu.
        let current_raw = world_date.or(schedule_raw);
        let mut headers = table_headers();
        if club_mode { headers.push("Grupa klubowa".into()); }
        let mut rows = players
            .into_values()
            .map(|player| {
                let uid = player.uid;
                let mut row = player_to_row(player, current_raw, derived_year);
                attach_euro_rate(&mut row, euro_per_gbp);
                if club_mode {
                    row.insert("Klub".into(), managed_team.clone().unwrap_or_default());
                    row.insert("Grupa klubowa".into(), club_groups.get(&uid).cloned().unwrap_or_default());
                }
                row
            })
            .collect::<Vec<_>>();
        rows.sort_by(|left, right| {
            left.get("Nazwisko")
                .cmp(&right.get("Nazwisko"))
                .then_with(|| left.get("UID").cmp(&right.get("UID")))
        });

        let session_id = SCOUTING_SEQUENCE.fetch_add(1, Ordering::Relaxed) + 1;
        let own_uids = if club_mode { rows.iter().filter_map(|row| row.get("UID")?.parse::<u32>().ok()).collect() } else { HashSet::new() };
        *scouting_slot().lock().map_err(|_| "Nie można przygotować wyszukiwarki transferowej.".to_string())? = Some(ScoutingSession {
            session_id, pid, layout: process.layout, candidates: Arc::new(player_candidates.values().cloned().collect()),
            own_uids: Arc::new(own_uids), own_clubs: Arc::new(own_clubs), derived_year, game_date: world_date, euro_per_gbp, index: None,
        });
        let database = FmNativeDatabase {
            pid,
            managed_mode: if club_mode { "club".into() } else { "nation".into() },
            managed_club_uid,
            session_id,
            profile: process.layout.name.to_string(),
            database_player_count,
            player_count: rows.len(),
            managed_team,
            managed_nation: (!club_mode).then_some(managed_nation),
            managed_team_uid,
            managed_nation_uid,
            managed_squad_gender: managed_gender.map(|female| {
                if female {
                    "Kobiety".to_string()
                } else {
                    "Mężczyźni".to_string()
                }
            }),
            national_filter_applied: !club_mode,
            scan_region_count: if direct_registry { 0 } else { regions.len() },
            scanned_bytes,
            scan_duration_ms: started.elapsed().as_millis(),
            game_date,
            game_date_source,
            date_monitor_candidates: monitor_candidates.len(),
            headers,
            rows,
            class_offsets,
        };
        if let Some(created)=process.creation_time() {
            let manager_person=refresh_manager_person(&process,active_human_team.registry_slot,&human_managers,managed.team_address);
            let mut class_people=HashMap::new();
            for candidate in player_candidates.values() {
                class_people.entry(candidate.person_address-candidate.player_address).or_insert(candidate.person_address);
            }
            let player_classes=class_people.into_iter().filter_map(|(offset,person)|process.read_ptr(person).map(|vtable|(offset,vtable))).collect();
            let registry_signature = native_player_vector(&process,resolver.game_plugin.base);
            let registry_pointer_hash=registry_signature.and_then(|(begin,end)|process.read_exact(begin,end-begin)).map(|bytes|registry_pointer_hash(&bytes));
            let sources = currency_rates.euro.keys().chain(currency_rates.pound.keys()).filter_map(|uid| {
                let (record,table)=*currency_rates.sources.get(uid)?;
                Some((*uid,record,table,currency_rates.euro.contains_key(uid)))
            }).collect();
            *refresh_slot().lock().map_err(|_| "Nie można zapamiętać połączenia FM.".to_string())?=Some(RefreshSession {
                database:database.clone(), created, manager_person, native_plugin_hash:process.native_plugin_hash.clone(), player_classes, team:managed.team_address,
                nation:managed_nation_address, club:managed_club, plugin_base:resolver.game_plugin.base,
                registry_signature, registry_pointer_hash, currency_sources:sources,
            });
        }
        Ok(database)
    }

    fn validate_trial_native_layout(
        process: &RemoteProcess,
        candidates: &HashMap<u32, PlayerCandidate>,
    ) -> Result<(), String> {
        let mut sample = candidates.values().collect::<Vec<_>>();
        sample.sort_by_key(|candidate| candidate.uid);
        let mut valid = 0usize;
        let checked = sample.len().min(128);
        for candidate in sample.into_iter().take(checked) {
            let Some(player) = process.read_exact(candidate.player_address, PLAYER_OFFSET as usize) else {
                continue;
            };
            let positions = &player[PLAYER_POSITIONS..PLAYER_POSITIONS + POSITION_FIELDS.len()];
            let attributes = &player[PLAYER_ATTRIBUTES..PLAYER_ATTRIBUTES + 0x32];
            let named = looks_like_named_person(process, candidate.person_address);
            let birth = decode_fm_date(candidate.birth_raw).is_some();
            let nation = process.indirect_string(candidate.nation_address + NATION_NAME)
                .map(|name| plausible_label(&name, 80)).unwrap_or(false);
            if named && birth && nation && candidate.ca <= candidate.pa
                && positions.iter().all(|value| *value <= 20)
                && positions.contains(&20)
                && attributes.iter().all(|value| *value <= 100)
                && attributes.iter().filter(|value| **value > 0).count() >= 30 {
                valid += 1;
            }
        }
        if checked < 32 || valid * 100 < checked * 90 {
            return Err(format!(
                "Profil pamięci FM27: pola zawodników wymagają dalszej aktualizacji ({valid}/{checked} poprawnych rekordów próbnych). Nie zaimportowano danych."
            ));
        }
        Ok(())
    }

    fn read_player(
        process: &RemoteProcess,
        uid: u32,
        person_address: usize,
        player_address: usize,
        ca: u16,
        pa: u16,
        cache: &mut PlayerReadCache,
    ) -> Option<PlayerRecord> {
        let person = process.read_exact(person_address, 0xB0)?;
        let player = process.read_exact(player_address, 0x270)?;

        let first_name = nested_string_from_block(
            process,
            &person,
            PERSON_FIRST_NAME,
        );
        let last_name = nested_string_from_block(process, &person, PERSON_LAST_NAME);
        let common_name = nested_string_from_block(process, &person, PERSON_COMMON_NAME);
        let full_name = [first_name.as_deref(), last_name.as_deref()]
            .into_iter()
            .flatten()
            .filter(|part| !part.trim().is_empty())
            .collect::<Vec<_>>()
            .join(" ");
        let display_name = common_name
            .filter(|name| !name.trim().is_empty())
            .or_else(|| (!full_name.is_empty()).then_some(full_name))
            .unwrap_or_else(|| format!("UID {uid}"));

        let nation_address = read_u64(&person, PERSON_NATION).unwrap_or(0) as usize;
        let nationality = if nation_address == 0 {
            None
        } else {
            cached_nation_name(process, nation_address, cache)
        };

        let mut attributes = BTreeMap::new();
        for (name, offset) in PLAYER_ATTRIBUTE_FIELDS {
            attributes.insert(
                name.to_string(),
                decode_attribute(*player.get(PLAYER_ATTRIBUTES + offset).unwrap_or(&0)),
            );
        }

        let mut hidden = BTreeMap::new();
        for (name, offset) in PLAYER_HIDDEN_FIELDS {
            hidden.insert(
                name.to_string(),
                decode_attribute(*player.get(PLAYER_ATTRIBUTES + offset).unwrap_or(&0)),
            );
        }

        let mut personality = BTreeMap::new();
        for (name, offset) in PERSONALITY_FIELDS {
            let value = *person.get(offset).unwrap_or(&0);
            personality.insert(name.to_string(), valid_twenty(value));
        }

        let mut positions = BTreeMap::new();
        for (short_name, _, offset) in POSITION_FIELDS {
            positions.insert(
                short_name.to_string(),
                *player.get(PLAYER_POSITIONS + offset).unwrap_or(&0),
            );
        }

        let contract_address = read_u64(&person, PERSON_CONTRACT).unwrap_or(0) as usize;
        let contract = (contract_address != 0)
            .then(|| process.read_exact(contract_address, 0x60))
            .flatten();
        let contract_team = contract
            .as_deref()
            .and_then(|bytes| read_u64(bytes, CONTRACT_TEAM))
            .filter(|value| *value != 0)
            .map(|value| value as usize);
        let team_details = contract_team.map(|team| cached_team_details(process, team, cache));
        let owner_club_address = team_details
            .as_ref()
            .and_then(|details| details.owner_club_address);
        let owner_club = team_details
            .as_ref()
            .and_then(|details| details.owner_club.clone());
        let current_team = read_u64(&player, 0x130).filter(|team| *team >= 0x10_000).map(|team| cached_team_details(process, team as usize, cache));
        let current_details = current_team.as_ref().filter(|details| details.owner_club.is_some()).or(team_details.as_ref());
        let division = current_details
            .and_then(|details| details.division.clone());
        let club_reputation = team_details
            .as_ref()
            .map(|details| details.club_reputation)
            .unwrap_or(0);
        let status = contract
            .as_deref()
            .and_then(|bytes| bytes.get(CONTRACT_STATUS))
            .copied()
            .unwrap_or(0);

        Some(PlayerRecord {
            uid,
            first_name,
            last_name,
            display_name,
            female: person
                .get(PERSON_GENDER)
                .map(|value| value & GENDER_FEMALE_BIT != 0)
                .unwrap_or(false),
            birth_raw: read_u32(&person, PERSON_DOB).unwrap_or(0),
            nationality,
            club: current_details.and_then(|details| details.owner_club.clone()),
            owner_club,
            division,
            team_type: None,
            club_reputation,
            ca,
            pa,
            home_reputation: read_u16(&player, PLAYER_HOME_REP).unwrap_or(0),
            current_reputation: read_u16(&player, PLAYER_CURRENT_REP).unwrap_or(0),
            world_reputation: read_u16(&player, PLAYER_WORLD_REP).unwrap_or(0),
            condition: read_u16(&player, PLAYER_CONDITION).unwrap_or(0),
            morale: *player.get(PLAYER_MORALE).unwrap_or(&0),
            height: read_u16(&player, PLAYER_HEIGHT)
                .filter(|value| (130..=230).contains(value))
                .unwrap_or(0),
            value: money_value(read_u32(&player, PLAYER_VALUE).unwrap_or(u32::MAX)),
            asking_price: money(read_u32(&player, PLAYER_ASKING_PRICE).unwrap_or(u32::MAX)),
            wage: contract
                .as_deref()
                .and_then(|bytes| read_u32(bytes, CONTRACT_WAGE))
                .and_then(money),
            contract_expiry: contract
                .as_deref()
                .and_then(|bytes| read_u32(bytes, CONTRACT_EXPIRY))
                .and_then(format_fm_date),
            squad_number: contract
                .as_deref()
                .and_then(|bytes| bytes.get(CONTRACT_SQUAD_NUMBER))
                .copied()
                .filter(|value| *value > 0 && *value < 100),
            listed: status & 0x01 != 0 || status & 0x08 != 0,
            not_for_sale: status & 0x10 != 0,
            set_for_release: status & 0x20 != 0,
            positions,
            attributes,
            hidden,
            personality,
            left_foot: decode_attribute(*player.get(PLAYER_ATTRIBUTES + FOOT_LEFT).unwrap_or(&0)),
            right_foot: decode_attribute(*player.get(PLAYER_ATTRIBUTES + FOOT_RIGHT).unwrap_or(&0)),
            owner_club_address,
        })
    }

    fn cached_nation_name(
        process: &RemoteProcess,
        nation_address: usize,
        cache: &mut PlayerReadCache,
    ) -> Option<String> {
        if let Some(cached) = cache.nation_names.get(&nation_address) {
            return cached.clone();
        }
        let value = nation_name(process, nation_address);
        cache.nation_names.insert(nation_address, value.clone());
        value
    }

    fn cached_team_details(
        process: &RemoteProcess,
        team: usize,
        cache: &mut PlayerReadCache,
    ) -> CachedTeamDetails {
        if let Some(cached) = cache.team_details.get(&team) {
            return cached.clone();
        }
        let owner_club_address = process
            .read_ptr(team + TEAM_CLUB)
            .filter(|address| *address != 0);
        let details = CachedTeamDetails {
            owner_club_address,
            owner_club: owner_club_address.and_then(|club| club_name(process, club)),
            division: competition_name(process, team),
            club_reputation: process
                .read_u16(team + TEAM_REPUTATION)
                .filter(|value| *value <= 12_000)
                .unwrap_or(0),
        };
        cache.team_details.insert(team, details.clone());
        details
    }

    fn nested_string_from_block(
        process: &RemoteProcess,
        bytes: &[u8],
        offset: usize,
    ) -> Option<String> {
        let pointer = read_u64(bytes, offset)? as usize;
        let inner = process.read_ptr(pointer)?;
        process.read_c_string(inner.saturating_add(4), 160)
    }

    #[derive(Default)]
    struct SquadWalk {
        player_links: HashMap<u32, SquadLink>,
        date_votes: HashMap<u32, usize>,
    }

    struct SquadLink {
        club: String,
        division: Option<String>,
        team_type: u8,
        club_reputation: u16,
    }

    fn walk_club_squads(
        process: &RemoteProcess,
        clubs: &HashSet<usize>,
        person_to_uid: &HashMap<usize, u32>,
    ) -> SquadWalk {
        let mut result = SquadWalk::default();

        for &club_address in clubs {
            let Some(club) = club_name(process, club_address) else {
                continue;
            };
            let Some(begin) = process.read_ptr(club_address + 0x18) else {
                continue;
            };
            let Some(end) = process.read_ptr(club_address + 0x20) else {
                continue;
            };
            if end <= begin || (end - begin) % 8 != 0 {
                continue;
            }
            let team_count = (end - begin) / 8;
            if !(1..=64).contains(&team_count) {
                continue;
            }

            for index in 0..team_count {
                let Some(team) = process.read_ptr(begin + index * 8).filter(|value| *value != 0)
                else {
                    continue;
                };
                let team_type = process.read_u8(team + 0x28).unwrap_or(u8::MAX);
                let club_reputation = process
                    .read_u16(team + TEAM_REPUTATION)
                    .filter(|value| *value <= 12_000)
                    .unwrap_or(0);
                let division = competition_name(process, team);

                collect_team_date_votes(process, team, &mut result.date_votes);

                let Some(players_begin) = process.read_ptr(team + 0x38) else {
                    continue;
                };
                let Some(players_end) = process.read_ptr(team + 0x40) else {
                    continue;
                };
                if players_end <= players_begin || (players_end - players_begin) % 8 != 0 {
                    continue;
                }
                let player_count = (players_end - players_begin) / 8;
                if player_count > 200 {
                    continue;
                }

                for player_index in 0..player_count {
                    let Some(entry) = process
                        .read_ptr(players_begin + player_index * 8)
                        .filter(|value| *value != 0)
                    else {
                        continue;
                    };
                    let uid = person_to_uid.get(&entry).copied().or_else(|| {
                        (0..=0x80).step_by(8).find_map(|offset| {
                            let pointer = process.read_ptr(entry + offset)?;
                            person_to_uid.get(&pointer).copied()
                        })
                    });
                    let Some(uid) = uid else {
                        continue;
                    };

                    let replace = result
                        .player_links
                        .get(&uid)
                        .map(|current| team_type < current.team_type)
                        .unwrap_or(true);
                    if replace {
                        result.player_links.insert(
                            uid,
                            SquadLink {
                                club: club.clone(),
                                division: division.clone(),
                                team_type,
                                club_reputation,
                            },
                        );
                    }
                }
            }
        }

        result
    }

    fn collect_team_date_votes(
        process: &RemoteProcess,
        team: usize,
        votes: &mut HashMap<u32, usize>,
    ) {
        let Some(schedule) = process.read_ptr(team + TEAM_SCHEDULE).filter(|value| *value != 0)
        else {
            return;
        };
        for offset in SCHEDULE_DATE {
            let Some(raw) = process.read_u32(schedule + offset) else {
                continue;
            };
            if decode_fm_date(raw).is_some() {
                *votes.entry(normalize_fm_date(raw)).or_default() += 1;
                break;
            }
        }
    }

    struct DateAnchor {
        raw: u32,
    }

    fn read_team_date_anchor(
        process: &RemoteProcess,
        team: usize,
        expected_year: i32,
    ) -> Option<DateAnchor> {
        let schedule = process.read_ptr(team + TEAM_SCHEDULE)?;
        for offset in SCHEDULE_DATE {
            let address = schedule.saturating_add(offset);
            let Some(raw) = process.read_u32(address) else {
                continue;
            };
            let Some((year, _)) = decode_fm_date(raw) else {
                continue;
            };
            if (expected_year - 1..=expected_year + 1).contains(&year) {
                return Some(DateAnchor {
                    raw: normalize_fm_date(raw),
                });
            }
        }
        None
    }

    fn choose_date_vote(votes: &HashMap<u32, usize>, expected_year: i32) -> Option<DateAnchor> {
        votes
            .iter()
            .filter_map(|(raw, count)| {
                let (year, _) = decode_fm_date(*raw)?;
                (expected_year - 1..=expected_year + 1)
                    .contains(&year)
                    .then_some((*raw, *count))
            })
            .max_by_key(|(_, count)| *count)
            .map(|(raw, _)| DateAnchor { raw })
    }

    fn read_date_candidate(
        process: &RemoteProcess,
        candidate: DateCandidate,
        expected_year: i32,
    ) -> Option<u32> {
        match candidate.kind {
            DateCandidateKind::PackedFmDate => process
                .read_u32(candidate.address)
                .filter(|raw| decode_fm_date(*raw).is_some())
                .map(normalize_fm_date),
            DateCandidateKind::DotNetTicks => process
                .read_u64(candidate.address)
                .and_then(|value| fm_date_from_dotnet_ticks(value, expected_year)),
        }
    }

    fn observe_monitor_date(
        process: &RemoteProcess,
        monitor: &DateMonitor,
    ) -> (usize, Option<u32>) {
        if monitor.source == "verified-fm27-world-clock" && monitor.candidates.len() == 1 {
            let raw = read_date_candidate(process, monitor.candidates[0], 2026);
            return (usize::from(raw.is_some()), raw.filter(|raw| *raw != monitor.imported_raw));
        }
        let expected_year = decode_fm_date(monitor.imported_raw)
            .map(|(year, _)| year)
            .unwrap_or(2026);
        let mut readable = 0usize;
        let mut votes = HashMap::<u32, usize>::new();

        for candidate in &monitor.candidates {
            let Some(raw) = read_date_candidate(process, *candidate, expected_year) else {
                continue;
            };
            readable += 1;
            if raw == monitor.imported_raw {
                continue;
            }
            let Some(distance) = date_distance_days(monitor.imported_raw, raw) else {
                continue;
            };
            if !(-14..=31).contains(&distance) || distance == 0 {
                continue;
            }
            let weight = if candidate.module_static {
                6
            } else {
                match (candidate.object_context, candidate.kind) {
                    (true, DateCandidateKind::DotNetTicks) => 4,
                    (true, DateCandidateKind::PackedFmDate) => 3,
                    (false, DateCandidateKind::DotNetTicks) => 2,
                    (false, DateCandidateKind::PackedFmDate) => 1,
                }
            };
            *votes.entry(raw).or_default() += weight;
        }

        let changed = votes
            .into_iter()
            .max_by_key(|(_, weight)| *weight)
            .and_then(|(raw, weight)| {
                let distance = date_distance_days(monitor.imported_raw, raw)?;
                (distance.abs() == 1 || weight >= 2).then_some(raw)
            });

        (readable, changed)
    }

    pub(super) fn read_date_status() -> FmDateStatus {
        let monitor = monitor_slot()
            .lock()
            .ok()
            .and_then(|guard| guard.clone());
        let Some(monitor) = monitor else {
            return FmDateStatus {
                process_detected: detect_football_manager().detected,
                available: false,
                imported_date: None,
                current_date: None,
                data_stale: false,
                source: "unavailable".to_string(),
                candidate_count: 0,
                error: None,
            };
        };

        let detected = detect_football_manager();
        if !detected.detected || detected.pid != Some(monitor.pid) {
            return FmDateStatus {
                process_detected: false,
                available: false,
                imported_date: Some(monitor.imported_date),
                current_date: None,
                data_stale: monitor.observed_current_raw.is_some(),
                source: monitor.source,
                candidate_count: monitor.candidates.len(),
                error: Some("Proces FM użyty do importu nie jest już uruchomiony.".to_string()),
            };
        }

        let process = match RemoteProcess::open(monitor.pid) {
            Ok(process) => process,
            Err(error) => {
                return FmDateStatus {
                    process_detected: true,
                    available: false,
                    imported_date: Some(monitor.imported_date),
                    current_date: None,
                    data_stale: monitor.observed_current_raw.is_some(),
                    source: monitor.source,
                    candidate_count: monitor.candidates.len(),
                    error: Some(error),
                }
            }
        };

        if monitor.candidates.is_empty() {
            return FmDateStatus {
                process_detected: true,
                available: false,
                imported_date: Some(monitor.imported_date),
                current_date: monitor.observed_current_raw.and_then(format_fm_date),
                data_stale: monitor.observed_current_raw.is_some(),
                source: monitor.source,
                candidate_count: 0,
                error: Some(
                    "Nie znaleziono jeszcze stabilnego punktu dokładnej daty w pamięci FM."
                        .to_string(),
                ),
            };
        }

        let (readable, changed_raw) = observe_monitor_date(&process, &monitor);
        let current_raw = changed_raw
            .or(monitor.observed_current_raw)
            .unwrap_or(monitor.imported_raw);
        if let Some(observed) = changed_raw {
            if let Ok(mut guard) = monitor_slot().lock() {
                if let Some(active) = guard.as_mut() {
                    if active.pid == monitor.pid && active.imported_raw == monitor.imported_raw {
                        active.observed_current_raw = Some(observed);
                    }
                }
            }
        }

        if readable == 0 {
            return FmDateStatus {
                process_detected: true,
                available: false,
                imported_date: Some(monitor.imported_date),
                current_date: format_fm_date(current_raw),
                data_stale: current_raw != monitor.imported_raw,
                source: monitor.source,
                candidate_count: monitor.candidates.len(),
                error: Some("Punkty monitora daty nie są już czytelne.".to_string()),
            };
        }

        FmDateStatus {
            process_detected: true,
            available: true,
            imported_date: Some(monitor.imported_date),
            current_date: format_fm_date(current_raw),
            data_stale: current_raw != monitor.imported_raw,
            source: monitor.source,
            candidate_count: monitor.candidates.len(),
            error: None,
        }
    }

    fn player_to_row(player: PlayerRecord, game_date: Option<u32>, derived_year: i32) -> FmTableRow {
        let mut row = FmTableRow::new();
        row.insert("UID".to_string(), player.uid.to_string());
        row.insert("Nazwisko".to_string(), player.display_name);
        row.insert("Imię".to_string(), player.first_name.unwrap_or_default());
        row.insert("Nazwisko rodowe".to_string(), player.last_name.unwrap_or_default());
        row.insert(
            "Płeć".to_string(),
            if player.female { "Kobieta" } else { "Mężczyzna" }.to_string(),
        );
        row.insert(
            "Data urodzenia".to_string(),
            format_fm_date(player.birth_raw).unwrap_or_default(),
        );
        row.insert(
            "Wiek".to_string(),
            age_at(player.birth_raw, game_date, derived_year)
                .map(|age| age.to_string())
                .unwrap_or_default(),
        );
        row.insert(
            "Narodowość".to_string(),
            player.nationality.unwrap_or_default(),
        );
        row.insert("Klub".to_string(), player.club.unwrap_or_default());
        row.insert(
            "Klub macierzysty".to_string(),
            player.owner_club.unwrap_or_default(),
        );
        row.insert("Liga".to_string(), player.division.unwrap_or_default());
        row.insert(
            "Zespół".to_string(),
            player
                .team_type
                .map(team_type_label)
                .unwrap_or_default()
                .to_string(),
        );

        let position = preferred_positions(&player.positions);
        row.insert("Pozycja".to_string(), position);
        for (short_name, column, _) in POSITION_FIELDS {
            row.insert(
                column.to_string(),
                player.positions.get(short_name).copied().unwrap_or(0).to_string(),
            );
        }

        row.insert("OU".to_string(), player.ca.to_string());
        row.insert("PA".to_string(), player.pa.to_string());
        row.insert(
            "Reputacja w ojczyźnie".to_string(),
            player.home_reputation.to_string(),
        );
        row.insert(
            "Reputacja".to_string(),
            player.current_reputation.to_string(),
        );
        row.insert(
            "Reputacja na świecie".to_string(),
            player.world_reputation.to_string(),
        );
        row.insert(
            "Reputacja klubu".to_string(),
            player.club_reputation.to_string(),
        );
        row.insert(
            "Kondycja".to_string(),
            format_condition(player.condition),
        );
        row.insert("Morale".to_string(), player.morale.to_string());
        row.insert(
            "Wzrost".to_string(),
            (player.height > 0)
                .then(|| player.height.to_string())
                .unwrap_or_default(),
        );
        row.insert("Lewa noga".to_string(), foot_label(player.left_foot).to_string());
        row.insert("Prawa noga".to_string(), foot_label(player.right_foot).to_string());
        row.insert(
            "Lewa noga (wartość)".to_string(),
            player.left_foot.to_string(),
        );
        row.insert(
            "Prawa noga (wartość)".to_string(),
            player.right_foot.to_string(),
        );
        row.insert(
            "Wartość".to_string(),
            player.value.map(|value| value.to_string()).unwrap_or_default(),
        );
        row.insert(
            "Cena wywoławcza".to_string(),
            player
                .asking_price
                .map(|value| value.to_string())
                .unwrap_or_default(),
        );
        row.insert(
            "Pensja".to_string(),
            player.wage.map(|value| value.to_string()).unwrap_or_default(),
        );
        row.insert(
            "Koniec kontraktu".to_string(),
            player.contract_expiry.unwrap_or_default(),
        );
        row.insert(
            "Numer w składzie".to_string(),
            player
                .squad_number
                .map(|value| value.to_string())
                .unwrap_or_default(),
        );
        row.insert("Na liście transferowej".to_string(), yes_no(player.listed));
        row.insert("Nie na sprzedaż".to_string(), yes_no(player.not_for_sale));
        row.insert("Do zwolnienia".to_string(), yes_no(player.set_for_release));

        for (name, value) in player.attributes {
            row.insert(name, value.to_string());
        }
        for (name, value) in player.hidden {
            row.insert(name, value.to_string());
        }
        for (name, value) in player.personality {
            row.insert(name, value.to_string());
        }

        row
    }

    fn table_headers() -> Vec<String> {
        let mut headers = [
            "UID",
            "Nazwisko",
            "Imię",
            "Nazwisko rodowe",
            "Płeć",
            "Data urodzenia",
            "Wiek",
            "Narodowość",
            "Klub",
            "Klub macierzysty",
            "Liga",
            "Zespół",
            "Pozycja",
            "OU",
            "PA",
            "Reputacja w ojczyźnie",
            "Reputacja",
            "Reputacja na świecie",
            "Reputacja klubu",
            "Kondycja",
            "Morale",
            "Wzrost",
            "Lewa noga",
            "Prawa noga",
            "Lewa noga (wartość)",
            "Prawa noga (wartość)",
            "Wartość",
            "Cena wywoławcza",
            "Pensja",
            "Koniec kontraktu",
            "Numer w składzie",
            "Na liście transferowej",
            "Nie na sprzedaż",
            "Do zwolnienia",
        ]
        .into_iter()
        .map(str::to_string)
        .collect::<Vec<_>>();

        headers.extend(
            POSITION_FIELDS
                .into_iter()
                .map(|(_, column, _)| column.to_string()),
        );
        headers.extend(
            PLAYER_ATTRIBUTE_FIELDS
                .into_iter()
                .map(|(name, _)| name.to_string()),
        );
        headers.extend(
            PLAYER_HIDDEN_FIELDS
                .into_iter()
                .map(|(name, _)| name.to_string()),
        );
        headers.extend(
            PERSONALITY_FIELDS
                .into_iter()
                .map(|(name, _)| name.to_string()),
        );
        headers
    }

    fn top_class_offsets(histogram: &HashMap<i32, u64>) -> Vec<FmClassOffsetStat> {
        let mut values = histogram
            .iter()
            .map(|(offset, count)| FmClassOffsetStat {
                offset: format!("0x{offset:X}"),
                count: *count,
            })
            .collect::<Vec<_>>();
        values.sort_by(|left, right| right.count.cmp(&left.count));
        values.truncate(16);
        values
    }

    fn parse_hex_address(value: &str) -> Option<usize> {
        usize::from_str_radix(
            value.trim_start_matches("0x").trim_start_matches("0X"),
            16,
        )
        .ok()
    }

    fn read_u16(bytes: &[u8], offset: usize) -> Option<u16> {
        let value = bytes.get(offset..offset + 2)?;
        Some(u16::from_le_bytes([value[0], value[1]]))
    }

    fn read_u32(bytes: &[u8], offset: usize) -> Option<u32> {
        let value = bytes.get(offset..offset + 4)?;
        Some(u32::from_le_bytes([value[0], value[1], value[2], value[3]]))
    }

    fn read_i32(bytes: &[u8], offset: usize) -> Option<i32> {
        let value = bytes.get(offset..offset + 4)?;
        Some(i32::from_le_bytes([value[0], value[1], value[2], value[3]]))
    }

    fn read_u64(bytes: &[u8], offset: usize) -> Option<u64> {
        let value = bytes.get(offset..offset + 8)?;
        Some(u64::from_le_bytes([
            value[0], value[1], value[2], value[3], value[4], value[5], value[6], value[7],
        ]))
    }

    fn decode_attribute(raw: u8) -> u8 {
        ((u16::from(raw) + 2) / 5).min(20) as u8
    }

    fn valid_twenty(raw: u8) -> u8 {
        (1..=20).contains(&raw).then_some(raw).unwrap_or(0)
    }

    fn money(raw: u32) -> Option<u32> {
        (raw != u32::MAX).then_some(raw)
    }

    fn money_value(raw: u32) -> Option<u32> {
        (raw != u32::MAX && raw != 300_000_000).then_some(raw)
    }

    fn contract_team(process: &RemoteProcess, person: usize) -> Option<usize> {
        let contract = process.read_ptr(person + PERSON_CONTRACT)?;
        process.read_ptr(contract + CONTRACT_TEAM).filter(|team| *team != 0)
    }

    fn looks_like_named_person(process: &RemoteProcess, person: usize) -> bool {
        [PERSON_FIRST_NAME, PERSON_LAST_NAME, PERSON_COMMON_NAME]
            .into_iter()
            .any(|offset| {
                process
                    .nested_string(person + offset)
                    .map(|name| plausible_label(&name, 80))
                    .unwrap_or(false)
            })
    }

    fn collect_human_context_candidates(
        buffer: &[u8],
        scan_size: usize,
        chunk_address: usize,
        regions: &[(usize, usize)],
        resolver: &MetaResolver,
        binding_candidates: &mut HashSet<usize>,
        context_candidates: &mut HashSet<HumanContextCandidate>,
        layout: &FmLayout,
    ) {
        for job_state in [
            HUMAN_JOB_NATION_MANAGER,
            HUMAN_JOB_CLUB_MANAGER,
            HUMAN_JOB_UNEMPLOYED,
        ] {
            let needle = job_state.to_le_bytes();
            for state_local in memmem::find_iter(buffer, &needle) {
                for (binding_offset, state_offset) in layout.human_contexts {
                    let Some(local) = state_local.checked_sub(state_offset) else {
                        continue;
                    };
                    if local >= scan_size
                        || chunk_address.saturating_add(local) % 8 != 0
                    {
                        continue;
                    }
                    let object_type = read_u64(buffer, local)
                        .map(|value| value as usize)
                        .unwrap_or(0);
                    if !pointer_in_regions(object_type, regions)
                        && !resolver.is_module_pointer(object_type)
                    {
                        continue;
                    }
                    let Some(binding_address) = read_u64(
                        buffer,
                        local.saturating_add(binding_offset),
                    )
                    .map(|value| value as usize)
                    .filter(|value| pointer_in_regions(*value, regions))
                    else {
                        continue;
                    };

                    let object_address = chunk_address.saturating_add(local);
                    binding_candidates.insert(binding_address);
                    context_candidates.insert(HumanContextCandidate {
                        object_address,
                        binding_address,
                        job_state,
                    });
                }
            }
        }
    }

    fn collect_human_binding_candidate(
        buffer: &[u8],
        local: usize,
        chunk_address: usize,
        regions: &[(usize, usize)],
        binding_candidates: &mut HashSet<usize>,
        layout: &FmLayout,
    ) {
        let object_address = chunk_address.saturating_add(local);

        let root = read_u64(buffer, local.saturating_add(layout.binding_root))
            .map(|value| value as usize)
            .unwrap_or(0);
        let nodes = read_u64(buffer, local.saturating_add(layout.binding_nodes))
            .map(|value| value as usize)
            .unwrap_or(0);
        let data = read_u64(buffer, local.saturating_add(layout.binding_data))
            .map(|value| value as usize)
            .unwrap_or(0);
        if pointer_in_regions(root, regions)
            && pointer_in_regions(nodes, regions)
            && pointer_in_regions(data, regions)
        {
            binding_candidates.insert(object_address);
        }
    }

    fn validated_human_context(process: &RemoteProcess, context: &HumanContextCandidate) -> bool {
        // Il2CppClass's always-valid x64 prefix: image, gc_desc, name, namespaze.
        // Match the exact types extracted from this edition's managed metadata.
        let Some(class) = process.read_ptr(context.object_address) else { return false; };
        let Some(name) = process.read_ptr(class + 0x10).and_then(|pointer| process.read_c_string(pointer, 96)) else { return false; };
        let Some(namespace_pointer) = process.read_ptr(class + 0x18) else { return false; };
        let namespace = match process.read_u8(namespace_pointer) {
            Some(0) => String::new(),
            Some(_) => match process.read_c_string(namespace_pointer, 96) { Some(value) => value, None => return false },
            None => return false,
        };
        crate::fm_human::context_matches(&name, &namespace, &process.layout.human_contexts,
            |offset| process.read_ptr(context.object_address + offset),
            |offset| process.read_u32(context.object_address + offset),
            context.binding_address, context.job_state)
    }

    fn resolve_human_team_binding(
        process: &RemoteProcess,
        regions: &[(usize, usize)],
        binding_candidates: &HashSet<usize>,
        context_candidates: &HashSet<HumanContextCandidate>,
        known_team_uids: &HashSet<u32>,
    ) -> (Option<HumanBindingResolution>, HumanBindingDiagnostics) {
        let mut diagnostics = HumanBindingDiagnostics {
            context_candidate_count: context_candidates.len(),
            known_team_uid_count: known_team_uids.len(),
            ..HumanBindingDiagnostics::default()
        };
        let mut bindings = binding_candidates.clone();
        bindings.extend(
            context_candidates
                .iter()
                .map(|candidate| candidate.binding_address),
        );
        diagnostics.binding_candidate_count = bindings.len();

        let mut decoded = Vec::<(HumanBindingResolution, usize)>::new();
        for binding in bindings {
            if !pointer_in_regions(binding, regions) {
                continue;
            }
            let Some(root) = process
                .read_ptr(binding + process.layout.binding_root)
                .filter(|value| pointer_in_regions(*value, regions))
            else {
                continue;
            };
            let valid_root = process
                .read_ptr(root + BINDING_NODE_BINDINGS)
                .map(|owner| owner == binding)
                .unwrap_or(false);
            let valid_nodes = process
                .read_ptr(binding + process.layout.binding_nodes)
                .map(|value| pointer_in_regions(value, regions))
                .unwrap_or(false);
            let valid_data = process
                .read_ptr(binding + process.layout.binding_data)
                .map(|value| pointer_in_regions(value, regions))
                .unwrap_or(false);
            if !valid_root || !valid_nodes || !valid_data {
                continue;
            }
            diagnostics.validated_binding_count += 1;

            let Some(human_team_node) = find_binding_node(process, binding, "humanTeam")
            else {
                continue;
            };
            diagnostics.human_team_node_count += 1;
            let Some(human_team_reference) = binding_node_human_team_reference(
                process,
                regions,
                binding,
                human_team_node,
                known_team_uids,
                &mut diagnostics,
            )
            else {
                continue;
            };
            diagnostics.decoded_uid_count += 1;

            // The heap scan finds numeric patterns, including overlapping views of
            // unrelated objects. Only a typed context may vote on the active job.
            let matching_contexts = context_candidates.iter().filter(|candidate| candidate.binding_address == binding).collect::<Vec<_>>();
            let contexts = matching_contexts.iter().copied()
                .filter(|candidate| validated_human_context(process, candidate)).collect::<Vec<_>>();
            diagnostics.validated_context_count += contexts.len();
            diagnostics.rejected_context_count += matching_contexts.len() - contexts.len();
            if contexts.is_empty() { continue; }
            let nation_manager_evidence = contexts
                .iter()
                .filter(|candidate| {
                    candidate.binding_address == binding
                        && candidate.job_state == HUMAN_JOB_NATION_MANAGER
                })
                .count();
            let club_manager_evidence = contexts.iter().filter(|candidate| {
                candidate.binding_address == binding && candidate.job_state == HUMAN_JOB_CLUB_MANAGER
            }).count();
            let other_job_evidence = contexts
                .iter()
                .filter(|candidate| {
                    candidate.binding_address == binding
                        && matches!(
                            candidate.job_state,
                            HUMAN_JOB_CLUB_MANAGER | HUMAN_JOB_UNEMPLOYED
                        )
                })
                .count();
            diagnostics.nation_manager_context_count += nation_manager_evidence;
            diagnostics.other_job_context_count += other_job_evidence;
            decoded.push((
                HumanBindingResolution {
                    human_team_uid: human_team_reference.human_team_uid,
                    database_index: human_team_reference.database_index,
                    database_type: human_team_reference.database_type,
                    nation_manager_evidence,
                    club_manager_evidence,
                },
                other_job_evidence,
            ));
        }

        let has_nation_context = decoded
            .iter()
            .any(|(candidate, _)| candidate.nation_manager_evidence > 0);
        if has_nation_context && decoded.iter().any(|(candidate, _)| candidate.club_manager_evidence > 0) {
            return (None, diagnostics);
        }
        let mut eligible = decoded
            .into_iter()
            .filter(|(candidate, other_job_evidence)| {
                if candidate.nation_manager_evidence > 0 && candidate.club_manager_evidence > 0 {
                    false
                } else if has_nation_context {
                    candidate.nation_manager_evidence > 0
                } else {
                    candidate.club_manager_evidence > 0 || *other_job_evidence == 0
                }
            })
            .collect::<Vec<_>>();
        if eligible.is_empty() {
            return (None, diagnostics);
        }
        let expected_reference = (
            eligible[0].0.database_type,
            eligible[0].0.database_index,
            eligible[0].0.human_team_uid,
        );
        if eligible
            .iter()
            .any(|(candidate, _)| {
                (
                    candidate.database_type,
                    candidate.database_index,
                    candidate.human_team_uid,
                ) != expected_reference
            })
        {
            return (None, diagnostics);
        }
        eligible.sort_by(|left, right| {
            right
                .0
                .nation_manager_evidence
                .cmp(&left.0.nation_manager_evidence)
        });
        (eligible.first().map(|candidate| candidate.0), diagnostics)
    }

    fn find_binding_node(
        process: &RemoteProcess,
        binding: usize,
        expected_name: &str,
    ) -> Option<usize> {
        let root = process.read_ptr(binding + process.layout.binding_root)?;
        let mut queue = VecDeque::<usize>::from([root]);
        let mut visited = HashSet::<usize>::new();

        while let Some(node) = queue.pop_front() {
            if node < 0x10_000
                || visited.len() >= MAX_BINDING_NODES
                || !visited.insert(node)
            {
                continue;
            }
            if process.read_ptr(node + BINDING_NODE_BINDINGS) != Some(binding) {
                continue;
            }
            let node_name = process
                .read_ptr(node + BINDING_NODE_NAME)
                .and_then(|address| read_managed_string(process, address, 96));
            if node_name
                .as_deref()
                .map(|name| name.eq_ignore_ascii_case(expected_name))
                .unwrap_or(false)
            {
                return Some(node);
            }

            if let Some(child) = process
                .read_ptr(node + BINDING_NODE_FIRST_CHILD)
                .filter(|value| *value >= 0x10_000)
            {
                queue.push_back(child);
            }
            if let Some(sibling) = process
                .read_ptr(node + BINDING_NODE_NEXT_SIBLING)
                .filter(|value| *value >= 0x10_000)
            {
                queue.push_back(sibling);
            }
        }
        None
    }

    fn read_managed_string(
        process: &RemoteProcess,
        address: usize,
        max_characters: usize,
    ) -> Option<String> {
        let length = process.read_u32(address + 0x10)? as usize;
        if length == 0 || length > max_characters {
            return None;
        }
        let bytes = process.read_exact(address + 0x14, length.checked_mul(2)?)?;
        let utf16 = bytes
            .chunks_exact(2)
            .map(|pair| u16::from_le_bytes([pair[0], pair[1]]))
            .collect::<Vec<_>>();
        String::from_utf16(&utf16).ok()
    }

    fn binding_node_human_team_reference(
        process: &RemoteProcess,
        regions: &[(usize, usize)],
        binding: usize,
        node: usize,
        known_team_uids: &HashSet<u32>,
        diagnostics: &mut HumanBindingDiagnostics,
    ) -> Option<HumanTeamReference> {
        let data_key = process.read_u64(node + BINDING_NODE_DATA_KEY)?;
        let raw_index = (data_key & u64::from(u32::MAX)) as usize;
        let data_list = process.read_ptr(binding + process.layout.binding_data)?;
        let data_size = process.read_u32(data_list + MANAGED_LIST_SIZE)? as usize;
        if data_size == 0 || data_size > MAX_BINDING_NODES * 4 {
            return None;
        }

        let mut exact_indices = Vec::<usize>::new();

        // DataKey is a packed 64-bit value: the low 32 bits are the list index
        // and the high bits are the slot version. Prefer equality of the whole
        // key so a recycled slot can never make humanTeam resolve to a nearby,
        // unrelated binding value.
        for index in 0..data_size {
            let Some(data) = managed_list_reference(process, data_list, index) else {
                continue;
            };
            if process.read_u64(data + 0x10) == Some(data_key) {
                exact_indices.push(index);
            }
        }
        let mut indices = if exact_indices.is_empty() && raw_index < data_size {
            Vec::<usize>::from([raw_index])
        } else {
            exact_indices
        };
        indices.sort_unstable();
        indices.dedup();

        let mut decoded_uids = HashSet::<u32>::new();
        let mut database_references = HashSet::<(u32, u32)>::new();

        for index in indices {
            let Some(data) = managed_list_reference(process, data_list, index) else {
                continue;
            };
            diagnostics.matched_data_count += 1;
            let Some(typed_value) = process
                .read_ptr(data + BINDING_DATA_VALUE)
                .filter(|value| pointer_in_regions(*value, regions))
            else {
                continue;
            };
            diagnostics.typed_value_count += 1;

            let direct_candidates = typed_value_uid_candidates(
                process,
                regions,
                typed_value,
                known_team_uids,
            );
            decoded_uids.extend(direct_candidates);

            // ReferenceTypedValue inherits TypedValue<object>; its concrete
            // m_value field is at 0x18 in the FM26 IL2CPP layout.
            for value_offset in [TYPED_VALUE_VALUE] {
                let Some(reference_value) = process
                    .read_ptr(typed_value + value_offset)
                    .filter(|value| pointer_in_regions(*value, regions))
                else {
                    continue;
                };
                diagnostics.reference_value_count += 1;
                if let Some((database_type, database_index)) =
                    database_record_reference(process, regions, reference_value)
                {
                    diagnostics.database_reference_count = diagnostics
                        .database_reference_count
                        .saturating_add(1);
                    database_references.insert((database_type, database_index));
                }
                let interop_candidates = interop_reference_uid_candidates(
                    process,
                    regions,
                    reference_value,
                    known_team_uids,
                    diagnostics,
                );
                diagnostics.interop_uid_count = diagnostics
                    .interop_uid_count
                    .saturating_add(interop_candidates.len());
                decoded_uids.extend(interop_candidates.iter().copied());

                // Some bindings contain a DynamicReference (Record) instead
                // of an InteropReference. Decode its dictionary only when the
                // concrete InteropReference layout did not yield a Team UID.
                if interop_candidates.is_empty() {
                    decoded_uids.extend(dynamic_reference_uid_candidates(
                        process,
                        regions,
                        reference_value,
                        known_team_uids,
                        diagnostics,
                    ));
                }
            }
        }

        if database_references.len() > 1
            || (database_references.is_empty() && decoded_uids.len() > 1)
        {
            return None;
        }
        let database_reference = database_references.into_iter().next();
        // Pair values belong to the InteropReference identifier tuple. They
        // are not native Team UIDs. Keep UID decoding only as a fallback for
        // older DynamicReference values without a concrete database record.
        let human_team_uid = database_reference
            .is_none()
            .then(|| decoded_uids.into_iter().next())
            .flatten();
        if database_reference.is_none() && human_team_uid.is_none() {
            return None;
        }
        let (database_type, database_index) = database_reference
            .map(|(record_type, index)| (Some(record_type), Some(index)))
            .unwrap_or((None, None));
        diagnostics.database_reference_type = database_type.unwrap_or(0);
        diagnostics.database_reference_index = database_index.unwrap_or(0);
        Some(HumanTeamReference {
            human_team_uid,
            database_index,
            database_type,
        })
    }

    fn database_record_reference(
        process: &RemoteProcess,
        regions: &[(usize, usize)],
        reference: usize,
    ) -> Option<(u32, u32)> {
        // DatabaseRecordReference derives from InteropReference. Requiring its
        // canonical ID list first prevents arbitrary managed objects from
        // being interpreted as a database reference just because two words
        // at +0x20/+0x24 happen to look small.
        process
            .read_ptr(reference + INTEROP_REFERENCE_ID_LIST)
            .filter(|value| pointer_in_regions(*value, regions))?;
        let database_index = process.read_u32(reference + DATABASE_RECORD_INDEX)?;
        let database_type = process.read_u32(reference + DATABASE_RECORD_TYPE)?;
        if database_index == u32::MAX
            || database_index > DATABASE_RECORD_INDEX_MASK
            || database_type >= DATABASE_TABLE_COUNT
            || !matches!(
                database_type,
                DATABASE_TABLE_CLUB
                    | DATABASE_TABLE_NATIONAL_TEAM_CONTAINER
                    | DATABASE_TABLE_NATION
                    | DATABASE_TABLE_TEAM
            )
        {
            return None;
        }
        Some((database_type, database_index))
    }

    fn managed_list_reference(
        process: &RemoteProcess,
        list: usize,
        index: usize,
    ) -> Option<usize> {
        let size = process.read_u32(list + MANAGED_LIST_SIZE)? as usize;
        if index >= size || size > 1_000_000 {
            return None;
        }
        let items = process.read_ptr(list + MANAGED_LIST_ITEMS)?;
        let capacity = process.read_u64(items + MANAGED_ARRAY_LENGTH)? as usize;
        if index >= capacity || capacity > 1_000_000 {
            return None;
        }
        process
            .read_ptr(items + MANAGED_ARRAY_DATA + index * 8)
            .filter(|value| *value >= 0x10_000)
    }

    fn typed_value_uid_candidates(
        process: &RemoteProcess,
        regions: &[(usize, usize)],
        typed_value: usize,
        known_team_uids: &HashSet<u32>,
    ) -> HashSet<u32> {
        let mut candidates = HashSet::<u32>::new();
        for value_offset in [TYPED_VALUE_VALUE] {
            let Some(boxed) = process
                .read_ptr(typed_value + value_offset)
                .filter(|value| pointer_in_regions(*value, regions))
            else {
                continue;
            };
            if let Some(uid) = process
                .read_u32(boxed + OBJ_UID)
                .filter(|uid| known_team_uids.contains(uid))
            {
                candidates.insert(uid);
            }
        }
        candidates
    }

    fn interop_reference_uid_candidates(
        process: &RemoteProcess,
        regions: &[(usize, usize)],
        interop_reference: usize,
        known_team_uids: &HashSet<u32>,
        diagnostics: &mut HumanBindingDiagnostics,
    ) -> HashSet<u32> {
        let mut candidates = HashSet::<u32>::new();
        let Some(id_list) = process
            .read_ptr(interop_reference + INTEROP_REFERENCE_ID_LIST)
            .filter(|value| pointer_in_regions(*value, regions))
        else {
            return candidates;
        };
        let Some(size) = process
            .read_u32(id_list + MANAGED_LIST_SIZE)
            .map(|value| value as usize)
            .filter(|value| (1..=MAX_INTEROP_REFERENCE_PAIRS).contains(value))
        else {
            return candidates;
        };
        let Some(items) = process
            .read_ptr(id_list + MANAGED_LIST_ITEMS)
            .filter(|value| pointer_in_regions(*value, regions))
        else {
            return candidates;
        };
        let Some(capacity) = process
            .read_u64(items + MANAGED_ARRAY_LENGTH)
            .map(|value| value as usize)
            .filter(|value| size <= *value && *value <= MAX_INTEROP_REFERENCE_PAIRS)
        else {
            return candidates;
        };
        if capacity < size {
            return candidates;
        }

        diagnostics.interop_list_count = diagnostics.interop_list_count.saturating_add(1);
        for index in 0..size {
            let pair = items
                .saturating_add(MANAGED_ARRAY_DATA)
                .saturating_add(index.saturating_mul(INTEROP_REFERENCE_PAIR_SIZE));
            if process.read_u32(pair).is_none() {
                continue;
            }
            let Some(value) = process.read_u32(pair + INTEROP_REFERENCE_PAIR_VALUE) else {
                continue;
            };
            diagnostics.interop_pair_count = diagnostics.interop_pair_count.saturating_add(1);
            if known_team_uids.contains(&value) {
                candidates.insert(value);
            }
        }

        candidates
    }

    fn dynamic_reference_uid_candidates(
        process: &RemoteProcess,
        regions: &[(usize, usize)],
        dynamic_reference: usize,
        known_team_uids: &HashSet<u32>,
        diagnostics: &mut HumanBindingDiagnostics,
    ) -> HashSet<u32> {
        let mut candidates = HashSet::<u32>::new();
        let canonical_count = process
            .read_u32(dynamic_reference + MANAGED_DICTIONARY_COUNT)
            .map(|value| value as usize)
            .unwrap_or(0);
        let mut arrays = Vec::<usize>::new();

        // Record derives from Dictionary<uint, TypedValue>. 0x18 is the
        // canonical _entries offset. The bounded alternatives let the reader
        // survive a runtime layout shift; every resulting number still has to
        // match a real Team UID collected independently from the native DB.
        for entries_offset in [
            MANAGED_DICTIONARY_ENTRIES,
            0x10,
            0x20,
            0x28,
            0x30,
        ] {
            let Some(entries) = process
                .read_ptr(dynamic_reference + entries_offset)
                .filter(|value| pointer_in_regions(*value, regions))
            else {
                continue;
            };
            let Some(capacity) = process
                .read_u64(entries + MANAGED_ARRAY_LENGTH)
                .map(|value| value as usize)
                .filter(|value| {
                    (1..=MAX_DYNAMIC_REFERENCE_PROPERTIES).contains(value)
                })
            else {
                continue;
            };
            if arrays.contains(&entries) {
                continue;
            }
            arrays.push(entries);
            diagnostics.record_array_count += 1;

            let entry_count = if entries_offset == MANAGED_DICTIONARY_ENTRIES
                && (1..=capacity).contains(&canonical_count)
            {
                canonical_count
            } else {
                capacity
            };

            for entry_size in [DICTIONARY_ENTRY_SIZE, 0x20] {
                for index in 0..entry_count {
                    let entry = entries
                        .saturating_add(MANAGED_ARRAY_DATA)
                        .saturating_add(index.saturating_mul(entry_size));
                    let direct_key = process.read_u32(entry + 0x08);
                    let boxed_key = process
                        .read_ptr(entry + 0x08)
                        .filter(|value| pointer_in_regions(*value, regions))
                        .and_then(|value| process.read_u32(value + 0x10));
                    if direct_key != Some(DYNAMIC_REFERENCE_UID_PROPERTY)
                        && boxed_key != Some(DYNAMIC_REFERENCE_UID_PROPERTY)
                    {
                        continue;
                    }
                    diagnostics.uid_property_count += 1;

                    for value_offset in [0x10, 0x18] {
                        let Some(typed_value) = process
                            .read_ptr(entry + value_offset)
                            .filter(|value| pointer_in_regions(*value, regions))
                        else {
                            continue;
                        };
                        candidates.extend(typed_value_uid_candidates(
                            process,
                            regions,
                            typed_value,
                            known_team_uids,
                        ));
                    }
                }
            }
        }

        candidates
    }

    fn collect_known_team_uids(
        process: &RemoteProcess,
        uid_objects: &[UidObjectCandidate],
        clubs: &HashSet<usize>,
    ) -> HashSet<u32> {
        let mut team_uids = HashSet::<u32>::new();
        for &club in clubs {
            let Some(begin) = process.read_ptr(club + CLUB_TEAMS_BEGIN) else {
                continue;
            };
            let Some(end) = process.read_ptr(club + CLUB_TEAMS_END) else {
                continue;
            };
            if end <= begin || (end - begin) % 8 != 0 || (end - begin) / 8 > 64 {
                continue;
            }
            for index in 0..((end - begin) / 8) {
                let Some(team) = process.read_ptr(begin + index * 8) else {
                    continue;
                };
                if let Some(uid) = record_uid(process, team) {
                    team_uids.insert(uid);
                }
            }
        }

        for object in uid_objects {
            let mut addresses = Vec::<usize>::from([object.address]);
            if object.dynamic_offset > 0 && object.address >= object.dynamic_offset {
                addresses.push(object.address - object.dynamic_offset);
            }
            if addresses
                .into_iter()
                .any(|address| looks_like_team_record(process, address))
            {
                team_uids.insert(object.uid);
            }
        }
        team_uids
    }

    fn pointer_vector(process: &RemoteProcess, address: usize, limit: usize) -> Result<Vec<usize>, String> {
        let begin = process.read_ptr(address).ok_or("Nieczytelna lista zespołów klubu.")?;
        let end = process.read_ptr(address + 8).ok_or("Nieczytelny koniec listy zespołów klubu.")?;
        if begin == 0 && end == 0 { return Ok(Vec::new()); }
        if begin < 0x10_000 || end < begin || (end-begin)%8 != 0 || (end-begin)/8 > limit {
            return Err("Nieprawidłowa struktura zespołów klubu; nie pokazano niepełnego składu.".into());
        }
        if begin == end { return Ok(Vec::new()); }
        let bytes = process.read_exact(begin,end-begin).ok_or("Nieczytelne elementy listy zespołów.")?;
        Ok(bytes.chunks_exact(8).filter_map(|bytes| {
            let value = u64::from_le_bytes(bytes.try_into().ok()?) as usize;
            (value >= 0x10_000).then_some(value)
        }).collect())
    }

    fn resolve_active_contract_club(
        process: &RemoteProcess, resolver: &MetaResolver, active: &ActiveHumanTeamResolution,
    ) -> Option<ManagedTeamResolution> {
        let resolved = fm_club::resolve_active_club(active.team_address,
            active.active_manager_count, active.active_team_count, |team| {
                let club = process.read_ptr(team + TEAM_CLUB).filter(|address| *address >= 0x10_000)?;
                let native_type = resolver.native_type_name(process.read_ptr(club)?)?;
                let uid = record_uid(process, club)?;
                let name = club_name(process, club).filter(|name| plausible_label(name, 120))?;
                let teams = pointer_vector(process, club + CLUB_TEAMS_BEGIN, 64).ok()?;
                if teams.iter().any(|team| process.read_ptr(*team + TEAM_CLUB) != Some(club)) { return None; }
                Some(fm_club::NativeClubIdentity {club, uid, name, native_type, teams})
            })?;
        Some(ManagedTeamResolution {team_address:resolved.team,team_name:resolved.name,
            nation_address:0,nation_name:String::new(),score:0})
    }

    fn resolve_bound_club_team(
        process: &RemoteProcess, binding: HumanBindingResolution,
        active: Option<usize>, managers: &HashSet<HumanManagerCandidate>,
    ) -> Option<ManagedTeamResolution> {
        if binding.club_manager_evidence == 0 || binding.nation_manager_evidence > 0 { return None; }
        let mut matches = HashMap::new();
        let teams = active.into_iter().chain(managers.iter().filter_map(|manager| contract_team(process,manager.person_address)));
        for team in teams {
            let Some(club) = process.read_ptr(team + TEAM_CLUB).filter(|club| *club >= 0x10_000) else { continue; };
            let Some(name) = club_name(process,club).filter(|name| plausible_label(name,120)) else { continue; };
            let uid_match = binding.human_team_uid.map(|uid| record_uid(process,team)==Some(uid) || record_uid(process,club)==Some(uid)).unwrap_or(false);
            let index_match = binding.database_index.map(|index| match binding.database_type {
                Some(DATABASE_TABLE_TEAM) => native_record_index_matches(process,team,index),
                Some(DATABASE_TABLE_CLUB) => native_record_index_matches(process,club,index),
                _ => false,
            }).unwrap_or(false);
            if !uid_match && !index_match { continue; }
            if pointer_vector(process,club+CLUB_TEAMS_BEGIN,64).ok()?.contains(&team) {
                matches.insert(team,ManagedTeamResolution {team_address:team,team_name:name,nation_address:0,nation_name:String::new(),score:0});
            }
        }
        if matches.len()!=1 { return None; }
        matches.into_values().next()
    }

    fn collect_managed_club_players(
        process: &RemoteProcess, root: usize, first_team: usize, candidates: &HashMap<u32,PlayerCandidate>, prior_own: Option<&HashSet<u32>>,
    ) -> Result<(HashMap<u32,String>,HashSet<usize>),String> {
        let mut own_clubs = HashSet::new();
        let linked_reserves = process.layout.edition==27 && process.native_plugin_hash.as_deref()
            .map(|hash| hash.eq_ignore_ascii_case("bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f")).unwrap_or(false);
        let mut teams = fm_club::club_teams(root, |club| {
            own_clubs.insert(club);
            if club_name(process,club).filter(|name| plausible_label(name,120)).is_none() {
                return Err("Nie udało się potwierdzić powiązanego klubu rezerw.".into());
            }
            let teams = pointer_vector(process,club+CLUB_TEAMS_BEGIN,64)?;
            if teams.iter().any(|team| process.read_ptr(*team+TEAM_CLUB)!=Some(club)) {
                return Err("Nieprawidłowe powiązanie zespołu z klubem.".into());
            }
            let reserve_clubs = if linked_reserves {
                pointer_vector(process,club+0x30,64)?.into_iter().map(|team| {
                    process.read_ptr(team+TEAM_CLUB).filter(|club| *club>=0x10_000)
                        .ok_or_else(|| "Nie udało się odczytać klubu rezerw.".to_string())
                }).collect::<Result<Vec<_>,_>>()?
            } else { Vec::new() };
            Ok(ClubNode {teams,reserve_clubs})
        })?;
        teams.insert(first_team);
        let by_address = candidates.values().flat_map(|candidate| [(candidate.person_address,candidate.uid),(candidate.player_address,candidate.uid)]).collect::<HashMap<_,_>>();
        let mut roster = HashMap::<u32,bool>::new();
        for &team in &teams {
            for entry in pointer_vector(process,team+TEAM_PLAYERS_BEGIN,512)? {
                let uid = by_address.get(&entry).copied().or_else(|| (0..=0x80).step_by(8).find_map(|offset| {
                    process.read_ptr(entry+offset).and_then(|address| by_address.get(&address).copied())
                }));
                if let Some(uid)=uid { roster.entry(uid).and_modify(|first| *first |= team==first_team).or_insert(team==first_team); }
            }
        }
        let mut result=HashMap::new();
        for candidate in candidates.values() {
            if prior_own.is_some_and(|prior| !roster.contains_key(&candidate.uid) && !prior.contains(&candidate.uid)) { continue; }
            let current = process.read_ptr(candidate.player_address+0x130).filter(|team| *team>=0x10_000);
            let on_roster=roster.contains_key(&candidate.uid);
            if fm_club::belongs_to_club(current,&teams,on_roster) {
                let first=current.map(|team| team==first_team).unwrap_or_else(|| roster.get(&candidate.uid).copied().unwrap_or(false));
                result.insert(candidate.uid,if first {"Pierwsza drużyna"} else {"Rezerwy i juniorzy"}.into());
            }
        }
        Ok((result,own_clubs))
    }

    fn resolve_bound_national_team(
        process: &RemoteProcess,
        binding: HumanBindingResolution,
        active_human_team: Option<usize>,
        uid_objects: &[UidObjectCandidate],
        clubs: &HashSet<usize>,
        human_managers: &HashSet<HumanManagerCandidate>,
        candidates: &HashMap<u32, PlayerCandidate>,
        nation_counts: &HashMap<usize, usize>,
        diagnostics: &mut HumanBindingDiagnostics,
    ) -> Option<ManagedTeamResolution> {
        let mut team_addresses = HashSet::<usize>::new();
        let mut trusted_team_addresses = HashSet::<usize>::new();
        let mut uid_matches = 0usize;
        let mut database_index_matches = HashSet::<usize>::new();

        // The global manager registry contains exactly one active human. Its
        // inline Person -> Contract -> Team chain is the authoritative native
        // answer to "which team does this player manage?". The selected
        // humanTeam binding independently proves that the active job is a
        // nation-manager job, so this pointer is safe to trust directly.
        if binding.nation_manager_evidence > 0 {
            if let Some(team) = active_human_team {
                trusted_team_addresses.insert(team);
                team_addresses.insert(team);
                if binding.database_type == Some(DATABASE_TABLE_TEAM)
                    && binding
                        .database_index
                        .map(|index| native_record_index_matches(process, team, index))
                        .unwrap_or(false)
                {
                    database_index_matches.insert(team);
                }
            }
        }

        // FM26 stores the active job through the human manager's inline Person:
        // Human + 0x450 -> Person, Person + 0xA8 -> Contract,
        // Contract + 0x10 -> Team. This scan-based path remains as a fallback
        // when the exact global registry signature is unavailable.
        for manager in human_managers {
            let Some(team) = contract_team(process, manager.person_address) else {
                continue;
            };
            let uid_match = binding
                .human_team_uid
                .map(|uid| record_uid(process, team) == Some(uid))
                .unwrap_or(false);
            let index_match = binding.database_type == Some(DATABASE_TABLE_TEAM)
                && binding
                    .database_index
                    .map(|index| native_record_index_matches(process, team, index))
                    .unwrap_or(false);
            if uid_match || index_match {
                trusted_team_addresses.insert(team);
                team_addresses.insert(team);
                uid_matches = uid_matches.saturating_add(if uid_match { 1 } else { 0 });
                if index_match {
                    database_index_matches.insert(team);
                }
            }
        }

        for object in uid_objects {
            let uid_match = binding
                .human_team_uid
                .map(|uid| object.uid == uid)
                .unwrap_or(false);
            let mut addresses = Vec::<usize>::from([object.address]);
            if object.dynamic_offset > 0 && object.address >= object.dynamic_offset {
                addresses.push(object.address - object.dynamic_offset);
            }
            for address in addresses {
                let index_match = binding.database_type == Some(DATABASE_TABLE_TEAM)
                    && binding
                        .database_index
                        .map(|index| native_record_index_matches(process, address, index))
                        .unwrap_or(false);
                if uid_match || index_match {
                    team_addresses.insert(address);
                    uid_matches = uid_matches.saturating_add(if uid_match { 1 } else { 0 });
                    if index_match && looks_like_team_record(process, address) {
                        trusted_team_addresses.insert(address);
                        database_index_matches.insert(address);
                    }
                }
            }
        }
        for &club in clubs {
            let Some(begin) = process.read_ptr(club + CLUB_TEAMS_BEGIN) else {
                continue;
            };
            let Some(end) = process.read_ptr(club + CLUB_TEAMS_END) else {
                continue;
            };
            if end <= begin || (end - begin) % 8 != 0 || (end - begin) / 8 > 64 {
                continue;
            }
            for index in 0..((end - begin) / 8) {
                let Some(team) = process.read_ptr(begin + index * 8) else {
                    continue;
                };
                let uid_match = binding
                    .human_team_uid
                    .map(|uid| record_uid(process, team) == Some(uid))
                    .unwrap_or(false);
                let index_match = binding.database_type == Some(DATABASE_TABLE_TEAM)
                    && binding
                        .database_index
                        .map(|record_index| {
                            native_record_index_matches(process, team, record_index)
                        })
                        .unwrap_or(false);
                if uid_match || index_match {
                    // A pointer read from a validated Club::teams vector is an
                    // exact Team record. Do not reject it using the legacy
                    // TEAM_TYPE byte heuristic; that byte is not stable across
                    // every national-team subtype in FM26.
                    trusted_team_addresses.insert(team);
                    team_addresses.insert(team);
                    uid_matches = uid_matches.saturating_add(if uid_match { 1 } else { 0 });
                    if index_match {
                        database_index_matches.insert(team);
                    }
                }
            }
        }
        diagnostics.uid_object_match_count = uid_matches;
        diagnostics.trusted_team_match_count = trusted_team_addresses.len();
        diagnostics.database_index_match_count = database_index_matches.len();

        let mut address_to_nation = HashMap::<usize, usize>::with_capacity(candidates.len() * 2);
        for candidate in candidates.values() {
            if candidate.nation_address == 0 {
                continue;
            }
            address_to_nation.insert(candidate.person_address, candidate.nation_address);
            address_to_nation.insert(candidate.player_address, candidate.nation_address);
        }

        let shape_matches = team_addresses
            .iter()
            .filter(|team| looks_like_team_record(process, **team))
            .count();
        diagnostics.team_shape_match_count = shape_matches;

        let mut matches = team_addresses
            .into_iter()
            .filter(|team| {
                trusted_team_addresses.contains(team)
                    || looks_like_team_record(process, *team)
            })
            .filter_map(|team| {
                build_bound_national_team_candidate(
                    process,
                    team,
                    &address_to_nation,
                    nation_counts,
                )
            })
            .collect::<Vec<_>>();
        diagnostics.national_resolution_count = matches.len();
        for candidate in &mut matches {
            candidate.score = candidate
                .score
                .saturating_add(binding.nation_manager_evidence.saturating_mul(25_000));
            if active_human_team == Some(candidate.team_address) {
                candidate.score = candidate.score.saturating_add(5_000_000);
            }
        }
        matches.sort_by(|left, right| right.score.cmp(&left.score));
        let best = matches.first()?;
        let has_conflict = matches.iter().skip(1).any(|candidate| {
            candidate.nation_address != best.nation_address
                && candidate.score.saturating_add(50_000) >= best.score
        });
        (!has_conflict).then(|| matches.remove(0))
    }

    fn native_record_index_matches(
        process: &RemoteProcess,
        address: usize,
        expected_index: u32,
    ) -> bool {
        process
            .read_u32(address + NATIVE_RECORD_INDEX)
            .map(|index| index & DATABASE_RECORD_INDEX_MASK == expected_index)
            .unwrap_or(false)
    }

    fn looks_like_team_record(process: &RemoteProcess, team: usize) -> bool {
        let team_type = process.read_u8(team + TEAM_TYPE).unwrap_or(u8::MAX);
        let begin = process.read_ptr(team + TEAM_PLAYERS_BEGIN).unwrap_or(0);
        let end = process.read_ptr(team + TEAM_PLAYERS_END).unwrap_or(0);
        team_type <= 32
            && begin >= 0x10_000
            && end > begin
            && (end - begin) % 8 == 0
            && (end - begin) / 8 <= 200
    }

    fn build_bound_national_team_candidate(
        process: &RemoteProcess,
        team: usize,
        address_to_nation: &HashMap<usize, usize>,
        nation_counts: &HashMap<usize, usize>,
    ) -> Option<ManagedTeamResolution> {
        let squad_votes = team_squad_nation_votes(process, team, address_to_nation);
        let squad_total = squad_votes.values().sum::<usize>();
        let dominant_squad_nation = squad_votes
            .iter()
            .max_by_key(|(_, count)| **count)
            .map(|(nation, count)| (*nation, *count));
        let strong_squad_resolution = dominant_squad_nation.and_then(|(nation, count)| {
            (squad_total >= 8 && count * 100 >= squad_total * 75)
                .then(|| nation_name(process, nation).map(|name| (nation, name, count)))
                .flatten()
        });

        let owner_labels = process
            .read_ptr(team + TEAM_CLUB)
            .filter(|value| *value != 0)
            .map(|owner| {
                [club_name(process, owner), nation_name(process, owner)]
                    .into_iter()
                    .flatten()
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();
        let graph_resolution = resolve_managed_nation(
            process,
            team,
            owner_labels.first().map(String::as_str),
            nation_counts,
        );
        let (nation_address, nation_name, same_nation_players) =
            if let Some(resolution) = strong_squad_resolution {
                resolution
            } else {
                let (nation, name) = graph_resolution?;
                let count = squad_votes.get(&nation).copied().unwrap_or(0);
                (nation, name, count)
            };
        let label = owner_labels
            .iter()
            .find(|label| labels_match(label, &nation_name))
            .cloned();
        let strong_national_squad = squad_total >= 8
            && same_nation_players * 100 >= squad_total * 75;
        if label.is_none() && !strong_national_squad {
            return None;
        }

        let squad_ratio = if squad_total == 0 {
            0
        } else {
            same_nation_players * 1_000 / squad_total
        };
        let senior_score = match process.read_u8(team + TEAM_TYPE) {
            Some(0) => 30_000,
            Some(1..=5) => 5_000,
            _ => 0,
        };
        Some(ManagedTeamResolution {
            team_address: team,
            team_name: label.unwrap_or_else(|| nation_name.clone()),
            nation_address,
            nation_name,
            score: 2_000_000
                + usize::from(strong_national_squad) * 100_000
                + senior_score
                + squad_ratio * 25,
        })
    }

    fn resolve_user_national_team(
        process: &RemoteProcess,
        regions: &[(usize, usize)],
        clubs: &HashSet<usize>,
        human_managers: &HashSet<HumanManagerCandidate>,
        candidates: &HashMap<u32, PlayerCandidate>,
        nation_counts: &HashMap<usize, usize>,
    ) -> (Option<ManagedTeamResolution>, ManagedTeamDiagnostics) {
        let mut diagnostics = ManagedTeamDiagnostics {
            manager_count: human_managers.len(),
            club_count: clubs.len(),
            ..ManagedTeamDiagnostics::default()
        };
        let manager_addresses = human_managers
            .iter()
            .flat_map(|manager| {
                (manager.staff_address..=manager.person_address).step_by(8)
            })
            .collect::<HashSet<_>>();
        let manager_uids = human_managers
            .iter()
            .map(|manager| manager.uid)
            .filter(|uid| *uid != 0 && *uid != u32::MAX)
            .collect::<HashSet<_>>();
        if manager_addresses.is_empty() {
            return (None, diagnostics);
        }

        let mut address_to_nation = HashMap::<usize, usize>::with_capacity(candidates.len() * 2);
        for candidate in candidates.values() {
            if candidate.nation_address == 0 {
                continue;
            }
            address_to_nation.insert(candidate.person_address, candidate.nation_address);
            address_to_nation.insert(candidate.player_address, candidate.nation_address);
        }

        let mut team_clubs = HashMap::<usize, (usize, Option<String>)>::new();

        for &club in clubs {
            let Some(begin) = process.read_ptr(club + CLUB_TEAMS_BEGIN) else {
                continue;
            };
            let Some(end) = process.read_ptr(club + CLUB_TEAMS_END) else {
                continue;
            };
            if end <= begin || (end - begin) % 8 != 0 {
                continue;
            }
            let team_count = (end - begin) / 8;
            if !(1..=64).contains(&team_count) {
                continue;
            }
            let label = club_name(process, club);

            for index in 0..team_count {
                let Some(team) = process.read_ptr(begin + index * 8).filter(|value| *value != 0)
                else {
                    continue;
                };
                team_clubs
                    .entry(team)
                    .or_insert_with(|| (club, label.clone()));
            }
        }
        diagnostics.team_count = team_clubs.len();

        let mut national_candidates = HashMap::<usize, ManagedTeamResolution>::new();
        for (&team, (_, label)) in &team_clubs {
            if let Some(candidate) = build_managed_team_candidate(
                process,
                team,
                label.clone(),
                &address_to_nation,
                nation_counts,
            ) {
                diagnostics.national_candidate_count += 1;
                national_candidates.insert(team, candidate);
            }
        }

        let mut link_scores = HashMap::<usize, usize>::new();
        for (&team, (club, _)) in &team_clubs {
            if record_points_to_human_manager(
                process,
                team,
                &manager_addresses,
                &manager_uids,
            ) || record_points_to_human_manager(
                process,
                *club,
                &manager_addresses,
                &manager_uids,
            ) {
                diagnostics.team_to_manager_link_count += 1;
                keep_highest_link_score(&mut link_scores, team, 900_000);
            }
        }

        let (manager_links, graph_nodes) = manager_to_team_graph_scores(
            process,
            regions,
            human_managers,
            &team_clubs,
        );
        diagnostics.manager_to_team_link_count = manager_links.len();
        diagnostics.manager_graph_node_count = graph_nodes;
        for (team, score) in manager_links {
            keep_highest_link_score(&mut link_scores, team, score);
        }

        // Najkrótsza, najbardziej wiarygodna ścieżka to aktywny kontrakt
        // zapisany przy części Person. Zachowujemy ją jako silny sygnał, ale
        // nie zakładamy już, że jest jedynym miejscem przechowywania pracy.
        for manager in human_managers {
            let Some(team) = contract_team(process, manager.person_address) else {
                continue;
            };
            keep_highest_link_score(&mut link_scores, team, 1_200_000);
            if !national_candidates.contains_key(&team) {
                let team_name = process
                    .read_ptr(team + TEAM_CLUB)
                    .and_then(|club| club_name(process, club));
                if let Some(candidate) = build_managed_team_candidate(
                    process,
                    team,
                    team_name,
                    &address_to_nation,
                    nation_counts,
                ) {
                    diagnostics.national_candidate_count += 1;
                    national_candidates.insert(team, candidate);
                }
            }
        }

        let mut matches = Vec::<ManagedTeamResolution>::new();
        for (team, mut candidate) in national_candidates {
            let Some(link_score) = link_scores.get(&team).copied() else {
                continue;
            };
            candidate.score = candidate.score.saturating_add(link_score);
            matches.push(candidate);
        }
        matches.sort_by(|left, right| right.score.cmp(&left.score));
        let Some(best) = matches.first() else {
            return (None, diagnostics);
        };
        let conflicting_nation = matches.iter().skip(1).find(|candidate| {
            candidate.nation_address != best.nation_address
        });
        if conflicting_nation
            .map(|candidate| best.score < candidate.score.saturating_add(150_000))
            .unwrap_or(false)
        {
            return (None, diagnostics);
        }

        (matches.into_iter().next(), diagnostics)
    }

    fn keep_highest_link_score(
        scores: &mut HashMap<usize, usize>,
        team: usize,
        score: usize,
    ) {
        scores
            .entry(team)
            .and_modify(|current| *current = (*current).max(score))
            .or_insert(score);
    }

    fn manager_to_team_graph_scores(
        process: &RemoteProcess,
        regions: &[(usize, usize)],
        human_managers: &HashSet<HumanManagerCandidate>,
        team_clubs: &HashMap<usize, (usize, Option<String>)>,
    ) -> (HashMap<usize, usize>, usize) {
        const MANAGER_SUFFIX_LENGTH: usize = 0x180;
        const FIRST_HOP_SCAN_LENGTH: usize = 0x240;
        const SECOND_HOP_SCAN_LENGTH: usize = 0x100;
        const MAX_GRAPH_NODES_PER_MANAGER: usize = 512;

        let team_addresses = team_clubs.keys().copied().collect::<HashSet<_>>();
        let mut club_teams = HashMap::<usize, Vec<usize>>::new();
        let mut team_uids = HashMap::<u32, Vec<usize>>::new();
        let mut club_uid_teams = HashMap::<u32, Vec<usize>>::new();
        let mut club_uid_sources = HashMap::<u32, HashSet<usize>>::new();
        for (&team, (club, _)) in team_clubs {
            club_teams.entry(*club).or_default().push(team);
            if let Some(uid) = record_uid(process, team) {
                team_uids.entry(uid).or_default().push(team);
            }
            if let Some(uid) = record_uid(process, *club) {
                club_uid_teams.entry(uid).or_default().push(team);
                club_uid_sources.entry(uid).or_default().insert(*club);
            }
        }
        team_uids.retain(|_, teams| teams.len() == 1);
        club_uid_teams.retain(|uid, _| {
            club_uid_sources
                .get(uid)
                .map(|clubs| clubs.len() == 1)
                .unwrap_or(false)
        });

        let mut scores = HashMap::<usize, usize>::new();
        let mut scanned_nodes = 0usize;

        for manager in human_managers {
            let manager_end = manager.person_address.saturating_add(MANAGER_SUFFIX_LENGTH);
            let manager_length = manager_end
                .saturating_sub(manager.staff_address)
                .min(0x800);
            let Some(root) = process.read(manager.staff_address, manager_length) else {
                continue;
            };

            let mut queue = VecDeque::<(usize, usize)>::new();
            let mut visited = HashSet::<usize>::new();
            for pointer in aligned_pointers(&root) {
                if score_manager_graph_target(
                    pointer,
                    0,
                    &team_addresses,
                    &club_teams,
                    &mut scores,
                ) {
                    continue;
                }
                if pointer >= manager.staff_address && pointer < manager_end {
                    continue;
                }
                if pointer_in_regions(pointer, regions) && visited.insert(pointer) {
                    queue.push_back((pointer, 1));
                }
            }
            for uid in aligned_u32_values(&root) {
                score_manager_graph_uid_target(
                    uid,
                    0,
                    &team_uids,
                    &club_uid_teams,
                    &mut scores,
                );
            }

            let mut manager_nodes = 0usize;
            while let Some((address, depth)) = queue.pop_front() {
                if manager_nodes >= MAX_GRAPH_NODES_PER_MANAGER {
                    break;
                }
                manager_nodes += 1;
                scanned_nodes += 1;
                let scan_length = if depth == 1 {
                    FIRST_HOP_SCAN_LENGTH
                } else {
                    SECOND_HOP_SCAN_LENGTH
                };
                let Some(bytes) = process.read(address, scan_length) else {
                    continue;
                };

                for pointer in aligned_pointers(&bytes) {
                    if score_manager_graph_target(
                        pointer,
                        depth,
                        &team_addresses,
                        &club_teams,
                        &mut scores,
                    ) {
                        continue;
                    }
                    if depth >= 2
                        || (pointer >= manager.staff_address && pointer < manager_end)
                        || !pointer_in_regions(pointer, regions)
                        || visited.len() >= MAX_GRAPH_NODES_PER_MANAGER
                        || !visited.insert(pointer)
                    {
                        continue;
                    }
                    queue.push_back((pointer, depth + 1));
                }
                for uid in aligned_u32_values(&bytes) {
                    score_manager_graph_uid_target(
                        uid,
                        depth,
                        &team_uids,
                        &club_uid_teams,
                        &mut scores,
                    );
                }
            }
        }

        (scores, scanned_nodes)
    }

    fn aligned_pointers(bytes: &[u8]) -> impl Iterator<Item = usize> + '_ {
        (0..bytes.len().saturating_sub(7))
            .step_by(8)
            .filter_map(|offset| read_u64(bytes, offset).map(|value| value as usize))
            .filter(|pointer| *pointer >= 0x10_000)
    }

    fn aligned_u32_values(bytes: &[u8]) -> impl Iterator<Item = u32> + '_ {
        (0..bytes.len().saturating_sub(3))
            .step_by(4)
            .filter_map(|offset| read_u32(bytes, offset))
            .filter(|value| *value != 0 && *value != u32::MAX)
    }

    fn record_uid(process: &RemoteProcess, address: usize) -> Option<u32> {
        process
            .read_u32(address + OBJ_UID)
            .filter(|uid| *uid != 0 && *uid != u32::MAX)
    }

    fn pointer_in_regions(pointer: usize, regions: &[(usize, usize)]) -> bool {
        regions.iter().any(|(base, length)| {
            pointer >= *base && pointer < base.saturating_add(*length)
        })
    }

    fn score_manager_graph_target(
        pointer: usize,
        depth: usize,
        team_addresses: &HashSet<usize>,
        club_teams: &HashMap<usize, Vec<usize>>,
        scores: &mut HashMap<usize, usize>,
    ) -> bool {
        let team_score: usize = match depth {
            0 => 1_000_000,
            1 => 750_000,
            _ => 400_000,
        };
        if team_addresses.contains(&pointer) {
            keep_highest_link_score(scores, pointer, team_score);
            return true;
        }

        let Some(teams) = club_teams.get(&pointer) else {
            return false;
        };
        let club_score = team_score.saturating_sub(150_000);
        for &team in teams {
            keep_highest_link_score(scores, team, club_score);
        }
        true
    }

    fn score_manager_graph_uid_target(
        uid: u32,
        depth: usize,
        team_uids: &HashMap<u32, Vec<usize>>,
        club_uid_teams: &HashMap<u32, Vec<usize>>,
        scores: &mut HashMap<usize, usize>,
    ) -> bool {
        let uid_score: usize = match depth {
            0 => 975_000,
            1 => 725_000,
            _ => 375_000,
        };
        if let Some(teams) = team_uids.get(&uid) {
            for &team in teams {
                keep_highest_link_score(scores, team, uid_score);
            }
            return true;
        }

        let Some(teams) = club_uid_teams.get(&uid) else {
            return false;
        };
        let club_score = uid_score.saturating_sub(150_000);
        for &team in teams {
            keep_highest_link_score(scores, team, club_score);
        }
        true
    }

    fn record_points_to_human_manager(
        process: &RemoteProcess,
        record: usize,
        manager_addresses: &HashSet<usize>,
        manager_uids: &HashSet<u32>,
    ) -> bool {
        if process
            .read_ptr(record + TEAM_MANAGER)
            .filter(|reference| {
                points_to_human_manager(process, *reference, manager_addresses)
            })
            .is_some()
        {
            return true;
        }

        // TEAM_MANAGER zmieniało położenie między wariantami obiektu Team.
        // Szukamy więc bezpośredniego odwołania do zakresu pod-obiektów
        // tego samego HumanManagera (od bazy Staff do części Person) w małym,
        // kontrolowanym nagłówku drużyny.
        let Some(bytes) = process.read(record, 0x300) else {
            return false;
        };
        let pointer_match = (0..bytes.len().saturating_sub(7))
            .step_by(8)
            .filter_map(|offset| read_u64(&bytes, offset).map(|value| value as usize))
            .any(|reference| manager_addresses.contains(&reference));
        pointer_match || aligned_u32_values(&bytes).any(|uid| manager_uids.contains(&uid))
    }

    fn points_to_human_manager(
        process: &RemoteProcess,
        manager_reference: usize,
        manager_addresses: &HashSet<usize>,
    ) -> bool {
        manager_addresses.contains(&manager_reference)
            || (0..=0x40).step_by(8).any(|offset| {
                process
                    .read_ptr(manager_reference + offset)
                    .map(|pointer| manager_addresses.contains(&pointer))
                    .unwrap_or(false)
            })
    }

    fn build_managed_team_candidate(
        process: &RemoteProcess,
        team: usize,
        team_name: Option<String>,
        address_to_nation: &HashMap<usize, usize>,
        nation_counts: &HashMap<usize, usize>,
    ) -> Option<ManagedTeamResolution> {
        let team_name = team_name?;
        let squad_votes = team_squad_nation_votes(process, team, address_to_nation);
        let squad_total = squad_votes.values().sum::<usize>();
        let dominant_squad_nation = squad_votes
            .iter()
            .max_by_key(|(_, count)| **count)
            .map(|(nation, count)| (*nation, *count));

        let graph_resolution =
            resolve_managed_nation(process, team, Some(&team_name), nation_counts);
        let squad_resolution = dominant_squad_nation.and_then(|(nation, count)| {
            let strong_majority = squad_total >= 8 && count * 100 >= squad_total * 75;
            strong_majority
                .then(|| nation_name(process, nation).map(|name| (nation, name)))
                .flatten()
        });
        let (nation_address, nation_name) = squad_resolution.or(graph_resolution)?;

        let label_match = labels_match(&team_name, &nation_name);
        let same_nation_players = squad_votes.get(&nation_address).copied().unwrap_or(0);
        let strong_national_squad =
            squad_total >= 8 && same_nation_players * 100 >= squad_total * 75;

        // Klub prowadzony równolegle przez użytkownika nie może wygrać tylko
        // dlatego, że ma wskaźnik kraju. Reprezentacja musi mieć nazwę kraju
        // albo wyraźnie jednonarodowy skład.
        if !label_match && !strong_national_squad {
            return None;
        }

        let squad_ratio = if squad_total == 0 {
            0
        } else {
            same_nation_players * 1_000 / squad_total
        };
        let label_score = if label_match { 100_000 } else { 0 };
        let squad_score = if strong_national_squad { 40_000 } else { 0 };
        let senior_team_score = match process.read_u8(team + TEAM_TYPE) {
            Some(0) => 30_000,
            Some(1..=5) => 5_000,
            _ => 0,
        };
        let score =
            label_score
                + squad_score
                + senior_team_score
                + squad_ratio * 25
                + same_nation_players.min(50) * 50;

        Some(ManagedTeamResolution {
            team_address: team,
            team_name,
            nation_address,
            nation_name,
            score,
        })
    }

    fn team_squad_nation_votes(
        process: &RemoteProcess,
        team: usize,
        address_to_nation: &HashMap<usize, usize>,
    ) -> HashMap<usize, usize> {
        let mut votes = HashMap::<usize, usize>::new();
        let Some(begin) = process.read_ptr(team + TEAM_PLAYERS_BEGIN) else {
            return votes;
        };
        let Some(end) = process.read_ptr(team + TEAM_PLAYERS_END) else {
            return votes;
        };
        if end <= begin || (end - begin) % 8 != 0 {
            return votes;
        }
        let player_count = (end - begin) / 8;
        if player_count == 0 || player_count > 200 {
            return votes;
        }

        for index in 0..player_count {
            let Some(entry) = process.read_ptr(begin + index * 8).filter(|value| *value != 0)
            else {
                continue;
            };
            let nation = address_to_nation.get(&entry).copied().or_else(|| {
                (0..=0x80).step_by(8).find_map(|offset| {
                    let pointer = process.read_ptr(entry + offset)?;
                    address_to_nation.get(&pointer).copied()
                })
            });
            if let Some(nation) = nation {
                *votes.entry(nation).or_default() += 1;
            }
        }
        votes
    }

    fn looks_like_club(process: &RemoteProcess, address: usize) -> bool {
        let begin = process.read_ptr(address + CLUB_TEAMS_BEGIN).unwrap_or(0);
        let end = process.read_ptr(address + CLUB_TEAMS_END).unwrap_or(0);
        begin != 0
            && end > begin
            && (end - begin) % 8 == 0
            && (1..=64).contains(&((end - begin) / 8))
            && club_name(process, address).is_some()
    }

    fn club_name(process: &RemoteProcess, club: usize) -> Option<String> {
        process
            .indirect_string(club + CLUB_NAME)
            .or_else(|| process.indirect_string(club + CLUB_SHORT_NAME))
            .filter(|name| plausible_label(name, 64))
    }

    fn nation_name(process: &RemoteProcess, nation: usize) -> Option<String> {
        process
            // Validated FM26 26.3.x native layout: the nationality pointer on
            // Person leads to a Nation record whose length-prefixed UTF-8 name
            // pointer is stored at +0x18. The older fallbacks are kept only for
            // compatible record variants encountered in the same build.
            .indirect_string(nation + NATION_NAME)
            .or_else(|| process.indirect_string(nation + 0x20))
            .or_else(|| process.indirect_string(nation + 0x30))
            .filter(|name| plausible_label(name, 64))
    }

    fn normalize_identity_label(value: &str) -> String {
        value
            .chars()
            .filter(|character| character.is_alphanumeric())
            .flat_map(char::to_lowercase)
            .collect()
    }

    fn labels_match(left: &str, right: &str) -> bool {
        let left = normalize_identity_label(left);
        let right = normalize_identity_label(right);
        !left.is_empty()
            && !right.is_empty()
            && (left == right
                || (left.len() >= 5 && right.contains(&left))
                || (right.len() >= 5 && left.contains(&right)))
    }

    fn score_known_nation_pointers(
        process: &RemoteProcess,
        base: usize,
        length: usize,
        nation_counts: &HashMap<usize, usize>,
        nation_uids: &HashMap<u32, usize>,
        direct_weight: usize,
        nested_weight: usize,
        scores: &mut HashMap<usize, usize>,
    ) {
        let Some(bytes) = process.read(base, length) else {
            return;
        };

        for uid in aligned_u32_values(&bytes) {
            if let Some(nation) = nation_uids.get(&uid) {
                let population = nation_counts.get(nation).copied().unwrap_or(0);
                *scores.entry(*nation).or_default() +=
                    direct_weight.saturating_add(250) + population.min(250);
            }
        }

        for offset in (0..bytes.len().saturating_sub(7)).step_by(8) {
            let Some(pointer) = read_u64(&bytes, offset).map(|value| value as usize) else {
                continue;
            };
            if pointer < 0x10_000 {
                continue;
            }

            if let Some(population) = nation_counts.get(&pointer) {
                *scores.entry(pointer).or_default() += direct_weight + (*population).min(250);
                continue;
            }

            let Some(nested) = process.read(pointer, 0x100) else {
                continue;
            };
            for uid in aligned_u32_values(&nested) {
                if let Some(nation) = nation_uids.get(&uid) {
                    let population = nation_counts.get(nation).copied().unwrap_or(0);
                    *scores.entry(*nation).or_default() +=
                        nested_weight.saturating_add(100) + population.min(100);
                }
            }
            for nested_offset in (0..nested.len().saturating_sub(7)).step_by(8) {
                let Some(nation_pointer) =
                    read_u64(&nested, nested_offset).map(|value| value as usize)
                else {
                    continue;
                };
                if let Some(population) = nation_counts.get(&nation_pointer) {
                    *scores.entry(nation_pointer).or_default() +=
                        nested_weight + (*population).min(100);
                }
            }
        }
    }

    fn resolve_managed_nation(
        process: &RemoteProcess,
        team: usize,
        team_name: Option<&str>,
        nation_counts: &HashMap<usize, usize>,
    ) -> Option<(usize, String)> {
        if nation_counts.is_empty() {
            return None;
        }

        let mut scores = HashMap::<usize, usize>::new();
        let mut nation_uid_candidates = HashMap::<u32, Vec<usize>>::new();
        for nation in nation_counts.keys().copied() {
            if let Some(uid) = record_uid(process, nation) {
                nation_uid_candidates.entry(uid).or_default().push(nation);
            }
        }
        let nation_uids = nation_uid_candidates
            .into_iter()
            .filter_map(|(uid, nations)| {
                (nations.len() == 1).then(|| (uid, nations[0]))
            })
            .collect::<HashMap<_, _>>();
        score_known_nation_pointers(
            process,
            team,
            0x240,
            nation_counts,
            &nation_uids,
            900,
            120,
            &mut scores,
        );

        if let Some(club) = process.read_ptr(team + TEAM_CLUB).filter(|value| *value != 0) {
            score_known_nation_pointers(
                process,
                club,
                0x300,
                nation_counts,
                &nation_uids,
                1_200,
                160,
                &mut scores,
            );
        }

        let mut nation_names = HashMap::<usize, String>::new();
        for nation in nation_counts.keys().copied() {
            let Some(name) = nation_name(process, nation) else {
                continue;
            };
            if team_name
                .map(|managed_team| labels_match(managed_team, &name))
                .unwrap_or(false)
            {
                *scores.entry(nation).or_default() += 4_000;
            }
            nation_names.insert(nation, name);
        }

        scores
            .into_iter()
            .filter_map(|(nation, score)| {
                nation_names
                    .get(&nation)
                    .cloned()
                    .map(|name| (nation, name, score))
            })
            .max_by_key(|(_, _, score)| *score)
            .map(|(nation, name, _)| (nation, name))
            .or_else(|| {
                let managed_team = team_name?;
                nation_names
                    .into_iter()
                    .find(|(_, name)| labels_match(managed_team, name))
            })
    }

    fn resolve_managed_squad_gender(
        process: &RemoteProcess,
        team: usize,
        candidates: &HashMap<u32, PlayerCandidate>,
    ) -> Option<bool> {
        let mut address_to_gender = HashMap::<usize, bool>::with_capacity(candidates.len() * 2);
        for candidate in candidates.values() {
            address_to_gender.insert(candidate.person_address, candidate.female);
            address_to_gender.insert(candidate.player_address, candidate.female);
        }

        let begin = process.read_ptr(team + 0x38)?;
        let end = process.read_ptr(team + 0x40)?;
        if end <= begin || (end - begin) % 8 != 0 {
            return None;
        }
        let count = (end - begin) / 8;
        if count == 0 || count > 200 {
            return None;
        }

        let mut women = 0usize;
        let mut men = 0usize;
        for index in 0..count {
            let Some(entry) = process.read_ptr(begin + index * 8).filter(|value| *value != 0)
            else {
                continue;
            };
            let gender = address_to_gender.get(&entry).copied().or_else(|| {
                (0..=0x80).step_by(8).find_map(|offset| {
                    let pointer = process.read_ptr(entry + offset)?;
                    address_to_gender.get(&pointer).copied()
                })
            });
            match gender {
                Some(true) => women += 1,
                Some(false) => men += 1,
                None => {}
            }
        }

        match (women, men) {
            (0, 0) => None,
            (women, men) => Some(women > men),
        }
    }

    fn competition_name(process: &RemoteProcess, team: usize) -> Option<String> {
        for offset in TEAM_COMPETITION {
            let Some(competition) = process.read_ptr(team + offset).filter(|value| *value != 0)
            else {
                continue;
            };
            if let Some(name) = process
                .indirect_string(competition + COMPETITION_NAME)
                .filter(|name| plausible_label(name, 96))
                .or_else(|| {
                    process
                        .indirect_string(competition + COMPETITION_SHORT_NAME)
                        .filter(|name| plausible_label(name, 96))
                })
            {
                return Some(name);
            }
        }
        None
    }

    fn plausible_label(value: &str, max_length: usize) -> bool {
        let length = value.chars().count();
        length >= 2
            && length <= max_length
            && value.chars().filter(|character| character.is_alphabetic()).count() >= 2
            && !value.chars().any(char::is_control)
    }

    fn derive_game_year_from_candidates<'a>(
        players: impl Iterator<Item = &'a PlayerCandidate>,
    ) -> i32 {
        let mut years = HashMap::<i32, usize>::new();
        for player in players {
            if let Some((year, _)) = decode_fm_date(player.birth_raw) {
                if (1990..=2100).contains(&year) {
                    *years.entry(year).or_default() += 1;
                }
            }
        }
        years
            .into_iter()
            .filter(|(_, count)| *count >= 30)
            .map(|(year, _)| year)
            .max()
            .map(|year| year + 16)
            .unwrap_or(2026)
    }

    fn parse_iso_fm_date(value: &str) -> Result<u32, String> {
        let mut parts = value.trim().split('-');
        let year = parts
            .next()
            .and_then(|part| part.parse::<i32>().ok())
            .ok_or_else(|| "Podaj datę z FM w formacie RRRR-MM-DD.".to_string())?;
        let month = parts
            .next()
            .and_then(|part| part.parse::<u32>().ok())
            .ok_or_else(|| "Podaj datę z FM w formacie RRRR-MM-DD.".to_string())?;
        let day = parts
            .next()
            .and_then(|part| part.parse::<u32>().ok())
            .ok_or_else(|| "Podaj datę z FM w formacie RRRR-MM-DD.".to_string())?;
        if parts.next().is_some() || !(1900..=2200).contains(&year) {
            return Err("Podaj prawidłową datę z FM w formacie RRRR-MM-DD.".to_string());
        }
        let day_of_year = day_of_year(year, month, day)
            .ok_or_else(|| "Podana data z FM nie istnieje.".to_string())?;
        Ok(((year as u32) << 16) | day_of_year)
    }

    fn day_of_year(year: i32, month: u32, day: u32) -> Option<u32> {
        let mut days = [31u32, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if is_leap_year(year) {
            days[1] = 29;
        }
        let month_index = usize::try_from(month.checked_sub(1)?).ok()?;
        let month_days = *days.get(month_index)?;
        if day == 0 || day > month_days {
            return None;
        }
        Some(days[..month_index].iter().sum::<u32>() + day)
    }

    fn days_before_year(year: i32) -> Option<u64> {
        if year < 1 {
            return None;
        }
        let previous = u64::try_from(year - 1).ok()?;
        Some(previous * 365 + previous / 4 - previous / 100 + previous / 400)
    }

    fn dotnet_ticks_for_fm_date(raw: u32) -> Option<u64> {
        let (year, day) = decode_fm_date(raw)?;
        let absolute_day = days_before_year(year)?.checked_add(u64::from(day - 1))?;
        absolute_day.checked_mul(DOTNET_TICKS_PER_DAY)
    }

    fn fm_date_from_dotnet_ticks(value: u64, expected_year: i32) -> Option<u32> {
        let ticks = value & DOTNET_TICKS_MASK;
        let absolute_day = ticks / DOTNET_TICKS_PER_DAY;
        for year in expected_year.saturating_sub(1)..=expected_year.saturating_add(1) {
            let start = days_before_year(year)?;
            let length = u64::from(days_in_year(year));
            if (start..start + length).contains(&absolute_day) {
                let day = u32::try_from(absolute_day - start + 1).ok()?;
                return Some(((year as u32) << 16) | day);
            }
        }
        None
    }

    fn date_distance_days(from: u32, to: u32) -> Option<i64> {
        let (from_year, from_day) = decode_fm_date(from)?;
        let (to_year, to_day) = decode_fm_date(to)?;
        let from_absolute = i64::try_from(days_before_year(from_year)?).ok()?
            + i64::from(from_day - 1);
        let to_absolute = i64::try_from(days_before_year(to_year)?).ok()?
            + i64::from(to_day - 1);
        Some(to_absolute - from_absolute)
    }

    fn collect_date_candidates(
        buffer: &[u8],
        base_address: usize,
        target_raw: u32,
        resolver: &MetaResolver,
        module_static: bool,
        candidates: &mut Vec<DateCandidate>,
    ) {
        let Some((year, _)) = decode_fm_date(target_raw) else {
            return;
        };
        let year_bytes = (year as u16).to_le_bytes();

        for year_index in memchr_iter(year_bytes[0], buffer) {
            if year_index < 2
                || year_index + 1 >= buffer.len()
                || buffer[year_index + 1] != year_bytes[1]
            {
                continue;
            }
            let local = year_index - 2;
            let address = base_address.saturating_add(local);
            if address % 2 != 0 {
                continue;
            }
            let Some(raw) = read_u32(buffer, local) else {
                continue;
            };
            if normalize_fm_date(raw) != target_raw {
                continue;
            }
            candidates.push(DateCandidate {
                address,
                kind: DateCandidateKind::PackedFmDate,
                object_context: has_object_context(buffer, base_address, local, resolver),
                module_static,
            });
        }

        let Some(ticks) = dotnet_ticks_for_fm_date(target_raw) else {
            return;
        };
        for local in memchr_iter(ticks as u8, buffer) {
            let address = base_address.saturating_add(local);
            if address % 8 != 0 || local + 8 > buffer.len() {
                continue;
            }
            let Some(value) = read_u64(buffer, local) else {
                continue;
            };
            if value & DOTNET_TICKS_MASK != ticks {
                continue;
            }
            candidates.push(DateCandidate {
                address,
                kind: DateCandidateKind::DotNetTicks,
                object_context: has_object_context(buffer, base_address, local, resolver),
                module_static,
            });
        }
    }

    fn has_object_context(
        buffer: &[u8],
        base_address: usize,
        local: usize,
        resolver: &MetaResolver,
    ) -> bool {
        let lower = local.saturating_sub(0x180);
        let mut cursor = lower + (8 - base_address.saturating_add(lower) % 8) % 8;
        while cursor + 8 <= local && cursor + 8 <= buffer.len() {
            if read_u64(buffer, cursor)
                .map(|value| resolver.is_module_pointer(value as usize))
                .unwrap_or(false)
            {
                return true;
            }
            cursor += 8;
        }
        false
    }

    fn select_date_candidates(mut candidates: Vec<DateCandidate>) -> Vec<DateCandidate> {
        candidates.sort_by(|left, right| {
            date_candidate_rank(right)
                .cmp(&date_candidate_rank(left))
                .then_with(|| left.address.cmp(&right.address))
        });
        let mut seen = HashSet::<(usize, DateCandidateKind)>::new();
        candidates.retain(|candidate| seen.insert((candidate.address, candidate.kind)));
        candidates.truncate(MAX_MONITOR_DATE_CANDIDATES);
        candidates
    }

    fn date_candidate_rank(candidate: &DateCandidate) -> u8 {
        u8::from(candidate.module_static) * 8
            + u8::from(candidate.object_context) * 4
            + match candidate.kind {
                DateCandidateKind::DotNetTicks => 2,
                DateCandidateKind::PackedFmDate => 1,
            }
    }

    fn normalize_fm_date(raw: u32) -> u32 {
        ((raw >> 16) << 16) | (raw & 0x1FF)
    }

    fn decode_fm_date(raw: u32) -> Option<(i32, u32)> {
        let year = (raw >> 16) as i32;
        let day = raw & 0x1FF;
        if !(1900..=2200).contains(&year) || day == 0 || day > days_in_year(year) {
            return None;
        }
        Some((year, day))
    }

    fn format_fm_date(raw: u32) -> Option<String> {
        let (year, day_of_year) = decode_fm_date(raw)?;
        let (month, day) = month_day(year, day_of_year)?;
        Some(format!("{year:04}-{month:02}-{day:02}"))
    }

    fn month_day(year: i32, mut day_of_year: u32) -> Option<(u32, u32)> {
        let mut days = [31u32, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if is_leap_year(year) {
            days[1] = 29;
        }
        for (index, month_days) in days.into_iter().enumerate() {
            if day_of_year <= month_days {
                return Some((index as u32 + 1, day_of_year));
            }
            day_of_year -= month_days;
        }
        None
    }

    fn days_in_year(year: i32) -> u32 {
        if is_leap_year(year) { 366 } else { 365 }
    }

    fn is_leap_year(year: i32) -> bool {
        year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
    }

    fn age_at(birth_raw: u32, game_raw: Option<u32>, derived_year: i32) -> Option<i32> {
        let (birth_year, birth_day) = decode_fm_date(birth_raw)?;
        let (game_year, game_day) = game_raw
            .and_then(decode_fm_date)
            .unwrap_or((derived_year, 183));
        let age = game_year - birth_year - i32::from(game_day < birth_day);
        (0..=80).contains(&age).then_some(age)
    }

    fn preferred_positions(positions: &BTreeMap<String, u8>) -> String {
        // Include the additional accomplished positions instead of hiding all
        // positions more than two points below the player's strongest one.
        let mut selected=fm_scout::POSITION_GROUPS.iter().flat_map(|group|group.iter())
            .filter(|name| positions.get(**name).copied().unwrap_or(0)>=15)
            .map(|name|(*name).to_string()).collect::<Vec<_>>();
        if selected.is_empty() {
            let rank=fm_scout::position_sort_rank(|position|positions.get(position).copied().unwrap_or(0));
            if let Some(group)=fm_scout::POSITION_GROUPS.get(rank as usize) {
                let top=group.iter().filter_map(|name|positions.get(*name).copied().map(|rating|(*name,rating))).max_by_key(|(_,rating)|*rating);
                if let Some((name,_))=top { selected.push(name.to_string()); }
            }
        }
        selected.join(", ")
    }

    fn foot_label(value: u8) -> &'static str {
        match value {
            0..=3 => "Bardzo słaba",
            4..=8 => "Słaba",
            9..=11 => "Przyzwoita",
            12..=14 => "Względnie mocna",
            15..=17 => "Wysoka",
            _ => "Bardzo mocna",
        }
    }

    fn format_condition(value: u16) -> String {
        if value == 0 {
            String::new()
        } else if value <= 100 {
            value.to_string()
        } else if value <= 10_000 {
            format!("{:.1}", f64::from(value) / 100.0)
        } else {
            value.to_string()
        }
    }

    #[cfg(test)]
    mod native_job_tests {
        use super::*;
        fn resolver() -> MetaResolver {
            let base=0x180000000usize;
            let mut bytes=vec![0u8;0x500];
            bytes[0xF8..0x100].copy_from_slice(&((base+0x200) as u64).to_le_bytes());
            for (offset,value) in [(0x200,1u32),(0x20C,0x300),(0x214,0x200)] {
                bytes[offset..offset+4].copy_from_slice(&value.to_le_bytes());
            }
            let name=b".?AVCLUB@db@@\0";
            bytes[0x310..0x310+name.len()].copy_from_slice(name);
            MetaResolver {game_plugin:ModuleImage{base,end:base+bytes.len(),bytes},
                game_assembly:ModuleImage{base:0,end:0,bytes:Vec::new()},module_low:base,module_high:base+0x500}
        }
        #[test]
        fn native_club_type_is_read_from_validated_relative_rtti() {
            let r=resolver();
            assert_eq!(r.native_type_name(r.game_plugin.base+0x100).as_deref(),Some(".?AVCLUB@db@@"));
        }
        #[test]
        fn corrupt_or_secondary_vtables_cannot_prove_a_club_job() {
            let mut r=resolver();let vtable=r.game_plugin.base+0x100;
            r.game_plugin.bytes[0x214..0x218].copy_from_slice(&0x201u32.to_le_bytes());
            assert!(r.native_type_name(vtable).is_none());
            let mut r=resolver();r.game_plugin.bytes[0x204..0x208].copy_from_slice(&8u32.to_le_bytes());
            assert!(r.native_type_name(vtable).is_none());
            assert!(r.native_type_name(0).is_none());
        }
    }

    fn team_type_label(value: u8) -> &'static str {
        match value {
            0 => "Pierwszy zespół",
            1..=5 => "Rezerwy",
            6..=20 => "Zespół młodzieżowy",
            _ => "Inny zespół",
        }
    }

    fn yes_no(value: bool) -> String {
        if value { "Tak" } else { "Nie" }.to_string()
    }
}

#[cfg(target_os = "windows")]
pub(crate) fn read_fm_native_database() -> Result<FmNativeDatabase, String> {
    windows_reader::read_database()
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn read_fm_native_database() -> Result<FmNativeDatabase, String> {
    Err("Zewnętrzny czytnik bazy FM26 jest dostępny tylko w aplikacji Windows.".to_string())
}

#[cfg(target_os = "windows")]
pub(crate) fn read_fm_date_status() -> FmDateStatus {
    windows_reader::read_date_status()
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn read_fm_date_status() -> FmDateStatus {
    FmDateStatus {
        process_detected: false,
        available: false,
        imported_date: None,
        current_date: None,
        data_stale: false,
        source: "unavailable".to_string(),
        candidate_count: 0,
        error: Some("Monitoring daty FM26 jest dostępny tylko w Windows.".to_string()),
    }
}

#[cfg(target_os = "windows")]
pub(crate) fn search_fm_players(query: crate::fm_scout::ScoutingQuery) -> Result<crate::fm_scout::ScoutingResult,String> {
    windows_reader::search_players(query)
}
#[cfg(not(target_os = "windows"))]
pub(crate) fn search_fm_players(_query: crate::fm_scout::ScoutingQuery) -> Result<crate::fm_scout::ScoutingResult,String> {
    Err("Wyszukiwarka jest dostępna w aplikacji Windows po połączeniu z grą.".into())
}

#[cfg(target_os = "windows")]
pub(crate) fn refresh_fm_native_database() -> Result<FmNativeDatabase,String> { windows_reader::refresh_database() }
#[cfg(not(target_os = "windows"))]
pub(crate) fn refresh_fm_native_database() -> Result<FmNativeDatabase,String> { Err("Szybkie odświeżanie jest dostępne w aplikacji Windows.".into()) }

#[cfg(target_os="windows")]
pub(crate) fn get_player_editor(session_id:u64,uid:u32)->Result<crate::fm_editor::PlayerEditSnapshot,String> {windows_reader::get_player_editor(session_id,uid)}
#[cfg(not(target_os="windows"))]
pub(crate) fn get_player_editor(_session_id:u64,_uid:u32)->Result<crate::fm_editor::PlayerEditSnapshot,String> {Err("Edytor jest dostępny w aplikacji Windows.".into())}
#[cfg(target_os="windows")]
pub(crate) fn apply_player_edit(request:crate::fm_editor::PlayerEditRequest)->Result<crate::fm_editor::PlayerEditResult,String> {windows_reader::apply_player_edit(request)}
#[cfg(not(target_os="windows"))]
pub(crate) fn apply_player_edit(_request:crate::fm_editor::PlayerEditRequest)->Result<crate::fm_editor::PlayerEditResult,String> {Err("Edytor jest dostępny w aplikacji Windows.".into())}
#[cfg(target_os="windows")]
pub(crate) fn undo_player_edit(token:String)->Result<crate::fm_editor::PlayerEditResult,String> {windows_reader::undo_player_edit(token)}
#[cfg(not(target_os="windows"))]
pub(crate) fn undo_player_edit(_token:String)->Result<crate::fm_editor::PlayerEditResult,String> {Err("Edytor jest dostępny w aplikacji Windows.".into())}

#[cfg(target_os="windows")]
pub(crate) fn inspect_league_rules(session_id:u64)->Result<crate::fm_league::LeagueRuleReport,String> {windows_reader::inspect_league_rules(session_id)}
#[cfg(not(target_os="windows"))]
pub(crate) fn inspect_league_rules(_session_id:u64)->Result<crate::fm_league::LeagueRuleReport,String> {Err("Diagnostyka ligi jest dostępna w aplikacji Windows.".into())}

#[cfg(windows)]
pub(crate) fn get_league_u22_editor(session_id:u64)->Result<crate::fm_league::LeagueU22Snapshot,String> {windows_reader::get_league_u22_editor(session_id)}
#[cfg(not(windows))]
pub(crate) fn get_league_u22_editor(_session_id:u64)->Result<crate::fm_league::LeagueU22Snapshot,String> {Err("Edycja zasad ligi jest dostępna w aplikacji Windows.".into())}
#[cfg(windows)]
pub(crate) fn disable_league_u22(token:String)->Result<crate::fm_league::LeagueU22Result,String> {windows_reader::disable_league_u22(token)}
#[cfg(not(windows))]
pub(crate) fn disable_league_u22(_token:String)->Result<crate::fm_league::LeagueU22Result,String> {Err("Edycja zasad ligi jest dostępna w aplikacji Windows.".into())}
#[cfg(windows)]
pub(crate) fn undo_league_u22(token:String)->Result<crate::fm_league::LeagueU22Result,String> {windows_reader::undo_league_u22(token)}
#[cfg(not(windows))]
pub(crate) fn undo_league_u22(_token:String)->Result<crate::fm_league::LeagueU22Result,String> {Err("Edycja zasad ligi jest dostępna w aplikacji Windows.".into())}
