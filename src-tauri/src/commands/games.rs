use crate::db;
use rusqlite::OptionalExtension;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{command, AppHandle};
use uuid::Uuid;
use walkdir::WalkDir;

#[derive(Serialize, Deserialize, Debug)]
pub struct LocalGame {
    id: String,
    name: String,
    slug: String,
    cover_url: Option<String>,
    platform: String,
    local_path: String,
    sync_enabled: bool,
    last_synced_id: Option<String>,
    status: String,
    custom_script_path: Option<String>,
    analysis_config: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct GameSaveStats {
    pub path: String,
    pub exists: bool,
    pub is_dir: bool,
    pub file_count: u64,
    pub total_bytes: u64,
    pub newest_mtime_ms: Option<i64>,
}

fn system_time_to_ms(st: SystemTime) -> i64 {
    st.duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[command]
pub fn get_all_games(app: AppHandle) -> Result<Vec<LocalGame>, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, slug, cover_url, platform, local_path, sync_enabled, last_synced_id, status, custom_script_path, analysis_config 
         FROM games_cache",
        )
        .map_err(|e| e.to_string())?;

    let games_iter = stmt
        .query_map([], |row| {
            let config_json: Option<String> = row.get(10)?;
            let analysis_config = config_json
                .and_then(|s| serde_json::from_str(&s).ok());

            Ok(LocalGame {
                id: row.get(0)?,
                name: row.get(1)?,
                slug: row.get(2)?,
                cover_url: row.get(3)?,
                platform: row.get(4)?,
                local_path: row.get(5)?,
                sync_enabled: row.get::<_, i32>(6)? != 0,
                last_synced_id: row.get(7)?,
                status: row.get(8)?,
                custom_script_path: row.get(9)?,
                analysis_config,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut games = Vec::new();
    for game in games_iter {
        games.push(game.map_err(|e| e.to_string())?);
    }

    Ok(games)
}

#[command]
pub fn add_game(
    app: AppHandle,
    name: String,
    local_path: String,
    platform: String,
) -> Result<LocalGame, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let slug = name.to_lowercase().replace(" ", "-"); // Simple slug for now

    conn.execute(
        "INSERT INTO games_cache (id, name, slug, platform, local_path, sync_enabled, status)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, 'idle')",
        [&id, &name, &slug, &platform, &local_path],
    )
    .map_err(|e| e.to_string())?;

    Ok(LocalGame {
        id,
        name,
        slug,
        cover_url: None,
        platform,
        local_path,
        sync_enabled: true,
        last_synced_id: None,
        status: "idle".to_string(),
        custom_script_path: None,
        analysis_config: None,
    })
}

#[command]
pub fn get_game_save_stats(app: AppHandle, game_id: String) -> Result<GameSaveStats, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT local_path FROM games_cache WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let local_path: String = stmt
        .query_row([&game_id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let path = Path::new(&local_path);
    let exists = path.exists();
    let is_dir = exists && path.is_dir();

    let mut out = GameSaveStats {
        path: local_path.clone(),
        exists,
        is_dir,
        file_count: 0,
        total_bytes: 0,
        newest_mtime_ms: None,
    };

    if !is_dir {
        // Path validation failed; return stats object (no error) so UI can decide what to show.
        return Ok(out);
    }

    let mut newest_mtime_ms: Option<i64> = None;
    let mut file_count: u64 = 0;
    let mut total_bytes: u64 = 0;

    for entry in WalkDir::new(path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if !entry.file_type().is_file() {
            continue;
        }

        file_count += 1;
        if let Ok(md) = entry.metadata() {
            total_bytes = total_bytes.saturating_add(md.len());
            if let Ok(modified) = md.modified() {
                let ms = system_time_to_ms(modified);
                newest_mtime_ms = Some(newest_mtime_ms.map(|x| x.max(ms)).unwrap_or(ms));
            }
        }
    }

    out.file_count = file_count;
    out.total_bytes = total_bytes;
    out.newest_mtime_ms = newest_mtime_ms;

    Ok(out)
}

#[command]
pub fn delete_game(app: AppHandle, game_id: String) -> Result<bool, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM games_cache WHERE id = ?1", [&game_id])
        .map_err(|e| e.to_string())?;

    // Also remove from sync queue if any pending
    conn.execute("DELETE FROM sync_queue WHERE game_id = ?1", [&game_id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

#[derive(Deserialize, Debug)]
pub struct UpdateGameParams {
    pub name: Option<String>,
    pub local_path: Option<String>,
    pub platform: Option<String>,
    pub sync_enabled: Option<bool>,
    pub cover_url: Option<String>,
    pub custom_script_path: Option<String>,
    pub analysis_config: Option<serde_json::Value>,
}

#[command]
pub fn update_game(
    app: AppHandle,
    game_id: String,
    updates: UpdateGameParams,
) -> Result<LocalGame, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    // First, get the current game data
    let mut stmt = conn
        .prepare(
            "SELECT id, name, slug, cover_url, platform, local_path, sync_enabled, last_synced_id, status, custom_script_path, analysis_config 
             FROM games_cache WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let current_game = stmt
        .query_row([&game_id], |row| {
            let config_json: Option<String> = row.get(10)?;
            let analysis_config = config_json
                .and_then(|s| serde_json::from_str(&s).ok());

            Ok(LocalGame {
                id: row.get(0)?,
                name: row.get(1)?,
                slug: row.get(2)?,
                cover_url: row.get(3)?,
                platform: row.get(4)?,
                local_path: row.get(5)?,
                sync_enabled: row.get::<_, i32>(6)? != 0,
                last_synced_id: row.get(7)?,
                status: row.get(8)?,
                custom_script_path: row.get(9)?,
                analysis_config,
            })
        })
        .map_err(|e| e.to_string())?;

    // Apply updates
    let new_name = updates.name.unwrap_or(current_game.name);
    let new_slug = new_name.to_lowercase().replace(" ", "-");
    let new_local_path = updates.local_path.unwrap_or(current_game.local_path);
    let new_platform = updates.platform.unwrap_or(current_game.platform);
    let new_sync_enabled = updates.sync_enabled.unwrap_or(current_game.sync_enabled);
    let new_cover_url = updates.cover_url.or(current_game.cover_url);
    let new_custom_script_path = updates.custom_script_path.or(current_game.custom_script_path);
    
    // For analysis config, if update is provided, use it, otherwise keep current
    // Note: If update is provided as explicit null (Option<Value>), it means we want to clear it? 
    // Or does serde skip missing fields?
    // In UpdateGameParams, fields are Option<T>. If missing (None), we shouldn't change.
    // If we want to unset, we'd need Option<Option<T>> but that's complex.
    // Assuming None means "no change".
    let new_analysis_config = updates.analysis_config.or(current_game.analysis_config);
    
    let analysis_config_str = new_analysis_config
        .as_ref()
        .and_then(|v| serde_json::to_string(v).ok());

    // Update the database
    conn.execute(
        "UPDATE games_cache 
         SET name = ?1, slug = ?2, local_path = ?3, platform = ?4, sync_enabled = ?5, cover_url = ?6, custom_script_path = ?7, analysis_config = ?8
         WHERE id = ?9",
        rusqlite::params![
            &new_name,
            &new_slug,
            &new_local_path,
            &new_platform,
            if new_sync_enabled { 1 } else { 0 },
            &new_cover_url,
            &new_custom_script_path,
            &analysis_config_str,
            &game_id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(LocalGame {
        id: game_id,
        name: new_name,
        slug: new_slug,
        cover_url: new_cover_url,
        platform: new_platform,
        local_path: new_local_path,
        sync_enabled: new_sync_enabled,
        last_synced_id: current_game.last_synced_id,
        status: current_game.status,
        custom_script_path: new_custom_script_path,
        analysis_config: new_analysis_config,
    })
}

#[command]
pub fn get_version_analysis(app: AppHandle, version_id: String) -> Result<Option<String>, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT analysis_data FROM version_analysis WHERE version_id = ?1")
        .map_err(|e| e.to_string())?;

    let analysis_data: Option<String> = stmt
        .query_row([&version_id], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(analysis_data)
}

#[command]
pub fn save_version_analysis(
    app: AppHandle,
    version_id: String,
    analysis_data: String,
) -> Result<(), String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT OR REPLACE INTO version_analysis (version_id, analysis_data) VALUES (?1, ?2)",
        [&version_id, &analysis_data],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
