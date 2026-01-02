use crate::db;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
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
    status: String,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct SilksongProgress {
    pub save_date: Option<String>,
    pub play_time_seconds: Option<f64>,
    pub respawn_scene: Option<String>,
    pub map_zone: Option<i64>,

    pub health: Option<i64>,
    pub max_health: Option<i64>,
    pub geo: Option<i64>,
    pub silk: Option<i64>,
    pub silk_max: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct SilksongStats {
    pub user_dat_files: u64,
    pub restore_point_files: u64,
    pub decoded_json_files: u64,
    pub newest_save_mtime_ms: Option<i64>,
    pub progress: Option<SilksongProgress>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct GameSaveStats {
    pub path: String,
    pub exists: bool,
    pub is_dir: bool,
    pub file_count: u64,
    pub total_bytes: u64,
    pub newest_mtime_ms: Option<i64>,
    pub silksong: Option<SilksongStats>,
}

fn system_time_to_ms(st: SystemTime) -> i64 {
    st.duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn get_i64(v: Option<&Value>) -> Option<i64> {
    v.and_then(|x| x.as_i64())
        .or_else(|| v.and_then(|x| x.as_f64()).map(|n| n as i64))
}

fn detect_silksong(name: &str, slug: &str, path: &str) -> bool {
    let n = name.to_lowercase();
    let s = slug.to_lowercase();
    let p = path.to_lowercase();
    n.contains("silksong") || s.contains("silksong") || p.contains("hollow knight silksong")
}

fn newest_json_sidecar(default_dir: &Path) -> Option<PathBuf> {
    let mut newest: Option<(i64, PathBuf)> = None;
    for entry in WalkDir::new(default_dir)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if !entry.file_type().is_file() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        // Produced by hollow.py: user1.dat.json
        if !name.to_lowercase().ends_with(".dat.json") {
            continue;
        }
        let mtime_ms = entry
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .map(system_time_to_ms)
            .unwrap_or(0);

        match &newest {
            None => newest = Some((mtime_ms, entry.path().to_path_buf())),
            Some((best_ms, _)) if mtime_ms > *best_ms => {
                newest = Some((mtime_ms, entry.path().to_path_buf()))
            }
            _ => {}
        }
    }
    newest.map(|(_, p)| p)
}

fn try_parse_silksong_progress(decoded_json_path: &Path) -> Option<SilksongProgress> {
    let text = fs::read_to_string(decoded_json_path).ok()?;
    let json: Value = serde_json::from_str(&text).ok()?;

    // Known structure from decoded Silksong saves.
    let pd = json.get("playerData")?.as_object()?;

    let play_time_seconds = pd.get("playTime").and_then(|v| v.as_f64());
    let save_date = pd
        .get("date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let respawn_scene = pd
        .get("respawnScene")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let map_zone = get_i64(pd.get("mapZone"));

    let health = get_i64(pd.get("health"));
    let max_health = get_i64(pd.get("maxHealth"));
    let geo = get_i64(pd.get("geo"));
    let silk = get_i64(pd.get("silk"));
    let silk_max = get_i64(pd.get("silkMax"));

    // If we didn't extract anything meaningful, return None.
    if play_time_seconds.is_none()
        && save_date.is_none()
        && respawn_scene.is_none()
        && map_zone.is_none()
        && health.is_none()
        && max_health.is_none()
        && geo.is_none()
        && silk.is_none()
        && silk_max.is_none()
    {
        return None;
    }

    Some(SilksongProgress {
        save_date,
        play_time_seconds,
        respawn_scene,
        map_zone,
        health,
        max_health,
        geo,
        silk,
        silk_max,
    })
}

fn compute_silksong_stats(root: &Path) -> SilksongStats {
    let mut stats = SilksongStats::default();
    let default_dir = root.join("default");

    // If we don't see the expected structure, treat as unsupported.
    if !default_dir.exists() || !default_dir.is_dir() {
        return stats;
    }

    let mut newest_save_mtime_ms: Option<i64> = None;

    for entry in WalkDir::new(&default_dir)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let lower_name = name.to_lowercase();
        let rel = path
            .strip_prefix(&default_dir)
            .ok()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        let rel_lower = rel.to_lowercase();

        let mtime_ms = entry
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .map(system_time_to_ms);

        if lower_name.starts_with("user") && lower_name.ends_with(".dat") {
            stats.user_dat_files += 1;
            if let Some(ms) = mtime_ms {
                newest_save_mtime_ms = Some(newest_save_mtime_ms.map(|x| x.max(ms)).unwrap_or(ms));
            }
        }

        if lower_name.ends_with(".dat.json") {
            stats.decoded_json_files += 1;
        }

        if rel_lower.contains("restore_points") {
            stats.restore_point_files += 1;
        }
    }

    stats.newest_save_mtime_ms = newest_save_mtime_ms;

    // Only try to interpret progress when a decoded sidecar exists.
    if let Some(json_path) = newest_json_sidecar(&default_dir) {
        stats.progress = try_parse_silksong_progress(&json_path);
    }

    stats
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
pub fn get_game_save_stats(app: AppHandle, game_id: String) -> Result<GameSaveStats, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT name, slug, local_path FROM games_cache WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let (name, slug, local_path): (String, String, String) = stmt
        .query_row([&game_id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
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
        silksong: None,
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

    // Only run Silksong-specific logic when we can reasonably expect it to work.
    if detect_silksong(&name, &slug, &local_path) {
        out.silksong = Some(compute_silksong_stats(path));
    }

    Ok(out)
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
