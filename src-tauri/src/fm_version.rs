//! Build-specific managed layouts. FM27 offsets come from the uploaded
//! GameAssembly/metadata pair, analysed with Cpp2IL prerelease.21.
//! Native game_plugin fields remain a trial layout until tested in a live FM27.
use std::path::Path;

#[derive(Debug, Clone, Copy)]
pub(crate) struct FmLayout {
    pub id: &'static str,
    pub name: &'static str,
    pub unity_version: &'static str,
    pub edition: u16,
    pub experimental: bool,
    pub exe_hash: &'static str,
    pub assembly_hash: &'static str,
    pub metadata_hash: &'static str,
    pub binding_root: usize,
    pub binding_nodes: usize,
    pub binding_data: usize,
    pub human_contexts: [(usize, usize); 3],
    pub probe_rva: usize,
    pub static_methods: [(&'static str, usize); 2],
}

pub(crate) const FM26: FmLayout = FmLayout {
    id: "fm26-6000.0.52.8888375-87a0370e9917",
    name: "FM26 26.3.x native managed national team",
    unity_version: "6000.0.52f1-fm26-05f1 (87a0370e9917)",
    edition: 26,
    experimental: false,
    exe_hash: "3653c97f9ccec2be28edc4faae67304b5b6c26733f2f07dea3e7c591d3b9ff73",
    assembly_hash: "7ce3eb474dc6093df633f979e869e55b2ec7953fde2e732392a694d379ff7a0c",
    metadata_hash: "52287eadeb07d3d222c9e370e64f308260934911807e2073fb0e72f49c273213",
    binding_root: 0x40,
    binding_nodes: 0x48,
    binding_data: 0x78,
    human_contexts: [(0x208, 0x230), (0x90, 0x74), (0x5B0, 0x5C0)],
    probe_rva: 0x2AA6E0,
    static_methods: [("GameRecordSerialisation.get_Instance", 0x2AE010), ("GamePlugin.get_ChannelDataPool", 0x2A8D50)],
};

pub(crate) const FM27: FmLayout = FmLayout {
    id: "fm27-6000.3.18.9883062-96cdb67fb884",
    name: "FM27 native managed national team (experimental)",
    unity_version: "6000.3.18f1-custom (96cdb67fb884)",
    edition: 27,
    experimental: true,
    exe_hash: "2a7318c6984bcb3a19ff3304432b63462581cee33ba203f9a0a118f11c69e27e",
    assembly_hash: "820d6618acafac7dffc1ef3b489582eddb84b0343d4f34d55fff9fb70881e00a",
    metadata_hash: "a380792f33ba4eb048fa2ffebc6c504b001f85c76e4128e4d41ca24d7b017c4c",
    binding_root: 0x50,
    binding_nodes: 0x58,
    binding_data: 0xA0,
    human_contexts: [(0x308, 0x370), (0xB0, 0x94), (0x398, 0x3C0)],
    probe_rva: 0x3343B0,
    static_methods: [("GameRecordSerialisation.get_Instance", 0x337960), ("GamePlugin.get_ChannelDataPool", 0x332630)],
};

pub(crate) fn profile_for_hashes(assembly: &str, metadata: &str) -> Option<FmLayout> {
    [FM26, FM27].into_iter().find(|profile| {
        profile.assembly_hash.eq_ignore_ascii_case(assembly)
            && profile.metadata_hash.eq_ignore_ascii_case(metadata)
    })
}

pub(crate) fn metadata_path(directory: &Path) -> std::path::PathBuf {
    directory.join("fm_Data/il2cpp_data/Metadata/global-metadata.dat")
}

/// Selection for the native reader. Retain FM26's existing handling of patches,
/// but never silently apply its managed layout to a new metadata generation.
pub(crate) fn runtime_layout(assembly_path: &Path) -> Result<FmLayout, String> {
    use std::io::Read;
    let directory = assembly_path.parent().ok_or("Brak folderu GameAssembly.dll.")?;
    let metadata = metadata_path(directory);
    let mut header = [0u8; 8];
    std::fs::File::open(&metadata).and_then(|mut file| file.read_exact(&mut header))
        .map_err(|error| format!("Nie można odczytać metadanych FM: {error}"))?;
    if u32::from_le_bytes(header[..4].try_into().unwrap()) != 0xFAB1_1BAF {
        return Err("Profil pamięci: nieprawidłowy nagłówek metadanych FM.".into());
    }
    let version = u32::from_le_bytes(header[4..].try_into().unwrap());
    if version == 31 {
        return Ok(FM26);
    }
    let assembly_hash = crate::fm_build::calculate_sha256(&assembly_path.to_string_lossy())?;
    let metadata_hash = crate::fm_build::calculate_sha256(&metadata.to_string_lossy())?;
    profile_for_hashes(&assembly_hash, &metadata_hash).ok_or_else(|| format!(
        "Profil pamięci: nieznana wersja FM (metadane {version}, GameAssembly {assembly_hash})."
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn profiles_require_a_matching_pair_of_files() {
        assert_eq!(profile_for_hashes(FM27.assembly_hash, FM27.metadata_hash).unwrap().edition, 27);
        assert_eq!(profile_for_hashes(FM26.assembly_hash, FM26.metadata_hash).unwrap().edition, 26);
        assert!(profile_for_hashes(FM27.assembly_hash, FM26.metadata_hash).is_none());
        assert!(profile_for_hashes("unknown", FM27.metadata_hash).is_none());
    }
}

/// Determine the document directory from the running game's own metadata,
/// rather than mixing saves/logos from different editions by modification time.
pub(crate) fn current_edition() -> Option<u16> {
    use std::io::Read;
    let process = crate::fm_process::detect_football_manager();
    let executable = std::path::PathBuf::from(process.executable_path?);
    let mut header = [0u8; 8];
    std::fs::File::open(metadata_path(executable.parent()?)).ok()?
        .read_exact(&mut header).ok()?;
    if u32::from_le_bytes(header[..4].try_into().ok()?) != 0xFAB1_1BAF { return None; }
    match u32::from_le_bytes(header[4..].try_into().ok()?) {
        31 => Some(26),
        39 => Some(27),
        _ => None,
    }
}
