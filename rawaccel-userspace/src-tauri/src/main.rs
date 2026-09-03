// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.contains(&"--silent".to_string()) {
        if let Ok(settings_json) = rawaccel_userspace_lib::config::load_settings_from_disk() {
            if let Ok(app_config) = serde_json::from_str::<rawaccel_userspace_lib::config::AppConfig>(&settings_json) {
                if app_config.validate().is_ok() {
                    let _ = rawaccel_userspace_lib::driver::apply_config(&app_config);
                }
            }
        }
        std::process::exit(0);
    }

    rawaccel_userspace_lib::run()
}
