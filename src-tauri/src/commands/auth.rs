use tauri::{command, AppHandle};
use crate::db;

#[command]
pub fn set_current_user(app: AppHandle, user_id: String) -> Result<(), String> {
    // Store user_id in device_config or session state
    // For now, just persisting to device_config table
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT OR REPLACE INTO device_config (key, value) VALUES (?1, ?2)",
        ["current_user_id", &user_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub fn get_current_user(app: AppHandle) -> Result<Option<String>, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT value FROM device_config WHERE key = ?1").map_err(|e| e.to_string())?;
    let user_id_iter = stmt.query_map(["current_user_id"], |row| row.get(0)).map_err(|e| e.to_string())?;

    for user_id in user_id_iter {
        return Ok(Some(user_id.map_err(|e| e.to_string())?));
    }

    Ok(None)
}
