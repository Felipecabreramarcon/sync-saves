use sysinfo::System;
use tauri::{command, AppHandle};
use crate::db;

#[derive(serde::Serialize)]
pub struct SystemInfo {
    os_name: String,
    os_version: String,
    hostname: String,
    total_memory: u64,
}

#[command]
pub fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    SystemInfo {
        os_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
        os_version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
        hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
        total_memory: sys.total_memory(),
    }
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
    ).map_err(|e| e.to_string())?;
    Ok(true)
}
