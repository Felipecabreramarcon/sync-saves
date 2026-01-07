use crate::db;
use sysinfo::System;
use tauri::{command, AppHandle};
use uuid::Uuid;
// FIX 1: Use ManagerExt instead of AutostartExt
use tauri_plugin_autostart::ManagerExt;

#[derive(serde::Serialize)]
pub struct SystemInfo {
    os_name: String,
    os_version: String,
    hostname: String,
    total_memory: u64,
    device_id: String,
}

#[command]
pub fn get_system_info(app: AppHandle) -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    // Get or create device ID
    let device_id = get_or_create_device_id(&app).unwrap_or_else(|_| "unknown".to_string());

    SystemInfo {
        os_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
        os_version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
        total_memory: sys.total_memory(),
        device_id,
    }
}

/// Gets the existing device ID or creates a new one if it doesn't exist
pub(crate) fn get_or_create_device_id(app: &AppHandle) -> Result<String, String> {
    let conn = db::get_connection(app).map_err(|e| e.to_string())?;

    // Try to get existing device ID
    let mut stmt = conn
        .prepare("SELECT value FROM device_config WHERE key = 'device_id'")
        .map_err(|e| e.to_string())?;

    let existing_id: Result<String, _> = stmt.query_row([], |row| row.get(0));

    match existing_id {
        Ok(id) => Ok(id),
        Err(_) => {
            // Generate a new UUID
            let new_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO device_config (key, value) VALUES ('device_id', ?1)",
                [&new_id],
            )
            .map_err(|e| e.to_string())?;
            Ok(new_id)
        }
    }
}

#[command]
pub fn get_device_id(app: AppHandle) -> Result<String, String> {
    get_or_create_device_id(&app)
}

#[command]
pub fn get_device_name(app: AppHandle) -> Result<String, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT value FROM device_config WHERE key = 'device_name'")
        .map_err(|e| e.to_string())?;

    let name: Result<String, _> = stmt.query_row([], |row| row.get(0));

    match name {
        Ok(n) => Ok(n),
        Err(_) => {
            let hostname = System::host_name().unwrap_or_else(|| "Unknown-PC".to_string());
            Ok(hostname)
        }
    }
}

#[command]
pub fn set_device_name(app: AppHandle, name: String) -> Result<bool, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO device_config (key, value) VALUES ('device_name', ?1)",
        [name],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct AppSettings {
    pub launch_on_startup: bool,
    pub desktop_notifications: bool,
    pub auto_sync_enabled: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings {
            launch_on_startup: true,
            desktop_notifications: false,
            auto_sync_enabled: true,
        }
    }
}

#[command]
pub fn get_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let mut settings = AppSettings::default();

    // Read each setting from the database
    if let Ok(mut stmt) =
        conn.prepare("SELECT key, value FROM device_config WHERE key LIKE 'setting_%'")
    {
        let rows = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;

        for row in rows {
            if let Ok((key, value)) = row {
                match key.as_str() {
                    "setting_launch_startup" => {
                        settings.launch_on_startup = value == "true";
                    }
                    "setting_notifications" => {
                        settings.desktop_notifications = value == "true";
                    }
                    "setting_auto_sync" => {
                        settings.auto_sync_enabled = value == "true";
                    }
                    _ => {}
                }
            }
        }
    }

    Ok(settings)
}

#[command]
pub fn save_app_settings(app: AppHandle, settings: AppSettings) -> Result<bool, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO device_config (key, value) VALUES ('setting_launch_startup', ?1)",
        [settings.launch_on_startup.to_string()],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO device_config (key, value) VALUES ('setting_notifications', ?1)",
        [settings.desktop_notifications.to_string()],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO device_config (key, value) VALUES ('setting_auto_sync', ?1)",
        [settings.auto_sync_enabled.to_string()],
    )
    .map_err(|e| e.to_string())?;

    // Handle autostart
    // FIX 2: Use .autolaunch() instead of .autostart()
    let autostart_manager = app.autolaunch();

    if settings.launch_on_startup {
        let _ = autostart_manager.enable();
    } else {
        let _ = autostart_manager.disable();
    }

    Ok(true)
}

#[command]
pub fn write_file(path: String, content: Vec<u8>) -> Result<(), String> {
    std::fs::write(path, content).map_err(|e| e.to_string())
}

/// Opens a folder in the system's native file explorer
#[command]
pub fn open_folder(path: String) -> Result<(), String> {
    let path = std::path::Path::new(&path);
    println!("Opening folder: {}", path.display());
    
    // Check if path exists
    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }
    
    // Check if it's a directory
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", path.display()));
    }
    
    // Canonicalize the path to get the absolute path
    let canonical_path = path.canonicalize()
        .map_err(|e| format!("Failed to resolve path: {}", e))?;
    
    println!("Canonical path: {}", canonical_path.display());
    
    #[cfg(target_os = "windows")]
    {
        // On Windows, use explorer with the path directly
        // The path needs to be passed as a string, not a Path object
        let path_str = canonical_path.to_string_lossy().to_string();
        // Remove the \\?\ prefix that canonicalize adds on Windows
        let clean_path = path_str.strip_prefix(r"\\?\").unwrap_or(&path_str);
        
        println!("Clean path for explorer: {}", clean_path);
        
        std::process::Command::new("explorer")
            .arg(clean_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&canonical_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&canonical_path)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    
    Ok(())
}
