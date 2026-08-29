pub mod models;
pub mod driver;
pub mod config;

#[tauri::command]
fn apply_settings(settings_json: String) -> Result<(), String> {
    let app_config: config::AppConfig = serde_json::from_str(&settings_json)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    driver::apply_config(&app_config)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![apply_settings])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
