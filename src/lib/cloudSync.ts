import { supabase as supabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Game as LocalGame, SyncActivity } from '@/stores/gamesStore'
import { formatBytes as formatBytesUtil, timeAgo } from '@/lib/utils'

// Force type inference
const supabase = supabaseClient as SupabaseClient<Database>

export async function sha256Base64(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function ensureCloudGameId(userId: string, game: Pick<LocalGame, 'name' | 'slug' | 'cover_url'>): Promise<string> {
  const existingRes = await (supabase
    .from('games') as any)
    .select('id')
    .eq('user_id', userId)
    .eq('slug', game.slug)
    .maybeSingle()

  if (existingRes.error && existingRes.error.code !== 'PGRST116') {
    throw existingRes.error
  }

  if (existingRes.data?.id) return existingRes.data.id

  const insertRes = await (supabase
    .from('games') as any)
    .insert({
      user_id: userId,
      name: game.name,
      slug: game.slug,
      cover_url: game.cover_url ?? null,
    })
    .select('id')
    .single()

  if (insertRes.error) throw insertRes.error
  return insertRes.data.id
}

export async function upsertGamePath(params: {
  cloudGameId: string
  deviceId: string
  localPath: string
  syncEnabled: boolean
}) {
  const res = await (supabase
    .from('game_paths') as any)
    .upsert(
      {
        game_id: params.cloudGameId,
        device_id: params.deviceId,
        local_path: params.localPath,
        sync_enabled: params.syncEnabled,
      },
      { onConflict: 'game_id,device_id' }
    )
    .select('id')
    .single()

  if (res.error) throw res.error
  return res.data
}

// getNextVersion removed in favor of UUIDs

export async function createSaveVersion(params: {
  id: string
  cloudGameId: string
  deviceId: string
  // version removed
  filePath: string
  fileSize: number
  checksum: string
  file_modified_at?: string
}) {
  // unset previous latest
  await (supabase
    .from('save_versions') as any)
    .update({ is_latest: false })
    .eq('game_id', params.cloudGameId)
    .eq('is_latest', true)

  const res = await (supabase
    .from('save_versions') as any)
    .insert({
      id: params.id,
      game_id: params.cloudGameId,
      device_id: params.deviceId,
      // version removed
      file_path: params.filePath,
      file_size: params.fileSize,
      checksum: params.checksum,
      is_latest: true,
      file_modified_at: params.file_modified_at,
    })
    .select('id')
    .single()

  if (res.error) throw res.error
  return res.data
}

export async function createSyncLog(params: {
  cloudGameId: string
  deviceId: string | null
  action: 'upload' | 'download' | 'conflict' | 'skip'
  save_version_id: string | null
  status: 'success' | 'error' | 'pending'
  message: string | null
  durationMs: number | null
  fileSize: number | null
}) {
  const res = await (supabase
    .from('sync_logs') as any)
    .insert({
      game_id: params.cloudGameId,
      device_id: params.deviceId,
      action: params.action,
      save_version_id: params.save_version_id,
      status: params.status,
      message: params.message,
      duration_ms: params.durationMs,
      file_size: params.fileSize,
    })
    .select('id, created_at')
    .single()

  if (res.error) throw res.error
  return res.data as { id: string, created_at: string }
}

export async function fetchActivitiesFromCloud(params: {
  userId: string
  limit?: number
  cloudGameId?: string
}): Promise<SyncActivity[]> {
  const limit = params.limit ?? 200

  let query = (supabase
    .from('sync_logs') as any)
    .select(`
        id, 
        game_id, 
        device_id, 
        action, 
        save_version_id, 
        status, 
        message, 
        created_at, 
        games (
            name, 
            cover_url
        ), 
        devices (
            name
        )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (params.cloudGameId) {
    query = query.eq('game_id', params.cloudGameId)
  }

  const res = await query
  if (res.error) throw res.error

  // The type of res.data returned by supabase-js when using complex joins can be tricky.
  // We'll cast carefully or rely on inference if Database types are perfect.
  // With generic Supabase client, res.data should be inferred correctly if the query string matches strictly.
  // However, manual mapping is often safer with 'as unknown as ...' if the join types are deep.
  
  const rows = res.data as any[]
  return rows.map((row) => {
    // Supabase join results are objects or arrays depending on relationship type (one-to-one or one-to-many).
    // Assuming configured as Many-to-One (log belongs to game), it returns an object.
    const game = row.games as { name: string; cover_url: string | null } | null
    const device = row.devices as { name: string } | null
    
    return {
        id: row.id,
        game_id: row.game_id,
        game_name: game?.name ?? 'Unknown Game',
        game_cover: game?.cover_url ?? undefined,
        action: row.action,
        status: row.status,
        save_version_id: row.save_version_id ?? undefined,
        message: row.message ?? undefined,
        created_at: row.created_at,
        device_name: device?.name ?? undefined,
    }
  })
}

export function mapLocalActivityForUi(activity: SyncActivity): SyncActivity {
  // Keep UI fields stable; helper reserved for future normalization.
  return { ...activity, created_at: activity.created_at }
}

export function sortAndDedupActivities(items: SyncActivity[]): SyncActivity[] {
  const byId = new Map<string, SyncActivity>()
  for (const item of items) {
    byId.set(item.id, item)
  }
  return [...byId.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function filterUserVisibleActivities(items: SyncActivity[]): SyncActivity[] {
  // Pragmatic: hide noisy/low-signal actions by default.
  return items.filter((a) => a.action !== 'skip')
}

export function dedupeConsecutiveActivities(items: SyncActivity[], windowMs = 2 * 60 * 1000): SyncActivity[] {
  // Remove back-to-back duplicates for the same game/action/status within a short time window.
  // Keeps the most recent one (items are expected to be sorted desc by created_at).
  const out: SyncActivity[] = []
  for (const item of items) {
    const prev = out[out.length - 1]
    if (!prev) {
      out.push(item)
      continue
    }

    const sameKind =
      prev.game_id === item.game_id &&
      prev.action === item.action &&
      prev.status === item.status &&
      prev.device_name === item.device_name

    if (!sameKind) {
      out.push(item)
      continue
    }

    const dt = Math.abs(new Date(prev.created_at).getTime() - new Date(item.created_at).getTime())
    if (dt <= windowMs) {
      // Drop the older duplicate (current item).
      continue
    }
    out.push(item)
  }
  return out
}

export function sortErrorsFirst(items: SyncActivity[]): SyncActivity[] {
  return [...items].sort((a, b) => {
    const aErr = a.status === 'error' ? 1 : 0
    const bErr = b.status === 'error' ? 1 : 0
    if (aErr !== bErr) return bErr - aErr
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function toRelativeCreatedAt(activity: SyncActivity): string {
  return timeAgo(activity.created_at, { empty: 'Just now' })
}

export type CloudSaveVersion = {
  id: string
  created_at: string
  file_path: string
  file_size: number
  device_name?: string
}

export type CloudGameBackups = {
  cloud_game_id: string
  name: string
  slug: string
  cover_url?: string
  latest?: CloudSaveVersion
  versions: CloudSaveVersion[]
  last_error?: {
    created_at: string
    message?: string
    device_name?: string
    action?: string
  }
}

export function formatBytes(bytes?: number | null): string {
  return formatBytesUtil(bytes, { empty: '-' })
}

export async function fetchBackupsByGame(params: {
  userId: string
  versionsPerGame?: number
}): Promise<CloudGameBackups[]> {
  const versionsPerGame = params.versionsPerGame ?? 5

  // NOTE: relies on FK relationships + RLS.
  const res = await (supabase
    .from('games') as any)
    .select(`
      id, 
      name, 
      slug, 
      cover_url, 
      save_versions (
        id, 
        created_at, 
        file_path, 
        file_size, 
        is_latest, 
        devices (
            name
        )
      ),
      sync_logs (
        status, 
        created_at, 
        message, 
        action, 
        devices (
            name
        )
      )
    `)
    .eq('user_id', params.userId)
    .order('updated_at', { ascending: false })
    .order('created_at', { foreignTable: 'save_versions', ascending: false })
    .limit(versionsPerGame, { foreignTable: 'save_versions' })
    .order('created_at', { foreignTable: 'sync_logs', ascending: false })
    .limit(20, { foreignTable: 'sync_logs' })

  if (res.error) throw res.error

  const rows = res.data
  return rows.map((g: any) => {
    // Explicit casting for joined relations which is safe here as Supabase returns arrays/objects based on schema
    const versionsRawData = g.save_versions as {
        id: string
        created_at: string
        file_path: string
        file_size: number
        is_latest: boolean
        devices: { name: string } | null
    }[]

    const syncLogsRawData = g.sync_logs as {
        status: 'success' | 'error' | 'pending'
        created_at: string
        message: string | null
        action: 'upload' | 'download' | 'conflict' | 'skip'
        devices: { name: string } | null
    }[]

    const versionsRaw = (versionsRawData || [])
      .map((v) => ({
        id: v.id,
        created_at: v.created_at,
        file_path: v.file_path,
        file_size: v.file_size,
        device_name: v.devices?.name ?? undefined,
        is_latest: v.is_latest,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const versions: CloudSaveVersion[] = versionsRaw.map(({ is_latest, ...rest }) => rest)
    const latestVersion = versionsRaw.find((v) => v.is_latest) ?? versionsRaw[0]
    const latestMapped: CloudSaveVersion | undefined = latestVersion
      ? {
          id: latestVersion.id,
          created_at: latestVersion.created_at,
          file_path: latestVersion.file_path,
          file_size: latestVersion.file_size,
          device_name: latestVersion.device_name,
        }
      : undefined

    const lastErrorRow = (syncLogsRawData || []).find((l) => l.status === 'error')
    const last_error = lastErrorRow
      ? {
          created_at: lastErrorRow.created_at,
          message: lastErrorRow.message ?? undefined,
          device_name: lastErrorRow.devices?.name ?? undefined,
          action: lastErrorRow.action ?? undefined,
        }
      : undefined

    return {
      cloud_game_id: g.id,
      name: g.name,
      slug: g.slug,
      cover_url: g.cover_url ?? undefined,
      latest: latestMapped,
      versions,
      last_error,
    } satisfies CloudGameBackups
  })
}
