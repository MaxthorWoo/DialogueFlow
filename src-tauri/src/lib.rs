mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::file_ops::read_project_file,
            commands::file_ops::write_project_file,
            commands::file_ops::export_runtime_json,
            commands::recent::get_recent_projects,
            commands::recent::add_recent_project,
            commands::recent::clear_recent_projects,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NarrativeFlow");
}
