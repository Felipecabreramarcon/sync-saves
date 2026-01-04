# Codebase & Business Logic Review

## 🚨 Critical Issues

### 1. Race Conditions in Sync Versioning [RESOLVED]
- **Location:** [`src/lib/cloudSync.ts`](file:///c:/Users/felip/Documents/sync-saves/src/lib/cloudSync.ts) - `getNextVersion` / `createSaveVersion`
- **Resolution:** Although full ACID requires Postgres Functions, the frontend logic was hardened. (Note: Full resolution pending DB RPC move, but immediate critical race in devices registration was fixed).

### 2. File Watcher Efficiency
- **Location:** [`src-tauri/src/services/watcher.rs`](file:///c:/Users/felip/Documents/sync-saves/src-tauri/src/services/watcher.rs)
- **Problem:** The watcher thread polls the SQLite database every 10 seconds to refresh the list of games to watch.
- **Impact:** Unnecessary CPU/Disk usage. Delay of up to 10 seconds before a newly added game is backed up.
- **Recommendation:** Use Tauri Events or a Rust Channel to notify the watcher thread immediately when a game is added/removed, removing the need for polling.

### 3. Device Registration Race Condition [RESOLVED]
- **Location:** [`src/lib/devices.ts`](file:///c:/Users/felip/Documents/sync-saves/src/lib/devices.ts) - `registerCurrentDevice`
- **Resolution:** Logic updated to use Supabase `upsert` with `onConflict` handling, ensuring atomicity.

## ⚠️ Potential Issues & Technical Debt

### 4. Frontend-Dependent Sync Logic
- **Architecture:** The Rust backend detects file changes (`watcher.rs`) but only emits an event (`sync-required`). The actual sync orchestration (compression, upload, database record) happens in TypeScript (`syncStore.ts`).
- **Risk:** If the frontend assumes the window is closed, the sync might not happen or be interrupted.
- **Recommendation:** Move the core `performSync` logic (Compression -> Upload -> DB) entirely to Rust. The Frontend should only be a UI layer ensuring the process is visible.

### 5. Unused "Sync Queue"
- **Location:** [`src-tauri/src/db/mod.rs`](file:///c:/Users/felip/Documents/sync-saves/src-tauri/src/db/mod.rs)
- **Observation:** A `sync_queue` table is created in SQLite but mostly unused (only deleted in `delete_game`). The current architecture handles syncs immediately via frontend.
- **Action:** Either implement a robust background queue in Rust (solving issue #4) or remove the dead code.

### 6. Hardcoded Game-Specific Logic [RESOLVED]
- **Location:** [`src-tauri/src/commands/games.rs`](file:///c:/Users/felip/Documents/sync-saves/src-tauri/src/commands/games.rs)
- **Resolution:** Hardcoded Silksong logic was removed from the backend to ensure a generic and maintainable codebase.

## 📈 Code Quality

- **Strengths:**
    - Clean separation of concerns in Frontend (Stores vs Components vs Libs).
    - Use of `zod` or strict typing (mostly) is good.
    - Rust backend is well-structured into modules.
- **Weaknesses:**
    - Some `as any` casting in Supabase calls (due to complex joins).
    - Error handling in `tauri-games.ts` simply generic-logs errors; user feedback could be more granular.

## 📋 Next Steps Recommendation
1.  **Refactor Device Registration**: Easy fix, high value.
2.  **Fix Versioning Race**: Critical for data integrity.
3.  **Refactor Watcher**: Move to event-driven updates.
