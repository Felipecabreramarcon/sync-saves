use crate::db;
use serde::{Deserialize, Serialize};
use tauri::{command, AppHandle};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
pub struct LocalGame {
    id: String,
    name: String,
    slug: String,
    cover_url: Option<String>,
    platform: String,
    local_path: String,
    sync_enabled: bool,
    status: String,
}

#[command]
pub fn get_all_games(app: AppHandle) -> Result<Vec<LocalGame>, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, slug, cover_url, platform, local_path, sync_enabled, status 
         FROM games_cache",
        )
        .map_err(|e| e.to_string())?;

    let games_iter = stmt
        .query_map([], |row| {
            Ok(LocalGame {
                id: row.get(0)?,
                name: row.get(1)?,
                slug: row.get(2)?,
                cover_url: row.get(3)?,
                platform: row.get(4)?,
                local_path: row.get(5)?,
                sync_enabled: row.get::<_, i32>(6)? != 0,
                status: row.get(7)?,
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
        status: "idle".to_string(),
    })
}

#[command]
pub fn delete_game(app: AppHandle, game_id: String) -> Result<bool, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM games_cache WHERE id = ?1",
        [&game_id],
    )
    .map_err(|e| e.to_string())?;
    
    // Also remove from sync queue if any pending
    conn.execute(
        "DELETE FROM sync_queue WHERE game_id = ?1",
        [&game_id],
    )
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
            "SELECT id, name, slug, cover_url, platform, local_path, sync_enabled, status 
             FROM games_cache WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let current_game = stmt
        .query_row([&game_id], |row| {
            Ok(LocalGame {
                id: row.get(0)?,
                name: row.get(1)?,
                slug: row.get(2)?,
                cover_url: row.get(3)?,
                platform: row.get(4)?,
                local_path: row.get(5)?,
                sync_enabled: row.get::<_, i32>(6)? != 0,
                status: row.get(7)?,
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

    // Update the database
    conn.execute(
        "UPDATE games_cache 
         SET name = ?1, slug = ?2, local_path = ?3, platform = ?4, sync_enabled = ?5, cover_url = ?6
         WHERE id = ?7",
        rusqlite::params![
            &new_name,
            &new_slug,
            &new_local_path,
            &new_platform,
            if new_sync_enabled { 1 } else { 0 },
            &new_cover_url,
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
        status: current_game.status,
    })
}
