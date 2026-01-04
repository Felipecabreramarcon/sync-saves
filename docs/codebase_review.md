# Codebase & Business Logic Review

## 🚨 Critical Issues

### 1. Race Conditions in Sync Versioning
- **Location:** [`src/lib/cloudSync.ts`](file:///c:/Users/felip/Documents/sync-saves/src/lib/cloudSync.ts) - `getNextVersion` / `createSaveVersion`
- **Problem:** The logic fetches the latest version number (`SELECT MAX(version)`) and then performs an `INSERT` with `version + 1`.
- **Impact:** If two devices sync simultaneously, they will both try to create the same version number. Depending on database constraints, one will fail (error) or both will succeed (duplicate versions), breaking the "latest" logic.
- **Recommendation:** Use a Database Function (RPC) or a proper serial/sequence approach in Postgres to atomically increment and insert, or rely on `created_at` for ordering instead of integer versions.

### 2. File Watcher Efficiency
- **Location:** [`src-tauri/src/services/watcher.rs`](file:///c:/Users/felip/Documents/sync-saves/src-tauri/src/services/watcher.rs)
- **Problem:** The watcher thread polls the SQLite database every 10 seconds to refresh the list of games to watch.
- **Impact:** Unnecessary CPU/Disk usage. Delay of up to 10 seconds before a newly added game is backed up.
- **Recommendation:** Use Tauri Events or a Rust Channel to notify the watcher thread immediately when a game is added/removed, removing the need for polling.

### 3. Device Registration Race Condition
- **Location:** [`src/lib/devices.ts`](file:///c:/Users/felip/Documents/sync-saves/src/lib/devices.ts) - `registerCurrentDevice`
- **Problem:** Performs `SELECT` -> Check -> `INSERT/UPDATE`.
- **Impact:** Classic Check-Then-Act (TOCTOU) race condition. If the app starts multiple async calls, it might create duplicate devices if the unique constraint is missing or just error out.
- **Recommendation:** Use Supabase `upsert` with `onConflict` on the `machine_id` + `user_id` columns to make this atomic.

## ⚠️ Potential Issues & Technical Debt

### 4. Frontend-Dependent Sync Logic
- **Architecture:** The Rust backend detects file changes (`watcher.rs`) but only emits an event (`sync-required`). The actual sync orchestration (compression, upload, database record) happens in TypeScript (`syncStore.ts`).
- **Risk:** If the frontend assumes the window is closed, the sync might not happen or be interrupted.
- **Recommendation:** Move the core `performSync` logic (Compression -> Upload -> DB) entirely to Rust. The Frontend should only be a UI layer ensuring the process is visible.

### 5. Unused "Sync Queue"
- **Location:** [`src-tauri/src/db/mod.rs`](file:///c:/Users/felip/Documents/sync-saves/src-tauri/src/db/mod.rs)
- **Observation:** A `sync_queue` table is created in SQLite but mostly unused (only deleted in `delete_game`). The current architecture handles syncs immediately via frontend.
- **Action:** Either implement a robust background queue in Rust (solving issue #4) or remove the dead code.

### 6. Hardcoded Game-Specific Logic
- **Location:** [`src-tauri/src/commands/games.rs`](file:///c:/Users/felip/Documents/sync-saves/src-tauri/src/commands/games.rs)
- **Observation:** "Silksong" specific parsing logic is hardcoded in the generic backend.
- **Impact:** Violates separation of concerns. As you add more games, this file will become unmaintainable.
- **Recommendation:** Move this to a plugin system or a separate `GameInfo` module that uses patterns/definitions stored in the DB.

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
