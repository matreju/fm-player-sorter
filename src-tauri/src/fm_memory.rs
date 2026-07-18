use serde::Serialize;

use crate::fm_process::detect_football_manager;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FmMemoryStatus {
    pub process_detected: bool,
    pub memory_readable: bool,

    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub executable_path: Option<String>,

    pub module_base_address: Option<String>,
    pub module_size: Option<u32>,
    pub executable_signature: Option<String>,

    pub error: Option<String>,
}

impl FmMemoryStatus {
    fn not_detected() -> Self {
        Self {
            process_detected: false,
            memory_readable: false,

            pid: None,
            process_name: None,
            executable_path: None,

            module_base_address: None,
            module_size: None,
            executable_signature: None,

            error: None,
        }
    }

    fn failed(
        pid: u32,
        process_name: Option<String>,
        executable_path: Option<String>,
        error: String,
    ) -> Self {
        Self {
            process_detected: true,
            memory_readable: false,

            pid: Some(pid),
            process_name,
            executable_path,

            module_base_address: None,
            module_size: None,
            executable_signature: None,

            error: Some(error),
        }
    }
}

#[tauri::command]
pub fn probe_fm_memory() -> FmMemoryStatus {
    let process = detect_football_manager();

    if !process.detected {
        return FmMemoryStatus::not_detected();
    }

    let Some(pid) = process.pid else {
        return FmMemoryStatus {
            process_detected: true,
            memory_readable: false,

            pid: None,
            process_name: process.process_name,
            executable_path: process.executable_path,

            module_base_address: None,
            module_size: None,
            executable_signature: None,

            error: Some(
                "Football Manager został wykryty, ale nie udało się pobrać PID.".to_string(),
            ),
        };
    };

    #[cfg(target_os = "windows")]
    {
        probe_fm_memory_windows(pid, process.process_name, process.executable_path)
    }

    #[cfg(not(target_os = "windows"))]
    {
        FmMemoryStatus::failed(
            pid,
            process.process_name,
            process.executable_path,
            "Odczyt pamięci jest obecnie przygotowany tylko dla Windows.".to_string(),
        )
    }
}

#[cfg(target_os = "windows")]
fn probe_fm_memory_windows(
    pid: u32,
    process_name: Option<String>,
    executable_path: Option<String>,
) -> FmMemoryStatus {
    use std::ffi::c_void;
    use std::mem::size_of;

    use windows::Win32::Foundation::{CloseHandle, HANDLE};

    use windows::Win32::System::Diagnostics::Debug::ReadProcessMemory;

    use windows::Win32::System::Diagnostics::ToolHelp::{
        CreateToolhelp32Snapshot, Module32FirstW, MODULEENTRY32W, TH32CS_SNAPMODULE,
        TH32CS_SNAPMODULE32,
    };

    use windows::Win32::System::Threading::{
        OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ,
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
        match unsafe { OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid) } {
            Ok(handle) => HandleGuard(handle),

            Err(error) => {
                return FmMemoryStatus::failed(
                    pid,
                    process_name,
                    executable_path,
                    format!("Nie udało się otworzyć pamięci procesu FM: {error}"),
                );
            }
        };

    let module_snapshot =
        match unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, pid) } {
            Ok(handle) => HandleGuard(handle),

            Err(error) => {
                return FmMemoryStatus::failed(
                    pid,
                    process_name,
                    executable_path,
                    format!("Nie udało się pobrać listy modułów procesu FM: {error}"),
                );
            }
        };

    let mut module_entry = MODULEENTRY32W::default();

    module_entry.dwSize = size_of::<MODULEENTRY32W>() as u32;

    if let Err(error) = unsafe { Module32FirstW(module_snapshot.0, &mut module_entry) } {
        return FmMemoryStatus::failed(
            pid,
            process_name,
            executable_path,
            format!("Nie udało się pobrać głównego modułu FM: {error}"),
        );
    }

    let module_base_address = module_entry.modBaseAddr as usize;

    let module_size = module_entry.modBaseSize;

    let mut signature = [0_u8; 2];
    let mut bytes_read = 0_usize;

    if let Err(error) = unsafe {
        ReadProcessMemory(
            process_handle.0,
            module_base_address as *const c_void,
            signature.as_mut_ptr() as *mut c_void,
            signature.len(),
            Some(&mut bytes_read as *mut usize),
        )
    } {
        return FmMemoryStatus::failed(
            pid,
            process_name,
            executable_path,
            format!("Proces FM został otwarty, ale odczyt pamięci się nie udał: {error}"),
        );
    }

    let signature_text = String::from_utf8_lossy(&signature[..bytes_read]).to_string();

    let has_valid_executable_signature = bytes_read == 2 && signature == *b"MZ";

    if !has_valid_executable_signature {
        return FmMemoryStatus {
            process_detected: true,
            memory_readable: false,

            pid: Some(pid),
            process_name,
            executable_path,

            module_base_address: Some(format!("0x{module_base_address:X}")),

            module_size: Some(module_size),
            executable_signature: Some(signature_text),

            error: Some(
                "Pamięć została odczytana, ale główny moduł nie ma oczekiwanej sygnatury MZ."
                    .to_string(),
            ),
        };
    }

    FmMemoryStatus {
        process_detected: true,
        memory_readable: true,

        pid: Some(pid),
        process_name,
        executable_path,

        module_base_address: Some(format!("0x{module_base_address:X}")),

        module_size: Some(module_size),
        executable_signature: Some(signature_text),

        error: None,
    }
}
