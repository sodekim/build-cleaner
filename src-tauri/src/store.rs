use crate::rules::{merge_rules, ScanRule};
use std::fs;
use std::path::PathBuf;

/// 规则持久化文件路径（app data 目录下 rules.json）。
pub fn rules_file_path(app_data_dir: &PathBuf) -> PathBuf {
    app_data_dir.join("rules.json")
}

/// 加载规则：读取持久化文件并与内置规则合并。
pub fn load_rules(app_data_dir: &PathBuf) -> Vec<ScanRule> {
    let path = rules_file_path(app_data_dir);
    match fs::read_to_string(&path) {
        Ok(content) => {
            let saved: Vec<ScanRule> = serde_json::from_str(&content).unwrap_or_default();
            merge_rules(&saved)
        }
        Err(_) => merge_rules(&[]),
    }
}

/// 保存规则（合并后的全量规则）。
pub fn save_rules(app_data_dir: &PathBuf, rules: &[ScanRule]) -> std::io::Result<()> {
    fs::create_dir_all(app_data_dir)?;
    let path = rules_file_path(app_data_dir);
    let json = serde_json::to_string_pretty(rules)?;
    fs::write(path, json)?;
    Ok(())
}
