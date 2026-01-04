# 🗄️ Database Schema

Este documento detalha o schema do banco de dados PostgreSQL no Supabase e o SQLite local.

---

## Visão Geral

| Banco | Localização | Propósito |
|-------|-------------|-----------|
| **PostgreSQL** | Supabase (cloud) | Dados compartilhados entre dispositivos |
| **SQLite** | Local (cada device) | Cache, configurações locais, logs |

---

## Supabase PostgreSQL

### Tabela: `devices`

```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    os TEXT CHECK (os IN ('windows', 'linux', 'macos')),
    machine_id TEXT,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, machine_id)
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
```

### Tabela: `games`

```sql
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    cover_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_slug ON games(slug);
```

### Tabela: `game_paths`

```sql
CREATE TABLE game_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    local_path TEXT NOT NULL,
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    last_synced_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, device_id)
);

CREATE INDEX idx_game_paths_game_id ON game_paths(game_id);
CREATE INDEX idx_game_paths_device_id ON game_paths(device_id);
```

### Tabela: `save_versions`

```sql
CREATE TABLE save_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    -- version removido: usamos ID único
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    checksum TEXT NOT NULL,
    is_latest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_save_versions_game_id ON save_versions(game_id);
CREATE INDEX idx_save_versions_is_latest ON save_versions(is_latest) WHERE is_latest = TRUE;
```

### Tabela: `sync_logs`

```sql
CREATE TABLE sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('upload', 'download', 'conflict', 'skip')),
    save_version_id UUID,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
    message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_game_id ON sync_logs(game_id);
CREATE INDEX idx_sync_logs_created_at ON sync_logs(created_at);
```

---

## Functions

```sql
-- Limpar versões antigas (manter últimos 10 dias)
CREATE OR REPLACE FUNCTION cleanup_old_versions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM save_versions
        WHERE is_latest = FALSE
        AND created_at < NOW() - INTERVAL '10 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Marcar nova versão como latest
CREATE OR REPLACE FUNCTION set_latest_version(p_game_id UUID, p_version_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE save_versions SET is_latest = FALSE WHERE game_id = p_game_id AND is_latest = TRUE;
    UPDATE save_versions SET is_latest = TRUE WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Row Level Security (RLS)

```sql
-- Habilitar RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE save_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies para devices
CREATE POLICY "Users can manage own devices" ON devices FOR ALL USING (auth.uid() = user_id);

-- Policies para games
CREATE POLICY "Users can manage own games" ON games FOR ALL USING (auth.uid() = user_id);

-- Policies para game_paths
CREATE POLICY "Users can manage game_paths for own games" ON game_paths FOR ALL
USING (EXISTS (SELECT 1 FROM games g WHERE g.id = game_paths.game_id AND g.user_id = auth.uid()));

-- Policies para save_versions
CREATE POLICY "Users can manage own save_versions" ON save_versions FOR ALL
USING (EXISTS (SELECT 1 FROM games g WHERE g.id = save_versions.game_id AND g.user_id = auth.uid()));

-- Policies para sync_logs
CREATE POLICY "Users can manage own sync_logs" ON sync_logs FOR ALL
USING (EXISTS (SELECT 1 FROM games g WHERE g.id = sync_logs.game_id AND g.user_id = auth.uid()));
```

---

## SQLite Local

```sql
-- Configuração do dispositivo
CREATE TABLE device_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Cache de jogos (espelho local + paths)
CREATE TABLE games_cache (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    cover_url TEXT,
    platform TEXT,
    local_path TEXT,
    sync_enabled INTEGER DEFAULT 1,
    last_synced_at TEXT,
    last_synced_id TEXT,
    status TEXT DEFAULT 'idle', -- 'idle', 'syncing', 'error'
    last_analyzed_at TEXT,
    custom_script_path TEXT,
    analysis_config TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Version analysis results table
CREATE TABLE version_analysis (
    version_id TEXT PRIMARY KEY,
    analysis_data TEXT NOT NULL,  -- JSON: {completion_percentage, play_time_seconds, ...}
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Queue de sincronização
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'upload' ou 'download'
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'failed'
    file_path TEXT,
    priority INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(game_id) REFERENCES games_cache(id) ON DELETE CASCADE
);
```

### Notas sobre Migração

Os seguintes campos foram adicionados à tabela `games_cache` via migrations:
- `last_analyzed_at TEXT` - Timestamp da última análise
- `last_synced_id TEXT` - ID da última versão sincronizada
- `custom_script_path TEXT` - Caminho para script customizado de análise
- `analysis_config TEXT` - Configuração JSON para análise

### Estrutura de `analysis_data`

O campo `analysis_data` da tabela `version_analysis` armazena um JSON com os dados de análise **conforme definido pelo usuário** em `analysis_config`.

**Fluxo:**
1. Usuário configura `analysis_config` em `games_cache` (define quais campos analisar)
2. Opcionalmente, define `custom_script_path` (script que extrai os dados)
3. Ao analisar uma versão, o sistema gera `analysis_data` baseado nessa configuração
4. `analysis_data` é salvo em `version_analysis` vinculado à `version_id`

**Exemplo de `analysis_config`** (em `games_cache`):
```json
{
  "fields": [
    {"name": "completion_percentage", "type": "float"},
    {"name": "play_time_seconds", "type": "int"},
    {"name": "achievements", "type": "int"},
    {"name": "level", "type": "int", "path": "custom_fields.level"}
  ]
}
```

**Exemplo de `analysis_data` resultante** (em `version_analysis`):
```json
{
  "completion_percentage": 75.5,
  "play_time_seconds": 3600,
  "achievements": 42,
  "level": 10
}
```

**Nota:** A estrutura de `analysis_data` é **flexível** e totalmente definida pela configuração do usuário. Não há campos obrigatórios - cada jogo pode ter sua própria estrutura de análise.

---

## Tauri Commands (Rust Backend)

### Game Commands

#### `get_all_games`
```rust
fn get_all_games(app: AppHandle) -> Result<Vec<Game>>
```
Retorna todos os jogos do cache local (`games_cache`).

#### `add_game`
```rust
fn add_game(
    app: AppHandle,
    id: String,
    name: String,
    slug: String,
    local_path: String,
    platform: Option<String>
) -> Result<String>
```
Adiciona um novo jogo ao cache local.

#### `update_game`
```rust
fn update_game(
    app: AppHandle,
    id: String,
    updates: GameUpdates
) -> Result<()>
```
Atualiza configurações de um jogo (path, sync_enabled, etc).

#### `delete_game`
```rust
fn delete_game(app: AppHandle, id: String) -> Result<()>
```
Remove um jogo do cache local e da fila de sincronização.

### Analysis Commands

#### `get_game_save_stats`
```rust
fn get_game_save_stats(app: AppHandle, game_id: String) -> Result<GameSaveStats>
```
Valida o `local_path` e retorna estatísticas do diretório de save.

**Retorno:**
```json
{
  "path": "C:/Path/To/Saves",
  "exists": true,
  "is_dir": true,
  "file_count": 42,
  "total_bytes": 1048576,
  "newest_mtime_ms": 1704398359000
}
```

#### `get_version_analysis`
```rust
fn get_version_analysis(
    app: AppHandle,
    version_id: String
) -> Result<Option<VersionAnalysis>>
```
Obtém a análise armazenada para uma versão específica de save.

**Retorno:**
```json
{
  "version_id": "uuid-v4",
  "analysis_data": "{\"progress\": 75, \"achievements\": 42}",
  "created_at": "2026-01-04T20:30:00Z"
}
```

#### `save_version_analysis`
```rust
fn save_version_analysis(
    app: AppHandle,
    version_id: String,
    analysis_data: String
) -> Result<()>
```
Salva os dados de análise para uma versão de save.

**Parâmetros:**
- `version_id`: ID único da versão
- `analysis_data`: JSON stringified com dados de análise

### Sync Commands

#### `sync_game`
```rust
fn sync_game(
    app: AppHandle,
    game_id: String
) -> Result<SyncResult>
```
Comprime a pasta de save e retorna o ZIP em Base64 com hash.

#### `restore_game`
```rust
fn restore_game(
    app: AppHandle,
    game_id: String,
    zip_base64: String
) -> Result<()>
```
Extrai um ZIP de save para o caminho local do jogo.

### PCGamingWiki Commands

#### `pcgw_search_games`
```rust
fn pcgw_search_games(
    query: String,
    limit: Option<usize>
) -> Result<Vec<PcgwSearchResult>>
```
Busca jogos no PCGamingWiki.

#### `pcgw_get_save_locations`
```rust
fn pcgw_get_save_locations(
    title: String
) -> Result<PcgwSaveLocations>
```
Obtém caminhos de save sugeridos para um jogo.

### System Commands

#### `get_system_info`
```rust
fn get_system_info() -> Result<SystemInfo>
```
Retorna informações do hardware e SO.

#### `get_device_id` / `set_device_id`
```rust
fn get_device_id(app: AppHandle) -> Result<Option<String>>
fn set_device_id(app: AppHandle, id: String) -> Result<()>
```
Gerencia o UUID único do dispositivo.

#### `get_device_name` / `set_device_name`
```rust
fn get_device_name(app: AppHandle) -> Result<Option<String>>
fn set_device_name(app: AppHandle, name: String) -> Result<()>
```
Gerencia o nome amigável do dispositivo.

#### `get_app_settings` / `update_app_settings`
```rust
fn get_app_settings(app: AppHandle) -> Result<AppSettings>
fn update_app_settings(app: AppHandle, settings: AppSettings) -> Result<()>


---

## Storage Structure

```
saves/
├── {user_id}/
│   ├── {game_slug}/
│   │   ├── {uuid}.zip
│   │   └── {uuid}.zip
```

**Formato**: `{uuid}.zip`
