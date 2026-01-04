use rusqlite::{Connection, Result};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn init_db(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");

    // Create app dir if not exists
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)?;
    }

    let db_path = app_dir.join("sync_saves.db");
    let conn = Connection::open(db_path)?;

    // Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;", [])?;

    // Create tables
    create_tables(&conn)?;

    Ok(())
}

fn create_tables(conn: &Connection) -> Result<()> {
    // Device config table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS device_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    // Games cache table (local mirror of some remote data + local paths)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS games_cache (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            cover_url TEXT,
            platform TEXT,
            local_path TEXT,
            sync_enabled INTEGER DEFAULT 1,
            last_synced_at TEXT,
            last_synced_id TEXT,
            status TEXT DEFAULT 'idle',
            completion_percentage REAL DEFAULT 0,
            play_time_seconds INTEGER DEFAULT 0,
            last_analyzed_at TEXT,
            custom_script_path TEXT,
            analysis_config TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    // Version analysis results table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS version_analysis (
            version_id TEXT PRIMARY KEY,
            analysis_data TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    // Add new columns if they don't exist (migration for existing DBs)
    let _ = conn.execute(
        "ALTER TABLE games_cache ADD COLUMN completion_percentage REAL DEFAULT 0",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE games_cache ADD COLUMN play_time_seconds INTEGER DEFAULT 0",
        [],
    );
    let _ = conn.execute(
        "ALTER TABLE games_cache ADD COLUMN last_analyzed_at TEXT",
        [],
    );
    let _ = conn.execute("ALTER TABLE games_cache ADD COLUMN last_synced_id TEXT", []);
    let _ = conn.execute("ALTER TABLE games_cache ADD COLUMN custom_script_path TEXT", []);
    let _ = conn.execute("ALTER TABLE games_cache ADD COLUMN analysis_config TEXT", []);

    // Sync queue table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id TEXT NOT NULL,
            action TEXT NOT NULL, -- 'upload' or 'download'
            status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'failed'
            file_path TEXT,
            priority INTEGER DEFAULT 0,
            retry_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(game_id) REFERENCES games_cache(id) ON DELETE CASCADE
        )",
        [],
    )?;

    Ok(())
}

pub fn get_db_path(app: &AppHandle) -> PathBuf {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    app_dir.join("sync_saves.db")
}

pub fn get_connection(app: &AppHandle) -> Result<Connection> {
    Connection::open(get_db_path(app))
}
