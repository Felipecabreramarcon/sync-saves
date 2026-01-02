# 🔌 API & Supabase Integration

Este documento detalha a integração com o Supabase e as APIs utilizadas.

---

## Tauri Commands (Desktop)

Quando rodando no app desktop (Tauri), o frontend usa `invoke(...)` para chamar comandos Rust.

### Games

#### `get_game_save_stats`

Valida o `local_path` mapeado para o jogo e retorna estatísticas locais do diretório (sem upload), além de estatísticas específicas para Silksong **somente quando aplicável**.

Entrada:

- `gameId: string`

Retorno (resumo):

```ts
type GameSaveStats = {
  path: string
  exists: boolean
  is_dir: boolean
  file_count: number
  total_bytes: number
  newest_mtime_ms?: number | null
  silksong?: {
    user_dat_files: number
    restore_point_files: number
    decoded_json_files: number
    newest_save_mtime_ms?: number | null
    progress?: {
      save_date?: string | null
      play_time_seconds?: number | null
      respawn_scene?: string | null
      map_zone?: number | null
      health?: number | null
      max_health?: number | null
      geo?: number | null
      silk?: number | null
      silk_max?: number | null
    } | null
  } | null
}
```

Notas:

- `exists=false` / `is_dir=false` indica que o caminho está inválido (UI pode mostrar aviso).
- O bloco `silksong` só aparece quando o jogo/caminho indica Silksong e existe a estrutura esperada (`default/`).
- A leitura de “progress” depende do `*.dat.json` gerado pelo `hollow.py` (o app não decodifica o `.dat` diretamente).

### PCGamingWiki

O app desktop (Tauri) pode consultar a API pública do PCGamingWiki para sugerir possíveis caminhos de save, reduzindo o trabalho manual ao adicionar um jogo.

Observações:

- Essa integração é **best-effort**: o PCGamingWiki não garante padronização perfeita; a extração é baseada em wikitext (templates do tipo `Game data/saves`).
- Atualmente o backend filtra para caminhos **Windows** e tenta expandir alguns tokens comuns (ex: `{{p|appdata}}`, `{{p|localappdata}}`).

#### `pcgw_search_games`

Busca páginas do PCGamingWiki pelo nome.

Entrada:

- `query: string`
- `limit?: number` (default 8)

Retorno:

```ts
type PcgwSearchResult = {
  title: string
  pageid: number
}
```

#### `pcgw_get_save_locations`

Obtém os caminhos de save sugeridos para uma página do PCGamingWiki.

Entrada:

- `title: string`

Retorno:

```ts
type PcgwSaveLocations = {
  title: string
  paths: Array<{
    os: string
    raw: string
    expanded?: string | null
  }>
}
```

Notas:

- `raw` é o valor extraído do wikitext (pode conter tokens).
- `expanded` é um valor “resolvido” para uma string de path no Windows quando possível; quando `expanded` está ausente, use `raw`.

---

## Configuração do Supabase

### Variáveis de Ambiente

```env
# .env.local
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Cliente JavaScript

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

---

## Autenticação

### Google OAuth Setup

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione existente
3. Vá em **APIs & Services > Credentials**
4. Crie **OAuth 2.0 Client ID** (Web Application)
5. Adicione as URIs autorizadas:
   - `https://seu-projeto.supabase.co/auth/v1/callback`

### Fluxo de Login

```typescript
// Login com Google
async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      scopes: 'email profile'
    }
  })
  return { data, error }
}

// Logout
async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// Verificar sessão atual
async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Listener de mudanças de auth
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Usuário logou
  } else if (event === 'SIGNED_OUT') {
    // Usuário deslogou
  }
})
```

---

## Operações CRUD

### Devices

```typescript
// Criar dispositivo
async function createDevice(name: string, os: string, machineId: string) {
  const { data, error } = await supabase
    .from('devices')
    .insert({ name, os, machine_id: machineId })
    .select()
    .single()
  return { data, error }
}

// Listar dispositivos do usuário
async function getDevices() {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

// Atualizar last_seen
async function updateDeviceLastSeen(deviceId: string) {
  const { error } = await supabase
    .from('devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', deviceId)
  return { error }
}
```

### Games

```typescript
// Criar jogo
async function createGame(name: string, slug: string) {
  const { data, error } = await supabase
    .from('games')
    .insert({ name, slug })
    .select()
    .single()
  return { data, error }
}

// Listar jogos com paths do dispositivo atual
async function getGamesWithPaths(deviceId: string) {
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      game_paths!inner (
        local_path,
        sync_enabled,
        last_synced_at,
        last_synced_version
      ),
      save_versions (
        version,
        created_at,
        is_latest
      )
    `)
    .eq('game_paths.device_id', deviceId)
    .order('name')
  return { data, error }
}

// Atualizar caminho local
async function updateGamePath(gameId: string, deviceId: string, localPath: string) {
  const { data, error } = await supabase
    .from('game_paths')
    .upsert({
      game_id: gameId,
      device_id: deviceId,
      local_path: localPath
    })
    .select()
    .single()
  return { data, error }
}
```

### Save Versions

```typescript
// Criar nova versão
async function createSaveVersion(
  gameId: string,
  deviceId: string,
  version: number,
  filePath: string,
  fileSize: number,
  checksum: string
) {
  // Primeiro, remove is_latest das versões anteriores
  await supabase
    .from('save_versions')
    .update({ is_latest: false })
    .eq('game_id', gameId)
    .eq('is_latest', true)

  // Cria nova versão
  const { data, error } = await supabase
    .from('save_versions')
    .insert({
      game_id: gameId,
      device_id: deviceId,
      version,
      file_path: filePath,
      file_size: fileSize,
      checksum,
      is_latest: true
    })
    .select()
    .single()
  return { data, error }
}

// Obter última versão de um jogo
async function getLatestVersion(gameId: string) {
  const { data, error } = await supabase
    .from('save_versions')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_latest', true)
    .single()
  return { data, error }
}

// Histórico de versões
async function getVersionHistory(gameId: string, limit = 10) {
  const { data, error } = await supabase
    .from('save_versions')
    .select('*, devices(name)')
    .eq('game_id', gameId)
    .order('version', { ascending: false })
    .limit(limit)
  return { data, error }
}
```

---

## Storage API

### Upload de Save

```typescript
async function uploadSave(
  userId: string,
  gameSlug: string,
  version: number,
  file: Blob
): Promise<{ path: string; error: Error | null }> {
  const timestamp = Date.now()
  const filePath = `${userId}/${gameSlug}/v${version}_${timestamp}.zip`

  const { error } = await supabase.storage
    .from('saves')
    .upload(filePath, file, {
      contentType: 'application/zip',
      upsert: false
    })

  return { path: filePath, error }
}
```

### Download de Save

```typescript
async function downloadSave(filePath: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage
    .from('saves')
    .download(filePath)

  if (error) {
    console.error('Download error:', error)
    return null
  }
  return data
}
```

### Deletar Saves Antigos

```typescript
async function deleteOldSaves(userId: string, gameSlug: string, keepVersions: string[]) {
  const { data: files } = await supabase.storage
    .from('saves')
    .list(`${userId}/${gameSlug}`)

  if (!files) return

  const filesToDelete = files
    .filter(f => !keepVersions.some(v => f.name.includes(v)))
    .map(f => `${userId}/${gameSlug}/${f.name}`)

  if (filesToDelete.length > 0) {
    await supabase.storage.from('saves').remove(filesToDelete)
  }
}
```

---

## Sync Logs

```typescript
// Registrar log de sync
async function logSync(
  gameId: string,
  deviceId: string,
  action: 'upload' | 'download' | 'skip',
  version: number,
  status: 'success' | 'error',
  message?: string,
  durationMs?: number
) {
  const { error } = await supabase
    .from('sync_logs')
    .insert({
      game_id: gameId,
      device_id: deviceId,
      action,
      version,
      status,
      message,
      duration_ms: durationMs
    })
  return { error }
}

// Obter logs recentes
async function getRecentLogs(gameId?: string, limit = 50) {
  let query = supabase
    .from('sync_logs')
    .select('*, games(name), devices(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (gameId) {
    query = query.eq('game_id', gameId)
  }

  const { data, error } = await query
  return { data, error }
}
```

---

## Tipos TypeScript

```typescript
// src/types/database.ts
export interface Database {
  public: {
    Tables: {
      devices: {
        Row: {
          id: string
          user_id: string
          name: string
          os: 'windows' | 'linux' | 'macos' | null
          machine_id: string | null
          last_seen_at: string
          created_at: string
        }
        Insert: Omit<Device['Row'], 'id' | 'created_at' | 'last_seen_at'>
        Update: Partial<Device['Insert']>
      }
      games: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          cover_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Game['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Game['Insert']>
      }
      // ... outras tabelas
    }
  }
}
```

---

## Tauri Commands (IPC Bridge)

Estes comandos são implementados em Rust (`src-tauri/src/commands/`) e chamados pelo Frontend via Tauri `invoke`.

### Sistema
- **`get_system_info`**: Retorna informações do hardware e SO.
  ```typescript
  // Bridge: src/lib/tauri.ts
  const info = await invoke('get_system_info');
  ```

### Autenticação
- **`set_current_user`**: Define o ID do usuário atual no SQLite.
  ```typescript
  await invoke('set_current_user', { userId: 'uuid' });
  ```
- **`get_current_user`**: Recupera o ID do usuário persistido localmente.

### Jogos
- **`get_all_games`**: Lista todos os jogos do cache local (`games_cache`).
- **`add_game`**: Adiciona um novo jogo ao sistema.
  ```typescript
  await invoke('add_game', { 
    name: 'Game Name', 
    localPath: 'C:\\Path', 
    platform: 'PC' 
  });
  ```

---

## Estrutura de Comunicação

O Frontend utiliza o diretório `src/lib/` para encapsular as chamadas ao Tauri:
- `tauri.ts`: Comandos gerais.
- `tauri-games.ts`: Comandos específicos de jogos.
- `tauri-auth.ts`: Comandos de autenticação e contexto.

Os dados são armazenados e sincronizados via **Zustand Stores** (`src/stores/`), que coordenam as chamadas ao Tauri e Supabase.
