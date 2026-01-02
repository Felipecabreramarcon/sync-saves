// No unnecessary manager import

mod commands;
mod db;
mod services;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--silent"]),
        ))
        .setup(|app| {
            // Initialize Database
            db::init_db(app.handle())?;

            // Start File Watcher
            services::watcher::start_watcher(app.handle().clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            commands::system::get_device_id,
            commands::system::get_device_name,
            commands::system::set_device_name,
            commands::system::get_app_settings,
            commands::system::save_app_settings,
            commands::auth::set_current_user,
            commands::auth::get_current_user,
            crate::commands::games::get_all_games,
            crate::commands::games::add_game,
            crate::commands::games::delete_game,
            crate::commands::games::update_game,
            crate::commands::games::get_game_save_stats,
            crate::commands::sync::sync_game,
            crate::commands::sync::restore_game,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
