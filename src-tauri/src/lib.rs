use tauri::{Emitter, Manager};

mod commands;
mod db;
mod services;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();

            // If a deep link is passed as an argument (Windows mostly), emit it
            // Note: Deep link plugin also handles scheme opening, but single instance helps if app is already running.
            // We might need to check args for url scheme.
            if let Some(url) = args.iter().find(|a| a.starts_with("sync-saves://")) {
                let _ = app.emit("deep-link://new-url", url);
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--silent"]),
        ))
        .setup(|app| {
            // Initialize Database
            db::init_db(app.handle())?;

            // Start File Watcher
            services::watcher::start_watcher(app.handle().clone());

            // Register deep link listener to emit to frontend
            // Note: tauri-plugin-deep-link > 2.0 automatically emits "deep-link://new-url"
            // but we might need to manually ensure it on some platforms or just rely on it.
            // Let's rely on the plugin's default behavior or explicit event if needed.
            // Actually, the standard way is often:
            /*
              #[cfg(any(windows, target_os = "linux"))]
              {
                use tauri_plugin_deep_link::DeepLinkExt;
                app.deep_link().register_all()?;
              }
            */
            // I will add the registration step here.

            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                // Register the "sync-saves" scheme
                if let Err(e) = app.deep_link().register("sync-saves") {
                    eprintln!("Failed to register deep link: {}", e);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            commands::system::get_device_id,
            commands::system::get_device_name,
            commands::system::set_device_name,
            commands::system::get_app_settings,
            commands::system::save_app_settings,
            commands::system::write_file,
            commands::system::open_folder,
            commands::auth::set_current_user,
            commands::auth::get_current_user,
            crate::commands::games::get_all_games,
            crate::commands::games::add_game,
            crate::commands::games::delete_game,
            crate::commands::games::update_game,
            crate::commands::games::get_game_save_stats,
            crate::commands::games::get_version_analysis,
            crate::commands::games::save_version_analysis,
            crate::commands::games::delete_version_analyses,
            crate::commands::pcgw::pcgw_search_games,
            crate::commands::pcgw::pcgw_get_save_locations,
            crate::commands::sync::sync_game,
            crate::commands::sync::restore_game,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
