import { supabase } from '@/lib/supabase'
import type { Game as LocalGame, SyncActivity } from '@/stores/gamesStore'
import { formatBytes as formatBytesUtil, timeAgo } from '@/lib/utils'

export async function sha256Base64(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export async function ensureCloudGameId(userId: string, game: Pick<LocalGame, 'name' | 'slug' | 'cover_url'>): Promise<string> {
  const existingRes = await (supabase as any)
    .from('games')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', game.slug)
    .maybeSingle()

  if (existingRes.error && existingRes.error.code !== 'PGRST116') {
    throw existingRes.error
  }

  if (existingRes.data?.id) return existingRes.data.id as string

  const insertRes = await (supabase as any)
    .from('games')
    .insert({
      user_id: userId,
      name: game.name,
      slug: game.slug,
      cover_url: game.cover_url ?? null,
    })
    .select('id')
    .single()

  if (insertRes.error) throw insertRes.error
  return insertRes.data.id as string
}

export async function upsertGamePath(params: {
  cloudGameId: string
  deviceId: string
  localPath: string
  syncEnabled: boolean
}) {
  const res = await (supabase as any)
    .from('game_paths')
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

export async function getNextVersion(cloudGameId: string): Promise<number> {
  const res = await (supabase as any)
    .from('save_versions')
    .select('version')
    .eq('game_id', cloudGameId)
    .order('version', { ascending: false })
    .limit(1)

  if (res.error) throw res.error

  const latest = (res.data?.[0]?.version as number | undefined) ?? 0
  return latest + 1
}

export async function createSaveVersion(params: {
  cloudGameId: string
  deviceId: string
  version: number
  filePath: string
  fileSize: number
  checksum: string
}) {
  // unset previous latest
  await (supabase as any)
    .from('save_versions')
    .update({ is_latest: false })
    .eq('game_id', params.cloudGameId)
    .eq('is_latest', true)

  const res = await (supabase as any)
    .from('save_versions')
    .insert({
      game_id: params.cloudGameId,
      device_id: params.deviceId,
      version: params.version,
      file_path: params.filePath,
      file_size: params.fileSize,
      checksum: params.checksum,
      is_latest: true,
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
  version: number | null
  status: 'success' | 'error' | 'pending'
  message: string | null
  durationMs: number | null
  fileSize: number | null
}) {
  const res = await (supabase as any)
    .from('sync_logs')
    .insert({
      game_id: params.cloudGameId,
      device_id: params.deviceId,
      action: params.action,
      version: params.version,
      status: params.status,
      message: params.message,
      duration_ms: params.durationMs,
      file_size: params.fileSize,
    })
    .select('id, created_at')
    .single()

  if (res.error) throw res.error
  return res.data
}

export async function fetchActivitiesFromCloud(params: {
  userId: string
  limit?: number
  cloudGameId?: string
}): Promise<SyncActivity[]> {
  const limit = params.limit ?? 200

  let query = (supabase as any)
    .from('sync_logs')
    .select('id, game_id, device_id, action, version, status, message, created_at, games(name, cover_url), devices(name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (params.cloudGameId) {
    query = query.eq('game_id', params.cloudGameId)
  }

  const res = await query
  if (res.error) throw res.error

  return ((res.data as any[]) || []).map((row) => ({
    id: row.id,
    game_id: row.game_id,
    game_name: row.games?.name ?? 'Unknown Game',
    game_cover: row.games?.cover_url ?? undefined,
    action: row.action,
    status: row.status,
    version: row.version ?? undefined,
    message: row.message ?? undefined,
    created_at: row.created_at,
    device_name: row.devices?.name ?? undefined,
  }))
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
  version: number
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
  const res = await (supabase as any)
    .from('games')
    .select(
      'id, name, slug, cover_url, ' +
        'save_versions(version, created_at, file_path, file_size, is_latest, devices(name)), ' +
        'sync_logs(status, created_at, message, action, devices(name))'
    )
    .eq('user_id', params.userId)
    .order('updated_at', { ascending: false })
    .order('created_at', { foreignTable: 'save_versions', ascending: false })
    .limit(versionsPerGame, { foreignTable: 'save_versions' })
    .order('created_at', { foreignTable: 'sync_logs', ascending: false })
    .limit(20, { foreignTable: 'sync_logs' })

  if (res.error) throw res.error

  const rows = (res.data as any[]) || []
  return rows.map((g) => {
    const versionsRaw = ((g.save_versions as any[]) || [])
      .filter((v) => v && typeof v.version === 'number')
      .map((v) => ({
        version: v.version,
        created_at: v.created_at,
        file_path: v.file_path,
        file_size: v.file_size,
        device_name: v.devices?.name ?? undefined,
        is_latest: !!v.is_latest,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const versions: CloudSaveVersion[] = versionsRaw.map(({ is_latest, ...rest }) => rest)
    const latestVersion = versionsRaw.find((v) => v.is_latest) ?? versionsRaw[0]
    const latestMapped: CloudSaveVersion | undefined = latestVersion
      ? {
          version: latestVersion.version,
          created_at: latestVersion.created_at,
          file_path: latestVersion.file_path,
          file_size: latestVersion.file_size,
          device_name: latestVersion.device_name,
        }
      : undefined

    const lastErrorRow = ((g.sync_logs as any[]) || []).find((l) => l.status === 'error')
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
