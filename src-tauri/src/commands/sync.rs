use crate::db;
use crate::services::{compression, extraction};
use base64::{engine::general_purpose, Engine as _};
use reqwest::header::{CONTENT_TYPE, AUTHORIZATION};
use reqwest::multipart;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::Path;
use sysinfo::System;
use tauri::{command, AppHandle};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
pub struct SyncResult {
    pub success: bool,
    pub message: String,
    pub file_size: Option<u64>,
    pub checksum: Option<String>,
    pub version_id: Option<String>,
    pub duration_ms: Option<u64>,
    pub cloud_game_id: Option<String>,
    pub device_id: Option<String>,
    pub skipped: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AuthConfig {
    pub url: String,
    pub key: String,
    pub token: String,
    pub user_id: String,
}

// Helper types for Supabase responses
#[derive(Deserialize)]
struct CloudGame {
    id: String,
}

#[derive(Deserialize)]
struct CloudChecksum {
    checksum: String,
}

#[derive(Deserialize)]
struct CloudDevice {
    id: String,
}

#[command]
pub async fn sync_game(
    app: AppHandle,
    game_id: String,
    auth: AuthConfig,
) -> Result<SyncResult, String> {
    let start_time = std::time::Instant::now();
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    // 1. Get Game Details
    let (name, slug, local_path, sync_enabled, cover_url): (String, String, String, bool, Option<String>) = conn
        .query_row(
            "SELECT name, slug, local_path, sync_enabled, cover_url FROM games_cache WHERE id = ?1",
            [&game_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get::<_, i32>(3)? != 0, row.get(4)?)),
        )
        .map_err(|e| format!("Game not found: {}", e))?;

    if !sync_enabled {
        return Err("Sync is disabled for this game".to_string());
    }

    let src_path = Path::new(&local_path);
    if !src_path.exists() {
        return Err(format!("Local path does not exist: {}", local_path));
    }

    // 2. Compress
    let dst_path = compression::get_temp_zip_path(&slug);
    compression::compress_path(src_path, &dst_path)
        .map_err(|e| format!("Compression failed: {}", e))?;

    // 3. Calculate Checksum
    let mut file = fs::File::open(&dst_path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];
    loop {
        let count = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }
    let checksum = hex::encode(hasher.finalize());
    let file_size = file.metadata().map_err(|e| e.to_string())?.len(); // Get size

    // Drop file handle to allow reading later if needed (though we just read it)
    drop(file);

    let client = reqwest::Client::new();
    let headers = construct_headers(&auth.key, &auth.token);

    // 4. Ensure Device Exists (Register Device)
    // FIX: Get REAL persistent machine ID from system.rs Logic
    let machine_id = crate::commands::system::get_or_create_device_id(&app)
        .map_err(|e| format!("Failed to get valid machine ID: {}", e))?;
        
    let hostname = System::host_name().unwrap_or("Unknown PC".to_string());

    let device_id = ensure_device(&client, &auth, &machine_id, &hostname).await?;

    // 5. Ensure Cloud Game Exists
    let cloud_game_id = ensure_cloud_game(&client, &auth, &name, &slug, cover_url.as_deref()).await?;

    // 6. Upsert Game Path
    upsert_game_path(&client, &auth, &cloud_game_id, &device_id, &local_path, true).await?;

    // 7. Check Latest Checksum
    let latest_checksum = get_latest_checksum(&client, &auth, &cloud_game_id).await?;
    
    if let Some(latest) = latest_checksum {
        if latest == checksum {
            let _ = fs::remove_file(&dst_path);
            return Ok(SyncResult {
                success: true,
                message: "Content unchanged, sync skipped".to_string(),
                file_size: Some(file_size),
                checksum: Some(checksum),
                version_id: None,
                duration_ms: Some(start_time.elapsed().as_millis() as u64),
                cloud_game_id: Some(cloud_game_id),
                device_id: Some(device_id),
                skipped: true,
            });
        }
    }

    // 8. Upload File
    let version_id = Uuid::new_v4().to_string();
    let storage_path = format!("{}/{}/{}.zip", auth.user_id, slug, version_id);

    // Re-open file for upload body
    // reqwest multipart file from path
    let file_content = fs::read(&dst_path).map_err(|e| format!("Failed to read zip for upload: {}", e))?;
    
    let part = multipart::Part::bytes(file_content)
        .file_name(format!("{}.zip", version_id))
        .mime_str("application/zip")
        .map_err(|e| e.to_string())?;

    let form = multipart::Form::new().part("", part);

    let upload_res = client
        .post(format!("{}/storage/v1/object/saves/{}", auth.url, storage_path))
        .headers(headers.clone()) // Headers need to be cloned or reconstructed
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Upload request failed: {}", e))?;

    if !upload_res.status().is_success() {
        let err_text = upload_res.text().await.unwrap_or_default();
        return Err(format!("Upload failed: {}", err_text));
    }

    // 9. Create Save Version Record
    create_save_version(&client, &auth, &version_id, &cloud_game_id, &device_id, &storage_path, file_size, &checksum).await?;

    // 10. Clean up
    let _ = fs::remove_file(&dst_path);

    Ok(SyncResult {
        success: true,
        message: "Sync successful".to_string(),
        file_size: Some(file_size),
        checksum: Some(checksum),
        version_id: Some(version_id),
        duration_ms: Some(start_time.elapsed().as_millis() as u64),
        cloud_game_id: Some(cloud_game_id),
        device_id: Some(device_id),
        skipped: false,
    })
}

// --- Helper Functions ---

fn construct_headers(key: &str, token: &str) -> reqwest::header::HeaderMap {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("apikey", key.parse().unwrap());
    headers.insert(AUTHORIZATION, format!("Bearer {}", token).parse().unwrap());
    headers
}

async fn ensure_device(client: &reqwest::Client, auth: &AuthConfig, machine_id: &str, device_name: &str) -> Result<String, String> {
    // Try to find device by MACHINE ID (not name)
    let url = format!("{}/rest/v1/devices?user_id=eq.{}&machine_id=eq.{}&select=id", auth.url, auth.user_id, machine_id);
    let res = client.get(&url).headers(construct_headers(&auth.key, &auth.token)).send().await.map_err(|e| e.to_string())?;
    
    let devices: Vec<CloudDevice> = res.json().await.map_err(|e| e.to_string())?;
    if let Some(d) = devices.first() {
        return Ok(d.id.clone());
    }

    // Create device (UPSERT technically matches devices.ts, but here check-then-create is fine for now if no race condition)
    // Actually, to fully match devices.ts, we should UPSERT to handle name changes.
    // Using POST with Prefer: resolution=merge-duplicates on user_id, machine_id constraint
    
    let create_url = format!("{}/rest/v1/devices", auth.url);
    let body = serde_json::json!({
        "user_id": auth.user_id,
        "machine_id": machine_id,
        "name": device_name,
        "type": "desktop",
        "os": std::env::consts::OS
    });

    let res = client.post(&create_url)
        .headers(construct_headers(&auth.key, &auth.token))
        .header("Prefer", "return=representation,resolution=merge-duplicates") // Ensure this matches constraint
        .header(CONTENT_TYPE, "application/json")
        .json(&body)
        .send().await.map_err(|e| e.to_string())?;

    let created: Vec<CloudDevice> = res.json().await.map_err(|e| format!("Failed to parse created device: {}", e))?;
    created.first().map(|d| d.id.clone()).ok_or("Failed to create device".to_string())
}

async fn ensure_cloud_game(client: &reqwest::Client, auth: &AuthConfig, name: &str, slug: &str, cover_url: Option<&str>) -> Result<String, String> {
    let url = format!("{}/rest/v1/games?user_id=eq.{}&slug=eq.{}&select=id", auth.url, auth.user_id, slug);
    let res = client.get(&url).headers(construct_headers(&auth.key, &auth.token)).send().await.map_err(|e| e.to_string())?;
    
    let games: Vec<CloudGame> = res.json().await.map_err(|e| e.to_string())?;
    if let Some(g) = games.first() {
        return Ok(g.id.clone());
    }

    // Create game
    let create_url = format!("{}/rest/v1/games", auth.url);
    let body = serde_json::json!({
        "user_id": auth.user_id,
        "name": name,
        "slug": slug,
        "cover_url": cover_url
    });

    let res = client.post(&create_url)
        .headers(construct_headers(&auth.key, &auth.token))
        .header("Prefer", "return=representation")
        .header(CONTENT_TYPE, "application/json")
        .json(&body)
        .send().await.map_err(|e| e.to_string())?;

    let created: Vec<CloudGame> = res.json().await.map_err(|e| e.to_string())?;
    created.first().map(|g| g.id.clone()).ok_or("Failed to create cloud game".to_string())
}

async fn upsert_game_path(client: &reqwest::Client, auth: &AuthConfig, cloud_game_id: &str, device_id: &str, local_path: &str, sync_enabled: bool) -> Result<(), String> {
    let url = format!("{}/rest/v1/game_paths", auth.url);
    let body = serde_json::json!({
        "game_id": cloud_game_id,
        "device_id": device_id,
        "local_path": local_path,
        "sync_enabled": sync_enabled
    });

    let res = client.post(&url)
        .headers(construct_headers(&auth.key, &auth.token))
        .header("Prefer", "resolution=merge-duplicates")
        .header(CONTENT_TYPE, "application/json")
        .json(&body)
        .send().await.map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Failed to upsert game path: {}", res.status()));
    }
    Ok(())
}

async fn get_latest_checksum(client: &reqwest::Client, auth: &AuthConfig, cloud_game_id: &str) -> Result<Option<String>, String> {
    let url = format!("{}/rest/v1/save_versions?game_id=eq.{}&is_latest=eq.true&select=checksum", auth.url, cloud_game_id);
    let res = client.get(&url).headers(construct_headers(&auth.key, &auth.token)).send().await.map_err(|e| e.to_string())?;
    
    let versions: Vec<CloudChecksum> = res.json().await.map_err(|e| e.to_string())?;
    Ok(versions.first().map(|v| v.checksum.clone()))
}

async fn create_save_version(client: &reqwest::Client, auth: &AuthConfig, id: &str, game_id: &str, device_id: &str, file_path: &str, file_size: u64, checksum: &str) -> Result<(), String> {
    // Unset previous latest
    let update_url = format!("{}/rest/v1/save_versions?game_id=eq.{}&is_latest=eq.true", auth.url, game_id);
    let _ = client.patch(&update_url)
        .headers(construct_headers(&auth.key, &auth.token))
        .header(CONTENT_TYPE, "application/json")
        .json(&serde_json::json!({ "is_latest": false }))
        .send().await;

    // Create new
    let create_url = format!("{}/rest/v1/save_versions", auth.url);
    let body = serde_json::json!({
        "id": id,
        "game_id": game_id,
        "device_id": device_id,
        "file_path": file_path,
        "file_size": file_size,
        "checksum": checksum,
        "is_latest": true
    });

    let res = client.post(&create_url)
        .headers(construct_headers(&auth.key, &auth.token))
        .header(CONTENT_TYPE, "application/json")
        .json(&body)
        .send().await.map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Failed to create save version: {}", res.status()));
    }
    Ok(())
}


#[command]
pub fn restore_game(app: AppHandle, game_id: String, base64_data: String) -> Result<bool, String> {
    let conn = db::get_connection(&app).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT slug, local_path FROM games_cache WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let (slug, local_path): (String, String) = stmt
        .query_row([game_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| e.to_string())?;

    let bytes = general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| e.to_string())?;
    let temp_zip = compression::get_temp_zip_path(&format!("{}_restore", slug));
    fs::write(&temp_zip, bytes).map_err(|e| e.to_string())?;

    let target = Path::new(&local_path);
    extraction::extract_zip(&temp_zip, target).map_err(|e| e.to_string())?;

    let _ = fs::remove_file(&temp_zip);

    Ok(true)
}
