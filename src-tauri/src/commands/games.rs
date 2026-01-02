use tauri::{command, AppHandle};
use serde::{Serialize, Deserialize};
use crate::db;
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
    
    let mut stmt = conn.prepare(
        "SELECT id, name, slug, cover_url, platform, local_path, sync_enabled, status 
         FROM games_cache"
    ).map_err(|e| e.to_string())?;

    let games_iter = stmt.query_map([], |row| {
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
    }).map_err(|e| e.to_string())?;

    let mut games = Vec::new();
    for game in games_iter {
        games.push(game.map_err(|e| e.to_string())?);
    }

    Ok(games)
}

#[command]
pub fn add_game(app: AppHandle, name: String, local_path: String, platform: String) -> Result<LocalGame, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let slug = name.to_lowercase().replace(" ", "-"); // Simple slug for now

    conn.execute(
        "INSERT INTO games_cache (id, name, slug, platform, local_path, sync_enabled, status)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, 'idle')",
        [&id, &name, &slug, &platform, &local_path],
    ).map_err(|e| e.to_string())?;

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
