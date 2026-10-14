use std::{
    collections::HashMap,
    env, fs,
    path::{Path, PathBuf},
    sync::{Mutex, OnceLock},
};

use base64::{engine::general_purpose::STANDARD, Engine as _};

const MAX_CONFIG_FILES: usize = 8_192;
const MAX_SCAN_DEPTH: usize = 10;
static LOGO_CACHE: OnceLock<Mutex<HashMap<(Option<u32>, Option<u32>), String>>> = OnceLock::new();

pub fn find_managed_team_logo(
    nation_uid: Option<u32>,
    team_uid: Option<u32>,
) -> Option<String> {
    if nation_uid.is_none() && team_uid.is_none() {
        return None;
    }

    let cache_key = (nation_uid, team_uid);
    if let Some(cached) = LOGO_CACHE
        .get_or_init(|| Mutex::new(HashMap::new()))
        .lock()
        .ok()
        .and_then(|cache| cache.get(&cache_key).cloned())
    {
        return Some(cached);
    }

    for graphics_root in graphics_roots() {
        let mut configs = Vec::new();
        collect_config_files(&graphics_root, 0, &mut configs);
        configs.sort_by_key(|path| config_priority(path));

        if let Some(uid) = nation_uid {
            for config in &configs {
                if let Some(path) = logo_from_config(config, uid, &["nation"]) {
                    if let Some(data_url) = image_data_url(&path) {
                        cache_logo(cache_key, &data_url);
                        return Some(data_url);
                    }
                }
            }
        }

        if let Some(uid) = team_uid {
            for config in &configs {
                if let Some(path) = logo_from_config(config, uid, &["team", "club"]) {
                    if let Some(data_url) = image_data_url(&path) {
                        cache_logo(cache_key, &data_url);
                        return Some(data_url);
                    }
                }
            }
        }

        for uid in [nation_uid, team_uid].into_iter().flatten() {
            if let Some(path) = logo_from_uid_filename(&graphics_root, uid) {
                if let Some(data_url) = image_data_url(&path) {
                    cache_logo(cache_key, &data_url);
                    return Some(data_url);
                }
            }
        }

        // Niektóre paczki zapisują herb reprezentacji jako team/club, a inne
        // jako nation. Ten ostatni przebieg nadal używa dokładnego UID.
        for uid in [nation_uid, team_uid].into_iter().flatten() {
            for config in &configs {
                if let Some(path) = logo_from_config(config, uid, &["nation", "team", "club"]) {
                    if let Some(data_url) = image_data_url(&path) {
                        cache_logo(cache_key, &data_url);
                        return Some(data_url);
                    }
                }
            }
        }
    }

    None
}

fn graphics_roots() -> Vec<PathBuf> {
    let mut documents = Vec::<PathBuf>::new();
    if let Some(profile) = env::var_os("USERPROFILE") {
        let profile = PathBuf::from(profile);
        add_document_directories(&mut documents, &profile);
        if let Ok(entries) = fs::read_dir(&profile) {
            for entry in entries.flatten() {
                if entry.path().is_dir()
                    && entry
                        .file_name()
                        .to_string_lossy()
                        .to_ascii_lowercase()
                        .starts_with("onedrive")
                {
                    add_document_directories(&mut documents, &entry.path());
                }
            }
        }
    }
    for variable in ["OneDrive", "OneDriveConsumer", "OneDriveCommercial"] {
        if let Some(root) = env::var_os(variable) {
            add_document_directories(&mut documents, &PathBuf::from(root));
        }
    }

    let mut roots = Vec::new();
    for documents_root in documents {
        let sports_interactive = documents_root.join("Sports Interactive");
        let Ok(entries) = fs::read_dir(sports_interactive) else {
            continue;
        };
        for entry in entries.flatten() {
            let title = entry.file_name().to_string_lossy().to_ascii_lowercase();
            if !entry.path().is_dir() || !title.starts_with("football manager 26") {
                continue;
            }
            let root = entry.path().join("graphics");
            if root.is_dir() && !roots.contains(&root) {
                roots.push(root);
            }
        }
    }
    roots
}

fn add_document_directories(directories: &mut Vec<PathBuf>, root: &Path) {
    for name in ["Documents", "Dokumenty"] {
        let candidate = root.join(name);
        if candidate.is_dir() && !directories.contains(&candidate) {
            directories.push(candidate);
        }
    }
}

fn collect_config_files(directory: &Path, depth: usize, files: &mut Vec<PathBuf>) {
    if depth > MAX_SCAN_DEPTH || files.len() >= MAX_CONFIG_FILES {
        return;
    }
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    for entry in entries.flatten() {
        if files.len() >= MAX_CONFIG_FILES {
            break;
        }
        let path = entry.path();
        if path.is_dir() {
            collect_config_files(&path, depth + 1, files);
        } else if path
            .file_name()
            .and_then(|value| value.to_str())
            .is_some_and(|name| name.eq_ignore_ascii_case("config.xml"))
        {
            files.push(path);
        }
    }
}

fn config_priority(path: &Path) -> u8 {
    let value = path.to_string_lossy().to_ascii_lowercase();
    if value.contains("nation") || value.contains("countr") {
        0
    } else if value.contains("logo") {
        1
    } else {
        2
    }
}

fn logo_from_config(config: &Path, uid: u32, kinds: &[&str]) -> Option<PathBuf> {
    let contents = fs::read_to_string(config).ok()?;
    for record in contents.split("<record").skip(1) {
        let Some(target) = xml_attribute(record, "to") else {
            continue;
        };
        let target = target.replace('\\', "/").to_ascii_lowercase();
        let matches_id = kinds
            .iter()
            .any(|kind| target.contains(&format!("{kind}/{uid}/logo")));
        if !matches_id {
            continue;
        }

        let Some(source) = xml_attribute(record, "from") else {
            continue;
        };
        if let Some(path) = resolve_source_path(config, source) {
            return Some(path);
        }
    }
    None
}

fn resolve_source_path(config: &Path, source: &str) -> Option<PathBuf> {
    let source = source.replace('\\', "/");
    let parent = config.parent()?;
    let source_path = parent.join(&source);
    if source_path.is_file() {
        return Some(source_path);
    }
    for extension in ["png", "webp", "jpg", "jpeg"] {
        let candidate = parent.join(format!("{source}.{extension}"));
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}

fn logo_from_uid_filename(root: &Path, uid: u32) -> Option<PathBuf> {
    let mut candidates = Vec::<(i32, PathBuf)>::new();
    collect_uid_images(root, uid, 0, &mut candidates);
    candidates.sort_by_key(|(score, _)| -*score);
    candidates.into_iter().next().map(|(_, path)| path)
}

fn collect_uid_images(
    directory: &Path,
    uid: u32,
    depth: usize,
    candidates: &mut Vec<(i32, PathBuf)>,
) {
    if depth > MAX_SCAN_DEPTH || candidates.len() >= 128 {
        return;
    }
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };
    let uid_filename = uid.to_string();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_uid_images(&path, uid, depth + 1, candidates);
            continue;
        }
        let is_uid = path
            .file_stem()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value == uid_filename);
        let is_image = path
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|extension| {
                matches!(extension.to_ascii_lowercase().as_str(), "png" | "webp" | "jpg" | "jpeg")
            });
        if !is_uid || !is_image {
            continue;
        }
        let value = path.to_string_lossy().to_ascii_lowercase();
        let mut score = 0;
        if value.contains("nation") || value.contains("countr") {
            score += 100;
        }
        if value.contains("normal") {
            score += 20;
        }
        if value.contains("small") || value.contains("icon") {
            score -= 10;
        }
        if value.contains("face") || value.contains("kit") {
            score -= 100;
        }
        candidates.push((score, path));
    }
}

fn cache_logo(key: (Option<u32>, Option<u32>), data_url: &str) {
    if let Ok(mut cache) = LOGO_CACHE
        .get_or_init(|| Mutex::new(HashMap::new()))
        .lock()
    {
        cache.insert(key, data_url.to_string());
    }
}

fn xml_attribute<'a>(line: &'a str, attribute: &str) -> Option<&'a str> {
    let marker = format!("{attribute}=\"");
    let start = line.find(&marker)? + marker.len();
    let value = &line[start..];
    let end = value.find('"')?;
    Some(&value[..end])
}

fn image_data_url(path: &Path) -> Option<String> {
    let mime = match path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "png" => "image/png",
        "webp" => "image/webp",
        "jpg" | "jpeg" => "image/jpeg",
        _ => return None,
    };
    let bytes = fs::read(path).ok()?;
    Some(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}
