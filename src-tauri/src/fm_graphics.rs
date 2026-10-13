use std::{
    env, fs,
    path::{Path, PathBuf},
};

use base64::{engine::general_purpose::STANDARD, Engine as _};

const MAX_CONFIG_FILES: usize = 512;
const MAX_SCAN_DEPTH: usize = 10;

pub fn find_managed_team_logo(
    nation_uid: Option<u32>,
    team_uid: Option<u32>,
) -> Option<String> {
    let ids = [nation_uid, team_uid]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();
    if ids.is_empty() {
        return None;
    }

    for graphics_root in graphics_roots() {
        let mut configs = Vec::new();
        collect_config_files(&graphics_root, 0, &mut configs);
        for config in configs {
            if let Some(path) = logo_from_config(&config, &ids) {
                if let Some(data_url) = image_data_url(&path) {
                    return Some(data_url);
                }
            }
        }
    }

    None
}

fn graphics_roots() -> Vec<PathBuf> {
    let mut documents = Vec::<PathBuf>::new();
    if let Some(profile) = env::var_os("USERPROFILE") {
        documents.push(PathBuf::from(profile).join("Documents"));
    }
    for variable in ["OneDrive", "OneDriveConsumer", "OneDriveCommercial"] {
        if let Some(root) = env::var_os(variable) {
            documents.push(PathBuf::from(root).join("Documents"));
        }
    }

    let mut roots = Vec::new();
    for documents_root in documents {
        let root = documents_root
            .join("Sports Interactive")
            .join("Football Manager 26")
            .join("graphics");
        if root.is_dir() && !roots.contains(&root) {
            roots.push(root);
        }
    }
    roots
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

fn logo_from_config(config: &Path, ids: &[u32]) -> Option<PathBuf> {
    let contents = fs::read_to_string(config).ok()?;
    for line in contents.lines() {
        let Some(target) = xml_attribute(line, "to") else {
            continue;
        };
        let target = target
            .replace('\\', "/")
            .to_ascii_lowercase();
        let matches_id = ids.iter().any(|uid| {
            let uid = uid.to_string();
            target.contains(&format!("/nation/{uid}/logo"))
                || target.contains(&format!("/team/{uid}/logo"))
                || target.contains(&format!("/club/{uid}/logo"))
        });
        if !matches_id {
            continue;
        }

        let Some(source) = xml_attribute(line, "from") else {
            continue;
        };
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
    }
    None
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
