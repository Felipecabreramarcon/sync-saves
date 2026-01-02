use crate::db;
use crate::services::{compression, extraction};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::{command, AppHandle};
use base64::{Engine as _, engine::general_purpose};
use std::fs;

#[derive(Serialize, Deserialize, Debug)]
pub struct SyncResult {
    pub success: bool,
    pub file_name: String,
    pub base64_data: String,
    pub message: String,
}

#[command]
pub fn sync_game(app: AppHandle, game_id: String) -> Result<SyncResult, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT name, slug, local_path FROM games_cache WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    let (name, slug, local_path): (String, String, String) = stmt
        .query_row([game_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .map_err(|e| e.to_string())?;

    let src_path = Path::new(&local_path);
    if !src_path.exists() {
        return Err(format!("Local path does not exist: {}", local_path));
    }

    let dst_path = compression::get_temp_zip_path(&slug);
    
    compression::compress_folder(src_path, &dst_path)
        .map_err(|e| format!("Compression failed: {}", e))?;

    let bytes = fs::read(&dst_path).map_err(|e| format!("Failed to read zip: {}", e))?;
    let b64 = general_purpose::STANDARD.encode(bytes);

    let _ = fs::remove_file(&dst_path);

    Ok(SyncResult {
        success: true,
        file_name: format!("{}.zip", slug),
        base64_data: b64,
        message: format!("Successfully compressed {}", name),
    })
}

#[command]
pub fn restore_game(app: AppHandle, game_id: String, base64_data: String) -> Result<bool, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    
    let mut stmt = conn
        .prepare("SELECT slug, local_path FROM games_cache WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    
    let (slug, local_path): (String, String) = stmt
        .query_row([game_id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .map_err(|e| e.to_string())?;

    let bytes = general_purpose::STANDARD.decode(base64_data).map_err(|e| e.to_string())?;
    let temp_zip = compression::get_temp_zip_path(&format!("{}_restore", slug));
    fs::write(&temp_zip, bytes).map_err(|e| e.to_string())?;

    let target = Path::new(&local_path);
    extraction::extract_zip(&temp_zip, target).map_err(|e| e.to_string())?;

    let _ = fs::remove_file(&temp_zip);

    Ok(true)
}
