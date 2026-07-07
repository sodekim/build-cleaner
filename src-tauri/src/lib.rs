mod rules;
mod scanner;
mod store;

use rules::{builtin_rules, merge_rules, ScanRule};
use scanner::{remove_dir_recursive, scan, BuildEntry, ScanEvent};
use serde::Serialize;
use std::path::PathBuf;
use store::{load_rules, save_rules};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

/// 清理结果条目
#[derive(Debug, Clone, Serialize)]
pub struct CleanResultItem {
    pub path: String,
    pub success: bool,
    pub error: Option<String>,
    /// 释放字节数（失败为 0）
    pub freed: u64,
}

/// 清理结果汇总
#[derive(Debug, Clone, Serialize)]
pub struct CleanResult {
    pub items: Vec<CleanResultItem>,
    pub total_freed: u64,
    pub failed: usize,
}

/// 清理过程中的进度事件
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind")]
pub enum CleanEvent {
    Start { total: usize },
    Item { path: String, index: usize, success: bool },
    Done { total_freed: u64, failed: usize },
}

struct AppState {
    app_data_dir: PathBuf,
}

/// 获取规则列表（合并内置与用户保存）。
#[tauri::command]
fn get_rules(state: State<'_, AppState>) -> Vec<ScanRule> {
    load_rules(&state.app_data_dir)
}

/// 保存规则列表。
#[tauri::command]
fn save_rules_cmd(state: State<'_, AppState>, rules: Vec<ScanRule>) -> Result<(), String> {
    // 确保 builtin 字段正确：内置 id 视为 builtin
    let builtin_rules_list = builtin_rules();
    let builtin_ids: Vec<String> = builtin_rules_list.iter().map(|r| r.id.clone()).collect();
    let normalized: Vec<ScanRule> = rules
        .into_iter()
        .map(|mut r| {
            r.builtin = builtin_ids.contains(&r.id);
            r
        })
        .collect();
    let merged = merge_rules(&normalized);
    save_rules(&state.app_data_dir, &merged).map_err(|e| e.to_string())
}

/// 打开目录选择对话框。
#[tauri::command]
async fn pick_directory(app: AppHandle) -> Option<String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .set_title("选择要扫描的根目录")
        .pick_folder(move |folder| {
            let result = folder.map(|f| f.to_string());
            let _ = tx.send(result);
        });
    rx.await.ok().flatten()
}

/// 启动扫描。通过 Channel 推送进度事件，最终返回完整结果列表。
#[tauri::command]
async fn scan_directory(
    root: String,
    rules: Vec<ScanRule>,
    on_event: tauri::ipc::Channel<ScanEvent>,
) -> Result<Vec<BuildEntry>, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.is_dir() {
        return Err(format!("不是有效目录: {root}"));
    }
    let on_event_cloned = on_event.clone();
    let entries = tokio::task::spawn_blocking(move || {
        scan(&root_path, &rules, move |evt| {
            let _ = on_event_cloned.send(evt);
        })
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(entries)
}

/// 删除选中的目录列表。通过 Channel 推送进度。
#[tauri::command]
async fn clean_directories(
    paths: Vec<String>,
    on_event: tauri::ipc::Channel<CleanEvent>,
) -> Result<CleanResult, String> {
    on_event
        .send(CleanEvent::Start { total: paths.len() })
        .ok();

    let mut items: Vec<CleanResultItem> = Vec::with_capacity(paths.len());
    let mut total_freed: u64 = 0;
    let mut failed: usize = 0;

    for (i, p) in paths.iter().enumerate() {
        let path = PathBuf::from(p);
        let size_before = scanner::dir_size(&path).0;
        let result = remove_dir_recursive(&path);
        let (success, error, freed) = match result {
            Ok(()) => (true, None, size_before),
            Err(e) => {
                failed += 1;
                (false, Some(e.to_string()), 0)
            }
        };
        on_event
            .send(CleanEvent::Item {
                path: p.clone(),
                index: i,
                success,
            })
            .ok();
        total_freed += freed;
        items.push(CleanResultItem {
            path: p.clone(),
            success,
            error,
            freed,
        });
    }

    on_event
        .send(CleanEvent::Done {
            total_freed,
            failed,
        })
        .ok();

    Ok(CleanResult {
        items,
        total_freed,
        failed,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("."));
            app.manage(AppState { app_data_dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_rules,
            save_rules_cmd,
            pick_directory,
            scan_directory,
            clean_directories,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
