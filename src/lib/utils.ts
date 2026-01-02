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
