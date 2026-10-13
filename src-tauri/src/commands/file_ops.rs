use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize)]
pub struct FileResult {
    pub path: String,
    pub content: String,
}

/// 读取项目文件（.nfproj 等）
#[tauri::command]
pub fn read_project_file(path: String) -> Result<FileResult, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("读取失败: {}", e))?;
    Ok(FileResult { path, content })
}

/// 写入项目文件，自动创建父目录
#[tauri::command]
pub fn write_project_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    fs::write(&path, content).map_err(|e| format!("写入失败: {}", e))
}

/// 导出运行时 JSON，写入前校验 JSON 有效性
#[tauri::command]
pub fn export_runtime_json(path: String, json: String) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&json).map_err(|e| format!("导出 JSON 无效: {}", e))?;
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
    }
    fs::write(&path, json).map_err(|e| format!("导出失败: {}", e))
}
