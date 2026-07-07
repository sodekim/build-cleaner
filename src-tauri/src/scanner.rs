use crate::rules::ScanRule;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;

/// 一条扫描结果：一个待清理的构建产物目录。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildEntry {
    pub id: String,
    pub path: String,
    pub name: String,
    pub ecosystem: String,
    pub rule_name: String,
    pub size: u64,
    pub file_count: u64,
}

/// 扫描时通过 Tauri Channel 推送给前端的事件。
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind")]
pub enum ScanEvent {
    Entering { dir: String },
    Found { entry: BuildEntry },
    Done { total: usize, total_size: u64 },
}

/// 扫描忽略的目录名（不进入）。
const SKIP_DIRS: &[&str] = &[".git", ".hg", ".svn", ".idea", ".vscode"];

/// 递归扫描 root，返回所有命中规则的构建目录。
///
/// - 命中后不再进入该构建目录内部递归。
/// - 跳过 SKIP_DIRS 中的目录。
/// - 使用 rayon 并行计算每个命中目录的大小。
pub fn scan(
    root: &Path,
    rules: &[ScanRule],
    on_event: impl Fn(ScanEvent) + Send + Sync + 'static,
) -> Vec<BuildEntry> {
    let on_event: Arc<dyn Fn(ScanEvent) + Send + Sync> = Arc::new(on_event);
    let rules = Arc::new(rules.to_vec());
    let hits = Arc::new(std::sync::Mutex::new(Vec::<(PathBuf, ScanRule)>::new()));

    recurse(root, &rules, &on_event, &hits);

    let hits_vec = Arc::try_unwrap(hits)
        .map(|m| m.into_inner().unwrap_or_default())
        .unwrap_or_default();

    let entries: Vec<BuildEntry> = hits_vec
        .par_iter()
        .map(|(path, rule)| {
            let (size, file_count) = dir_size(path);
            let id = path.to_string_lossy().to_string();
            let entry = BuildEntry {
                id: id.clone(),
                path: id.clone(),
                name: path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default(),
                ecosystem: rule.ecosystem.clone(),
                rule_name: rule.name.clone(),
                size,
                file_count,
            };
            on_event(ScanEvent::Found { entry: entry.clone() });
            entry
        })
        .collect();

    let total_size: u64 = entries.iter().map(|e| e.size).sum();
    on_event(ScanEvent::Done {
        total: entries.len(),
        total_size,
    });

    entries
}

fn recurse(
    dir: &Path,
    rules: &[ScanRule],
    on_event: &Arc<dyn Fn(ScanEvent) + Send + Sync>,
    hits: &Arc<std::sync::Mutex<Vec<(PathBuf, ScanRule)>>>,
) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let ft = match entry.file_type() {
            Ok(t) => t,
            Err(_) => continue,
        };
        if !ft.is_dir() {
            continue;
        }
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if SKIP_DIRS.contains(&name.as_str()) {
            continue;
        }

        // 命中规则？
        let matched = rules.iter().find(|r| {
            r.match_build_dir(&name) && r.markers_satisfied(dir)
        });

        if let Some(rule) = matched {
            on_event(ScanEvent::Entering {
                dir: path.to_string_lossy().to_string(),
            });
            if let Ok(mut g) = hits.lock() {
                g.push((path.clone(), rule.clone()));
            }
            // 不再深入该构建目录
            continue;
        }

        recurse(&path, rules, on_event, hits);
    }
}

/// 递归计算目录大小与文件数。
pub fn dir_size(path: &Path) -> (u64, u64) {
    let mut size = 0u64;
    let mut count = 0u64;
    for entry in walkdir::WalkDir::new(path).follow_links(false) {
        let Ok(e) = entry else { continue };
        if e.file_type().is_file() {
            if let Ok(m) = e.metadata() {
                size += m.len();
                count += 1;
            }
        }
    }
    (size, count)
}

/// 删除一个目录（递归）。
pub fn remove_dir_recursive(path: &Path) -> std::io::Result<()> {
    std::fs::remove_dir_all(path)
}
