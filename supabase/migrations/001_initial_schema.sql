# Sync Saves - SQL Migration

Este arquivo contém todo o SQL necessário para configurar o banco de dados no Supabase.

## Instruções

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Crie uma nova query
4. Cole e execute cada seção abaixo em ordem

---

## 1. Criar Tabelas

```sql
-- =============================================
-- TABELA: devices
-- Dispositivos registrados do usuário
-- =============================================
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    os TEXT CHECK (os IN ('windows', 'linux', 'macos')),
    machine_id TEXT,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, machine_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);

-- =============================================
-- TABELA: games
-- Jogos cadastrados pelo usuário
-- =============================================
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    cover_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);

-- =============================================
-- TABELA: game_paths
-- Caminho local dos saves em cada dispositivo
-- =============================================
CREATE TABLE IF NOT EXISTS game_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    local_path TEXT NOT NULL,
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    last_synced_version INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_game_paths_game_id ON game_paths(game_id);
CREATE INDEX IF NOT EXISTS idx_game_paths_device_id ON game_paths(device_id);

-- =============================================
-- TABELA: save_versions
-- Histórico de versões dos saves
-- =============================================
CREATE TABLE IF NOT EXISTS save_versions (
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

CREATE INDEX IF NOT EXISTS idx_save_versions_game_id ON save_versions(game_id);
CREATE INDEX IF NOT EXISTS idx_save_versions_is_latest ON save_versions(is_latest) WHERE is_latest = TRUE;
CREATE INDEX IF NOT EXISTS idx_save_versions_created_at ON save_versions(created_at);

-- =============================================
-- TABELA: sync_logs
-- Log de todas as operações de sincronização
-- =============================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('upload', 'download', 'conflict', 'skip')),
    version INTEGER,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
    message TEXT,
    file_size BIGINT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_game_id ON sync_logs(game_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_device_id ON sync_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);
```

---

## 2. Criar Functions

```sql
-- =============================================
-- FUNCTION: update_updated_at
-- Atualiza automaticamente o campo updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para games
CREATE TRIGGER games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger para game_paths
CREATE TRIGGER game_paths_updated_at
    BEFORE UPDATE ON game_paths
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =============================================
-- FUNCTION: cleanup_old_versions
-- Remove versões antigas (mais de 10 dias)
-- =============================================
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

-- =============================================
-- FUNCTION: set_latest_version
-- Marca uma versão como a mais recente
-- =============================================
CREATE OR REPLACE FUNCTION set_latest_version(p_game_id UUID, p_version_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE save_versions SET is_latest = FALSE WHERE game_id = p_game_id AND is_latest = TRUE;
    UPDATE save_versions SET is_latest = TRUE WHERE id = p_version_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: get_next_version
-- Retorna o próximo número de versão para um jogo
-- =============================================
CREATE OR REPLACE FUNCTION get_next_version(p_game_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version), 0) + 1 INTO next_version
    FROM save_versions
    WHERE game_id = p_game_id;
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Habilitar Row Level Security (RLS)

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE save_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES: devices
-- =============================================
CREATE POLICY "Users can view own devices"
    ON devices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices"
    ON devices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
    ON devices FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
    ON devices FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- POLICIES: games
-- =============================================
CREATE POLICY "Users can view own games"
    ON games FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own games"
    ON games FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own games"
    ON games FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own games"
    ON games FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- POLICIES: game_paths
-- =============================================
CREATE POLICY "Users can manage game_paths for own games"
    ON game_paths FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM games g
            WHERE g.id = game_paths.game_id
            AND g.user_id = auth.uid()
        )
    );

-- =============================================
-- POLICIES: save_versions
-- =============================================
CREATE POLICY "Users can view own save_versions"
    ON save_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM games g
            WHERE g.id = save_versions.game_id
            AND g.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own save_versions"
    ON save_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM games g
            WHERE g.id = save_versions.game_id
            AND g.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own save_versions"
    ON save_versions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM games g
            WHERE g.id = save_versions.game_id
            AND g.user_id = auth.uid()
        )
    );

-- =============================================
-- POLICIES: sync_logs
-- =============================================
CREATE POLICY "Users can manage own sync_logs"
    ON sync_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM games g
            WHERE g.id = sync_logs.game_id
            AND g.user_id = auth.uid()
        )
    );
```

---

## 4. Configurar Storage Bucket

Execute no SQL Editor:

```sql
-- Criar bucket para saves (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'saves',
    'saves',
    FALSE,
    52428800, -- 50MB limit
    ARRAY['application/zip', 'application/x-zip-compressed']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Policy: Usuários podem ver seus próprios saves
CREATE POLICY "Users can view own saves"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'saves' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Usuários podem fazer upload de seus saves
CREATE POLICY "Users can upload own saves"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'saves' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Usuários podem atualizar seus saves
CREATE POLICY "Users can update own saves"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'saves' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Usuários podem deletar seus saves
CREATE POLICY "Users can delete own saves"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'saves' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## Verificação

Após executar todas as queries, verifique:

1. **Tabelas criadas**: Vá em Table Editor e confirme as 5 tabelas
2. **Functions**: Vá em Database > Functions e confirme as 4 functions
3. **RLS habilitado**: Cada tabela deve mostrar "RLS enabled"
4. **Storage bucket**: Vá em Storage e confirme o bucket "saves"

---

## Rollback (se necessário)

```sql
-- CUIDADO: Isso irá deletar TODOS os dados!
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS save_versions CASCADE;
DROP TABLE IF EXISTS game_paths CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS devices CASCADE;

DROP FUNCTION IF EXISTS update_updated_at CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_versions CASCADE;
DROP FUNCTION IF EXISTS set_latest_version CASCADE;
DROP FUNCTION IF EXISTS get_next_version CASCADE;
```
