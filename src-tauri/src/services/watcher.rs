use notify::{RecursiveMode, Watcher, Config, RecommendedWatcher, Event};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use std::sync::mpsc::channel;
use std::time::Duration;
use crate::db;

pub fn start_watcher(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let (tx, rx) = channel();

        // Create a watcher object, delivering debounced events.
        // We use a small debounce to avoid multiple syncs for a single save operation.
        let mut watcher = RecommendedWatcher::new(tx, Config::default())
            .expect("Failed to create watcher");

        loop {
            // Get games to watch from DB
            if let Ok(conn) = db::get_connection(&app) {
                let mut stmt = conn.prepare("SELECT id, local_path FROM games_cache WHERE sync_enabled = 1").unwrap();
                let games_iter = stmt.query_map([], |row| {
                    Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
                }).unwrap();

                let mut watch_list = Vec::new();
                for game in games_iter {
                    if let Ok((id, path)) = game {
                        let p = PathBuf::from(&path);
                        if p.exists() {
                            let _ = watcher.watch(&p, RecursiveMode::Recursive);
                            watch_list.push((id, p));
                        }
                    }
                }

                // Wait for events
                if let Ok(event_res) = rx.recv_timeout(Duration::from_secs(1)) {
                    if let Ok(event) = event_res {
                        if is_relevant_event(event.clone()) {
                            // Find which game this path belongs to
                            for (id, path) in &watch_list {
                                if event.paths.iter().any(|p| p.starts_with(path)) {
                                    println!("File change detected for game {}! Triggering sync...", id);
                                    let _ = app.emit("sync-required", id);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            
            // Periodically refresh the watch list (every 10 seconds or so)
            // This is a simple implementation. A more robust one would 
            // use a channel to add/remove watches dynamically.
            std::thread::sleep(Duration::from_secs(10));
        }
    });
}

fn is_relevant_event(event: Event) -> bool {
    // We mainly care about data modifications and file creations
    event.kind.is_modify() || event.kind.is_create()
}
