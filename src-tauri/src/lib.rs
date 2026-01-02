use tauri::Manager;

mod commands;
mod db;
mod services;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize database
            db::init_db(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::system::get_system_info,
            commands::auth::set_current_user,
            commands::auth::get_current_user,
            commands::games::get_all_games,
            commands::games::add_game
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
