use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize, Deserialize, Clone)]
pub struct RecentProject {
    pub path: String,
    pub title: String,
    pub lastOpened: String,
}

/// 读取最近项目列表（存储在应用本地目录 recent.json）
#[tauri::command]
pub fn get_recent_projects(app: tauri::AppHandle) -> Vec<RecentProject> {
    let file = recent_file(&app);
    match std::fs::read_to_string(&file) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

/// 添加/更新最近项目（置顶并去重，最多保留 10 条）
#[tauri::command]
pub fn add_recent_project(
    app: tauri::AppHandle,
    path: String,
    title: String,
) -> Result<(), String> {
    let mut list = get_recent_projects(app.clone());
    list.retain(|p| p.path != path);
    list.insert(
        0,
        RecentProject {
            path,
            title,
            lastOpened: chrono_now(),
        },
    );
    list.truncate(10);
    let file = recent_file(&app);
    if let Some(parent) = file.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    let json = serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?;
    std::fs::write(&file, json).map_err(|e| format!("写入失败: {}", e))
}

/// 清空最近项目列表
#[tauri::command]
pub fn clear_recent_projects(app: tauri::AppHandle) -> Result<(), String> {
    let file = recent_file(&app);
    if file.exists() {
        std::fs::remove_file(&file).map_err(|e| format!("删除失败: {}", e))?;
    }
    Ok(())
}

fn recent_file(app: &tauri::AppHandle) -> std::path::PathBuf {
    let dir = app
        .path()
        .app_local_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    dir.join("recent.json")
}

fn chrono_now() -> String {
    // 简单的本地时间戳（ISO 风格），避免引入 chrono 依赖
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{}", now)
}
