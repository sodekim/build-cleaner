use serde::{Deserialize, Serialize};

/// 一条扫描规则：用于判定某个目录是否属于某个构建系统的产物目录。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRule {
    /// 唯一 id（内置规则使用稳定 id，便于升级时合并）
    pub id: String,
    /// 展示名称，例如 "Maven target"
    pub name: String,
    /// 所属生态，例如 maven / gradle / cargo / npm
    pub ecosystem: String,
    /// 构建产物目录名，例如 ["target"]、["build"]、["node_modules"]
    pub build_dirs: Vec<String>,
    /// 父目录中必须存在的标记文件（任一命中即可），为空则只按目录名匹配
    pub markers: Vec<String>,
    /// 是否启用
    pub enabled: bool,
    /// 是否为内置规则（用户不可删除，仅可禁用/编辑）
    pub builtin: bool,
}

impl ScanRule {
    pub fn match_build_dir(&self, dir_name: &str) -> bool {
        self.enabled && self.build_dirs.iter().any(|d| d == dir_name)
    }

    pub fn markers_satisfied(&self, parent: &std::path::Path) -> bool {
        if self.markers.is_empty() {
            return true;
        }
        for m in &self.markers {
            if m.contains('*') {
                // 简单通配符匹配目录内文件名
                if let Ok(entries) = std::fs::read_dir(parent) {
                    for e in entries.flatten() {
                        if glob_match(m, &e.file_name().to_string_lossy()) {
                            return true;
                        }
                    }
                }
            } else if parent.join(m).exists() {
                return true;
            }
        }
        false
    }
}

/// 极简通配符：仅支持 `*` 作为任意字符序列。
fn glob_match(pattern: &str, name: &str) -> bool {
    let pat: Vec<&str> = pattern.split('*').collect();
    if pat.len() == 1 {
        return pattern == name;
    }
    let mut idx = 0usize;
    let mut front = true;
    for (i, part) in pat.iter().enumerate() {
        if part.is_empty() {
            front = false;
            continue;
        }
        if i == 0 && front {
            if !name[idx..].starts_with(part) {
                return false;
            }
            idx += part.len();
        } else if i == pat.len() - 1 {
            return name.ends_with(part) && name.len() - idx >= part.len();
        } else if let Some(pos) = name[idx..].find(part) {
            idx += pos + part.len();
        } else {
            return false;
        }
    }
    true
}

/// 内置规则预设。
pub fn builtin_rules() -> Vec<ScanRule> {
    vec![
        ScanRule {
            id: "maven-target".into(),
            name: "Maven target".into(),
            ecosystem: "maven".into(),
            build_dirs: vec!["target".into()],
            markers: vec!["pom.xml".into()],
            enabled: true,
            builtin: true,
        },
        ScanRule {
            id: "gradle-build".into(),
            name: "Gradle build".into(),
            ecosystem: "gradle".into(),
            build_dirs: vec!["build".into(), ".gradle".into()],
            markers: vec!["build.gradle".into(), "build.gradle.kts".into(), "settings.gradle".into(), "settings.gradle.kts".into()],
            enabled: true,
            builtin: true,
        },
        ScanRule {
            id: "cargo-target".into(),
            name: "Cargo target".into(),
            ecosystem: "cargo".into(),
            build_dirs: vec!["target".into()],
            markers: vec!["Cargo.toml".into()],
            enabled: true,
            builtin: true,
        },
        ScanRule {
            id: "npm-node_modules".into(),
            name: "npm node_modules".into(),
            ecosystem: "npm".into(),
            build_dirs: vec!["node_modules".into()],
            markers: vec!["package.json".into()],
            enabled: true,
            builtin: true,
        },
        ScanRule {
            id: "js-dist".into(),
            name: "JS dist".into(),
            ecosystem: "js".into(),
            build_dirs: vec!["dist".into(), "build".into()],
            markers: vec!["package.json".into()],
            enabled: false,
            builtin: true,
        },
        ScanRule {
            id: "dotnet-bin-obj".into(),
            name: ".NET bin/obj".into(),
            ecosystem: "dotnet".into(),
            build_dirs: vec!["bin".into(), "obj".into()],
            markers: vec!["*.csproj".into(), "*.fsproj".into()],
            enabled: true,
            builtin: true,
        },
        ScanRule {
            id: "python-pycache".into(),
            name: "Python __pycache__".into(),
            ecosystem: "python".into(),
            build_dirs: vec!["__pycache__".into(), ".pytest_cache".into(), ".mypy_cache".into()],
            markers: vec![],
            enabled: true,
            builtin: true,
        },
        ScanRule {
            id: "rust-cmake-build".into(),
            name: "CMake build dir".into(),
            ecosystem: "cmake".into(),
            build_dirs: vec!["build".into()],
            markers: vec!["CMakeLists.txt".into()],
            enabled: false,
            builtin: true,
        },
    ]
}

/// 合并内置规则与用户规则：保留用户对内置规则的 enabled/markers 修改，追加用户新增规则。
pub fn merge_rules(saved: &[ScanRule]) -> Vec<ScanRule> {
    let builtins = builtin_rules();
    let mut result: Vec<ScanRule> = Vec::new();
    for mut b in builtins {
        if let Some(s) = saved.iter().find(|s| s.id == b.id) {
            b.enabled = s.enabled;
            if !s.markers.is_empty() {
                b.markers = s.markers.clone();
            }
            if !s.build_dirs.is_empty() {
                b.build_dirs = s.build_dirs.clone();
            }
            b.name = s.name.clone();
        }
        result.push(b);
    }
    for s in saved.iter().filter(|s| !s.builtin) {
        if !result.iter().any(|r| r.id == s.id) {
            result.push(s.clone());
        }
    }
    result
}
