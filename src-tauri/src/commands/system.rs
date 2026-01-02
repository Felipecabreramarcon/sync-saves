use tauri::command;
use sysinfo::System;

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
