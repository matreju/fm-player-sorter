use std::{
    ffi::c_void,
    fs::File,
    io::Read,
    path::{Path, PathBuf},
    time::Instant,
};

use serde::Serialize;

use crate::{
    fm_build::calculate_sha256,
    fm_modules::{inspect_fm_modules_blocking, FmLoadedModule},
    fm_process::detect_football_manager,
};

pub(crate) const SUPPORTED_PROFILE_ID: &str = "fm26-6000.0.52.8888375-87a0370e9917";
pub(crate) const SUPPORTED_FM_VERSION: &str = "6000.0.52f1-fm26-05f1 (87a0370e9917)";

const EXPECTED_FM_EXE_SHA256: &str =
    "3653c97f9ccec2be28edc4faae67304b5b6c26733f2f07dea3e7c591d3b9ff73";
const EXPECTED_GAME_ASSEMBLY_SHA256: &str =
    "7ce3eb474dc6093df633f979e869e55b2ec7953fde2e732392a694d379ff7a0c";
const EXPECTED_GLOBAL_METADATA_SHA256: &str =
    "52287eadeb07d3d222c9e370e64f308260934911807e2073fb0e72f49c273213";

const IL2CPP_METADATA_MAGIC: u32 = 0xFAB1_1BAF;

/*
 * RVA metody FM_GamePlugin_ReferenceRegistration.Initialise
 * z profilu Cpp2IL dla obsługiwanego buildu FM26.
 *
 * Ten odczyt nie uruchamia funkcji. Sprawdzamy tylko, czy
 * GameAssembly.dll pod adresem po ASLR rzeczywiście jest czytelne.
 */
const GAME_ASSEMBLY_PROBE_RVA: usize = 0x2AA6E0;
const GAME_ASSEMBLY_PROBE_SIZE: usize = 16;

const STATIC_POINTER_PROBE_METHODS: [(&str, usize); 2] = [
    ("GameRecordSerialisation.get_Instance", 0x2AE010),
    ("GamePlugin.get_ChannelDataPool", 0x2A8D50),
];
const STATIC_POINTER_METHOD_BYTES: usize = 128;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmStaticPointerCandidate {
    pub source_method: String,
    pub source_rva: String,
    pub instruction_address: String,
    pub target_address: String,
    pub target_value: Option<String>,
    pub target_value_readable: bool,

    pub value_first_qword: Option<String>,
    pub value_second_qword: Option<String>,
    pub object_class_pointer: Option<String>,
    pub object_type_name: Option<String>,
    pub object_namespace: Option<String>,
    pub direct_class_name: Option<String>,
    pub direct_class_namespace: Option<String>,

    pub static_fields_offset: Option<String>,
    pub static_field_object_pointer: Option<String>,
    pub static_field_object_type: Option<String>,

    pub classification: String,
    pub likely_expected_object: bool,
    pub memory_preview: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmRuntimeInstanceCandidate {
    pub object_address: String,
    pub object_type: String,
    pub class_pointer: String,

    pub game_plugin_bridge_pointer: Option<String>,
    pub game_plugin_bridge_type: Option<String>,

    pub receiver_pointer: Option<String>,
    pub receiver_type: Option<String>,

    pub likely_live_instance: bool,
    pub memory_preview: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmReaderProfileStatus {
    pub process_detected: bool,
    pub pid: Option<u32>,
    pub executable_path: Option<String>,
    pub game_directory: Option<String>,

    pub profile_id: String,
    pub expected_fm_version: String,
    pub supported_build: bool,
    pub runtime_ready: bool,

    pub fm_exe_path: Option<String>,
    pub fm_exe_sha256: Option<String>,
    pub fm_exe_matches: bool,

    pub game_assembly_path: Option<String>,
    pub game_assembly_sha256: Option<String>,
    pub game_assembly_matches: bool,
    pub game_assembly_base: Option<String>,
    pub game_assembly_module_ready: bool,

    pub global_metadata_path: Option<String>,
    pub global_metadata_sha256: Option<String>,
    pub global_metadata_matches: bool,
    pub metadata_header_valid: bool,

    pub game_plugin_path: Option<String>,
    pub game_plugin_base: Option<String>,
    pub game_plugin_module_ready: bool,

    pub method_probe_rva: String,
    pub method_probe_address: Option<String>,
    pub method_probe_readable: bool,
    pub method_probe_bytes: Option<String>,

    pub static_pointer_candidates: Vec<FmStaticPointerCandidate>,
    pub resolved_runtime_root_count: usize,

    pub game_record_serialisation_object: Option<String>,
    pub channel_data_pool_object: Option<String>,
    pub game_plugin_class_pointer: Option<String>,
    pub game_plugin_instances: Vec<FmRuntimeInstanceCandidate>,
    pub instance_scan_bytes: u64,
    pub instance_scan_duration_ms: u128,
    pub instance_scan_truncated: bool,

    pub database_root_profile_ready: bool,
    pub error: Option<String>,
}

impl FmReaderProfileStatus {
    fn empty(error: Option<String>) -> Self {
        Self {
            process_detected: false,
            pid: None,
            executable_path: None,
            game_directory: None,

            profile_id: SUPPORTED_PROFILE_ID.to_string(),
            expected_fm_version: SUPPORTED_FM_VERSION.to_string(),
            supported_build: false,
            runtime_ready: false,

            fm_exe_path: None,
            fm_exe_sha256: None,
            fm_exe_matches: false,

            game_assembly_path: None,
            game_assembly_sha256: None,
            game_assembly_matches: false,
            game_assembly_base: None,
            game_assembly_module_ready: false,

            global_metadata_path: None,
            global_metadata_sha256: None,
            global_metadata_matches: false,
            metadata_header_valid: false,

            game_plugin_path: None,
            game_plugin_base: None,
            game_plugin_module_ready: false,

            method_probe_rva: format!("0x{GAME_ASSEMBLY_PROBE_RVA:X}"),
            method_probe_address: None,
            method_probe_readable: false,
            method_probe_bytes: None,

            static_pointer_candidates: Vec::new(),
            resolved_runtime_root_count: 0,

            game_record_serialisation_object: None,
            channel_data_pool_object: None,
            game_plugin_class_pointer: None,
            game_plugin_instances: Vec::new(),
            instance_scan_bytes: 0,
            instance_scan_duration_ms: 0,
            instance_scan_truncated: false,

            database_root_profile_ready: false,
            error,
        }
    }
}

#[tauri::command]
pub async fn inspect_fm_reader_profile() -> Result<FmReaderProfileStatus, String> {
    tauri::async_runtime::spawn_blocking(inspect_fm_reader_profile_blocking)
        .await
        .map_err(|error| format!("Wątek profilu czytnika FM zakończył się błędem: {error}"))?
}

pub(crate) fn inspect_fm_reader_profile_blocking() -> Result<FmReaderProfileStatus, String> {
    let process = detect_football_manager();

    if !process.detected {
        return Ok(FmReaderProfileStatus::empty(None));
    }

    let pid = process
        .pid
        .ok_or_else(|| "FM został wykryty, ale nie udało się odczytać PID.".to_string())?;

    let executable_path = process.executable_path.ok_or_else(|| {
        "FM został wykryty, ale nie udało się odczytać ścieżki fm.exe.".to_string()
    })?;

    let fm_exe_path = PathBuf::from(&executable_path);
    let game_directory = fm_exe_path
        .parent()
        .ok_or_else(|| "Nie udało się ustalić folderu Football Managera.".to_string())?
        .to_path_buf();

    let game_assembly_path = game_directory.join("GameAssembly.dll");
    let global_metadata_path = game_directory
        .join("fm_Data")
        .join("il2cpp_data")
        .join("Metadata")
        .join("global-metadata.dat");

    let fm_exe_sha256 = hash_optional(&fm_exe_path);
    let game_assembly_sha256 = hash_optional(&game_assembly_path);
    let global_metadata_sha256 = hash_optional(&global_metadata_path);

    let fm_exe_matches = hash_matches(&fm_exe_sha256, EXPECTED_FM_EXE_SHA256);
    let game_assembly_matches = hash_matches(&game_assembly_sha256, EXPECTED_GAME_ASSEMBLY_SHA256);
    let global_metadata_matches =
        hash_matches(&global_metadata_sha256, EXPECTED_GLOBAL_METADATA_SHA256);

    let metadata_header_valid = read_metadata_magic(&global_metadata_path)
        .map(|magic| magic == IL2CPP_METADATA_MAGIC)
        .unwrap_or(false);

    let module_report = inspect_fm_modules_blocking();

    let mut game_assembly_module: Option<FmLoadedModule> = None;
    let mut game_plugin_module: Option<FmLoadedModule> = None;
    let mut module_error: Option<String> = None;

    match module_report {
        Ok(report) => {
            for module in report.modules {
                let normalized_name = module.name.to_ascii_lowercase();

                if normalized_name == "gameassembly.dll" {
                    game_assembly_module = Some(module.clone());
                }

                if normalized_name == "game_plugin.dll"
                    || normalized_name == "fm.gameplugin.dll"
                    || normalized_name.contains("game_plugin")
                {
                    game_plugin_module = Some(module);
                }
            }
        }
        Err(error) => {
            module_error = Some(error);
        }
    }

    let game_assembly_module_ready = game_assembly_module.is_some();
    let game_plugin_module_ready = game_plugin_module.is_some();

    let game_assembly_base = game_assembly_module
        .as_ref()
        .map(|module| module.base_address.clone());

    let game_plugin_base = game_plugin_module
        .as_ref()
        .map(|module| module.base_address.clone());

    let game_plugin_path = game_plugin_module
        .as_ref()
        .map(|module| module.path.clone());

    let mut method_probe_address = None;
    let mut method_probe_readable = false;
    let mut method_probe_bytes = None;

    if let Some(base_text) = game_assembly_base.as_deref() {
        if let Some(base_address) = parse_hex_address(base_text) {
            let probe_address = base_address.saturating_add(GAME_ASSEMBLY_PROBE_RVA);

            method_probe_address = Some(format!("0x{probe_address:X}"));

            match read_remote_bytes(pid, probe_address, GAME_ASSEMBLY_PROBE_SIZE) {
                Ok(bytes) => {
                    method_probe_readable = bytes.len() == GAME_ASSEMBLY_PROBE_SIZE;
                    method_probe_bytes = Some(bytes_to_hex(&bytes));
                }
                Err(error) => {
                    module_error = Some(match module_error {
                        Some(previous) => format!("{previous} {error}"),
                        None => error,
                    });
                }
            }
        }
    }

    let static_pointer_candidates = game_assembly_base
        .as_deref()
        .and_then(parse_hex_address)
        .map(|base_address| collect_static_pointer_candidates(pid, base_address))
        .unwrap_or_default();

    let resolved_runtime_root_count = static_pointer_candidates
        .iter()
        .filter(|candidate| candidate.likely_expected_object)
        .count();

    let game_record_serialisation_object = static_pointer_candidates
        .iter()
        .find(|candidate| {
            candidate.source_method.contains("GameRecordSerialisation")
                && candidate.likely_expected_object
        })
        .and_then(|candidate| candidate.static_field_object_pointer.clone());

    let channel_data_pool_object = static_pointer_candidates
        .iter()
        .find(|candidate| {
            candidate.source_method.contains("ChannelDataPool") && candidate.likely_expected_object
        })
        .and_then(|candidate| candidate.static_field_object_pointer.clone());

    let game_plugin_class_pointer = static_pointer_candidates
        .iter()
        .find(|candidate| {
            candidate.source_method.contains("ChannelDataPool")
                && candidate.direct_class_name.as_deref() == Some("GamePlugin")
                && candidate.direct_class_namespace.as_deref() == Some("FM.GamePlugin")
        })
        .and_then(|candidate| candidate.target_value.clone());

    let instance_scan = game_plugin_class_pointer
        .as_deref()
        .and_then(parse_hex_address)
        .map(|class_pointer| scan_game_plugin_instances(pid, class_pointer))
        .unwrap_or_default();

    let supported_build =
        fm_exe_matches && game_assembly_matches && global_metadata_matches && metadata_header_valid;

    let runtime_ready = supported_build
        && game_assembly_module_ready
        && game_plugin_module_ready
        && method_probe_readable;

    let error = if let Some(error) = module_error {
        Some(error)
    } else if !fm_exe_matches {
        Some("Hash fm.exe nie pasuje do obsługiwanego profilu FM26.".to_string())
    } else if !game_assembly_matches {
        Some("Hash GameAssembly.dll nie pasuje do obsługiwanego profilu FM26.".to_string())
    } else if !global_metadata_matches {
        Some("Hash global-metadata.dat nie pasuje do obsługiwanego profilu FM26.".to_string())
    } else if !metadata_header_valid {
        Some("Plik global-metadata.dat nie ma prawidłowego nagłówka IL2CPP.".to_string())
    } else if !game_assembly_module_ready {
        Some("GameAssembly.dll nie jest załadowane w procesie FM.".to_string())
    } else if !game_plugin_module_ready {
        Some("game_plugin.dll nie jest załadowany w procesie FM.".to_string())
    } else if !method_probe_readable {
        Some("Profil buildu pasuje, ale testowy adres GameAssembly nie jest czytelny.".to_string())
    } else {
        None
    };

    Ok(FmReaderProfileStatus {
        process_detected: true,
        pid: Some(pid),
        executable_path: Some(executable_path.clone()),
        game_directory: Some(game_directory.to_string_lossy().to_string()),

        profile_id: SUPPORTED_PROFILE_ID.to_string(),
        expected_fm_version: SUPPORTED_FM_VERSION.to_string(),
        supported_build,
        runtime_ready,

        fm_exe_path: Some(executable_path),
        fm_exe_sha256,
        fm_exe_matches,

        game_assembly_path: Some(game_assembly_path.to_string_lossy().to_string()),
        game_assembly_sha256,
        game_assembly_matches,
        game_assembly_base,
        game_assembly_module_ready,

        global_metadata_path: Some(global_metadata_path.to_string_lossy().to_string()),
        global_metadata_sha256,
        global_metadata_matches,
        metadata_header_valid,

        game_plugin_path,
        game_plugin_base,
        game_plugin_module_ready,

        method_probe_rva: format!("0x{GAME_ASSEMBLY_PROBE_RVA:X}"),
        method_probe_address,
        method_probe_readable,
        method_probe_bytes,

        static_pointer_candidates,
        resolved_runtime_root_count,

        game_record_serialisation_object,
        channel_data_pool_object,
        game_plugin_class_pointer,
        game_plugin_instances: instance_scan.instances,
        instance_scan_bytes: instance_scan.scanned_bytes,
        instance_scan_duration_ms: instance_scan.duration_ms,
        instance_scan_truncated: instance_scan.truncated,

        /*
         * Profil plików i typów jest gotowy. Brakuje jeszcze stabilnej
         * sygnatury/pointer-chain prowadzącej do głównego rejestru bazy.
         */
        database_root_profile_ready: false,
        error,
    })
}

#[derive(Default)]
struct GamePluginInstanceScan {
    instances: Vec<FmRuntimeInstanceCandidate>,
    scanned_bytes: u64,
    duration_ms: u128,
    truncated: bool,
}

fn scan_game_plugin_instances(pid: u32, class_pointer: usize) -> GamePluginInstanceScan {
    #[cfg(target_os = "windows")]
    {
        scan_game_plugin_instances_windows(pid, class_pointer)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = pid;
        let _ = class_pointer;
        GamePluginInstanceScan::default()
    }
}

#[cfg(target_os = "windows")]
fn scan_game_plugin_instances_windows(pid: u32, class_pointer: usize) -> GamePluginInstanceScan {
    use std::{ffi::c_void, mem::size_of};

    use windows::Win32::{
        Foundation::{CloseHandle, HANDLE},
        System::{
            Diagnostics::Debug::ReadProcessMemory,
            Memory::{
                VirtualQueryEx, MEMORY_BASIC_INFORMATION, MEM_COMMIT, PAGE_EXECUTE_READWRITE,
                PAGE_EXECUTE_WRITECOPY, PAGE_GUARD, PAGE_READWRITE, PAGE_WRITECOPY,
            },
            Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ},
        },
    };

    struct HandleGuard(HANDLE);

    impl Drop for HandleGuard {
        fn drop(&mut self) {
            unsafe {
                let _ = CloseHandle(self.0);
            }
        }
    }

    const CHUNK_SIZE: usize = 4 * 1024 * 1024;
    const MAX_MATCHES: usize = 16;
    const MAX_SCANNED_BYTES: u64 = 3 * 1024 * 1024 * 1024;

    let started_at = Instant::now();
    let Ok(handle) =
        (unsafe { OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid) })
    else {
        return GamePluginInstanceScan::default();
    };

    let process = HandleGuard(handle);
    let pattern = (class_pointer as u64).to_le_bytes();

    let mut scan = GamePluginInstanceScan::default();
    let mut address = 0usize;

    loop {
        let mut info = MEMORY_BASIC_INFORMATION::default();

        let queried = unsafe {
            VirtualQueryEx(
                process.0,
                Some(address as *const c_void),
                &mut info,
                size_of::<MEMORY_BASIC_INFORMATION>(),
            )
        };

        if queried == 0 {
            break;
        }

        let base = info.BaseAddress as usize;
        let region_size = info.RegionSize;
        let next = base.saturating_add(region_size);

        if next <= address {
            break;
        }

        address = next;

        if !should_scan_instance_region(&info) {
            continue;
        }

        let mut offset = 0usize;

        while offset < region_size {
            if scan.instances.len() >= MAX_MATCHES {
                scan.truncated = true;
                break;
            }

            if scan.scanned_bytes >= MAX_SCANNED_BYTES {
                scan.truncated = true;
                break;
            }

            let remaining = region_size - offset;
            let request_size = remaining.min(CHUNK_SIZE);
            let chunk_address = base.saturating_add(offset);

            let mut buffer = vec![0u8; request_size];
            let mut bytes_read = 0usize;

            let read_result = unsafe {
                ReadProcessMemory(
                    process.0,
                    chunk_address as *const c_void,
                    buffer.as_mut_ptr() as *mut c_void,
                    request_size,
                    Some(&mut bytes_read as *mut usize),
                )
            };

            if read_result.is_ok() && bytes_read >= 8 {
                buffer.truncate(bytes_read);
                scan.scanned_bytes = scan.scanned_bytes.saturating_add(bytes_read as u64);

                let alignment = (8 - (chunk_address % 8)) % 8;
                let mut local = alignment;

                while local + 8 <= buffer.len() {
                    if buffer[local..local + 8] == pattern {
                        let object_address = chunk_address.saturating_add(local);

                        if let Some(candidate) =
                            probe_game_plugin_instance(pid, object_address, class_pointer)
                        {
                            let duplicate = scan.instances.iter().any(|existing| {
                                existing.object_address == candidate.object_address
                            });

                            if !duplicate {
                                scan.instances.push(candidate);
                            }
                        }
                    }

                    local += 8;
                }
            }

            offset = offset.saturating_add(request_size);
        }

        if scan.truncated {
            break;
        }
    }

    scan.duration_ms = started_at.elapsed().as_millis();
    scan
}

#[cfg(target_os = "windows")]
fn should_scan_instance_region(
    info: &windows::Win32::System::Memory::MEMORY_BASIC_INFORMATION,
) -> bool {
    use windows::Win32::System::Memory::{
        MEM_COMMIT, PAGE_EXECUTE_READWRITE, PAGE_EXECUTE_WRITECOPY, PAGE_GUARD, PAGE_READWRITE,
        PAGE_WRITECOPY,
    };

    if info.State != MEM_COMMIT || info.Protect.0 & PAGE_GUARD.0 != 0 {
        return false;
    }

    let protection = info.Protect.0 & 0xFF;

    protection == PAGE_READWRITE.0
        || protection == PAGE_WRITECOPY.0
        || protection == PAGE_EXECUTE_READWRITE.0
        || protection == PAGE_EXECUTE_WRITECOPY.0
}

fn probe_game_plugin_instance(
    pid: u32,
    object_address: usize,
    class_pointer: usize,
) -> Option<FmRuntimeInstanceCandidate> {
    let bytes = read_remote_bytes(pid, object_address, 0x48).ok()?;

    if qword_at(&bytes, 0)? as usize != class_pointer {
        return None;
    }

    let (namespace_name, class_name) = read_il2cpp_class_identity(pid, class_pointer)?;

    if namespace_name != "FM.GamePlugin" || class_name != "GamePlugin" {
        return None;
    }

    let bridge_pointer = qword_at(&bytes, 0x28).filter(|value| *value != 0);
    let receiver_pointer = qword_at(&bytes, 0x30).filter(|value| *value != 0);

    let bridge_type =
        bridge_pointer.and_then(|pointer| read_object_full_type(pid, pointer as usize));

    let receiver_type =
        receiver_pointer.and_then(|pointer| read_object_full_type(pid, pointer as usize));

    let likely_live_instance = bridge_pointer.is_some()
        && receiver_type
            .as_deref()
            .map(|value| value == "FM.GamePlugin.GameReceiver")
            .unwrap_or(false);

    Some(FmRuntimeInstanceCandidate {
        object_address: format!("0x{object_address:X}"),
        object_type: "FM.GamePlugin.GamePlugin".to_string(),
        class_pointer: format!("0x{class_pointer:X}"),

        game_plugin_bridge_pointer: bridge_pointer.map(|value| format!("0x{value:X}")),
        game_plugin_bridge_type: bridge_type,

        receiver_pointer: receiver_pointer.map(|value| format!("0x{value:X}")),
        receiver_type,

        likely_live_instance,
        memory_preview: Some(bytes_to_hex(&bytes[..bytes.len().min(0x40)])),
    })
}

fn read_object_full_type(pid: u32, object_address: usize) -> Option<String> {
    let class_pointer = read_remote_u64(pid, object_address)? as usize;
    let (namespace_name, class_name) = read_il2cpp_class_identity(pid, class_pointer)?;

    if namespace_name.is_empty() {
        Some(class_name)
    } else {
        Some(format!("{namespace_name}.{class_name}"))
    }
}

fn hash_optional(path: &Path) -> Option<String> {
    if !path.is_file() {
        return None;
    }

    calculate_sha256(&path.to_string_lossy()).ok()
}

fn hash_matches(actual: &Option<String>, expected: &str) -> bool {
    actual
        .as_deref()
        .map(|value| value.eq_ignore_ascii_case(expected))
        .unwrap_or(false)
}

fn read_metadata_magic(path: &Path) -> Result<u32, String> {
    let mut file = File::open(path)
        .map_err(|error| format!("Nie udało się otworzyć global-metadata.dat: {error}"))?;

    let mut bytes = [0_u8; 4];

    file.read_exact(&mut bytes)
        .map_err(|error| format!("Nie udało się odczytać nagłówka global-metadata.dat: {error}"))?;

    Ok(u32::from_le_bytes(bytes))
}

fn parse_hex_address(value: &str) -> Option<usize> {
    usize::from_str_radix(value.trim_start_matches("0x").trim_start_matches("0X"), 16).ok()
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|byte| format!("{byte:02X}"))
        .collect::<Vec<_>>()
        .join(" ")
}

fn collect_static_pointer_candidates(
    pid: u32,
    game_assembly_base: usize,
) -> Vec<FmStaticPointerCandidate> {
    let mut result = Vec::new();

    for (source_method, source_rva) in STATIC_POINTER_PROBE_METHODS {
        let method_address = game_assembly_base.saturating_add(source_rva);

        let Ok(bytes) = read_remote_bytes(pid, method_address, STATIC_POINTER_METHOD_BYTES) else {
            continue;
        };

        if bytes.len() < 7 {
            continue;
        }

        for index in 0..=bytes.len().saturating_sub(7) {
            let rex = bytes[index];
            let opcode = bytes[index + 1];
            let mod_rm = bytes[index + 2];

            let has_rex_prefix = rex == 0x48 || rex == 0x4C;
            let is_rip_relative_opcode = opcode == 0x8B || opcode == 0x8D;
            let is_rip_relative_operand = mod_rm & 0xC7 == 0x05;

            if !has_rex_prefix || !is_rip_relative_opcode || !is_rip_relative_operand {
                continue;
            }

            let displacement = i32::from_le_bytes([
                bytes[index + 3],
                bytes[index + 4],
                bytes[index + 5],
                bytes[index + 6],
            ]);

            let instruction_address = method_address.saturating_add(index);
            let next_instruction = instruction_address.saturating_add(7);

            let target_address = if displacement >= 0 {
                next_instruction.saturating_add(displacement as usize)
            } else {
                next_instruction.saturating_sub(displacement.unsigned_abs() as usize)
            };

            let target_bytes = read_remote_bytes(pid, target_address, 8).ok();

            let target_value = target_bytes.as_deref().and_then(|value| {
                if value.len() < 8 {
                    return None;
                }

                Some(u64::from_le_bytes([
                    value[0], value[1], value[2], value[3], value[4], value[5], value[6], value[7],
                ]))
            });

            let pointer_probe = target_value
                .map(|value| probe_pointer_value(pid, source_method, value as usize))
                .unwrap_or_default();

            let candidate = FmStaticPointerCandidate {
                source_method: source_method.to_string(),
                source_rva: format!("0x{source_rva:X}"),
                instruction_address: format!("0x{instruction_address:X}"),
                target_address: format!("0x{target_address:X}"),
                target_value: target_value.map(|value| format!("0x{value:X}")),
                target_value_readable: target_bytes
                    .as_ref()
                    .map(|value| value.len() == 8)
                    .unwrap_or(false),

                value_first_qword: pointer_probe
                    .value_first_qword
                    .map(|value| format!("0x{value:X}")),
                value_second_qword: pointer_probe
                    .value_second_qword
                    .map(|value| format!("0x{value:X}")),
                object_class_pointer: pointer_probe
                    .object_class_pointer
                    .map(|value| format!("0x{value:X}")),
                object_type_name: pointer_probe.object_type_name,
                object_namespace: pointer_probe.object_namespace,
                direct_class_name: pointer_probe.direct_class_name,
                direct_class_namespace: pointer_probe.direct_class_namespace,

                static_fields_offset: pointer_probe
                    .static_fields_offset
                    .map(|value| format!("0x{value:X}")),
                static_field_object_pointer: pointer_probe
                    .static_field_object_pointer
                    .map(|value| format!("0x{value:X}")),
                static_field_object_type: pointer_probe.static_field_object_type,

                classification: pointer_probe.classification,
                likely_expected_object: pointer_probe.likely_expected_object,
                memory_preview: pointer_probe.memory_preview,
            };

            let duplicate = result.iter().any(|existing: &FmStaticPointerCandidate| {
                existing.source_method == candidate.source_method
                    && existing.target_address == candidate.target_address
            });

            if !duplicate {
                result.push(candidate);
            }
        }
    }

    result
}

#[derive(Default)]
struct PointerValueProbe {
    value_first_qword: Option<u64>,
    value_second_qword: Option<u64>,
    object_class_pointer: Option<u64>,
    object_type_name: Option<String>,
    object_namespace: Option<String>,
    direct_class_name: Option<String>,
    direct_class_namespace: Option<String>,
    static_fields_offset: Option<usize>,
    static_field_object_pointer: Option<u64>,
    static_field_object_type: Option<String>,
    classification: String,
    likely_expected_object: bool,
    memory_preview: Option<String>,
}

fn probe_pointer_value(pid: u32, source_method: &str, address: usize) -> PointerValueProbe {
    let mut probe = PointerValueProbe {
        classification: "nieznany wskaźnik lub dane runtime".to_string(),
        ..PointerValueProbe::default()
    };

    let Ok(bytes) = read_remote_bytes(pid, address, 96) else {
        probe.classification = "wartość wskazuje na nieczytelną pamięć".to_string();
        return probe;
    };

    if bytes.len() < 16 {
        probe.classification = "za mało danych do rozpoznania".to_string();
        return probe;
    }

    probe.memory_preview = Some(bytes_to_hex(&bytes[..bytes.len().min(48)]));

    let first = qword_at(&bytes, 0);
    let second = qword_at(&bytes, 8);

    probe.value_first_qword = first;
    probe.value_second_qword = second;
    probe.object_class_pointer = first;

    if let Some(class_pointer) = first {
        if let Some((namespace_name, class_name)) =
            read_il2cpp_class_identity(pid, class_pointer as usize)
        {
            probe.object_namespace = Some(namespace_name.clone());
            probe.object_type_name = Some(class_name.clone());
            probe.classification = "obiekt IL2CPP".to_string();

            if expected_type_matches(source_method, &namespace_name, &class_name) {
                probe.likely_expected_object = true;
            }
        }
    }

    if let Some((namespace_name, class_name)) = read_il2cpp_class_identity(pid, address) {
        probe.direct_class_namespace = Some(namespace_name.clone());
        probe.direct_class_name = Some(class_name.clone());

        if probe.object_type_name.is_none() {
            probe.classification = "Il2CppClass / metadane typu".to_string();
        }

        if let Some(static_field_probe) = probe_expected_static_field(pid, source_method, address) {
            probe.static_fields_offset = Some(static_field_probe.offset);
            probe.static_field_object_pointer = Some(static_field_probe.object_pointer);
            probe.static_field_object_type = Some(static_field_probe.full_type_name);
            probe.likely_expected_object = true;
            probe.classification =
                "Il2CppClass ze znalezionym obiektem pola statycznego".to_string();
        }
    }

    probe
}

struct StaticFieldProbe {
    offset: usize,
    object_pointer: u64,
    full_type_name: String,
}

fn probe_expected_static_field(
    pid: u32,
    source_method: &str,
    class_address: usize,
) -> Option<StaticFieldProbe> {
    const STATIC_FIELD_OFFSETS: [usize; 12] = [
        0xA8, 0xB0, 0xB8, 0xC0, 0xC8, 0xD0, 0xD8, 0xE0, 0xE8, 0xF0, 0xF8, 0x100,
    ];

    for offset in STATIC_FIELD_OFFSETS {
        let static_fields_pointer = read_remote_u64(pid, class_address.saturating_add(offset))?;

        if static_fields_pointer == 0 {
            continue;
        }

        let object_pointer = read_remote_u64(pid, static_fields_pointer as usize)?;

        if object_pointer == 0 {
            continue;
        }

        let object_class_pointer = read_remote_u64(pid, object_pointer as usize)?;

        let Some((namespace_name, class_name)) =
            read_il2cpp_class_identity(pid, object_class_pointer as usize)
        else {
            continue;
        };

        if expected_type_matches(source_method, &namespace_name, &class_name) {
            let full_type_name = if namespace_name.is_empty() {
                class_name
            } else {
                format!("{namespace_name}.{class_name}")
            };

            return Some(StaticFieldProbe {
                offset,
                object_pointer,
                full_type_name,
            });
        }
    }

    None
}

fn expected_type_matches(source_method: &str, namespace_name: &str, class_name: &str) -> bool {
    let full_name = if namespace_name.is_empty() {
        class_name.to_string()
    } else {
        format!("{namespace_name}.{class_name}")
    };

    if source_method.contains("GameRecordSerialisation") {
        return full_name.contains("GameRecordSerialisation");
    }

    if source_method.contains("ChannelDataPool") {
        return full_name.contains("Pool") || full_name.contains("ChannelData");
    }

    false
}

fn read_il2cpp_class_identity(pid: u32, class_address: usize) -> Option<(String, String)> {
    if class_address < 0x10_000 {
        return None;
    }

    let class_header = read_remote_bytes(pid, class_address.saturating_add(0x10), 16).ok()?;

    let name_pointer = qword_at(&class_header, 0)? as usize;
    let namespace_pointer = qword_at(&class_header, 8)? as usize;

    let class_name = read_remote_c_string(pid, name_pointer, 160)?;

    if !looks_like_runtime_identifier(&class_name) {
        return None;
    }

    let namespace_name = if namespace_pointer == 0 {
        String::new()
    } else {
        read_remote_c_string(pid, namespace_pointer, 160).unwrap_or_default()
    };

    if !namespace_name.is_empty() && !looks_like_runtime_identifier(&namespace_name) {
        return None;
    }

    Some((namespace_name, class_name))
}

fn read_remote_c_string(pid: u32, address: usize, max_length: usize) -> Option<String> {
    if address < 0x10_000 || max_length == 0 {
        return None;
    }

    let bytes = read_remote_bytes(pid, address, max_length).ok()?;
    let end = bytes
        .iter()
        .position(|byte| *byte == 0)
        .unwrap_or(bytes.len());

    if end == 0 {
        return None;
    }

    let text = std::str::from_utf8(&bytes[..end]).ok()?.trim().to_string();

    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

fn looks_like_runtime_identifier(value: &str) -> bool {
    if value.is_empty() || value.len() > 150 {
        return false;
    }

    value.bytes().all(|byte| {
        byte.is_ascii_alphanumeric()
            || matches!(
                byte,
                b'.' | b'_'
                    | b'`'
                    | b'+'
                    | b'<'
                    | b'>'
                    | b','
                    | b'['
                    | b']'
                    | b'/'
                    | b'&'
                    | b'*'
                    | b' '
            )
    })
}

fn qword_at(bytes: &[u8], offset: usize) -> Option<u64> {
    let slice = bytes.get(offset..offset.saturating_add(8))?;

    Some(u64::from_le_bytes([
        slice[0], slice[1], slice[2], slice[3], slice[4], slice[5], slice[6], slice[7],
    ]))
}

fn read_remote_u64(pid: u32, address: usize) -> Option<u64> {
    let bytes = read_remote_bytes(pid, address, 8).ok()?;
    qword_at(&bytes, 0)
}

#[cfg(target_os = "windows")]
fn read_remote_bytes(pid: u32, address: usize, length: usize) -> Result<Vec<u8>, String> {
    use windows::Win32::{
        Foundation::{CloseHandle, HANDLE},
        System::{
            Diagnostics::Debug::ReadProcessMemory,
            Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ},
        },
    };

    struct HandleGuard(HANDLE);

    impl Drop for HandleGuard {
        fn drop(&mut self) {
            unsafe {
                let _ = CloseHandle(self.0);
            }
        }
    }

    let process_handle =
        unsafe { OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid) }
            .map(HandleGuard)
            .map_err(|error| {
                format!("Nie udało się otworzyć procesu FM do testu profilu: {error}")
            })?;

    let mut buffer = vec![0_u8; length];
    let mut bytes_read = 0_usize;

    unsafe {
        ReadProcessMemory(
            process_handle.0,
            address as *const c_void,
            buffer.as_mut_ptr() as *mut c_void,
            length,
            Some(&mut bytes_read as *mut usize),
        )
    }
    .map_err(|error| {
        format!("Nie udało się odczytać GameAssembly pod adresem 0x{address:X}: {error}")
    })?;

    buffer.truncate(bytes_read);

    Ok(buffer)
}

#[cfg(not(target_os = "windows"))]
fn read_remote_bytes(_pid: u32, _address: usize, _length: usize) -> Result<Vec<u8>, String> {
    Err("Zewnętrzny odczyt pamięci FM jest przygotowany tylko dla Windows.".to_string())
}
