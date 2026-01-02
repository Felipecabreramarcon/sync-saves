# 🔄 Sync Logic

Este documento detalha a lógica de sincronização do Sync Saves.

---

## Visão Geral

O sistema de sincronização segue o princípio **"last write wins"** (última escrita vence), onde o save mais recente é sempre propagado para todos os dispositivos.

---

## Fluxo Principal

```
┌─────────────────────────────────────────────────────────────────┐
│                     SYNC CYCLE                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. TRIGGER                                                    │
│      Timer tick (every N minutes)                               │
│                     │                                           │
│                     ▼                                           │
│   2. FOR EACH GAME (sync_enabled = true)                        │
│      ┌──────────────────────────────────────────────────────┐   │
│      │                                                      │   │
│      │   a. Calculate local checksum                        │   │
│      │      └─► zip folder → SHA256                         │   │
│      │                                                      │   │
│      │   b. Fetch remote latest version                     │   │
│      │      └─► query save_versions where is_latest=true    │   │
│      │                                                      │   │
│      │   c. Compare                                         │   │
│      │      ├─► Local changed + Remote unchanged → UPLOAD   │   │
│      │      ├─► Local unchanged + Remote changed → DOWNLOAD │   │
│      │      ├─► Both changed → CONFLICT (use timestamp)     │   │
│      │      └─► Neither changed → SKIP                      │   │
│      │                                                      │   │
│      └──────────────────────────────────────────────────────┘   │
│                     │                                           │
│                     ▼                                           │
│   3. UPDATE LOCAL STATE                                         │
│      - Update game_paths.last_synced_*                          │
│      - Log to sync_logs                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estados de Sync

| Estado | Condição | Ação |
|--------|----------|------|
| `SYNCED` | local_checksum == remote_checksum | Nenhuma |
| `LOCAL_AHEAD` | local modificado após remote | Upload |
| `REMOTE_AHEAD` | remote modificado após local sync | Download |
| `CONFLICT` | Ambos modificados | Usar timestamp mais recente |
| `ERROR` | Falha na operação | Retry + log |

---

## Algoritmo Detalhado

### 1. Calcular Checksum Local

```rust
fn calculate_local_checksum(save_path: &Path) -> Result<String> {
    // 1. Criar arquivo zip temporário da pasta
    let temp_zip = create_temp_zip(save_path)?;
    
    // 2. Calcular SHA-256 do zip
    let checksum = sha256_file(&temp_zip)?;
    
    // 3. Limpar temp
    remove_file(temp_zip)?;
    
    Ok(checksum)
}
```

### 2. Comparar Versões

```typescript
interface SyncDecision {
  action: 'upload' | 'download' | 'skip' | 'conflict';
  reason: string;
}

function decideSyncAction(
  localChecksum: string,
  localModifiedAt: Date,
  remoteChecksum: string | null,
  remoteCreatedAt: Date | null,
  lastSyncedChecksum: string | null
): SyncDecision {
  // Caso 1: Nenhuma versão remota existe
  if (!remoteChecksum) {
    return { action: 'upload', reason: 'first_upload' };
  }

  // Caso 2: Local não mudou desde último sync
  if (localChecksum === lastSyncedChecksum) {
    // Verificar se remote mudou
    if (localChecksum === remoteChecksum) {
      return { action: 'skip', reason: 'already_synced' };
    } else {
      return { action: 'download', reason: 'remote_updated' };
    }
  }

  // Caso 3: Local mudou
  if (localChecksum !== lastSyncedChecksum) {
    // Remote também mudou?
    if (remoteChecksum !== lastSyncedChecksum) {
      // CONFLITO - usar timestamp
      if (localModifiedAt > remoteCreatedAt!) {
        return { action: 'upload', reason: 'conflict_local_newer' };
      } else {
        return { action: 'download', reason: 'conflict_remote_newer' };
      }
    } else {
      // Só local mudou
      return { action: 'upload', reason: 'local_updated' };
    }
  }

  return { action: 'skip', reason: 'unknown' };
}
```

### 3. Processo de Upload

```
┌──────────────────────────────────────────────────────────────┐
│                        UPLOAD                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   1. Zip save folder                                         │
│      save_path/ → temp/v{N}_{timestamp}.zip                  │
│                                                              │
│   2. Upload to Supabase Storage                              │
│      POST /storage/v1/object/saves/{user}/{game}/v{N}.zip    │
│                                                              │
│   3. Create save_version record                              │
│      INSERT INTO save_versions (...)                         │
│      → set is_latest = true                                  │
│      → unset previous is_latest                              │
│                                                              │
│   4. Update local state                                      │
│      game_paths.last_synced_version = N                      │
│      game_paths.last_synced_at = NOW()                       │
│                                                              │
│   5. Log sync event                                          │
│      INSERT INTO sync_logs (action='upload', ...)            │
│                                                              │
│   6. Cleanup old versions (> 10 days)                        │
│      DELETE FROM save_versions WHERE created_at < ...        │
│      DELETE storage files                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4. Processo de Download

```
┌──────────────────────────────────────────────────────────────┐
│                       DOWNLOAD                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   1. Fetch latest version info                               │
│      SELECT * FROM save_versions WHERE is_latest = true      │
│                                                              │
│   2. Download zip from Storage                               │
│      GET /storage/v1/object/saves/{path}                     │
│                                                              │
│   3. Backup current local saves (safety)                     │
│      save_path/ → save_path_backup_{timestamp}/              │
│                                                              │
│   4. Extract zip to save folder                              │
│      temp.zip → save_path/                                   │
│                                                              │
│   5. Update local state                                      │
│      game_paths.last_synced_version = N                      │
│      game_paths.last_synced_at = NOW()                       │
│                                                              │
│   6. Log sync event                                          │
│      INSERT INTO sync_logs (action='download', ...)          │
│                                                              │
│   7. Cleanup old backups (keep last 3)                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Scheduler

### Implementação (Rust/Tauri)

```rust
use tokio::time::{interval, Duration};

pub struct SyncScheduler {
    interval_minutes: u64,
    running: Arc<AtomicBool>,
}

impl SyncScheduler {
    pub fn new(interval_minutes: u64) -> Self {
        Self {
            interval_minutes,
            running: Arc::new(AtomicBool::new(false)),
        }
    }

    pub async fn start(&self, sync_service: Arc<SyncService>) {
        self.running.store(true, Ordering::SeqCst);
        
        let mut interval = interval(Duration::from_secs(self.interval_minutes * 60));
        
        while self.running.load(Ordering::SeqCst) {
            interval.tick().await;
            
            if let Err(e) = sync_service.sync_all_games().await {
                log::error!("Sync failed: {}", e);
            }
        }
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }
}
```

---

## Tratamento de Erros

| Erro | Causa | Ação |
|------|-------|------|
| `NetworkError` | Sem conexão | Adicionar à queue, retry depois |
| `StorageQuotaExceeded` | Limite do Supabase | Notificar usuário |
| `FileAccessDenied` | Jogo rodando | Notificar, skip |
| `CorruptedZip` | Falha na compressão | Retry com novo zip |
| `AuthExpired` | Token expirado | Refresh token |

### Retry Strategy

```typescript
const RETRY_DELAYS = [1000, 5000, 15000, 60000]; // ms

async function syncWithRetry(game: Game): Promise<void> {
  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    try {
      await syncGame(game);
      return; // Success
    } catch (error) {
      if (!isRetryable(error)) throw error;
      
      await delay(RETRY_DELAYS[attempt]);
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Offline Support

Quando offline:

1. Operações de sync são adicionadas à `sync_queue` (SQLite local)
2. Ao reconectar, queue é processada em ordem
3. Conflitos são resolvidos pelo timestamp

```sql
-- Adicionar à queue
INSERT INTO sync_queue (game_id, action, status)
VALUES ('uuid', 'upload', 'pending');

-- Processar queue ao reconectar
SELECT * FROM sync_queue 
WHERE status = 'pending' 
ORDER BY created_at ASC;
```

---

## Limpeza Automática

### Versões Antigas (> 10 dias)

Executada após cada sync bem-sucedido:

```sql
-- No Supabase
DELETE FROM save_versions
WHERE is_latest = FALSE
AND created_at < NOW() - INTERVAL '10 days';
```

```typescript
// Storage cleanup
const oldVersions = await supabase
  .from('save_versions')
  .select('file_path')
  .eq('game_id', gameId)
  .lt('created_at', tenDaysAgo);

await supabase.storage
  .from('saves')
  .remove(oldVersions.map(v => v.file_path));
```

### Backups Locais

Manter apenas os 3 últimos backups por jogo:

```rust
fn cleanup_local_backups(save_path: &Path, keep: usize) {
    let backups = find_backups(save_path);
    let to_delete = backups.len().saturating_sub(keep);
    
    for backup in backups.iter().take(to_delete) {
        fs::remove_dir_all(backup)?;
    }
}
```
