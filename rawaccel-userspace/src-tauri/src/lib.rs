pub mod models;
pub mod driver;
pub mod config;
pub mod math;

use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn apply_settings(settings_json: String) -> Result<(), String> {
    let app_config: config::AppConfig = serde_json::from_str(&settings_json)
        .map_err(|e| format!("Failed to parse settings JSON: {}", e))?;

    // Apply to driver
    driver::apply_config(&app_config)?;

    // Save to settings.json in current directory (where driver lives)
    let _ = fs::write("settings.json", &settings_json);
    
    Ok(())
}

#[tauri::command]
fn load_settings() -> Result<String, String> {
    // Read from settings.json
    match fs::read_to_string("settings.json") {
        Ok(contents) => Ok(contents),
        Err(_) => Err("No settings.json found".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![apply_settings, load_settings])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
