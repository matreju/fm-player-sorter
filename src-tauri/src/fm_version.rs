//! Build-specific managed layouts. FM27 offsets come from the uploaded
//! GameAssembly/metadata pair, analysed with Cpp2IL prerelease.21.
//! Native game_plugin fields remain a trial layout until tested in a live FM27.
use std::path::Path;

// These identities retain every byte except explicitly parsed PE timestamps,
// checksum and the CodeView RSDS PDB GUID/age. No code/data section is omitted.
const FM27_ASSEMBLY_LAYOUT_SHA256:&str="01e6803b280359dc3300cc1599c7211463243fafce229671dc045232b8a67837";
const FM27_NATIVE_LAYOUT_SHA256:&str="499016330f23753163aab6c220cb76ac413a2038fa86b37954b5833720eddd61";
const FM27_NATIVE_PROFILE_ID:&str="bc940e472418fc5c214208d7cf30fecf600f689b6f9d71c11ba19a2df0fe057f";

fn pe_layout_matches(path:&Path,raw_hash:&str,expected:&str)->Result<bool,String> {
    use std::{collections::BTreeMap,sync::{Mutex,OnceLock}};
    static CACHE:OnceLock<Mutex<BTreeMap<String,String>>>=OnceLock::new();
    let cache=CACHE.get_or_init(||Mutex::new(BTreeMap::new()));
    if let Ok(values)=cache.lock(){if let Some(layout)=values.get(raw_hash){return Ok(layout==expected);}}
    let fingerprint=crate::fm_pe::fingerprint(path)?;
    if !fingerprint.raw.eq_ignore_ascii_case(raw_hash){return Err("Plik gry zmienił się podczas rozpoznawania. Ponów połączenie po zakończeniu aktualizacji.".into());}
    if let Ok(mut values)=cache.lock(){if values.len()>=32{values.clear();}values.insert(raw_hash.to_owned(),fingerprint.layout.clone());}
    Ok(fingerprint.layout==expected)
}

pub(crate) fn assembly_matches(path:&Path,raw_hash:&str,profile:FmLayout)->Result<bool,String> {
    if profile.assembly_hash.eq_ignore_ascii_case(raw_hash){return Ok(true);}
    if profile.edition!=27{return Ok(false);}
    pe_layout_matches(path,raw_hash,FM27_ASSEMBLY_LAYOUT_SHA256)
}

// A compatibility identity is not the raw file hash: module diagnostics retain
// and display the original SHA-256 separately. Unknown native code stays unknown.
pub(crate) fn native_profile_id(path:&Path,raw_hash:Option<&str>)->Result<Option<String>,String> {
    let Some(raw)=raw_hash else {return Ok(None);};
    if raw.eq_ignore_ascii_case(FM27_NATIVE_PROFILE_ID)||pe_layout_matches(path,raw,FM27_NATIVE_LAYOUT_SHA256)? {
        Ok(Some(FM27_NATIVE_PROFILE_ID.into()))
    }else{Ok(Some(raw.into()))}
}

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
    pub human_manager_person: usize,
    pub binding_root: usize,
    pub binding_nodes: usize,
    pub binding_data: usize,
    pub human_contexts: [(usize, usize); 3],
    pub probe_rva: usize,
    pub static_methods: [(&'static str, usize); 2],
}

pub(crate) const FM26: FmLayout = FmLayout {
    id: "fm26-6000.0.52.8888375-87a0370e9917",
    name: "FM26 26.3.x native managed team",
    unity_version: "6000.0.52f1-fm26-05f1 (87a0370e9917)",
    edition: 26,
    experimental: false,
    exe_hash: "3653c97f9ccec2be28edc4faae67304b5b6c26733f2f07dea3e7c591d3b9ff73",
    assembly_hash: "7ce3eb474dc6093df633f979e869e55b2ec7953fde2e732392a694d379ff7a0c",
    metadata_hash: "52287eadeb07d3d222c9e370e64f308260934911807e2073fb0e72f49c273213",
    human_manager_person: 0x450,
    binding_root: 0x40,
    binding_nodes: 0x48,
    binding_data: 0x78,
    human_contexts: [(0x208, 0x230), (0x90, 0x74), (0x5B0, 0x5C0)],
    probe_rva: 0x2AA6E0,
    static_methods: [("GameRecordSerialisation.get_Instance", 0x2AE010), ("GamePlugin.get_ChannelDataPool", 0x2A8D50)],
};

pub(crate) const FM27: FmLayout = FmLayout {
    id: "fm27-6000.3.18.9883062-96cdb67fb884",
    name: "FM27 native managed team (experimental)",
    unity_version: "6000.3.18f1-custom (96cdb67fb884)",
    edition: 27,
    experimental: true,
    exe_hash: "2a7318c6984bcb3a19ff3304432b63462581cee33ba203f9a0a118f11c69e27e",
    assembly_hash: "820d6618acafac7dffc1ef3b489582eddb84b0343d4f34d55fff9fb70881e00a",
    metadata_hash: "a380792f33ba4eb048fa2ffebc6c504b001f85c76e4128e4d41ca24d7b017c4c",
    human_manager_person: 0x440,
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

pub(crate) fn profile_for_files(path:&Path,assembly:&str,metadata:&str)->Result<Option<FmLayout>,String> {
    if let Some(profile)=profile_for_hashes(assembly,metadata){return Ok(Some(profile));}
    if metadata.eq_ignore_ascii_case(FM27.metadata_hash)&&assembly_matches(path,assembly,FM27)? {return Ok(Some(FM27));}
    Ok(None)
}

pub(crate) fn metadata_path(directory: &Path) -> std::path::PathBuf {
    directory.join("fm_Data/il2cpp_data/Metadata/global-metadata.dat")
}

/// Selection for the native reader. Retain FM26's existing handling of patches,
/// but never silently apply its managed layout to a new metadata generation.
pub(crate) fn runtime_layout(assembly_path: &Path, assembly_hash: &str) -> Result<FmLayout, String> {
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
    let metadata_hash = crate::fm_build::calculate_sha256(&metadata.to_string_lossy())?;
    profile_for_files(assembly_path,&assembly_hash, &metadata_hash)?.ok_or_else(|| format!(
        "Profil pamięci: nieobsługiwany kod lub układ metadanych FM (format {version}, GameAssembly {assembly_hash}, metadane SHA-256 {metadata_hash})."
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
