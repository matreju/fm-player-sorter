use std::collections::BTreeMap;

use serde::Serialize;

pub type FmTableRow = BTreeMap<String, String>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmClassOffsetStat {
    pub offset: String,
    pub count: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmNativeDatabase {
    pub pid: u32,
    pub profile: String,
    pub database_player_count: usize,
    pub player_count: usize,
    pub managed_team: Option<String>,
    pub managed_nation: Option<String>,
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
        collections::{BTreeMap, HashMap, HashSet},
        ffi::c_void,
        mem::size_of,
        sync::{Mutex, OnceLock},
        time::Instant,
    };

    use memchr::memchr_iter;

    use windows::Win32::{
        Foundation::{CloseHandle, HANDLE},
        System::{
            Diagnostics::Debug::ReadProcessMemory,
            Memory::{
                VirtualQueryEx, MEMORY_BASIC_INFORMATION, MEM_COMMIT, MEM_PRIVATE,
                PAGE_EXECUTE_READWRITE, PAGE_EXECUTE_WRITECOPY, PAGE_GUARD, PAGE_NOACCESS,
                PAGE_READWRITE, PAGE_WRITECOPY,
            },
            Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ},
        },
    };

    use crate::{
        fm_modules::inspect_fm_modules_blocking,
        fm_process::detect_football_manager,
        fm_reader::{
            FmClassOffsetStat, FmDateStatus, FmNativeDatabase, FmTableRow,
        },
    };

    const PROFILE_NAME: &str = "FM26 26.3.x native database";
    const CHUNK_SIZE: usize = 16 * 1024 * 1024;
    const IMAGE_CHUNK_SIZE: usize = 8 * 1024 * 1024;
    const MAX_REGION_SIZE: usize = 512 * 1024 * 1024;
    const MAX_MONITOR_DATE_CANDIDATES: usize = 2_048;
    const DOTNET_TICKS_PER_DAY: u64 = 864_000_000_000;
    const DOTNET_TICKS_MASK: u64 = (1_u64 << 62) - 1;

    const PLAYER_OFFSET: i32 = 0x288;
    const PLAYER_STAFF_OFFSET: i32 = 0x380;
    const STAFF_OFFSET: i32 = 0x100;
    const HUMAN_MANAGER_OFFSET: i32 = 0x450;

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
    }

    impl RemoteProcess {
        fn open(pid: u32) -> Result<Self, String> {
            let handle = unsafe {
                OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid)
            }
            .map_err(|error| format!("Nie udało się otworzyć pamięci FM: {error}"))?;

            Ok(Self {
                handle: HandleGuard(handle),
            })
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

        fn dynamic_offset(&self, vtable: usize) -> Option<i32> {
            let meta = self.image_u64(vtable.checked_sub(8)?)? as usize;
            let offset = self.image_i32(meta.saturating_add(4))?;
            (offset > 0 && offset < 0x2000).then_some(offset)
        }
    }

    #[derive(Debug)]
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
        person_address: usize,
        staff_address: usize,
    }

    #[derive(Debug, Default)]
    struct ManagedTeamDiagnostics {
        manager_count: usize,
        club_count: usize,
        team_count: usize,
        manager_link_count: usize,
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

    pub(super) fn read_database() -> Result<FmNativeDatabase, String> {
        if let Ok(mut guard) = monitor_slot().lock() {
            *guard = None;
        }

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
        let process = RemoteProcess::open(pid)?;
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

        let mut player_candidates = HashMap::<u32, PlayerCandidate>::new();
        let mut club_candidates = HashSet::<usize>::new();
        let mut human_managers = HashSet::<HumanManagerCandidate>::new();
        let mut class_offset_histogram = HashMap::<i32, u64>::new();
        let mut scanned_bytes = 0u64;

        for &(region_base, region_size) in &regions {
            let mut region_offset = 0usize;
            while region_offset < region_size {
                let request_size = (region_size - region_offset).min(CHUNK_SIZE);
                let chunk_address = region_base.saturating_add(region_offset);
                let Some(buffer) = process.read(chunk_address, request_size) else {
                    region_offset = region_offset.saturating_add(request_size);
                    continue;
                };
                scanned_bytes = scanned_bytes.saturating_add(buffer.len() as u64);

                let mut local = (8 - chunk_address % 8) % 8;
                while local + 0x10 <= buffer.len() {
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

                    let Some(dynamic_offset) = resolver.dynamic_offset(vtable) else {
                        local += 8;
                        continue;
                    };
                    let person_address = chunk_address.saturating_add(local);
                    let uid = read_u32(&buffer, local + OBJ_UID)
                        .or_else(|| process.read_u32(person_address + OBJ_UID))
                        .unwrap_or(0);
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
                    } else if dynamic_offset == HUMAN_MANAGER_OFFSET {
                        let offset = dynamic_offset as usize;
                        if person_address >= offset {
                            let staff_address = person_address - offset;
                            // W menedżerze utworzonym przez gracza CA/PA nie jest
                            // wiarygodnym znacznikiem. To odrzucało poprawny obiekt
                            // HumanManager w części zapisów. Nazwa osoby i właściwy
                            // offset klasy są stabilniejszym potwierdzeniem.
                            if looks_like_named_person(&process, person_address) {
                                human_managers.insert(HumanManagerCandidate {
                                    person_address,
                                    staff_address,
                                });
                            }
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

        let class_offsets = top_class_offsets(&class_offset_histogram);
        if player_candidates.len() < 500 {
            let diagnostic = class_offsets
                .iter()
                .take(6)
                .map(|entry| format!("{}={}", entry.offset, entry.count))
                .collect::<Vec<_>>()
                .join(", ");
            return Err(format!(
                "Profil pamięci FM26 26.3.x nie przeszedł walidacji: znaleziono tylko {} graczy. Najczęstsze offsety klas: {}. Nie pokazano częściowych ani losowych danych.",
                player_candidates.len(), diagnostic
            ));
        }

        let nation_counts = player_candidates
            .values()
            .filter(|candidate| candidate.nation_address != 0)
            .fold(HashMap::<usize, usize>::new(), |mut counts, candidate| {
                *counts.entry(candidate.nation_address).or_default() += 1;
                counts
            });
        let (managed, managed_diagnostics) = resolve_user_national_team(
            &process,
            &club_candidates,
            &human_managers,
            &player_candidates,
            &nation_counts,
        );
        let managed = managed.ok_or_else(|| {
            format!(
                "Wykryto FM26, ale nie udało się powiązać ludzkiego menedżera z prowadzoną reprezentacją. Otwarty ekran gry nie ma znaczenia. Kod diagnostyczny: M{}/K{}/D{}/H{}/R{}.",
                managed_diagnostics.manager_count,
                managed_diagnostics.club_count,
                managed_diagnostics.team_count,
                managed_diagnostics.manager_link_count,
                managed_diagnostics.national_candidate_count,
            )
        })?;
        let manager_team = Some(managed.team_address);
        let managed_team = Some(managed.team_name);
        let managed_nation_address = managed.nation_address;
        let managed_nation = managed.nation_name;
        let managed_gender =
            resolve_managed_squad_gender(&process, managed.team_address, &player_candidates);

        let selected_candidates = player_candidates
            .values()
            .filter(|candidate| {
                candidate.nation_address == managed_nation_address
                    && managed_gender
                        .map(|female| candidate.female == female)
                        .unwrap_or(true)
            })
            .collect::<Vec<_>>();
        if selected_candidates.is_empty() {
            return Err(format!(
                "Rozpoznano reprezentację {managed_nation}, ale nie znaleziono żadnych uprawnionych zawodników w bazie."
            ));
        }

        let database_player_count = player_candidates.len();
        let derived_year = derive_game_year_from_candidates(player_candidates.values());
        let mut players = HashMap::<u32, PlayerRecord>::with_capacity(selected_candidates.len());
        let mut person_to_uid = HashMap::<usize, u32>::with_capacity(selected_candidates.len() * 2);

        for candidate in selected_candidates {
            if let Some(player) = read_player(
                &process,
                candidate.uid,
                candidate.person_address,
                candidate.player_address,
                candidate.ca,
                candidate.pa,
            ) {
                if let Some(club) = player.owner_club_address {
                    club_candidates.insert(club);
                }
                person_to_uid.insert(candidate.person_address, candidate.uid);
                person_to_uid.insert(candidate.player_address, candidate.uid);
                players.insert(candidate.uid, player);
            }
        }

        let squad_links = walk_club_squads(
            &process,
            &club_candidates,
            &person_to_uid,
        );

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
        let monitor_candidates = Vec::<DateCandidate>::new();
        let game_date = None;
        let game_date_source = "unavailable".to_string();

        // Kotwica terminarza służy wyłącznie jako wewnętrzne przybliżenie wieku.
        // Nie pokazujemy jej jako daty świata gry, ponieważ może wskazywać datę
        // ostatniego lub następnego meczu.
        let current_raw = schedule_raw;
        let headers = table_headers();
        let mut rows = players
            .into_values()
            .map(|player| player_to_row(player, current_raw, derived_year))
            .collect::<Vec<_>>();
        rows.sort_by(|left, right| {
            left.get("Nazwisko")
                .cmp(&right.get("Nazwisko"))
                .then_with(|| left.get("UID").cmp(&right.get("UID")))
        });

        Ok(FmNativeDatabase {
            pid,
            profile: PROFILE_NAME.to_string(),
            database_player_count,
            player_count: rows.len(),
            managed_team,
            managed_nation: Some(managed_nation),
            managed_squad_gender: managed_gender.map(|female| {
                if female {
                    "Kobiety".to_string()
                } else {
                    "Mężczyźni".to_string()
                }
            }),
            national_filter_applied: true,
            scan_region_count: regions.len(),
            scanned_bytes,
            scan_duration_ms: started.elapsed().as_millis(),
            game_date,
            game_date_source,
            date_monitor_candidates: monitor_candidates.len(),
            headers,
            rows,
            class_offsets,
        })
    }

    fn read_player(
        process: &RemoteProcess,
        uid: u32,
        person_address: usize,
        player_address: usize,
        ca: u16,
        pa: u16,
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
            process
                .indirect_string(nation_address + 0x20)
                .or_else(|| process.indirect_string(nation_address + 0x30))
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
        let owner_club_address = contract_team
            .and_then(|team| process.read_ptr(team + TEAM_CLUB))
            .filter(|address| *address != 0);
        let owner_club = owner_club_address.and_then(|club| club_name(process, club));
        let division = contract_team.and_then(|team| competition_name(process, team));
        let club_reputation = contract_team
            .and_then(|team| process.read_u16(team + TEAM_REPUTATION))
            .filter(|value| *value <= 12_000)
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
            club: owner_club.clone(),
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

        row.insert("CA".to_string(), player.ca.to_string());
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
            "CA",
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

    fn resolve_user_national_team(
        process: &RemoteProcess,
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

        let mut matches = Vec::<ManagedTeamResolution>::new();
        let mut checked_teams = HashSet::<usize>::new();
        let mut matched_teams = HashSet::<usize>::new();

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

            for index in 0..team_count {
                let Some(team) = process.read_ptr(begin + index * 8).filter(|value| *value != 0)
                else {
                    continue;
                };
                if !checked_teams.insert(team) {
                    continue;
                }
                diagnostics.team_count += 1;
                if !team_points_to_human_manager(process, team, &manager_addresses) {
                    continue;
                }
                diagnostics.manager_link_count += 1;
                if let Some(candidate) = build_managed_team_candidate(
                    process,
                    team,
                    club_name(process, club),
                    &address_to_nation,
                    nation_counts,
                ) {
                    matched_teams.insert(team);
                    diagnostics.national_candidate_count += 1;
                    matches.push(candidate);
                }
            }
        }

        // Niektóre wersje zapisu przechowują aktywną pracę reprezentacyjną
        // wyłącznie na kontrakcie menedżera. To jest bezpieczny fallback, nadal
        // niezależny od ekranu otwartego w grze.
        for manager in human_managers {
            let Some(team) = contract_team(process, manager.person_address) else {
                continue;
            };
            if !matched_teams.insert(team) {
                continue;
            }
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
                matches.push(candidate);
            }
        }

        (
            matches.into_iter().max_by_key(|candidate| candidate.score),
            diagnostics,
        )
    }

    fn team_points_to_human_manager(
        process: &RemoteProcess,
        team: usize,
        manager_addresses: &HashSet<usize>,
    ) -> bool {
        if process
            .read_ptr(team + TEAM_MANAGER)
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
        let Some(bytes) = process.read(team, 0x160) else {
            return false;
        };
        (0..bytes.len().saturating_sub(7))
            .step_by(8)
            .filter_map(|offset| read_u64(&bytes, offset).map(|value| value as usize))
            .any(|reference| manager_addresses.contains(&reference))
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
        let score =
            label_score + squad_score + squad_ratio * 25 + same_nation_players.min(50) * 50;

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
            .indirect_string(nation + 0x20)
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
        direct_weight: usize,
        nested_weight: usize,
        scores: &mut HashMap<usize, usize>,
    ) {
        let Some(bytes) = process.read(base, length) else {
            return;
        };

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
        score_known_nation_pointers(
            process,
            team,
            0x240,
            nation_counts,
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
        let top = positions.values().copied().max().unwrap_or(0);
        let threshold = 15u8.max(top.saturating_sub(2));
        let mut selected = positions
            .iter()
            .filter(|(_, value)| **value >= threshold && **value > 0)
            .map(|(name, value)| (name.clone(), *value))
            .collect::<Vec<_>>();
        selected.sort_by(|left, right| right.1.cmp(&left.1));
        if selected.is_empty() {
            if let Some((name, value)) = positions.iter().max_by_key(|(_, value)| **value) {
                if *value > 0 {
                    selected.push((name.clone(), *value));
                }
            }
        }
        selected
            .into_iter()
            .map(|(name, _)| name)
            .collect::<Vec<_>>()
            .join(", ")
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
