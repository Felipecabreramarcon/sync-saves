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
    last_synced_version INTEGER,
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
    version INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    checksum TEXT NOT NULL,
    is_latest BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, version)
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
    version INTEGER,
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
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Cache de jogos
CREATE TABLE games_cache (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    local_path TEXT,
    sync_enabled INTEGER DEFAULT 1,
    last_synced_version INTEGER,
    last_synced_at TEXT
);

-- Queue de sincronização
CREATE TABLE sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Log local
CREATE TABLE sync_log_local (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
```

---

## Storage Structure

```
saves/
├── {user_id}/
│   ├── {game_slug}/
│   │   ├── v1_1704067200000.zip
│   │   └── v2_1704153600000.zip
```

**Formato**: `v{version}_{timestamp_ms}.zip`
