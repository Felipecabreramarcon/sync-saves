import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isProtectedPath(path: string): boolean {
  const lowerPath = path.toLowerCase().replace(/\\/g, '/')
  
  const protectedPaths = [
    'c:/windows',
    'c:/program files',
    'c:/program files (x86)',
    'c:/users/all users',
    'c:/system volume information',
    '/etc',
    '/bin',
    '/sbin',
    '/usr/bin',
    '/usr/sbin',
    '/root',
    '/var',
    '/sys',
    '/proc',
    '/dev'
  ]

  return protectedPaths.some(p => lowerPath === p || lowerPath.startsWith(p + '/'))
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined
}

export function timeAgo(
  date?: string | number | Date | null,
  options: { empty?: string } = {}
): string {
  const empty = options.empty ?? 'Never'
  if (date == null) return empty

  const d = date instanceof Date ? date : new Date(date)
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (!Number.isFinite(seconds)) return empty
  if (seconds < 0) return 'Just now'
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function formatBytes(bytes?: number | null, options: { empty?: string } = {}): string {
  const empty = options.empty ?? '-'
  if (!bytes || bytes <= 0) return empty
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const value = bytes / Math.pow(k, i)
  const precision = i === 0 ? 0 : value >= 100 ? 0 : 1
  return `${parseFloat(value.toFixed(precision))} ${sizes[i]}`
}
